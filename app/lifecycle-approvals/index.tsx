import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import ScreenHeader from '@/components/ScreenHeader';
import SegmentedControl from '@/components/SegmentedControl';
import StateView from '@/components/StateView';
import { useDashboard } from '@/hooks/useDashboard';
import { formatDate, formatTimeDayMonthYear } from '@/lib/format';
import { fonts, palette, radius, spacing, typography } from '@/theme';
import { LifecycleApprovalItem } from '@/types';

type TabKey = 'pending' | 'approved';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
];

function closeLifecycleApprovals() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/(tabs)/profile' as never);
}

export default function LifecycleApprovalsScreen() {
  const insets = useSafeAreaInsets();
  const { data: dashboard, loading: dashLoading } = useDashboard();
  const allowed = Boolean(dashboard?.permissions?.lifecycleApprovals);

  const [tab, setTab] = useState<TabKey>('pending');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<LifecycleApprovalItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabRef = useRef(tab);
  const queryRef = useRef(query);
  tabRef.current = tab;
  queryRef.current = query;

  useFocusEffect(
    useCallback(() => {
      if (!dashLoading && dashboard && !allowed) {
        router.replace('/(tabs)/profile' as never);
      }
    }, [dashLoading, dashboard, allowed]),
  );

  const load = useCallback(async (nextTab: TabKey, q: string, soft = false) => {
    const id = ++requestId.current;
    if (!soft) setLoading(true);
    else setSearching(true);
    setError(null);
    try {
      const res = await api.getLifecycleApprovals(nextTab, 50, 0, q);
      if (id !== requestId.current) return;
      if (res.status === 'success' && res.data) {
        setItems(res.data.items);
        setTotal(res.data.total);
      } else {
        setItems([]);
        setTotal(0);
        setError(res.message || 'Could not load lifecycle approvals.');
      }
    } catch (err: any) {
      if (id !== requestId.current) return;
      setItems([]);
      setTotal(0);
      setError(err?.message || 'Network error.');
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setSearching(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!allowed) return;
      load(tabRef.current, queryRef.current);
    }, [allowed, load]),
  );

  const skipQueryEffect = useRef(true);
  useEffect(() => {
    if (!allowed) return;
    if (skipQueryEffect.current) {
      skipQueryEffect.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load(tabRef.current, query, true);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, allowed, load]);

  const onTab = (key: TabKey) => {
    setTab(key);
    load(key, queryRef.current);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(tab, query, true);
  }, [load, tab, query]);

  const clearQuery = () => setQuery('');

  if (dashLoading && !dashboard) {
    return (
      <View style={styles.root}>
        <ScreenHeader
          title="Lifecycle approvals"
          subtitle="Employment status"
          right={
            <Pressable
              hitSlop={12}
              onPress={closeLifecycleApprovals}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.closeBtn}
            >
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

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Lifecycle approvals"
        subtitle="Employment status"
        right={
          <Pressable
            hitSlop={12}
            onPress={closeLifecycleApprovals}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={styles.closeBtn}
          >
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
            placeholder="Name, ID, activity type…"
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
            onPress={() => load(tab, query)}
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
          ListHeaderComponent={
            <Text style={styles.count}>
              {total} {tab === 'pending' ? 'pending' : 'approved'} change
              {total === 1 ? '' : 's'}
              {hasQuery ? ' matched' : ''}
            </Text>
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
                    : 'No approved changes'}
              </Text>
              <Text style={styles.emptyBody}>
                {hasQuery
                  ? 'Try another name, employee ID, or activity type.'
                  : tab === 'pending'
                    ? 'Lifecycle changes waiting for your approval will appear here.'
                    : 'Approved lifecycle changes in your queue will appear here.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/lifecycle-approvals/[id]',
                  params: { id: String(item.id) },
                })
              }
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Card style={styles.card}>
                <View style={styles.top}>
                  <View style={styles.icon}>
                    <Ionicons name="swap-horizontal-outline" size={18} color={palette.primary} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.employeeName || 'Employee'}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {item.typeLabel}
                      {item.employeeCode ? ` · ${item.employeeCode}` : ''}
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
                {item.summary ? (
                  <Text style={styles.summary} numberOfLines={2}>
                    {item.summary}
                  </Text>
                ) : null}
                <View style={styles.foot}>
                  <Text style={styles.dates}>
                    Effective {formatDate(item.effectiveDate) || '—'}
                    {item.requestedAt
                      ? ` · ${formatTimeDayMonthYear(item.requestedAt) || ''}`
                      : ''}
                  </Text>
                  <View style={styles.footRight}>
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
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
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
  summary: {
    ...typography.small,
    color: palette.text,
    marginTop: spacing.sm,
    lineHeight: 18,
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
