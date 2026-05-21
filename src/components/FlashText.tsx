import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { FONT, PALETTE } from '@/constants/theme';
import { CONFIG } from '@/constants/gameConfig';

interface FlashTextProps {
  /** Bumps when a new flash should fire. */
  trigger: number;
  /** Text to display. Set when triggering — kept across the fade. */
  text: string;
  /** Color of the text (default = yellow). */
  color?: string;
  /** Total visible duration in ms (default = CONFIG.FLASH_TEXT_DURATION_MS). */
  durationMs?: number;
}

/**
 * Center-screen flash text used for moments like "PERFECT!" / "BLOCKED!".
 * Pops in (scale 0.5 -> 1.15 -> 1.0) then fades out. Pure Reanimated so
 * it's smooth without a JS heartbeat.
 *
 * Render once at the screen root, then bump `trigger` to fire.
 */
export const FlashText: React.FC<FlashTextProps> = ({
  trigger,
  text,
  color = PALETTE.yellowBright,
  durationMs = CONFIG.FLASH_TEXT_DURATION_MS,
}) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  React.useEffect(() => {
    if (trigger === 0) return;
    opacity.value = withSequence(
      withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: durationMs - 240 }),
      withTiming(0, { duration: 150, easing: Easing.in(Easing.quad) })
    );
    scale.value = withSequence(
      withTiming(1.18, { duration: 120, easing: Easing.out(Easing.back(1.6)) }),
      withTiming(1.0, { duration: 100 })
    );
  }, [trigger, durationMs, opacity, scale]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (trigger === 0) return null;
  return (
    <Animated.View style={[styles.wrap, animStyle]} pointerEvents="none">
      <Text style={[styles.shadow]}>{text}</Text>
      <Text style={[styles.text, { color }]}>{text}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: '36%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Pixel "drop shadow" — a second copy offset down-right by 3px.
  shadow: {
    position: 'absolute',
    fontFamily: FONT.family,
    fontSize: FONT.titleL,
    color: PALETTE.black,
    letterSpacing: 2,
    transform: [{ translateX: 3 }, { translateY: 3 }],
  },
  text: {
    fontFamily: FONT.family,
    fontSize: FONT.titleL,
    letterSpacing: 2,
  },
});
