import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface ScreenShakeProps extends ViewProps {
  /** Bumps a number when you want a fresh shake. */
  trigger: number;
  /** Max pixel offset for the shake (3-5 is "subtle"). */
  amplitude?: number;
  /** Total shake duration in ms. */
  durationMs?: number;
}

/**
 * Wrap children in <ScreenShake trigger={n}> — when `trigger` changes,
 * the wrapper performs a brief 4-step jitter on translateX/Y. Subtle
 * by default (3px / 220ms) per spec ("3-5px"). Runs entirely on the
 * UI thread via Reanimated worklets.
 */
export const ScreenShake: React.FC<ScreenShakeProps> = ({
  trigger,
  amplitude = 4,
  durationMs = 220,
  style,
  children,
  ...rest
}) => {
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);

  React.useEffect(() => {
    if (trigger === 0) return;
    const step = durationMs / 4;
    dx.value = withSequence(
      withTiming(amplitude, { duration: step, easing: Easing.linear }),
      withTiming(-amplitude, { duration: step }),
      withTiming(amplitude * 0.6, { duration: step }),
      withTiming(0, { duration: step })
    );
    dy.value = withSequence(
      withTiming(-amplitude * 0.6, { duration: step, easing: Easing.linear }),
      withTiming(amplitude, { duration: step }),
      withTiming(-amplitude * 0.4, { duration: step }),
      withTiming(0, { duration: step })
    );
  }, [trigger, amplitude, durationMs, dx, dy]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dx.value }, { translateY: dy.value }],
  }));

  return (
    <Animated.View style={[styles.fill, style, animStyle]} {...rest}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
