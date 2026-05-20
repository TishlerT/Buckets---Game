import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { PALETTE } from '@/constants/theme';

interface TimingFlashProps {
  /** Pulse trigger — when this changes, the flash plays once. */
  trigger: number;
  size?: number;
}

/**
 * A pixel shimmer that pulses outward from a fixed position. Rendered as
 * three concentric rings expanding + fading. Drives the visual cue to swipe.
 */
export const TimingFlash: React.FC<TimingFlashProps> = ({ trigger, size = 200 }) => {
  const scale1 = useSharedValue(0);
  const scale2 = useSharedValue(0);
  const scale3 = useSharedValue(0);
  const opacity1 = useSharedValue(0);
  const opacity2 = useSharedValue(0);
  const opacity3 = useSharedValue(0);

  React.useEffect(() => {
    if (trigger === 0) return;
    const fire = (s: typeof scale1, o: typeof opacity1, delay: number) => {
      s.value = 0;
      o.value = 0;
      setTimeout(() => {
        s.value = withTiming(2.5, { duration: 460, easing: Easing.out(Easing.quad) });
        o.value = withTiming(0, { duration: 460 });
      }, delay);
      o.value = withTiming(0.85, { duration: 80, easing: Easing.out(Easing.quad) });
    };
    fire(scale1, opacity1, 0);
    fire(scale2, opacity2, 90);
    fire(scale3, opacity3, 180);
  }, [trigger, scale1, scale2, scale3, opacity1, opacity2, opacity3]);

  const ringStyle = (s: typeof scale1, o: typeof opacity1) =>
    useAnimatedStyle(() => ({
      transform: [{ scale: s.value }],
      opacity: o.value,
    }));

  const r1 = ringStyle(scale1, opacity1);
  const r2 = ringStyle(scale2, opacity2);
  const r3 = ringStyle(scale3, opacity3);

  const ringSize = size * 0.45;

  return (
    <View
      style={[styles.wrap, { width: size, height: size }]}
      pointerEvents="none"
    >
      <Animated.View
        style={[
          styles.ring,
          { width: ringSize, height: ringSize, borderColor: PALETTE.yellowBright },
          r1,
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          { width: ringSize, height: ringSize, borderColor: PALETTE.lineWhite },
          r2,
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          { width: ringSize, height: ringSize, borderColor: PALETTE.orangeBall },
          r3,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 4,
  },
});
