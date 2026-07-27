import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, radius, shadow, spacing, typography } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
};

export default function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
}: Props) {
  const isPrimary = variant === 'primary';
  const content = loading ? (
    <ActivityIndicator color={isPrimary ? palette.white : palette.primary} />
  ) : (
    <>
      {icon}
      <Text style={[styles.label, !isPrimary && styles.labelDark]}>{label}</Text>
    </>
  );

  if (isPrimary) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.base,
          !disabled && shadow.floating,
          { opacity: disabled ? 0.55 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
          style,
        ]}
      >
        <LinearGradient
          colors={palette.primaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        styles.inner,
        variant === 'secondary' ? styles.secondary : styles.ghost,
        { opacity: disabled ? 0.55 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, overflow: 'hidden' },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 15,
    paddingHorizontal: spacing.xl,
  },
  secondary: { backgroundColor: palette.primaryLight },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: palette.borderStrong },
  label: { ...typography.bodyBold, fontSize: 15.5, color: palette.white },
  labelDark: { color: palette.primaryDark },
});
