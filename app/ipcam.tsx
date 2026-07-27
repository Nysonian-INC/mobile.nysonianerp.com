import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CamTile from '@/components/CamTile';
import { api } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { MAX_MULTI_STREAMS } from '@/data/ipcam';
import { palette, radius, spacing, typography } from '@/theme';
import { Camera, IpCamData, IpCamViewMode } from '@/types';

type TileRef = { camNum: number; ch: number };

const MODES: Array<{ key: IpCamViewMode; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'single', label: 'Single', icon: 'tv-outline' },
  { key: 'multi', label: 'Multi', icon: 'grid-outline' },
  { key: 'template', label: 'Template', icon: 'albums-outline' },
];

/** Single = full width; everything else = 2 per row. */
function colsFor(count: number) {
  return count <= 1 ? 1 : 2;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function IpCamScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();

  const [data, setData] = useState<IpCamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<IpCamViewMode>('single');
  const [single, setSingle] = useState<TileRef | null>(null);
  const [multi, setMulti] = useState<TileRef[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [clock, setClock] = useState('');

  useEffect(() => {
    let alive = true;
    api.getIpCams().then((res) => {
      if (!alive) return;
      if (res.data) {
        setData(res.data);
        const c = res.data.cameras[0];
        if (c?.channels[0]) setSingle({ camNum: c.camNum, ch: c.channels[0].ch });
        setExpanded(c ? [c.camNum] : []);
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const camByNum = useMemo(() => {
    const m = new Map<number, Camera>();
    data?.cameras.forEach((c) => m.set(c.camNum, c));
    return m;
  }, [data]);

  const label = (ref: TileRef) => {
    const cam = camByNum.get(ref.camNum);
    const channel = cam?.channels.find((c) => c.ch === ref.ch);
    return { camName: cam?.name ?? `Cam ${ref.camNum}`, channelName: channel?.name ?? `CH${ref.ch}` };
  };

  if (!isAuthenticated) return <Redirect href="/login" />;

  const tiles: TileRef[] =
    mode === 'single'
      ? single
        ? [single]
        : []
      : mode === 'multi'
        ? multi
        : (data?.templates.find((t) => t.id === activeTemplate)?.tiles ?? []);

  const onChannelPress = (ref: TileRef) => {
    if (mode === 'single') {
      setSingle(ref);
    } else if (mode === 'multi') {
      setMulti((prev) => {
        const exists = prev.some((t) => t.camNum === ref.camNum && t.ch === ref.ch);
        if (exists) return prev.filter((t) => !(t.camNum === ref.camNum && t.ch === ref.ch));
        if (prev.length >= MAX_MULTI_STREAMS) return prev;
        return [...prev, ref];
      });
    }
  };

  const isSelected = (ref: TileRef) =>
    mode === 'single'
      ? single?.camNum === ref.camNum && single?.ch === ref.ch
      : multi.some((t) => t.camNum === ref.camNum && t.ch === ref.ch);

  const contextLabel =
    mode === 'multi'
      ? `${multi.length}/${MAX_MULTI_STREAMS} streams`
      : mode === 'template'
        ? (data?.templates.find((t) => t.id === activeTemplate)?.name ?? 'Template')
        : 'Single view';

  /** Reusable grid; `fill` makes tiles stretch to fill available height (fullscreen). */
  const renderGrid = (fill: boolean) => {
    const cols = colsFor(tiles.length);
    const rows = chunk(tiles, cols);
    return (
      <View style={[styles.grid, fill && styles.gridFill]}>
        {rows.map((row, ri) => (
          <View key={ri} style={[styles.gridRow, fill && styles.gridRowFill]}>
            {row.map((ref) => {
              const l = label(ref);
              return (
                <CamTile
                  key={`${ref.camNum}-${ref.ch}`}
                  camNum={ref.camNum}
                  camName={l.camName}
                  channelName={l.channelName}
                  ch={ref.ch}
                  fill={fill}
                  onRemove={
                    mode === 'multi'
                      ? () =>
                          setMulti((p) => p.filter((t) => !(t.camNum === ref.camNum && t.ch === ref.ch)))
                      : undefined
                  }
                />
              );
            })}
            {row.length < cols
              ? Array.from({ length: cols - row.length }).map((_, i) => (
                  <View key={`sp-${i}`} style={styles.flex} />
                ))
              : null}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      {/* Header — close on the right (same Advance dismiss pattern as Find employees). */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.flex}>
          <Text style={styles.title}>IP Cameras</Text>
          <Text style={styles.subtitle}>{data?.cameras.length ?? 0} sites · all channels</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.clockPill}>
            <View style={styles.liveDot} />
            <Text style={styles.clockText}>{clock}</Text>
          </View>
          <Pressable
            hitSlop={10}
            onPress={() => router.back()}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* Mode switch */}
      <View style={styles.modeRow}>
        {MODES.map((m) => {
          const active = mode === m.key;
          return (
            <Pressable
              key={m.key}
              onPress={() => setMode(m.key)}
              style={[styles.modeBtn, active && styles.modeBtnActive]}
            >
              <Ionicons name={m.icon} size={16} color={active ? '#fff' : palette.textMuted} />
              <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Player area (height grows with the number of cameras) */}
        <View style={styles.player}>
          {loading ? (
            <View style={styles.playerEmpty}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.emptyText}>Loading channels…</Text>
            </View>
          ) : tiles.length === 0 ? (
            <View style={styles.playerEmpty}>
              <Ionicons name="videocam-off-outline" size={30} color="rgba(255,255,255,0.4)" />
              <Text style={styles.emptyText}>
                {mode === 'template'
                  ? 'Pick a template below to load a grid.'
                  : mode === 'multi'
                    ? 'Tap channels below to add them to the grid.'
                    : 'Tap a channel below to start watching.'}
              </Text>
            </View>
          ) : (
            renderGrid(false)
          )}
        </View>

        {/* Toolbar: context + fullscreen */}
        <View style={styles.toolbar}>
          <Text style={styles.toolbarLabel}>{contextLabel}</Text>
          <Pressable
            onPress={() => setFullscreen(true)}
            disabled={tiles.length === 0}
            style={[styles.fsBtn, tiles.length === 0 && styles.fsBtnDisabled]}
          >
            <Ionicons name="expand" size={16} color={palette.white} />
            <Text style={styles.fsBtnText}>Fullscreen</Text>
          </Pressable>
        </View>

        {/* Picker: templates OR camera/channel accordion */}
        <View style={styles.picker}>
          {mode === 'template' ? (
            <>
              <Text style={styles.pickerTitle}>Templates</Text>
              {data?.templates.map((t) => {
                const active = activeTemplate === t.id;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => setActiveTemplate(t.id)}
                    style={[styles.tplCard, active && styles.tplCardActive]}
                  >
                    <View style={styles.tplIcon}>
                      <Ionicons name="albums" size={18} color={palette.primary} />
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.tplName}>{t.name}</Text>
                      <Text style={styles.tplMeta}>{t.tiles.length} channels</Text>
                    </View>
                    {active ? (
                      <Ionicons name="checkmark-circle" size={20} color={palette.primary} />
                    ) : null}
                  </Pressable>
                );
              })}
            </>
          ) : (
            <>
              <Text style={styles.pickerTitle}>
                {mode === 'multi' ? 'Tap channels to add / remove' : 'Tap a channel to view'}
              </Text>
              {data?.cameras.map((cam) => {
                const open = expanded.includes(cam.camNum);
                return (
                  <View key={cam.camNum} style={styles.accItem}>
                    <Pressable
                      style={styles.accHead}
                      onPress={() =>
                        setExpanded((p) =>
                          p.includes(cam.camNum)
                            ? p.filter((n) => n !== cam.camNum)
                            : [...p, cam.camNum],
                        )
                      }
                    >
                      <View style={styles.accIcon}>
                        <Ionicons name="business" size={15} color={palette.primary} />
                      </View>
                      <View style={styles.flex}>
                        <Text style={styles.accTitle}>{cam.name}</Text>
                        <Text style={styles.accHost}>
                          {cam.hostLabel} · {cam.channels.length} ch
                        </Text>
                      </View>
                      <Ionicons
                        name={open ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={palette.textFaint}
                      />
                    </Pressable>
                    {open ? (
                      <View style={styles.chWrap}>
                        {cam.channels.map((c) => {
                          const ref = { camNum: cam.camNum, ch: c.ch };
                          const sel = isSelected(ref);
                          return (
                            <Pressable
                              key={c.ch}
                              onPress={() => onChannelPress(ref)}
                              style={[styles.chChip, sel && styles.chChipActive]}
                            >
                              <Text style={[styles.chNum, sel && styles.chTextActive]}>CH{c.ch}</Text>
                              <Text
                                style={[styles.chName, sel && styles.chTextActive]}
                                numberOfLines={1}
                              >
                                {c.name}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </>
          )}
        </View>
      </ScrollView>

      {/* Fullscreen viewer */}
      <Modal visible={fullscreen} animationType="fade" onRequestClose={() => setFullscreen(false)}>
        <View style={styles.fsRoot}>
          <View style={[styles.fsBar, { paddingTop: insets.top + spacing.xs }]}>
            <Text style={styles.fsTitle}>{contextLabel}</Text>
            <Pressable onPress={() => setFullscreen(false)} style={styles.fsClose} hitSlop={10}>
              <Ionicons name="contract" size={18} color="#fff" />
              <Text style={styles.fsCloseText}>Exit</Text>
            </Pressable>
          </View>
          <View style={[styles.fsStage, { paddingBottom: insets.bottom + spacing.sm }]}>
            {tiles.length > 0 ? renderGrid(true) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: palette.ink,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.h2, color: '#fff' },
  subtitle: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'none',
    marginTop: 1,
  },
  clockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: palette.danger },
  clockText: { color: '#fff', fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },

  modeRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, backgroundColor: palette.ink },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  modeBtnActive: { backgroundColor: palette.primary },
  modeLabel: { ...typography.small, color: palette.textFaint, fontWeight: '700' },
  modeLabelActive: { color: '#fff' },

  player: { backgroundColor: '#09090F', padding: spacing.sm },
  playerEmpty: { minHeight: 210, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  emptyText: { ...typography.small, color: 'rgba(255,255,255,0.6)', textAlign: 'center', maxWidth: 260 },
  grid: { gap: spacing.sm },
  gridFill: { flex: 1 },
  gridRow: { flexDirection: 'row', gap: spacing.sm },
  gridRowFill: { flex: 1 },

  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  toolbarLabel: { ...typography.small, color: palette.textMuted, fontWeight: '600' },
  fsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    borderRadius: radius.md,
  },
  fsBtnDisabled: { opacity: 0.4 },
  fsBtnText: { ...typography.small, color: palette.white, fontWeight: '700' },

  picker: { padding: spacing.lg },
  pickerTitle: { ...typography.small, color: palette.textMuted, marginBottom: spacing.md, fontWeight: '600' },

  accItem: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  accHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  accIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accTitle: { ...typography.bodyBold, color: palette.text },
  accHost: { ...typography.caption, color: palette.textFaint, textTransform: 'none', marginTop: 1 },
  chWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, padding: spacing.md, paddingTop: 0 },
  chChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: palette.surfaceAlt,
    borderWidth: 1,
    borderColor: palette.border,
    maxWidth: '47%',
  },
  chChipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  chNum: { ...typography.caption, color: palette.textMuted, textTransform: 'none', fontWeight: '800' },
  chName: { ...typography.caption, color: palette.text, textTransform: 'none', flexShrink: 1 },
  chTextActive: { color: '#fff' },

  tplCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    marginBottom: spacing.sm,
  },
  tplCardActive: { borderColor: palette.primary, backgroundColor: palette.primaryLight },
  tplIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tplName: { ...typography.bodyBold, color: palette.text },
  tplMeta: { ...typography.caption, color: palette.textFaint, textTransform: 'none', marginTop: 1 },

  // Fullscreen viewer
  fsRoot: { flex: 1, backgroundColor: '#000' },
  fsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: palette.ink,
  },
  fsTitle: { ...typography.bodyBold, color: '#fff' },
  fsClose: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.md,
  },
  fsCloseText: { ...typography.small, color: '#fff', fontWeight: '700' },
  fsStage: { flex: 1, padding: spacing.sm },
});
