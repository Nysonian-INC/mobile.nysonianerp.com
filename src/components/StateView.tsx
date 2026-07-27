import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Card from '@/components/Card';
import { fonts, palette, spacing, typography } from '@/theme';

type Props = {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyIcon?: keyof typeof Ionicons.glyphMap;
  emptyTitle?: string;
  emptyText?: string;
  onRetry?: () => void;
};

/** Shared loading / error / empty block for profile destination screens. */
export default function StateView({
  loading,
  error,
  empty,
  emptyIcon = 'folder-open-outline',
  emptyTitle = 'Nothing here yet',
  emptyText = 'Check back later.',
  onRetry,
}: Props) {
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={palette.primary} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <Card>
        <Text style={styles.errorText}>{error}</Text>
        {onRetry ? (
          <Pressable
            onPress={onRetry}
            style={({ pressed }) => [styles.retry, pressed && { opacity: 0.7 }]}
            hitSlop={8}
          >
            <Ionicons name="refresh" size={16} color={palette.primary} />
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        ) : null}
      </Card>
    );
  }

  if (empty) {
    return (
      <View style={styles.empty}>
        <Ionicons name={emptyIcon} size={44} color={palette.textFaint} />
        <Text style={styles.emptyTitle}>{emptyTitle}</Text>
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.huge },
  errorText: { ...typography.small, color: palette.danger },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  retryText: { ...typography.small, color: palette.primary, fontFamily: fonts.bold },
  empty: { alignItems: 'center', paddingTop: spacing.huge, gap: spacing.sm },
  emptyTitle: { ...typography.h3, color: palette.text, marginTop: spacing.sm },
  emptyText: { ...typography.small, color: palette.textMuted, textAlign: 'center' },
});
