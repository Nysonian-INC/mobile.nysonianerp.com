import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Card from '@/components/Card';
import ScreenHeader from '@/components/ScreenHeader';
import StateView from '@/components/StateView';
import { api } from '@/api/client';
import { useReadOnlyResource } from '@/hooks/useReadOnlyResource';
import { palette, radius, spacing, typography } from '@/theme';
import { EmployeeNotification } from '@/types';

function formatWhen(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function iconFor(type: string): keyof typeof Ionicons.glyphMap {
  const t = type.toLowerCase();
  if (t.includes('leave')) return 'calendar-outline';
  if (t.includes('payroll') || t.includes('pay')) return 'cash-outline';
  if (t.includes('policy')) return 'shield-checkmark-outline';
  if (t.includes('it') || t.includes('requisition')) return 'hardware-chip-outline';
  if (t.includes('comms') || t.includes('reply')) return 'chatbubble-outline';
  return 'notifications-outline';
}

export default function ProfileNotificationsScreen() {
  const { data, setData, loading, refreshing, error, refresh, retry } = useReadOnlyResource(
    () => api.getNotifications({ limit: 100 }),
    [],
  );
  const [busyId, setBusyId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const markOne = useCallback(
    async (n: EmployeeNotification) => {
      if (n.read || busyId === n.id) return;
      setBusyId(n.id);
      const res = await api.markNotificationRead(n.id);
      if (res.status === 'success') {
        setData((prev) => {
          if (!prev) return prev;
          return {
            unreadCount: res.data?.unreadCount ?? Math.max(0, prev.unreadCount - 1),
            notifications: prev.notifications.map((item) =>
              item.id === n.id
                ? { ...item, read: true, readAt: new Date().toISOString() }
                : item,
            ),
          };
        });
      }
      setBusyId(null);
    },
    [busyId, setData],
  );

  const markAll = useCallback(async () => {
    if (markingAll || unreadCount <= 0) return;
    setMarkingAll(true);
    const res = await api.markAllNotificationsRead();
    if (res.status === 'success') {
      setData((prev) => {
        if (!prev) return prev;
        return {
          unreadCount: 0,
          notifications: prev.notifications.map((item) => ({
            ...item,
            read: true,
            readAt: item.readAt || new Date().toISOString(),
          })),
        };
      });
    }
    setMarkingAll(false);
  }, [markingAll, unreadCount, setData]);

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
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
          ) : notifications.length === 0 ? (
            <StateView
              empty
              emptyIcon="notifications-off-outline"
              emptyTitle="No notifications"
              emptyText="Updates about leave, payroll, and requests will land here."
            />
          ) : (
            <>
              {unreadCount > 0 ? (
                <Pressable
                  onPress={markAll}
                  disabled={markingAll}
                  style={({ pressed }) => [styles.markAll, pressed && { opacity: 0.7 }]}
                >
                  <Ionicons name="checkmark-done-outline" size={16} color={palette.primary} />
                  <Text style={styles.markAllText}>
                    {markingAll ? 'Marking…' : 'Mark all as read'}
                  </Text>
                </Pressable>
              ) : null}

              {notifications.map((n) => (
                <Pressable
                  key={n.id}
                  onPress={() => markOne(n)}
                  style={({ pressed }) => [pressed && { opacity: 0.85 }]}
                >
                  <Card style={[styles.card, !n.read ? styles.unreadCard : null]} padded>
                    <View style={styles.row}>
                      <View style={[styles.icon, !n.read && styles.iconUnread]}>
                        <Ionicons
                          name={iconFor(n.type)}
                          size={18}
                          color={!n.read ? palette.primary : palette.textMuted}
                        />
                      </View>
                      <View style={styles.flex}>
                        <Text style={[styles.verb, !n.read && styles.verbUnread]}>{n.verb}</Text>
                        <Text style={styles.when}>{formatWhen(n.createdAt)}</Text>
                      </View>
                      {!n.read ? <View style={styles.dot} /> : null}
                    </View>
                  </Card>
                </Pressable>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },

  markAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-end',
    marginBottom: spacing.md,
  },
  markAllText: { ...typography.small, color: palette.primary, fontWeight: '700' },

  card: { marginBottom: spacing.sm },
  unreadCard: { borderColor: 'rgba(79,107,255,0.35)', backgroundColor: '#F7F8FF' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconUnread: { backgroundColor: palette.primaryLight },
  verb: { ...typography.body, color: palette.textMuted },
  verbUnread: { ...typography.bodyBold, color: palette.text },
  when: { ...typography.caption, color: palette.textFaint, textTransform: 'none', marginTop: 4 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.primary,
    marginTop: 6,
  },
});
