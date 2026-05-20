import React from 'react';
import Svg, { Rect } from 'react-native-svg';
import { PALETTE } from '@/constants/theme';

interface BasketSpriteProps {
  size?: number;
  /** Whether the rim is "boosted" by the Bigger Rim power-up — we render a glow ring. */
  big?: boolean;
}

/**
 * 8-bit basketball hoop:
 *   - red rim (horizontal pixel band)
 *   - orange backboard "L" supports
 *   - white pixel net (4 short hanging strands)
 *
 * Drawn as a 16×10 grid where each cell is `size/16` px.
 */
const COLS = 16;
const ROWS = 10;

const PIXEL_MAP: string[] = [
  // row 0: backboard top
  'WWWWWWWWWWWWWWWW',
  'W..............W',
  'W...BBBBBBBB...W',
  'W...BBBBBBBB...W',
  'W..............W',
  '.RRRRRRRRRRRRRR.',
  '..N..N..N..N..N.',
  '...N..N.N..N....',
  '....N...N...N...',
  '.....N..N..N....',
];

const COLORS: Record<string, string> = {
  W: PALETTE.lineWhite,
  B: '#1a1a2a',
  R: PALETTE.redHot,
  N: PALETTE.lineWhite,
};

export const BasketSprite: React.FC<BasketSpriteProps> = ({ size = 110, big = false }) => {
  const pixel = size / COLS;
  const cells: React.ReactElement[] = [];
  for (let r = 0; r < ROWS; r++) {
    const row = PIXEL_MAP[r]!;
    for (let c = 0; c < COLS; c++) {
      const ch = row[c]!;
      if (ch === '.') continue;
      const fill = COLORS[ch];
      if (!fill) continue;
      cells.push(
        <Rect
          key={`${r}-${c}`}
          x={c * pixel}
          y={r * pixel}
          width={pixel + 0.5}
          height={pixel + 0.5}
          fill={fill}
        />
      );
    }
  }
  // Bigger Rim glow: extra translucent rectangles around the rim row.
  const rimY = 5 * pixel;
  const glowExtra = big
    ? [
        <Rect key="g1" x={-pixel} y={rimY - pixel} width={size + 2 * pixel} height={pixel * 3} fill={PALETTE.yellowBright} opacity={0.35} />,
      ]
    : [];

  return (
    <Svg width={size} height={(size * ROWS) / COLS} viewBox={`0 0 ${COLS * pixel} ${ROWS * pixel}`}>
      {glowExtra}
      {cells}
    </Svg>
  );
};

export const BASKET_RIM_OFFSET_FACTOR = 0.55; // rim center y as fraction of sprite height
