import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { api } from '@/api/client';
import { initialsFromName } from '@/components/InitialsAvatar';
import { fonts, palette, typography } from '@/theme';

type Props = {
  name: string;
  /** When truthy, Avatar loads the signed-in employee's photo via the mobile API. */
  uri?: string | null;
  size?: number;
  /** Soft outer ring — used when the avatar sits on the dark header. */
  ring?: boolean;
};

/** Module-level cache so tab remounts don't re-fetch the same base64 photo. */
const photoCache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

async function loadProfilePhoto(cacheKey: string): Promise<string | null> {
  const cached = photoCache.get(cacheKey);
  if (cached) return cached;
  const pending = inflight.get(cacheKey);
  if (pending) return pending;

  const request = (async () => {
    try {
      const res = await api.getProfilePhoto();
      if (res.status === 'success' && res.data?.base64) {
        const mime = res.data.mime || 'image/jpeg';
        const dataUri = `data:${mime};base64,${res.data.base64}`;
        photoCache.set(cacheKey, dataUri);
        return dataUri;
      }
    } catch {
      /* fall through */
    }
    return null;
  })().finally(() => {
    inflight.delete(cacheKey);
  });

  inflight.set(cacheKey, request);
  return request;
}

export default function Avatar({ name, uri, size = 64, ring = false }: Props) {
  const [dataUri, setDataUri] = useState<string | null>(() =>
    uri ? photoCache.get('self') ?? null : null,
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);

    if (!uri) {
      setDataUri(null);
      return;
    }

    const cached = photoCache.get('self');
    if (cached) {
      setDataUri(cached);
      return;
    }

    setDataUri(null);
    (async () => {
      const next = await loadProfilePhoto('self');
      if (!cancelled) {
        if (next) setDataUri(next);
        else setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uri]);

  const dim = { width: size, height: size, borderRadius: size / 2 };
  const ringStyle = ring
    ? { padding: 3, borderRadius: (size + 6) / 2, backgroundColor: palette.onInkSurface }
    : undefined;

  const showImage = !!dataUri && !failed;

  const inner = showImage ? (
    <Image
      source={{ uri: dataUri }}
      style={[styles.img, dim]}
      onError={() => setFailed(true)}
    />
  ) : (
    <LinearGradient
      colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.12)']}
      style={[styles.fallback, dim]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initialsFromName(name)}</Text>
    </LinearGradient>
  );

  return ring ? <View style={ringStyle}>{inner}</View> : inner;
}

const styles = StyleSheet.create({
  img: { backgroundColor: palette.surfaceAlt },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  initials: { ...typography.h2, color: palette.white, fontFamily: fonts.extrabold },
});
