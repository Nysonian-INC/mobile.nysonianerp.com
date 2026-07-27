import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { api } from '@/api/client';
import { palette, radius, typography } from '@/theme';
import { IpCamStream } from '@/types';
import { buildCamPlayerHtml } from './camPlayerHtml';

type Props = {
  camNum: number;
  camName: string;
  channelName: string;
  ch: number;
  /** Default sub — same as web it-ip-cams.js (WebRTC first, HLS fallback). */
  quality?: IpCamStream;
  fill?: boolean;
  focused?: boolean;
  onRemove?: () => void;
  onPress?: () => void;
};

type LoadState = 'loading' | 'playing' | 'error';

type PlayerMsg = { type?: string; detail?: string; id?: string };

/**
 * Expo web cannot use react-native-webview — render the same HTML player in an iframe.
 */
function CamPlayerIframe({
  html,
  playerId,
  onPlayerMessage,
}: {
  html: string;
  playerId: string;
  onPlayerMessage: (data: PlayerMsg) => void;
}) {
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      try {
        const raw = typeof event.data === 'string' ? event.data : '';
        if (!raw || raw[0] !== '{') return;
        const data = JSON.parse(raw) as PlayerMsg;
        if (data.id && data.id !== playerId) return;
        onPlayerMessage(data);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [playerId, onPlayerMessage]);

  return createElement('iframe', {
    srcDoc: html,
    title: 'IP camera stream',
    allow: 'autoplay; encrypted-media; fullscreen',
    sandbox: 'allow-scripts allow-same-origin allow-forms',
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      border: 'none',
      background: 'transparent',
      pointerEvents: 'none',
    },
  });
}

/**
 * Live camera tile using the same playback strategy as
 * https://erp.nysonik.com/it/ip-cams (WebRTC WHEP → HLS.js).
 */
export default function CamTile({
  camNum,
  camName,
  channelName,
  ch,
  quality = 'sub',
  fill = false,
  focused,
  onRemove,
  onPress,
}: Props) {
  const [playPath, setPlayPath] = useState<string | null>(null);
  const [streamQuality, setStreamQuality] = useState<IpCamStream>(quality);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const playerId = useMemo(
    () => `cam-${camNum}-ch${ch}-r${retryKey}`,
    [camNum, ch, retryKey],
  );

  const load = useCallback(async () => {
    setState('loading');
    setError(null);
    setPlayPath(null);
    try {
      const res = await api.getStream(camNum, ch, quality);
      if (res.status !== 'success' || !res.data?.play_path) {
        setError(res.message || 'Stream unavailable.');
        setState('error');
        return;
      }
      setStreamQuality((res.data.quality as IpCamStream) || quality);
      setPlayPath(res.data.play_path);
    } catch (e: any) {
      setError(e?.message || 'Could not start stream.');
      setState('error');
    }
  }, [camNum, ch, quality]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await load();
    })();
    return () => {
      alive = false;
    };
  }, [load, retryKey]);

  const html = useMemo(() => {
    if (!playPath) return null;
    return buildCamPlayerHtml({ playPath, quality: streamQuality, playerId });
  }, [playPath, streamQuality, playerId]);

  const applyPlayerMessage = useCallback((data: PlayerMsg) => {
    if (data.type === 'live') setState('playing');
    else if (data.type === 'loading') setState('loading');
    else if (data.type === 'error') {
      setError('Unable to play this camera. Tap to retry.');
      setState('error');
    }
  }, []);

  const onWebViewMessage = (event: WebViewMessageEvent) => {
    try {
      applyPlayerMessage(JSON.parse(event.nativeEvent.data || '{}') as PlayerMsg);
    } catch {
      /* ignore malformed messages */
    }
  };

  return (
    <Pressable
      style={[styles.tile, fill ? styles.fill : styles.aspect, focused && styles.focused]}
      onPress={onPress}
    >
      <LinearGradient colors={['#10131C', '#1A2433']} style={StyleSheet.absoluteFill} />

      {html ? (
        Platform.OS === 'web' ? (
          <CamPlayerIframe html={html} playerId={playerId} onPlayerMessage={applyPlayerMessage} />
        ) : (
          <WebView
            key={`${playPath}-${retryKey}`}
            originWhitelist={['*']}
            source={{ html, baseUrl: 'https://stream.nysonik.com' }}
            style={styles.webview}
            onMessage={onWebViewMessage}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            allowsFullscreenVideo={false}
            scrollEnabled={false}
            bounces={false}
            overScrollMode="never"
            setSupportMultipleWindows={false}
            mixedContentMode="always"
            thirdPartyCookiesEnabled
            sharedCookiesEnabled
            androidLayerType="hardware"
            // Keep gestures on the tile chrome (remove / press), not the WebView.
            pointerEvents="none"
          />
        )
      ) : null}

      {state === 'loading' ? (
        <View style={styles.center} pointerEvents="none">
          <ActivityIndicator color="#fff" />
          <Text style={styles.statusText}>Connecting…</Text>
        </View>
      ) : null}

      {state === 'error' ? (
        <Pressable style={styles.center} onPress={() => setRetryKey((k) => k + 1)} hitSlop={12}>
          <Ionicons name="refresh" size={26} color="rgba(255,255,255,0.7)" />
          <Text style={styles.statusText}>{error || 'Unavailable'}</Text>
          <Text style={styles.retryHint}>Tap to retry</Text>
        </Pressable>
      ) : null}

      <View style={styles.top} pointerEvents="box-none">
        <View style={[styles.liveBadge, state !== 'playing' && styles.liveBadgeIdle]}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>
            {state === 'playing' ? 'LIVE' : state === 'loading' ? '…' : 'OFF'}
          </Text>
        </View>
        {onRemove ? (
          <Pressable style={styles.remove} hitSlop={8} onPress={onRemove}>
            <Ionicons name="close" size={14} color="#fff" />
          </Pressable>
        ) : null}
      </View>

      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.foot} pointerEvents="none">
        <Text style={styles.name} numberOfLines={1}>
          {channelName}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {camName} · CH{ch}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0D0D14',
  },
  aspect: { aspectRatio: 16 / 9 },
  fill: { height: '100%' },
  focused: { borderColor: palette.primary, borderWidth: 2 },
  webview: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    opacity: 0.99, // helps Android hardware layer paint video
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 2,
  },
  statusText: {
    ...typography.small,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  retryHint: { fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: '600' },
  top: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,90,95,0.9)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  liveBadgeIdle: { backgroundColor: 'rgba(0,0,0,0.55)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  remove: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  foot: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 8,
    paddingTop: 22,
    zIndex: 3,
  },
  name: { ...typography.small, color: '#fff', fontWeight: '700' },
  meta: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
});
