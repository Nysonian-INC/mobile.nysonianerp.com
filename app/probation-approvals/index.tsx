import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import Badge from '@/components/Badge';
import InitialsAvatar from '@/components/InitialsAvatar';
import ScreenHeader from '@/components/ScreenHeader';
import SegmentedControl from '@/components/SegmentedControl';
import StateView from '@/components/StateView';
import { useDashboard } from '@/hooks/useDashboard';
import { confirmAction } from '@/lib/confirm';
import { formatDate } from '@/lib/format';
import { fonts, numeric, palette, radius, shadow, spacing, typography } from '@/theme';
import { ProbationDueItem, ProbationReviewItem } from '@/types';

type TabKey = 'due' | 'pending' | 'apply' | 'completed';

function closeScreen() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/(tabs)/profile' as never);
}

function urgencyTone(days: number): { bg: string; fg: string; label: string } {
  if (days <= 0) {
    return { bg: palette.dangerLight, fg: palette.dangerDark, label: 'Today' };
  }
  if (days <= 3) {
    return { bg: palette.warningLight, fg: palette.warningDark, label: `${days}d` };
  }
  return { bg: palette.infoLight, fg: palette.infoDark, label: `${days}d` };
}

function tabHint(tab: TabKey, isHr: boolean): string {
  if (tab === 'due') return 'Send Clear / Extend requests to line managers.';
  if (tab === 'apply') return 'Manager decided — apply the outcome to the profile.';
  if (tab === 'completed') return 'Finished reviews for your records.';
  return isHr ? 'Waiting on line manager decisions.' : 'Choose Clear or Extend for your reports.';
}

function DueCard({
  item,
  sending,
  onSend,
}: {
  item: ProbationDueItem;
  sending: boolean;
  onSend: () => void;
}) {
  const urgency = urgencyTone(item.daysRemaining);
  const disabled = sending || !item.canSend;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <InitialsAvatar name={item.employeeName || 'Employee'} size={48} />
        <View style={styles.cardMain}>
          <Text style={styles.name} numberOfLines={1}>
            {item.employeeName || `Employee #${item.employeeId}`}
          </Text>
          <Text style={styles.code} numberOfLines={1}>
            {item.employeeCode || `ID ${item.employeeId}`}
          </Text>
        </View>
        <View style={[styles.urgencyChip, { backgroundColor: urgency.bg }]}>
          <Text style={[styles.urgencyNum, { color: urgency.fg }]}>{urgency.label}</Text>
          {item.daysRemaining > 0 ? (
            <Text style={[styles.urgencyCap, { color: urgency.fg }]}>left</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.metaBlock}>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={15} color={palette.textMuted} />
          <Text style={styles.metaText}>
            Completes {formatDate(item.probationCompleteDate) || '—'}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="person-outline" size={15} color={palette.textMuted} />
          <Text style={styles.metaText} numberOfLines={1}>
            {item.managerName || 'No line manager assigned'}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onSend}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={item.canSend ? `Send ${item.employeeName} to manager` : 'No manager'}
        style={({ pressed }) => [
          styles.sendBtn,
          disabled && styles.sendBtnDisabled,
          pressed && !disabled && { opacity: 0.9 },
        ]}
      >
        {sending ? (
          <ActivityIndicator color={palette.white} />
        ) : (
          <>
            <Ionicons
              name={item.canSend ? 'send-outline' : 'alert-circle-outline'}
              size={16}
              color={palette.white}
            />
            <Text style={styles.sendText}>
              {item.canSend ? 'Send to manager' : 'Assign manager first'}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

function ReviewCard({ item }: { item: ProbationReviewItem }) {
  const actionLabel = item.canDecide ? 'Decide' : item.canApply ? 'Apply to profile' : 'View';
  const actionColor = item.canDecide
    ? palette.dangerDark
    : item.canApply
      ? palette.successDark
      : palette.primaryDark;
  const actionBg = item.canDecide
    ? palette.dangerLight
    : item.canApply
      ? palette.successLight
      : palette.primaryLight;

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/probation-approvals/[id]',
          params: { id: item.id },
        } as never)
      }
      accessibilityRole="button"
      accessibilityLabel={`${item.employeeName}. ${actionLabel}.`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.cardTop}>
        <InitialsAvatar name={item.employeeName || 'Employee'} size={48} />
        <View style={styles.cardMain}>
          <Text style={styles.name} numberOfLines={1}>
            {item.employeeName || `Employee #${item.employeeId}`}
          </Text>
          <Text style={styles.code} numberOfLines={1}>
            {item.employeeCode || `ID ${item.employeeId}`}
            {item.managerName ? ` · ${item.managerName}` : ''}
          </Text>
        </View>
        <Badge
          label={item.decisionLabel || item.statusLabel}
          tone={
            item.status === 'manager_decided'
              ? 'success'
              : item.status === 'pending'
                ? 'warning'
                : 'neutral'
          }
        />
      </View>

      <View style={styles.metaBlock}>
        <View style={styles.metaRow}>
          <Ionicons name="hourglass-outline" size={15} color={palette.textMuted} />
          <Text style={styles.metaText}>
            Probation complete {formatDate(item.probationCompleteDate || item.effectiveDate) || '—'}
          </Text>
        </View>
        {item.managerRemarks ? (
          <Text style={styles.remarks} numberOfLines={2}>
            {item.managerRemarks}
          </Text>
        ) : null}
      </View>

      <View style={[styles.actionChip, { backgroundColor: actionBg }]}>
        <Text style={[styles.actionChipText, { color: actionColor }]}>{actionLabel}</Text>
        <Ionicons name="arrow-forward" size={14} color={actionColor} />
      </View>
    </Pressable>
  );
}

export default function ProbationApprovalsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { data: dashboard, loading: dashLoading, refresh: refreshDashboard } = useDashboard();
  const allowed = Boolean(dashboard?.permissions?.probationApprovals);
  const isHrUser = Boolean(dashboard?.permissions?.probationApprovalsHr);

  const dueCount = Number(dashboard?.pendingProbationDueCount || 0);
  const applyCount = Number(dashboard?.pendingProbationApplyCount || 0);
  const pendingCount = Number(dashboard?.pendingProbationApprovalCount || 0);

  const initialTab = (['due', 'pending', 'apply', 'completed'].includes(String(params.tab || ''))
    ? String(params.tab)
    : (isHrUser && dueCount > 0
      ? 'due'
      : isHrUser && applyCount > 0
        ? 'apply'
        : 'pending')) as TabKey;

  const [tab, setTab] = useState<TabKey>(initialTab);
  const [reviews, setReviews] = useState<ProbationReviewItem[]>([]);
  const [dueItems, setDueItems] = useState<ProbationDueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const requestId = useRef(0);
  const tabRef = useRef(tab);
  tabRef.current = tab;

  const tabs = useMemo(() => {
    if (isHrUser) {
      return [
        { key: 'due' as const, label: dueCount > 0 ? `Due ${dueCount}` : 'Due soon' },
        { key: 'pending' as const, label: 'Awaiting' },
        { key: 'apply' as const, label: applyCount > 0 ? `Apply ${applyCount}` : 'Apply' },
        { key: 'completed' as const, label: 'Done' },
      ];
    }
    return [
      { key: 'pending' as const, label: pendingCount > 0 ? `Pending ${pendingCount}` : 'Pending' },
      { key: 'completed' as const, label: 'Done' },
    ];
  }, [isHrUser, dueCount, applyCount, pendingCount]);

  useFocusEffect(
    useCallback(() => {
      if (!dashLoading && dashboard && !allowed) {
        router.replace('/(tabs)/profile' as never);
      }
    }, [dashLoading, dashboard, allowed]),
  );

  const load = useCallback(async (nextTab: TabKey, soft = false) => {
    const id = ++requestId.current;
    if (!soft) setLoading(true);
    setError(null);
    try {
      if (nextTab === 'due') {
        const res = await api.getProbationDueList();
        if (id !== requestId.current) return;
        if (res.status === 'success' && res.data) {
          setDueItems(res.data.items);
          setReviews([]);
        } else {
          setDueItems([]);
          setError(res.message || 'Could not load due list.');
        }
      } else {
        const listTab = nextTab === 'apply' ? 'apply' : nextTab === 'completed' ? 'completed' : 'pending';
        const res = await api.getProbationApprovals(listTab);
        if (id !== requestId.current) return;
        if (res.status === 'success' && res.data) {
          setReviews(res.data.items);
          setDueItems([]);
        } else {
          setReviews([]);
          setError(res.message || 'Could not load probation reviews.');
        }
      }
    } catch (err: any) {
      if (id !== requestId.current) return;
      setReviews([]);
      setDueItems([]);
      setError(err?.message || 'Network error.');
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!allowed) return;
      load(tabRef.current);
    }, [allowed, load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load(tab, true);
    try {
      await refreshDashboard();
    } catch {
      /* ignore */
    }
  };

  const onSend = async (item: ProbationDueItem) => {
    if (!item.canSend) {
      Alert.alert('No manager', 'Assign a line manager on the employee profile first.');
      return;
    }
    const ok = await confirmAction(
      'Send to manager',
      `Send probation review for ${item.employeeName} to ${item.managerName || 'their line manager'}?`,
      'Send',
    );
    if (!ok) return;
    setSendingId(item.employeeId);
    try {
      const res = await api.sendProbationReview({ employeeId: item.employeeId });
      if (res.status === 'success') {
        Alert.alert('Sent', res.message || 'Probation review sent to line manager.');
        await load('due', true);
        try {
          await refreshDashboard();
        } catch {
          /* ignore */
        }
      } else {
        Alert.alert('Could not send', res.message || 'Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Could not send', err?.message || 'Network error.');
    } finally {
      setSendingId(null);
    }
  };

  const emptyTitle =
    tab === 'due'
      ? 'Nothing due in 15 days'
      : tab === 'apply'
        ? 'Nothing ready to apply'
        : tab === 'completed'
          ? 'No completed reviews'
          : 'No pending reviews';

  const emptyText =
    tab === 'due'
      ? 'When someone nears probation complete, they show up here.'
      : 'Pull to refresh, or check another tab.';

  const listCount = tab === 'due' ? dueItems.length : reviews.length;

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <ScreenHeader
        title="Probation"
        subtitle="Reviews"
        right={
          <Pressable
            hitSlop={12}
            onPress={closeScreen}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={22} color={palette.onInk} />
          </Pressable>
        }
      />

      <View style={styles.tabsWrap}>
        <SegmentedControl
          tabs={tabs}
          active={tab}
          onSelect={(next) => {
            setTab(next);
            load(next);
          }}
        />
        <Text style={styles.hint}>{tabHint(tab, isHrUser)}</Text>
        {!loading && listCount > 0 ? (
          <Text style={styles.countLabel}>
            {listCount} {listCount === 1 ? 'person' : 'people'}
          </Text>
        ) : null}
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={palette.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.pad}>
          <StateView error={error} onRetry={() => load(tab)} />
        </View>
      ) : tab === 'due' ? (
        <FlatList
          data={dueItems}
          keyExtractor={(item) => String(item.employeeId)}
          contentContainerStyle={[styles.list, dueItems.length === 0 && styles.listEmpty]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.info} />
          }
          ListEmptyComponent={
            <StateView empty emptyTitle={emptyTitle} emptyText={emptyText} />
          }
          renderItem={({ item }) => (
            <DueCard
              item={item}
              sending={sendingId === item.employeeId}
              onSend={() => onSend(item)}
            />
          )}
        />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, reviews.length === 0 && styles.listEmpty]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />
          }
          ListEmptyComponent={
            <StateView empty emptyTitle={emptyTitle} emptyText={emptyText} />
          }
          renderItem={({ item }) => <ReviewCard item={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  tabsWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  hint: {
    ...typography.small,
    color: palette.textMuted,
    lineHeight: 18,
  },
  countLabel: {
    ...typography.overline,
    color: palette.textFaint,
    marginTop: spacing.xs,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pad: { padding: spacing.lg },

  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.card,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardMain: { flex: 1, minWidth: 0 },
  name: {
    ...typography.h3,
    color: palette.text,
  },
  code: {
    ...typography.caption,
    color: palette.textMuted,
    marginTop: 2,
    letterSpacing: 0.2,
  },

  urgencyChip: {
    minWidth: 52,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgencyNum: {
    ...typography.h3,
    ...numeric,
    fontSize: 16,
  },
  urgencyCap: {
    ...typography.caption,
    fontSize: 10,
    marginTop: 1,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  metaBlock: { gap: spacing.sm },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaText: {
    ...typography.small,
    color: palette.textMuted,
    flex: 1,
  },
  remarks: {
    ...typography.small,
    color: palette.text,
    lineHeight: 18,
    marginTop: 2,
  },

  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 48,
    backgroundColor: palette.info,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  sendBtnDisabled: {
    backgroundColor: palette.textFaint,
  },
  sendText: {
    ...typography.bodyBold,
    color: palette.white,
    fontFamily: fonts.bold,
  },

  actionChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    minHeight: 36,
  },
  actionChipText: {
    ...typography.small,
    fontFamily: fonts.bold,
  },
});
