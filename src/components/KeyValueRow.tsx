import { StyleSheet, Text, View } from 'react-native';
import { palette, spacing, typography } from '@/theme';

type Props = {
  label: string;
  value?: string | null;
  last?: boolean;
};

/** Label + value row for read-only profile detail cards. */
export default function KeyValueRow({ label, value, last }: Props) {
  const display = value && String(value).trim() !== '' ? String(value) : '—';
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={3}>
        {display}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md + 1,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: palette.border },
  label: { ...typography.small, color: palette.textMuted, flex: 1 },
  value: { ...typography.bodyBold, color: palette.text, flex: 1.4, textAlign: 'right' },
});
