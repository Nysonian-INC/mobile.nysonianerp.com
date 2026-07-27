import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Badge, { BadgeTone } from '@/components/Badge';
import Card from '@/components/Card';
import ScreenHeader from '@/components/ScreenHeader';
import { api } from '@/api/client';
import { palette, radius, spacing, typography } from '@/theme';
import { ItAsset } from '@/types';

/** Category → icon, so the list reads at a glance. */
function iconFor(category: string): keyof typeof Ionicons.glyphMap {
  const c = category.toLowerCase();
  if (c.includes('laptop') || c.includes('notebook')) return 'laptop-outline';
  if (c.includes('desktop') || c.includes('pc') || c.includes('computer')) return 'desktop-outline';
  if (c.includes('monitor') || c.includes('display') || c.includes('screen')) return 'tv-outline';
  if (c.includes('phone') || c.includes('mobile')) return 'phone-portrait-outline';
  if (c.includes('tablet') || c.includes('ipad')) return 'tablet-portrait-outline';
  if (c.includes('keyboard') || c.includes('mouse')) return 'hardware-chip-outline';
  if (c.includes('headset') || c.includes('headphone') || c.includes('audio')) return 'headset-outline';
  if (c.includes('printer') || c.includes('scanner')) return 'print-outline';
  if (c.includes('camera')) return 'camera-outline';
  return 'cube-outline';
}

function statusTone(status: string): BadgeTone {
  const s = status.toLowerCase();
  if (s.includes('assign') || s.includes('use') || s.includes('active')) return 'success';
  if (s.includes('repair') || s.includes('maintenance') || s.includes('damage')) return 'warning';
  if (s.includes('retire') || s.includes('lost') || s.includes('broken')) return 'danger';
  return 'neutral';
}

function formatDate(value: string) {
  if (!value) return '';
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AssetsScreen() {
  const [assets, setAssets] = useState<ItAsset[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (mode: 'initial' | 'refresh' = 'initial') => {
    mode === 'refresh' ? setRefreshing(true) : setLoading(true);
    setError(null);
    const res = await api.getAssets();
    if (res.status === 'success' && res.data) setAssets(res.data.assets);
    else setError(res.message || 'Could not load your assets.');
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load('initial');
  }, []);

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="My IT assets"
        subtitle="Equipment assigned to you"
        right={
          <Pressable hitSlop={10} onPress={() => router.back()}>
            <Ionicons name="close" size={22} color={palette.onInk} />
          </Pressable>
        }
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={palette.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={palette.primary} />
          }
        >
          {error ? (
            <Card>
              <Text style={styles.errorText}>{error}</Text>
            </Card>
          ) : !assets || assets.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={44} color={palette.textFaint} />
              <Text style={styles.emptyTitle}>No assets assigned</Text>
              <Text style={styles.emptyText}>Equipment issued to you will appear here.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.count}>
                {assets.length} asset{assets.length === 1 ? '' : 's'} assigned
              </Text>
              {assets.map((a) => (
                <Card key={a.id} style={styles.assetCard}>
                  <View style={styles.assetTop}>
                    <View style={styles.assetIcon}>
                      <Ionicons name={iconFor(a.category)} size={20} color={palette.primary} />
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.assetName}>{a.name || 'Asset'}</Text>
                      <Text style={styles.assetTag}>{a.tag}</Text>
                    </View>
                    {a.status ? <Badge label={a.status} tone={statusTone(a.status)} /> : null}
                  </View>

                  <View style={styles.metaGrid}>
                    {a.model ? <Meta label="Model" value={a.model} /> : null}
                    {a.serialNumber ? <Meta label="Serial no." value={a.serialNumber} /> : null}
                    {a.assignedDate ? <Meta label="Assigned" value={formatDate(a.assignedDate)} /> : null}
                    {a.category ? <Meta label="Category" value={a.category} /> : null}
                  </View>

                  {a.detail ? <Text style={styles.detail}>{a.detail}</Text> : null}
                </Card>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.meta}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  count: { ...typography.small, color: palette.textMuted, marginBottom: spacing.md },
  errorText: { ...typography.small, color: palette.danger },

  empty: { alignItems: 'center', paddingTop: spacing.huge, gap: spacing.sm },
  emptyTitle: { ...typography.h3, color: palette.text, marginTop: spacing.sm },
  emptyText: { ...typography.small, color: palette.textMuted, textAlign: 'center' },

  assetCard: { marginBottom: spacing.md },
  assetTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  assetIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetName: { ...typography.bodyBold, color: palette.text },
  assetTag: { ...typography.caption, color: palette.textFaint, textTransform: 'none', marginTop: 2 },

  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  meta: { width: '50%', marginBottom: spacing.md },
  metaLabel: { ...typography.caption, color: palette.textFaint, textTransform: 'none' },
  metaValue: { ...typography.small, color: palette.text, fontWeight: '600', marginTop: 2 },

  detail: {
    ...typography.small,
    color: palette.textMuted,
    lineHeight: 19,
    backgroundColor: palette.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
});
