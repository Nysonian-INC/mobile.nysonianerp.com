import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, palette, radius, spacing, typography } from '@/theme';

export type SegmentTab<T extends string> = { key: T; label: string };

type Props<T extends string> = {
  tabs: Array<SegmentTab<T>>;
  active: T;
  onSelect: (key: T) => void;
  /** `pill` = filled primary (default). `ink` = dark selected chip (organogram). */
  variant?: 'pill' | 'ink';
};

/**
 * Shared 2–4 option segment control. minHeight 44 for thumb-friendly taps.
 */
export default function SegmentedControl<T extends string>({
  tabs,
  active,
  onSelect,
  variant = 'pill',
}: Props<T>) {
  const ink = variant === 'ink';
  return (
    <View style={[styles.wrap, ink && styles.wrapInk]}>
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <Pressable
            key={t.key}
            onPress={() => onSelect(t.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            style={({ pressed }) => [
              styles.tab,
              ink ? styles.tabInk : styles.tabPill,
              isActive && (ink ? styles.tabInkActive : styles.tabPillActive),
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text
              style={[
                styles.label,
                isActive && (ink ? styles.labelInkActive : styles.labelPillActive),
              ]}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  wrapInk: {
    gap: spacing.sm,
    padding: spacing.xs,
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  tabPill: {
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  tabPillActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  tabInk: {
    borderRadius: radius.sm,
  },
  tabInkActive: {
    backgroundColor: palette.ink,
  },
  label: {
    ...typography.small,
    color: palette.textMuted,
    fontFamily: fonts.semibold,
  },
  labelPillActive: {
    color: palette.white,
  },
  labelInkActive: {
    color: palette.onInk,
  },
});
