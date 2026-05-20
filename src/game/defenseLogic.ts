/**
 * defenseLogic.ts — pure game-state-machine for the defense screen.
 *
 * The bot shooter cycles through phases:
 *
 *   IDLE          ─ shooter standing still, possibly between shots
 *     │ pickWindupMs() ms later
 *     ▼
 *   WINDUP        ─ Frame 2 sprite, "ball comes to chest"
 *     │
 *     ├─ (chance = level.fakeChance) ─→ FAKE_RESET (only L3+)
 *     │                                   │ FAKE_RESET_MS later
 *     │                                   ▼
 *     │                                  IDLE (rest before next attempt)
 *     │
 *     ▼  level.windupMsMin..Max ms in WINDUP
 *   RELEASE       ─ Frame 3 sprite + telegraph flash
 *     │
 *     ▼  judged by player's swipe time
 *   RESULT        ─ block / open-look / late-score
 *     │ POST_RESULT_PAUSE_MS later
 *     ▼
 *   IDLE
 *
 * The player's swipe-up arrives at some absolute timestamp. We classify it
 * relative to the RELEASE moment:
 *
 *   too early (>= EARLY_WINDOW before release): IGNORED, waste of a swipe
 *   early (within EARLY_WINDOW before release):  EARLY  → whiff, open shot
 *   perfect (within ±PERFECT_WINDOW of release): PERFECT → block!
 *   late (within LATE_WINDOW after release):     LATE   → no block, shot goes
 *   too late (after LATE_WINDOW past release):   IGNORED, shot already resolved
 *
 * If the shooter FAKES (Frame 2 then resets), a player who swiped during
 * the fake gets penalized: cooldown of FAKE_COOLDOWN_MS prevents subsequent
 * jumps. (Spec: "punishes players who jump early".)
 */

import {
  DEFENDER_LEVELS,
  FAKE_COOLDOWN_MS,
  POST_RESULT_PAUSE_MS,
} from '@/constants/gameConfig';
import { pickWindupMs, shouldFake, DefenderDifficulty } from './botAI';

export type DefensePhase = 'IDLE' | 'WINDUP' | 'FAKE_RESET' | 'RELEASE' | 'RESULT';

export type SwipeOutcome =
  | 'PERFECT'   // block!
  | 'EARLY'     // whiff: scorer gets open look
  | 'LATE'      // shot already left, no block
  | 'IGNORED'   // outside any window, no consequence
  | 'BAITED';   // player jumped during a fake — cooldown hit

export interface DefenseState {
  phase: DefensePhase;
  level: DefenderDifficulty;
  /** Absolute ms (from `nowMs` reference) when the current phase began. */
  phaseStartedAtMs: number;
  /** Absolute ms when the next phase transition is scheduled. */
  phaseEndsAtMs: number;
  /** Absolute ms of the upcoming RELEASE moment, if known. */
  releaseAtMs: number | null;
  /** Whether the current attempt is going to be a fake. */
  willFake: boolean;
  /** Cooldown active until this absolute ms — player swipes are BAITED. */
  swipeCooldownUntilMs: number;
  /** Last shot's outcome, for UI to show. */
  lastOutcome: SwipeOutcome | null;
}

export function initDefenseState(level: DefenderDifficulty, nowMs: number): DefenseState {
  return {
    phase: 'IDLE',
    level,
    phaseStartedAtMs: nowMs,
    phaseEndsAtMs: nowMs + 800, // brief idle pause before first windup
    releaseAtMs: null,
    willFake: false,
    swipeCooldownUntilMs: 0,
    lastOutcome: null,
  };
}

/**
 * Step the FSM forward by elapsed time. Pure: takes (state, nowMs, rng) →
 * new state. Caller polls this every frame on the JS thread.
 *
 * Loops internally so a single call advances through all phases that have
 * elapsed (e.g. if a frame skip happens, we don't get stuck mid-FSM).
 *
 * Does NOT process player swipes — that's `processSwipe`.
 */
export function tickDefense(
  state: DefenseState,
  nowMs: number,
  rng: () => number = Math.random
): DefenseState {
  // Defensive guard: cap iterations so a buggy phaseEndsAtMs computation
  // can't make us loop forever.
  let cur = state;
  for (let i = 0; i < 32; i++) {
    if (nowMs < cur.phaseEndsAtMs) return cur;
    cur = stepOnePhase(cur, nowMs, rng);
  }
  return cur;
}

/** Advance the FSM by ONE phase boundary. */
function stepOnePhase(
  state: DefenseState,
  nowMs: number,
  rng: () => number
): DefenseState {
  const cfg = DEFENDER_LEVELS[state.level];
  switch (state.phase) {
    case 'IDLE': {
      // Begin a windup. Decide if this attempt will be a fake.
      const fake = shouldFake(state.level, rng);
      const windupMs = pickWindupMs(state.level, rng);
      const releaseAt = nowMs + windupMs;
      return {
        ...state,
        phase: 'WINDUP',
        phaseStartedAtMs: nowMs,
        phaseEndsAtMs: fake ? nowMs + windupMs * 0.55 : releaseAt,
        releaseAtMs: fake ? null : releaseAt,
        willFake: fake,
        lastOutcome: null,
      };
    }
    case 'WINDUP': {
      if (state.willFake) {
        return {
          ...state,
          phase: 'FAKE_RESET',
          phaseStartedAtMs: nowMs,
          phaseEndsAtMs: nowMs + FAKE_COOLDOWN_MS,
          releaseAtMs: null,
        };
      }
      // Use the SCHEDULED release time, not nowMs. Late ticks don't
      // shift the perfect-release classification target.
      const release = state.releaseAtMs ?? nowMs;
      return {
        ...state,
        phase: 'RELEASE',
        phaseStartedAtMs: release,
        phaseEndsAtMs: release + cfg.lateWindowMs,
        releaseAtMs: release,
      };
    }
    case 'FAKE_RESET': {
      return {
        ...state,
        phase: 'IDLE',
        phaseStartedAtMs: nowMs,
        phaseEndsAtMs: nowMs + 600,
        willFake: false,
        releaseAtMs: null,
      };
    }
    case 'RELEASE': {
      return {
        ...state,
        phase: 'RESULT',
        phaseStartedAtMs: nowMs,
        phaseEndsAtMs: nowMs + POST_RESULT_PAUSE_MS,
        lastOutcome: 'LATE',
      };
    }
    case 'RESULT': {
      return {
        ...state,
        phase: 'IDLE',
        phaseStartedAtMs: nowMs,
        phaseEndsAtMs: nowMs + 700,
        releaseAtMs: null,
        willFake: false,
        lastOutcome: state.lastOutcome,
      };
    }
  }
}

/**
 * Process a player's swipe-up event. Returns the new state and the outcome.
 * Pure function (caller can pass a fixed `nowMs` for tests).
 */
export function processSwipe(
  state: DefenseState,
  nowMs: number
): { state: DefenseState; outcome: SwipeOutcome } {
  // Player is in a fake-bait cooldown: swallow this swipe.
  if (nowMs < state.swipeCooldownUntilMs) {
    return { state, outcome: 'BAITED' };
  }

  const cfg = DEFENDER_LEVELS[state.level];

  // If the shooter is mid-fake, every swipe is BAITED and triggers cooldown.
  if (state.phase === 'FAKE_RESET' || (state.phase === 'WINDUP' && state.willFake)) {
    return {
      state: { ...state, swipeCooldownUntilMs: nowMs + FAKE_COOLDOWN_MS },
      outcome: 'BAITED',
    };
  }

  // We need a release-time anchor to classify.
  if (state.releaseAtMs === null) {
    // No release scheduled; this is a swipe in IDLE/RESULT — IGNORED.
    return { state, outcome: 'IGNORED' };
  }

  const dt = nowMs - state.releaseAtMs; // negative = before release, positive = after
  if (dt < -cfg.earlyWindowMs - 1) {
    // Way before release — ignored
    return { state, outcome: 'IGNORED' };
  }
  if (dt < -cfg.perfectWindowMs) {
    return {
      state: {
        ...state,
        phase: 'RESULT',
        phaseStartedAtMs: nowMs,
        phaseEndsAtMs: nowMs + POST_RESULT_PAUSE_MS,
        lastOutcome: 'EARLY',
      },
      outcome: 'EARLY',
    };
  }
  if (dt <= cfg.perfectWindowMs) {
    return {
      state: {
        ...state,
        phase: 'RESULT',
        phaseStartedAtMs: nowMs,
        phaseEndsAtMs: nowMs + POST_RESULT_PAUSE_MS,
        lastOutcome: 'PERFECT',
      },
      outcome: 'PERFECT',
    };
  }
  if (dt <= cfg.perfectWindowMs + cfg.lateWindowMs) {
    return {
      state: {
        ...state,
        phase: 'RESULT',
        phaseStartedAtMs: nowMs,
        phaseEndsAtMs: nowMs + POST_RESULT_PAUSE_MS,
        lastOutcome: 'LATE',
      },
      outcome: 'LATE',
    };
  }
  return { state, outcome: 'IGNORED' };
}
