import { StyleSheet, Text, View } from 'react-native';
import { palette, radius, spacing, typography } from '@/theme';

export type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

// Each tone pairs a tinted background with an accessible (AA) dark text color
// and a saturated dot. Same-hue low-contrast pairs are deliberately avoided.
const TONES: Record<BadgeTone, { bg: string; fg: string; dot: string }> = {
  primary: { bg: palette.primaryLight, fg: palette.primaryDark, dot: palette.primary },
  success: { bg: palette.successLight, fg: palette.successDark, dot: palette.success },
  warning: { bg: palette.warningLight, fg: palette.warningDark, dot: palette.warning },
  danger: { bg: palette.dangerLight, fg: palette.dangerDark, dot: palette.danger },
  info: { bg: palette.infoLight, fg: palette.infoDark, dot: palette.info },
  neutral: { bg: palette.surfaceAlt, fg: palette.textMuted, dot: palette.textFaint },
};

export default function Badge({
  label,
  tone = 'neutral',
  dot = false,
}: {
  label: string;
  tone?: BadgeTone;
  dot?: boolean;
}) {
  const c = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      {dot ? <View style={[styles.dot, { backgroundColor: c.dot }]} /> : null}
      <Text style={[styles.text, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { ...typography.caption, textTransform: 'capitalize', letterSpacing: 0.2 },
});
