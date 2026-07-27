import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import Card from '@/components/Card';
import DateField from '@/components/DateField';
import ScreenHeader from '@/components/ScreenHeader';
import { api } from '@/api/client';
import { palette, radius, spacing, typography } from '@/theme';
import { LeaveType } from '@/types';

const REASON_MIN = 10;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toYmd(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(ymd: string, days: number) {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  date.setDate(date.getDate() + days);
  return toYmd(date);
}

function advanceNoticeMessage(days: number) {
  if (days === 14) return 'Requires at least 2 weeks (14 days) advance notice.';
  return `Requires at least ${days} day${days === 1 ? '' : 's'} advance notice.`;
}

export default function LeaveRequestScreen() {
  const insets = useSafeAreaInsets();

  const [types, setTypes] = useState<LeaveType[] | null>(null);
  const [typesError, setTypesError] = useState<string | null>(null);
  const [loadingTypes, setLoadingTypes] = useState(true);

  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [typeId, setTypeId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api.getLeaveTypes().then((res) => {
      if (!alive) return;
      setLoadingTypes(false);
      if (res.status === 'success' && res.data) {
        setTypes(res.data.types);
      } else {
        setTypesError(res.message || 'Could not load leave types.');
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const selectedType = useMemo(() => types?.find((t) => t.id === typeId) ?? null, [types, typeId]);

  const today = useMemo(() => toYmd(new Date()), []);
  const minStartDate = useMemo(() => {
    if (!selectedType) return today;
    const notice = selectedType.unrestricted ? 0 : selectedType.advanceNoticeDays;
    return notice > 0 ? addDays(today, notice) : today;
  }, [selectedType, today]);
  const minEndDate = startDate || minStartDate;

  // Reset dates that fall before the newly-selected type's minimum start date.
  useEffect(() => {
    if (startDate && startDate < minStartDate) {
      setStartDate(null);
      setEndDate(null);
    }
  }, [minStartDate, startDate]);

  const reasonLen = reason.trim().length;
  const reasonOk = reasonLen >= REASON_MIN;

  const canSubmit =
    !!selectedType && !!startDate && !!endDate && endDate >= startDate && reasonOk && !submitting;

  const onSubmit = async () => {
    if (!selectedType || !startDate || !endDate) {
      setError('Please select a leave type and date range.');
      return;
    }
    if (endDate < startDate) {
      setError('End date cannot be earlier than start date.');
      return;
    }
    if (!reasonOk) {
      setError(`Please enter at least ${REASON_MIN} characters in the reason.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await api.createLeaveRequest({
      leaveTypeId: selectedType.id,
      startDate,
      endDate,
      reason: reason.trim(),
    });
    setSubmitting(false);
    if (res.status === 'success') {
      setSuccess(res.message || 'Leave request submitted.');
      setTimeout(() => router.back(), 700);
    } else {
      setError(res.message || 'Could not submit the leave request.');
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Request leave"
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {loadingTypes ? (
            <View style={styles.center}>
              <ActivityIndicator color={palette.primary} />
            </View>
          ) : typesError ? (
            <Card>
              <Text style={styles.errorInline}>{typesError}</Text>
            </Card>
          ) : (
            <>
              <Card>
                <Text style={styles.label}>Leave type</Text>
                <Pressable style={styles.selectField} onPress={() => setTypePickerOpen((o) => !o)}>
                  <Text style={[styles.selectValue, !selectedType && styles.placeholder]}>
                    {selectedType ? selectedType.name : 'Choose...'}
                  </Text>
                  <Ionicons name={typePickerOpen ? 'chevron-up' : 'chevron-down'} size={16} color={palette.textFaint} />
                </Pressable>

                {typePickerOpen && (
                  <View style={styles.optionList}>
                    {(types || []).map((t) => (
                      <Pressable
                        key={t.id}
                        style={styles.optionRow}
                        onPress={() => {
                          setTypeId(t.id);
                          setTypePickerOpen(false);
                        }}
                      >
                        <Text style={styles.optionText}>{t.name}</Text>
                        {t.id === typeId ? <Ionicons name="checkmark" size={18} color={palette.primary} /> : null}
                      </Pressable>
                    ))}
                  </View>
                )}

                {selectedType && (
                  <View style={styles.badgeRow}>
                    <Badge label={selectedType.paid ? 'Paid' : 'Unpaid'} tone={selectedType.paid ? 'success' : 'neutral'} />
                    {selectedType.halfDay ? <Badge label="Half-day" tone="info" /> : null}
                    {selectedType.unrestricted ? <Badge label="Unrestricted" tone="primary" /> : null}
                    {selectedType.maxDays ? <Badge label={`Max ${selectedType.maxDays}/request`} tone="neutral" /> : null}
                    {selectedType.maxTotalPerYear ? <Badge label={`Max ${selectedType.maxTotalPerYear}/yr`} tone="neutral" /> : null}
                  </View>
                )}
              </Card>

              <Card style={styles.dateCard}>
                <DateField
                  label="Start date"
                  value={startDate}
                  onChange={setStartDate}
                  minDate={minStartDate}
                  disabled={!selectedType}
                />
                <DateField
                  label="End date"
                  value={endDate}
                  onChange={setEndDate}
                  minDate={minEndDate}
                  disabled={!selectedType || !startDate}
                />
                {selectedType && !selectedType.unrestricted && selectedType.advanceNoticeDays > 0 && (
                  <Text style={styles.hint}>{advanceNoticeMessage(selectedType.advanceNoticeDays)}</Text>
                )}
              </Card>

              <Card style={styles.dateCard}>
                <Text style={styles.label}>Reason</Text>
                <TextInput
                  style={styles.textarea}
                  placeholder="Briefly describe the reason for your leave"
                  placeholderTextColor={palette.textFaint}
                  multiline
                  numberOfLines={5}
                  value={reason}
                  onChangeText={setReason}
                />
                <Text style={[styles.charCount, reasonOk && styles.charCountOk]}>
                  {reasonLen} / {REASON_MIN} characters
                </Text>
              </Card>

              {error ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color={palette.danger} />
                  <Text style={styles.errorBannerText}>{error}</Text>
                </View>
              ) : null}

              {success ? (
                <View style={styles.successBanner}>
                  <Ionicons name="checkmark-circle" size={16} color={palette.success} />
                  <Text style={styles.successBannerText}>{success}</Text>
                </View>
              ) : null}

              <Button
                label="Submit request"
                onPress={onSubmit}
                loading={submitting}
                disabled={!canSubmit}
                style={{ marginTop: spacing.lg }}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.lg },
  center: { paddingVertical: spacing.xxxl, alignItems: 'center' },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  label: { ...typography.small, color: palette.textMuted, fontWeight: '600', marginBottom: spacing.xs },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  selectValue: { ...typography.body, color: palette.text },
  placeholder: { color: palette.textFaint },
  optionList: { marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: palette.border },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  optionText: { ...typography.body, color: palette.text },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md },
  dateCard: { gap: 0 },
  hint: { ...typography.small, color: palette.textMuted, marginTop: spacing.xs },
  textarea: {
    ...typography.body,
    color: palette.text,
    backgroundColor: palette.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 110,
    textAlignVertical: 'top',
  },
  charCount: { ...typography.caption, color: palette.dangerDark, textTransform: 'none', marginTop: spacing.xs, textAlign: 'right' },
  charCountOk: { color: palette.successDark },
  errorInline: { ...typography.small, color: palette.danger },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.dangerLight,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorBannerText: { ...typography.small, color: palette.danger, flex: 1 },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.successLight,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  successBannerText: { ...typography.small, color: palette.successDark, flex: 1 },
});
