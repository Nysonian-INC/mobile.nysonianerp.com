import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Card from '@/components/Card';
import KeyValueRow from '@/components/KeyValueRow';
import ScreenHeader from '@/components/ScreenHeader';
import SectionHeader from '@/components/SectionHeader';
import StateView from '@/components/StateView';
import { api } from '@/api/client';
import { useReadOnlyResource } from '@/hooks/useReadOnlyResource';
import { palette, spacing, typography } from '@/theme';

function formatDate(value: string) {
  if (!value) return '';
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ProfilePersonalInfoScreen() {
  const { data, loading, refreshing, error, refresh, retry } = useReadOnlyResource(
    () => api.getProfile(),
    [],
  );

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Personal information"
        subtitle="Your employee record"
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
          ) : data ? (
            <>
              {error ? (
                <Card style={styles.warn}>
                  <Text style={styles.warnText}>{error}</Text>
                </Card>
              ) : null}

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
                {data.employment.office ? (
                  <KeyValueRow label="Office" value={data.employment.office} />
                ) : null}
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
                <StateView
                  empty
                  emptyIcon="people-outline"
                  emptyTitle="No emergency contacts"
                  emptyText="Ask HR to add emergency contacts to your profile."
                />
              ) : (
                data.emergencyContacts.map((c) => (
                  <Card key={c.id} padded style={styles.block}>
                    <Text style={styles.blockTitle}>{c.name || 'Contact'}</Text>
                    <KeyValueRow label="Relationship" value={c.relationship} />
                    <KeyValueRow label="Phone" value={c.phone} />
                    <KeyValueRow label="Email" value={c.email} last />
                  </Card>
                ))
              )}

              <SectionHeader title="Education" />
              {!data.education.length ? (
                <StateView
                  empty
                  emptyIcon="school-outline"
                  emptyTitle="No education on file"
                  emptyText="Education records will appear here when added."
                />
              ) : (
                data.education.map((e) => (
                  <Card key={e.id} padded style={styles.block}>
                    <Text style={styles.blockTitle}>{e.institution || 'Institution'}</Text>
                    <KeyValueRow label="Degree" value={e.degree} />
                    <KeyValueRow label="Grade" value={e.grade} />
                    <KeyValueRow
                      label="Years"
                      value={[e.startYear, e.endYear].filter(Boolean).join(' – ')}
                      last
                    />
                  </Card>
                ))
              )}
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  block: { marginBottom: spacing.md },
  blockTitle: { ...typography.h3, color: palette.text, marginBottom: spacing.sm },
  warn: { marginBottom: spacing.md },
  warnText: { ...typography.small, color: palette.warningDark },
});
