import React from 'react';
import Svg, { Rect } from 'react-native-svg';
import { PALETTE } from '@/constants/theme';

interface ShooterSpriteProps {
  size?: number;
  /**
   * 0 = idle stance (ball at hip)
   * 1 = wind-up (knees bent, ball at chest)
   * 2 = release (arms extended up)
   */
  frame?: 0 | 1 | 2;
  variant?: 'grandpa' | 'recLeague' | 'pro' | 'alien';
  /** Render with bright highlight color overlay (release telegraph). */
  flashing?: boolean;
}

/**
 * 16x20 pixel art shooter sprite with 3 animation frames.
 *
 *   S = skin    H = headband    J = jersey
 *   P = pants   B = shoes        O = orange ball
 *   X = highlight (release telegraph)
 */
const COLS = 16;
const ROWS = 20;

const FRAMES: string[][] = [
  // Frame 0 — idle, ball held at hip
  [
    '......HHHH......',
    '.....SSSSSS.....',
    '.....SHHHHS.....',
    '.....SSSSSS.....',
    '......JJJJ......',
    '....JJJJJJJJ....',
    '...JJJJJJJJJJ...',
    '...JJJJJJJJJJ...',
    '...JJJJOOOJJJ...',
    '...JJJJOOOJJJ...',
    '....PPPP..PPP...',
    '....PPPP..PPP...',
    '....PPPP..PPP...',
    '....PPPP..PPP...',
    '....PPPP..PPP...',
    '....PPPP..PPP...',
    '....BBBB..BBB...',
    '....BBBB..BBB...',
    '................',
    '................',
  ],
  // Frame 1 — wind-up, knees bent, ball at chest
  [
    '......HHHH......',
    '.....SSSSSS.....',
    '.....SHHHHS.....',
    '.....SSSSSS.....',
    '...SSJJJJJJSS...',
    '..SS.JOOOOJ.SS..',
    '..SS.JOOOOJ.SS..',
    '...JJJOOOOJJJ...',
    '...JJJJJJJJJJ...',
    '...JJJJJJJJJJ...',
    '....JJJJJJJJ....',
    '...PPPP..PPPP...',
    '..PPP......PPP..',
    '..PPP......PPP..',
    '..PPP......PPP..',
    '..PPP......PPP..',
    '..BBB......BBB..',
    '..BBB......BBB..',
    '................',
    '................',
  ],
  // Frame 2 — release, arms extended up, ball above head
  [
    '......OOOO......',
    '......OOOO......',
    '....SS.OO.SS....',
    '...SSS....SSS...',
    '..SSS......SSS..',
    '..S..HHHH....S..',
    '....SSSSSS......',
    '....SHHHHS......',
    '....SSSSSS......',
    '......JJJJ......',
    '....JJJJJJJJ....',
    '...JJJJJJJJJJ...',
    '...JJJJJJJJJJ...',
    '....JJJJJJJJ....',
    '....PPPP..PPP...',
    '....PPPP..PPP...',
    '....PPPP..PPP...',
    '....BBBB..BBB...',
    '....BBBB..BBB...',
    '................',
  ],
];

const VARIANT_COLORS = {
  grandpa: { J: '#9aa0a6', P: '#5a4a3a', H: '#bdbdbd', S: '#f4cda3', B: '#2c2c44' },
  recLeague: { J: PALETTE.greenGo, P: PALETTE.shadow, H: PALETTE.lineWhite, S: '#f4cda3', B: PALETTE.black },
  pro: { J: PALETTE.redHot, P: PALETTE.midnight, H: PALETTE.yellowBright, S: '#d8a06b', B: PALETTE.black },
  alien: { J: PALETTE.purpleSpace, P: PALETTE.midnight, H: PALETTE.blueIce, S: '#80f0c0', B: PALETTE.black },
} as const;

export const ShooterSprite: React.FC<ShooterSpriteProps> = ({
  size = 96,
  frame = 0,
  variant = 'grandpa',
  flashing = false,
}) => {
  const pixel = size / COLS;
  const map = FRAMES[frame] ?? FRAMES[0]!;
  const colors = VARIANT_COLORS[variant];

  const cells: React.ReactElement[] = [];
  for (let r = 0; r < ROWS; r++) {
    const row = map[r]!;
    for (let c = 0; c < COLS; c++) {
      const ch = row[c]!;
      if (ch === '.') continue;
      let fill: string | undefined;
      if (ch === 'O') fill = PALETTE.orangeBall;
      else fill = (colors as Record<string, string>)[ch];
      if (!fill) continue;
      cells.push(
        <Rect
          key={`${r}-${c}`}
          x={c * pixel}
          y={r * pixel}
          width={pixel + 0.5}
          height={pixel + 0.5}
          fill={flashing ? PALETTE.yellowBright : fill}
          opacity={flashing ? 0.95 : 1}
        />
      );
    }
  }
  return (
    <Svg
      width={size}
      height={(size * ROWS) / COLS}
      viewBox={`0 0 ${COLS * pixel} ${ROWS * pixel}`}
    >
      {cells}
    </Svg>
  );
};
