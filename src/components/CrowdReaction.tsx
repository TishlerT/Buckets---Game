import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { PALETTE } from '@/constants/theme';

interface CrowdReactionProps {
  /** Bumps when the crowd should react (every make / every block). */
  trigger: number;
  /** Top Y of the crowd band in the court background. */
  top: number;
  /** Height of the crowd band. */
  height: number;
}

/**
 * Two-frame crowd reaction overlay. When `trigger` bumps:
 *   1) the crowd band briefly brightens (white flash overlay at ~25% alpha)
 *   2) lifts upward 4-6px to simulate everyone jumping
 *   3) returns to rest
 *
 * Rendered on top of the back-of-court crowd in CourtBackground. The flash
 * is a single rect colored to match an excited crowd lighting up.
 */
export const CrowdReaction: React.FC<CrowdReactionProps> = ({
  trigger,
  top,
  height,
}) => {
  const opacity = useSharedValue(0);
  const dy = useSharedValue(0);

  React.useEffect(() => {
    if (trigger === 0) return;
    opacity.value = withSequence(
      withTiming(0.32, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 320, easing: Easing.in(Easing.quad) })
    );
    dy.value = withSequence(
      withTiming(-6, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 200, easing: Easing.inOut(Easing.quad) })
    );
  }, [trigger, opacity, dy]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: dy.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.band,
        { top, height },
        animStyle,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: PALETTE.yellowBright,
  },
});
