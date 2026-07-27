import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '@/components/Avatar';
import Badge from '@/components/Badge';
import BarChart from '@/components/BarChart';
import Card from '@/components/Card';
import ListRow from '@/components/ListRow';
import ProgressBar from '@/components/ProgressBar';
import SectionHeader from '@/components/SectionHeader';
import StatCard from '@/components/StatCard';
import { useDashboard } from '@/hooks/useDashboard';
import { formatTenure } from '@/lib/format';
import { GRADIENT_BR, GRADIENT_TL } from '@/theme/gradients';
import { palette, radius, spacing, typography } from '@/theme';
import { ActivityLog } from '@/types';

const LOG_ICON: Record<ActivityLog['type'], keyof typeof Ionicons.glyphMap> = {
  attendance: 'time-outline',
  leave: 'calendar-outline',
  policy: 'document-text-outline',
  profile: 'person-outline',
  asset: 'hardware-chip-outline',
  system: 'cog-outline',
};

function relativeDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

type ActionBannerTone = 'primary' | 'warning' | 'info' | 'success' | 'danger' | 'violet';

const ACTION_BANNER_TONES: Record<
  ActionBannerTone,
  {
    bg: string;
    accent: string;
    text: string;
    border: string;
    glow: string;
  }
> = {
  primary: {
    bg: palette.primaryLight,
    accent: palette.primary,
    text: palette.primaryDark,
    border: 'rgba(79, 107, 255, 0.35)',
    glow: palette.primary,
  },
  warning: {
    bg: palette.warningLight,
    accent: palette.warning,
    text: palette.warningDark,
    border: 'rgba(247, 144, 9, 0.35)',
    glow: palette.warning,
  },
  info: {
    bg: palette.infoLight,
    accent: palette.info,
    text: palette.infoDark,
    border: 'rgba(11, 165, 199, 0.35)',
    glow: palette.info,
  },
  success: {
    bg: palette.successLight,
    accent: palette.success,
    text: palette.successDark,
    border: 'rgba(18, 183, 106, 0.35)',
    glow: palette.success,
  },
  danger: {
    bg: palette.dangerLight,
    accent: palette.danger,
    text: palette.dangerDark,
    border: 'rgba(240, 68, 75, 0.35)',
    glow: palette.danger,
  },
  violet: {
    bg: '#F3EEFF',
    accent: '#7A5AF8',
    text: '#5925DC',
    border: 'rgba(122, 90, 248, 0.35)',
    glow: '#7A5AF8',
  },
};

function ActionNeededBanner({
  count,
  title,
  cta,
  icon,
  href,
  tone = 'warning',
}: {
  count: number;
  title: string;
  cta: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  tone?: ActionBannerTone;
}) {
  const colors = ACTION_BANNER_TONES[tone];
  const glow = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    const badgeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(badgeScale, { toValue: 1.08, duration: 700, useNativeDriver: true }),
        Animated.timing(badgeScale, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    glowLoop.start();
    badgeLoop.start();
    return () => {
      glowLoop.stop();
      badgeLoop.stop();
    };
  }, [glow, badgeScale]);

  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.7],
  });

  const countLabel = count > 999 ? '999+' : String(count);

  return (
    <Pressable
      onPress={() => router.push(href as never)}
      accessibilityRole="button"
      accessibilityLabel={`${count} ${title}. ${cta}.`}
      style={({ pressed }) => [styles.actionBannerPress, pressed && { transform: [{ scale: 0.985 }] }]}
    >
      <View style={[styles.actionBanner, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <Animated.View
          style={[styles.actionBannerGlow, { backgroundColor: colors.glow, opacity: glowOpacity }]}
        />
        <View style={[styles.actionBannerAccent, { backgroundColor: colors.accent }]} />

        <View style={styles.actionBannerBody}>
          <View style={styles.actionBannerTop}>
            <Animated.View
              style={[
                styles.actionBannerBadge,
                { backgroundColor: colors.accent, transform: [{ scale: badgeScale }] },
              ]}
            >
              <Text
                style={[
                  styles.actionBannerBadgeText,
                  count >= 100 ? styles.actionBannerBadgeTextCompact : null,
                ]}
                numberOfLines={1}
              >
                {countLabel}
              </Text>
            </Animated.View>
            <View style={styles.actionBannerCopy}>
              <Text style={[styles.actionBannerEyebrow, { color: colors.text }]}>Action needed</Text>
              <Text style={styles.actionBannerTitle}>{title}</Text>
            </View>
          </View>

          <View style={[styles.actionBannerCta, { borderColor: colors.border }]}>
            <Ionicons name={icon} size={16} color={colors.text} />
            <Text style={[styles.actionBannerCtaText, { color: colors.text }]}>{cta}</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.text} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { data, loading, refreshing, error, refresh, retry } = useDashboard();

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    if (!loading && data) {
      // Prefer a short fade; spring can stall on web and leave opacity at 0.
      fade.setValue(0);
      slide.setValue(10);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(slide, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();
    }
  }, [loading, data, fade, slide]);

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={palette.primary} size="large" />
        <Text style={styles.loadingText}>Loading your dashboard…</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={42} color={palette.textFaint} />
        <Text style={styles.errorTitle}>Couldn’t load dashboard</Text>
        <Text style={styles.errorText}>{error || 'Please try again.'}</Text>
        <Pressable
          onPress={retry}
          style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="refresh" size={16} color={palette.white} />
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const {
    employee,
    leaves,
    attendance,
    lateComings,
    leaveRequests,
    pendingPolicies,
    pendingOfferLetterCount,
    pendingLeaveApprovalCount,
    pendingLifecycleApprovalCount,
    pendingProbationApprovalCount,
    pendingProbationDueCount,
    pendingProbationApplyCount,
    logs,
  } = data;

  const unit = employee.leaveUnitLabel || 'Days';
  const leaveProgress = leaves.proratedLeaves ? leaves.availableLeaves / leaves.proratedLeaves : 0;
  const recentRequests = (leaveRequests ?? []).slice(0, 3);
  const recentLogs = (logs ?? []).slice(0, 4);
  const pendingOffers = Number(pendingOfferLetterCount || 0);
  const pendingLeaves = Number(pendingLeaveApprovalCount || 0);
  const pendingLifecycle = Number(pendingLifecycleApprovalCount || 0);
  const pendingProbation = Number(pendingProbationApprovalCount || 0);
  const probationDue = Number(pendingProbationDueCount || 0);
  const probationApply = Number(pendingProbationApplyCount || 0);
  const days = attendance ?? [];
  const avgHours = days.length
    ? days.reduce((s, a) => s + (Number(a.workingHours) || 0), 0) / days.length
    : 0;
  const trend = [...days]
    .reverse()
    .map((a, i, arr) => ({
      label: String(a.label || '').split(' ')[0] || '–',
      value: Number(a.workingHours) || 0,
      highlight: i === arr.length - 1,
    }));

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxxl }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.white} />
      }
    >
      {/* Identity header — single-hue ink, navigational chrome */}
      <LinearGradient
        colors={palette.inkGradient}
        start={GRADIENT_TL}
        end={GRADIENT_BR}
        style={[styles.header, { paddingTop: insets.top + spacing.lg }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.hello}>{greeting()}</Text>
            <Text style={styles.name} numberOfLines={1}>
              {employee.name}
            </Text>
          </View>
          <Pressable
            style={styles.bell}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => router.push('/profile-notifications')}
          >
            <Ionicons name="notifications-outline" size={20} color={palette.white} />
            <View style={styles.bellDot} />
          </Pressable>
        </View>

        <View style={styles.profileRow}>
          <Avatar name={employee.name} uri={employee.profilePhoto} size={54} ring />
          <View style={styles.profileMeta}>
            <Text style={styles.role} numberOfLines={1}>
              {employee.role}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {employee.department} · {employee.companyName}
            </Text>
          </View>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{employee.status || 'Active'}</Text>
          </View>
        </View>
      </LinearGradient>

      <Animated.View style={[styles.body, { opacity: fade, transform: [{ translateY: slide }] }]}>
        {/* Approval attention banners */}
        {pendingLeaves > 0 ? (
          <ActionNeededBanner
            count={pendingLeaves}
            title={`Leave request${pendingLeaves === 1 ? '' : 's'} awaiting your approval`}
            cta="Review team leaves"
            icon="calendar-outline"
            href="/leave-approvals"
            tone="primary"
          />
        ) : null}
        {pendingOffers > 0 ? (
          <ActionNeededBanner
            count={pendingOffers}
            title={`Offer letter${pendingOffers === 1 ? '' : 's'} awaiting your approval`}
            cta="Review & approve"
            icon="mail-open-outline"
            href="/offer-letter-approvals"
            tone="warning"
          />
        ) : null}
        {pendingLifecycle > 0 ? (
          <ActionNeededBanner
            count={pendingLifecycle}
            title={`Lifecycle change${pendingLifecycle === 1 ? '' : 's'} awaiting your approval`}
            cta="Review status approvals"
            icon="swap-horizontal-outline"
            href="/lifecycle-approvals"
            tone="violet"
          />
        ) : null}
        {pendingProbation > 0 ? (
          <ActionNeededBanner
            count={pendingProbation}
            title={`Probation review${pendingProbation === 1 ? '' : 's'} awaiting your decision`}
            cta="Review probation"
            icon="hourglass-outline"
            href="/probation-approvals"
            tone="danger"
          />
        ) : null}
        {probationDue > 0 ? (
          <ActionNeededBanner
            count={probationDue}
            title={`${probationDue} employee${probationDue === 1 ? '' : 's'} reach${probationDue === 1 ? 'es' : ''} probation complete within 15 days`}
            cta="Send Clear / Extend requests"
            icon="timer-outline"
            href="/probation-approvals?tab=due"
            tone="info"
          />
        ) : null}
        {probationApply > 0 ? (
          <ActionNeededBanner
            count={probationApply}
            title={`Probation decision${probationApply === 1 ? '' : 's'} ready to apply`}
            cta="Apply to profile"
            icon="checkmark-circle-outline"
            href="/probation-approvals?tab=apply"
            tone="success"
          />
        ) : null}

        {/* Alerts — compact, secondary */}
        {pendingPolicies.length > 0 ? (
          <Pressable>
            <Card style={styles.alertCard} padded>
              <View style={styles.alertIcon}>
                <Ionicons name="document-text" size={18} color={palette.warningDark} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.alertTitle}>
                  {pendingPolicies.length} policy {pendingPolicies.length > 1 ? 'acknowledgements' : 'acknowledgement'} pending
                </Text>
                <Text style={styles.alertSub} numberOfLines={1}>
                  {pendingPolicies.map((p) => p.title).join(', ')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.textFaint} />
            </Card>
          </Pressable>
        ) : null}

        {/* HERO: Leave balance — the one focal point of the screen */}
        <Card style={styles.hero} raised padded>
          <View style={styles.heroTop}>
            <Text style={styles.heroOverline}>Leave balance</Text>
            <Badge label={`${leaves.consumedLeaves} used`} tone="primary" />
          </View>
          <View style={styles.heroFigureRow}>
            <Text style={styles.heroFigure}>{leaves.availableLeaves}</Text>
            <Text style={styles.heroUnit}>{unit.toLowerCase()} left</Text>
          </View>
          <Text style={styles.heroSub}>
            of {leaves.proratedLeaves} {unit.toLowerCase()} accrued · through {leaves.accrualThroughLabel}
          </Text>
          <ProgressBar value={leaveProgress} height={12} gradient />
          <View style={styles.heroStats}>
            <HeroStat value={leaves.accruedToToday} label={`Accrued ${unit}`} />
            <HeroStat value={leaves.approvedCount} label="Approved" tone={palette.successDark} />
            <HeroStat value={leaves.pendingCount} label="Pending" tone={palette.warningDark} />
            <HeroStat value={leaves.rejectedCount} label="Rejected" tone={palette.dangerDark} />
          </View>
          <Pressable
            style={({ pressed }) => [styles.heroCta, pressed && { opacity: 0.85 }]}
            onPress={() => router.navigate('/leaves')}
          >
            <Ionicons name="add-circle" size={18} color={palette.primary} />
            <Text style={styles.heroCtaText}>Request leave</Text>
          </Pressable>
        </Card>

        {/* Quick stats — secondary grid */}
        <View style={styles.statRow}>
          <StatCard icon="time-outline" label="Late this month" value={String(lateComings)} tone={{ bg: palette.warningLight, fg: palette.warningDark }} />
          <StatCard icon="briefcase-outline" label="Work modality" value={employee.workModality || '—'} />
        </View>
        <View style={[styles.statRow, { marginTop: spacing.md }]}>
          <StatCard icon="calendar-clear-outline" label="Tenure" value={formatTenure(employee.tenure) || '—'} tone={{ bg: palette.successLight, fg: palette.successDark }} />
          <StatCard icon="finger-print-outline" label="Biometric ID" value={employee.biometricId || '—'} tone={{ bg: palette.infoLight, fg: palette.infoDark }} />
        </View>

        {/* Working hours */}
        <SectionHeader title="Working hours" actionLabel="Details" onAction={() => router.navigate('/attendance')} />
        <Card>
          <View style={styles.chartHead}>
            <View>
              <Text style={styles.chartLabel}>Last {trend.length} working days</Text>
              <Text style={styles.chartValue}>
                {avgHours.toFixed(1)}
                <Text style={styles.chartUnit}>h avg / day</Text>
              </Text>
            </View>
            <Badge label="On track" tone="success" dot />
          </View>
          <BarChart data={trend} />
        </Card>

        {/* Recent leave requests */}
        {recentRequests.length > 0 ? (
          <>
            <SectionHeader title="Recent requests" actionLabel="See all" onAction={() => router.navigate('/leaves')} />
            <Card padded>
              {recentRequests.map((r, i) => (
                <ListRow
                  key={r.id}
                  icon="calendar-outline"
                  iconBg={palette.primaryLight}
                  title={r.type}
                  subtitle={`${r.from} → ${r.to} · ${r.days} ${r.days > 1 ? 'days' : 'day'}`}
                  badgeLabel={r.status}
                  badgeTone={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : 'warning'}
                  divider={i < recentRequests.length - 1}
                />
              ))}
            </Card>
          </>
        ) : null}

        {/* Activity */}
        {recentLogs.length > 0 ? (
          <>
            <SectionHeader title="Recent activity" />
            <Card padded>
              {recentLogs.map((log, i) => (
                <ListRow
                  key={log.id}
                  icon={LOG_ICON[log.type]}
                  title={log.message}
                  trailing={relativeDate(log.date)}
                  divider={i < recentLogs.length - 1}
                />
              ))}
            </Card>
          </>
        ) : null}
      </Animated.View>
    </ScrollView>
  );
}

function HeroStat({ value, label, tone }: { value: number; label: string; tone?: string }) {
  return (
    <View style={styles.heroStat}>
      <Text style={[styles.heroStatVal, tone ? { color: tone } : null]}>{value}</Text>
      <Text style={styles.heroStatLbl}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.background,
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  loadingText: { ...typography.small, color: palette.textMuted },
  errorTitle: { ...typography.h3, color: palette.text, textAlign: 'center' },
  errorText: { ...typography.small, color: palette.textMuted, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  retryText: { ...typography.bodyBold, color: palette.white },

  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl + spacing.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  hello: { ...typography.overline, color: palette.onInkMuted },
  name: { ...typography.h1, color: palette.white, marginTop: 4 },
  bell: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: palette.onInkSurface,
    borderWidth: 1,
    borderColor: palette.onInkBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: { position: 'absolute', top: 10, right: 11, width: 8, height: 8, borderRadius: 4, backgroundColor: palette.danger, borderWidth: 1.5, borderColor: palette.ink },

  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
  profileMeta: { flex: 1 },
  role: { ...typography.h3, color: palette.white },
  sub: { ...typography.small, color: palette.onInkMuted, marginTop: 2 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(18,183,106,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(18,183,106,0.35)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.success },
  statusText: { ...typography.caption, color: palette.white, textTransform: 'none' },

  body: { paddingHorizontal: spacing.lg, marginTop: -spacing.xxl },

  alertCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderColor: 'rgba(247,144,9,0.3)', backgroundColor: palette.warningLight },
  alertIcon: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: 'rgba(247,144,9,0.16)', alignItems: 'center', justifyContent: 'center' },
  alertTitle: { ...typography.bodyBold, color: palette.text },
  alertSub: { ...typography.small, color: palette.warningDark, marginTop: 2 },

  actionBannerPress: {
    marginBottom: spacing.md,
  },
  actionBanner: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    minHeight: 108,
  },
  actionBannerGlow: {
    position: 'absolute',
    top: -24,
    right: -16,
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  actionBannerAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  actionBannerBody: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingLeft: spacing.lg + 4,
    gap: spacing.md,
  },
  actionBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionBannerBadge: {
    minWidth: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  actionBannerBadgeText: {
    ...typography.h2,
    color: palette.white,
    fontVariant: ['tabular-nums'],
  },
  actionBannerBadgeTextCompact: {
    fontSize: 16,
    letterSpacing: -0.4,
  },
  actionBannerCopy: {
    flex: 1,
    gap: 4,
  },
  actionBannerEyebrow: {
    ...typography.overline,
    letterSpacing: 1.2,
  },
  actionBannerTitle: {
    ...typography.bodyBold,
    color: palette.text,
    lineHeight: 20,
  },
  actionBannerCta: {
    alignSelf: 'stretch',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  actionBannerCtaText: {
    ...typography.bodyBold,
  },

  // Hero leave card
  hero: { marginTop: spacing.lg },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroOverline: { ...typography.overline, color: palette.textMuted },
  heroFigureRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginTop: spacing.sm },
  heroFigure: { ...typography.hero, color: palette.text },
  heroUnit: { ...typography.h3, color: palette.textMuted },
  heroSub: { ...typography.small, color: palette.textFaint, marginTop: 2, marginBottom: spacing.lg },
  heroStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg },
  heroStat: { flex: 1 },
  heroStatVal: { ...typography.h2, color: palette.text, fontVariant: ['tabular-nums'] },
  heroStatLbl: { ...typography.caption, color: palette.textFaint, textTransform: 'none', marginTop: 2, fontWeight: '500' },
  heroCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    marginTop: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md,
    backgroundColor: palette.primaryLight,
  },
  heroCtaText: { ...typography.bodyBold, color: palette.primaryDark },

  statRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },

  chartHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  chartLabel: { ...typography.small, color: palette.textMuted },
  chartValue: { ...typography.display, fontSize: 26, color: palette.text, marginTop: 4 },
  chartUnit: { ...typography.small, color: palette.textMuted },
});
