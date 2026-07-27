import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import Card from '@/components/Card';
import { initialsFromName } from '@/components/InitialsAvatar';
import ScreenHeader from '@/components/ScreenHeader';
import SegmentedControl from '@/components/SegmentedControl';
import StateView from '@/components/StateView';
import { useDashboard } from '@/hooks/useDashboard';
import { formatDate } from '@/lib/format';
import { fonts, palette, radius, spacing, typography } from '@/theme';
import { LeaveApprovalItem, LeaveApproverStat } from '@/types';

type TabKey = 'pending' | 'approved';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
];

export default function LeaveApprovalsScreen() {
  const insets = useSafeAreaInsets();
  const { data: dashboard, loading: dashLoading } = useDashboard();
  const allowed = Boolean(dashboard?.permissions?.leaveApprovals);

  const [tab, setTab] = useState<TabKey>('pending');
  const [query, setQuery] = useState('');
  const [approverKey, setApproverKey] = useState('all');
  const [items, setItems] = useState<LeaveApprovalItem[]>([]);
  const [approverStats, setApproverStats] = useState<LeaveApproverStat[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabRef = useRef(tab);
  const queryRef = useRef(query);
  const approverRef = useRef(approverKey);
  tabRef.current = tab;
  queryRef.current = query;
  approverRef.current = approverKey;

  useFocusEffect(
    useCallback(() => {
      if (!dashLoading && dashboard && !allowed) {
        router.replace('/(tabs)/profile' as never);
      }
    }, [dashLoading, dashboard, allowed]),
  );

  const load = useCallback(
    async (nextTab: TabKey, q: string, nextApprover: string, soft = false) => {
      const id = ++requestId.current;
      if (!soft) setLoading(true);
      else setSearching(true);
      setError(null);
      try {
        const res = await api.getLeaveApprovals(
          nextTab,
          50,
          0,
          q,
          nextTab === 'pending' ? nextApprover : 'all',
        );
        if (id !== requestId.current) return;
        if (res.status === 'success' && res.data) {
          setItems(res.data.items);
          setTotal(res.data.total);
          setApproverStats(res.data.approverStats ?? []);
        } else {
          setItems([]);
          setTotal(0);
          setApproverStats([]);
          setError(res.message || 'Could not load leave approvals.');
        }
      } catch (err: any) {
        if (id !== requestId.current) return;
        setItems([]);
        setTotal(0);
        setApproverStats([]);
        setError(err?.message || 'Network error.');
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setSearching(false);
          setRefreshing(false);
        }
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      if (!allowed) return;
      load(tabRef.current, queryRef.current, approverRef.current);
    }, [allowed, load]),
  );

  // Debounced search — skip the first run so focus effect owns the initial fetch.
  const skipQueryEffect = useRef(true);
  useEffect(() => {
    if (!allowed) return;
    if (skipQueryEffect.current) {
      skipQueryEffect.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load(tabRef.current, query, approverRef.current, true);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, allowed, load]);

  const onTab = (key: TabKey) => {
    setTab(key);
    if (key === 'approved') {
      setApproverKey('all');
      load(key, queryRef.current, 'all');
      return;
    }
    load(key, queryRef.current, approverRef.current);
  };

  const onSelectApprover = (key: string) => {
    const next = key === approverKey ? 'all' : key;
    setApproverKey(next);
    load(tabRef.current, queryRef.current, next, true);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(tab, query, approverKey, true);
  }, [load, tab, query, approverKey]);

  const clearQuery = () => setQuery('');

  const pendingTotalAcrossApprovers = useMemo(
    () => approverStats.reduce((sum, row) => sum + (Number(row.pendingCount) || 0), 0),
    [approverStats],
  );

  const approverStatsSorted = useMemo(
    () =>
      [...approverStats].sort(
        (a, b) => (Number(b.pendingCount) || 0) - (Number(a.pendingCount) || 0),
      ),
    [approverStats],
  );

  if (dashLoading && !dashboard) {
    return (
      <View style={styles.root}>
        <ScreenHeader
          title="Leave approvals"
          subtitle="Team requests"
          right={
            <Pressable hitSlop={10} onPress={() => router.back()}>
              <Ionicons name="close" size={22} color={palette.onInk} />
            </Pressable>
          }
        />
        <StateView loading />
      </View>
    );
  }

  if (!allowed) {
    return null;
  }

  const hasQuery = query.trim().length > 0;
  const showApproverReport = tab === 'pending' && approverStats.length > 0;

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Leave approvals"
        subtitle="Team requests"
        right={
          <Pressable hitSlop={10} onPress={() => router.back()}>
            <Ionicons name="close" size={22} color={palette.onInk} />
          </Pressable>
        }
      />

      <View style={styles.tabs}>
        <SegmentedControl tabs={TABS} active={tab} onSelect={onTab} />
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={palette.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Name, ID, leave type…"
            placeholderTextColor={palette.textFaint}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {searching ? (
            <ActivityIndicator size="small" color={palette.primary} />
          ) : hasQuery ? (
            <Pressable hitSlop={8} onPress={clearQuery}>
              <Ionicons name="close-circle" size={18} color={palette.textFaint} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={palette.primary} size="large" />
        </View>
      ) : error && items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={() => load(tab, query, approverKey)}
            style={({ pressed }) => pressed && { opacity: 0.7 }}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: insets.bottom + spacing.xxxl,
            paddingTop: spacing.sm,
            flexGrow: 1,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={palette.primary}
            />
          }
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews
          ListHeaderComponent={
            <View>
              {showApproverReport ? (
                <View style={styles.report}>
                  <View style={styles.reportHead}>
                    <Text style={styles.reportTitle}>Pending by approver</Text>
                    <Text style={styles.reportTotal}>
                      {pendingTotalAcrossApprovers} total
                    </Text>
                  </View>
                  <View style={styles.table}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableHeaderText, styles.tableColApprover]}>Approver</Text>
                      <Text style={[styles.tableHeaderText, styles.tableColCount]}>Pending</Text>
                    </View>
                    <Pressable
                      onPress={() => onSelectApprover('all')}
                      style={({ pressed }) => [
                        styles.tableRow,
                        styles.tableRowAll,
                        approverKey === 'all' && styles.tableRowActive,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <View style={styles.tableApprover}>
                        <View style={[styles.statAvatar, styles.statAvatarAll]}>
                          <Ionicons name="people-outline" size={14} color={palette.primary} />
                        </View>
                        <Text style={styles.tableName} numberOfLines={1}>
                          All
                        </Text>
                      </View>
                      <Text style={styles.tableCount}>{pendingTotalAcrossApprovers}</Text>
                    </Pressable>
                    {approverStatsSorted.map((stat, index) => {
                      const active = approverKey === stat.key;
                      const label = stat.isYou ? 'You' : stat.name;
                      return (
                        <Pressable
                          key={stat.key}
                          onPress={() => onSelectApprover(stat.key)}
                          style={({ pressed }) => [
                            styles.tableRow,
                            index === approverStatsSorted.length - 1 && styles.tableRowLast,
                            active && styles.tableRowActive,
                            pressed && { opacity: 0.85 },
                          ]}
                        >
                          <View style={styles.tableApprover}>
                            {stat.key === 'hr' ? (
                              <View style={styles.statIconHr}>
                                <Ionicons name="briefcase-outline" size={14} color={palette.primary} />
                              </View>
                            ) : (
                              <View style={styles.statAvatar}>
                                <Text style={styles.statAvatarText}>{initialsFromName(stat.name)}</Text>
                              </View>
                            )}
                            <View style={styles.tableNameWrap}>
                              <Text style={styles.tableName} numberOfLines={1}>
                                {label}
                              </Text>
                              {stat.isYou ? (
                                <Text style={styles.statHint}>Your queue</Text>
                              ) : null}
                            </View>
                          </View>
                          <Text style={styles.tableCount}>{stat.pendingCount}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              <Text style={styles.count}>
                {total} {tab === 'pending' ? 'pending' : 'approved'} request
                {total === 1 ? '' : 's'}
                {approverKey !== 'all' && tab === 'pending' ? ' for selected approver' : ''}
                {hasQuery ? ' matched' : ''}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name={hasQuery ? 'search-outline' : 'checkmark-done-outline'}
                size={36}
                color={palette.textFaint}
              />
              <Text style={styles.emptyTitle}>
                {hasQuery
                  ? 'No matches'
                  : tab === 'pending'
                    ? 'Nothing pending'
                    : 'No approved leaves'}
              </Text>
              <Text style={styles.emptyBody}>
                {hasQuery
                  ? 'Try another name, employee ID, or leave type.'
                  : tab === 'pending'
                    ? approverKey !== 'all'
                      ? 'No pending leaves waiting on this approver.'
                      : 'Leave requests waiting for your action will appear here.'
                    : 'Fully approved leaves in your scope will appear here.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/leave-approvals/[id]', params: { id: String(item.id) } })
              }
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Card style={styles.card}>
                <View style={styles.top}>
                  <View style={styles.icon}>
                    <Ionicons name="person-outline" size={18} color={palette.primary} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.employeeName}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {item.type}
                      {item.employeeCode ? ` · ID ${item.employeeCode}` : ''}
                    </Text>
                  </View>
                  <Badge
                    label={item.statusLabel}
                    tone={
                      item.status === 'approved'
                        ? 'success'
                        : item.status === 'rejected'
                          ? 'danger'
                          : 'warning'
                    }
                  />
                </View>
                {tab === 'pending' && item.currentApproverName ? (
                  <View style={styles.waiting}>
                    <Ionicons name="hourglass-outline" size={13} color={palette.textMuted} />
                    <Text style={styles.waitingText} numberOfLines={1}>
                      Waiting on {item.awaitingHr ? 'HR' : item.currentApproverName}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.foot}>
                  <Text style={styles.dates}>
                    {formatDate(item.from)} → {formatDate(item.to)}
                  </Text>
                  <View style={styles.footRight}>
                    <Text style={styles.days}>
                      {item.days} {item.days === 1 ? 'day' : 'days'}
                    </Text>
                    {item.canAct ? (
                      <View style={styles.actPill}>
                        <Text style={styles.actText}>Action</Text>
                      </View>
                    ) : null}
                    <Ionicons name="chevron-forward" size={15} color={palette.textFaint} />
                  </View>
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}
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
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  errorText: { ...typography.small, color: palette.danger, textAlign: 'center' },
  retryText: { ...typography.small, color: palette.primary, fontFamily: fonts.bold },

  tabs: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },

  searchWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: palette.text,
    fontFamily: fonts.medium,
    paddingVertical: 4,
  },

  report: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  reportHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  reportTitle: {
    ...typography.overline,
    color: palette.textMuted,
  },
  reportTotal: {
    ...typography.small,
    color: palette.text,
    fontFamily: fonts.bold,
  },
  table: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: palette.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  tableHeaderText: {
    ...typography.caption,
    color: palette.textMuted,
    fontFamily: fonts.bold,
    letterSpacing: 0.4,
  },
  tableColApprover: { flex: 1 },
  tableColCount: { width: 72, textAlign: 'right' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    gap: spacing.md,
    backgroundColor: palette.surface,
  },
  tableRowAll: {
    backgroundColor: palette.primaryLight,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableRowActive: {
    backgroundColor: 'rgba(79, 107, 255, 0.12)',
  },
  tableApprover: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },
  tableNameWrap: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  tableName: {
    ...typography.body,
    color: palette.text,
    fontFamily: fonts.semibold,
  },
  tableCount: {
    width: 72,
    textAlign: 'right',
    ...typography.bodyBold,
    color: palette.text,
    fontVariant: ['tabular-nums'],
  },
  statIconHr: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.inkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statAvatarAll: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: 'rgba(79, 107, 255, 0.28)',
  },
  statAvatarText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: palette.white,
  },
  statHint: {
    ...typography.caption,
    color: palette.primary,
    textTransform: 'none',
    fontSize: 10,
  },

  count: {
    ...typography.small,
    color: palette.textMuted,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  card: { marginBottom: spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...typography.bodyBold, color: palette.text },
  meta: { ...typography.small, color: palette.textMuted, marginTop: 2 },
  waiting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  waitingText: {
    ...typography.caption,
    color: palette.textMuted,
    textTransform: 'none',
    flex: 1,
  },
  foot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    gap: spacing.sm,
  },
  dates: { ...typography.small, color: palette.text, fontWeight: '600', flex: 1 },
  footRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  days: { ...typography.caption, color: palette.textFaint, textTransform: 'none' },
  actPill: {
    backgroundColor: palette.warningLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  actText: {
    ...typography.caption,
    color: palette.warningDark,
    textTransform: 'none',
    fontWeight: '700',
  },

  empty: {
    alignItems: 'center',
    paddingTop: spacing.huge,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: { ...typography.h3, color: palette.text, marginTop: spacing.md },
  emptyBody: {
    ...typography.small,
    color: palette.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
