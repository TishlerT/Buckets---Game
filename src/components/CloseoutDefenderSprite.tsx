import React from 'react';
import Svg, { Rect } from 'react-native-svg';
import { PALETTE } from '@/constants/theme';
import { DefenderId } from '@/constants/gameConfig';

export type CloseoutDefenderState =
  | 'idle'        // standing, watching
  | 'closeoutA'   // running toward player — frame A
  | 'closeoutB'   // running toward player — frame B
  | 'contest'     // arms straight up, contesting on the ground
  | 'jumpCrouch'  // pre-jump crouch
  | 'jumpPeak'    // top of jump, both hands high
  | 'jumpLand';   // landing recovery

interface CloseoutDefenderSpriteProps {
  size?: number;
  state?: CloseoutDefenderState;
  /** Variant maps to defender level cosmetics (jersey color, etc). */
  variant?: DefenderId;
  /** Renders an ice-blue overlay (Ice Defender power-up). */
  frozen?: boolean;
  /** Renders a brief yellow flash (used during contest highlight). */
  flashing?: boolean;
}

/**
 * 16×24 front-facing defender — closeout / contest / jump frames built to
 * match the red #4 player in Reference Image 2. The defender is always
 * smaller than the shooter (he's farther from camera) so the sprite is
 * intentionally a bit thinner to read at distance.
 *
 * Color codes:
 *   H = hair      S = skin
 *   J = jersey    N = jersey number (white inside the J)
 *   P = shorts    B = shoes
 *   A = jersey accent stripe (sleeves)
 *   X = pixel highlight (flash overlay)
 *   . = transparent
 */
const COLS = 16;
const ROWS = 24;

const FRAMES: Record<CloseoutDefenderState, string[]> = {
  // -------------------------------------------------------------------------
  // Idle — relaxed stance
  idle: [
    '.....HHHHHH.....',
    '....HSSSSSSH....',
    '....SSSSSSSS....',
    '....SHHHHHHS....',
    '....SSSSSSSS....',
    '.....SSSSSS.....',
    '....AJJJJJJA....',
    '...AJJJJJJJJA...',
    '...AJJJ44JJJA...',
    '...AJJ4444JJA...',
    '...AJJJ44JJJA...',
    '...AJJJJJJJJA...',
    '....JJJJJJJJ....',
    '....SS....SS....',
    '....SS....SS....',
    '....PPPPPPPP....',
    '....PPP..PPP....',
    '....PPP..PPP....',
    '....SSS..SSS....',
    '....SSS..SSS....',
    '....BBB..BBB....',
    '....BBB..BBB....',
    '................',
    '................',
  ],
  // -------------------------------------------------------------------------
  // Closeout run frame A — leading leg forward, opposite arm swung up
  closeoutA: [
    '......HHHH......',
    '.....HSSSSH.....',
    '.....SSSSSS.....',
    '.....SHHHHS.....',
    '.....SSSSSS.....',
    '......SSSS....SS',
    '.AJJJJJJJJA..SS.',
    'AJJJJJJJJJJA.S..',
    'AJJJJ44JJJJA....',
    'AJJJ4444JJJA....',
    'AJJJJ44JJJJA....',
    'AJJJJJJJJJJA....',
    '.JJJJJJJJJJ.....',
    '.SS........SS...',
    '.SS........SS...',
    '..PPPPPPPP......',
    '..PP....PPP.....',
    '..PP.....PPP....',
    '..SS......SS....',
    '..SS......SS....',
    '..BBB.....BBB...',
    '.BBBB......BBB..',
    '................',
    '................',
  ],
  // -------------------------------------------------------------------------
  // Closeout run frame B — opposite leg forward, mirror swing
  closeoutB: [
    '......HHHH......',
    '.....HSSSSH.....',
    '.....SSSSSS.....',
    '.....SHHHHS.....',
    '.....SSSSSS.....',
    'SS....SSSS......',
    '.SS..AJJJJJJJJA.',
    '..S.AJJJJJJJJJJA',
    '....AJJJJ44JJJJA',
    '....AJJJ4444JJJA',
    '....AJJJJ44JJJJA',
    '....AJJJJJJJJJJA',
    '.....JJJJJJJJJJ.',
    '...SS........SS.',
    '...SS........SS.',
    '......PPPPPPPP..',
    '.....PPP....PP..',
    '....PPP.....PP..',
    '....SS......SS..',
    '....SS......SS..',
    '...BBB.....BBB..',
    '..BBB......BBBB.',
    '................',
    '................',
  ],
  // -------------------------------------------------------------------------
  // Contest — standing tall, both arms straight up. The sprite gets noticeably
  // taller in this pose since both arms reach for the ball.
  contest: [
    '..SS........SS..',
    '..SS........SS..',
    '..SS........SS..',
    '..SS........SS..',
    '..SS........SS..',
    '...SS......SS...',
    '....HHHHHHHH....',
    '....HSSSSSSH....',
    '....SSSSSSSS....',
    '....SHHHHHHS....',
    '....SSSSSSSS....',
    '....AJJJJJJA....',
    '...AJJJ44JJJA...',
    '...AJJ4444JJA...',
    '...AJJJ44JJJA...',
    '...AJJJJJJJJA...',
    '....JJJJJJJJ....',
    '....PPPPPPPP....',
    '....PPP..PPP....',
    '....PPP..PPP....',
    '....SSS..SSS....',
    '....BBB..BBB....',
    '....BBB..BBB....',
    '................',
  ],
  // -------------------------------------------------------------------------
  // Jump crouch — knees bent, ready to explode
  jumpCrouch: [
    '................',
    '................',
    '................',
    '.....HHHHHH.....',
    '....HSSSSSSH....',
    '....SSSSSSSS....',
    '....SHHHHHHS....',
    '....SSSSSSSS....',
    '..SSAJJJJJJASS..',
    '..S.AJJ44JJA.S..',
    '....AJJ4444JJA..',
    '....AJJJJJJJJA..',
    '....JJJJJJJJJJ..',
    '....JJJJJJJJJJ..',
    '...PPPPPPPPPPPP.',
    '..PPP........PPP',
    '..PP..........PP',
    '..PP..........PP',
    '..SS..........SS',
    '..SS..........SS',
    '.BBB..........BB',
    '.BBB..........BB',
    '................',
    '................',
  ],
  // -------------------------------------------------------------------------
  // Jump peak — fully extended in the air, body straight, arms up
  jumpPeak: [
    '..SS........SS..',
    '.SS..........SS.',
    'SS............SS',
    'SS............SS',
    'S..............S',
    '...HHHHHHHH.....',
    '...HSSSSSSH.....',
    '...SSSSSSSS.....',
    '...SHHHHHHS.....',
    '...SSSSSSSS.....',
    '...AJJJJJJA.....',
    '..AJJJ44JJJA....',
    '..AJJ4444JJA....',
    '..AJJJ44JJJA....',
    '..AJJJJJJJJA....',
    '...JJJJJJJJ.....',
    '...PPPPPPPP.....',
    '...PPPPPPPP.....',
    '....PPP..PPP....',
    '....SS....SS....',
    '....SS....SS....',
    '....BBB..BBB....',
    '....BBB..BBB....',
    '................',
  ],
  // -------------------------------------------------------------------------
  // Jump landing — knees soft, arms coming down
  jumpLand: [
    '................',
    '................',
    '....HHHHHHHH....',
    '....HSSSSSSH....',
    '....SSSSSSSS....',
    '....SHHHHHHS....',
    '....SSSSSSSS....',
    '.....SSSSSS.....',
    '.SAJJJJJJJJJAS..',
    '.SAJJJJJJJJJAS..',
    '..AJJJ44JJJA....',
    '..AJJ4444JJA....',
    '..AJJJJJJJJA....',
    '...JJJJJJJJ.....',
    '..PPPPPPPPPP....',
    '..PP......PPP...',
    '..PP.......PP...',
    '..SS.......SS...',
    '..SS.......SS...',
    '..BBB.....BBB...',
    '..BBB.....BBB...',
    '................',
    '................',
    '................',
  ],
};

const VARIANT_COLORS: Record<DefenderId, { J: string; A: string; P: string; H: string; S: string; B: string }> = {
  grandpa: {
    J: '#9aa0a6', A: '#bdbdbd', P: '#5a4a3a', H: '#bdbdbd', S: '#f4cda3', B: '#2c2c44',
  },
  recLeague: {
    J: PALETTE.greenGo, A: '#a4e89b', P: '#1f5a18', H: '#f0deb0', S: '#d8a06b', B: PALETTE.black,
  },
  pro: {
    J: PALETTE.jerseyRed, A: '#ffb3b3', P: '#7a0e0e', H: '#1a0e08', S: '#a96b3f', B: PALETTE.lineWhite,
  },
  alien: {
    J: PALETTE.purpleSpace, A: '#d7b3ff', P: '#3d1d70', H: PALETTE.blueIce, S: '#80f0c0', B: PALETTE.black,
  },
};

export const CloseoutDefenderSprite: React.FC<CloseoutDefenderSpriteProps> = ({
  size = 90,
  state = 'closeoutA',
  variant = 'pro',
  frozen = false,
  flashing = false,
}) => {
  const pixel = size / COLS;
  const map = FRAMES[state];
  const colors = VARIANT_COLORS[variant];

  const cells: React.ReactElement[] = [];
  for (let r = 0; r < ROWS; r++) {
    const row = map[r];
    if (!row) continue;
    for (let c = 0; c < COLS; c++) {
      const ch = row[c];
      if (!ch || ch === '.') continue;
      let fill: string | undefined;
      switch (ch) {
        case 'H': fill = colors.H; break;
        case 'S': fill = colors.S; break;
        case 'J': fill = colors.J; break;
        case 'A': fill = colors.A; break;
        case 'P': fill = colors.P; break;
        case 'B': fill = colors.B; break;
        case 'N':
        case '4': fill = PALETTE.lineWhite; break;
        case 'X': fill = PALETTE.yellowBright; break;
        default: fill = undefined;
      }
      if (!fill) continue;
      const finalFill = frozen
        ? PALETTE.blueIce
        : flashing
        ? PALETTE.yellowBright
        : fill;
      cells.push(
        <Rect
          key={`${state}-${r}-${c}`}
          x={c * pixel}
          y={r * pixel}
          width={pixel + 0.5}
          height={pixel + 0.5}
          fill={finalFill}
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
