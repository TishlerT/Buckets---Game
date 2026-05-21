import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { PALETTE } from '@/constants/theme';
import { CONFIG } from '@/constants/gameConfig';

interface ContestedGlowProps {
  /** Visible iff the defender is within contest range of the shooter. */
  visible: boolean;
  /** Glow center on the world coords. */
  cx: number;
  cy: number;
  /** Diameter of the glow ring in px. */
  size?: number;
}

/**
 * Pulsating red glow under the shooter when a defender is within contest
 * range. Subtle by design — the player should *feel* the pressure but the
 * sprite must still read clearly through the glow.
 */
export const ContestedGlow: React.FC<ContestedGlowProps> = ({
  visible,
  cx,
  cy,
  size = 160,
}) => {
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      opacity.value = withRepeat(
        withTiming(CONFIG.CONTESTED_GLOW_OPACITY, {
          duration: 480,
          easing: Easing.inOut(Easing.quad),
        }),
        -1,
        true
      );
    } else {
      opacity.value = withTiming(0, { duration: 220 });
    }
  }, [visible, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.glow,
        {
          width: size,
          height: size,
          left: cx - size / 2,
          top: cy - size / 2,
          borderRadius: size / 2,
        },
        animStyle,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    backgroundColor: PALETTE.redHot,
    // Slight outer "halo" by shadow on native; harmless on web.
    shadowColor: PALETTE.redHot,
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
});
