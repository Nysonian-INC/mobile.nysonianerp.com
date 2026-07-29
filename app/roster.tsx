import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Badge, { BadgeTone } from '@/components/Badge';
import Card from '@/components/Card';
import ScreenHeader from '@/components/ScreenHeader';
import SectionHeader from '@/components/SectionHeader';
import StateView from '@/components/StateView';
import { api } from '@/api/client';
import { useReadOnlyResource } from '@/hooks/useReadOnlyResource';
import { palette, radius, spacing, typography } from '@/theme';
import { RosterDay, RosterDayStatus } from '@/types';

const WEEKDAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function statusTone(status: RosterDayStatus): BadgeTone {
  if (status === 'off') return 'danger';
  if (status === 'wfh') return 'info';
  return 'success';
}

function statusIcon(status: RosterDayStatus): keyof typeof Ionicons.glyphMap {
  if (status === 'off') return 'moon-outline';
  if (status === 'wfh') return 'home-outline';
  return 'briefcase-outline';
}

function dayCellColors(status: RosterDayStatus, inMonth: boolean) {
  if (!inMonth) {
    return { bg: 'transparent', fg: palette.textFaint, border: 'transparent' };
  }
  if (status === 'off') {
    return { bg: palette.dangerLight, fg: palette.dangerDark, border: 'rgba(240,68,75,0.25)' };
  }
  if (status === 'wfh') {
    return { bg: palette.infoLight, fg: palette.infoDark, border: 'rgba(11,165,199,0.25)' };
  }
  return { bg: palette.surfaceAlt, fg: palette.textMuted, border: palette.border };
}

function PreviewDay({ day, eyebrow }: { day: RosterDay; eyebrow: string }) {
  return (
    <View style={styles.previewCard}>
      <Text style={styles.previewEyebrow}>{eyebrow}</Text>
      <Text style={styles.previewDate}>{day.label}</Text>
      <Badge label={day.statusLabel} tone={statusTone(day.status)} dot />
    </View>
  );
}

export default function RosterScreen() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, loading, refreshing, error, refresh, retry } = useReadOnlyResource(
    () => api.getRoster({ year, month }),
    [year, month],
  );

  const days = data?.days ?? [];
  const markedDays = useMemo(
    () => days.filter((d) => d.inMonth !== false && d.status !== 'working'),
    [days],
  );

  const shiftMonth = (delta: number) => {
    const next = new Date(year, month - 1 + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Roster"
        subtitle="Weekly off & work from home"
        right={
          <Pressable hitSlop={10} onPress={() => router.back()}>
            <Ionicons name="close" size={22} color={palette.onInk} />
          </Pressable>
        }
      />

      {loading && !data ? (
        <StateView loading />
      ) : error && !data ? (
        <View style={styles.stateWrap}>
          <StateView error={error} onRetry={retry} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.primary} />
          }
        >
          <View style={styles.previewRow}>
            <PreviewDay day={data!.today} eyebrow="Today" />
            <PreviewDay day={data!.tomorrow} eyebrow="Tomorrow" />
          </View>

          <SectionHeader title="Month view" />
          <Card padded>
            <View style={styles.monthNav}>
              <Pressable
                onPress={() => shiftMonth(-1)}
                hitSlop={8}
                style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="chevron-back" size={18} color={palette.text} />
              </Pressable>
              <Text style={styles.monthLabel}>{data?.monthLabel || `${month}/${year}`}</Text>
              <Pressable
                onPress={() => shiftMonth(1)}
                hitSlop={8}
                style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="chevron-forward" size={18} color={palette.text} />
              </Pressable>
            </View>

            <View style={styles.weekHeader}>
              {WEEKDAY_HEADERS.map((h, i) => (
                <Text key={`${h}-${i}`} style={styles.weekHeaderText}>
                  {h}
                </Text>
              ))}
            </View>

            <View style={styles.grid}>
              {days.map((day) => {
                const inMonth = day.inMonth !== false;
                const colors = dayCellColors(day.status, inMonth);
                const dayNum = Number(String(day.date).slice(8, 10)) || 0;
                return (
                  <View
                    key={day.date}
                    style={[
                      styles.dayCell,
                      {
                        backgroundColor: colors.bg,
                        borderColor: colors.border,
                        opacity: inMonth ? 1 : 0.45,
                      },
                    ]}
                  >
                    <Text style={[styles.dayNum, { color: colors.fg }]}>{dayNum}</Text>
                    {inMonth && day.status !== 'working' ? (
                      <View
                        style={[
                          styles.dayDot,
                          {
                            backgroundColor:
                              day.status === 'off' ? palette.danger : palette.info,
                          },
                        ]}
                      />
                    ) : null}
                  </View>
                );
              })}
            </View>

            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: palette.danger }]} />
                <Text style={styles.legendText}>Weekly Off</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: palette.info }]} />
                <Text style={styles.legendText}>Work From Home</Text>
              </View>
            </View>
          </Card>

          <SectionHeader title="Marked days" />
          <Card padded>
            {markedDays.length === 0 ? (
              <Text style={styles.empty}>No weekly off or WFH days in this month.</Text>
            ) : (
              markedDays.map((day, i) => (
                <View
                  key={day.date}
                  style={[styles.markedRow, i < markedDays.length - 1 && styles.divider]}
                >
                  <View
                    style={[
                      styles.markedIcon,
                      {
                        backgroundColor:
                          day.status === 'off' ? palette.dangerLight : palette.infoLight,
                      },
                    ]}
                  >
                    <Ionicons
                      name={statusIcon(day.status)}
                      size={16}
                      color={day.status === 'off' ? palette.dangerDark : palette.infoDark}
                    />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.markedTitle}>{day.label}</Text>
                    <Text style={styles.markedSub}>{day.weekdayLabel}</Text>
                  </View>
                  <Badge label={day.statusLabel} tone={statusTone(day.status)} />
                </View>
              ))
            )}
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  flex: { flex: 1 },
  stateWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, paddingTop: spacing.md },

  previewRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  previewCard: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.md,
    gap: 6,
  },
  previewEyebrow: { ...typography.caption, color: palette.textMuted, textTransform: 'uppercase' },
  previewDate: { ...typography.bodyBold, color: palette.text },

  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: { ...typography.h3, color: palette.text },

  weekHeader: { flexDirection: 'row', marginBottom: spacing.sm },
  weekHeaderText: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    ...typography.caption,
    color: palette.textMuted,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dayNum: { ...typography.caption, fontVariant: ['tabular-nums'] },
  dayDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 3 },

  legend: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { ...typography.small, color: palette.textMuted },

  markedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  markedIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markedTitle: { ...typography.bodyBold, color: palette.text },
  markedSub: { ...typography.small, color: palette.textMuted, marginTop: 2 },
  divider: { borderBottomWidth: 1, borderBottomColor: palette.border },
  empty: { ...typography.small, color: palette.textMuted, paddingVertical: spacing.sm },
});
