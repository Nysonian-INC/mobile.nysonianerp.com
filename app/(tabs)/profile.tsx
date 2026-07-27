import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '@/components/Avatar';
import Card from '@/components/Card';
import SectionHeader from '@/components/SectionHeader';
import { useAuth } from '@/context/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { confirmAction } from '@/lib/confirm';
import { formatTenure } from '@/lib/format';
import { GRADIENT_BR, GRADIENT_TL } from '@/theme/gradients';
import { palette, radius, spacing, typography } from '@/theme';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { data, loading } = useDashboard();

  const employee = data?.employee;
  const name = employee?.name || user?.name || 'Employee';
  const canFindEmployees = Boolean(data?.permissions?.employeesList);
  const canLiveCameras = Boolean(data?.permissions?.liveCameras);
  const canLeaveApprovals = Boolean(data?.permissions?.leaveApprovals);
  const canOfferLetterApprovals = Boolean(data?.permissions?.offerLetterApprovals);
  const canLifecycleApprovals = Boolean(data?.permissions?.lifecycleApprovals);
  const canProbationApprovals = Boolean(data?.permissions?.probationApprovals);
  const canItDashboard = Boolean(data?.permissions?.itDashboard);

  const accountMenu = useMemo(
    () =>
      [
        { icon: 'person-outline' as const, label: 'Personal information', route: '/profile-personal-info' },
        { icon: 'git-network-outline' as const, label: 'Organogram', route: '/organogram' },
        { icon: 'document-text-outline' as const, label: 'Documents & policies', route: '/profile-documents' },
        { icon: 'hardware-chip-outline' as const, label: 'My IT assets', route: '/assets' },
        { icon: 'notifications-outline' as const, label: 'Notifications', route: '/profile-notifications' },
        { icon: 'help-circle-outline' as const, label: 'Help & support', route: '/profile-help-support' },
      ] as const,
    [],
  );

  const advanceMenu = useMemo(
    () =>
      [
        ...(canLeaveApprovals
          ? [{ icon: 'checkbox-outline' as const, label: 'Leave approvals', route: '/leave-approvals' }]
          : []),
        ...(canOfferLetterApprovals
          ? [{ icon: 'mail-open-outline' as const, label: 'Offer letter approvals', route: '/offer-letter-approvals' }]
          : []),
        ...(canLifecycleApprovals
          ? [{ icon: 'swap-horizontal-outline' as const, label: 'Lifecycle approvals', route: '/lifecycle-approvals' }]
          : []),
        ...(canProbationApprovals
          ? [{ icon: 'hourglass-outline' as const, label: 'Probation approvals', route: '/probation-approvals' }]
          : []),
        ...(canFindEmployees
          ? [{ icon: 'search-outline' as const, label: 'Find employees', route: '/employees/search' }]
          : []),
        ...(canLiveCameras
          ? [{ icon: 'videocam-outline' as const, label: 'Live cameras', route: '/ipcam' }]
          : []),
        ...(canItDashboard
          ? [{ icon: 'finger-print-outline' as const, label: 'Biometric machines', route: '/biometric-machines' }]
          : []),
      ].sort((a, b) => a.label.localeCompare(b.label)),
    [canLeaveApprovals, canOfferLetterApprovals, canLifecycleApprovals, canProbationApprovals, canFindEmployees, canLiveCameras, canItDashboard],
  );

  const onLogout = async () => {
    const ok = await confirmAction('Log out', 'Are you sure you want to sign out?', 'Log out');
    if (!ok) return;
    await logout();
    router.replace('/login');
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxxl }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={palette.inkGradient}
        start={GRADIENT_TL}
        end={GRADIENT_BR}
        style={[styles.header, { paddingTop: insets.top + spacing.xl }]}
      >
        <Avatar name={name} uri={employee?.profilePhoto} size={84} ring />
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.role}>{employee?.role || '—'}</Text>
        <View style={styles.idPill}>
          <Ionicons name="finger-print-outline" size={13} color={palette.onInkMuted} />
          <Text style={styles.idText}>
            ID {employee?.biometricId || '—'} · {employee?.department || '—'}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {loading && !employee ? (
          <Card padded>
            <ActivityIndicator color={palette.primary} />
          </Card>
        ) : (
          <Card padded>
            <Detail icon="business-outline" label="Company" value={employee?.companyName || '—'} />
            <Detail icon="people-outline" label="Reports to" value={employee?.manager || '—'} />
            <Detail icon="briefcase-outline" label="Work modality" value={employee?.workModality || '—'} />
            <Detail icon="calendar-clear-outline" label="Joined" value={employee?.joinDate || '—'} />
            <Detail icon="hourglass-outline" label="Tenure" value={formatTenure(employee?.tenure || '') || '—'} last />
          </Card>
        )}

        <SectionHeader title="Account" />
        <Card padded>
          {accountMenu.map((m, i) => (
            <Pressable
              key={m.label}
              onPress={() => router.push(m.route as never)}
              style={({ pressed }) => [
                styles.menuRow,
                i < accountMenu.length - 1 && styles.divider,
                pressed && { opacity: 0.6 },
              ]}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={m.icon} size={18} color={palette.primary} />
              </View>
              <Text style={styles.menuLabel}>{m.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={palette.textFaint} />
            </Pressable>
          ))}
        </Card>

        {advanceMenu.length > 0 ? (
          <>
            <SectionHeader title="Advance" />
            <Card padded>
              {advanceMenu.map((m, i) => (
                <Pressable
                  key={m.label}
                  onPress={() => router.push(m.route as never)}
                  style={({ pressed }) => [
                    styles.menuRow,
                    i < advanceMenu.length - 1 && styles.divider,
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <View style={styles.menuIcon}>
                    <Ionicons name={m.icon} size={18} color={palette.primary} />
                  </View>
                  <Text style={styles.menuLabel}>{m.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={palette.textFaint} />
                </Pressable>
              ))}
            </Card>
          </>
        ) : null}

        <Pressable style={({ pressed }) => [styles.logout, pressed && { opacity: 0.8 }]} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={18} color={palette.dangerDark} />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>

        <Text style={styles.version}>Nysonian ERP · v1.1.0</Text>
      </View>
    </ScrollView>
  );
}

function Detail({
  icon,
  label,
  value,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.detail, !last && styles.divider]}>
      <Ionicons name={icon} size={17} color={palette.textMuted} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  header: {
    alignItems: 'center',
    paddingBottom: spacing.xxl + spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  name: { ...typography.h1, color: palette.white, marginTop: spacing.md },
  role: { ...typography.small, color: palette.onInkMuted, marginTop: 3 },
  idPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md,
    backgroundColor: palette.onInkSurface, borderWidth: 1, borderColor: palette.onInkBorder,
    paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill,
  },
  idText: { ...typography.caption, color: palette.white, textTransform: 'none' },

  body: { paddingHorizontal: spacing.lg, marginTop: -spacing.xxl },

  detail: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md + 1 },
  divider: { borderBottomWidth: 1, borderBottomColor: palette.border },
  detailLabel: { ...typography.small, color: palette.textMuted, flex: 1 },
  detailValue: { ...typography.bodyBold, color: palette.text, maxWidth: '55%' },

  menuRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md + 1 },
  menuIcon: {
    width: 38, height: 38, borderRadius: radius.md, backgroundColor: palette.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { ...typography.bodyBold, color: palette.text, flex: 1 },

  logout: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    marginTop: spacing.xl, paddingVertical: spacing.lg, borderRadius: radius.md,
    backgroundColor: palette.dangerLight, borderWidth: 1, borderColor: 'rgba(240,68,75,0.2)',
  },
  logoutText: { ...typography.bodyBold, color: palette.dangerDark },
  version: { textAlign: 'center', ...typography.caption, color: palette.textFaint, marginTop: spacing.xl, textTransform: 'none' },
});
