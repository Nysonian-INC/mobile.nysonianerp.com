import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
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
import SignaturePad from '@/components/SignaturePad';
import { confirmAction } from '@/lib/confirm';
import { formatDate, formatDateTime } from '@/lib/format';
import { fonts, palette, radius, spacing, typography } from '@/theme';
import { LeaveApprovalDetail } from '@/types';

function statusTone(status: LeaveApprovalDetail['status']): BadgeTone {
  return status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'warning';
}

export default function LeaveApprovalDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [detail, setDetail] = useState<LeaveApprovalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const leaveId = Number(id);
    if (!leaveId) {
      setLoading(false);
      setError('Invalid leave request.');
      return;
    }
    setLoading(true);
    setError(null);
    const res = await api.getLeaveApprovalDetail(leaveId);
    setLoading(false);
    if (res.status === 'success' && res.data) {
      setDetail(res.data);
    } else {
      setError(res.message || 'Could not load the leave request.');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const canAct = Boolean(detail?.actions?.canAct);
  const signatureRequired = Boolean(detail?.actions?.signatureRequired);

  const submit = async (decision: 'approve' | 'reject') => {
    if (!detail) return;
    const trimmed = remarks.trim();
    if (!trimmed) {
      Alert.alert('Remarks required', 'Please enter remarks before continuing.');
      return;
    }
    if (decision === 'approve' && signatureRequired && !signature) {
      Alert.alert('Signature required', 'Please provide your digital signature to approve.');
      return;
    }

    const label = decision === 'approve' ? 'Approve' : 'Reject';
    const ok = await confirmAction(
      `${label} leave`,
      `Are you sure you want to ${decision} this leave request for ${detail.employeeName}?`,
      label,
    );
    if (!ok) return;

    setSubmitting(true);
    try {
      const res = await api.decideLeaveApproval({
        id: detail.id,
        decision,
        remarks: trimmed,
        signatureData: decision === 'approve' ? signature || undefined : undefined,
      });
      if (res.status === 'success') {
        Alert.alert('Done', res.message || 'Leave status updated.', [
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
        title="Leave approval"
        right={
          <Pressable
            hitSlop={8}
            onPress={() => router.back()}
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
                    {detail.code}
                    {detail.employeeCode ? ` · ID ${detail.employeeCode}` : ''}
                  </Text>
                </View>
                <Badge label={detail.statusLabel} tone={statusTone(detail.status)} />
              </View>

              <Text style={styles.type}>{detail.type}</Text>

              <View style={styles.rangeRow}>
                <View style={styles.flex}>
                  <Text style={styles.metaLabel}>From</Text>
                  <Text style={styles.metaValue}>{formatDate(detail.from)}</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={palette.textFaint} />
                <View style={styles.flex}>
                  <Text style={styles.metaLabel}>To</Text>
                  <Text style={styles.metaValue}>{formatDate(detail.to)}</Text>
                </View>
                <View style={styles.daysPill}>
                  <Text style={styles.daysPillText}>
                    {detail.days} {detail.days === 1 ? 'day' : 'days'}
                  </Text>
                </View>
              </View>
            </Card>

            <Card style={styles.block}>
              <DetailRow label="Department" value={detail.department || '—'} />
              <DetailRow label="Designation" value={detail.designation || '—'} />
              <DetailRow label="Manager" value={detail.manager || '—'} />
              <DetailRow label="Applied on" value={formatDate(detail.appliedOn) || '—'} last />
            </Card>

            <SectionHeader title="Reason" tight />
            <Card>
              <Text style={styles.reason}>{detail.reason || '—'}</Text>
            </Card>

            {detail.approvalProgress.total > 0 ? (
              <>
                <SectionHeader
                  title={`Approvals (${detail.approvalProgress.approved}/${detail.approvalProgress.total})`}
                  tight
                />
                <Card>
                {detail.approvalProgress.approvers.map((a, i) => (
                  <View
                    key={`${a.name}-${i}`}
                    style={[
                      styles.progressRow,
                      i < detail.approvalProgress.approvers.length - 1 && styles.divider,
                    ]}
                  >
                    <Text style={styles.progressName}>{a.name}</Text>
                    <Badge
                      label={a.status || 'pending'}
                      tone={
                        a.status === 'approved'
                          ? 'success'
                          : a.status === 'rejected'
                            ? 'danger'
                            : 'warning'
                      }
                    />
                  </View>
                ))}
                </Card>
              </>
            ) : null}

            <SectionHeader
              title={`Remarks${detail.remarks.length > 0 ? ` (${detail.remarks.length})` : ''}`}
              tight
            />
            <Card>
              {detail.remarks.length === 0 ? (
                <Text style={styles.emptyRemarks}>No remarks have been added yet.</Text>
              ) : (
                detail.remarks.map((r, i) => (
                  <View
                    key={`${r.author}-${i}`}
                    style={[styles.remark, i < detail.remarks.length - 1 && styles.divider]}
                  >
                    <View style={styles.remarkHead}>
                      <Badge label={r.author} tone={r.role === 'hr' ? 'success' : 'primary'} />
                      {r.status ? (
                        <Text style={styles.remarkStatus}>{r.status}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.remarkText}>{r.text}</Text>
                    {r.date ? <Text style={styles.remarkDate}>{formatDateTime(r.date)}</Text> : null}
                  </View>
                ))
              )}
            </Card>

            {detail.attachments.length > 0 ? (
              <>
                <SectionHeader title="Attachments" tight />
                <Card>
                  {detail.attachments.map((a) => (
                    <Pressable
                      key={a.url}
                      style={styles.attachment}
                      onPress={() => Linking.openURL(a.url)}
                    >
                      <Ionicons name="document-attach-outline" size={18} color={palette.primary} />
                      <Text style={styles.attachmentText}>{a.label}</Text>
                      <Ionicons name="open-outline" size={16} color={palette.textFaint} />
                    </Pressable>
                  ))}
                </Card>
              </>
            ) : null}

            {canAct ? (
              <>
                <SectionHeader title="Your decision" tight />
                <Card>
                <Text style={styles.fieldLabel}>Remarks *</Text>
                <TextInput
                  style={styles.input}
                  value={remarks}
                  onChangeText={setRemarks}
                  placeholder="Enter remarks (required)"
                  placeholderTextColor={palette.textFaint}
                  multiline
                  textAlignVertical="top"
                  editable={!submitting}
                />

                {signatureRequired ? (
                  <>
                    <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>
                      Digital signature *
                    </Text>
                    <SignaturePad onChange={setSignature} />
                  </>
                ) : null}

                <View style={styles.actions}>
                  <Button
                    label={signatureRequired ? 'Approve & Sign' : 'Approve'}
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
                </Card>
              </>
            ) : (
              <Card style={styles.block}>
                <Text style={styles.emptyRemarks}>
                  No status change is available for you on this request.
                </Text>
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
      <Text style={styles.detailValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.lg },
  center: { paddingVertical: spacing.xxxl, alignItems: 'center' },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  errorText: { ...typography.small, color: palette.danger },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    minHeight: 44,
  },
  retryText: { ...typography.small, color: palette.primary, fontFamily: fonts.bold },

  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  empName: { ...typography.h3, color: palette.text },
  code: { ...typography.caption, color: palette.textFaint, textTransform: 'none', marginTop: 2 },
  type: { ...typography.bodyBold, color: palette.primaryDark, marginTop: spacing.md },

  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  metaLabel: { ...typography.caption, color: palette.textFaint, textTransform: 'none' },
  metaValue: { ...typography.bodyBold, color: palette.text, marginTop: 2 },
  daysPill: {
    backgroundColor: palette.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  daysPillText: { ...typography.caption, color: palette.primaryDark, textTransform: 'none' },

  block: { gap: 0 },
  reason: { ...typography.body, color: palette.text, lineHeight: 21 },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: palette.border },
  detailLabel: { ...typography.small, color: palette.textMuted },
  detailValue: { ...typography.bodyBold, color: palette.text, flexShrink: 1, textAlign: 'right' },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  progressName: { ...typography.body, color: palette.text, flex: 1 },

  emptyRemarks: { ...typography.small, color: palette.textFaint },
  remark: { paddingVertical: spacing.md },
  remarkHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  remarkStatus: { ...typography.caption, color: palette.textMuted, textTransform: 'capitalize' },
  remarkText: { ...typography.body, color: palette.text, lineHeight: 21 },
  remarkDate: {
    ...typography.caption,
    color: palette.textFaint,
    textTransform: 'none',
    marginTop: spacing.xs,
  },

  attachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  attachmentText: { ...typography.body, color: palette.text, flex: 1 },

  fieldLabel: { ...typography.small, color: palette.textMuted, fontWeight: '600', marginBottom: spacing.sm },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.body,
    color: palette.text,
    backgroundColor: palette.surfaceAlt,
  },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl, alignItems: 'center' },
  rejectBtn: {
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: palette.dangerLight,
    borderWidth: 1,
    borderColor: 'rgba(240,68,75,0.2)',
  },
  rejectText: { ...typography.bodyBold, color: palette.dangerDark },
});
