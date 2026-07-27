import { memo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { GRADIENT_BOTTOM, GRADIENT_TOP } from '@/theme/gradients';
import { fonts, palette, radius, spacing, typography } from '@/theme';

export type BarDatum = { label: string; value: number; highlight?: boolean };

type Props = {
  data: BarDatum[];
  height?: number;
  unit?: string;
};

/**
 * Dependency-free bar chart built from flex Views (crisp rounded caps, no SVG
 * aspect-ratio distortion). Used for the daily working-hours trend.
 */
function BarChart({ data, height = 160 }: Props) {
  const plot = height - 34; // leave room for value + day labels
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <View>
      <View style={[styles.plot, { height: plot }]}>
        {data.map((d, i) => {
          const h = Math.max((d.value / max) * (plot - 18), d.value > 0 ? 6 : 3);
          return (
            <View key={`${d.label}-${i}`} style={styles.col}>
              <Text style={styles.value}>{d.value ? `${d.value}` : '–'}</Text>
              {d.highlight ? (
                <LinearGradient
                  colors={palette.primaryGradient}
                  start={GRADIENT_TOP}
                  end={GRADIENT_BOTTOM}
                  style={[styles.bar, { height: h }]}
                />
              ) : (
                <View style={[styles.bar, styles.barIdle, { height: h }]} />
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {data.map((d, i) => (
          <Text key={`${d.label}-${i}`} style={styles.label}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default memo(BarChart);

const styles = StyleSheet.create({
  plot: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  value: {
    ...typography.overline,
    fontSize: 10.5,
    color: palette.textFaint,
    marginBottom: spacing.xs,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0,
    textTransform: 'none',
  },
  bar: { width: '62%', borderRadius: radius.sm, minWidth: 8 },
  barIdle: { backgroundColor: palette.primaryLight },
  labels: { flexDirection: 'row', marginTop: spacing.sm },
  label: {
    flex: 1,
    textAlign: 'center',
    ...typography.caption,
    fontSize: 10.5,
    color: palette.textFaint,
    fontFamily: fonts.semibold,
    textTransform: 'none',
    letterSpacing: 0,
  },
});
