/**
 * gameConfig.ts — single source of truth for every tunable number in BUCKETS.
 *
 * THE TUNING DASHBOARD
 * --------------------
 * The `CONFIG` object near the top of this file is the tuning dashboard.
 * Every value used by the game's feel — shooting, defender, scoring,
 * timing, juice — lives there with a comment explaining what it does
 * and which direction to tune it.
 *
 * Tuning convention:
 *   ↑ value = harder for the player (or longer / faster)
 *   ↓ value = easier for the player (or shorter / slower)
 *
 * NEVER hardcode a tunable number outside this file. If you find yourself
 * tempted to inline a value, add a key to CONFIG instead.
 *
 * COMPATIBILITY EXPORTS
 * ---------------------
 * Below CONFIG we re-export legacy named constants the rest of the codebase
 * still imports. Each one is derived from CONFIG so editing CONFIG is the
 * single tuning point. Tables that don't fit the flat dashboard
 * (per-level defenders, layout fractions, unlock costs) live below as well.
 */

// ============================================================================
// MASTER TUNING DASHBOARD
// ============================================================================
//
// Every value below has a comment explaining what it does and which
// direction to tune it. Change values here; the rest of the codebase
// re-exports / derives from these.

export const CONFIG = {
  // --- GAME TIMING ---
  GAME_DURATION_SEC: 180,        // total game length in seconds. ↑ = longer match.
  TURN_DURATION_SEC: 45,         // each offense/defense turn length. ↑ = more shots per turn.
  SHOT_CLOCK_SEC: 24,            // time to attempt each shot. ↑ = less pressure.

  // --- SHOOTING ---
  SHOT_POWER_MIN: 0.3,           // minimum shot power. ↑ = fewer air balls on tiny pulls.
  SHOT_POWER_MAX: 1.0,           // maximum shot power cap. ↓ = ball never flies over backboard.
  SHOT_PULL_DISTANCE_MAX: 180,   // px of pull = max power. ↓ = more sensitive (easier to max out).
  SHOT_PULL_DEADZONE_PX: 12,     // px of jitter ignored at gesture start.
  SHOT_PULL_MIN_FOR_RELEASE_PX: 25, // px of pull required for a release to count as a shot.
  ARC_PREVIEW_OPACITY: 0.6,      // dotted arc trajectory visibility (0..1).
  RELEASE_FORGIVENESS_MS: 80,    // ms window for "clean" release timing.
  RIM_HITBOX_SIZE: 1.4,          // multiplier on visual rim size. ↓ = harder to make.
  PERFECT_RELEASE_BONUS_PTS: 1,  // bonus points for a clean release.

  // --- SCORING ---
  OPEN_SHOT_PTS: 3,              // points for uncontested make.
  CONTESTED_SHOT_PTS: 5,         // points for make with defender close. ↑ = bigger reward for risk.
  BLOCK_XP_BONUS: 10,            // extra XP awarded for a perfect block.

  // --- ARC MOVEMENT ---
  ARC_SLIDE_SPEED: 160,          // px/sec player moves along the arc. ↑ = faster.
  ARC_PARALLAX_INTENSITY: 0.3,   // background shift on arc movement (0 = no parallax).

  // --- DEFENDER BOT (offense screen — player is shooting) ---
  BOT_CLOSEOUT_SPEED_L1: 60,     // Grandpa. ↑ = harder.
  BOT_CLOSEOUT_SPEED_L2: 120,    // Rec League.
  BOT_CLOSEOUT_SPEED_L3: 200,    // Pro.
  BOT_CLOSEOUT_SPEED_L4: 280,    // Alien.
  BOT_CONTEST_RANGE_PX: 80,      // distance defender must be within to "contest" the shot.
  BOT_FAKE_CHANCE_L3: 0.25,      // 25% head-fake chance at Level 3.
  BOT_FAKE_CHANCE_L4: 0.50,      // 50% head-fake chance at Level 4.

  // --- DEFENSE (player is blocking) ---
  BLOCK_EARLY_WINDOW_MS: 300,    // ms before release = EARLY (whiff).
  BLOCK_PERFECT_WINDOW_MS: 150,  // ±ms around release = PERFECT (block).
  BLOCK_LATE_WINDOW_MS: 100,     // ms after release = LATE (no block).
  JUMP_COOLDOWN_MS: 800,         // cooldown after biting on a fake. ↑ = more punishing.

  // --- POWER UPS ---
  POWERUP_SPAWN_INTERVAL_SEC: 8, // average seconds between new power-up spawns.
  BIGGER_RIM_MULTIPLIER: 2.0,    // rim hitbox multiplier while active.
  SPEED_BOOST_MULTIPLIER: 2.0,   // arc slide speed multiplier while active.
  SPEED_BOOST_DURATION_MS: 5000, // ms a speed boost lasts.
  ICE_DEFENDER_DURATION_MS: 3000,// ms the defender is frozen.
  GHOST_SHOT_DURATION_MS: 5000,  // ms the ghost shot effect persists if unused.

  // --- JUICE ---
  SCREEN_SHAKE_PX: 4,            // pixels of screen shake on big moments.
  SCREEN_SHAKE_MS: 200,          // duration of screen shake.
  SCORE_POP_SCALE: 1.3,          // score number scale-up on point scored.
  FLASH_TEXT_DURATION_MS: 600,   // "PERFECT!" / "BLOCKED!" display time.
  CONTESTED_GLOW_OPACITY: 0.55,  // red ring around shooter when defender is in contest range.

  // --- PROGRESSION ---
  XP_WIN: 100,                   // XP awarded for winning a match.
  XP_LOSS: 50,                   // XP awarded for losing a match.
  XP_PERFECT_BLOCK: 10,          // extra XP per perfect block.
  XP_CONTESTED_MAKE: 5,          // extra XP per contested make.
  LEVEL_XP_THRESHOLD: 500,       // flat XP threshold per level.
} as const;

// ============================================================================
// LEGACY / DERIVED EXPORTS
// ============================================================================
//
// Everything below is mechanically derived from CONFIG (or extends it for
// per-level / per-asset detail). Keep all *tuning* in CONFIG above.

// ---------- Game / turn timing ----------
export const GAME_DURATION_SEC = CONFIG.GAME_DURATION_SEC;
export const TURN_DURATION_SEC = CONFIG.TURN_DURATION_SEC;
export const SHOT_CLOCK_SEC = CONFIG.SHOT_CLOCK_SEC;
export const COUNTDOWN_BEEP_THRESHOLD_SEC = 5;
export const TURN_ANNOUNCE_MS = 1800;
export const PASS_PHONE_COUNTDOWN_SEC = 3;
export const COIN_FLIP_DURATION_MS = 2400;
export const POST_RESULT_PAUSE_MS = 1000;

// ---------- Shooting — slingshot physics ----------
export const PULL_DEADZONE_PX = CONFIG.SHOT_PULL_DEADZONE_PX;
export const PULL_MIN_FOR_RELEASE_PX = CONFIG.SHOT_PULL_MIN_FOR_RELEASE_PX;
export const PULL_MAX_PX = CONFIG.SHOT_PULL_DISTANCE_MAX;
export const SHOT_POWER_MIN = CONFIG.SHOT_POWER_MIN;
export const SHOT_POWER_MAX = CONFIG.SHOT_POWER_MAX;

// Ball-flight bezier shape. These are visual tunables — tweak when the arc
// looks too flat or the ball reaches the rim too fast.
export const SHOT_FLIGHT_MS_MIN = 700;
export const SHOT_FLIGHT_MS_MAX = 1050;
export const SHOT_ARC_HEIGHT_FACTOR = 0.6;
export const SHOT_GRAVITY_PARAM = 4;

// Aim sensitivity. 1.0 mirrors pull direction exactly; lower flattens lateral
// aim so wild horizontal pulls don't fire sideways.
export const AIM_SENSITIVITY = 0.85;
export const AIM_MAX_DEG = 35;

// Rim hitbox. Base px radius, multiplied by CONFIG.RIM_HITBOX_SIZE.
export const RIM_HITBOX_PX_BASE = 20;
export const RIM_HITBOX_SIZE = RIM_HITBOX_PX_BASE * CONFIG.RIM_HITBOX_SIZE;
export const BIGGER_RIM_MULTIPLIER = CONFIG.BIGGER_RIM_MULTIPLIER;

// Contested-shot mechanic.
export const CONTEST_DISTANCE_PX = CONFIG.BOT_CONTEST_RANGE_PX;
export const CONTESTED_MAKE_PROB_PENALTY = 0.25;

// Perfect release window timing.
export const RELEASE_HOLD_TARGET_MS = 280;
export const PERFECT_RELEASE_WINDOW_MS = CONFIG.RELEASE_FORGIVENESS_MS;

// ---------- Offense — arc slide ----------
// `ARC_SLIDE_SPEED` for the gesture handler is a multiplier on raw pan
// delta. The CONFIG.ARC_SLIDE_SPEED value (px/sec) is the *world* speed
// referenced in HUD copy and the design dashboard. Both live here:
export const ARC_SLIDE_SPEED = 1.6;
export const ARC_SLIDE_SPEED_PX_SEC = CONFIG.ARC_SLIDE_SPEED;
export const SPEED_BOOST_MULTIPLIER = CONFIG.SPEED_BOOST_MULTIPLIER;
export const SPEED_BOOST_DURATION_MS = CONFIG.SPEED_BOOST_DURATION_MS;
export const PLAYER_ARC_MIN = 0.05;
export const PLAYER_ARC_MAX = 0.95;
export const ARC_PARALLAX_INTENSITY = CONFIG.ARC_PARALLAX_INTENSITY;
export const ARC_PREVIEW_OPACITY = CONFIG.ARC_PREVIEW_OPACITY;

// ---------- Defense — block timing ----------
export const SWIPE_UP_MIN_VELOCITY = 600;
export const SWIPE_UP_MIN_DISTANCE_PX = 40;
export const JUMP_AIRTIME_MS = 480;
export const FAKE_COOLDOWN_MS = CONFIG.JUMP_COOLDOWN_MS;

export interface DefenderLevelConfig {
  id: 1 | 2 | 3 | 4;
  name: 'Grandpa' | 'Rec League' | 'Pro' | 'Alien';
  windupMsMin: number;
  windupMsMax: number;
  earlyWindowMs: number;
  perfectWindowMs: number;
  lateWindowMs: number;
  fakeChance: number;
  rhythmJitterMs: number;
  botMakeProb: number;
}

/**
 * Per-level defender configs. The CONFIG.BLOCK_*_WINDOW_MS values are the
 * "Rec League" baseline; harder levels narrow the windows, easier levels
 * widen them. Fakes only appear at Level 3+ as specced.
 */
export const DEFENDER_LEVELS: Record<1 | 2 | 3 | 4, DefenderLevelConfig> = {
  1: {
    id: 1,
    name: 'Grandpa',
    windupMsMin: 1100, windupMsMax: 1300,
    earlyWindowMs: CONFIG.BLOCK_EARLY_WINDOW_MS + 50,
    perfectWindowMs: CONFIG.BLOCK_PERFECT_WINDOW_MS + 30,
    lateWindowMs: CONFIG.BLOCK_LATE_WINDOW_MS + 50,
    fakeChance: 0,
    rhythmJitterMs: 80,
    botMakeProb: 0.35,
  },
  2: {
    id: 2,
    name: 'Rec League',
    windupMsMin: 800, windupMsMax: 1000,
    earlyWindowMs: CONFIG.BLOCK_EARLY_WINDOW_MS,
    perfectWindowMs: CONFIG.BLOCK_PERFECT_WINDOW_MS,
    lateWindowMs: CONFIG.BLOCK_LATE_WINDOW_MS,
    fakeChance: 0,
    rhythmJitterMs: 140,
    botMakeProb: 0.5,
  },
  3: {
    id: 3,
    name: 'Pro',
    windupMsMin: 550, windupMsMax: 750,
    earlyWindowMs: CONFIG.BLOCK_EARLY_WINDOW_MS - 50,
    perfectWindowMs: CONFIG.BLOCK_PERFECT_WINDOW_MS - 30,
    lateWindowMs: CONFIG.BLOCK_LATE_WINDOW_MS - 20,
    fakeChance: CONFIG.BOT_FAKE_CHANCE_L3,
    rhythmJitterMs: 220,
    botMakeProb: 0.62,
  },
  4: {
    id: 4,
    name: 'Alien',
    windupMsMin: 380, windupMsMax: 600,
    earlyWindowMs: CONFIG.BLOCK_EARLY_WINDOW_MS - 80,
    perfectWindowMs: CONFIG.BLOCK_PERFECT_WINDOW_MS - 60,
    lateWindowMs: CONFIG.BLOCK_LATE_WINDOW_MS - 40,
    fakeChance: CONFIG.BOT_FAKE_CHANCE_L4,
    rhythmJitterMs: 320,
    botMakeProb: 0.7,
  },
};

// ---------- Bot defender close-out by level ----------
export interface BotDefenderConfig {
  closeOutSpeed: number;
  maxDistanceFromPlayer: number;
}

export const BOT_DEFENDER_BY_LEVEL: Record<1 | 2 | 3 | 4, BotDefenderConfig> = {
  1: { closeOutSpeed: CONFIG.BOT_CLOSEOUT_SPEED_L1, maxDistanceFromPlayer: 90 },
  2: { closeOutSpeed: CONFIG.BOT_CLOSEOUT_SPEED_L2, maxDistanceFromPlayer: 60 },
  3: { closeOutSpeed: CONFIG.BOT_CLOSEOUT_SPEED_L3, maxDistanceFromPlayer: 40 },
  4: { closeOutSpeed: CONFIG.BOT_CLOSEOUT_SPEED_L4, maxDistanceFromPlayer: 25 },
};

// ---------- Scoring ----------
export const POINTS_OPEN_MAKE = CONFIG.OPEN_SHOT_PTS;
export const POINTS_CONTESTED_MAKE = CONFIG.CONTESTED_SHOT_PTS;
export const POINTS_PERFECT_RELEASE_BONUS = CONFIG.PERFECT_RELEASE_BONUS_PTS;
export const POINTS_BLOCK_FOR_SHOOTER = 0;

// ---------- Power-ups ----------
export const POWERUP_SPAWN_INTERVAL_MS_MIN =
  CONFIG.POWERUP_SPAWN_INTERVAL_SEC * 1000 - 1500;
export const POWERUP_SPAWN_INTERVAL_MS_MAX =
  CONFIG.POWERUP_SPAWN_INTERVAL_SEC * 1000 + 1500;
export const POWERUP_LIFETIME_MS = 6000;
export const POWERUP_PICKUP_RADIUS_PX = 35;
export const ICE_DEFENDER_DURATION_MS = CONFIG.ICE_DEFENDER_DURATION_MS;
export const GHOST_SHOT_DURATION_MS = CONFIG.GHOST_SHOT_DURATION_MS;

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
  doubleJump: 0.5,
};

export const PHASE2_ONLY_BIGGER_RIM = false;

// ---------- Juice / feel ----------
export const SCREEN_SHAKE_PX = CONFIG.SCREEN_SHAKE_PX;
export const SCREEN_SHAKE_MS = CONFIG.SCREEN_SHAKE_MS;
export const SCORE_POP_SCALE = CONFIG.SCORE_POP_SCALE;
export const FLASH_TEXT_DURATION_MS = CONFIG.FLASH_TEXT_DURATION_MS;
export const CONTESTED_GLOW_OPACITY = CONFIG.CONTESTED_GLOW_OPACITY;

// ---------- Progression — XP and unlocks ----------
export const XP_WIN = CONFIG.XP_WIN;
export const XP_LOSS = CONFIG.XP_LOSS;
export const XP_PERFECT_BLOCK_BONUS = CONFIG.XP_PERFECT_BLOCK;
export const XP_CONTESTED_MAKE_BONUS = CONFIG.XP_CONTESTED_MAKE;
export const XP_PER_LEVEL_BASE = CONFIG.LEVEL_XP_THRESHOLD;
export const XP_LEVEL_EXP = 1.0;
export const UNLOCK_POINTS_PER_LEVEL = 1;

export type CourtId = 'playground' | 'gym' | 'rooftop' | 'space';
export type DefenderId = 'grandpa' | 'recLeague' | 'pro' | 'alien';
export type SkinId = 'classic' | 'neon' | 'gold' | 'ghost';

export const COURT_UNLOCK_COST: Record<CourtId, number> = {
  playground: 0,
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

// ---------- Layout / screen geometry ----------
//
// The third-person behind-the-shooter layout puts the player low-bottom,
// the basket mid-screen elevated, and the defender between them. These
// fractions drive both OffenseScreen and DefenseScreen.
export const LAYOUT = {
  /** Basket sprite width as a fraction of screen width (capped by px). */
  basketWidthFraction: 0.42,
  basketWidthMaxPx: 220,
  /** Basket sprite top position as a fraction of screen height — mid-upper. */
  basketTopFraction: 0.16,
  /** Shooter Y (his feet/center) as a fraction of screen height. */
  playerYFraction: 0.82,
  /** Side padding where the on-court 3PT arc starts/ends (fraction of width). */
  arcSidePaddingFraction: 0.08,
  /** Lower half is the shoot zone (slingshot gesture); upper half is slide. */
  shootZoneHeightFraction: 0.5,
  /** Defender sprite size in px, behind-camera perspective. */
  defenderSpritePx: 90,
  /** Shooter sprite size in px, behind-camera perspective. */
  shooterSpritePx: 140,
  /** Ball sprite size in px when held / in flight. */
  ballSpritePx: 28,
  /** Trajectory preview dash count. */
  trajectoryDashSegments: 14,
  /** Defender renders this many px above the shooter base (toward basket). */
  defenderYOffsetPx: 150,
  /** Contested-shot defender Y offset relative to player for hit testing. */
  defenderToPlayerYContestOffset: 80,
  /** Bottom-padding of the shoot zone label. */
  shootLabelTopPaddingPx: 6,
  /** Crowd band: relative Y where painted crowd sits in the court background. */
  crowdBandTopFraction: 0.32,
  crowdBandHeightFraction: 0.13,
} as const;

// ---------- Sprite geometry ----------
/** Where the rim center sits inside the basket sprite, vertically. */
export const BASKET_RIM_Y_FACTOR = 0.55;
export const BASKET_RIM_PIXEL_FUDGE_PX = 4;

// ---------- Highlight reel ----------
export const HIGHLIGHT_BUFFER_FRAMES = 60;
export const HIGHLIGHT_FRAME_INTERVAL_MS = 33;
export const HIGHLIGHT_PLAYBACK_LOOP_SEC = 3;
