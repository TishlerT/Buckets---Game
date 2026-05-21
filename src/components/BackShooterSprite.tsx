import React from 'react';
import Svg, { Rect } from 'react-native-svg';
import { PALETTE } from '@/constants/theme';
import { SkinId } from '@/constants/gameConfig';

export type BackShooterState =
  | 'idle'      // standing, ball held at right hip
  | 'windup'    // arms raised, ball at chest
  | 'release'   // follow-through, arms extended up, ball gone
  | 'celebrate' // both arms raised, slight lean back
  | 'walkL'     // walking left along the arc (frame A of cycle)
  | 'walkR';    // walking right along the arc (frame A of cycle)

interface BackShooterSpriteProps {
  size?: number;
  state?: BackShooterState;
  /** Alternates between 0 and 1 to drive walk-cycle / wind-up sub-frames. */
  subFrame?: 0 | 1;
  /** Jersey skin override — defaults to spec blue (#1E5BB5). */
  ballSkin?: SkinId;
  /** Renders a yellow flash overlay (used for telegraph effect on bot). */
  flashing?: boolean;
}

/**
 * 16×24 back-facing shooter sprite — built to match the blue #8 player in
 * Reference Image 2. We see the back of the head, the jersey with a chunky
 * number, and the shorts + sneakers. Multiple poses share one render fn so
 * tuning a color updates them all in lockstep.
 *
 * Color codes used in the pixel maps:
 *   H = hair          S = skin
 *   J = jersey        N = jersey number (white inside the J fill)
 *   P = shorts        B = shoes
 *   O = orange ball   X = follow-through / power highlight
 *   . = transparent
 */
const COLS = 16;
const ROWS = 24;

const FRAMES: Record<BackShooterState, string[]> = {
  // -------------------------------------------------------------------------
  // Idle — standing tall, ball held at right hip
  idle: [
    '....HHHHHHHH....',
    '...HHHHHHHHHH...',
    '...HHHHHHHHHH...',
    '....HHSSSSHH....',
    '....SSSSSSSS....',
    '....JJJJJJJJ....',
    '...JJJJJJJJJJ...',
    '..JJJJJJJJJJJJ..',
    '..JJJJJ88JJJJJ..',
    '..JJJJ8888JJJJ..',
    '..JJJJJ88JJJJJ..',
    '..JJJJJJJJJJJJ..',
    '..JJJJJJJJJJJJ..',
    '..SS........SS..',
    '..SS........SS..',
    '...JJJJJJJJJJ...',
    '....PPPPPPPP....',
    '....PPP..PPP....',
    '....PPP..PPP....',
    '....SSS..SSS....',
    '....BBBB.BBBB...',
    '....BBBB.BBBB...',
    '................',
    '................',
  ],
  // -------------------------------------------------------------------------
  // Wind-up — arms forming a triangle above the head, ball coming up
  windup: [
    '......OOOO......',
    '.....OOOOOO.....',
    '.....OOOOOO.....',
    '....SS.OO.SS....',
    '...SS......SS...',
    '....HHHHHHHH....',
    '....HHHHHHHH....',
    '....HHSSSSHH....',
    '....SSSSSSSS....',
    '...JJJJJJJJJJ...',
    '..JJJJJJJJJJJJ..',
    '..JJJJJ88JJJJJ..',
    '..JJJJ8888JJJJ..',
    '..JJJJJ88JJJJJ..',
    '..JJJJJJJJJJJJ..',
    '..JJJJJJJJJJJJ..',
    '...JJJJJJJJJJ...',
    '....PPPPPPPP....',
    '....PPP..PPP....',
    '....PPP..PPP....',
    '....SSS..SSS....',
    '....BBBB.BBBB...',
    '....BBBB.BBBB...',
    '................',
  ],
  // -------------------------------------------------------------------------
  // Release — full follow-through, ball already departed
  release: [
    '.......OO.......',
    '......OOOO......',
    '.....OOOOOO.....',
    '..S..OOOOOO..S..',
    '..SS........SS..',
    '...SS......SS...',
    '....HHHHHHHH....',
    '....HHHHHHHH....',
    '....HHSSSSHH....',
    '....SSSSSSSS....',
    '...JJJJJJJJJJ...',
    '..JJJJJJJJJJJJ..',
    '..JJJJJ88JJJJJ..',
    '..JJJJ8888JJJJ..',
    '..JJJJJ88JJJJJ..',
    '..JJJJJJJJJJJJ..',
    '...JJJJJJJJJJ...',
    '....PPPPPPPP....',
    '....PPP..PPP....',
    '....PPP..PPP....',
    '....SSS..SSS....',
    '....BBB..BBBB...',
    '...BBBB...BBB...',
    '................',
  ],
  // -------------------------------------------------------------------------
  // Celebrate — both arms raised, slight lean back
  celebrate: [
    '..SS........SS..',
    '..SS........SS..',
    '..SS........SS..',
    '..SS........SS..',
    '...SS......SS...',
    '....HHHHHHHH....',
    '...HHHHHHHHHH...',
    '...HHHHHHHHHH...',
    '...HHSSSSSSHH...',
    '....SSSSSSSS....',
    '...JJJJJJJJJJ...',
    '..JJJJJJJJJJJJ..',
    '..JJJJJ88JJJJJ..',
    '..JJJJ8888JJJJ..',
    '..JJJJJ88JJJJJ..',
    '..JJJJJJJJJJJJ..',
    '..JJJJJJJJJJJJ..',
    '...JJJJJJJJJJ...',
    '....PPPPPPPP....',
    '....PPP..PPP....',
    '....PPP..PPP....',
    '....SSS..SSS....',
    '....BBBB.BBBB...',
    '....BBBB.BBBB...',
  ],
  // -------------------------------------------------------------------------
  // Walking LEFT — body shifted left, leading foot forward
  walkL: [
    '....HHHHHHHH....',
    '...HHHHHHHHHH...',
    '...HHHHHHHHHH...',
    '....HHSSSSHH....',
    '....SSSSSSSS....',
    '...JJJJJJJJJJ...',
    '..JJJJJJJJJJJJ..',
    '..JJJJJJJJJJJJ..',
    '..JJJJ8888JJJJ..',
    '..JJJJ8888JJJJ..',
    '..JJJJJJJJJJJJ..',
    '..JJJJJJJJJJJJ..',
    '...JJJJJJJJJJ...',
    '....PPPPPPPP....',
    '...PPP....PPP...',
    '..PPP......PPP..',
    '..PPP......PPP..',
    '..SSS......SSS..',
    '.BBBB.......SSS.',
    '.BBBB......BBBB.',
    '...........BBBB.',
    '................',
    '................',
    '................',
  ],
  // -------------------------------------------------------------------------
  // Walking RIGHT — mirror of walkL
  walkR: [
    '....HHHHHHHH....',
    '...HHHHHHHHHH...',
    '...HHHHHHHHHH...',
    '....HHSSSSHH....',
    '....SSSSSSSS....',
    '...JJJJJJJJJJ...',
    '..JJJJJJJJJJJJ..',
    '..JJJJJJJJJJJJ..',
    '..JJJJ8888JJJJ..',
    '..JJJJ8888JJJJ..',
    '..JJJJJJJJJJJJ..',
    '..JJJJJJJJJJJJ..',
    '...JJJJJJJJJJ...',
    '....PPPPPPPP....',
    '...PPP....PPP...',
    '..PPP......PPP..',
    '..PPP......PPP..',
    '..SSS......SSS..',
    '.SSS.......BBBB.',
    '.BBBB......BBBB.',
    '.BBBB...........',
    '................',
    '................',
    '................',
  ],
};

// Skin-driven jersey tints — keeps the back shooter visually consistent
// with the ballSkin chosen in progression.
const JERSEY_BY_SKIN: Record<SkinId, { J: string; P: string }> = {
  classic: { J: PALETTE.jerseyBlue, P: PALETTE.jerseyBlue },
  neon: { J: PALETTE.greenGo, P: '#2d8a2d' },
  gold: { J: PALETTE.yellowBright, P: '#a8810f' },
  ghost: { J: PALETTE.purpleSpace, P: '#5a2da0' },
};

export const BackShooterSprite: React.FC<BackShooterSpriteProps> = ({
  size = 140,
  state = 'idle',
  subFrame = 0,
  ballSkin = 'classic',
  flashing = false,
}) => {
  const pixel = size / COLS;
  const map = FRAMES[state];
  const tint = JERSEY_BY_SKIN[ballSkin] ?? JERSEY_BY_SKIN.classic;

  // Tiny secondary tweak: in windup subFrame 1 raise the ball/arms by 1px
  // so the wind-up animates without needing a whole new frame.
  const yShift = state === 'windup' && subFrame === 1 ? -1 : 0;

  const cells: React.ReactElement[] = [];
  for (let r = 0; r < ROWS; r++) {
    const row = map[r];
    if (!row) continue;
    for (let c = 0; c < COLS; c++) {
      const ch = row[c];
      if (!ch || ch === '.') continue;
      let fill: string | undefined;
      switch (ch) {
        case 'H': fill = '#1a0e08'; break;
        case 'S': fill = '#d6a373'; break;
        case 'J': fill = tint.J; break;
        case 'P': fill = tint.P; break;
        case 'B': fill = '#dde2e8'; break;
        case 'O': fill = PALETTE.orangeBall; break;
        case 'N':
        case '8': fill = PALETTE.lineWhite; break;
        case 'X': fill = PALETTE.yellowBright; break;
        default: fill = undefined;
      }
      if (!fill) continue;
      cells.push(
        <Rect
          key={`${state}-${r}-${c}`}
          x={c * pixel}
          y={(r + yShift) * pixel}
          width={pixel + 0.5}
          height={pixel + 0.5}
          fill={flashing && ch !== 'O' ? PALETTE.yellowBright : fill}
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
