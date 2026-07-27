import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { View } from 'react-native';
import { palette } from '@/theme';

/** Quiet geometric hierarchy mark for empty / zero-data states. */
export default function OrgEmptyArt({ size = 160 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 160 160">
        <Rect x="0" y="0" width="160" height="160" rx="28" fill={palette.ink} />
        <Circle cx="80" cy="36" r="14" fill={palette.primary} opacity={0.95} />
        <Line x1="80" y1="50" x2="80" y2="72" stroke="rgba(255,255,255,0.28)" strokeWidth="2" />
        <Line x1="44" y1="72" x2="116" y2="72" stroke="rgba(255,255,255,0.28)" strokeWidth="2" />
        <Line x1="44" y1="72" x2="44" y2="88" stroke="rgba(255,255,255,0.28)" strokeWidth="2" />
        <Line x1="116" y1="72" x2="116" y2="88" stroke="rgba(255,255,255,0.28)" strokeWidth="2" />
        <Circle cx="44" cy="102" r="12" fill="rgba(255,255,255,0.18)" />
        <Circle cx="116" cy="102" r="12" fill="rgba(255,255,255,0.18)" />
        <Line x1="44" y1="114" x2="44" y2="128" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
        <Line x1="28" y1="128" x2="60" y2="128" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
        <Circle cx="28" cy="140" r="7" fill="rgba(79,107,255,0.45)" />
        <Circle cx="60" cy="140" r="7" fill="rgba(255,255,255,0.12)" />
      </Svg>
    </View>
  );
}
