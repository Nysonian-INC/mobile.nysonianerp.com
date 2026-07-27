import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { palette, radius, shadow, spacing } from '@/theme';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  /** Slightly stronger elevation for the one "hero" card on a screen. */
  raised?: boolean;
};

/** Base surface for every grouped block. Leans on a hairline border, not shadow. */
export default function Card({ children, style, padded = true, raised = false }: Props) {
  return (
    <View style={[styles.card, raised ? shadow.raised : shadow.card, padded && styles.padded, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  padded: {
    padding: spacing.xl,
  },
});
