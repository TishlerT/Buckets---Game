import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Polygon } from 'react-native-svg';
import { PALETTE } from '@/constants/theme';

interface StarBurstProps {
  trigger: number;
  cx: number;
  cy: number;
  count?: number;
  maxRadius?: number;
}

/**
 * Pixel star burst — used for contested makes. Stars radiate outward
 * from (cx, cy) and fade. Cheaper than ConfettiBurst (no rotation per
 * particle, just translate + alpha).
 */
export const StarBurst: React.FC<StarBurstProps> = ({
  trigger,
  cx,
  cy,
  count = 14,
  maxRadius = 180,
}) => {
  if (trigger === 0) return null;
  const stars: React.ReactElement[] = [];
  const seed = trigger * 73;
  for (let i = 0; i < count; i++) {
    const r = pseudoRand(seed + i * 31);
    const angle = (i / count) * 360 + r * 20;
    const distance = maxRadius * (0.6 + r * 0.4);
    const size = 8 + Math.floor(r * 4) * 2;
    const color = pickColor(seed + i);
    stars.push(
      <Star
        key={`${trigger}-${i}`}
        trigger={trigger}
        cx={cx}
        cy={cy}
        angleDeg={angle}
        distance={distance}
        size={size}
        color={color}
      />
    );
  }
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>{stars}</View>;
};

interface StarProps {
  trigger: number;
  cx: number;
  cy: number;
  angleDeg: number;
  distance: number;
  size: number;
  color: string;
}
const Star: React.FC<StarProps> = ({ trigger, cx, cy, angleDeg, distance, size, color }) => {
  const t = useSharedValue(0);

  React.useEffect(() => {
    t.value = 0;
    t.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [trigger, t]);

  const animStyle = useAnimatedStyle(() => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      transform: [
        { translateX: Math.cos(rad) * distance * t.value },
        { translateY: Math.sin(rad) * distance * t.value },
      ],
      opacity: 1 - t.value,
    };
  });

  // 5-point star polygon points centered at (size/2, size/2)
  const cx2 = size / 2, cy2 = size / 2;
  const r1 = size / 2;
  const r2 = size / 4;
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? r1 : r2;
    const a = (Math.PI / 2) + (i * Math.PI) / 5;
    pts.push(`${cx2 + r * Math.cos(a)},${cy2 - r * Math.sin(a)}`);
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.starWrap,
        { left: cx - size / 2, top: cy - size / 2, width: size, height: size },
        animStyle,
      ]}
    >
      <Svg width={size} height={size}>
        <Polygon points={pts.join(' ')} fill={color} stroke={PALETTE.black} strokeWidth={1} />
      </Svg>
    </Animated.View>
  );
};

const COLORS = [
  PALETTE.yellowBright,
  PALETTE.orangeBall,
  PALETTE.lineWhite,
];
function pickColor(seed: number): string {
  return COLORS[Math.abs(seed) % COLORS.length]!;
}

function pseudoRand(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const styles = StyleSheet.create({
  starWrap: { position: 'absolute' },
});
