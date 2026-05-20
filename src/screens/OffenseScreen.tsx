import React from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CourtBackground } from '@/components/CourtBackground';
import { BasketSprite } from '@/components/BasketSprite';
import { DefenderSprite } from '@/components/DefenderSprite';
import { PowerMeter } from '@/components/PowerMeter';
import { BallSprite } from '@/components/BallSprite';
import { PowerUpSprite } from '@/components/PowerUpSprite';
import { PixelButton } from '@/components/PixelButton';
import { PixelBorderPanel } from '@/components/PixelBorderPanel';
import {
  AIM_SENSITIVITY,
  ARC_SLIDE_SPEED,
  BASKET_RIM_PIXEL_FUDGE_PX,
  BASKET_RIM_Y_FACTOR,
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
  playerLabel?: string;
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
  playerLabel = 'PLAYER',
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
  const defenderArcPos = useSharedValue(0.5);

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
  const [effects, setEffects] = React.useState<PlayerEffects>(EMPTY_EFFECTS);
  const [powerUp, setPowerUp] = React.useState<PowerUpInstance | null>(null);
  const [powerUpFrame, setPowerUpFrame] = React.useState<0 | 1>(0);
  const [defenderFrame, setDefenderFrame] = React.useState<0 | 1>(0);
  const [shotInProgress, setShotInProgress] = React.useState(false);
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
  React.useEffect(() => {
    if (turnEnded) return;
    if (timeRemaining <= 0) {
      setTurnEnded(true);
      return;
    }
    const id = setTimeout(() => setTimeRemaining((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [timeRemaining, turnEnded]);

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
    const id = setInterval(() => setDefenderFrame((f) => (f === 0 ? 1 : 0)), 170);
    return () => clearInterval(id);
  }, []);
  React.useEffect(() => {
    const id = setInterval(() => setPowerUpFrame((f) => (f === 0 ? 1 : 0)), 240);
    return () => clearInterval(id);
  }, []);

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
        setPowerUp(null);
      }
    }, 60);
    return () => clearInterval(id);
  }, [powerUp, arcLeftX, arcLengthPx, playerArcPos]);

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
    return {
      transform: [{ translateX: ballX.value - half }, { translateY: ballY.value - half }],
    };
  });

  const playerAnimStyle = useAnimatedStyle(() => {
    const x = arcLeftX + playerArcPos.value * arcLengthPx;
    const half = LAYOUT.ballSpritePx / 2;
    return { transform: [{ translateX: x - half }, { translateY: playerY - half }] };
  });

  const defenderAnimStyle = useAnimatedStyle(() => {
    const x = arcLeftX + defenderArcPos.value * arcLengthPx;
    const half = LAYOUT.defenderSpritePx / 2;
    return {
      transform: [
        { translateX: x - half },
        { translateY: playerY - LAYOUT.defenderYOffsetPx },
      ],
    };
  });

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

  // Trajectory preview: read shared values via React state tick (only while pulling).
  let trajectoryEls: React.ReactElement[] | null = null;
  if (isPulling && pullingTick >= 0) {
    const pull = { x: pullDX.value, y: pullDY.value };
    const len = Math.hypot(pull.x, pull.y);
    const power01 = pullToPower(len);
    if (power01 > 0) {
      const playerX = arcLeftX + playerArcPos.value * arcLengthPx;
      const aim = aimFromPull(pull); // identical math to the actual shot
      const flight = computeFlight({ x: playerX, y: playerY }, rim, aim, power01);
      const els: React.ReactElement[] = [];
      const N = LAYOUT.trajectoryDashSegments;
      let prev = sampleFlight(flight, 0);
      for (let i = 1; i <= N; i++) {
        const cur = sampleFlight(flight, i / N);
        if (i % 2 === 1) {
          els.push(
            <Line
              key={`tr-${i}`}
              x1={prev.x}
              y1={prev.y}
              x2={cur.x}
              y2={cur.y}
              stroke={PALETTE.yellowBright}
              strokeWidth={2}
              opacity={0.95}
            />
          );
        }
        prev = cur;
      }
      const landing = sampleFlight(flight, 1);
      els.push(
        <Circle
          key="land"
          cx={landing.x}
          cy={landing.y}
          r={6}
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
      <CourtBackground width={width} height={height} court="playground" perspective="offense" />

      <View style={[styles.basketWrap, { top: basketTopY, left: width / 2 - basketSize / 2 }]}>
        <BasketSprite size={basketSize} big={effects.biggerRimNextShot} />
      </View>

      <Animated.View style={[styles.absolute, defenderAnimStyle]} pointerEvents="none">
        <DefenderSprite
          size={LAYOUT.defenderSpritePx}
          variant={DEFENDER_LEVEL_TO_VARIANT[defenderLevel]}
          frame={defenderFrame}
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

      {/* player ball or in-flight ball */}
      {!shotInProgress && !ballHidden && (
        <Animated.View style={[styles.absolute, playerAnimStyle]} pointerEvents="none">
          <BallSprite size={LAYOUT.ballSpritePx} />
        </Animated.View>
      )}
      {shotInProgress && !ballHidden && (
        <Animated.View style={[styles.absolute, ballAnimStyle]} pointerEvents="none">
          <BallSprite size={LAYOUT.ballSpritePx} />
        </Animated.View>
      )}


      {/* Power meter */}
      <View
        style={[styles.powerMeterWrap, { right: 14, top: shootZoneTop + 16 }]}
        pointerEvents="none"
      >
        <PowerMeter power={power} />
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
        <Text style={styles.shootZoneLabel}>↓  SLINGSHOT ZONE  ↓</Text>
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

      {/* HUD */}
      <SafeAreaView edges={['top']} style={styles.hudRow} pointerEvents="box-none">
        <PixelBorderPanel innerPadding={6}>
          <Text style={styles.hudText}>{playerLabel}</Text>
          <Text style={styles.hudScore}>{score}</Text>
        </PixelBorderPanel>
        <PixelBorderPanel innerPadding={6}>
          <Text style={styles.hudText}>TIME</Text>
          <Text style={[styles.hudScore, timeRemaining <= 5 ? { color: PALETTE.redHot } : undefined]}>
            {timeRemaining}
          </Text>
        </PixelBorderPanel>
      </SafeAreaView>

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
  powerMeterWrap: { position: 'absolute' },
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
