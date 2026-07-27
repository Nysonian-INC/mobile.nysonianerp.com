import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import Card from '@/components/Card';
import ScreenHeader from '@/components/ScreenHeader';
import StateView from '@/components/StateView';
import { useDashboard } from '@/hooks/useDashboard';
import { fonts, palette, radius, spacing, typography } from '@/theme';
import { BioMachine, BioMachineFetchTone, BioMachinesData } from '@/types';

function fetchToneColor(tone: BioMachineFetchTone): string {
  if (tone === 'fresh') return palette.successDark;
  if (tone === 'stale') return palette.warningDark;
  if (tone === 'none') return palette.textMuted;
  return palette.text;
}

export default function BiometricMachinesScreen() {
  const insets = useSafeAreaInsets();
  const { data: dashboard, loading: dashLoading } = useDashboard();
  const allowed = Boolean(dashboard?.permissions?.itDashboard);

  const [data, setData] = useState<BioMachinesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!dashLoading && dashboard && !allowed) {
        router.replace('/(tabs)/profile' as never);
      }
    }, [dashLoading, dashboard, allowed]),
  );

  const load = useCallback(async (soft = false) => {
    if (!soft) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await api.getBioMachines();
      if (res.status === 'success' && res.data) {
        setData(res.data);
      } else {
        setData(null);
        setError(res.message || 'Could not load biometric machines.');
      }
    } catch (err: any) {
      setData(null);
      setError(err?.message || 'Network error.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (allowed) {
        load(false);
      }
    }, [allowed, load]),
  );

  if (dashLoading && !dashboard) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Biometric machines"
        subtitle="IT · Live reachability"
        right={
          <Pressable hitSlop={10} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={22} color={palette.onInk} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={palette.primary}
          />
        }
      >
        <View style={styles.body}>
          {loading && !data ? (
            <Card padded>
              <ActivityIndicator color={palette.primary} />
            </Card>
          ) : error && !data ? (
            <StateView error={error} onRetry={() => load(false)} />
          ) : (
            <>
              {/* Hero: online is the only dominant figure; offline is secondary. */}
              <View style={styles.hero}>
                <View style={styles.heroPrimary}>
                  <Text style={styles.heroValue}>{data?.summary.online ?? 0}</Text>
                  <Text style={styles.heroLabel}>Online</Text>
                </View>
                <View style={styles.heroSide}>
                  <Text style={styles.heroSideValue}>{data?.summary.offline ?? 0}</Text>
                  <Text style={styles.heroSideLabel}>Offline</Text>
                </View>
              </View>

              {!data?.machines.length ? (
                <StateView
                  empty
                  emptyIcon="finger-print-outline"
                  emptyTitle="No machines"
                  emptyText="No biometric machines are configured yet."
                />
              ) : (
                data.machines.map((m) => (
                  <MachineRow key={m.deviceId || m.deviceName} machine={m} />
                ))
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function MachineRow({ machine }: { machine: BioMachine }) {
  const online = machine.status === 'online';

  return (
    <View
      style={[styles.machine, online ? styles.machineOnline : styles.machineOffline]}
      accessibilityLabel={`${machine.deviceName}, ${online ? 'online' : 'offline'}`}
    >
      <View style={[styles.rail, online ? styles.railOnline : styles.railOffline]} />

      <View style={styles.machineBody}>
        <View style={styles.machineHeader}>
          {machine.deviceId ? (
            <View style={styles.idChip}>
              <Text style={styles.idChipText}>{machine.deviceId}</Text>
            </View>
          ) : null}
          <View style={[styles.statusChip, online ? styles.statusOnline : styles.statusOffline]}>
            <View style={[styles.statusDot, online ? styles.dotOnline : styles.dotOffline]} />
            <Text style={[styles.statusText, online ? styles.statusTextOnline : styles.statusTextOffline]}>
              {online ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        <Text style={styles.machineName}>{machine.deviceName}</Text>

        <View style={styles.rows}>
          <FieldRow label="Office" value={machine.office || '—'} />
          <FieldRow label="IP" value={machine.ip || '—'} mono />
          <FieldRow label="Port" value={machine.port ? String(machine.port) : '—'} mono />
          <FieldRow
            label="Latest"
            value={machine.lastRecordTime || 'No logs yet'}
            mono
            valueColor={fetchToneColor(machine.fetchTone)}
            hint={machine.lastRecordRelative}
            last
          />
        </View>
      </View>
    </View>
  );
}

function FieldRow({
  label,
  value,
  mono,
  valueColor,
  hint,
  last,
}: {
  label: string;
  value: string;
  mono?: boolean;
  valueColor?: string;
  hint?: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.fieldRow, !last && styles.fieldRowBorder]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldValueWrap}>
        <Text
          style={[
            styles.fieldValue,
            mono && styles.mono,
            valueColor ? { color: valueColor } : null,
          ]}
          selectable
        >
          {value}
        </Text>
        {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      </View>
    </View>
  );
}

const LABEL_COL = 64;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  body: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.md,
  },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    gap: spacing.xl,
  },
  heroPrimary: { flex: 1 },
  heroValue: {
    fontFamily: fonts.extrabold,
    fontSize: 48,
    lineHeight: 52,
    color: palette.successDark,
    fontVariant: ['tabular-nums'],
    letterSpacing: -1.2,
  },
  heroLabel: {
    ...typography.overline,
    color: palette.textMuted,
    marginTop: 2,
    letterSpacing: 1.2,
  },
  heroSide: {
    minWidth: 72,
    paddingLeft: spacing.lg,
    borderLeftWidth: 1,
    borderLeftColor: palette.border,
    alignItems: 'flex-start',
  },
  heroSideValue: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 32,
    color: palette.dangerDark,
    fontVariant: ['tabular-nums'],
  },
  heroSideLabel: {
    ...typography.caption,
    color: palette.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  machine: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
  },
  machineOnline: {},
  machineOffline: {},
  rail: { width: 5 },
  railOnline: { backgroundColor: palette.success },
  railOffline: { backgroundColor: palette.danger },
  machineBody: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    minWidth: 0,
  },
  machineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  idChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: palette.surfaceAlt,
    borderWidth: 1,
    borderColor: palette.border,
  },
  idChipText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: palette.text,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontVariant: ['tabular-nums'],
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  statusOnline: { backgroundColor: palette.successLight },
  statusOffline: { backgroundColor: palette.dangerLight },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  dotOnline: { backgroundColor: palette.success },
  dotOffline: { backgroundColor: palette.danger },
  statusText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  statusTextOnline: { color: palette.successDark },
  statusTextOffline: { color: palette.dangerDark },

  machineName: {
    ...typography.h3,
    color: palette.text,
    marginBottom: spacing.md,
    lineHeight: 24,
  },

  rows: {
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  fieldRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  fieldLabel: {
    width: LABEL_COL,
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 20,
    color: palette.textMuted,
  },
  fieldValueWrap: {
    flex: 1,
    minWidth: 0,
  },
  fieldValue: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: palette.text,
  },
  fieldHint: {
    ...typography.small,
    color: palette.textMuted,
    marginTop: 2,
  },
  mono: {
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.15,
  },
});
