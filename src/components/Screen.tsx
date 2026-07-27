import { ReactElement, ReactNode } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, spacing } from '@/theme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  refreshControl?: ReactElement;
};

/** Standard padded page container that respects safe areas. */
export default function Screen({ children, scroll = true, contentStyle, refreshControl }: Props) {
  const insets = useSafeAreaInsets();
  const pad = {
    paddingBottom: insets.bottom + spacing.xxxl,
    paddingHorizontal: spacing.lg,
  };

  if (!scroll) {
    return <View style={[styles.container, pad, contentStyle]}>{children}</View>;
  }
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[pad, contentStyle]}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
});
