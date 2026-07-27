import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, palette, spacing, typography } from '@/theme';

type Props = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Tighten the top gap when the header sits right under another block. */
  tight?: boolean;
};

export default function SectionHeader({ title, actionLabel, onAction, tight = false }: Props) {
  return (
    <View style={[styles.row, tight && styles.tight]}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel ? (
        <Pressable hitSlop={8} onPress={onAction} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <Text style={styles.actionText}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={palette.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.section,
  },
  tight: { marginTop: spacing.lg },
  title: { ...typography.h2, color: palette.text },
  action: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  pressed: { opacity: 0.5 },
  actionText: { ...typography.small, color: palette.primary, fontFamily: fonts.bold },
});
