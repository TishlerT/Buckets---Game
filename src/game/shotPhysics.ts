/**
 * shotPhysics.ts — pure functions for the slingshot shot.
 *
 * The math here is intentionally simple and deterministic so it's easy to
 * unit-test and tune. Visual rendering layers on top of these primitives.
 *
 * Coordinate convention used throughout:
 *   - x increases to the right
 *   - y increases DOWNWARD (matches React Native screen coords)
 *   - "pull" is the gesture vector from finger-down to current finger position;
 *     pulling DOWN means dy > 0
 *
 * The launch direction is the negation of the pull vector (slingshot:
 * pulling down-and-left fires up-and-right).
 */

import {
  AIM_MAX_DEG,
  AIM_SENSITIVITY,
  BIGGER_RIM_MULTIPLIER,
  CONTEST_DISTANCE_PX,
  CONTESTED_MAKE_PROB_PENALTY,
  PERFECT_RELEASE_WINDOW_MS,
  POINTS_CONTESTED_MAKE,
  POINTS_OPEN_MAKE,
  POINTS_PERFECT_RELEASE_BONUS,
  PULL_DEADZONE_PX,
  PULL_MAX_PX,
  PULL_MIN_FOR_RELEASE_PX,
  RELEASE_HOLD_TARGET_MS,
  RIM_HITBOX_SIZE,
  SHOT_ARC_HEIGHT_FACTOR,
  SHOT_FLIGHT_MS_MAX,
  SHOT_FLIGHT_MS_MIN,
  SHOT_POWER_MAX,
  SHOT_POWER_MIN,
} from '@/constants/gameConfig';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Vec2 {
  x: number;
  y: number;
}

export interface PullState {
  /** Original press-down position, screen px. */
  start: Vec2;
  /** Current finger position, screen px. */
  current: Vec2;
  /** ms since gesture began. Used for perfect-release timing classification. */
  elapsedMs: number;
}

export interface ShotInputs {
  /** The player's launch position (where the ball spawns from). */
  player: Vec2;
  /** The basket / rim center. */
  rim: Vec2;
  /** The defender's position; null = no defender on screen. */
  defender: Vec2 | null;
  /** Powerup flags affecting this shot. */
  biggerRimActive: boolean;
  ghostShotActive: boolean;
  /** Final pull vector at moment of release. */
  pull: Vec2;
  /** Time the gesture was held before release, in ms. */
  heldMs: number;
}

export interface ShotResult {
  /** 'make' if ball passed the rim hitbox during descent. */
  result: 'make' | 'miss';
  /** Whether the defender was within CONTEST_DISTANCE on release. */
  contested: boolean;
  /** Whether the player's release timing landed in PERFECT_RELEASE_WINDOW_MS. */
  perfectRelease: boolean;
  /** Final point award for this shot (0 if miss, includes bonus). */
  points: number;
  /** Animation parameters for the visual ball flight. */
  flight: ShotFlight;
}

export interface ShotFlight {
  start: Vec2;
  apex: Vec2;
  /** End point — the point where the ball's center actually lands. */
  end: Vec2;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Length of a 2D vector. */
export function vlen(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

/** Distance between two points. */
export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Clamp a number into [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/** Linear interpolate from a to b at t∈[0,1]. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Map a pull length in px to a power scalar in [0,1]. */
export function pullToPower(pullLengthPx: number): number {
  if (pullLengthPx <= PULL_DEADZONE_PX) return 0;
  const usable = Math.min(pullLengthPx, PULL_MAX_PX) - PULL_DEADZONE_PX;
  const range = PULL_MAX_PX - PULL_DEADZONE_PX;
  const raw = usable / range; // 0..1
  return clamp(lerp(SHOT_POWER_MIN, SHOT_POWER_MAX, raw), 0, 1);
}

/** Returns true if a release at `pullLengthPx` should be cancelled (no shot). */
export function isCancelledRelease(pullLengthPx: number): boolean {
  return pullLengthPx < PULL_MIN_FOR_RELEASE_PX;
}

/**
 * Convert a pull vector into a normalized aim direction.
 *
 * Slingshot: launch direction is opposite of pull. We also clamp the angle
 * away from straight-up by AIM_MAX_DEG so wild horizontal pulls don't fire
 * sideways — basketball shots fundamentally go up.
 */
export function aimFromPull(pull: Vec2): Vec2 {
  const launch = { x: -pull.x * AIM_SENSITIVITY, y: -pull.y };
  // Convert to angle from straight-up (negative y axis).
  // Straight up = atan2(1, 0) for our purpose; we measure angle off vertical.
  const len = vlen(launch);
  if (len === 0) return { x: 0, y: -1 };
  const nx = launch.x / len;
  const ny = launch.y / len;

  // Force vertical-ish: if ny is positive (pointing down) we flip — shots
  // always go up. This guards against degenerate "pull up" gestures.
  let dy = ny < 0 ? ny : -Math.abs(ny);
  let dx = nx;

  // Clamp angle from vertical to AIM_MAX_DEG.
  const maxRad = (AIM_MAX_DEG * Math.PI) / 180;
  const angleFromUp = Math.atan2(dx, -dy); // 0 = straight up
  const clampedAngle = clamp(angleFromUp, -maxRad, maxRad);
  dx = Math.sin(clampedAngle);
  dy = -Math.cos(clampedAngle);

  return { x: dx, y: dy };
}

/**
 * Compute the parabolic arc parameters for a shot.
 *
 * The arc starts at `player`, peaks somewhere above the midpoint between
 * player and rim (boosted by power), and ends where the launch direction
 * carries it at rim Y.
 */
export function computeFlight(
  player: Vec2,
  rim: Vec2,
  aim: Vec2,
  power: number
): ShotFlight {
  // Distance from player to rim Y level.
  const verticalSpan = Math.abs(player.y - rim.y);

  // Estimated horizontal travel = (aim.x / |aim.y|) * verticalSpan, scaled by power.
  // Stronger shots overshoot less because they take a higher arc; weaker shots
  // need to be aimed more carefully. Power affects horizontal distance too.
  const horizontalReach = aim.y === 0 ? 0 : (aim.x / Math.abs(aim.y)) * verticalSpan;
  const powerScale = lerp(0.85, 1.15, power); // weak shots fall short, strong fly far
  const endX = player.x + horizontalReach * powerScale;
  const endY = rim.y;

  const apexX = (player.x + endX) / 2;
  // Apex height is BETWEEN the two y values, raised by SHOT_ARC_HEIGHT_FACTOR
  // proportional to the vertical span. A higher factor = taller arc.
  const apexY = Math.min(player.y, endY) - verticalSpan * SHOT_ARC_HEIGHT_FACTOR * (0.7 + power * 0.6);

  const durationMs = lerp(SHOT_FLIGHT_MS_MIN, SHOT_FLIGHT_MS_MAX, power);

  return {
    start: { ...player },
    apex: { x: apexX, y: apexY },
    end: { x: endX, y: endY },
    durationMs,
  };
}

/**
 * Sample the parabolic ball position at parameter t ∈ [0..1].
 * Quadratic Bezier: B(t) = (1-t)²·P0 + 2(1-t)t·P1 + t²·P2
 */
export function sampleFlight(flight: ShotFlight, t: number): Vec2 {
  const tt = clamp(t, 0, 1);
  const u = 1 - tt;
  return {
    x: u * u * flight.start.x + 2 * u * tt * flight.apex.x + tt * tt * flight.end.x,
    y: u * u * flight.start.y + 2 * u * tt * flight.apex.y + tt * tt * flight.end.y,
  };
}

/**
 * Decide whether the shot scores.
 *
 * Geometric base check: did the ball's end point land within the rim hitbox?
 * Then apply contested probability penalty (RNG seeded by caller — we just
 * compute it deterministically here based on a passed-in 0..1 random).
 */
export function classifyShot(
  flight: ShotFlight,
  rim: Vec2,
  inputs: { biggerRimActive: boolean; defender: Vec2 | null; rng: () => number }
): { result: 'make' | 'miss'; contested: boolean } {
  const hitboxRadius = inputs.biggerRimActive
    ? RIM_HITBOX_SIZE * BIGGER_RIM_MULTIPLIER
    : RIM_HITBOX_SIZE;

  const landingDist = dist(flight.end, rim);
  const geometricMake = landingDist <= hitboxRadius;

  const contested = inputs.defender !== null && dist(inputs.defender, flight.start) <= CONTEST_DISTANCE_PX;

  if (!geometricMake) {
    return { result: 'miss', contested };
  }

  // Even if geometrically a make, contested shots have a probabilistic penalty.
  if (contested) {
    const roll = inputs.rng();
    if (roll < CONTESTED_MAKE_PROB_PENALTY) {
      return { result: 'miss', contested };
    }
  }

  return { result: 'make', contested };
}

/**
 * Was the player's release timing inside the perfect-release window?
 *
 * The "ideal" hold is RELEASE_HOLD_TARGET_MS. Any release within
 * ±PERFECT_RELEASE_WINDOW_MS of that counts as perfect.
 */
export function isPerfectRelease(heldMs: number): boolean {
  return Math.abs(heldMs - RELEASE_HOLD_TARGET_MS) <= PERFECT_RELEASE_WINDOW_MS;
}

/** Compute total points for a shot result. */
export function pointsFor(result: 'make' | 'miss', contested: boolean, perfectRelease: boolean): number {
  if (result === 'miss') return 0;
  const base = contested ? POINTS_CONTESTED_MAKE : POINTS_OPEN_MAKE;
  return base + (perfectRelease ? POINTS_PERFECT_RELEASE_BONUS : 0);
}

// ---------------------------------------------------------------------------
// High-level: take all the slingshot inputs and produce a fully-resolved shot.
// Pure function modulo the rng() seed — easy to test.
// ---------------------------------------------------------------------------

export function resolveShot(
  inputs: ShotInputs,
  rng: () => number = Math.random
): ShotResult {
  const power = pullToPower(vlen(inputs.pull));
  const aim = aimFromPull(inputs.pull);
  const flight = computeFlight(inputs.player, inputs.rim, aim, power);

  // Ghost shot: forced make, defender ignored for contesting (no penalty).
  if (inputs.ghostShotActive) {
    const contested = false;
    const perfectRelease = isPerfectRelease(inputs.heldMs);
    const points = pointsFor('make', contested, perfectRelease);
    return { result: 'make', contested, perfectRelease, points, flight };
  }

  const { result, contested } = classifyShot(flight, inputs.rim, {
    biggerRimActive: inputs.biggerRimActive,
    defender: inputs.defender,
    rng,
  });
  const perfectRelease = isPerfectRelease(inputs.heldMs);
  const points = pointsFor(result, contested, perfectRelease);

  return { result, contested, perfectRelease, points, flight };
}
