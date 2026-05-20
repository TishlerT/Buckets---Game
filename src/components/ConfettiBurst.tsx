import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { PALETTE } from '@/constants/theme';

interface ConfettiBurstProps {
  /** When this number changes, a fresh burst fires. */
  trigger: number;
  /** Center of the burst, screen-relative. */
  cx: number;
  cy: number;
  /** Number of particles to spawn. */
  count?: number;
  /** Maximum particle travel distance, px. */
  maxRadius?: number;
}

interface ParticleProps {
  trigger: number;
  cx: number;
  cy: number;
  angleDeg: number;
  distance: number;
  color: string;
  size: number;
  delay: number;
}

const Particle: React.FC<ParticleProps> = ({ trigger, cx, cy, angleDeg, distance, color, size, delay }) => {
  const t = useSharedValue(0);

  React.useEffect(() => {
    t.value = 0;
    setTimeout(() => {
      t.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    }, delay);
  }, [trigger, t, delay]);

  const animStyle = useAnimatedStyle(() => {
    const rad = (angleDeg * Math.PI) / 180;
    const dx = Math.cos(rad) * distance * t.value;
    // Add a little gravity: parabolic dy
    const dy = Math.sin(rad) * distance * t.value + Math.pow(t.value, 2) * 80;
    return {
      transform: [{ translateX: dx }, { translateY: dy }, { rotate: `${360 * t.value}deg` }],
      opacity: 1 - t.value,
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        {
          left: cx - size / 2,
          top: cy - size / 2,
          width: size,
          height: size,
          backgroundColor: color,
        },
        animStyle,
      ]}
    />
  );
};

const COLORS = [
  PALETTE.yellowBright,
  PALETTE.greenGo,
  PALETTE.redHot,
  PALETTE.blueIce,
  PALETTE.orangeBall,
  PALETTE.purpleSpace,
];

export const ConfettiBurst: React.FC<ConfettiBurstProps> = ({
  trigger,
  cx,
  cy,
  count = 24,
  maxRadius = 220,
}) => {
  if (trigger === 0) return null;
  const particles: React.ReactElement[] = [];
  // Deterministic per-trigger seed so particles look "burst-like" but consistent.
  const seed = trigger * 101;
  for (let i = 0; i < count; i++) {
    const r = pseudoRand(seed + i * 37);
    const angle = (i / count) * 360 + r * 30;
    const distance = maxRadius * (0.5 + r * 0.5);
    const color = COLORS[(i + Math.floor(r * 7)) % COLORS.length]!;
    const size = 4 + Math.floor(r * 4) * 2;
    const delay = Math.floor(r * 80);
    particles.push(
      <Particle
        key={`${trigger}-${i}`}
        trigger={trigger}
        cx={cx}
        cy={cy}
        angleDeg={angle}
        distance={distance}
        color={color}
        size={size}
        delay={delay}
      />
    );
  }
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>{particles}</View>;
};

function pseudoRand(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: PALETTE.black,
  },
});
