import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '@/api/client';
import BarChart from '@/components/BarChart';
import Card from '@/components/Card';
import ScreenHeader from '@/components/ScreenHeader';
import Screen from '@/components/Screen';
import SectionHeader from '@/components/SectionHeader';
import SegmentedControl from '@/components/SegmentedControl';
import { useDashboard } from '@/hooks/useDashboard';
import { fonts, palette, radius, spacing, typography } from '@/theme';
import { AttendanceDay, TimeDocLog } from '@/types';

type LogTab = 'biometric' | 'timeDoctor';

const TABS: Array<{ key: LogTab; label: string }> = [
  { key: 'biometric', label: 'Biometric' },
  { key: 'timeDoctor', label: 'Time Doctor' },
];

export default function AttendanceScreen() {
  const { data, loading, error, retry } = useDashboard();
  const [logTab, setLogTab] = useState<LogTab>('biometric');
  const [tdLogs, setTdLogs] = useState<TimeDocLog[] | null>(null);
  const [tdLoading, setTdLoading] = useState(false);
  const [tdError, setTdError] = useState<string | null>(null);
  const [tdFetched, setTdFetched] = useState(false);

  const loadTimeDoc = useCallback(async () => {
    setTdLoading(true);
    setTdError(null);
    try {
      const res = await api.getTimeDocLogs(30);
      if (res.status === 'success' && res.data) {
        setTdLogs(res.data.logs ?? []);
        setTdFetched(true);
      } else {
        setTdError(res.message || 'Could not load Time Doctor logs.');
      }
    } catch {
      setTdError('Network error.');
    } finally {
      setTdLoading(false);
    }
  }, []);

  useEffect(() => {
    if (logTab === 'timeDoctor' && !tdFetched && !tdLoading) {
      loadTimeDoc();
    }
  }, [logTab, tdFetched, tdLoading, loadTimeDoc]);

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={palette.primary} size="large" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || 'Could not load attendance.'}</Text>
        <Pressable
          onPress={retry}
          hitSlop={8}
          style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="refresh" size={16} color={palette.primary} />
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const { attendance, lateComings } = data;
  const days = attendance ?? [];
  const avg = days.length
    ? days.reduce((s, a) => s + (Number(a.workingHours) || 0), 0) / days.length
    : 0;
  const onTime = days.filter((a) => !a.late).length;
  const trend = [...days].reverse().map((a) => ({
    label: String(a.label || '').split(' ')[0] || '–',
    value: Number(a.workingHours) || 0,
    highlight: true,
  }));

  return (
    <View style={styles.root}>
      <ScreenHeader title="Attendance" subtitle="Last 14 working days" />
      <Screen contentStyle={{ paddingTop: spacing.lg }}>
        <View style={styles.kpis}>
          <Kpi value={`${avg.toFixed(1)}h`} label="Avg / day" tone={palette.primaryDark} />
          <Kpi value={String(onTime)} label="On time" tone={palette.successDark} />
          <Kpi value={String(lateComings)} label="Late" tone={palette.warningDark} />
        </View>

        <SectionHeader title="Working hours trend" />
        <Card>
          <BarChart data={trend} height={180} />
        </Card>

        <SectionHeader title="Log" />
        <SegmentedControl tabs={TABS} active={logTab} onSelect={setLogTab} />

        <View style={styles.logGap}>
          {logTab === 'biometric' ? (
            <BiometricLog days={days} />
          ) : (
            <TimeDoctorLog logs={tdLogs} loading={tdLoading} error={tdError} onRetry={loadTimeDoc} />
          )}
        </View>
      </Screen>
    </View>
  );
}

const BiometricLog = memo(function BiometricLog({ days }: { days: AttendanceDay[] }) {
  return (
    <Card padded>
      {days.length === 0 ? (
        <Text style={styles.emptyText}>No attendance records yet.</Text>
      ) : (
        days.map((a, i) => (
          <View key={a.date || String(i)} style={[styles.row, i < days.length - 1 && styles.divider]}>
            <View style={styles.dateCol}>
              <Text style={styles.day}>{String(a.label || '').split(' ')[0]}</Text>
              <Text style={styles.dow}>{String(a.label || '').split(' ')[2]}</Text>
            </View>
            <View style={styles.times}>
              <Time icon="log-in-outline" value={a.checkIn} />
              <Time icon="log-out-outline" value={a.checkOut} />
            </View>
            <View style={styles.hoursCol}>
              <Text style={styles.hours}>{a.workingHours}h</Text>
              {a.late ? (
                <View style={styles.lateTag}>
                  <Text style={styles.lateText}>Late</Text>
                </View>
              ) : (
                <Ionicons name="checkmark-circle" size={16} color={palette.success} />
              )}
            </View>
          </View>
        ))
      )}
    </Card>
  );
});

const TimeDoctorLog = memo(function TimeDoctorLog({
  logs,
  loading,
  error,
  onRetry,
}: {
  logs: TimeDocLog[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading && !logs) {
    return (
      <Card padded>
        <View style={styles.inlineCenter}>
          <ActivityIndicator color={palette.primary} />
          <Text style={styles.emptyText}>Loading Time Doctor…</Text>
        </View>
      </Card>
    );
  }

  if (error && !logs) {
    return (
      <Card padded>
        <View style={styles.inlineCenter}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={onRetry}
            hitSlop={8}
            style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="refresh" size={16} color={palette.primary} />
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      </Card>
    );
  }

  const list = logs ?? [];

  return (
    <Card padded>
      {list.length === 0 ? (
        <Text style={styles.emptyText}>No Time Doctor logs yet.</Text>
      ) : (
        list.map((log, i) => {
          const parts = String(log.label || '').split(' ');
          const worked = log.trackedTime && log.trackedTime !== '—' ? log.trackedTime : '—';
          const idle = log.idleTime && log.idleTime !== '—' ? log.idleTime : '—';
          const total = log.actualTime && log.actualTime !== '—' ? log.actualTime : '—';
          return (
            <View key={log.id || String(i)} style={[styles.row, i < list.length - 1 && styles.divider]}>
              <View style={styles.dateCol}>
                <Text style={styles.day}>{parts[0] || '–'}</Text>
                <Text style={styles.dow}>{parts[1] || ''}</Text>
              </View>
              <View style={styles.tdMetrics}>
                <TdMetric label="Worked" value={worked} />
                <TdMetric
                  label="Idle"
                  value={idle}
                  valueStyle={log.idleMinutes > 120 ? styles.tdIdleWarn : undefined}
                />
                <TdMetric label="Total" value={total} valueStyle={styles.tdTotal} />
              </View>
            </View>
          );
        })
      )}
    </Card>
  );
});

const Kpi = memo(function Kpi({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone: string;
}) {
  return (
    <Card style={styles.kpi}>
      <Text style={[styles.kpiVal, { color: tone }]}>{value}</Text>
      <Text style={styles.kpiLbl}>{label}</Text>
    </Card>
  );
});

function Time({ icon, value }: { icon: keyof typeof Ionicons.glyphMap; value: string | null }) {
  return (
    <View style={styles.time}>
      <Ionicons name={icon} size={14} color={palette.textMuted} />
      <Text style={styles.timeText}>{value ?? '—'}</Text>
    </View>
  );
}

function TdMetric({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: object;
}) {
  return (
    <View style={styles.tdMetric}>
      <Text style={styles.tdMetricLabel}>{label}</Text>
      <Text style={[styles.tdMetricValue, valueStyle]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.background,
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  inlineCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  errorText: { ...typography.small, color: palette.danger, textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  retryText: { ...typography.small, color: palette.primary, fontFamily: fonts.bold },
  emptyText: { ...typography.small, color: palette.textMuted },
  kpis: { flexDirection: 'row', gap: spacing.md },
  kpi: { flex: 1, alignItems: 'center', paddingVertical: spacing.lg },
  kpiVal: { ...typography.h1, fontVariant: ['tabular-nums'] },
  kpiLbl: {
    ...typography.caption,
    color: palette.textMuted,
    textTransform: 'none',
    marginTop: spacing.xs,
    fontFamily: fonts.medium,
  },
  logGap: { marginTop: spacing.md },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  divider: { borderBottomWidth: 1, borderBottomColor: palette.border },
  dateCol: { width: 46 },
  day: { ...typography.h3, color: palette.text },
  dow: { ...typography.caption, color: palette.textFaint, textTransform: 'none' },
  times: { flex: 1, gap: spacing.xs, paddingLeft: spacing.md },
  time: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { ...typography.small, color: palette.textMuted },
  hoursCol: { alignItems: 'flex-end', gap: 2, minWidth: 72 },
  hours: { ...typography.bodyBold, color: palette.text, fontVariant: ['tabular-nums'] },
  tdMetrics: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingLeft: spacing.md,
  },
  tdMetric: { alignItems: 'flex-end', minWidth: 52 },
  tdMetricLabel: {
    ...typography.caption,
    color: palette.textFaint,
    textTransform: 'none',
    marginBottom: 2,
  },
  tdMetricValue: {
    ...typography.small,
    color: palette.text,
    fontFamily: fonts.semibold,
    fontVariant: ['tabular-nums'],
  },
  tdTotal: { color: palette.success, fontFamily: fonts.bold },
  tdIdleWarn: { color: palette.danger, fontFamily: fonts.bold },
  lateTag: {
    backgroundColor: palette.warningLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  lateText: { ...typography.caption, color: palette.warningDark, textTransform: 'none' },
});
