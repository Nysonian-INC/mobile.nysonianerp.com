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
import { ProbationReviewDetail } from '@/types';

function statusTone(status: string): BadgeTone {
  if (status === 'approved' || status === 'manager_decided') return 'success';
  if (status === 'cancelled') return 'danger';
  return 'warning';
}

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function closeScreen() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/probation-approvals' as never);
}

export default function ProbationApprovalDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { refresh: refreshDashboard } = useDashboard();

  const [detail, setDetail] = useState<ProbationReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');
  const [extendDate, setExtendDate] = useState(tomorrowIso());
  const [hrRemarks, setHrRemarks] = useState('');
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
    const res = await api.getProbationApprovalDetail(approvalId);
    setLoading(false);
    if (res.status === 'success' && res.data) {
      setDetail(res.data);
      if (res.data.managerRemarks) setRemarks(res.data.managerRemarks);
    } else {
      setError(res.message || 'Could not load probation review.');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const submitDecide = async (decision: 'clear' | 'extend') => {
    if (!detail) return;
    const trimmed = remarks.trim();
    if (trimmed.length < 10) {
      Alert.alert('Remarks required', 'Remarks are required and must be at least 10 characters.');
      return;
    }
    if (decision === 'extend') {
      const date = extendDate.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date <= new Date().toISOString().slice(0, 10)) {
        Alert.alert('Invalid date', 'Enter a future probation complete date as YYYY-MM-DD.');
        return;
      }
    }
    const label = decision === 'clear' ? 'Approve completion' : 'Extend probation';
    const ok = await confirmAction(label, `Confirm ${label.toLowerCase()} for ${detail.employeeName}?`, label);
    if (!ok) return;

    setSubmitting(true);
    try {
      const res = await api.decideProbationApproval({
        id: detail.id,
        decision,
        remarks: trimmed,
        extendedProbationCompleteDate: decision === 'extend' ? extendDate.trim() : undefined,
      });
      if (res.status === 'success') {
        try {
          await refreshDashboard();
        } catch {
          /* ignore */
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

  const submitApply = async () => {
    if (!detail) return;
    const ok = await confirmAction(
      'Apply to profile',
      `Apply approval authority decision for ${detail.employeeName}? This updates status/salary or probation date.`,
      'Apply',
    );
    if (!ok) return;
    setSubmitting(true);
    try {
      const res = await api.applyProbationApproval({
        id: detail.id,
        hrRemarks: hrRemarks.trim(),
      });
      if (res.status === 'success') {
        try {
          await refreshDashboard();
        } catch {
          /* ignore */
        }
        Alert.alert('Applied', res.message || 'Employee profile updated.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Could not apply', res.message || 'Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Could not apply', err?.message || 'Network error.');
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
        title="Probation review"
        right={
          <Pressable hitSlop={8} onPress={closeScreen} style={styles.headerBtn}>
            <Ionicons name="close" size={22} color={palette.onInk} />
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={palette.primary} />
          </View>
        ) : error ? (
          <Card padded>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={load}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </Card>
        ) : detail ? (
          <>
            <Card raised padded>
              <View style={styles.topRow}>
                <View style={styles.flex}>
                  <Text style={styles.empName}>{detail.employeeName}</Text>
                  <Text style={styles.code}>{detail.employeeCode || `ID ${detail.employeeId}`}</Text>
                </View>
                <Badge label={detail.statusLabel} tone={statusTone(detail.status)} />
              </View>
              <Text style={styles.meta}>Complete {formatDate(detail.probationCompleteDate) || '—'}</Text>
              <Text style={styles.meta}>Authority {detail.managerName || '—'}</Text>
              <Text style={styles.meta}>Requested {formatTimeDayMonthYear(detail.requestedAt) || '—'}</Text>
              {detail.decisionLabel ? (
                <Text style={styles.decision}>Decision: {detail.decisionLabel}</Text>
              ) : null}
              {detail.extendedProbationCompleteDate ? (
                <Text style={styles.meta}>
                  Extended to {formatDate(detail.extendedProbationCompleteDate)}
                </Text>
              ) : null}
            </Card>

            {detail.managerRemarks ? (
              <>
                <SectionHeader title="Authority remarks" tight />
                <Card padded>
                  <Text style={styles.notes}>{detail.managerRemarks}</Text>
                </Card>
              </>
            ) : null}

            {detail.canDecide ? (
              <>
                <SectionHeader title="Your decision" tight />
                <Card padded>
                  <Text style={styles.fieldLabel}>Remarks * (min 10 characters)</Text>
                  <TextInput
                    style={styles.input}
                    value={remarks}
                    onChangeText={setRemarks}
                    placeholder="Required when clearing or extending…"
                    placeholderTextColor={palette.textFaint}
                    multiline
                    textAlignVertical="top"
                    editable={!submitting}
                  />
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
                      onPress={() => submitDecide('clear')}
                      loading={submitting}
                      disabled={submitting}
                      style={{ flex: 1 }}
                    />
                  </View>
                  <Pressable
                    onPress={() => submitDecide('extend')}
                    disabled={submitting}
                    style={({ pressed }) => [styles.extendBtn, (pressed || submitting) && { opacity: 0.7 }]}
                  >
                    <Text style={styles.extendText}>Extend probation</Text>
                  </Pressable>
                </Card>
              </>
            ) : null}

            {detail.canApply ? (
              <>
                <SectionHeader title="Apply to profile" tight />
                <Card padded>
                  <Text style={styles.notes}>
                    {detail.decision === 'clear'
                      ? `Will set status to ${detail.proposedWorkStatus || 'Permanent'} and apply after-probation salary.`
                      : `Will update probation complete date to ${formatDate(detail.extendedProbationCompleteDate) || '—'}.`}
                  </Text>
                  <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>HR remarks (optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={hrRemarks}
                    onChangeText={setHrRemarks}
                    placeholder="Optional notes when applying…"
                    placeholderTextColor={palette.textFaint}
                    multiline
                    textAlignVertical="top"
                    editable={!submitting}
                  />
                  <View style={styles.actions}>
                    <Button
                      label="Apply to profile"
                      onPress={submitApply}
                      loading={submitting}
                      disabled={submitting}
                      style={{ flex: 1 }}
                    />
                  </View>
                </Card>
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
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
  meta: { ...typography.caption, color: palette.textMuted, marginTop: spacing.sm },
  decision: { ...typography.bodyBold, color: palette.primary, marginTop: spacing.sm },
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
  extendBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.warning,
    alignItems: 'center',
  },
  extendText: { ...typography.body, color: palette.warningDark, fontFamily: fonts.semiBold },
  errorText: { ...typography.body, color: palette.danger, marginBottom: spacing.sm },
  retryText: { ...typography.bodyBold, color: palette.primary },
});
