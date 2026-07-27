import { StyleSheet, Text, View } from 'react-native';
import { fonts, palette, typography } from '@/theme';

type Props = {
  name: string;
  size?: number;
};

export function initialsFromName(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?'
  );
}

/** Light-surface initials avatar for employee cards / search rows. */
export default function InitialsAvatar({ name, size = 44 }: Props) {
  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.34 }]}>{initialsFromName(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...typography.bodyBold,
    color: palette.primaryDark,
    fontFamily: fonts.bold,
  },
});
