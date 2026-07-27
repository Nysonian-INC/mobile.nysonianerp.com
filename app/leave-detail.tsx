import { Ionicons } from '@expo/vector-icons';
import { Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Badge, { BadgeTone } from '@/components/Badge';
import Card from '@/components/Card';
import ScreenHeader from '@/components/ScreenHeader';
import SectionHeader from '@/components/SectionHeader';
import { api } from '@/api/client';
import { formatDate, formatDateTime } from '@/lib/format';
import { palette, radius, spacing, typography } from '@/theme';
import { LeaveRequestDetail } from '@/types';

function statusTone(status: LeaveRequestDetail['status']): BadgeTone {
  return status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'warning';
}

export default function LeaveDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [detail, setDetail] = useState<LeaveRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const leaveId = Number(id);
    if (!leaveId) {
      setLoading(false);
      setError('Invalid leave request.');
      return;
    }
    api.getLeaveRequestDetail(leaveId).then((res) => {
      if (!alive) return;
      setLoading(false);
      if (res.status === 'success' && res.data) setDetail(res.data);
      else setError(res.message || 'Could not load the leave request.');
    });
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Leave details"
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
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={palette.primary} />
          </View>
        ) : error ? (
          <Card>
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        ) : detail ? (
          <>
            <Card raised>
              <View style={styles.topRow}>
                <View style={styles.flex}>
                  <Text style={styles.type}>{detail.type}</Text>
                  <Text style={styles.code}>{detail.code}</Text>
                </View>
                <Badge label={detail.statusLabel} tone={statusTone(detail.status)} />
              </View>

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
              <DetailRow label="Manager" value={detail.manager || '-'} />
              <DetailRow label="Applied on" value={formatDate(detail.appliedOn) || '-'} last />
            </Card>

            <SectionHeader title="Reason" tight />
            <Card>
              <Text style={styles.reason}>{detail.reason || '-'}</Text>
            </Card>

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
                    style={[styles.remark, i < detail.remarks.length - 1 && styles.remarkDivider]}
                  >
                    <View style={styles.remarkHead}>
                      <Badge label={r.author} tone={r.role === 'hr' ? 'success' : 'primary'} />
                      {r.status ? (
                        <Text
                          style={[
                            styles.remarkStatus,
                            r.status.includes('reject') || r.status.includes('declin')
                              ? styles.remarkStatusBad
                              : r.status.includes('approv')
                                ? styles.remarkStatusGood
                                : null,
                          ]}
                        >
                          {r.status}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.remarkText}>{r.text}</Text>
                    {r.date ? <Text style={styles.remarkDate}>{formatDateTime(r.date)}</Text> : null}
                  </View>
                ))
              )}
            </Card>

            {detail.attachments.length > 0 && (
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
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.detailRow, !last && styles.detailRowDivider]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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

  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  type: { ...typography.h3, color: palette.text },
  code: { ...typography.caption, color: palette.textFaint, textTransform: 'none', marginTop: 2 },

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
  },
  detailRowDivider: { borderBottomWidth: 1, borderBottomColor: palette.border },
  detailLabel: { ...typography.small, color: palette.textMuted },
  detailValue: { ...typography.bodyBold, color: palette.text },

  emptyRemarks: { ...typography.small, color: palette.textFaint },
  remark: { paddingVertical: spacing.md },
  remarkDivider: { borderBottomWidth: 1, borderBottomColor: palette.border },
  remarkHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  remarkStatus: { ...typography.caption, color: palette.textMuted, textTransform: 'capitalize' },
  remarkStatusGood: { color: palette.successDark },
  remarkStatusBad: { color: palette.dangerDark },
  remarkText: { ...typography.body, color: palette.text, lineHeight: 21 },
  remarkDate: { ...typography.caption, color: palette.textFaint, textTransform: 'none', marginTop: spacing.xs },

  attachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  attachmentText: { ...typography.body, color: palette.text, flex: 1 },
});
