/**
 * botAI.ts — bot behavior for both:
 *   (a) the defender contesting the player's offense
 *   (b) the bot SHOOTER on the player's defense screen (Phase 3)
 *
 * Difficulty scaling lives in gameConfig.ts. This module is a thin wrapper
 * that turns config + current state into the next decision.
 */

import {
  BOT_DEFENDER_BY_LEVEL,
  DefenderLevelConfig,
  DEFENDER_LEVELS,
} from '@/constants/gameConfig';
import { clamp } from './shotPhysics';

export type DefenderDifficulty = 1 | 2 | 3 | 4;

export interface DefenderState {
  /** 0..1 normalized position along the arc. */
  arcPos: number;
  /** Whether the defender is frozen (Ice Defender power-up). */
  frozen: boolean;
}

/**
 * Move the bot defender toward the player along the arc.
 *
 * The bot tries to maintain its `maxDistanceFromPlayer` from the player,
 * never overshooting. Returns the new arcPos.
 *
 * @param level     defender difficulty 1..4
 * @param current   current defender arc position (0..1)
 * @param target    player's arc position (0..1)
 * @param dtSec     time elapsed since last update (seconds)
 * @param arcLengthPx physical length of the arc in px (used to convert speed to delta)
 */
export function tickDefender(
  level: DefenderDifficulty,
  current: number,
  target: number,
  dtSec: number,
  arcLengthPx: number,
  frozen: boolean
): number {
  if (frozen) return current;
  const cfg = BOT_DEFENDER_BY_LEVEL[level];
  const maxStepPx = cfg.closeOutSpeed * dtSec;
  const maxStepNorm = arcLengthPx > 0 ? maxStepPx / arcLengthPx : 0;

  const diff = target - current;
  // Move toward target but keep maxDistanceFromPlayer offset (always slightly
  // off the player so the player isn't perma-contested unless level is high).
  const offsetPx = cfg.maxDistanceFromPlayer;
  const offsetNorm = arcLengthPx > 0 ? offsetPx / arcLengthPx : 0;
  const aimingFor = target - Math.sign(diff || 1) * offsetNorm;
  const delta = clamp(aimingFor - current, -maxStepNorm, maxStepNorm);
  return clamp(current + delta, 0, 1);
}

/**
 * Decide whether the bot SHOOTER should fake on this attempt.
 * Pure function: pass in your own RNG for testing.
 */
export function shouldFake(level: DefenderDifficulty, rng: () => number = Math.random): boolean {
  return rng() < DEFENDER_LEVELS[level].fakeChance;
}

/**
 * Pick a wind-up duration for the bot shooter (used on the player's defense
 * screen). Adds a random rhythmJitter so high-level bots don't have predictable
 * timing.
 */
export function pickWindupMs(level: DefenderDifficulty, rng: () => number = Math.random): number {
  const cfg: DefenderLevelConfig = DEFENDER_LEVELS[level];
  const base = cfg.windupMsMin + rng() * (cfg.windupMsMax - cfg.windupMsMin);
  const jitter = (rng() - 0.5) * 2 * cfg.rhythmJitterMs;
  return Math.max(150, base + jitter);
}

/**
 * Bot offense: when the bot is the shooter (vs-bot defense screens), should
 * the shot go in if the player misses the block?
 *
 * Returns 'make' or 'miss' deterministically based on rng + base accuracy.
 */
export function botShotResult(
  level: DefenderDifficulty,
  rng: () => number = Math.random
): 'make' | 'miss' {
  return rng() < DEFENDER_LEVELS[level].botMakeProb ? 'make' : 'miss';
}
