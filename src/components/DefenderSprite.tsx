import React from 'react';
import Svg, { Rect } from 'react-native-svg';
import { PALETTE } from '@/constants/theme';

interface DefenderSpriteProps {
  size?: number;
  /** Tint variant — used to differentiate defender levels. */
  variant?: 'grandpa' | 'recLeague' | 'pro' | 'alien';
  /** Walking frame for sliding animation: 0 or 1. */
  frame?: 0 | 1;
  /** Frozen overlay for Ice Defender power-up. */
  frozen?: boolean;
}

/**
 * 12×16 pixel defender, drawn arms-out in a defensive stance.
 * Color "S" = skin, "J" = jersey, "P" = pants, "B" = shoes, "H" = headband.
 */
const FRAMES: string[][] = [
  // frame 0 — base stance
  [
    '....HHHH....',
    '...SSSSSS...',
    '...SHHHHS...',
    '...SSSSSS...',
    'JJJJSSSSJJJJ',
    'JJJJJJJJJJJJ',
    'JJJJJJJJJJJJ',
    '.JJJJJJJJJJ.',
    '.PPPPPPPPPP.',
    '.PPPPPPPPPP.',
    '.PPP....PPP.',
    '.PPP....PPP.',
    '.PPP....PPP.',
    '.BBB....BBB.',
    '.BBB....BBB.',
    '............',
  ],
  // frame 1 — slide step (legs split wider)
  [
    '....HHHH....',
    '...SSSSSS...',
    '...SHHHHS...',
    '...SSSSSS...',
    'JJJJSSSSJJJJ',
    'JJJJJJJJJJJJ',
    'JJJJJJJJJJJJ',
    'JJJJJJJJJJJJ',
    'PPPPPPPPPPPP',
    'PPP......PPP',
    'PP........PP',
    'PP........PP',
    'PP........PP',
    'BB........BB',
    'BB........BB',
    '............',
  ],
];

const VARIANT_COLORS = {
  grandpa: { J: '#9aa0a6', P: '#5a4a3a', H: '#bdbdbd', S: '#f4cda3', B: '#2c2c44' },
  recLeague: { J: PALETTE.greenGo, P: PALETTE.shadow, H: PALETTE.lineWhite, S: '#f4cda3', B: PALETTE.black },
  pro: { J: PALETTE.redHot, P: PALETTE.midnight, H: PALETTE.yellowBright, S: '#d8a06b', B: PALETTE.black },
  alien: { J: PALETTE.purpleSpace, P: PALETTE.midnight, H: PALETTE.blueIce, S: '#80f0c0', B: PALETTE.black },
} as const;

const COLS = 12;
const ROWS = 16;

export const DefenderSprite: React.FC<DefenderSpriteProps> = ({
  size = 64,
  variant = 'grandpa',
  frame = 0,
  frozen = false,
}) => {
  const pixel = size / COLS;
  const frameMap = FRAMES[frame] ?? FRAMES[0]!;
  const colors = VARIANT_COLORS[variant];

  const cells: React.ReactElement[] = [];
  for (let r = 0; r < ROWS; r++) {
    const row = frameMap[r]!;
    for (let c = 0; c < COLS; c++) {
      const ch = row[c]!;
      if (ch === '.') continue;
      const fill = colors[ch as keyof typeof colors];
      if (!fill) continue;
      cells.push(
        <Rect
          key={`${r}-${c}`}
          x={c * pixel}
          y={r * pixel}
          width={pixel + 0.5}
          height={pixel + 0.5}
          fill={frozen ? PALETTE.blueIce : fill}
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
