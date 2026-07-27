import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { palette, radius, spacing, typography } from '@/theme';
import Badge, { BadgeTone } from './Badge';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg?: string;
  iconFg?: string;
  title: string;
  subtitle?: string;
  badgeLabel?: string;
  badgeTone?: BadgeTone;
  trailing?: string;
  divider?: boolean;
};

export default function ListRow({
  icon,
  iconBg = palette.surfaceAlt,
  iconFg = palette.primary,
  title,
  subtitle,
  badgeLabel,
  badgeTone = 'neutral',
  trailing,
  divider = true,
}: Props) {
  return (
    <View style={[styles.row, divider && styles.divider]}>
      <View style={[styles.icon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={17} color={iconFg} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.trailing}>
        {badgeLabel ? <Badge label={badgeLabel} tone={badgeTone} /> : null}
        {trailing ? <Text style={styles.trailingText}>{trailing}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md + 2 },
  divider: { borderBottomWidth: 1, borderBottomColor: palette.border },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  body: { flex: 1 },
  title: { ...typography.bodyBold, color: palette.text },
  subtitle: { ...typography.small, color: palette.textMuted, marginTop: 2 },
  trailing: { alignItems: 'flex-end', gap: 4 },
  trailingText: { ...typography.small, color: palette.textFaint, fontVariant: ['tabular-nums'] },
});
