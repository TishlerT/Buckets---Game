import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { PALETTE } from '@/constants/theme';

interface SmokePuffProps {
  trigger: number;
  cx: number;
  cy: number;
}

/**
 * Pixel smoke puff used after a brick. A handful of grey rounded squares
 * rise upward and fade. Communicates "missed badly" without sound.
 */
export const SmokePuff: React.FC<SmokePuffProps> = ({ trigger, cx, cy }) => {
  if (trigger === 0) return null;
  const puffs = [
    { dx: 0, dy: -20, size: 18, color: PALETTE.fog, delay: 0 },
    { dx: -10, dy: -36, size: 14, color: PALETTE.lineWhite, delay: 60 },
    { dx: 12, dy: -52, size: 10, color: PALETTE.fog, delay: 120 },
  ];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {puffs.map((p, i) => (
        <Puff key={`${trigger}-${i}`} trigger={trigger} cx={cx} cy={cy} {...p} />
      ))}
    </View>
  );
};

interface PuffProps {
  trigger: number;
  cx: number;
  cy: number;
  dx: number;
  dy: number;
  size: number;
  color: string;
  delay: number;
}
const Puff: React.FC<PuffProps> = ({ trigger, cx, cy, dx, dy, size, color, delay }) => {
  const t = useSharedValue(0);
  React.useEffect(() => {
    t.value = 0;
    setTimeout(() => {
      t.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) });
    }, delay);
  }, [trigger, delay, t]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dx * t.value },
      { translateY: dy * t.value },
      { scale: 0.5 + t.value * 0.6 },
    ],
    opacity: 1 - t.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.puff,
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

const styles = StyleSheet.create({
  puff: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: PALETTE.shadow,
  },
});
