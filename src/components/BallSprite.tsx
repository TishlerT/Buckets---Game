import React from 'react';
import Svg, { Rect } from 'react-native-svg';
import { PALETTE } from '@/constants/theme';
import { SkinId } from '@/constants/gameConfig';

interface BallSpriteProps {
  size?: number;
  /** Optional rotation in degrees for spin frames. */
  rotation?: number;
  /** Skin id from progression. Re-tints the orange palette. */
  skin?: SkinId;
}

const SKIN_PALETTES: Record<SkinId, { primary: string; shadow: string; line: string }> = {
  classic: { primary: PALETTE.orangeBall, shadow: PALETTE.orangeShadow, line: PALETTE.black },
  neon: { primary: PALETTE.greenGo, shadow: '#2a8a2a', line: PALETTE.black },
  gold: { primary: PALETTE.yellowBright, shadow: '#a8810f', line: PALETTE.black },
  ghost: { primary: PALETTE.purpleSpace, shadow: '#5a2da0', line: PALETTE.lineWhite },
};

/**
 * 8-bit basketball drawn as a 10×10 grid of pixel rects.
 *
 *      0 1 2 3 4 5 6 7 8 9
 *  0   . . . S S S S . . .
 *  1   . . S O O O O S . .
 *  2   . S O O L O O O S .
 *  3   S O O O L O O O O S
 *  4   S O L L L L L L O S
 *  5   S O O O L O O O O S
 *  6   . S O O L O O O S .
 *  7   . . S O O O O S . .
 *  8   . . . S S S S . . .
 *
 * S = shadow / outline, O = orange, L = line (darker stripe).
 * We render this as raw rectangles for crisp pixel fidelity at any DPI.
 */
const PIXEL_MAP: string[] = [
  '...SSSS...',
  '..SOOOOS..',
  '.SOOOLOOOS',
  'SOOOLOOOOS',
  'SOLLLLLLOS',
  'SOOOLOOOOS',
  '.SOOOLOOOS',
  '..SOOOOS..',
  '...SSSS...',
];

const COLS = 10;
const ROWS = 9;

export const BallSprite: React.FC<BallSpriteProps> = ({ size = 48, rotation = 0, skin = 'classic' }) => {
  const palette = SKIN_PALETTES[skin] ?? SKIN_PALETTES.classic;
  const pixelColor: Record<string, string> = {
    S: palette.shadow,
    O: palette.primary,
    L: palette.line,
  };
  const pixel = size / COLS;
  const cells: React.ReactElement[] = [];
  for (let r = 0; r < ROWS; r++) {
    const row = PIXEL_MAP[r]!;
    for (let c = 0; c < COLS; c++) {
      const ch = row[c]!;
      if (ch === '.') continue;
      const color = pixelColor[ch];
      if (!color) continue;
      cells.push(
        <Rect
          key={`${r}-${c}`}
          x={c * pixel}
          y={r * pixel}
          width={pixel + 0.5}
          height={pixel + 0.5}
          fill={color}
        />
      );
    }
  }
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${COLS * pixel} ${ROWS * pixel}`}
      style={{ transform: [{ rotate: `${rotation}deg` }] }}
    >
      {cells}
    </Svg>
  );
};
