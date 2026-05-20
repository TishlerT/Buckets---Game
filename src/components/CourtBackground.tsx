import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { COURT_PALETTES, PALETTE } from '@/constants/theme';
import { CourtId } from '@/constants/gameConfig';

interface CourtBackgroundProps {
  width: number;
  height: number;
  /** Which court palette to render. */
  court?: CourtId;
  /**
   * 'offense' = looking AT the basket from beyond the arc.
   * 'defense' = looking OUT from under the basket toward the shooter.
   */
  perspective: 'offense' | 'defense';
}

/**
 * Pixel-art court drawn entirely with SVG primitives. We keep it intentionally
 * simple: a sky band, a wood floor with a 3-point arc and free-throw lane.
 *
 * For OFFENSE perspective the basket appears small in the upper third — we draw
 * the floor receding upward.
 *
 * For DEFENSE perspective the player is under the basket: the floor recedes
 * away to the bottom (camera flipped). The shooter will be drawn beyond the arc.
 */
export const CourtBackground: React.FC<CourtBackgroundProps> = ({
  width,
  height,
  court = 'playground',
  perspective,
}) => {
  const palette = COURT_PALETTES[court];

  // Horizon = where the wood floor starts.
  const horizonY = perspective === 'offense' ? height * 0.35 : height * 0.7;
  const arcCenterX = width / 2;

  // The 3-point arc bows toward the camera; in offense it's bottom-bowed;
  // in defense (looking out) it's top-bowed.
  const arcRadius = width * 0.55;
  const arcTopY =
    perspective === 'offense' ? height * 0.85 : height * 0.45;

  // Free throw lane "rectangle" toward the basket.
  const laneWidth = width * 0.28;
  const laneLeft = arcCenterX - laneWidth / 2;

  // For the offense view we draw a key/lane band leading up to the basket.
  const lanePath =
    perspective === 'offense'
      ? `M ${laneLeft} ${horizonY}
         L ${arcCenterX - laneWidth * 0.18} ${horizonY * 0.55}
         L ${arcCenterX + laneWidth * 0.18} ${horizonY * 0.55}
         L ${laneLeft + laneWidth} ${horizonY}
         Z`
      : `M ${arcCenterX - laneWidth * 0.42} ${height}
         L ${laneLeft} ${horizonY}
         L ${laneLeft + laneWidth} ${horizonY}
         L ${arcCenterX + laneWidth * 0.42} ${height}
         Z`;

  // 3-point arc.
  const arcPath =
    perspective === 'offense'
      ? `M ${arcCenterX - arcRadius} ${arcTopY}
         Q ${arcCenterX} ${arcTopY - arcRadius * 0.55} ${arcCenterX + arcRadius} ${arcTopY}`
      : `M ${arcCenterX - arcRadius} ${arcTopY}
         Q ${arcCenterX} ${arcTopY + arcRadius * 0.55} ${arcCenterX + arcRadius} ${arcTopY}`;

  return (
    <View style={[styles.fill, { width, height, backgroundColor: PALETTE.black }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={palette.sky} />
            <Stop offset="100%" stopColor={palette.skyAccent} />
          </LinearGradient>
          <LinearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={palette.floor} />
            <Stop offset="100%" stopColor={palette.floorAccent} />
          </LinearGradient>
        </Defs>

        {/* sky band */}
        <Rect
          x={0}
          y={0}
          width={width}
          height={perspective === 'offense' ? horizonY : horizonY}
          fill="url(#sky)"
        />
        {/* floor band */}
        <Rect
          x={0}
          y={perspective === 'offense' ? horizonY : horizonY}
          width={width}
          height={height}
          fill="url(#floor)"
        />
        {/* horizontal stripe of pixel "boards" */}
        {Array.from({ length: 6 }).map((_, i) => {
          const stripeY =
            perspective === 'offense'
              ? horizonY + (i + 1) * ((height - horizonY) / 7)
              : horizonY + (i + 1) * ((height - horizonY) / 7);
          return (
            <Rect
              key={i}
              x={0}
              y={stripeY}
              width={width}
              height={1.5}
              fill={palette.floorAccent}
              opacity={0.35}
            />
          );
        })}
        {/* lane */}
        <Path d={lanePath} fill="rgba(0,0,0,0.0)" stroke={palette.line} strokeWidth={3} />
        {/* 3-point arc */}
        <Path d={arcPath} stroke={palette.line} strokeWidth={4} fill="none" />
        {/* baseline */}
        <Rect
          x={0}
          y={perspective === 'offense' ? horizonY * 0.55 : height - 6}
          width={width}
          height={3}
          fill={palette.line}
        />
        {/* small accent stars in the sky for "space" / "rooftop" courts */}
        {(court === 'space' || court === 'rooftop') &&
          Array.from({ length: 18 }).map((_, i) => (
            <Rect
              key={`star-${i}`}
              x={(i * 53) % width}
              y={(i * 31) % (horizonY - 10)}
              width={2}
              height={2}
              fill={palette.accent}
              opacity={0.85}
            />
          ))}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
