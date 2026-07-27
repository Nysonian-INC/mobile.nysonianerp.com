import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Card from '@/components/Card';
import ScreenHeader from '@/components/ScreenHeader';
import SectionHeader from '@/components/SectionHeader';
import StateView from '@/components/StateView';
import { api } from '@/api/client';
import { useReadOnlyResource } from '@/hooks/useReadOnlyResource';
import { palette, radius, spacing, typography } from '@/theme';
import { SupportContact } from '@/types';

function iconFor(role: string): keyof typeof Ionicons.glyphMap {
  const r = role.toLowerCase();
  if (r === 'manager') return 'person-outline';
  if (r === 'hr') return 'people-outline';
  if (r === 'it') return 'hardware-chip-outline';
  return 'help-buoy-outline';
}

async function openMailto(email: string) {
  const address = email.trim();
  if (!address) return;
  try {
    await Linking.openURL(`mailto:${address}`);
  } catch {
    /* ignore */
  }
}

async function openTel(phone: string) {
  const number = phone.replace(/\s+/g, '');
  if (!number) return;
  try {
    await Linking.openURL(`tel:${number}`);
  } catch {
    /* ignore */
  }
}

async function openWeb(url: string) {
  let href = url.trim();
  if (!href) return;
  if (!/^https?:\/\//i.test(href)) href = `https://${href}`;
  try {
    await Linking.openURL(href);
  } catch {
    /* ignore */
  }
}

export default function ProfileHelpSupportScreen() {
  const { data, loading, refreshing, error, refresh, retry } = useReadOnlyResource(
    () => api.getSupport(),
    [],
  );

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Help & support"
        subtitle="Who to contact"
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
              <SectionHeader title="Company" tight />
              <Card padded>
                <Text style={styles.companyName}>{data.company.name || 'Nysonian'}</Text>
                {data.company.address ? (
                  <Text style={styles.companyMeta}>{data.company.address}</Text>
                ) : null}
                <View style={styles.actionRow}>
                  {data.company.phone ? (
                    <ActionChip
                      icon="call-outline"
                      label="Call"
                      onPress={() => openTel(data.company.phone)}
                    />
                  ) : null}
                  {data.company.email ? (
                    <ActionChip
                      icon="mail-outline"
                      label="Email"
                      onPress={() => openMailto(data.company.email)}
                    />
                  ) : null}
                  {data.company.website ? (
                    <ActionChip
                      icon="globe-outline"
                      label="Website"
                      onPress={() => openWeb(data.company.website)}
                    />
                  ) : null}
                </View>
              </Card>

              <SectionHeader title="Contacts" />
              {data.contacts.map((c, i) => (
                <ContactCard key={`${c.role}-${i}`} contact={c} />
              ))}
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function ContactCard({ contact }: { contact: SupportContact }) {
  return (
    <Card style={styles.contactCard} padded>
      <View style={styles.top}>
        <View style={styles.icon}>
          <Ionicons name={iconFor(contact.role)} size={20} color={palette.primary} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.title}>{contact.title || contact.role}</Text>
          {contact.name ? <Text style={styles.sub}>{contact.name}</Text> : null}
        </View>
      </View>
      {contact.email ? <Text style={styles.detail}>{contact.email}</Text> : null}
      {contact.phone ? <Text style={styles.detail}>{contact.phone}</Text> : null}
      <View style={styles.actionRow}>
        {contact.email ? (
          <ActionChip icon="mail-outline" label="Email" onPress={() => openMailto(contact.email)} />
        ) : null}
        {contact.phone ? (
          <ActionChip icon="call-outline" label="Call" onPress={() => openTel(contact.phone)} />
        ) : null}
      </View>
    </Card>
  );
}

function ActionChip({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}>
      <Ionicons name={icon} size={15} color={palette.primary} />
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },

  companyName: { ...typography.h3, color: palette.text },
  companyMeta: { ...typography.small, color: palette.textMuted, marginTop: spacing.sm, lineHeight: 19 },

  contactCard: { marginBottom: spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.bodyBold, color: palette.text },
  sub: { ...typography.small, color: palette.textMuted, marginTop: 2 },
  detail: { ...typography.small, color: palette.text, marginTop: spacing.sm },

  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryLight,
  },
  chipText: { ...typography.small, color: palette.primary, fontWeight: '700' },
});
