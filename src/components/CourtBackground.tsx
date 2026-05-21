import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { COURT_PALETTES, PALETTE } from '@/constants/theme';
import { CourtId, LAYOUT } from '@/constants/gameConfig';

interface CourtBackgroundProps {
  width: number;
  height: number;
  /** Which court palette to render. */
  court?: CourtId;
  /**
   * 'offense' = third-person behind the shooter, looking AT the basket.
   * 'defense' = first-person under the basket, looking OUT at the shooter.
   */
  perspective: 'offense' | 'defense';
  /**
   * Horizontal parallax shift in px (positive = scene drifts left as player
   * moves right). Applied to the world layer only; sky/crowd stay anchored
   * so the parallax feels physical instead of dizzying.
   */
  parallaxOffsetX?: number;
}

/**
 * Third-person playground court matched to Reference Image 2.
 *
 * Layers, back to front:
 *   1. Sky gradient (dusk → orange horizon)
 *   2. City silhouettes against the sky
 *   3. Trees framing the left/right edges
 *   4. Pixel crowd lining the back of the court
 *   5. Asphalt court surface with painted lines + 3PT arc
 *   6. Painted hash marks / cracks (subtle pixel noise)
 *
 * The arc is drawn so its lowest point is just under the shooter (mid-screen
 * bottom), curving up toward the basket. This sells the perspective without
 * a true 3D camera.
 *
 * Sky is the ONLY layer that uses a gradient (per spec). Everything else is
 * flat color rectangles to keep the pixel-art feel.
 */
export const CourtBackground: React.FC<CourtBackgroundProps> = ({
  width,
  height,
  court = 'playground',
  perspective,
  parallaxOffsetX = 0,
}) => {
  const palette = COURT_PALETTES[court];

  if (perspective === 'defense') {
    return (
      <DefenseBackground
        width={width}
        height={height}
        court={court}
        palette={palette}
        parallaxOffsetX={parallaxOffsetX}
      />
    );
  }
  return (
    <OffenseBackground
      width={width}
      height={height}
      court={court}
      palette={palette}
      parallaxOffsetX={parallaxOffsetX}
    />
  );
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Palette = (typeof COURT_PALETTES)[CourtId];

/**
 * Deterministic pseudo-random — drives the crowd / crack placement without
 * making everything re-roll on every render.
 */
function rand(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

// ---------------------------------------------------------------------------
// Offense view — third-person behind the shooter
// ---------------------------------------------------------------------------

const OffenseBackground: React.FC<{
  width: number;
  height: number;
  court: CourtId;
  palette: Palette;
  parallaxOffsetX: number;
}> = ({ width, height, court, palette, parallaxOffsetX }) => {
  // Horizon = where sky meets court.
  const horizonY = height * 0.32;
  const crowdTop = horizonY - 4;
  const crowdHeight = height * LAYOUT.crowdBandHeightFraction;
  const crowdBottom = crowdTop + crowdHeight;
  const courtTop = crowdBottom;

  return (
    <View style={[styles.fill, { width, height, backgroundColor: PALETTE.skyTop }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="bk-sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={PALETTE.skyTop} />
            <Stop offset="55%" stopColor={PALETTE.skyMid} />
            <Stop offset="100%" stopColor={PALETTE.skyHorizon} />
          </LinearGradient>
        </Defs>

        {/* Sky band */}
        <Rect x={0} y={0} width={width} height={horizonY + 2} fill="url(#bk-sky)" />

        {/* City silhouette — variable-height pixel buildings */}
        <Cityscape width={width} horizonY={horizonY} />

        {/* Trees framing the edges */}
        <TreeCluster x={0} baseY={horizonY} side="left" />
        <TreeCluster x={width} baseY={horizonY} side="right" />

        {/* Crowd band along the back of the court */}
        <Crowd
          width={width}
          top={crowdTop}
          height={crowdHeight}
          palette={palette}
        />

        {/* Asphalt floor */}
        <Rect
          x={0}
          y={courtTop}
          width={width}
          height={height - courtTop}
          fill={PALETTE.courtAsphalt}
        />

        {/* Worn lighter patches across the asphalt */}
        {Array.from({ length: 18 }).map((_, i) => {
          const px = rand(i + 11) * width;
          const py = courtTop + rand(i + 33) * (height - courtTop);
          const w = 12 + rand(i + 7) * 30;
          const h = 4 + rand(i + 91) * 8;
          return (
            <Rect
              key={`patch-${i}`}
              x={px}
              y={py}
              width={w}
              height={h}
              fill={PALETTE.courtAsphaltLight}
              opacity={0.18}
            />
          );
        })}

        {/* Cracks — short randomized line segments */}
        {Array.from({ length: 22 }).map((_, i) => {
          const px = rand(i + 5) * width;
          const py = courtTop + 10 + rand(i + 19) * (height - courtTop - 20);
          const dx = (rand(i + 41) - 0.5) * 36;
          const dy = (rand(i + 67) - 0.5) * 4;
          return (
            <Path
              key={`crack-${i}`}
              d={`M ${px} ${py} l ${dx} ${dy}`}
              stroke={PALETTE.courtAsphaltDark}
              strokeWidth={1.4}
              opacity={0.55}
            />
          );
        })}

        {/* World layer — painted court lines (this is what parallax-shifts) */}
        <G transform={`translate(${parallaxOffsetX}, 0)`}>
          <PaintedCourtLines
            width={width}
            height={height}
            courtTop={courtTop}
            palette={palette}
          />
        </G>

        {/* Backboard pole anchored on the court (visual depth) */}
        <BackboardPole width={width} courtTop={courtTop} />

        {/* Stars for "space" / "rooftop" courts retained from old impl */}
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

// ---------------------------------------------------------------------------
// Defense view — looking out from under the basket toward the shooter
// ---------------------------------------------------------------------------

const DefenseBackground: React.FC<{
  width: number;
  height: number;
  court: CourtId;
  palette: Palette;
  parallaxOffsetX: number;
}> = ({ width, height, palette, parallaxOffsetX }) => {
  // Camera is now under the basket looking out. Horizon is lower and the
  // arc bows AWAY from camera (top-bowed).
  const horizonY = height * 0.55;
  const crowdTop = horizonY - 4;
  const crowdHeight = height * 0.1;
  const courtTop = crowdTop + crowdHeight;
  const arcCenterX = width / 2;
  const arcRadius = width * 0.55;
  const arcTopY = courtTop + (height - courtTop) * 0.35;

  return (
    <View style={[styles.fill, { width, height, backgroundColor: PALETTE.skyTop }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="bk-sky-def" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={PALETTE.skyTop} />
            <Stop offset="70%" stopColor={PALETTE.skyMid} />
            <Stop offset="100%" stopColor={PALETTE.skyHorizon} />
          </LinearGradient>
        </Defs>

        <Rect x={0} y={0} width={width} height={horizonY + 2} fill="url(#bk-sky-def)" />
        <Cityscape width={width} horizonY={horizonY} dense />
        <TreeCluster x={0} baseY={horizonY} side="left" />
        <TreeCluster x={width} baseY={horizonY} side="right" />
        <Crowd width={width} top={crowdTop} height={crowdHeight} palette={palette} />

        {/* Asphalt floor — bigger band since camera is low */}
        <Rect
          x={0}
          y={courtTop}
          width={width}
          height={height - courtTop}
          fill={PALETTE.courtAsphalt}
        />

        {/* World-layer painted lane lines receding away from camera. */}
        <G transform={`translate(${parallaxOffsetX}, 0)`}>
          {/* Lane receding to horizon */}
          <Path
            d={`M ${arcCenterX - width * 0.22} ${height}
                L ${arcCenterX - width * 0.08} ${courtTop + 30}
                L ${arcCenterX + width * 0.08} ${courtTop + 30}
                L ${arcCenterX + width * 0.22} ${height} Z`}
            fill={PALETTE.courtKeyOrange}
            opacity={0.55}
          />
          <Path
            d={`M ${arcCenterX - width * 0.22} ${height}
                L ${arcCenterX - width * 0.08} ${courtTop + 30}`}
            stroke={palette.line}
            strokeWidth={4}
          />
          <Path
            d={`M ${arcCenterX + width * 0.22} ${height}
                L ${arcCenterX + width * 0.08} ${courtTop + 30}`}
            stroke={palette.line}
            strokeWidth={4}
          />

          {/* 3PT arc bowed away from camera (top-bowed) */}
          <Path
            d={`M ${arcCenterX - arcRadius} ${arcTopY}
                Q ${arcCenterX} ${arcTopY - arcRadius * 0.45} ${arcCenterX + arcRadius} ${arcTopY}`}
            stroke={palette.line}
            strokeWidth={4}
            fill="none"
          />
        </G>
      </Svg>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Variable-height pixel buildings along the horizon. */
const Cityscape: React.FC<{
  width: number;
  horizonY: number;
  dense?: boolean;
}> = ({ width, horizonY, dense }) => {
  const buildingW = dense ? 14 : 18;
  const count = Math.ceil(width / buildingW) + 1;
  const buildings: React.ReactElement[] = [];
  for (let i = 0; i < count; i++) {
    const h = 14 + rand(i + 1) * 70;
    const tall = rand(i + 99) > 0.78;
    const finalH = tall ? h + 24 : h;
    const color = tall ? PALETTE.citySilhouetteAccent : PALETTE.citySilhouette;
    const x = i * buildingW;
    buildings.push(
      <Rect
        key={`b-${i}`}
        x={x}
        y={horizonY - finalH}
        width={buildingW + 1}
        height={finalH + 2}
        fill={color}
      />
    );
    // Windows — single pixel lights
    const windows = Math.floor(finalH / 14);
    for (let w = 0; w < windows; w++) {
      if (rand(i * 13 + w) > 0.6) {
        buildings.push(
          <Rect
            key={`w-${i}-${w}`}
            x={x + 4 + ((w + i) % 2) * 5}
            y={horizonY - finalH + 6 + w * 12}
            width={2}
            height={2}
            fill={PALETTE.yellowBright}
            opacity={0.7}
          />
        );
      }
    }
  }
  return <G>{buildings}</G>;
};

/** A pixel tree silhouette anchored to the horizon. */
const TreeCluster: React.FC<{
  x: number;
  baseY: number;
  side: 'left' | 'right';
}> = ({ x, baseY, side }) => {
  const dir = side === 'left' ? 1 : -1;
  const trunkX = x + dir * 14;
  const canopyCx = trunkX + dir * 16;
  return (
    <G>
      {/* Trunk */}
      <Rect
        x={trunkX - 3}
        y={baseY - 38}
        width={6}
        height={42}
        fill={PALETTE.treeDark}
      />
      {/* Canopy — three stacked ellipses */}
      <Ellipse cx={canopyCx} cy={baseY - 70} rx={42} ry={30} fill={PALETTE.treeDark} />
      <Ellipse cx={canopyCx - dir * 12} cy={baseY - 86} rx={30} ry={22} fill={PALETTE.treeMid} />
      <Ellipse cx={canopyCx + dir * 10} cy={baseY - 56} rx={28} ry={20} fill={PALETTE.treeDark} />
    </G>
  );
};

/** Pixel crowd — densely-packed varied-color silhouettes. */
const Crowd: React.FC<{
  width: number;
  top: number;
  height: number;
  palette: Palette;
}> = ({ width, top, height }) => {
  const heads: React.ReactElement[] = [];
  const headSize = 7;
  const cols = Math.ceil(width / (headSize - 1));
  const rows = Math.max(1, Math.floor(height / (headSize - 2)));
  // Crowd palette — varied skin tones + clothing colors.
  const shirts = [
    '#7f3f3f',
    '#3f6f7f',
    '#7f7f3f',
    '#5b3f7f',
    '#3f7f5b',
    '#7f5b3f',
    '#3f3f3f',
    '#6f3f5b',
    '#4f7f3f',
    '#3f4f7f',
  ];
  const skins = ['#d8a06b', '#a37049', '#f4cda3', '#7a4a2a', '#c98f6b'];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const seed = r * cols + c;
      const x = c * (headSize - 1) + ((r % 2) * (headSize / 2));
      const y = top + r * (headSize - 2);
      const skin = skins[Math.floor(rand(seed + 1) * skins.length) % skins.length]!;
      const shirt = shirts[Math.floor(rand(seed + 2) * shirts.length) % shirts.length]!;
      // shirt body
      heads.push(
        <Rect
          key={`cs-${seed}`}
          x={x}
          y={y + headSize * 0.7}
          width={headSize}
          height={headSize * 0.8}
          fill={shirt}
        />
      );
      // head on top
      heads.push(
        <Rect
          key={`ch-${seed}`}
          x={x + 1}
          y={y}
          width={headSize - 2}
          height={headSize - 2}
          fill={skin}
        />
      );
    }
  }
  return <G>{heads}</G>;
};

/**
 * Painted court markings on the asphalt floor — drawn from the camera's
 * perspective. The 3PT arc bows toward the camera at the bottom. A free-
 * throw key recedes upward to the basket. Sideline + baselines anchor
 * the geometry.
 */
const PaintedCourtLines: React.FC<{
  width: number;
  height: number;
  courtTop: number;
  palette: Palette;
}> = ({ width, height, courtTop, palette }) => {
  const cx = width / 2;
  const courtH = height - courtTop;

  // Free-throw key (trapezoid receding upward toward the basket).
  // Near corners are wide, far corners are narrow → perspective.
  const nearKeyHalfW = width * 0.18;
  const farKeyHalfW = width * 0.085;
  const keyNearY = height - courtH * 0.05;
  const keyFarY = courtTop + courtH * 0.18;

  // 3PT arc — anchored at sideline corners near the baseline, bowing
  // toward the camera so its lowest point sits below the player's feet.
  const arcLeftX = width * 0.04;
  const arcRightX = width - arcLeftX;
  const arcAnchorY = courtTop + courtH * 0.42;
  const arcBowY = height + courtH * 0.05;

  return (
    <G>
      {/* Painted key (semi-transparent orange like the reference) */}
      <Path
        d={`M ${cx - nearKeyHalfW} ${keyNearY}
            L ${cx - farKeyHalfW} ${keyFarY}
            L ${cx + farKeyHalfW} ${keyFarY}
            L ${cx + nearKeyHalfW} ${keyNearY} Z`}
        fill={PALETTE.courtKeyOrange}
        opacity={0.45}
      />
      {/* Key outline */}
      <Path
        d={`M ${cx - nearKeyHalfW} ${keyNearY}
            L ${cx - farKeyHalfW} ${keyFarY}`}
        stroke={palette.line}
        strokeWidth={3}
      />
      <Path
        d={`M ${cx + nearKeyHalfW} ${keyNearY}
            L ${cx + farKeyHalfW} ${keyFarY}`}
        stroke={palette.line}
        strokeWidth={3}
      />
      {/* Far end of the key (under the basket) */}
      <Path
        d={`M ${cx - farKeyHalfW} ${keyFarY} L ${cx + farKeyHalfW} ${keyFarY}`}
        stroke={palette.line}
        strokeWidth={3}
      />

      {/* Free-throw line + circle hint */}
      <Path
        d={`M ${cx - farKeyHalfW * 1.05} ${(keyNearY + keyFarY) * 0.55}
            L ${cx + farKeyHalfW * 1.05} ${(keyNearY + keyFarY) * 0.55}`}
        stroke={palette.line}
        strokeWidth={2}
        opacity={0.85}
      />

      {/* 3PT arc — bows down toward camera. */}
      <Path
        d={`M ${arcLeftX} ${arcAnchorY}
            Q ${cx} ${arcBowY} ${arcRightX} ${arcAnchorY}`}
        stroke={palette.line}
        strokeWidth={5}
        fill="none"
      />

      {/* Baselines — straight chunky pixel strip across the back of the court */}
      <Rect
        x={0}
        y={courtTop + courtH * 0.05}
        width={width}
        height={3}
        fill={palette.line}
        opacity={0.85}
      />
      {/* Sidelines */}
      <Rect
        x={2}
        y={courtTop + courtH * 0.05}
        width={3}
        height={height - (courtTop + courtH * 0.05)}
        fill={palette.line}
        opacity={0.6}
      />
      <Rect
        x={width - 5}
        y={courtTop + courtH * 0.05}
        width={3}
        height={height - (courtTop + courtH * 0.05)}
        fill={palette.line}
        opacity={0.6}
      />

      {/* "3PT ARC" floor decal between the player and the arc */}
      <PaintedDecal cx={cx} y={height * 0.92} text="3PT ARC" palette={palette} />
    </G>
  );
};

/** Tiny pixel-painted label on the court floor. */
const PaintedDecal: React.FC<{
  cx: number;
  y: number;
  text: string;
  palette: Palette;
}> = ({ cx, y, text, palette }) => {
  // Chunky 5px-tall block letters. We render rectangles instead of <Text>
  // so the decal scales with the court SVG and looks painted, not typed.
  const charW = 14;
  const totalW = charW * text.length;
  const startX = cx - totalW / 2;
  return (
    <G>
      {Array.from(text).map((ch, i) => (
        <Rect
          key={i}
          x={startX + i * charW}
          y={y}
          width={charW - 3}
          height={4}
          fill={palette.line}
          opacity={ch === ' ' ? 0 : 0.55}
        />
      ))}
    </G>
  );
};

/** Backboard pole extending from the court up behind the basket. */
const BackboardPole: React.FC<{ width: number; courtTop: number }> = ({
  width,
  courtTop,
}) => {
  const x = width / 2 - 3;
  return (
    <G>
      <Rect x={x} y={courtTop * 0.55} width={6} height={courtTop * 0.45} fill="#2a2a2a" />
    </G>
  );
};

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
