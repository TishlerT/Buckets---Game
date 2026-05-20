/**
 * powerUps.ts — power-up spawn + effect logic.
 *
 * Power-ups are pure data + a small effect bag the screens consult:
 *   biggerRim   → next shot's rim hitbox is multiplied (consumed on first shot)
 *   doubleJump  → defense gets two swipe attempts on the next contested shot
 *   speedBoost  → ARC_SLIDE_SPEED multiplied for SPEED_BOOST_DURATION_MS
 *   iceDefender → defender frozen for ICE_DEFENDER_DURATION_MS
 *   ghostShot   → next shot is forced make (consumed)
 */

import {
  GHOST_SHOT_DURATION_MS,
  ICE_DEFENDER_DURATION_MS,
  PHASE2_ONLY_BIGGER_RIM,
  PowerUpKind,
  POWERUP_LIFETIME_MS,
  POWERUP_SPAWN_INTERVAL_MS_MAX,
  POWERUP_SPAWN_INTERVAL_MS_MIN,
  POWERUP_WEIGHTS_OFFENSE,
  SPEED_BOOST_DURATION_MS,
} from '@/constants/gameConfig';

export interface PowerUpInstance {
  id: string;
  kind: PowerUpKind;
  /** 0..1 normalized position along the arc. */
  arcPos: number;
  /** ms remaining before despawn. */
  lifetimeRemainingMs: number;
}

export interface PlayerEffects {
  biggerRimNextShot: boolean;
  ghostShotExpiresAt: number | null;     // performance.now timestamp (ms) when expires
  speedBoostExpiresAt: number | null;
  iceDefenderExpiresAt: number | null;
  doubleJumpAvailable: boolean;
}

export const EMPTY_EFFECTS: PlayerEffects = {
  biggerRimNextShot: false,
  ghostShotExpiresAt: null,
  speedBoostExpiresAt: null,
  iceDefenderExpiresAt: null,
  doubleJumpAvailable: false,
};

/**
 * Pick a kind by weighted random.
 *
 * While `PHASE2_ONLY_BIGGER_RIM` is true (Phase 2 spec compliance), every
 * spawn is forced to be a Bigger Rim. Phase 4 flips the flag and unlocks
 * the full weighted pool.
 */
export function pickRandomPowerUpKind(rng: () => number = Math.random): PowerUpKind {
  if (PHASE2_ONLY_BIGGER_RIM) return 'biggerRim';
  const entries = Object.entries(POWERUP_WEIGHTS_OFFENSE) as [PowerUpKind, number][];
  const total = entries.reduce((acc, [, w]) => acc + w, 0);
  let r = rng() * total;
  for (const [kind, w] of entries) {
    r -= w;
    if (r <= 0) return kind;
  }
  return entries[0]![0];
}

/**
 * Pick the next spawn delay (ms) for a power-up.
 */
export function pickSpawnDelayMs(rng: () => number = Math.random): number {
  return (
    POWERUP_SPAWN_INTERVAL_MS_MIN +
    rng() * (POWERUP_SPAWN_INTERVAL_MS_MAX - POWERUP_SPAWN_INTERVAL_MS_MIN)
  );
}

/**
 * Build a fresh power-up at a random arc position.
 */
export function spawnPowerUp(
  rng: () => number = Math.random,
  forcedKind?: PowerUpKind
): PowerUpInstance {
  return {
    id: `pu-${Date.now()}-${Math.floor(rng() * 1e6)}`,
    kind: forcedKind ?? pickRandomPowerUpKind(rng),
    arcPos: 0.1 + rng() * 0.8, // keep away from extreme edges
    lifetimeRemainingMs: POWERUP_LIFETIME_MS,
  };
}

/**
 * Apply a collected power-up to a player effects bag.
 * Returns a NEW PlayerEffects (immutable update).
 */
export function applyPowerUp(
  effects: PlayerEffects,
  kind: PowerUpKind,
  nowMs: number
): PlayerEffects {
  switch (kind) {
    case 'biggerRim':
      return { ...effects, biggerRimNextShot: true };
    case 'doubleJump':
      return { ...effects, doubleJumpAvailable: true };
    case 'speedBoost':
      return {
        ...effects,
        speedBoostExpiresAt: nowMs + SPEED_BOOST_DURATION_MS,
      };
    case 'iceDefender':
      return {
        ...effects,
        iceDefenderExpiresAt: nowMs + ICE_DEFENDER_DURATION_MS,
      };
    case 'ghostShot':
      return {
        ...effects,
        ghostShotExpiresAt: nowMs + GHOST_SHOT_DURATION_MS,
      };
  }
}

/**
 * Convenience: is the effect currently active at `nowMs`?
 */
export function isActive(expiresAt: number | null, nowMs: number): boolean {
  return expiresAt !== null && expiresAt > nowMs;
}

/**
 * Consume single-use effects when a shot is taken. Returns the new effects.
 */
export function consumeOnShot(effects: PlayerEffects): PlayerEffects {
  return {
    ...effects,
    biggerRimNextShot: false,
    // ghostShot gets cleared after one shot regardless of duration
    ghostShotExpiresAt: null,
  };
}

/**
 * Consume the doubleJump availability when the player jumps a second time
 * on a single shot.
 */
export function consumeDoubleJump(effects: PlayerEffects): PlayerEffects {
  return { ...effects, doubleJumpAvailable: false };
}
