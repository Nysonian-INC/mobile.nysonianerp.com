import { memo, ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GRADIENT_BR, GRADIENT_TL } from '@/theme/gradients';
import { palette, radius, spacing, typography } from '@/theme';

type Props = {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
};

/**
 * Unified deep-ink header for secondary screens — same visual language as
 * the dashboard/profile headers so the app reads as one product.
 */
function ScreenHeader({ title, subtitle, left, right }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={palette.inkGradient}
      start={GRADIENT_TL}
      end={GRADIENT_BR}
      style={[styles.wrap, { paddingTop: insets.top + spacing.lg }]}
    >
      {left}
      <View style={styles.flex}>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {right}
    </LinearGradient>
  );
}

export default memo(ScreenHeader);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  flex: { flex: 1 },
  title: { ...typography.h1, color: palette.onInk, marginTop: 2 },
  subtitle: { ...typography.overline, color: palette.onInkMuted },
});
