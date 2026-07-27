import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Badge, { BadgeTone } from '@/components/Badge';
import Card from '@/components/Card';
import ScreenHeader from '@/components/ScreenHeader';
import StateView from '@/components/StateView';
import { api } from '@/api/client';
import { useReadOnlyResource } from '@/hooks/useReadOnlyResource';
import { palette, radius, spacing, typography } from '@/theme';
import { Payslip } from '@/types';

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || ''} ${amount.toFixed(2)}`.trim();
  }
}

function statusTone(status: string): BadgeTone {
  const s = status.toLowerCase();
  if (s === 'paid') return 'success';
  if (s === 'approved_by_hr' || s === 'approved') return 'info';
  return 'neutral';
}

export default function ProfilePayslipsScreen() {
  const { data, loading, refreshing, error, refresh, retry } = useReadOnlyResource(
    () => api.getPayslips(),
    [],
  );

  const payslips = data?.payslips ?? [];

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Payslips"
        subtitle="Your payroll history"
        right={
          <Pressable hitSlop={10} onPress={() => router.back()}>
            <Ionicons name="close" size={22} color={palette.onInk} />
          </Pressable>
        }
      />

      {loading && !data ? (
        <StateView loading />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.primary} />
          }
        >
          {error && !data ? (
            <StateView error={error} onRetry={retry} />
          ) : payslips.length === 0 ? (
            <StateView
              empty
              emptyIcon="cash-outline"
              emptyTitle="No payslips yet"
              emptyText="Generated and paid payslips will appear here."
            />
          ) : (
            <>
              <Text style={styles.count}>
                {payslips.length} payslip{payslips.length === 1 ? '' : 's'}
              </Text>
              {payslips.map((p) => (
                <PayslipCard key={p.id} payslip={p} />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function PayslipCard({ payslip }: { payslip: Payslip }) {
  return (
    <Card style={styles.card} padded>
      <View style={styles.top}>
        <View style={styles.icon}>
          <Ionicons name="wallet-outline" size={20} color={palette.primary} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.title}>{payslip.periodLabel || 'Pay period'}</Text>
          <Text style={styles.sub}>
            {payslip.currency} · Net {formatMoney(payslip.net, payslip.currency)}
          </Text>
        </View>
        <Badge label={payslip.statusLabel || payslip.status} tone={statusTone(payslip.status)} />
      </View>

      <View style={styles.grid}>
        <Meta label="Basic" value={formatMoney(payslip.basic, payslip.currency)} />
        <Meta label="Allowances" value={formatMoney(payslip.allowances, payslip.currency)} />
        <Meta label="Deductions" value={formatMoney(payslip.deductions, payslip.currency)} />
        <Meta label="Tax" value={formatMoney(payslip.tax, payslip.currency)} />
      </View>

      <View style={styles.netRow}>
        <Text style={styles.netLabel}>Net pay</Text>
        <Text style={styles.netValue}>{formatMoney(payslip.net, payslip.currency)}</Text>
      </View>
    </Card>
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
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  count: { ...typography.small, color: palette.textMuted, marginBottom: spacing.md },

  card: { marginBottom: spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.bodyBold, color: palette.text },
  sub: { ...typography.small, color: palette.textMuted, marginTop: 2 },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  meta: { width: '50%', marginBottom: spacing.sm },
  metaLabel: { ...typography.caption, color: palette.textFaint, textTransform: 'none' },
  metaValue: { ...typography.small, color: palette.text, fontWeight: '600', marginTop: 2 },

  netRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  netLabel: { ...typography.small, color: palette.textMuted },
  netValue: { ...typography.h3, color: palette.text, fontVariant: ['tabular-nums'] },
});
