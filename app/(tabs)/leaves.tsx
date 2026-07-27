import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { memo, useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import Card from '@/components/Card';
import ProgressBar from '@/components/ProgressBar';
import ScreenHeader from '@/components/ScreenHeader';
import SectionHeader from '@/components/SectionHeader';
import SegmentedControl from '@/components/SegmentedControl';
import { useDashboard } from '@/hooks/useDashboard';
import { fonts, palette, radius, spacing, typography } from '@/theme';
import { LeaveRequest } from '@/types';

const FILTERS: Array<{ key: 'all' | LeaveRequest['status']; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const LeaveRequestRow = memo(function LeaveRequestRow({ item }: { item: LeaveRequest }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/leave-detail', params: { id: String(item.id) } })}
      style={({ pressed }) => [pressed && styles.requestPressed]}
    >
      <Card style={styles.requestCard}>
        <View style={styles.requestTop}>
          <View style={styles.requestIcon}>
            <Ionicons name="calendar" size={18} color={palette.primary} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.requestType}>{item.type}</Text>
            <Text style={styles.requestDates}>
              {item.from} → {item.to}
            </Text>
          </View>
          <Badge
            label={item.status}
            tone={item.status === 'approved' ? 'success' : item.status === 'rejected' ? 'danger' : 'warning'}
          />
        </View>
        <View style={styles.requestFoot}>
          <Text style={styles.requestDays}>
            {item.days} {item.days > 1 ? 'days' : 'day'}
          </Text>
          <View style={styles.requestFootRight}>
            <Text style={styles.requestId}>#{item.id}</Text>
            <Ionicons name="chevron-forward" size={15} color={palette.textFaint} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
});

export default function LeavesScreen() {
  const insets = useSafeAreaInsets();
  const { data, loading, error, refresh, retry } = useDashboard();
  const [filter, setFilter] = useState<'all' | LeaveRequest['status']>('all');
  const isFirstFocus = useRef(true);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      refreshRef.current();
    }, []),
  );

  const renderItem: ListRenderItem<LeaveRequest> = useCallback(
    ({ item }) => <LeaveRequestRow item={item} />,
    [],
  );

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
        <Text style={styles.errorText}>{error || 'Could not load leaves.'}</Text>
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

  const { leaves, leaveRequests, employee } = data;
  const unit = employee.leaveUnitLabel || 'Days';
  const requests = leaveRequests ?? [];
  const list = filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  const listHeader = (
    <View>
      <Card raised>
        <Text style={styles.balanceLabel}>Available balance</Text>
        <View style={styles.balanceFigureRow}>
          <Text style={styles.balanceBig}>{leaves.availableLeaves}</Text>
          <Text style={styles.balanceUnit}>{unit.toLowerCase()}</Text>
        </View>
        <ProgressBar value={leaves.availableLeaves / (leaves.proratedLeaves || 1)} height={12} gradient />
        <View style={styles.balanceRow}>
          <Text style={styles.balanceMeta}>
            Consumed <Text style={styles.balanceMetaVal}>{leaves.consumedLeaves}</Text>
          </Text>
          <Text style={styles.balanceMeta}>
            Accrued <Text style={styles.balanceMetaVal}>{leaves.proratedLeaves}</Text>
          </Text>
        </View>
      </Card>

      <Button
        label="Request leave"
        onPress={() => router.push('/leave-request')}
        style={styles.requestBtn}
        icon={<Ionicons name="add" size={18} color={palette.white} />}
      />

      <View style={styles.filters}>
        <SegmentedControl tabs={FILTERS} active={filter} onSelect={setFilter} />
      </View>

      <SectionHeader title={`${list.length} request${list.length === 1 ? '' : 's'}`} />
    </View>
  );

  return (
    <View style={styles.root}>
      <ScreenHeader title="Leaves" subtitle="Balance & requests" />
      <FlatList
        data={list}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  flex: { flex: 1 },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.background,
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  errorText: { ...typography.small, color: palette.danger, textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  retryText: { ...typography.small, color: palette.primary, fontFamily: fonts.bold },
  balanceLabel: { ...typography.overline, color: palette.textMuted },
  balanceFigureRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  balanceBig: { ...typography.hero, color: palette.text },
  balanceUnit: { ...typography.h3, color: palette.textMuted },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  balanceMeta: { ...typography.small, color: palette.textMuted },
  balanceMetaVal: { ...typography.bodyBold, color: palette.text, fontVariant: ['tabular-nums'] },
  requestBtn: { marginTop: spacing.lg },
  filters: { marginTop: spacing.xl },

  requestCard: { marginBottom: spacing.md },
  requestPressed: { opacity: 0.7 },
  requestFootRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  requestTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  requestIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestType: { ...typography.bodyBold, color: palette.text },
  requestDates: { ...typography.small, color: palette.textMuted, marginTop: 2 },
  requestFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  requestDays: { ...typography.small, color: palette.text, fontFamily: fonts.semibold },
  requestId: { ...typography.caption, color: palette.textFaint, textTransform: 'none' },
});
