import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Badge, { BadgeTone } from '@/components/Badge';
import Card from '@/components/Card';
import ScreenHeader from '@/components/ScreenHeader';
import SectionHeader from '@/components/SectionHeader';
import StateView from '@/components/StateView';
import { api } from '@/api/client';
import { useReadOnlyResource } from '@/hooks/useReadOnlyResource';
import { palette, radius, spacing, typography } from '@/theme';
import { EmployeeDocument, EmployeePolicy } from '@/types';

function formatDate(value: string) {
  if (!value) return '';
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function policyTone(status: string): BadgeTone {
  const s = status.toLowerCase();
  if (s === 'acknowledged') return 'success';
  if (s === 'pending') return 'warning';
  if (s === 'waived') return 'neutral';
  return 'info';
}

function docTone(doc: EmployeeDocument): BadgeTone {
  if (doc.signatureRequired && !doc.signed) return 'warning';
  if (doc.signed) return 'success';
  return 'neutral';
}

function docBadge(doc: EmployeeDocument): string {
  if (doc.signatureRequired && !doc.signed) return 'Sign required';
  if (doc.signed) return 'Signed';
  return doc.mime ? doc.mime.toUpperCase() : 'On file';
}

async function openUrl(url: string | null | undefined) {
  if (!url) return;
  try {
    await Linking.openURL(url);
  } catch {
    /* ignore — device may not have a handler */
  }
}

export default function ProfileDocumentsScreen() {
  const { data, loading, refreshing, error, refresh, retry } = useReadOnlyResource(
    () => api.getDocuments(),
    [],
  );

  const documents = data?.documents ?? [];
  const policies = data?.policies ?? [];
  const pending = data?.pendingTypes ?? [];
  const isEmpty = !loading && !error && documents.length === 0 && policies.length === 0;

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Documents & policies"
        subtitle="Your files and acknowledgements"
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
          ) : isEmpty ? (
            <StateView
              empty
              emptyIcon="document-text-outline"
              emptyTitle="No documents yet"
              emptyText="Uploaded documents and assigned policies will appear here."
            />
          ) : (
            <>
              {error ? (
                <Card style={styles.warn}>
                  <Text style={styles.warnText}>{error}</Text>
                </Card>
              ) : null}

              {pending.length > 0 ? (
                <>
                  <SectionHeader title="Still needed" tight />
                  <Card padded>
                    {pending.map((p, i) => (
                      <View
                        key={p.id}
                        style={[styles.pendingRow, i < pending.length - 1 && styles.divider]}
                      >
                        <Ionicons name="alert-circle-outline" size={18} color={palette.warningDark} />
                        <Text style={styles.pendingText}>{p.title}</Text>
                      </View>
                    ))}
                  </Card>
                </>
              ) : null}

              <SectionHeader title={`Documents (${documents.length})`} tight={pending.length === 0} />
              {documents.length === 0 ? (
                <Text style={styles.muted}>No personal documents on file.</Text>
              ) : (
                documents.map((d) => <DocumentCard key={d.id} doc={d} />)
              )}

              <SectionHeader title={`Policies (${policies.length})`} />
              {policies.length === 0 ? (
                <Text style={styles.muted}>No policies assigned.</Text>
              ) : (
                policies.map((p) => <PolicyCard key={p.ackId} policy={p} />)
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function DocumentCard({ doc }: { doc: EmployeeDocument }) {
  return (
    <Card style={styles.itemCard} padded>
      <View style={styles.itemTop}>
        <View style={styles.icon}>
          <Ionicons name="document-outline" size={20} color={palette.primary} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.itemTitle}>{doc.type || 'Document'}</Text>
          {doc.description ? <Text style={styles.itemSub}>{doc.description}</Text> : null}
        </View>
        <Badge label={docBadge(doc)} tone={docTone(doc)} />
      </View>
      <View style={styles.metaGrid}>
        {doc.number ? <Meta label="Number" value={doc.number} /> : null}
        {doc.issueDate ? <Meta label="Issued" value={formatDate(doc.issueDate)} /> : null}
        {doc.expiryDate ? <Meta label="Expires" value={formatDate(doc.expiryDate)} /> : null}
        {doc.size ? <Meta label="Size" value={doc.size} /> : null}
      </View>
      {doc.viewUrl ? (
        <Pressable
          onPress={() => openUrl(doc.viewUrl)}
          style={({ pressed }) => [styles.openBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="open-outline" size={16} color={palette.primary} />
          <Text style={styles.openText}>Open file</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

function PolicyCard({ policy }: { policy: EmployeePolicy }) {
  return (
    <Card style={styles.itemCard} padded>
      <View style={styles.itemTop}>
        <View style={styles.icon}>
          <Ionicons name="shield-checkmark-outline" size={20} color={palette.primary} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.itemTitle}>{policy.title}</Text>
          <Text style={styles.itemSub}>
            {[policy.category, policy.version ? `v${policy.version}` : '', policy.code]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
        <Badge label={policy.status} tone={policyTone(policy.status)} />
      </View>
      <View style={styles.metaGrid}>
        {policy.effectiveDate ? (
          <Meta label="Effective" value={formatDate(policy.effectiveDate)} />
        ) : null}
        {policy.acknowledgedAt ? (
          <Meta label="Acknowledged" value={formatDate(policy.acknowledgedAt)} />
        ) : policy.assignedAt ? (
          <Meta label="Assigned" value={formatDate(policy.assignedAt)} />
        ) : null}
      </View>
      {policy.fileUrl ? (
        <Pressable
          onPress={() => openUrl(policy.fileUrl)}
          style={({ pressed }) => [styles.openBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="open-outline" size={16} color={palette.primary} />
          <Text style={styles.openText}>Open policy</Text>
        </Pressable>
      ) : null}
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
  muted: { ...typography.small, color: palette.textMuted, marginBottom: spacing.md },
  warn: { marginBottom: spacing.md },
  warnText: { ...typography.small, color: palette.warningDark },

  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  divider: { borderBottomWidth: 1, borderBottomColor: palette.border },
  pendingText: { ...typography.bodyBold, color: palette.text, flex: 1 },

  itemCard: { marginBottom: spacing.md },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: { ...typography.bodyBold, color: palette.text },
  itemSub: { ...typography.small, color: palette.textMuted, marginTop: 2 },

  metaGrid: {
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

  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  openText: { ...typography.small, color: palette.primary, fontWeight: '700' },
});
