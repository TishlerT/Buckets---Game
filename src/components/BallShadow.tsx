import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';

interface BallShadowProps {
  /** UI-thread X of the ball (top-left of ball sprite, not center). */
  ballX: SharedValue<number>;
  /** UI-thread Y of the ball — used to compute shadow scale (taller = smaller shadow). */
  ballY: SharedValue<number>;
  /** Y on the floor where the shadow should always sit. */
  floorY: number;
  /** Width of the ball sprite (used to size the shadow). */
  ballSize: number;
}

/**
 * Soft oval shadow under the in-flight ball.
 *
 * Spec: "small oval shadow under the ball during flight, scales with height".
 *
 * The shadow sits at a fixed Y on the court floor. As the ball climbs (its
 * Y decreases on screen), the shadow shrinks and fades — selling that the
 * ball is leaving the ground.
 */
export const BallShadow: React.FC<BallShadowProps> = ({
  ballX,
  ballY,
  floorY,
  ballSize,
}) => {
  const baseW = ballSize * 0.9;
  const baseH = ballSize * 0.32;

  const animStyle = useAnimatedStyle(() => {
    // Distance from floor — bigger = higher ball.
    const dy = Math.max(0, floorY - ballY.value);
    // Map dy to scale 0.4..1.0 — taller shot = smaller, fainter shadow.
    const scale = Math.max(0.35, 1 - dy / 320);
    const opacity = 0.18 + 0.35 * scale;
    return {
      opacity,
      transform: [
        { translateX: ballX.value - baseW / 2 + ballSize / 2 },
        { translateY: floorY - baseH / 2 },
        { scale },
      ],
    };
  });

  return (
    <Animated.View style={[styles.wrap, animStyle]} pointerEvents="none">
      <View style={[styles.shadow, { width: baseW, height: baseH }]} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  shadow: {
    backgroundColor: '#000',
    borderRadius: 999,
  },
});
