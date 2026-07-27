import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import Badge, { BadgeTone } from '@/components/Badge';
import Button from '@/components/Button';
import Card from '@/components/Card';
import ScreenHeader from '@/components/ScreenHeader';
import SectionHeader from '@/components/SectionHeader';
import { useDashboard } from '@/hooks/useDashboard';
import { confirmAction } from '@/lib/confirm';
import { formatDate, formatTimeDayMonthYear } from '@/lib/format';
import { fonts, palette, radius, spacing, typography } from '@/theme';
import { LifecycleApprovalDetail } from '@/types';

function statusTone(status: LifecycleApprovalDetail['status']): BadgeTone {
  if (status === 'approved') return 'success';
  if (status === 'rejected' || status === 'cancelled') return 'danger';
  if (status === 'manager_decided') return 'info';
  return 'warning';
}

function closeLifecycleApprovalScreen() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/lifecycle-approvals' as never);
}

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function LifecycleApprovalDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { refresh: refreshDashboard } = useDashboard();

  const [detail, setDetail] = useState<LifecycleApprovalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');
  const [extendDate, setExtendDate] = useState(tomorrowIso());
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const approvalId = String(id || '').trim();
    if (!approvalId) {
      setLoading(false);
      setError('Invalid approval request.');
      return;
    }
    setLoading(true);
    setError(null);
    const res = await api.getLifecycleApprovalDetail(approvalId);
    setLoading(false);
    if (res.status === 'success' && res.data) {
      setDetail(res.data);
      if (res.data.status !== 'pending' && res.data.approvalNotes) {
        setRemarks(res.data.approvalNotes);
      }
    } else {
      setError(res.message || 'Could not load the lifecycle approval.');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const canAct = Boolean(detail?.actions?.canAct ?? detail?.canAct);
  const isProbationReview =
    detail?.statusType === 'probation_review' || detail?.actions?.mode === 'probation_review';

  const submit = async (decision: 'approve' | 'reject' | 'clear' | 'extend') => {
    if (!detail) return;
    const trimmed = remarks.trim();
    if (trimmed.length < 10) {
      Alert.alert('Remarks required', 'Remarks are required and must be at least 10 characters.');
      return;
    }

    if (decision === 'extend') {
      const date = extendDate.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        Alert.alert('Date required', 'Enter the new probation complete date as YYYY-MM-DD.');
        return;
      }
      if (date <= new Date().toISOString().slice(0, 10)) {
        Alert.alert('Invalid date', 'New probation complete date must be in the future.');
        return;
      }
    }

    const labelMap: Record<string, string> = {
      approve: 'Approve',
      reject: 'Reject',
      clear: 'Approve completion',
      extend: 'Extend probation',
    };
    const label = labelMap[decision] || decision;
    const ok = await confirmAction(
      `${label}`,
      `Confirm ${label.toLowerCase()} for ${detail.employeeName}?`,
      label,
    );
    if (!ok) return;

    setSubmitting(true);
    try {
      const res = await api.decideLifecycleApproval({
        id: detail.id,
        decision,
        remarks: trimmed,
        extendedProbationCompleteDate: decision === 'extend' ? extendDate.trim() : undefined,
      });
      if (res.status === 'success') {
        try {
          await refreshDashboard();
        } catch {
          /* ignore dashboard refresh errors */
        }
        Alert.alert('Done', res.message || 'Decision saved.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Could not update', res.message || 'Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Could not update', err?.message || 'Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title="Lifecycle approval"
        right={
          <Pressable
            hitSlop={8}
            onPress={closeLifecycleApprovalScreen}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={styles.headerBtn}
          >
            <Ionicons name="close" size={22} color={palette.onInk} />
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={palette.primary} />
          </View>
        ) : error ? (
          <Card>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              onPress={load}
              hitSlop={8}
              style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="refresh" size={16} color={palette.primary} />
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </Card>
        ) : detail ? (
          <>
            <Card raised>
              <View style={styles.topRow}>
                <View style={styles.flex}>
                  <Text style={styles.empName}>{detail.employeeName}</Text>
                  <Text style={styles.code}>
                    {detail.employeeCode || `ID ${detail.employeeId}`}
                  </Text>
                </View>
                <Badge label={detail.statusLabel} tone={statusTone(detail.status)} />
              </View>
              <Text style={styles.type}>{detail.typeLabel}</Text>
              <View style={styles.metaBlock}>
                <DetailRow label="Effective date" value={formatDate(detail.effectiveDate) || '—'} />
                <DetailRow label="Requested by" value={detail.requestedBy || '—'} />
                <DetailRow
                  label="Requested at"
                  value={formatTimeDayMonthYear(detail.requestedAt) || '—'}
                  last
                />
              </View>
            </Card>

            {detail.changeRows?.length ? (
              <>
                <SectionHeader title="What is changing" tight />
                <Card>
                  {detail.changeRows.map((row, i) => (
                    <View
                      key={`${row.label}-${i}`}
                      style={[
                        styles.changeRow,
                        i < detail.changeRows.length - 1 && styles.divider,
                      ]}
                    >
                      <Text style={styles.changeLabel}>{row.label}</Text>
                      <View style={styles.changeValues}>
                        <Text style={styles.changeFrom} numberOfLines={2}>
                          {row.from || '—'}
                        </Text>
                        <Ionicons name="arrow-forward" size={14} color={palette.textFaint} />
                        <Text style={styles.changeTo} numberOfLines={2}>
                          {row.to || '—'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </Card>
              </>
            ) : detail.summary ? (
              <>
                <SectionHeader title="Details" tight />
                <Card>
                  <Text style={styles.notes}>{detail.summary}</Text>
                </Card>
              </>
            ) : null}

            {detail.requesterNotes ? (
              <>
                <SectionHeader title="Requester notes" tight />
                <Card>
                  <Text style={styles.notes}>{detail.requesterNotes}</Text>
                </Card>
              </>
            ) : null}

            {detail.eligibilityRemarks ? (
              <>
                <SectionHeader title="Eligibility remarks" tight />
                <Card>
                  <Text style={styles.notes}>{detail.eligibilityRemarks}</Text>
                </Card>
              </>
            ) : null}

            {canAct ? (
              <>
                <SectionHeader title="Your decision" tight />
                <Card>
                  <Text style={styles.fieldLabel}>Remarks * (min 10 characters)</Text>
                  <TextInput
                    style={styles.input}
                    value={remarks}
                    onChangeText={setRemarks}
                    placeholder={
                      isProbationReview
                        ? 'Required when clearing or extending…'
                        : 'Required when approving or rejecting…'
                    }
                    placeholderTextColor={palette.textFaint}
                    multiline
                    textAlignVertical="top"
                    editable={!submitting}
                  />

                  {isProbationReview ? (
                    <>
                      <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>
                        New complete date (for extend) YYYY-MM-DD
                      </Text>
                      <TextInput
                        style={[styles.input, styles.dateInput]}
                        value={extendDate}
                        onChangeText={setExtendDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={palette.textFaint}
                        autoCapitalize="none"
                        editable={!submitting}
                      />
                      <View style={styles.actions}>
                        <Button
                          label="Approve completion"
                          onPress={() => submit('clear')}
                          loading={submitting}
                          disabled={submitting}
                          style={{ flex: 1 }}
                        />
                      </View>
                      <Pressable
                        onPress={() => submit('extend')}
                        disabled={submitting}
                        style={({ pressed }) => [
                          styles.extendBtn,
                          (pressed || submitting) && { opacity: 0.7 },
                        ]}
                      >
                        <Text style={styles.extendText}>Extend probation</Text>
                      </Pressable>
                    </>
                  ) : (
                    <View style={styles.actions}>
                      <Button
                        label="Approve"
                        onPress={() => submit('approve')}
                        loading={submitting}
                        disabled={submitting}
                        style={{ flex: 1 }}
                      />
                      <Pressable
                        onPress={() => submit('reject')}
                        disabled={submitting}
                        style={({ pressed }) => [
                          styles.rejectBtn,
                          (pressed || submitting) && { opacity: 0.7 },
                        ]}
                      >
                        <Text style={styles.rejectText}>Reject</Text>
                      </Pressable>
                    </View>
                  )}
                </Card>
              </>
            ) : (
              <Card style={styles.block}>
                {detail.approvalNotes ? (
                  <>
                    <Text style={styles.fieldLabel}>Approver remarks</Text>
                    <Text style={styles.notes}>{detail.approvalNotes}</Text>
                  </>
                ) : (
                  <Text style={styles.emptyRemarks}>
                    No status change is available for you on this request.
                  </Text>
                )}
              </Card>
            )}
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.detailRow, !last && styles.divider]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.canvas },
  content: { padding: spacing.lg, gap: spacing.md },
  center: { paddingVertical: spacing.xxxl, alignItems: 'center' },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  flex: { flex: 1 },
  empName: { ...typography.title, color: palette.onInk, fontFamily: fonts.semiBold },
  code: { ...typography.caption, color: palette.textMuted, marginTop: 2 },
  type: {
    ...typography.body,
    color: palette.primary,
    fontFamily: fonts.semiBold,
    marginTop: spacing.sm,
  },
  metaBlock: { marginTop: spacing.md },
  detailRow: { paddingVertical: spacing.sm },
  detailLabel: { ...typography.caption, color: palette.textMuted },
  detailValue: { ...typography.body, color: palette.onInk, marginTop: 2 },
  changeRow: { paddingVertical: spacing.sm },
  changeLabel: { ...typography.caption, color: palette.textMuted, marginBottom: 4 },
  changeValues: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  changeFrom: { ...typography.body, color: palette.textMuted, flex: 1 },
  changeTo: { ...typography.body, color: palette.onInk, flex: 1, fontFamily: fonts.semiBold },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  notes: { ...typography.body, color: palette.onInk, lineHeight: 22 },
  fieldLabel: { ...typography.caption, color: palette.textMuted, marginBottom: spacing.xs },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.body,
    color: palette.onInk,
    backgroundColor: palette.surface,
  },
  dateInput: { minHeight: 44 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  rejectBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectText: { ...typography.body, color: palette.danger, fontFamily: fonts.semiBold },
  extendBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extendText: {
    ...typography.body,
    color: palette.warningDark,
    fontFamily: fonts.semiBold,
  },
  block: { gap: spacing.sm },
  emptyRemarks: { ...typography.body, color: palette.textMuted },
  errorText: { ...typography.body, color: palette.danger, marginBottom: spacing.sm },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  retryText: { ...typography.body, color: palette.primary, fontFamily: fonts.semiBold },
});
