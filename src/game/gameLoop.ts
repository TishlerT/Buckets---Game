/**
 * gameLoop.ts — finite-state machine for a full BUCKETS match.
 *
 *   COIN_FLIP → ANNOUNCE → OFFENSE → PASS_OR_SWAP → DEFENSE
 *                                                       │
 *                                                       ▼
 *                                                 (next turn)
 *                                                       │
 *                                                       ▼
 *                                                  END (when game timer hits 0)
 *
 * Single-player vs-bot:
 *   Each "turn" = the active player shoots offense for TURN_DURATION_SEC,
 *   then the active player defends bot's offense for TURN_DURATION_SEC.
 *   "Active player" toggles between HUMAN and BOT each turn.
 *
 * Local 2P:
 *   Same structure, but "active player" toggles between PLAYER_1 and
 *   PLAYER_2, with a PASS_PHONE screen between turns.
 *
 * Game ends when (a) total game timer hits 0 and (b) current turn finishes.
 */

import { GAME_DURATION_SEC, TURN_DURATION_SEC } from '@/constants/gameConfig';

export type GameMode = 'vsBot' | 'local2P';
export type Player = 'P1' | 'P2' | 'BOT';
export type TurnRole = 'OFFENSE' | 'DEFENSE';

export type GamePhase =
  | 'COIN_FLIP'
  | 'ANNOUNCE'
  | 'OFFENSE'
  | 'DEFENSE'
  | 'PASS_PHONE'
  | 'END';

export interface PlayerScore {
  points: number;
  perfectBlocks: number;
}

export interface GameState {
  phase: GamePhase;
  mode: GameMode;
  /** Difficulty level for the BOT in vs-bot, ignored in 2P. */
  defenderLevel: 1 | 2 | 3 | 4;
  /** The player whose offense or defense turn it is. */
  activePlayer: Player;
  currentRole: TurnRole;
  /** Total game timer remaining, in whole seconds. */
  gameTimeRemainingSec: number;
  /** How many turns have been completed. */
  turnsCompleted: number;
  scores: { P1: PlayerScore; P2: PlayerScore; BOT: PlayerScore };
  /** Coin flip outcome: who goes on offense first. */
  coinFlipWinner: Player | null;
  /** Set when phase=END so UI knows the winner. */
  winner: Player | 'TIE' | null;
}

export interface InitGameOptions {
  mode: GameMode;
  defenderLevel?: 1 | 2 | 3 | 4;
}

const EMPTY_SCORE: PlayerScore = { points: 0, perfectBlocks: 0 };

export function initGameState(opts: InitGameOptions): GameState {
  return {
    phase: 'COIN_FLIP',
    mode: opts.mode,
    defenderLevel: opts.defenderLevel ?? 1,
    activePlayer: 'P1',
    currentRole: 'OFFENSE',
    gameTimeRemainingSec: GAME_DURATION_SEC,
    turnsCompleted: 0,
    scores: { P1: { ...EMPTY_SCORE }, P2: { ...EMPTY_SCORE }, BOT: { ...EMPTY_SCORE } },
    coinFlipWinner: null,
    winner: null,
  };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type GameAction =
  | { type: 'COIN_FLIP_RESOLVED'; winner: Player }
  | { type: 'ANNOUNCE_DONE' }
  | { type: 'TURN_ENDED'; pointsScored: number; perfectBlocks: number }
  | { type: 'PASS_PHONE_DONE' }
  | { type: 'GAME_TIMER_TICK' };

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'COIN_FLIP_RESOLVED': {
      // Coin flip semantics:
      // - vs-bot: activePlayer is always P1 (the human). Flip decides
      //   whether P1 starts on OFFENSE (P1 won) or DEFENSE (BOT won).
      // - local 2P: both players are humans. Flip directly picks who
      //   starts on OFFENSE; activePlayer = winner, role = OFFENSE.
      if (state.mode === 'vsBot') {
        const p1WonToss = action.winner === 'P1';
        return {
          ...state,
          phase: 'ANNOUNCE',
          coinFlipWinner: action.winner,
          activePlayer: 'P1',
          currentRole: p1WonToss ? 'OFFENSE' : 'DEFENSE',
        };
      }
      // local 2P
      const humanWinner: Player = action.winner === 'P2' ? 'P2' : 'P1';
      return {
        ...state,
        phase: 'ANNOUNCE',
        coinFlipWinner: humanWinner,
        activePlayer: humanWinner,
        currentRole: 'OFFENSE',
      };
    }
    case 'ANNOUNCE_DONE': {
      // Move from ANNOUNCE into the actual play screen.
      return {
        ...state,
        phase: state.currentRole === 'OFFENSE' ? 'OFFENSE' : 'DEFENSE',
      };
    }
    case 'TURN_ENDED': {
      // Credit the active player.
      const scoreUpdate = applyTurnScore(state, action.pointsScored, action.perfectBlocks);
      const turnsCompleted = state.turnsCompleted + 1;

      // Check whether the game has ended (timer expired).
      if (state.gameTimeRemainingSec <= 0) {
        return {
          ...scoreUpdate,
          phase: 'END',
          winner: decideWinner(scoreUpdate),
          turnsCompleted,
        };
      }

      // After OFFENSE: same player flips to DEFENSE.
      if (state.currentRole === 'OFFENSE') {
        return {
          ...scoreUpdate,
          phase: 'ANNOUNCE',
          activePlayer: state.activePlayer,
          currentRole: 'DEFENSE',
          turnsCompleted,
        };
      }

      // After DEFENSE:
      //   vs-bot: same player goes back to OFFENSE — they alternate
      //     until the game timer expires. The bot scores during the
      //     player's defense turns, so vs-bot scoring already works.
      //   local2P: pass the phone, then the OTHER player goes OFFENSE.
      if (state.mode === 'vsBot') {
        return {
          ...scoreUpdate,
          phase: 'ANNOUNCE',
          activePlayer: state.activePlayer, // still P1
          currentRole: 'OFFENSE',
          turnsCompleted,
        };
      }
      // local2P: swap and pass the phone.
      const nextActive = state.activePlayer === 'P1' ? ('P2' as const) : ('P1' as const);
      return {
        ...scoreUpdate,
        phase: 'PASS_PHONE',
        activePlayer: nextActive,
        currentRole: 'OFFENSE',
        turnsCompleted,
      };
    }
    case 'PASS_PHONE_DONE': {
      return { ...state, phase: 'ANNOUNCE' };
    }
    case 'GAME_TIMER_TICK': {
      const newTime = Math.max(0, state.gameTimeRemainingSec - 1);
      return { ...state, gameTimeRemainingSec: newTime };
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Apply scoring/blocks to whatever player is active for this turn. */
function applyTurnScore(
  state: GameState,
  pointsScored: number,
  perfectBlocks: number
): GameState {
  // OFFENSE: credits the active player's points.
  // DEFENSE: credits the active player's blocks; pointsScored represents
  //          BOT/opponent points to credit to the conceptual opponent.
  //          - vs-bot: opponent = BOT
  //          - 2P: opponent = the OTHER player
  const next = { ...state, scores: { ...state.scores } };
  if (state.currentRole === 'OFFENSE') {
    next.scores[state.activePlayer] = {
      ...state.scores[state.activePlayer],
      points: state.scores[state.activePlayer].points + pointsScored,
    };
  } else {
    const opponent: Player =
      state.mode === 'vsBot' ? 'BOT' : (state.activePlayer === 'P1' ? 'P2' : 'P1');
    next.scores[state.activePlayer] = {
      ...state.scores[state.activePlayer],
      perfectBlocks: state.scores[state.activePlayer].perfectBlocks + perfectBlocks,
    };
    next.scores[opponent] = {
      ...state.scores[opponent],
      points: state.scores[opponent].points + pointsScored,
    };
  }
  return next;
}


/** Decide the winner based on current scores. Tie if equal. */
export function decideWinner(state: GameState): Player | 'TIE' {
  const a = state.scores.P1.points;
  if (state.mode === 'vsBot') {
    const b = state.scores.BOT.points;
    if (a > b) return 'P1';
    if (b > a) return 'BOT';
    return 'TIE';
  }
  const b2 = state.scores.P2.points;
  if (a > b2) return 'P1';
  if (b2 > a) return 'P2';
  return 'TIE';
}

/** Random coin flip (deterministic via injected rng). */
export function flipCoin(rng: () => number = Math.random): Player {
  return rng() < 0.5 ? 'P1' : (/* mode-dependent fallback */ 'BOT');
}

/**
 * Coin flip decides who starts on OFFENSE.
 * - vsBot: returns 'P1' (P1 starts shooting) or 'BOT' (P1 starts defending).
 *   The active player on screen is ALWAYS P1 in vs-bot; the "winner"
 *   is purely narrative for the announcer.
 * - 2P: returns 'P1' or 'P2'.
 */
export function flipCoinForMode(
  mode: GameMode,
  rng: () => number = Math.random
): Player {
  if (mode === 'vsBot') {
    return rng() < 0.5 ? 'P1' : 'BOT';
  }
  return rng() < 0.5 ? 'P1' : 'P2';
}

/** Convenience: total turn budget for the game. */
export function maxTurns(): number {
  // total game / per turn / 2 (offense+defense per round)
  return Math.floor(GAME_DURATION_SEC / TURN_DURATION_SEC);
}
