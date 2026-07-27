import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { palette } from '@/theme';

type Props = {
  /** 0..1 */
  value: number;
  color?: string;
  trackColor?: string;
  height?: number;
  /** Use the brand gradient as the fill (for the one hero progress per screen). */
  gradient?: boolean;
};

export default function ProgressBar({
  value,
  color = palette.primary,
  trackColor = palette.surfaceAlt,
  height = 10,
  gradient = false,
}: Props) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const r = height / 2;
  return (
    <View style={[styles.track, { height, borderRadius: r, backgroundColor: trackColor }]}>
      {gradient ? (
        <LinearGradient
          colors={palette.primaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: `${pct}%`, height: '100%', borderRadius: r }}
        />
      ) : (
        <View style={{ width: `${pct}%`, height: '100%', borderRadius: r, backgroundColor: color }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
});
