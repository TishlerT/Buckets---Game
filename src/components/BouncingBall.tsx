import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { BallSprite } from './BallSprite';

interface BouncingBallProps {
  size?: number;
  /** Vertical travel distance for the bounce in px. */
  amplitude?: number;
  /** One full up+down cycle in ms. */
  durationMs?: number;
  /** Horizontal position as 0..1 of the screen width. */
  xRatio?: number;
  /** Bottom offset in px. */
  bottomOffset?: number;
}

/**
 * Decorative bouncing pixel basketball used as background flair on HomeScreen.
 * Uses Reanimated worklets so it runs on the UI thread at 60fps even when JS is busy.
 */
export const BouncingBall: React.FC<BouncingBallProps> = ({
  size = 56,
  amplitude = 140,
  durationMs = 900,
  xRatio = 0.5,
  bottomOffset = 80,
}) => {
  const { width } = useWindowDimensions();
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const squish = useSharedValue(1);

  React.useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-amplitude, { duration: durationMs / 2, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: durationMs / 2, easing: Easing.in(Easing.quad) })
      ),
      -1,
      false
    );
    rotate.value = withRepeat(
      withTiming(360, { duration: durationMs * 1.5, easing: Easing.linear }),
      -1,
      false
    );
    squish.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 70, easing: Easing.out(Easing.quad) }),
        withTiming(1.05, { duration: 90, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: durationMs - 160, easing: Easing.linear })
      ),
      -1,
      false
    );
  }, [amplitude, durationMs, translateY, rotate, squish]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scaleY: squish.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const leftPx = Math.max(0, Math.min(width - size, width * xRatio - size / 2));

  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { left: leftPx, bottom: bottomOffset, width: size, height: size }]}
    >
      <Animated.View style={animStyle}>
        <BallSprite size={size} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'absolute' },
});
