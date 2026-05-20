import React from 'react';
import Svg, { Rect } from 'react-native-svg';
import { PowerUpKind } from '@/constants/gameConfig';
import { PALETTE } from '@/constants/theme';

interface PowerUpSpriteProps {
  kind: PowerUpKind;
  size?: number;
  /** Bob frame: 0 (low) / 1 (high) — used by parent to animate. */
  frame?: 0 | 1;
}

/**
 * 12×12 pixel power-up icon. Each kind uses a different color + tiny glyph:
 *   biggerRim  — orange ring with "+"
 *   doubleJump — green up arrow with second arrow
 *   speedBoost — cyan lightning
 *   iceDefender — blue snowflake
 *   ghostShot  — purple spectre
 *
 * All wrapped in a yellow chevron diamond so they read as "power-up" at a glance.
 */
const ROWS = 12;
const COLS = 12;

const SHELL: string[] = [
  '.....BB.....',
  '....BYYB....',
  '...BYYYYB...',
  '..BYYYYYYB..',
  '.BYY....YYB.',
  'BYY......YYB',
  'BYY......YYB',
  '.BYY....YYB.',
  '..BYYYYYYB..',
  '...BYYYYB...',
  '....BYYB....',
  '.....BB.....',
];

// Per-kind 6×6 glyph stamped over the shell center
const GLYPHS: Record<PowerUpKind, { color: string; map: string[] }> = {
  biggerRim: {
    color: PALETTE.orangeBall,
    map: ['.OOOO.', 'O....O', 'O.OO.O', 'O.OO.O', 'O....O', '.OOOO.'],
  },
  doubleJump: {
    color: PALETTE.greenGo,
    map: ['..GG..', '.GGGG.', 'GG..GG', '..GG..', '.GGGG.', 'GG..GG'],
  },
  speedBoost: {
    color: PALETTE.blueIce,
    map: ['..ZZ..', '.ZZ...', 'ZZZZ..', '..ZZZZ', '...ZZ.', '..ZZ..'],
  },
  iceDefender: {
    color: PALETTE.lineWhite,
    map: ['..I.I.', '.III..', 'IIIIII', '.III..', '..I.I.', '.I...I'],
  },
  ghostShot: {
    color: PALETTE.purpleSpace,
    map: ['.GGGG.', 'GGGGGG', 'GG.GGG', 'GGGGGG', 'GG.G.G', 'G.G.G.'],
  },
};

const SHELL_COLORS: Record<string, string> = {
  B: PALETTE.black,
  Y: PALETTE.yellowBright,
};

export const PowerUpSprite: React.FC<PowerUpSpriteProps> = ({ kind, size = 36, frame = 0 }) => {
  const pixel = size / COLS;
  const cells: React.ReactElement[] = [];

  // shell
  for (let r = 0; r < ROWS; r++) {
    const row = SHELL[r]!;
    for (let c = 0; c < COLS; c++) {
      const ch = row[c]!;
      if (ch === '.') continue;
      const fill = SHELL_COLORS[ch];
      if (!fill) continue;
      cells.push(
        <Rect
          key={`s-${r}-${c}`}
          x={c * pixel}
          y={r * pixel}
          width={pixel + 0.5}
          height={pixel + 0.5}
          fill={fill}
        />
      );
    }
  }
  // glyph stamped at offset (3,3)
  const glyph = GLYPHS[kind];
  for (let r = 0; r < 6; r++) {
    const row = glyph.map[r]!;
    for (let c = 0; c < 6; c++) {
      const ch = row[c]!;
      if (ch === '.') continue;
      cells.push(
        <Rect
          key={`g-${r}-${c}`}
          x={(c + 3) * pixel}
          y={(r + 3) * pixel}
          width={pixel + 0.5}
          height={pixel + 0.5}
          fill={glyph.color}
        />
      );
    }
  }
  // Frame variant: a 1-pixel glow shift on frame 1
  if (frame === 1) {
    cells.push(
      <Rect
        key="halo"
        x={-1}
        y={-1}
        width={size + 2}
        height={size + 2}
        fill="none"
        stroke={PALETTE.yellowBright}
        strokeWidth={1.5}
        opacity={0.5}
      />
    );
  }
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${COLS * pixel} ${ROWS * pixel}`}>
      {cells}
    </Svg>
  );
};
