import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import Card from '@/components/Card';
import KeyValueRow from '@/components/KeyValueRow';
import ScreenHeader from '@/components/ScreenHeader';
import SectionHeader from '@/components/SectionHeader';
import StateView from '@/components/StateView';
import { useAuth } from '@/context/AuthContext';
import { fonts, palette, radius, spacing, typography } from '@/theme';
import { HrEmployeeDetail, HrEmployeeTabKey } from '@/types';

/** Short rail labels — never truncate mid-word in the tab strip. */
const TAB_SHORT: Record<HrEmployeeTabKey, string> = {
  personal: 'Personal',
  work_detail: 'Work',
  attendance: 'Attendance',
  activity: 'Activity',
  documents: 'Documents',
  onboarding: 'Onboarding',
  lifecycle: 'Life cycle',
  leaves_wfh: 'Leaves',
  policies: 'Policies',
};

function formatDate(value: string) {
  if (!value) return '';
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function EmployeeDetailScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ employeeKey: string }>();
  const employeeKey = decodeURIComponent(String(params.employeeKey || ''));

  const [tab, setTab] = useState<HrEmployeeTabKey>('personal');
  const [detail, setDetail] = useState<HrEmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpMsg, setOtpMsg] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const autoSubmittedOtp = useRef<string | null>(null);

  const tabsScrollRef = useRef<ScrollView>(null);
  const tabOffsets = useRef<Record<string, number>>({});

  const visibleTabs = useMemo(
    () => (detail?.tabs ?? []).filter((t) => t.visible),
    [detail?.tabs],
  );

  useEffect(() => {
    const x = tabOffsets.current[tab];
    if (x == null || !tabsScrollRef.current) return;
    tabsScrollRef.current.scrollTo({ x: Math.max(0, x - 24), animated: true });
  }, [tab, visibleTabs.length]);

  const load = useCallback(
    async (nextTab: HrEmployeeTabKey, mode: 'initial' | 'refresh' | 'tab' = 'initial') => {
      if (!employeeKey) {
        setError('Missing employee key.');
        setLoading(false);
        return;
      }
      if (mode === 'refresh') setRefreshing(true);
      else if (mode === 'tab') setTabLoading(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await api.getEmployeeDetail(employeeKey, nextTab);
        if (res.status === 'success' && res.data) {
          setDetail(res.data);
          setTab(res.data.tab || nextTab);
        } else {
          if (mode === 'initial') setDetail(null);
          setError(res.message || 'Could not load employee.');
        }
      } catch (err: any) {
        if (mode === 'initial') setDetail(null);
        setError(err?.message || 'Network error.');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setTabLoading(false);
      }
    },
    [employeeKey],
  );

  useEffect(() => {
    load('personal', 'initial');
  }, [load]);

  const onSelectTab = (key: HrEmployeeTabKey) => {
    if (key === tab) return;
    setTab(key);
    load(key, 'tab');
  };

  const startVerify = async () => {
    setOtpOpen(true);
    setOtp('');
    autoSubmittedOtp.current = null;
    setOtpMsg(null);
    setOtpSent(false);
    if (!user?.email) {
      setOtpMsg('Your account email is required to send a verification code.');
      return;
    }
    setOtpBusy(true);
    try {
      const res = await api.sendOtp(user.email);
      if (res.status === 'success') {
        setOtpSent(true);
        setOtpMsg(
          res.data?.channel === 'slack'
            ? 'Code sent to your Slack.'
            : 'Code sent to your email.',
        );
      } else {
        setOtpMsg(res.message || 'Could not send OTP.');
      }
    } catch (err: any) {
      setOtpMsg(err?.message || 'Could not send OTP.');
    } finally {
      setOtpBusy(false);
    }
  };

  const confirmOtp = useCallback(async (code: string) => {
    if (code.trim().length < 6 || !employeeKey) return;
    setOtpBusy(true);
    setOtpMsg(null);
    try {
      const res = await api.revealEmployeeFinance(employeeKey, code);
      if (res.status === 'success' && res.data?.workDetail) {
        setDetail((prev) =>
          prev
            ? {
                ...prev,
                tab: 'work_detail',
                workDetail: res.data!.workDetail,
              }
            : prev,
        );
        setTab('work_detail');
        setOtpOpen(false);
        setOtp('');
        autoSubmittedOtp.current = null;
      } else {
        setOtpMsg(res.message || 'Invalid or expired OTP.');
      }
    } catch (err: any) {
      setOtpMsg(err?.message || 'Verification failed.');
    } finally {
      setOtpBusy(false);
    }
  }, [employeeKey]);

  useEffect(() => {
    if (!otpOpen) return;
    if (otp.length < 6) {
      autoSubmittedOtp.current = null;
      return;
    }
    if (otpBusy || autoSubmittedOtp.current === otp) return;
    autoSubmittedOtp.current = otp;
    confirmOtp(otp);
  }, [otp, otpOpen, otpBusy, confirmOtp]);

  const header = detail?.header;
  const title = header?.name || 'Employee';

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={title}
        subtitle={
          [header?.employeeCode, header?.designation].filter(Boolean).join(' · ') || 'Employee profile'
        }
        right={
          <Pressable hitSlop={10} onPress={() => router.back()}>
            <Ionicons name="close" size={22} color={palette.onInk} />
          </Pressable>
        }
      />

      {loading && !detail ? (
        <StateView loading />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxxl }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(tab, 'refresh')}
              tintColor={palette.primary}
            />
          }
        >
          {error && !detail ? (
            <StateView error={error} onRetry={() => load('personal', 'initial')} />
          ) : detail ? (
            <>
              {error ? (
                <Card padded style={styles.warn}>
                  <Text style={styles.warnText}>{error}</Text>
                </Card>
              ) : null}

              <Card padded style={styles.hero}>
                <View style={styles.heroRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(header?.name || '?')
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((p) => p[0]?.toUpperCase())
                        .join('') || '?'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.heroName}>{header?.name || '—'}</Text>
                    <Text style={styles.heroMeta}>
                      {[header?.department, header?.email].filter(Boolean).join(' · ') || '—'}
                    </Text>
                    {header?.workStatus || header?.status ? (
                      <View style={styles.statusPill}>
                        <Text style={styles.statusText}>
                          {header?.workStatus || header?.status}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Card>

              <View style={styles.tabRail}>
                <ScrollView
                  ref={tabsScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.tabs}
                >
                  {visibleTabs.map((t) => {
                    const active = t.key === tab;
                    const label = TAB_SHORT[t.key] || t.label;
                    return (
                      <Pressable
                        key={t.key}
                        onPress={() => onSelectTab(t.key)}
                        onLayout={(e) => {
                          tabOffsets.current[t.key] = e.nativeEvent.layout.x;
                        }}
                        style={({ pressed }) => [styles.tabItem, pressed && { opacity: 0.7 }]}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: active }}
                        hitSlop={6}
                      >
                        <Text style={[styles.tabLabel, active && styles.tabLabelActive]} numberOfLines={1}>
                          {label}
                        </Text>
                        <View style={[styles.tabIndicator, active && styles.tabIndicatorActive]} />
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {tabLoading ? (
                <View style={styles.tabLoading}>
                  <ActivityIndicator color={palette.primary} />
                </View>
              ) : (
                <View style={styles.tabBody}>
                  {tab === 'personal' && detail.personal ? (
                    <PersonalTab data={detail.personal} />
                  ) : null}
                  {tab === 'work_detail' && detail.workDetail ? (
                    <WorkDetailTab data={detail.workDetail} onVerify={startVerify} />
                  ) : null}
                  {tab === 'attendance' && detail.attendance ? (
                    <AttendanceTab days={detail.attendance.days} />
                  ) : null}
                  {tab === 'activity' && detail.activity ? (
                    <ActivityTab activity={detail.activity} />
                  ) : null}
                  {tab === 'documents' && detail.documents ? (
                    <DocumentsTab items={detail.documents.items} />
                  ) : null}
                  {tab === 'onboarding' && detail.onboarding ? (
                    <OnboardingTab data={detail.onboarding} />
                  ) : null}
                  {tab === 'lifecycle' && detail.lifecycle ? (
                    <LifecycleTab current={detail.lifecycle.current} />
                  ) : null}
                  {tab === 'leaves_wfh' && detail.leaves ? (
                    <LeavesTab leaves={detail.leaves} />
                  ) : null}
                  {tab === 'policies' && detail.policies ? (
                    <PoliciesTab items={detail.policies.items} />
                  ) : null}
                </View>
              )}
            </>
          ) : null}
        </ScrollView>
      )}

      <Modal visible={otpOpen} transparent animationType="fade" onRequestClose={() => setOtpOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + spacing.lg }]}>
            <Text style={styles.modalTitle}>Verify to view finance</Text>
            <Text style={styles.modalSub}>
              Enter the one-time code sent to your Slack or email to unlock salary and bank details.
            </Text>
            <TextInput
              style={styles.otpInput}
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="6-digit code"
              placeholderTextColor={palette.textFaint}
              editable={!otpBusy}
              autoFocus
            />
            {otpBusy && otp.length === 6 ? (
              <ActivityIndicator style={{ marginTop: spacing.md }} color={palette.primary} />
            ) : otpMsg ? (
              <Text style={styles.otpMsg}>{otpMsg}</Text>
            ) : null}
            <Pressable
              style={styles.secondaryBtn}
              disabled={otpBusy}
              onPress={startVerify}
            >
              <Text style={styles.secondaryBtnText}>{otpSent ? 'Resend code' : 'Send code'}</Text>
            </Pressable>
            <Pressable
              style={styles.cancelBtn}
              onPress={() => {
                setOtpOpen(false);
                autoSubmittedOtp.current = null;
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function PersonalTab({ data }: { data: NonNullable<HrEmployeeDetail['personal']> }) {
  return (
    <>
      <SectionHeader title="Identity" tight />
      <Card padded>
        <KeyValueRow label="Full name" value={data.identity.name} />
        <KeyValueRow label="Work email" value={data.identity.email} />
        <KeyValueRow label="Phone" value={data.identity.phone} />
        <KeyValueRow label="Biometric ID" value={data.identity.biometricId} />
        <KeyValueRow label="Status" value={data.identity.status} last />
      </Card>

      <SectionHeader title="Employment" />
      <Card padded>
        <KeyValueRow label="Role" value={data.employment.role} />
        <KeyValueRow label="Department" value={data.employment.department} />
        {data.employment.subDepartment ? (
          <KeyValueRow label="Sub-department" value={data.employment.subDepartment} />
        ) : null}
        <KeyValueRow label="Company" value={data.employment.companyName} />
        <KeyValueRow label="Work modality" value={data.employment.workModality} />
        <KeyValueRow label="Joined" value={formatDate(data.employment.joinDate)} />
        <KeyValueRow label="Reports to" value={data.employment.manager} />
        {data.employment.office ? <KeyValueRow label="Office" value={data.employment.office} /> : null}
        <KeyValueRow label="Timezone" value={data.employment.timezone} last />
      </Card>

      <SectionHeader title="Personal" />
      <Card padded>
        <KeyValueRow label="Date of birth" value={formatDate(data.personal.dob)} />
        <KeyValueRow label="Gender" value={data.personal.gender} />
        <KeyValueRow label="Marital status" value={data.personal.maritalStatus} />
        <KeyValueRow label="Blood group" value={data.personal.bloodGroup} />
        <KeyValueRow label="Nationality" value={data.personal.nationality} />
        <KeyValueRow label="Country" value={data.personal.country} />
        <KeyValueRow label="Personal email" value={data.personal.personalEmail} />
        <KeyValueRow label="CNIC / SSN" value={data.personal.cnicSsn} />
        <KeyValueRow label="Address" value={data.personal.address} last />
      </Card>

      <SectionHeader title="Emergency contacts" />
      {!data.emergencyContacts.length ? (
        <StateView empty emptyIcon="people-outline" emptyTitle="No contacts" emptyText="" />
      ) : (
        data.emergencyContacts.map((c) => (
          <Card key={c.id} padded style={styles.block}>
            <Text style={styles.blockTitle}>{c.name || 'Contact'}</Text>
            <KeyValueRow label="Relationship" value={c.relationship} />
            <KeyValueRow label="Phone" value={c.phone} last />
          </Card>
        ))
      )}
    </>
  );
}

function WorkDetailTab({
  data,
  onVerify,
}: {
  data: NonNullable<HrEmployeeDetail['workDetail']>;
  onVerify: () => void;
}) {
  return (
    <>
      <SectionHeader
        title="Financial information"
        tight
        actionLabel={data.financeMasked ? 'Verify' : undefined}
        onAction={data.financeMasked ? onVerify : undefined}
      />
      {!data.financeMasked ? (
        <View style={styles.unlockedPill}>
          <Ionicons name="checkmark-circle" size={14} color={palette.successDark} />
          <Text style={styles.unlockedText}>Unlocked for 10 minutes</Text>
        </View>
      ) : null}
      <Card padded>
        {data.fields.map((f, i) => (
          <KeyValueRow
            key={f.key}
            label={f.label}
            value={f.value}
            last={i === data.fields.length - 1}
          />
        ))}
      </Card>
      {data.financeMasked ? (
        <Text style={styles.hint}>Salary and bank fields stay masked until you verify with OTP.</Text>
      ) : null}
    </>
  );
}

function AttendanceTab({ days }: { days: NonNullable<HrEmployeeDetail['attendance']>['days'] }) {
  if (!days.length) {
    return (
      <StateView
        empty
        emptyIcon="calendar-outline"
        emptyTitle="No attendance"
        emptyText="No attendance records in the last 30 days."
      />
    );
  }
  return (
    <>
      <SectionHeader title="Last 30 days" tight />
      {days.map((d, i) => (
        <Card key={`${d.date}-${i}`} padded style={styles.block}>
          <Text style={styles.blockTitle}>{formatDate(d.date)}</Text>
          <KeyValueRow label="Check in" value={d.checkIn} />
          <KeyValueRow label="Check out" value={d.checkOut} />
          <KeyValueRow
            label="Hours"
            value={
              d.hoursDecimal != null && !Number.isNaN(d.hoursDecimal)
                ? `${d.hoursDecimal} h`
                : d.workingHours
            }
          />
          <KeyValueRow label="Late" value={d.late || '—'} last />
        </Card>
      ))}
    </>
  );
}

function ActivityTab({ activity }: { activity: NonNullable<HrEmployeeDetail['activity']> }) {
  return (
    <>
      <SectionHeader title="System logs" tight />
      {!activity.systemLogs.length ? (
        <StateView empty emptyIcon="pulse-outline" emptyTitle="No system logs" emptyText="" />
      ) : (
        activity.systemLogs.map((l) => (
          <Card key={l.id} padded style={styles.block}>
            <Text style={styles.blockTitle}>{l.title || 'Log'}</Text>
            {l.description ? <Text style={styles.blockBody}>{l.description}</Text> : null}
            <Text style={styles.blockMeta}>{l.date}</Text>
          </Card>
        ))
      )}
      <SectionHeader title="Time Doctor" />
      {!activity.timeDocs.length ? (
        <StateView empty emptyIcon="time-outline" emptyTitle="No Time Doctor logs" emptyText="" />
      ) : (
        activity.timeDocs.map((l) => (
          <Card key={l.id} padded style={styles.block}>
            <Text style={styles.blockTitle}>{formatDate(l.logDate) || l.name}</Text>
            <KeyValueRow label="Tracked" value={l.trackedTime} />
            <KeyValueRow label="Start" value={l.startTime} />
            <KeyValueRow label="End" value={l.endTime} last />
          </Card>
        ))
      )}
    </>
  );
}

function DocumentsTab({ items }: { items: NonNullable<HrEmployeeDetail['documents']>['items'] }) {
  if (!items.length) {
    return (
      <StateView
        empty
        emptyIcon="document-outline"
        emptyTitle="No documents"
        emptyText="No documents uploaded for this employee."
      />
    );
  }
  return (
    <>
      <SectionHeader title={`Documents (${items.length})`} tight />
      {items.map((d) => (
        <Card key={d.id} padded style={styles.block}>
          <Text style={styles.blockTitle}>{d.type || 'Document'}</Text>
          {d.description ? <Text style={styles.blockBody}>{d.description}</Text> : null}
          <KeyValueRow label="Issued" value={formatDate(d.issueDate)} />
          <KeyValueRow label="Expires" value={formatDate(d.expiryDate)} />
          <KeyValueRow label="Signed" value={d.signedAt ? formatDate(d.signedAt) : '—'} last />
        </Card>
      ))}
    </>
  );
}

function OnboardingTab({ data }: { data: NonNullable<HrEmployeeDetail['onboarding']> }) {
  const sections: { title: string; lists: typeof data.onboarding }[] = [
    { title: 'Pre-onboarding', lists: data.preOnboarding },
    { title: 'Onboarding', lists: data.onboarding },
    { title: 'Offboarding', lists: data.offboarding },
    { title: 'Documents checklist', lists: data.documents },
  ];
  const any = sections.some((s) => s.lists.length > 0);
  if (!any) {
    return (
      <StateView
        empty
        emptyIcon="checkbox-outline"
        emptyTitle="No checklists"
        emptyText="No onboarding or offboarding checklists yet."
      />
    );
  }
  return (
    <>
      {sections.map((s) =>
        s.lists.length ? (
          <View key={s.title}>
            <SectionHeader title={s.title} />
            {s.lists.map((c) => (
              <Card key={c.id} padded style={styles.block}>
                <Text style={styles.blockTitle}>
                  {c.done}/{c.total} complete
                </Text>
                {c.items.slice(0, 8).map((it) => (
                  <View key={it.id} style={styles.checkRow}>
                    <Ionicons
                      name={it.done ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={it.done ? palette.success : palette.textFaint}
                    />
                    <Text style={styles.checkText} numberOfLines={2}>
                      {it.title}
                    </Text>
                  </View>
                ))}
                {c.items.length > 8 ? (
                  <Text style={styles.blockMeta}>+{c.items.length - 8} more items</Text>
                ) : null}
              </Card>
            ))}
          </View>
        ) : null,
      )}
    </>
  );
}

function LifecycleTab({
  current,
}: {
  current: NonNullable<HrEmployeeDetail['lifecycle']>['current'];
}) {
  return (
    <>
      <SectionHeader title="Current state" tight />
      <Card padded>
        <KeyValueRow label="Assignment" value={current.assignment} />
        <KeyValueRow label="Lifecycle" value={current.lifecycle} />
        <KeyValueRow label="Country" value={current.country} />
        <KeyValueRow label="Office" value={current.office} />
        <KeyValueRow label="Work modality" value={current.workModality} />
        <KeyValueRow label="Hire date" value={formatDate(current.hireDate)} />
        <KeyValueRow label="Exit date" value={formatDate(current.exitDate)} last />
      </Card>
    </>
  );
}

function LeavesTab({ leaves }: { leaves: NonNullable<HrEmployeeDetail['leaves']> }) {
  const unit = leaves.summary.unitLabel || 'Days';
  return (
    <>
      <SectionHeader title="Balance" tight />
      <Card padded>
        <KeyValueRow label={`Accrued (${unit})`} value={String(leaves.summary.accrued)} />
        <KeyValueRow label={`Consumed (${unit})`} value={String(leaves.summary.consumed)} />
        <KeyValueRow label={`Available (${unit})`} value={String(leaves.summary.available)} last />
      </Card>
      <SectionHeader title="Recent requests" />
      {!leaves.requests.length ? (
        <StateView empty emptyIcon="airplane-outline" emptyTitle="No leave requests" emptyText="" />
      ) : (
        leaves.requests.map((r) => (
          <Card key={r.id} padded style={styles.block}>
            <Text style={styles.blockTitle}>{r.type}</Text>
            <KeyValueRow label="From" value={formatDate(r.startDate)} />
            <KeyValueRow label="To" value={formatDate(r.endDate)} />
            <KeyValueRow label="Status" value={r.status} last />
          </Card>
        ))
      )}
    </>
  );
}

function PoliciesTab({ items }: { items: NonNullable<HrEmployeeDetail['policies']>['items'] }) {
  if (!items.length) {
    return (
      <StateView
        empty
        emptyIcon="shield-outline"
        emptyTitle="No policies"
        emptyText="No policies assigned to this employee."
      />
    );
  }
  return (
    <>
      <SectionHeader title="Policies & handbooks" tight />
      {items.map((p) => (
        <Card key={p.ackId} padded style={styles.block}>
          <Text style={styles.blockTitle}>{p.title}</Text>
          <KeyValueRow label="Category" value={p.category} />
          <KeyValueRow label="Version" value={p.versionNumber} />
          <KeyValueRow label="Status" value={p.status} last />
        </Card>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  warn: { margin: spacing.lg, backgroundColor: palette.warningLight },
  warnText: { ...typography.small, color: palette.warningDark },
  hero: { marginHorizontal: spacing.lg, marginTop: spacing.lg },
  heroRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typography.h3, color: palette.primaryDark, fontFamily: fonts.bold },
  heroName: { ...typography.h3, color: palette.text },
  heroMeta: { ...typography.small, color: palette.textMuted, marginTop: 2 },
  statusPill: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    backgroundColor: palette.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusText: { ...typography.caption, color: palette.successDark, textTransform: 'none' },
  tabRail: {
    marginTop: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.borderStrong,
    backgroundColor: palette.background,
  },
  tabs: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    gap: spacing.xl,
  },
  tabItem: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    minWidth: 52,
  },
  tabLabel: {
    ...typography.small,
    color: palette.textFaint,
    fontFamily: fonts.medium,
    letterSpacing: -0.1,
  },
  tabLabelActive: {
    color: palette.ink,
    fontFamily: fonts.bold,
  },
  tabIndicator: {
    marginTop: spacing.sm,
    height: 3,
    width: '100%',
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  tabIndicatorActive: {
    backgroundColor: palette.primary,
  },
  tabLoading: { paddingVertical: spacing.xxl, alignItems: 'center' },
  tabBody: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  unlockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  unlockedText: { ...typography.caption, color: palette.successDark, textTransform: 'none' },
  hint: { ...typography.caption, color: palette.textFaint, marginTop: spacing.sm, textTransform: 'none' },
  block: { marginBottom: spacing.sm },
  blockTitle: { ...typography.bodyBold, color: palette.text, marginBottom: spacing.sm },
  blockBody: { ...typography.small, color: palette.textMuted, marginBottom: spacing.sm },
  blockMeta: { ...typography.caption, color: palette.textFaint, marginTop: spacing.sm, textTransform: 'none' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  checkText: { ...typography.small, color: palette.text, flex: 1 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,14,39,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
  },
  modalTitle: { ...typography.h3, color: palette.text },
  modalSub: { ...typography.small, color: palette.textMuted, marginTop: spacing.sm, marginBottom: spacing.lg },
  otpInput: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.h2,
    letterSpacing: 6,
    textAlign: 'center',
    color: palette.text,
    fontFamily: fonts.bold,
  },
  otpMsg: { ...typography.small, color: palette.textMuted, marginTop: spacing.md, textAlign: 'center' },
  primaryBtn: {
    marginTop: spacing.lg,
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  primaryBtnText: { ...typography.bodyBold, color: palette.white },
  secondaryBtn: { marginTop: spacing.md, alignItems: 'center', paddingVertical: spacing.sm },
  secondaryBtnText: { ...typography.bodyBold, color: palette.primary },
  cancelBtn: { marginTop: spacing.sm, alignItems: 'center', paddingVertical: spacing.sm },
  cancelText: { ...typography.small, color: palette.textMuted },
});
