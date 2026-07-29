import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
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
import { formatDate } from '@/lib/format';
import { fonts, numeric, palette, radius, shadow, spacing, typography } from '@/theme';
import { ProbationApproverOption, ProbationDueItem, ProbationReviewItem } from '@/types';

type TabKey = 'due' | 'pending' | 'apply' | 'completed';

function closeScreen() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/(tabs)/profile' as never);
}

function urgencyTone(days: number): { bg: string; fg: string; label: string } {
  if (days < 0) {
    return { bg: palette.dangerLight, fg: palette.dangerDark, label: `Overdue ${Math.abs(days)}d` };
  }
  if (days === 0) {
    return { bg: palette.dangerLight, fg: palette.dangerDark, label: 'Today' };
  }
  if (days <= 3) {
    return { bg: palette.warningLight, fg: palette.warningDark, label: `${days}d` };
  }
  return { bg: palette.infoLight, fg: palette.infoDark, label: `${days}d` };
}

function tabHint(tab: TabKey, isHr: boolean): string {
  if (tab === 'due') return 'Send Clear / Extend requests to a selected approval authority.';
  if (tab === 'apply') return 'Authority decided — apply the outcome to the profile.';
  if (tab === 'completed') return 'Finished reviews for your records.';
  return isHr ? 'Waiting on approval authority decisions.' : 'Choose Clear or Extend for assigned reviews.';
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
  const disabled = sending;

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
            Line mgr: {item.managerName || 'Not assigned'}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onSend}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Send ${item.employeeName} for decision`}
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
            <Ionicons name="send-outline" size={16} color={palette.white} />
            <Text style={styles.sendText}>Send for decision</Text>
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
  const [sendTarget, setSendTarget] = useState<ProbationDueItem | null>(null);
  const [approvers, setApprovers] = useState<ProbationApproverOption[]>([]);
  const [approverQuery, setApproverQuery] = useState('');
  const [approversLoading, setApproversLoading] = useState(false);
  const [selectedApproverId, setSelectedApproverId] = useState<number | null>(null);
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

  const loadApprovers = useCallback(async (employeeId: number, q = '') => {
    setApproversLoading(true);
    try {
      const res = await api.getProbationApprovers({
        q: q.trim() || undefined,
        excludeEmployeeId: employeeId,
        limit: 50,
      });
      if (res.status === 'success' && res.data) {
        setApprovers(res.data.items);
      } else {
        setApprovers([]);
      }
    } catch {
      setApprovers([]);
    } finally {
      setApproversLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!sendTarget) return;
    const timer = setTimeout(() => {
      loadApprovers(sendTarget.employeeId, approverQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [sendTarget, approverQuery, loadApprovers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(tab, true);
    try {
      await refreshDashboard();
    } catch {
      /* ignore */
    }
  };

  const openSend = (item: ProbationDueItem) => {
    setSendTarget(item);
    setApproverQuery('');
    setSelectedApproverId(item.managerId > 0 ? item.managerId : null);
    setApprovers([]);
  };

  const closeSend = () => {
    if (sendingId) return;
    setSendTarget(null);
    setSelectedApproverId(null);
    setApproverQuery('');
    setApprovers([]);
  };

  const confirmSend = async () => {
    if (!sendTarget) return;
    if (!selectedApproverId) {
      Alert.alert('Select authority', 'Choose one approval authority before sending.');
      return;
    }
    const authority = approvers.find((a) => a.employeeId === selectedApproverId);
    const authorityName =
      authority?.employeeName ||
      (selectedApproverId === sendTarget.managerId ? sendTarget.managerName : `Employee #${selectedApproverId}`);

    setSendingId(sendTarget.employeeId);
    try {
      const res = await api.sendProbationReview({
        employeeId: sendTarget.employeeId,
        approverId: selectedApproverId,
      });
      if (res.status === 'success') {
        Alert.alert('Sent', res.message || `Probation review sent to ${authorityName}.`);
        setSendTarget(null);
        setSelectedApproverId(null);
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
  const selectedApprover =
    approvers.find((a) => a.employeeId === selectedApproverId) ||
    (sendTarget && selectedApproverId === sendTarget.managerId
      ? {
          employeeId: sendTarget.managerId,
          employeeName: sendTarget.managerName || `Employee #${sendTarget.managerId}`,
          employeeCode: '',
          countryId: 0,
          countryName: '',
        }
      : null);

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
              onSend={() => openSend(item)}
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

      <Modal
        visible={!!sendTarget}
        transparent
        animationType="slide"
        onRequestClose={closeSend}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Approval authority</Text>
                <Text style={styles.modalSubtitle} numberOfLines={2}>
                  Who should decide Clear / Extend for {sendTarget?.employeeName || 'this employee'}?
                </Text>
              </View>
              <Pressable onPress={closeSend} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={palette.text} />
              </Pressable>
            </View>

            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color={palette.textMuted} />
              <TextInput
                value={approverQuery}
                onChangeText={setApproverQuery}
                placeholder="Search name or code"
                placeholderTextColor={palette.textFaint}
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>

            {selectedApprover ? (
              <Text style={styles.selectedHint}>
                Selected: {selectedApprover.employeeName}
                {selectedApprover.employeeCode ? ` (${selectedApprover.employeeCode})` : ''}
              </Text>
            ) : (
              <Text style={styles.selectedHint}>Select one approval authority below.</Text>
            )}

            {approversLoading ? (
              <View style={styles.modalCenter}>
                <ActivityIndicator color={palette.primary} />
              </View>
            ) : (
              <FlatList
                data={approvers}
                keyExtractor={(item) => String(item.employeeId)}
                style={styles.approverList}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text style={styles.emptyApprovers}>No matching employees with login access.</Text>
                }
                renderItem={({ item }) => {
                  const active = item.employeeId === selectedApproverId;
                  return (
                    <Pressable
                      onPress={() => setSelectedApproverId(item.employeeId)}
                      style={[styles.approverRow, active && styles.approverRowActive]}
                    >
                      <InitialsAvatar name={item.employeeName} size={36} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.approverName} numberOfLines={1}>
                          {item.employeeName}
                        </Text>
                        <Text style={styles.approverMeta} numberOfLines={1}>
                          {[item.employeeCode, item.countryName].filter(Boolean).join(' · ') || '—'}
                        </Text>
                      </View>
                      {active ? <Ionicons name="checkmark-circle" size={20} color={palette.primary} /> : null}
                    </Pressable>
                  );
                }}
              />
            )}

            <Pressable
              onPress={confirmSend}
              disabled={!selectedApproverId || !!sendingId}
              style={({ pressed }) => [
                styles.confirmSendBtn,
                (!selectedApproverId || !!sendingId) && styles.sendBtnDisabled,
                pressed && selectedApproverId && !sendingId && { opacity: 0.9 },
              ]}
            >
              {sendingId ? (
                <ActivityIndicator color={palette.white} />
              ) : (
                <Text style={styles.sendText}>Send for decision</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
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

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '88%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  modalTitle: {
    ...typography.h3,
    color: palette.text,
  },
  modalSubtitle: {
    ...typography.small,
    color: palette.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    backgroundColor: palette.background,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: palette.text,
    paddingVertical: spacing.sm,
  },
  selectedHint: {
    ...typography.caption,
    color: palette.textMuted,
  },
  modalCenter: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approverList: {
    maxHeight: 320,
  },
  emptyApprovers: {
    ...typography.small,
    color: palette.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  approverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  approverRowActive: {
    backgroundColor: palette.primaryLight,
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  approverName: {
    ...typography.bodyBold,
    color: palette.text,
  },
  approverMeta: {
    ...typography.caption,
    color: palette.textMuted,
    marginTop: 2,
  },
  confirmSendBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    backgroundColor: palette.info,
    borderRadius: radius.md,
  },
});
