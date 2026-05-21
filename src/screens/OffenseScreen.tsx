import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { CourtBackground } from '@/components/CourtBackground';
import { BasketSprite } from '@/components/BasketSprite';
// Legacy DefenderSprite kept as fallback if a screen needs the old top-down
// look; OffenseScreen now uses CloseoutDefenderSprite for the new camera.
import { BackShooterSprite, BackShooterState } from '@/components/BackShooterSprite';
import {
  CloseoutDefenderSprite,
  CloseoutDefenderState,
} from '@/components/CloseoutDefenderSprite';
import { BucketsHud } from '@/components/BucketsHud';
import { HorizontalPowerMeter } from '@/components/HorizontalPowerMeter';
import { BallSprite } from '@/components/BallSprite';
import { BallShadow } from '@/components/BallShadow';
import { ContestedGlow } from '@/components/ContestedGlow';
import { CrowdReaction } from '@/components/CrowdReaction';
import { FlashText } from '@/components/FlashText';
import { PowerUpSprite } from '@/components/PowerUpSprite';
import { PixelButton } from '@/components/PixelButton';
import { PixelBorderPanel } from '@/components/PixelBorderPanel';
import { ScreenShake } from '@/components/ScreenShake';
import { StarBurst } from '@/components/StarBurst';
import { SmokePuff } from '@/components/SmokePuff';
import {
  ARC_SLIDE_SPEED,
  BASKET_RIM_PIXEL_FUDGE_PX,
  BASKET_RIM_Y_FACTOR,
  CONFIG,
  DefenderId,
  LAYOUT,
  PLAYER_ARC_MAX,
  PLAYER_ARC_MIN,
  POWERUP_LIFETIME_MS,
  POWERUP_PICKUP_RADIUS_PX,
  POST_RESULT_PAUSE_MS,
  PULL_DEADZONE_PX,
  PULL_MAX_PX,
  PULL_MIN_FOR_RELEASE_PX,
  SPEED_BOOST_MULTIPLIER,
  TURN_DURATION_SEC,
} from '@/constants/gameConfig';
import { FONT, PALETTE, SPACING } from '@/constants/theme';
import { tickDefender } from '@/game/botAI';
import { playSfx } from '@/game/audio';
import { heavyTap, lightTap, mediumTap } from '@/game/haptics';
import {
  applyPowerUp,
  consumeOnShot,
  EMPTY_EFFECTS,
  isActive,
  pickSpawnDelayMs,
  PlayerEffects,
  PowerUpInstance,
  spawnPowerUp,
} from '@/game/powerUps';
import {
  aimFromPull,
  computeFlight,
  isCancelledRelease,
  pullToPower,
  resolveShot,
  sampleFlight,
  ShotFlight,
  vlen,
} from '@/game/shotPhysics';

interface OffenseScreenProps {
  defenderLevel?: 1 | 2 | 3 | 4;
  turnSeconds?: number;
  onTurnEnd?: (pointsScored: number) => void;
  onShotResolved?: (event: ShotResolvedEvent) => void;
  /** Called whenever the player walks over a power-up. */
  onPowerUpCollected?: (kind: string) => void;
  playerLabel?: string;
  /** Match-level info for the persistent scoreboard. Optional so the
   * screen still works in standalone preview / dev navigation. */
  matchScores?: { p1: number; opp: number };
  matchTimeRemainingSec?: number;
  matchMode?: 'vsBot' | 'local2P';
  /** Active player for scoreboard column placement. */
  activePlayer?: 'P1' | 'P2' | 'BOT';
  /** When true, freezes the turn timer (used by GameScreen pause). */
  paused?: boolean;
  /** Cosmetics from progression. */
  court?: import('@/constants/gameConfig').CourtId;
  defenderVariant?: import('@/constants/gameConfig').DefenderId;
  ballSkin?: import('@/constants/gameConfig').SkinId;
}

export interface ShotResolvedEvent {
  result: 'make' | 'miss';
  contested: boolean;
  perfectRelease: boolean;
  points: number;
}

const DEFENDER_LEVEL_TO_VARIANT: Record<1 | 2 | 3 | 4, DefenderId> = {
  1: 'grandpa',
  2: 'recLeague',
  3: 'pro',
  4: 'alien',
};

/**
 * Offense screen — slingshot to shoot, drag horizontally up top to slide.
 *
 * Layout:
 *  +----------------------------------------+
 *  | scoreboard          timer               |
 *  +----------------------------------------+  <- top
 *  | basket sprite                           |
 *  |                                         |
 *  |  defender (slides L/R)                  |
 *  | --- 3-pt arc ---                        |
 *  |   power-up                              |
 *  |   player ball (slides L/R)              |
 *  | === SLIDE ZONE / SHOOT ZONE divider === | <- shootZoneTop
 *  |                                         |
 *  |     [vertical power meter on right]     |
 *  |   (shoot zone — slingshot here)         |
 *  +----------------------------------------+
 *
 * One Pan gesture handles both. We lock the role ('slide' or 'shoot') at
 * the moment the finger touches down, based on whether it landed above or
 * below `shootZoneTop`. The role does not change for the rest of the gesture.
 */
export const OffenseScreen: React.FC<OffenseScreenProps> = ({
  defenderLevel = 1,
  turnSeconds = TURN_DURATION_SEC,
  onTurnEnd,
  onShotResolved,
  onPowerUpCollected,
  playerLabel = 'PLAYER',
  matchScores,
  matchTimeRemainingSec,
  matchMode = 'vsBot',
  activePlayer = 'P1',
  paused = false,
  court = 'playground',
  defenderVariant,
  ballSkin = 'classic',
}) => {
  // Measure the play area directly via onLayout so we don't depend on
  // potentially-mismatched useWindowDimensions on web.
  const [layout, setLayout] = React.useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const { width, height } = layout.width === 0 ? { width: 360, height: 640 } : layout;

  // ----- Layout (all driven by LAYOUT in gameConfig) -----
  const basketSize = Math.min(width * LAYOUT.basketWidthFraction, LAYOUT.basketWidthMaxPx);
  const basketTopY = height * LAYOUT.basketTopFraction;
  const rim = {
    x: width / 2,
    y: basketTopY + basketSize * (10 / 16) * BASKET_RIM_Y_FACTOR + BASKET_RIM_PIXEL_FUDGE_PX,
  };
  const playerY = height * LAYOUT.playerYFraction;
  const arcLeftX = width * LAYOUT.arcSidePaddingFraction;
  const arcRightX = width * (1 - LAYOUT.arcSidePaddingFraction);
  const arcLengthPx = arcRightX - arcLeftX;
  const shootZoneTop = height * (1 - LAYOUT.shootZoneHeightFraction);

  // ----- UI-thread shared state -----
  const playerArcPos = useSharedValue(0.5);
  // Spec: "Defender starts at a random position on the arc." Pick once at
  // mount so each turn has a different opening look.
  const defenderArcPos = useSharedValue(0.25 + Math.random() * 0.5);

  /**
   * Gesture role:
   *   0 = none (gesture not active)
   *   1 = shoot
   *   2 = slide
   * Locked at touch-down by `onBegin`.
   */
  const role = useSharedValue(0);
  const pullDX = useSharedValue(0);
  const pullDY = useSharedValue(0);
  const power = useSharedValue(0);
  const pullStartedAtMs = useSharedValue(0);

  /** UI-thread mirror of shotInProgress to gate worklet onBegin. */
  const shotInProgressShared = useSharedValue(0); // 0 = idle, 1 = busy
  const turnEndedShared = useSharedValue(0);

  /** Flight bezier params as shared values so worklets can sample them
   * without dipping into a JS-thread ref (which is not reliably worklet-safe). */
  const flightStartX = useSharedValue(0);
  const flightStartY = useSharedValue(0);
  const flightApexX = useSharedValue(0);
  const flightApexY = useSharedValue(0);
  const flightEndX = useSharedValue(0);
  const flightEndY = useSharedValue(0);

  /** Flight progress 0..1 — drives ballX/Y via reactor. */
  const ballT = useSharedValue(0);
  const ballX = useSharedValue(0);
  const ballY = useSharedValue(0);

  /** Speed boost multiplier — read on UI thread by slide handler. */
  const speedBoostMul = useSharedValue(1);

  // ----- React state (logic on JS thread) -----
  const [score, setScore] = React.useState(0);
  const [timeRemaining, setTimeRemaining] = React.useState(turnSeconds);
  // Per-shot shot clock — resets to CONFIG.SHOT_CLOCK_SEC whenever a new
  // shot opportunity begins. Surfaces in the BucketsHud SHOT CLOCK panel.
  const [shotClockSec, setShotClockSec] = React.useState<number>(CONFIG.SHOT_CLOCK_SEC);
  const [effects, setEffects] = React.useState<PlayerEffects>(EMPTY_EFFECTS);
  const [powerUp, setPowerUp] = React.useState<PowerUpInstance | null>(null);
  const [powerUpFrame, setPowerUpFrame] = React.useState<0 | 1>(0);
  /** Tracks which back-shooter pose to render. Derived from gesture +
   * shot lifecycle so the sprite reads exactly what the player is doing. */
  const [shooterState, setShooterState] = React.useState<BackShooterState>('idle');
  const [shooterSubFrame, setShooterSubFrame] = React.useState<0 | 1>(0);
  const [shotInProgress, setShotInProgress] = React.useState(false);
  const [shakeTrigger, setShakeTrigger] = React.useState(0);
  const [starBurstTrigger, setStarBurstTrigger] = React.useState(0);
  const [smokeTrigger, setSmokeTrigger] = React.useState(0);
  const [crowdTrigger, setCrowdTrigger] = React.useState(0);
  /** Center-screen flash text for "PERFECT!" / "BLOCKED!" / etc. */
  const [flashState, setFlashState] = React.useState<{
    trigger: number;
    text: string;
    color: string;
  }>({ trigger: 0, text: '', color: PALETTE.yellowBright });
  const [ballHidden, setBallHidden] = React.useState(false);
  const [resultBanner, setResultBanner] = React.useState<{ text: string; color: string } | null>(null);
  const [turnEnded, setTurnEnded] = React.useState(false);
  // For triggering a re-render of the trajectory while pulling.
  const [pullingTick, setPullingTick] = React.useState(0);
  const [isPulling, setIsPulling] = React.useState(false);
  const scoreRef = React.useRef(0);
  React.useEffect(() => { scoreRef.current = score; }, [score]);
  // Dev telemetry — silenced; flip to setState to re-enable for debugging.
  const setDebugMsg = (_s: string) => {};

  // Mirror JS state into shared values for worklet access.
  React.useEffect(() => {
    shotInProgressShared.value = shotInProgress ? 1 : 0;
  }, [shotInProgress, shotInProgressShared]);
  React.useEffect(() => {
    turnEndedShared.value = turnEnded ? 1 : 0;
  }, [turnEnded, turnEndedShared]);

  // ----- speedBoostMul reactivity -----
  React.useEffect(() => {
    const id = setInterval(() => {
      const active = isActive(effects.speedBoostExpiresAt, performance.now());
      speedBoostMul.value = active ? SPEED_BOOST_MULTIPLIER : 1;
    }, 100);
    return () => clearInterval(id);
  }, [effects.speedBoostExpiresAt, speedBoostMul]);

  // ----- Turn timer -----
  // When the clock hits 0 we stop the timer and surface the TURN OVER overlay.
  // Calling `onTurnEnd` is deferred until the player taps OK so they can see
  // the final score and any in-flight result before the screen changes.
  // PAUSED: freeze the timer entirely while the pause overlay is up.
  React.useEffect(() => {
    if (turnEnded || paused) return;
    if (timeRemaining <= 0) {
      setTurnEnded(true);
      return;
    }
    if (timeRemaining <= 5 && timeRemaining > 0) {
      playSfx('beep');
    }
    const id = setTimeout(() => setTimeRemaining((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [timeRemaining, turnEnded, paused]);

  // ----- Shot clock — counts down per shot opportunity. Resets every time
  // a new shot becomes available (right after a result resolves) or when a
  // shot fires. If it hits 0, force a brick (auto-miss). -----
  React.useEffect(() => {
    if (turnEnded || paused) return;
    if (shotInProgress) return; // freeze shot clock while ball is in air
    if (shotClockSec <= 0) {
      // Auto-shot violation: treat as a brick miss.
      setShotClockSec(CONFIG.SHOT_CLOCK_SEC);
      setResultBanner({ text: 'SHOT CLOCK VIOLATION', color: PALETTE.redHot });
      setTimeout(() => setResultBanner(null), CONFIG.FLASH_TEXT_DURATION_MS);
      return;
    }
    const id = setTimeout(() => setShotClockSec((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [shotClockSec, shotInProgress, turnEnded, paused]);

  // If the GLOBAL match timer hits 0, end this turn immediately too
  // — the match clock takes priority over the turn clock.
  React.useEffect(() => {
    if (turnEnded) return;
    if (matchTimeRemainingSec === undefined) return;
    if (matchTimeRemainingSec <= 0) setTurnEnded(true);
  }, [matchTimeRemainingSec, turnEnded]);

  // ----- Defender tick -----
  React.useEffect(() => {
    let raf = 0;
    let lastTs = performance.now();
    const tick = () => {
      const now = performance.now();
      const dtSec = (now - lastTs) / 1000;
      lastTs = now;
      const frozen = isActive(effects.iceDefenderExpiresAt, now);
      const next = tickDefender(
        defenderLevel,
        defenderArcPos.value,
        playerArcPos.value,
        Math.min(dtSec, 1 / 30),
        arcLengthPx,
        frozen
      );
      defenderArcPos.value = next;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [defenderLevel, arcLengthPx, defenderArcPos, playerArcPos, effects.iceDefenderExpiresAt]);

  // ----- Sprite frame swap timers -----
  React.useEffect(() => {
    const id = setInterval(() => setPowerUpFrame((f) => (f === 0 ? 1 : 0)), 240);
    return () => clearInterval(id);
  }, []);
  // Back-shooter sub-frame cycles 0↔1 at ~7Hz so wind-up + walk animate.
  React.useEffect(() => {
    const id = setInterval(() => setShooterSubFrame((f) => (f === 0 ? 1 : 0)), 140);
    return () => clearInterval(id);
  }, []);

  // ----- Derive shooter pose from gesture + shot lifecycle -----
  React.useEffect(() => {
    if (shotInProgress) {
      setShooterState('release');
      return;
    }
    if (isPulling) {
      setShooterState('windup');
      return;
    }
    setShooterState('idle');
  }, [isPulling, shotInProgress]);

  // ----- Power-up spawn / lifetime / pickup -----
  React.useEffect(() => {
    if (powerUp || turnEnded) return;
    const id = setTimeout(() => setPowerUp(spawnPowerUp(Math.random)), pickSpawnDelayMs(Math.random));
    return () => clearTimeout(id);
  }, [powerUp, turnEnded]);

  React.useEffect(() => {
    if (!powerUp) return;
    const id = setInterval(() => {
      setPowerUp((p) => (p ? (p.lifetimeRemainingMs <= 100 ? null : { ...p, lifetimeRemainingMs: p.lifetimeRemainingMs - 100 }) : p));
    }, 100);
    return () => clearInterval(id);
  }, [powerUp]);

  React.useEffect(() => {
    if (!powerUp) return;
    const id = setInterval(() => {
      const playerPx = arcLeftX + playerArcPos.value * arcLengthPx;
      const puPx = arcLeftX + powerUp.arcPos * arcLengthPx;
      if (Math.abs(playerPx - puPx) <= POWERUP_PICKUP_RADIUS_PX) {
        setEffects((e) => applyPowerUp(e, powerUp.kind, performance.now()));
        onPowerUpCollected?.(powerUp.kind);
        playSfx('powerup');
        lightTap();
        setPowerUp(null);
      }
    }, 60);
    return () => clearInterval(id);
  }, [powerUp, arcLeftX, arcLengthPx, playerArcPos, onPowerUpCollected]);

  // ----- Trajectory tick (only while pulling) -----
  React.useEffect(() => {
    if (!isPulling) return;
    const id = setInterval(() => setPullingTick((t) => t + 1), 33);
    return () => clearInterval(id);
  }, [isPulling]);

  // ----- Gestures (native only — web uses dedicated overlays below) -----
  const slideOnlyGesture = Gesture.Pan()
    .maxPointers(1)
    .onChange((e) => {
      'worklet';
      const deltaNorm = (e.changeX * ARC_SLIDE_SPEED * speedBoostMul.value) / arcLengthPx;
      playerArcPos.value = Math.min(
        PLAYER_ARC_MAX,
        Math.max(PLAYER_ARC_MIN, playerArcPos.value + deltaNorm)
      );
    });

  const shootOnlyGesture = Gesture.Pan()
    .maxPointers(1)
    .onBegin(() => {
      'worklet';
      // Read shared values, NOT React state (closure would be stale).
      if (shotInProgressShared.value === 1) return;
      if (turnEndedShared.value === 1) return;
      pullDX.value = 0;
      pullDY.value = 0;
      power.value = 0;
      pullStartedAtMs.value = Date.now();
      runOnJS(setIsPulling)(true);
    })
    .onChange((e) => {
      'worklet';
      pullDX.value = e.translationX;
      pullDY.value = e.translationY;
      const len = Math.hypot(e.translationX, e.translationY);
      const usable = Math.min(len, PULL_MAX_PX) - PULL_DEADZONE_PX;
      const range = PULL_MAX_PX - PULL_DEADZONE_PX;
      power.value = usable > 0 ? usable / range : 0;
    })
    .onEnd(() => {
      'worklet';
      const len = Math.hypot(pullDX.value, pullDY.value);
      const heldMs = Date.now() - pullStartedAtMs.value;
      if (len >= PULL_MIN_FOR_RELEASE_PX) {
        runOnJS(handleRelease)({ x: pullDX.value, y: pullDY.value }, heldMs);
      }
      pullDX.value = 0;
      pullDY.value = 0;
      power.value = 0;
      runOnJS(setIsPulling)(false);
    })
    .onFinalize(() => {
      'worklet';
      pullDX.value = 0;
      pullDY.value = 0;
      power.value = 0;
      runOnJS(setIsPulling)(false);
    });

  /** Resolve a release on the JS thread. */
  function handleRelease(pull: { x: number; y: number }, heldMs: number) {
    if (shotInProgress) return;
    if (turnEnded) return;
    if (isCancelledRelease(vlen(pull))) return;

    const now = performance.now();
    const ghostShotActive = isActive(effects.ghostShotExpiresAt, now);
    const playerScreenPos = {
      x: arcLeftX + playerArcPos.value * arcLengthPx,
      y: playerY,
    };
    const defenderScreenPos = {
      x: arcLeftX + defenderArcPos.value * arcLengthPx,
      y: playerY - LAYOUT.defenderToPlayerYContestOffset,
    };

    const shot = resolveShot({
      player: playerScreenPos,
      rim,
      defender: defenderScreenPos,
      biggerRimActive: effects.biggerRimNextShot,
      ghostShotActive,
      pull,
      heldMs,
    });

    setShotInProgress(true);
    shotInProgressShared.value = 1; // flip immediately, don't wait for next render
    setShotClockSec(CONFIG.SHOT_CLOCK_SEC); // shooting resets the shot clock for next attempt
    setEffects((e) => consumeOnShot(e));

    // Push bezier params into shared values for the UI-thread reactor.
    flightStartX.value = shot.flight.start.x;
    flightStartY.value = shot.flight.start.y;
    flightApexX.value = shot.flight.apex.x;
    flightApexY.value = shot.flight.apex.y;
    flightEndX.value = shot.flight.end.x;
    flightEndY.value = shot.flight.end.y;

    ballX.value = shot.flight.start.x;
    ballY.value = shot.flight.start.y;
    setBallHidden(false);
    ballT.value = 0;
    ballT.value = withTiming(
      1,
      { duration: shot.flight.durationMs, easing: Easing.linear },
      () => {
        'worklet';
        runOnJS(finalizeShot)(shot.result, shot.contested, shot.perfectRelease, shot.points);
      }
    );
  }

  // Update ball x/y from t parameter on UI thread, reading bezier params
  // from shared values (worklet-safe, no JS-thread ref).
  useAnimatedReaction(
    () => ballT.value,
    (t) => {
      'worklet';
      const u = 1 - t;
      ballX.value =
        u * u * flightStartX.value +
        2 * u * t * flightApexX.value +
        t * t * flightEndX.value;
      ballY.value =
        u * u * flightStartY.value +
        2 * u * t * flightApexY.value +
        t * t * flightEndY.value;
    },
    []
  );

  function finalizeShot(
    result: 'make' | 'miss',
    contested: boolean,
    perfectRelease: boolean,
    points: number
  ) {
    setScore((s) => s + points);
    onShotResolved?.({ result, contested, perfectRelease, points });
    if (result === 'make') {
      playSfx('swish');
      mediumTap();
      // Every make rouses the crowd.
      setCrowdTrigger((t) => t + 1);
      if (contested) {
        playSfx('cheer');
        setShakeTrigger((t) => t + 1);
        setStarBurstTrigger((t) => t + 1);
        heavyTap();
      }
      if (perfectRelease) {
        setFlashState({
          trigger: Date.now(),
          text: 'PERFECT!',
          color: PALETTE.yellowBright,
        });
      }
    } else {
      playSfx('brick');
      mediumTap();
      setSmokeTrigger((t) => t + 1);
    }
    setResultBanner({
      text:
        result === 'make'
          ? `${contested ? 'AND ONE!' : 'BUCKET!'}  +${points}${perfectRelease ? '  PERFECT' : ''}`
          : 'BRICK',
      color: result === 'make' ? PALETTE.greenGo : PALETTE.redHot,
    });
    setBallHidden(true);
    setTimeout(() => {
      setResultBanner(null);
      setShotInProgress(false);
      setBallHidden(false);
    }, POST_RESULT_PAUSE_MS);
  }

  // ----- Animated styles -----
  const ballAnimStyle = useAnimatedStyle(() => {
    const half = LAYOUT.ballSpritePx / 2;
    // Rotate the in-flight ball at 720°/sec for chunky pixel "spin".
    const rot = ballT.value * 720;
    return {
      transform: [
        { translateX: ballX.value - half },
        { translateY: ballY.value - half },
        { rotate: `${rot}deg` },
      ],
    };
  });

  /**
   * Back-shooter is centered horizontally on the player's arc position with
   * his feet at playerY. He's wide (~140px) so we anchor by the sprite's
   * center-bottom.
   */
  const playerAnimStyle = useAnimatedStyle(() => {
    const x = arcLeftX + playerArcPos.value * arcLengthPx;
    const halfW = LAYOUT.shooterSpritePx / 2;
    const fullH = (LAYOUT.shooterSpritePx * 24) / 16;
    return {
      transform: [
        { translateX: x - halfW },
        { translateY: playerY - fullH * 0.95 },
      ],
    };
  });

  /**
   * Defender perspective: as he closes in (arc distance shrinks), he gets
   * larger AND moves vertically toward the shooter — selling the depth.
   */
  const defenderAnimStyle = useAnimatedStyle(() => {
    'worklet';
    const dx = arcLeftX + defenderArcPos.value * arcLengthPx;
    const arcDist = Math.abs(defenderArcPos.value - playerArcPos.value);
    // closeness 0..1 — 0 means far across the arc, 1 means right on top.
    const closeness = Math.max(0, 1 - arcDist * 3);
    // Sprite scale grows up to 1.35x when defender is right on the shooter.
    const scale = 1 + closeness * 0.35;
    // Y position lerps from "near basket" up high to "right above shooter".
    const farY = playerY - LAYOUT.defenderYOffsetPx;
    const nearY = playerY - LAYOUT.defenderSpritePx * 1.2;
    const y = farY + (nearY - farY) * closeness;
    const halfW = LAYOUT.defenderSpritePx / 2;
    return {
      transform: [
        { translateX: dx - halfW },
        { translateY: y },
        { scale },
      ],
    };
  });

  // Defender state: alternating closeoutA/closeoutB while moving fast, else contest.
  const defenderStateRef = React.useRef<CloseoutDefenderState>('closeoutA');
  const lastDefenderArcRef = React.useRef(0.5);
  const [defenderRenderState, setDefenderRenderState] = React.useState<CloseoutDefenderState>(
    'closeoutA'
  );
  /**
   * JS-side mirror of (playerArcPos, defender closeness) so the contested
   * glow can position itself with React layout props. Updated at ~10Hz,
   * which is plenty for a glow that crossfades over hundreds of ms.
   */
  const [playerArcPosRender, setPlayerArcPosRender] = React.useState(0.5);
  const [defenderClosenessRender, setDefenderClosenessRender] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => {
      const cur = defenderArcPos.value;
      const speed = Math.abs(cur - lastDefenderArcRef.current);
      lastDefenderArcRef.current = cur;
      const arcDist = Math.abs(cur - playerArcPos.value);
      const closeness = Math.max(0, 1 - arcDist * 3);
      setDefenderClosenessRender(closeness);
      setPlayerArcPosRender(playerArcPos.value);

      let next: CloseoutDefenderState;
      if (speed > 0.003) {
        next =
          defenderStateRef.current === 'closeoutA' ? 'closeoutB' : 'closeoutA';
      } else if (arcDist < 0.12) {
        next = 'contest';
      } else {
        next = 'idle';
      }
      defenderStateRef.current = next;
      setDefenderRenderState(next);
    }, 100);
    return () => clearInterval(id);
  }, [defenderArcPos, playerArcPos]);

  // ----- Power-up rendering -----
  const powerUpScreenX = powerUp ? arcLeftX + powerUp.arcPos * arcLengthPx : 0;
  const powerUpAlpha = powerUp ? Math.min(1, powerUp.lifetimeRemainingMs / (POWERUP_LIFETIME_MS * 0.5)) : 0;

  // ----- Active effect badges -----
  const now = performance.now();
  const activeBadges: { label: string; color: string }[] = [];
  if (effects.biggerRimNextShot) activeBadges.push({ label: 'BIGGER RIM', color: PALETTE.orangeBall });
  if (isActive(effects.ghostShotExpiresAt, now)) activeBadges.push({ label: 'GHOST', color: PALETTE.purpleSpace });
  if (isActive(effects.speedBoostExpiresAt, now)) activeBadges.push({ label: 'SPEED', color: PALETTE.blueIce });
  if (isActive(effects.iceDefenderExpiresAt, now)) activeBadges.push({ label: 'ICE', color: PALETTE.lineWhite });
  if (effects.doubleJumpAvailable) activeBadges.push({ label: '2x JUMP', color: PALETTE.greenGo });

  // Trajectory preview — dotted pixel arc per spec. While the player is
  // pulling, sample the planned flight and render one small square per
  // sample (instead of a dashed line) for that chunky pixel-art feel.
  let trajectoryEls: React.ReactElement[] | null = null;
  if (isPulling && pullingTick >= 0) {
    const pull = { x: pullDX.value, y: pullDY.value };
    const len = Math.hypot(pull.x, pull.y);
    const power01 = pullToPower(len);
    if (power01 > 0) {
      // Anchor the preview at the shooter's hands (above feet by ~60% of
      // his sprite height) so the dotted arc visually emerges from him.
      const shooterCenterX = arcLeftX + playerArcPos.value * arcLengthPx;
      const shooterHandY = playerY - LAYOUT.shooterSpritePx * 0.7;
      const aim = aimFromPull(pull);
      const flight = computeFlight(
        { x: shooterCenterX, y: shooterHandY },
        rim,
        aim,
        power01
      );
      const els: React.ReactElement[] = [];
      const N = LAYOUT.trajectoryDashSegments;
      // Start at t > 0 so the first dot doesn't overlap the shooter's body.
      for (let i = 2; i <= N; i++) {
        const cur = sampleFlight(flight, i / N);
        const radius = i < N - 1 ? 3 : 5;
        els.push(
          <Circle
            key={`tr-${i}`}
            cx={cur.x}
            cy={cur.y}
            r={radius}
            fill={PALETTE.yellowBright}
            opacity={CONFIG.ARC_PREVIEW_OPACITY}
          />
        );
      }
      const landing = sampleFlight(flight, 1);
      els.push(
        <Circle
          key="land-inner"
          cx={landing.x}
          cy={landing.y}
          r={7}
          fill={PALETTE.yellowBright}
          stroke={PALETTE.black}
          strokeWidth={2}
        />
      );
      trajectoryEls = els;
    }
  }

  return (
    <View
      style={styles.root}
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        if (w !== layout.width || h !== layout.height) {
          setLayout({ width: w, height: h });
        }
      }}
    >
    <ScreenShake trigger={shakeTrigger} amplitude={CONFIG.SCREEN_SHAKE_PX} durationMs={CONFIG.SCREEN_SHAKE_MS}>
      <CourtBackground width={width} height={height} court={court} perspective="offense" />

      {/* Crowd reaction overlay — flashes the back-of-court crowd band
       * whenever the crowd cheers (every make / block). */}
      <CrowdReaction
        trigger={crowdTrigger}
        top={height * 0.32 - 4}
        height={height * LAYOUT.crowdBandHeightFraction}
      />

      <View style={[styles.basketWrap, { top: basketTopY, left: width / 2 - basketSize / 2 }]}>
        <BasketSprite size={basketSize} big={effects.biggerRimNextShot} />
      </View>

      <Animated.View style={[styles.absolute, defenderAnimStyle]} pointerEvents="none">
        <CloseoutDefenderSprite
          size={LAYOUT.defenderSpritePx}
          variant={defenderVariant ?? DEFENDER_LEVEL_TO_VARIANT[defenderLevel]}
          state={defenderRenderState}
          frozen={isActive(effects.iceDefenderExpiresAt, now)}
        />
      </Animated.View>

      {powerUp && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: playerY - 80,
            left: powerUpScreenX - 18,
            opacity: powerUpAlpha,
            transform: [{ translateY: powerUpFrame === 0 ? 0 : -3 }],
          }}
        >
          <PowerUpSprite kind={powerUp.kind} size={36} frame={powerUpFrame} />
        </View>
      )}

      {/* trajectory overlay */}
      {trajectoryEls && (
        <View style={styles.fill} pointerEvents="none">
          <Svg width={width} height={height}>{trajectoryEls}</Svg>
        </View>
      )}

      {/* Contested glow — pulsates under the shooter when defender is in
       * contest range. Player can FEEL the pressure even before shooting. */}
      <ContestedGlow
        visible={defenderClosenessRender > 0.55 && !shotInProgress}
        cx={arcLeftX + playerArcPosRender * arcLengthPx}
        cy={playerY - LAYOUT.shooterSpritePx * 0.55}
        size={LAYOUT.shooterSpritePx * 1.35}
      />

      {/* Back-facing shooter, anchored center-bottom on the arc position.
       * He's the same sprite from idle through windup/release/celebrate —
       * pose comes from `shooterState`. */}
      <Animated.View style={[styles.absolute, playerAnimStyle]} pointerEvents="none">
        <BackShooterSprite
          size={LAYOUT.shooterSpritePx}
          state={shooterState}
          subFrame={shooterSubFrame}
          ballSkin={ballSkin}
        />
      </Animated.View>
      {/* In-flight ball — separate sprite that follows the bezier. Hidden
       * while the shooter is holding it (idle/windup) and after the result. */}
      {shotInProgress && !ballHidden && (
        <>
          <BallShadow
            ballX={ballX}
            ballY={ballY}
            floorY={playerY}
            ballSize={LAYOUT.ballSpritePx}
          />
          <Animated.View style={[styles.absolute, ballAnimStyle]} pointerEvents="none">
            <BallSprite size={LAYOUT.ballSpritePx} skin={ballSkin} />
          </Animated.View>
        </>
      )}


      {/* Horizontal segmented power meter — bottom right, hidden until pulling. */}
      <View style={[styles.powerMeterWrap]} pointerEvents="none">
        <HorizontalPowerMeter power={power} visible={isPulling} />
      </View>

      {/* Gesture zones: TWO separate overlays (upper = slide, lower = shoot)
       * sized as percentages of the play area. Each owns its own gesture
       * handler so we never have to figure out "is this click in the shoot
       * zone or the slide zone?" — it's whichever overlay caught it.
       *
       * On native, both use react-native-gesture-handler Pan. On web, we
       * use raw pointer events because synthetic mouse drags from automation
       * tools sometimes skip the intermediate pointermove events that
       * gesture-handler relies on. */}
      <View style={[styles.zoneSlide]} pointerEvents="box-none">
        {Platform.OS === 'web' ? (
          <WebSlideOverlay
            arcLengthPx={arcLengthPx}
            speedBoostMul={speedBoostMul}
            playerArcPos={playerArcPos}
            shotInProgressRef={{ current: shotInProgress }}
            setDebugMsg={setDebugMsg}
          />
        ) : (
          <GestureDetector gesture={slideOnlyGesture}>
            <View style={styles.fill} />
          </GestureDetector>
        )}
      </View>
      <View style={[styles.zoneShoot]} pointerEvents="box-none">
        <Text style={styles.shootZoneLabel}>HOLD &amp; PULL DOWN TO SHOOT</Text>
        {Platform.OS === 'web' ? (
          <WebShootOverlay
            pullDX={pullDX}
            pullDY={pullDY}
            power={power}
            pullStartedAtMs={pullStartedAtMs}
            shotInProgressRef={{ current: shotInProgress }}
            onShotRelease={(p, ms) => handleRelease(p, ms)}
            setIsPulling={setIsPulling}
            setDebugMsg={setDebugMsg}
          />
        ) : (
          <GestureDetector gesture={shootOnlyGesture}>
            <View style={styles.fill} />
          </GestureDetector>
        )}
      </View>

      {/* New BucketsHud — matches Reference Image 2 exactly.
       * Top-left scores, top-center HOME/TIME/GUEST + action label,
       * top-right large red CLOCK, bottom-left SHOT CLOCK. */}
      <BucketsHud
        p1Score={(matchScores?.p1 ?? 0) + (activePlayer === 'P1' || !matchScores ? score : 0)}
        p2Score={(matchScores?.opp ?? 0) + (activePlayer === 'P2' ? score : 0)}
        matchTimeSec={matchTimeRemainingSec ?? timeRemaining}
        shotClockSec={shotClockSec}
        turnClockSec={timeRemaining}
        p1Label={activePlayer === 'P2' ? 'PLAYER 2' : 'PLAYER 1'}
        p2Label={matchMode === 'vsBot' ? 'BOT' : activePlayer === 'P2' ? 'P1' : 'P2'}
        actionLabel="3PT ATTEMPT"
      />
      {/* Player label retained for screen-reader friendliness on the
       * underlying view; intentionally invisible. */}
      <Text style={styles.srOnly} accessibilityRole="text">
        {playerLabel}
      </Text>

      {activeBadges.length > 0 && (
        <View style={styles.badgesRow} pointerEvents="none">
          {activeBadges.map((b, i) => (
            <View key={i} style={[styles.badge, { backgroundColor: b.color }]}>
              <Text style={styles.badgeText}>{b.label}</Text>
            </View>
          ))}
        </View>
      )}

      {resultBanner && (
        <View style={styles.bannerWrap} pointerEvents="none">
          <PixelBorderPanel innerPadding={14} color={PALETTE.midnight}>
            <Text style={[styles.bannerText, { color: resultBanner.color }]}>{resultBanner.text}</Text>
          </PixelBorderPanel>
        </View>
      )}

      {/* Particle effects: contested-make star burst + brick smoke puff */}
      <StarBurst trigger={starBurstTrigger} cx={rim.x} cy={rim.y} count={14} maxRadius={140} />
      <SmokePuff trigger={smokeTrigger} cx={rim.x} cy={rim.y + 24} />

      {/* "PERFECT!" / "BLOCKED!" / etc. center-screen flash text. */}
      <FlashText
        trigger={flashState.trigger}
        text={flashState.text}
        color={flashState.color}
      />

      {turnEnded && (
        <View style={styles.turnOver}>
          <PixelBorderPanel innerPadding={20}>
            <Text style={styles.bannerText}>TURN OVER</Text>
            <Text style={styles.hudText}>SCORE: {score}</Text>
            <View style={{ height: SPACING.md }} />
            <PixelButton label="OK" size="md" onPress={() => onTurnEnd?.(score)} />
          </PixelBorderPanel>
        </View>
      )}
    </ScreenShake>
    </View>
  );
};


// ---------------------------------------------------------------------------
// Web pointer-event overlays (one per zone)
// ---------------------------------------------------------------------------

interface WebSlideOverlayProps {
  arcLengthPx: number;
  speedBoostMul: { value: number };
  playerArcPos: { value: number };
  shotInProgressRef: { current: boolean };
  setDebugMsg: (s: string) => void;
}

/** Upper-zone overlay: drag horizontally → slide player along arc. */
const WebSlideOverlay: React.FC<WebSlideOverlayProps> = ({
  arcLengthPx,
  speedBoostMul,
  playerArcPos,
  shotInProgressRef,
  setDebugMsg,
}) => {
  const stateRef = React.useRef({ active: false, startX: 0, lastX: 0 });

  // Use any-typed event handlers because RN's View has a NativePointerEvent
  // type that's incompatible with React's DOM PointerEvent we use on web.
  // The runtime event shape on web is the standard DOM PointerEvent.
  const onPointerDown = (ev: any) => {
    if (shotInProgressRef.current) return;
    if (ev.button !== 0) return;
    ev.preventDefault?.();
    try { (ev.currentTarget as HTMLElement)?.setPointerCapture?.(ev.pointerId); } catch {}
    stateRef.current = { active: true, startX: ev.clientX, lastX: ev.clientX };
    setDebugMsg(`SLIDE BEGIN @ ${Math.round(ev.clientX)}`);
  };
  const onPointerMove = (ev: any) => {
    const s = stateRef.current;
    if (!s.active) return;
    ev.preventDefault?.();
    const change = ev.clientX - s.lastX;
    const deltaNorm = (change * ARC_SLIDE_SPEED * speedBoostMul.value) / arcLengthPx;
    playerArcPos.value = Math.min(
      PLAYER_ARC_MAX,
      Math.max(PLAYER_ARC_MIN, playerArcPos.value + deltaNorm)
    );
    s.lastX = ev.clientX;
    setDebugMsg(`slide dx=${Math.round(ev.clientX - s.startX)} arc=${playerArcPos.value.toFixed(2)}`);
  };
  const onPointerUp = (ev: any) => {
    const s = stateRef.current;
    if (!s.active) return;
    ev.preventDefault?.();
    try { (ev.currentTarget as HTMLElement)?.releasePointerCapture?.(ev.pointerId); } catch {}
    s.active = false;
    setDebugMsg(`SLIDE END dx=${Math.round(ev.clientX - s.startX)} arc=${playerArcPos.value.toFixed(2)}`);
  };

  const handlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onPointerLeave: onPointerUp,
  };

  return (
    <View
      style={[styles.fill, styles.touchActionNone as object]}
      pointerEvents="auto"
      {...(handlers as object)}
    />
  );
};

interface WebShootOverlayProps {
  pullDX: { value: number };
  pullDY: { value: number };
  power: { value: number };
  pullStartedAtMs: { value: number };
  shotInProgressRef: { current: boolean };
  onShotRelease: (pull: { x: number; y: number }, heldMs: number) => void;
  setIsPulling: (v: boolean) => void;
  setDebugMsg: (s: string) => void;
}

/** Lower-zone overlay: press, drag to slingshot, release to fire. */
const WebShootOverlay: React.FC<WebShootOverlayProps> = ({
  pullDX,
  pullDY,
  power,
  pullStartedAtMs,
  shotInProgressRef,
  onShotRelease,
  setIsPulling,
  setDebugMsg,
}) => {
  const stateRef = React.useRef({ active: false, startX: 0, startY: 0, startTimeMs: 0 });

  const onPointerDown = (ev: any) => {
    if (shotInProgressRef.current) return;
    if (ev.button !== 0) return;
    ev.preventDefault?.();
    try { (ev.currentTarget as HTMLElement)?.setPointerCapture?.(ev.pointerId); } catch {}
    const now = performance.now();
    stateRef.current = {
      active: true,
      startX: ev.clientX,
      startY: ev.clientY,
      startTimeMs: now,
    };
    pullDX.value = 0;
    pullDY.value = 0;
    power.value = 0;
    pullStartedAtMs.value = now;
    setIsPulling(true);
    setDebugMsg(`SHOOT BEGIN @ (${Math.round(ev.clientX)}, ${Math.round(ev.clientY)})`);
  };

  const onPointerMove = (ev: any) => {
    const s = stateRef.current;
    if (!s.active) return;
    ev.preventDefault?.();
    const dx = ev.clientX - s.startX;
    const dy = ev.clientY - s.startY;
    pullDX.value = dx;
    pullDY.value = dy;
    const len = Math.hypot(dx, dy);
    const usable = Math.min(len, PULL_MAX_PX) - PULL_DEADZONE_PX;
    const range = PULL_MAX_PX - PULL_DEADZONE_PX;
    power.value = usable > 0 ? usable / range : 0;
    setDebugMsg(`pull dx=${Math.round(dx)} dy=${Math.round(dy)} pwr=${Math.round(power.value * 100)}%`);
  };

  const onPointerUp = (ev: any) => {
    const s = stateRef.current;
    if (!s.active) return;
    ev.preventDefault?.();
    try { (ev.currentTarget as HTMLElement)?.releasePointerCapture?.(ev.pointerId); } catch {}
    const dx = pullDX.value;
    const dy = pullDY.value;
    const len = Math.hypot(dx, dy);
    const heldMs = Math.round(performance.now() - s.startTimeMs);
    setDebugMsg(`SHOOT END dx=${Math.round(dx)} dy=${Math.round(dy)} len=${Math.round(len)} held=${heldMs}ms`);
    if (len >= PULL_MIN_FOR_RELEASE_PX) {
      onShotRelease({ x: dx, y: dy }, heldMs);
    }
    s.active = false;
    pullDX.value = 0;
    pullDY.value = 0;
    power.value = 0;
    setIsPulling(false);
  };

  const handlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onPointerLeave: onPointerUp,
  };

  return (
    <View
      style={[styles.fill, styles.touchActionNone as object]}
      pointerEvents="auto"
      {...(handlers as object)}
    />
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.black, overflow: 'hidden' },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  absolute: { position: 'absolute', top: 0, left: 0 },
  powerMeterWrap: {
    position: 'absolute',
    right: 14,
    bottom: 20,
    alignItems: 'flex-end',
  },
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  basketWrap: { position: 'absolute' },
  zoneSlide: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: `${LAYOUT.shootZoneHeightFraction * 100}%` as `${number}%`,
    ...({ userSelect: 'none', cursor: 'ew-resize', touchAction: 'none' } as object),
  },
  zoneShoot: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: `${LAYOUT.shootZoneHeightFraction * 100}%` as `${number}%`,
    backgroundColor: 'rgba(255,210,63,0.08)',
    borderTopWidth: 2,
    borderTopColor: 'rgba(255,210,63,0.7)',
    borderStyle: 'dashed',
    ...({ userSelect: 'none', cursor: 'grab', touchAction: 'none' } as object),
  },
  touchActionNone: {
    ...({ touchAction: 'none', userSelect: 'none' } as object),
  },
  shootZoneLabel: {
    fontFamily: FONT.family,
    fontSize: FONT.tiny,
    color: PALETTE.yellowBright,
    letterSpacing: 1,
    opacity: 0.75,
    textAlign: 'center',
    marginTop: 6,
  },
  hudRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  hudText: {
    fontFamily: FONT.family,
    fontSize: FONT.tiny,
    color: PALETTE.lineWhite,
    letterSpacing: 1,
    textAlign: 'center',
  },
  hudScore: {
    fontFamily: FONT.family,
    fontSize: FONT.titleM,
    color: PALETTE.yellowBright,
    textAlign: 'center',
    marginTop: 2,
  },
  badgesRow: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: PALETTE.black,
    margin: 4,
  },
  badgeText: {
    fontFamily: FONT.family,
    fontSize: FONT.tiny,
    color: PALETTE.black,
    letterSpacing: 1,
  },
  bannerWrap: {
    position: 'absolute',
    top: '36%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bannerText: {
    fontFamily: FONT.family,
    fontSize: FONT.titleM,
    color: PALETTE.lineWhite,
    letterSpacing: 1,
    textAlign: 'center',
  },
  turnOver: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
