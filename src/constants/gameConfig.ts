/**
 * gameConfig.ts — single source of truth for every tunable number in BUCKETS.
 *
 * Tuning convention:
 *   ↑ value = harder for the player (or longer / faster)
 *   ↓ value = easier for the player (or shorter / slower)
 *
 * NEVER hardcode a tunable number outside this file. If you find yourself
 * tempted to inline a value, add a key here instead.
 */

// ---------------------------------------------------------------------------
// Game / turn timing
// ---------------------------------------------------------------------------

export const GAME_DURATION_SEC = 180; // total match length. ↑ = longer game.
export const TURN_DURATION_SEC = 30;  // each offense or defense turn. ↑ = more shots per turn.
export const COUNTDOWN_BEEP_THRESHOLD_SEC = 5; // play tick beeps in last N seconds.
export const TURN_ANNOUNCE_MS = 1800;  // "YOUR TURN — OFFENSE" splash duration.
export const PASS_PHONE_COUNTDOWN_SEC = 3; // 2P pass-the-phone countdown.
export const COIN_FLIP_DURATION_MS = 2400; // animation length before result is revealed.
export const POST_RESULT_PAUSE_MS = 1000;  // pause after make/miss/block before next shot.

// ---------------------------------------------------------------------------
// Offense — slingshot shot physics
// ---------------------------------------------------------------------------

// Pull-distance in raw screen px maps to power [SHOT_POWER_MIN..MAX].
// Pulls shorter than _DEADZONE_PX are treated as "not really pulling yet".
export const PULL_DEADZONE_PX = 12;     // ignore tiny finger jiggles.
export const PULL_MIN_FOR_RELEASE_PX = 25; // releasing below this = cancel, not shoot.
export const PULL_MAX_PX = 240;         // farther pulls clamp; no extra power.
export const SHOT_POWER_MIN = 0.35;     // 0..1 scalar at the minimum useful pull.
export const SHOT_POWER_MAX = 1.0;      // 0..1 scalar when pulled to PULL_MAX_PX.

// Arc physics. Ball is parameterized t ∈ [0..1] along a parabola.
// Higher GRAVITY = ball drops sooner / lower peak. Higher LAUNCH = higher arc.
export const SHOT_FLIGHT_MS_MIN = 700;   // weakest shots take this long. ↑ = slower ball.
export const SHOT_FLIGHT_MS_MAX = 1050;  // strongest shots take this long.
export const SHOT_ARC_HEIGHT_FACTOR = 0.6; // % of vertical distance added as arc peak.
export const SHOT_GRAVITY_PARAM = 4;     // controls parabola flatness — bigger = flatter peak.

// Aim. Pull direction's X component scaled by AIM_SENSITIVITY → lateral shift.
// Set to 1.0 = pixel-for-pixel mirror. Lower = harder to miss left/right.
export const AIM_SENSITIVITY = 0.85;
export const AIM_MAX_DEG = 35;           // shots clamp to this deviation from straight up.

// Rim. Hitbox is a circle around the rim center; ball "makes" when center
// passes through during descent within RIM_HITBOX_SIZE px of rim center.
export const RIM_HITBOX_SIZE = 28;       // base radius in px. ↑ = easier shooting.
export const BIGGER_RIM_MULTIPLIER = 2;  // Bigger Rim power-up multiplies hitbox.

// Defender contest distance — if defender is closer than this on release,
// the shot is "contested" (worth more points if it goes in, harder to make).
export const CONTEST_DISTANCE_PX = 80;   // ↑ = easier to be contested.
export const CONTESTED_MAKE_PROB_PENALTY = 0.25; // probability subtracted on top of
//                                                  the geometric hit-check when contested.

// Perfect-release timing window. After pull-back peaks, releasing within
// PERFECT_RELEASE_WINDOW_MS of holding-still gives +1 bonus point.
export const RELEASE_HOLD_TARGET_MS = 280;
export const PERFECT_RELEASE_WINDOW_MS = 110;

// ---------------------------------------------------------------------------
// Offense — slide along the arc
// ---------------------------------------------------------------------------

export const ARC_SLIDE_SPEED = 1.6;         // multiplier on raw pan delta. ↑ = faster slide.
export const SPEED_BOOST_MULTIPLIER = 2.0;  // Speed Boost power-up.
export const SPEED_BOOST_DURATION_MS = 5000;
export const PLAYER_ARC_MIN = 0.05;         // 0..1 normalized position along the arc.
export const PLAYER_ARC_MAX = 0.95;

// ---------------------------------------------------------------------------
// Defense — wind-up, telegraph, swipe-up timing
// ---------------------------------------------------------------------------

// All times are in ms. The defender shooter goes:
//   IDLE → (wind-up animation) → RELEASE moment → ball travels → resolve
// The player swipes UP. A swipe is classified relative to the RELEASE moment:
//   * Before RELEASE - EARLY_WINDOW_MS = ignored (too early, no jump yet)
//   * Within EARLY_WINDOW_MS before RELEASE = EARLY (whiff, scorer gets open look)
//   * Within ±PERFECT_WINDOW_MS of RELEASE = PERFECT (block!)
//   * Within LATE_WINDOW_MS after RELEASE = LATE (no block, shot goes through)
//   * After LATE_WINDOW_MS = ignored (shot already resolved)
export const SWIPE_UP_MIN_VELOCITY = 600; // px/s. ↑ = harder to register a jump.
export const SWIPE_UP_MIN_DISTANCE_PX = 40;
export const JUMP_AIRTIME_MS = 480;        // visual jump animation length.
export const FAKE_COOLDOWN_MS = 700;       // after biting on a fake, player can't jump.

export interface DefenderLevelConfig {
  id: 1 | 2 | 3 | 4;
  name: 'Grandpa' | 'Rec League' | 'Pro' | 'Alien';
  windupMsMin: number;           // ↓ = faster wind-up = harder.
  windupMsMax: number;
  earlyWindowMs: number;         // size of EARLY band.
  perfectWindowMs: number;       // size of PERFECT band (±). ↑ = easier to block.
  lateWindowMs: number;          // size of LATE band.
  fakeChance: number;            // 0..1. probability of head fake on any given attempt.
  rhythmJitterMs: number;        // randomized add to windup. ↑ = more unpredictable.
  // Bot accuracy as the shooter (used when bot is on offense):
  botMakeProb: number;           // base prob to make an open look.
}

export const DEFENDER_LEVELS: Record<1 | 2 | 3 | 4, DefenderLevelConfig> = {
  1: {
    id: 1,
    name: 'Grandpa',
    windupMsMin: 1100, windupMsMax: 1300,
    earlyWindowMs: 350, perfectWindowMs: 280, lateWindowMs: 250,
    fakeChance: 0,
    rhythmJitterMs: 80,
    botMakeProb: 0.35,
  },
  2: {
    id: 2,
    name: 'Rec League',
    windupMsMin: 800, windupMsMax: 1000,
    earlyWindowMs: 280, perfectWindowMs: 180, lateWindowMs: 180,
    fakeChance: 0.1,
    rhythmJitterMs: 140,
    botMakeProb: 0.5,
  },
  3: {
    id: 3,
    name: 'Pro',
    windupMsMin: 550, windupMsMax: 750,
    earlyWindowMs: 220, perfectWindowMs: 120, lateWindowMs: 140,
    fakeChance: 0.25,
    rhythmJitterMs: 220,
    botMakeProb: 0.62,
  },
  4: {
    id: 4,
    name: 'Alien',
    windupMsMin: 380, windupMsMax: 600,
    earlyWindowMs: 180, perfectWindowMs: 80,  lateWindowMs: 110,
    fakeChance: 0.5,
    rhythmJitterMs: 320,
    botMakeProb: 0.7,
  },
};

// ---------------------------------------------------------------------------
// Bot AI (when the bot is on offense as the shooter, before that, when it's
// on defense as the contesting defender on the player's offense screen)
// ---------------------------------------------------------------------------

export interface BotDefenderConfig {
  closeOutSpeed: number; // px/sec the defender slides toward player.
  maxDistanceFromPlayer: number; // defender ideally stays within this many px of player.
}

export const BOT_DEFENDER_BY_LEVEL: Record<1 | 2 | 3 | 4, BotDefenderConfig> = {
  1: { closeOutSpeed: 90,  maxDistanceFromPlayer: 90 },
  2: { closeOutSpeed: 140, maxDistanceFromPlayer: 60 },
  3: { closeOutSpeed: 200, maxDistanceFromPlayer: 40 },
  4: { closeOutSpeed: 280, maxDistanceFromPlayer: 25 },
};

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export const POINTS_OPEN_MAKE = 3;
export const POINTS_CONTESTED_MAKE = 5;
export const POINTS_PERFECT_RELEASE_BONUS = 1;
export const POINTS_BLOCK_FOR_SHOOTER = 0;

// ---------------------------------------------------------------------------
// Power-ups
// ---------------------------------------------------------------------------

export const POWERUP_SPAWN_INTERVAL_MS_MIN = 4500;
export const POWERUP_SPAWN_INTERVAL_MS_MAX = 8000;
export const POWERUP_LIFETIME_MS = 6000;     // how long it sits on the arc.
export const POWERUP_PICKUP_RADIUS_PX = 35;
export const ICE_DEFENDER_DURATION_MS = 3000;
export const GHOST_SHOT_DURATION_MS = 5000;  // ghost shot expires if unused.

export type PowerUpKind =
  | 'biggerRim'
  | 'doubleJump'
  | 'speedBoost'
  | 'iceDefender'
  | 'ghostShot';

export const POWERUP_WEIGHTS_OFFENSE: Record<PowerUpKind, number> = {
  biggerRim: 1.0,
  speedBoost: 0.8,
  iceDefender: 0.7,
  ghostShot: 0.6,
  doubleJump: 0.5, // useful on defense; still spawnable but rarer.
};

/**
 * Phase 2 spawned only Bigger Rim. Phase 4 enables the full weighted pool
 * (biggerRim, speedBoost, iceDefender, ghostShot, doubleJump). Set this to
 * `true` to revert to Phase 2 behavior for testing balance.
 */
export const PHASE2_ONLY_BIGGER_RIM = false;

// ---------------------------------------------------------------------------
// Progression — XP and unlocks
// ---------------------------------------------------------------------------

export const XP_WIN = 100;
export const XP_LOSS = 50;
export const XP_PERFECT_BLOCK_BONUS = 10;
export const XP_CONTESTED_MAKE_BONUS = 5;

// Per-level XP threshold: level N requires XP_PER_LEVEL_BASE * (N ** XP_LEVEL_EXP).
export const XP_PER_LEVEL_BASE = 250;
export const XP_LEVEL_EXP = 1.35;
export const UNLOCK_POINTS_PER_LEVEL = 1;

export type CourtId = 'playground' | 'gym' | 'rooftop' | 'space';
export type DefenderId = 'grandpa' | 'recLeague' | 'pro' | 'alien';
export type SkinId = 'classic' | 'neon' | 'gold' | 'ghost';

export const COURT_UNLOCK_COST: Record<CourtId, number> = {
  playground: 0, // free
  gym: 3,
  rooftop: 6,
  space: 10,
};
export const DEFENDER_UNLOCK_COST: Record<DefenderId, number> = {
  grandpa: 0,
  recLeague: 2,
  pro: 4,
  alien: 8,
};
export const SKIN_UNLOCK_COST: Record<SkinId, number> = {
  classic: 0,
  neon: 2,
  gold: 5,
  ghost: 8,
};

// ---------------------------------------------------------------------------
// Layout / screen geometry
// ---------------------------------------------------------------------------
//
// These ratios drive the OffenseScreen and DefenseScreen layouts. They keep
// the visual proportions consistent across phone form factors. Each is a
// fraction of the play area's width/height.

export const LAYOUT = {
  /** Basket sprite width as a fraction of screen width (capped by px). */
  basketWidthFraction: 0.42,
  basketWidthMaxPx: 180,
  /** Basket sprite top position as a fraction of screen height. */
  basketTopFraction: 0.06,
  /** Player Y as a fraction of screen height — where the player ball sits. */
  playerYFraction: 0.55,
  /** Padding from each side, as a fraction of screen width, where arc starts/ends. */
  arcSidePaddingFraction: 0.08,
  /** Slingshot zone height as a fraction of screen height. */
  shootZoneHeightFraction: 0.4,
  /** Sprite size for player/defender on offense screen, in px. */
  defenderSpritePx: 64,
  ballSpritePx: 32,
  /** Number of segments to dash the trajectory preview. */
  trajectoryDashSegments: 12,
  /** Defender draws this many px above the player. */
  defenderYOffsetPx: 100,
  /** When evaluating contested distance, defender Y is offset from player by this much. */
  defenderToPlayerYContestOffset: 50,
  /** SafeArea-friendly bottom inset for the shoot zone label. */
  shootLabelTopPaddingPx: 6,
} as const;

// ---------------------------------------------------------------------------
// Sprite geometry
// ---------------------------------------------------------------------------

/**
 * Where the rim center sits inside the basket sprite, as a fraction of the
 * sprite's own height. Used to compute the world-space rim position from the
 * basket sprite's top.
 */
export const BASKET_RIM_Y_FACTOR = 0.55;
export const BASKET_RIM_PIXEL_FUDGE_PX = 4;

// ---------------------------------------------------------------------------
// Highlight reel
// ---------------------------------------------------------------------------

export const HIGHLIGHT_BUFFER_FRAMES = 60;   // last N frames retained per moment.
export const HIGHLIGHT_FRAME_INTERVAL_MS = 33; // ~30 fps capture.
export const HIGHLIGHT_PLAYBACK_LOOP_SEC = 3;
