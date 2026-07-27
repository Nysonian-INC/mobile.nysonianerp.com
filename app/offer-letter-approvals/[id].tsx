import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
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
import DateField from '@/components/DateField';
import ScreenHeader from '@/components/ScreenHeader';
import SectionHeader from '@/components/SectionHeader';
import { confirmAction } from '@/lib/confirm';
import { fonts, palette, radius, spacing, typography } from '@/theme';
import {
  OfferLetterApprovalDetail,
  OfferLetterCcEmployee,
  OfferLetterOption,
} from '@/types';

function statusTone(status: OfferLetterApprovalDetail['status']): BadgeTone {
  return status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'warning';
}

function closeOfferLetterApprovalScreen() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/offer-letter-approvals' as never);
}

function optionLabel(options: OfferLetterOption[], id: number | string) {
  const match = options.find((o) => String(o.id) === String(id));
  return match?.name || '';
}

export default function OfferLetterApprovalDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [detail, setDetail] = useState<OfferLetterApprovalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [designationId, setDesignationId] = useState(0);
  const [workModality, setWorkModality] = useState('Onsite');
  const [gender, setGender] = useState('');
  const [probationDate, setProbationDate] = useState('');
  const [probationCompleteDate, setProbationCompleteDate] = useState('');
  const [probationSalary, setProbationSalary] = useState('');
  const [afterProbationSalary, setAfterProbationSalary] = useState('');
  const [ccEmployees, setCcEmployees] = useState<OfferLetterCcEmployee[]>([]);
  const [remarks, setRemarks] = useState('');

  const [ccQuery, setCcQuery] = useState('');
  const [ccResults, setCcResults] = useState<OfferLetterCcEmployee[]>([]);
  const [ccSearching, setCcSearching] = useState(false);
  const ccDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [picker, setPicker] = useState<'designation' | 'modality' | 'gender' | null>(null);

  const load = useCallback(async () => {
    const approvalId = Number(id);
    if (!approvalId) {
      setLoading(false);
      setError('Invalid approval request.');
      return;
    }
    setLoading(true);
    setError(null);
    const res = await api.getOfferLetterApprovalDetail(approvalId);
    setLoading(false);
    if (res.status === 'success' && res.data) {
      const data = res.data;
      setDetail(data);
      setDesignationId(Number(data.designationId || 0));
      setWorkModality(data.workModality || 'Onsite');
      setGender(data.gender || '');
      setProbationDate((data.probationDate || '').slice(0, 10));
      setProbationCompleteDate((data.probationCompleteDate || '').slice(0, 10));
      setProbationSalary(data.probationSalary || '');
      setAfterProbationSalary(data.afterProbationSalary || '');
      setCcEmployees(Array.isArray(data.ccEmployees) ? data.ccEmployees : []);
      setRemarks(data.approvalNotes || '');
    } else {
      setError(res.message || 'Could not load the offer letter.');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (ccDebounce.current) clearTimeout(ccDebounce.current);
    const q = ccQuery.trim();
    if (!detail || q.length < 2) {
      setCcResults([]);
      setCcSearching(false);
      return;
    }
    setCcSearching(true);
    ccDebounce.current = setTimeout(async () => {
      const res = await api.searchOfferLetterCc(q, detail.employeeId, 12);
      setCcSearching(false);
      if (res.status === 'success' && res.data) {
        const selected = new Set(ccEmployees.map((c) => c.id));
        setCcResults(res.data.results.filter((r) => !selected.has(r.id)));
      } else {
        setCcResults([]);
      }
    }, 300);
    return () => {
      if (ccDebounce.current) clearTimeout(ccDebounce.current);
    };
  }, [ccQuery, detail, ccEmployees]);

  const canAct = Boolean(detail?.actions?.canAct ?? detail?.canAct);
  const designations = detail?.designations || [];
  const modalityOptions = detail?.workModalityOptions || [
    { id: 'Remote', name: 'Remote' },
    { id: 'Onsite', name: 'On Site' },
  ];
  const genderOptions = detail?.genderOptions || [
    { id: 'Male', name: 'Male' },
    { id: 'Female', name: 'Female' },
    { id: 'Other', name: 'Other' },
  ];

  const designationLabel = useMemo(
    () => optionLabel(designations, designationId) || detail?.designation || 'Choose…',
    [designations, designationId, detail?.designation],
  );
  const modalityLabel = useMemo(
    () => optionLabel(modalityOptions, workModality) || workModality || 'Choose…',
    [modalityOptions, workModality],
  );
  const genderLabel = useMemo(
    () => optionLabel(genderOptions, gender) || gender || 'Choose…',
    [genderOptions, gender],
  );

  const addCc = (emp: OfferLetterCcEmployee) => {
    setCcEmployees((prev) => (prev.some((p) => p.id === emp.id) ? prev : [...prev, emp]));
    setCcQuery('');
    setCcResults([]);
  };

  const removeCc = (empId: number) => {
    setCcEmployees((prev) => prev.filter((p) => p.id !== empId));
  };

  const validateForm = (decision: 'approve' | 'reject') => {
    if (!detail) return false;
    const trimmed = remarks.trim();
    if (trimmed.length < 10) {
      Alert.alert('Remarks required', 'Please enter at least 10 characters of remarks.');
      return false;
    }
    if (decision === 'approve') {
      if (!designationId) {
        Alert.alert('Designation required', 'Please choose a designation.');
        return false;
      }
      if (!['Remote', 'Onsite'].includes(workModality)) {
        Alert.alert('Work modality required', 'Please choose Remote or On Site.');
        return false;
      }
      if (!['Male', 'Female', 'Other'].includes(gender)) {
        Alert.alert('Gender required', 'Please choose a gender.');
        return false;
      }
      if (!probationDate || !probationCompleteDate) {
        Alert.alert('Probation dates required', 'Please set probation start and complete dates.');
        return false;
      }
      if (probationCompleteDate < probationDate) {
        Alert.alert('Invalid dates', 'Probation complete must be on or after probation start.');
        return false;
      }
      if (probationSalary.trim() === '' || afterProbationSalary.trim() === '') {
        Alert.alert('Salary required', 'Please enter probation and after-probation salaries.');
        return false;
      }
    }
    return true;
  };

  const submit = async (decision: 'approve' | 'reject') => {
    if (!detail || !validateForm(decision)) return;

    const label = decision === 'approve' ? 'Approve & Send' : 'Reject';
    const ok = await confirmAction(
      `${label} offer`,
      decision === 'approve'
        ? `Approve this offer for ${detail.candidateName}? The candidate will receive a secure signing link.`
        : `Reject this offer for ${detail.candidateName}? The candidate will not be emailed.`,
      label,
    );
    if (!ok) return;

    setSubmitting(true);
    try {
      const res = await api.decideOfferLetterApproval({
        id: detail.id,
        decision,
        remarks: remarks.trim(),
        designationId,
        workModality,
        gender,
        probationDate,
        probationCompleteDate,
        probationSalary: probationSalary.trim(),
        afterProbationSalary: afterProbationSalary.trim(),
        ccEmployeeIds: ccEmployees.map((c) => c.id),
      });
      if (res.status === 'success') {
        Alert.alert('Done', res.message || 'Offer letter updated.', [
          { text: 'OK', onPress: () => closeOfferLetterApprovalScreen() },
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

  const openPdf = async () => {
    const url = detail?.pdfUrl?.trim();
    if (!url) {
      Alert.alert('Unavailable', 'Offer letter PDF is not available.');
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open', 'Unable to open the offer letter PDF.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title="Offer letter approval"
        right={
          <Pressable
            hitSlop={12}
            onPress={closeOfferLetterApprovalScreen}
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
                  <Text style={styles.empName}>{detail.candidateName || 'Candidate'}</Text>
                  <Text style={styles.code}>{detail.candidateEmail || '—'}</Text>
                </View>
                <Badge label={detail.statusLabel} tone={statusTone(detail.status)} />
              </View>
              <Text style={styles.metaLine}>Submitted by {detail.requestedBy || '—'}</Text>
              {detail.pdfUrl ? (
                <Pressable
                  onPress={openPdf}
                  style={({ pressed }) => [styles.pdfBtn, pressed && { opacity: 0.7 }]}
                >
                  <Ionicons name="document-text-outline" size={18} color={palette.primary} />
                  <Text style={styles.pdfText}>Open offer letter PDF</Text>
                  <Ionicons name="open-outline" size={16} color={palette.textFaint} />
                </Pressable>
              ) : null}
            </Card>

            <SectionHeader title="Offer details" />
            <Card>
              <View style={styles.formStack}>
                <View style={styles.fieldGroup}>
                  <FieldLabel text="Designation" />
                  <SelectRow
                    value={designationLabel}
                    disabled={!canAct || submitting}
                    onPress={() => setPicker('designation')}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <FieldLabel text="Work modality" />
                  <SelectRow
                    value={modalityLabel}
                    disabled={!canAct || submitting}
                    onPress={() => setPicker('modality')}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <FieldLabel text="Gender" />
                  <SelectRow
                    value={genderLabel}
                    disabled={!canAct || submitting}
                    onPress={() => setPicker('gender')}
                  />
                </View>

                <View style={styles.dateGroup}>
                  <DateField
                    label="Probation start"
                    value={probationDate || null}
                    onChange={setProbationDate}
                    disabled={!canAct || submitting}
                  />
                </View>

                <View style={styles.dateGroup}>
                  <DateField
                    label="Probation complete"
                    value={probationCompleteDate || null}
                    onChange={setProbationCompleteDate}
                    minDate={probationDate || null}
                    disabled={!canAct || submitting}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <FieldLabel text="Probation salary" />
                  <TextInput
                    style={styles.input}
                    value={probationSalary}
                    onChangeText={setProbationSalary}
                    keyboardType="decimal-pad"
                    editable={canAct && !submitting}
                    placeholder="0.00"
                    placeholderTextColor={palette.textFaint}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <FieldLabel text="After probation salary" />
                  <TextInput
                    style={styles.input}
                    value={afterProbationSalary}
                    onChangeText={setAfterProbationSalary}
                    keyboardType="decimal-pad"
                    editable={canAct && !submitting}
                    placeholder="0.00"
                    placeholderTextColor={palette.textFaint}
                  />
                </View>
              </View>
            </Card>

            <SectionHeader title="Email CC" />
            <Card>
              {canAct ? (
                <>
                  <View style={styles.searchBox}>
                    <Ionicons name="search-outline" size={18} color={palette.textMuted} />
                    <TextInput
                      style={styles.searchInput}
                      value={ccQuery}
                      onChangeText={setCcQuery}
                      placeholder="Search employees to CC…"
                      placeholderTextColor={palette.textFaint}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!submitting}
                    />
                    {ccSearching ? <ActivityIndicator size="small" color={palette.primary} /> : null}
                  </View>
                  {ccResults.length > 0 ? (
                    <View style={styles.ccDropdown}>
                      {ccResults.map((emp) => (
                        <Pressable
                          key={emp.id}
                          onPress={() => addCc(emp)}
                          style={({ pressed }) => [styles.ccOption, pressed && { opacity: 0.7 }]}
                        >
                          <Text style={styles.ccOptionName}>{emp.name}</Text>
                          <Text style={styles.ccOptionEmail}>{emp.email}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </>
              ) : null}

              {ccEmployees.length === 0 ? (
                <Text style={styles.ccEmpty}>No CC recipients selected</Text>
              ) : (
                <View style={styles.ccChips}>
                  {ccEmployees.map((emp) => (
                    <View key={emp.id} style={styles.ccChip}>
                      <View style={styles.flex}>
                        <Text style={styles.ccChipName}>{emp.name}</Text>
                        <Text style={styles.ccChipEmail}>{emp.email}</Text>
                      </View>
                      {canAct ? (
                        <Pressable hitSlop={8} onPress={() => removeCc(emp.id)}>
                          <Ionicons name="close-circle" size={18} color={palette.textFaint} />
                        </Pressable>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </Card>

            <SectionHeader title="Your decision" />
            <Card>
              <FieldLabel text="Remarks *" />
              <TextInput
                style={styles.remarks}
                value={remarks}
                onChangeText={setRemarks}
                placeholder="Required when approving or rejecting (minimum 10 characters)…"
                placeholderTextColor={palette.textFaint}
                multiline
                textAlignVertical="top"
                editable={canAct && !submitting}
              />
              <Text style={styles.help}>Minimum 10 characters.</Text>

              {canAct ? (
                <View style={styles.actions}>
                  <Pressable
                    onPress={closeOfferLetterApprovalScreen}
                    disabled={submitting}
                    style={({ pressed }) => [
                      styles.closeBtn,
                      (pressed || submitting) && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={styles.closeText}>Close</Text>
                  </Pressable>
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
                  <Button
                    label="Approve & Send"
                    onPress={() => submit('approve')}
                    loading={submitting}
                    disabled={submitting}
                    style={styles.actionBtn}
                  />
                </View>
              ) : (
                <Text style={styles.readonlyNote}>
                  This offer letter is no longer pending approval.
                </Text>
              )}
            </Card>
          </>
        ) : null}
      </ScrollView>

      <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPicker(null)}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <Text style={styles.modalTitle}>
              {picker === 'designation'
                ? 'Choose designation'
                : picker === 'gender'
                  ? 'Choose gender'
                  : 'Choose work modality'}
            </Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {(picker === 'designation'
                ? designations
                : picker === 'gender'
                  ? genderOptions
                  : modalityOptions
              ).map((opt) => {
                const selected =
                  picker === 'designation'
                    ? String(opt.id) === String(designationId)
                    : picker === 'gender'
                      ? String(opt.id) === String(gender)
                      : String(opt.id) === String(workModality);
                return (
                  <Pressable
                    key={String(opt.id)}
                    onPress={() => {
                      if (picker === 'designation') setDesignationId(Number(opt.id));
                      else if (picker === 'gender') setGender(String(opt.id));
                      else setWorkModality(String(opt.id));
                      setPicker(null);
                    }}
                    style={({ pressed }) => [
                      styles.modalRow,
                      selected && styles.modalRowSelected,
                      pressed && { opacity: 0.75 },
                    ]}
                  >
                    <Text style={[styles.modalRowText, selected && styles.modalRowTextSelected]}>
                      {opt.name}
                    </Text>
                    {selected ? (
                      <Ionicons name="checkmark" size={18} color={palette.primary} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function FieldLabel({ text }: { text: string }) {
  return <Text style={styles.fieldLabel}>{text}</Text>;
}

function SelectRow({
  value,
  onPress,
  disabled,
}: {
  value: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.selectRow,
        disabled && { opacity: 0.55 },
        pressed && !disabled && { opacity: 0.75 },
      ]}
    >
      <Text style={styles.selectValue} numberOfLines={1}>
        {value}
      </Text>
      <Ionicons name="chevron-down" size={18} color={palette.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  flex: { flex: 1 },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  center: { paddingVertical: spacing.huge, alignItems: 'center' },
  errorText: { ...typography.small, color: palette.danger, marginBottom: spacing.sm },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  retryText: { ...typography.small, color: palette.primary, fontFamily: fonts.bold },

  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  empName: { ...typography.h3, color: palette.text },
  code: { ...typography.small, color: palette.textMuted, marginTop: 2 },
  metaLine: { ...typography.small, color: palette.textMuted, marginTop: spacing.sm },

  pdfBtn: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  pdfText: {
    ...typography.small,
    color: palette.primary,
    fontFamily: fonts.bold,
    flex: 1,
  },

  fieldLabel: {
    ...typography.small,
    color: palette.textMuted,
    fontFamily: fonts.semibold,
    marginBottom: spacing.xs,
  },
  formStack: {
    gap: spacing.md,
  },
  fieldGroup: {},
  dateGroup: {
    // DateField includes its own marginBottom — cancel so formStack gap is even.
    marginBottom: -spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...typography.body,
    color: palette.text,
    backgroundColor: palette.surface,
  },
  selectRow: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: palette.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectValue: { ...typography.body, color: palette.text, flex: 1, fontFamily: fonts.medium },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: palette.surface,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: palette.text,
    fontFamily: fonts.medium,
    paddingVertical: 4,
  },
  ccDropdown: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  ccOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  ccOptionName: { ...typography.bodyBold, color: palette.text },
  ccOptionEmail: { ...typography.small, color: palette.textMuted, marginTop: 2 },
  ccEmpty: {
    ...typography.small,
    color: palette.textFaint,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  ccChips: { marginTop: spacing.md, gap: spacing.sm },
  ccChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: palette.primaryLight,
  },
  ccChipName: { ...typography.small, color: palette.text, fontFamily: fonts.bold },
  ccChipEmail: { ...typography.caption, color: palette.textMuted, textTransform: 'none' },

  remarks: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.body,
    color: palette.text,
    backgroundColor: palette.surface,
  },
  help: { ...typography.caption, color: palette.textFaint, marginTop: spacing.xs, textTransform: 'none' },

  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  actionBtn: { flex: 1 },
  closeBtn: {
    minWidth: 72,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
  },
  closeText: { ...typography.small, color: palette.text, fontFamily: fonts.bold },
  rejectBtn: {
    minWidth: 84,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectText: { ...typography.small, color: palette.white, fontFamily: fonts.bold },
  readonlyNote: { ...typography.small, color: palette.textMuted, textAlign: 'center', marginTop: spacing.md },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,20,25,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  modalTitle: { ...typography.h3, color: palette.text, marginBottom: spacing.md },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  modalRowSelected: { backgroundColor: palette.primaryLight },
  modalRowText: { ...typography.body, color: palette.text, flex: 1, paddingRight: spacing.md },
  modalRowTextSelected: { color: palette.primary, fontFamily: fonts.bold },
});
