import React from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CourtBackground } from '@/components/CourtBackground';
import { BasketSprite } from '@/components/BasketSprite';
import { ShooterSprite } from '@/components/ShooterSprite';
import { TimingFlash } from '@/components/TimingFlash';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { CrowdReaction } from '@/components/CrowdReaction';
import { FlashText } from '@/components/FlashText';
import { MatchScoreboard } from '@/components/MatchScoreboard';
import { PixelButton } from '@/components/PixelButton';
import { PixelBorderPanel } from '@/components/PixelBorderPanel';
import { ScreenShake } from '@/components/ScreenShake';
import {
  CONFIG,
  DefenderId,
  POINTS_BLOCK_FOR_SHOOTER,
  POINTS_CONTESTED_MAKE,
  POINTS_OPEN_MAKE,
  POST_RESULT_PAUSE_MS,
  SWIPE_UP_MIN_DISTANCE_PX,
  SWIPE_UP_MIN_VELOCITY,
  TURN_DURATION_SEC,
} from '@/constants/gameConfig';
import { FONT, PALETTE, SPACING } from '@/constants/theme';
import { botShotResult } from '@/game/botAI';
import { playSfx } from '@/game/audio';
import { heavyTap, mediumTap } from '@/game/haptics';
import {
  DefensePhase,
  DefenseState,
  initDefenseState,
  processSwipe,
  SwipeOutcome,
  tickDefense,
} from '@/game/defenseLogic';

interface DefenseScreenProps {
  /** 1..4 — controls bot speed, fakes, perfect window. */
  defenderLevel?: 1 | 2 | 3 | 4;
  turnSeconds?: number;
  /** Called each time the bot resolves a shot (block or score). */
  onShotResolved?: (event: DefenseShotResolved) => void;
  onTurnEnd?: (botPointsScored: number, perfectBlocks: number) => void;
  playerLabel?: string;
  /** Match-level info for the persistent scoreboard. Optional. */
  matchScores?: { p1: number; opp: number };
  matchTimeRemainingSec?: number;
  matchMode?: 'vsBot' | 'local2P';
  /** Active player on this defense turn. */
  activePlayer?: 'P1' | 'P2' | 'BOT';
  /** When true, freezes the turn timer + FSM tick (pause). */
  paused?: boolean;
  /** Cross-turn power-up effects carried over from the previous offense turn. */
  doubleJumpAvailable?: boolean;
  /** Cosmetics from progression. */
  court?: import('@/constants/gameConfig').CourtId;
  shooterVariant?: DefenderId;
}

export interface DefenseShotResolved {
  outcome: SwipeOutcome;
  /** Did the bot score on this attempt? */
  botMade: boolean;
  /** How many points the bot earned. */
  botPoints: number;
  /** Was this a perfect block? */
  perfectBlock: boolean;
}

const DEFENDER_LEVEL_TO_VARIANT: Record<1 | 2 | 3 | 4, DefenderId> = {
  1: 'grandpa',
  2: 'recLeague',
  3: 'pro',
  4: 'alien',
};

/**
 * Defense screen — first-person view from under the basket looking out at
 * the bot shooter beyond the 3-pt arc. Player swipes up to jump and block.
 *
 * Architecture:
 *   - JS-side FSM (`defenseLogic.tickDefense`) owns timing.
 *   - A ~60Hz polling loop advances the FSM and updates React state.
 *   - When the FSM enters RELEASE, a TimingFlash burst fires.
 *   - Swipe-up triggers `processSwipe`. The result determines block vs miss.
 *   - On PERFECT block: ConfettiBurst + +XP banner.
 *   - On EARLY/LATE: bot rolls `botShotResult` to decide make vs miss.
 */
export const DefenseScreen: React.FC<DefenseScreenProps> = ({
  defenderLevel = 1,
  turnSeconds = TURN_DURATION_SEC,
  onShotResolved,
  onTurnEnd,
  playerLabel = 'PLAYER',
  matchScores,
  matchTimeRemainingSec,
  matchMode = 'vsBot',
  activePlayer = 'P1',
  paused = false,
  doubleJumpAvailable = false,
  court = 'playground',
  shooterVariant,
}) => {
  const { width: winW, height: winH } = useWindowDimensions();
  const [layout, setLayout] = React.useState<{ width: number; height: number }>({
    width: winW,
    height: winH,
  });
  const { width, height } = layout;

  // ----- defense FSM state -----
  // We hold defense FSM in a ref (NOT React state) so the swipe handler
  // and the RAF tick loop both write to the same source of truth without
  // racing. React state is just a render-trigger snapshot.
  const stateRef = React.useRef(initDefenseState(defenderLevel, performance.now()));
  const [, forceRender] = React.useReducer((x: number) => x + 1, 0);
  /** Mutate state via this helper so we never miss a render. */
  const updateState = React.useCallback((next: DefenseState) => {
    stateRef.current = next;
    forceRender();
  }, []);
  const state = stateRef.current;

  /** Whether the player has already used their swipe for the current attempt.
   * Reset every time we leave RELEASE → RESULT or enter a new IDLE/WINDUP. */
  const swipesUsedRef = React.useRef(0);
  const doubleJumpAvailableRef = React.useRef(doubleJumpAvailable);
  React.useEffect(() => {
    doubleJumpAvailableRef.current = doubleJumpAvailable;
  }, [doubleJumpAvailable]);

  // ----- score / turn tracking -----
  const [botScore, setBotScore] = React.useState(0);
  const [perfectBlocks, setPerfectBlocks] = React.useState(0);
  const [timeRemaining, setTimeRemaining] = React.useState(turnSeconds);
  const [turnEnded, setTurnEnded] = React.useState(false);
  const botScoreRef = React.useRef(0);
  const perfectBlocksRef = React.useRef(0);
  React.useEffect(() => { botScoreRef.current = botScore; }, [botScore]);
  React.useEffect(() => { perfectBlocksRef.current = perfectBlocks; }, [perfectBlocks]);

  // ----- visual triggers -----
  const [flashTrigger, setFlashTrigger] = React.useState(0);
  const [confettiTrigger, setConfettiTrigger] = React.useState(0);
  const [shakeTrigger, setShakeTrigger] = React.useState(0);
  const [crowdTrigger, setCrowdTrigger] = React.useState(0);
  const [bannerText, setBannerText] = React.useState<{ text: string; color: string } | null>(null);
  /** Center-screen flash for "BLOCKED!". */
  const [bigFlash, setBigFlash] = React.useState<{ trigger: number; text: string; color: string }>({
    trigger: 0, text: '', color: PALETTE.redHot,
  });

  // ----- Turn timer -----
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

  // Global match clock takes priority — if it hits 0 mid-turn, end the turn.
  React.useEffect(() => {
    if (turnEnded) return;
    if (matchTimeRemainingSec === undefined) return;
    if (matchTimeRemainingSec <= 0) setTurnEnded(true);
  }, [matchTimeRemainingSec, turnEnded]);

  // ----- FSM tick loop @ ~60Hz -----
  // Single source of truth: the FSM auto-advances and only auto-resolves
  // RELEASE → RESULT when the player did NOT swipe in time. A successful
  // swipe pre-resolves the shot via processSwipe; we just check whether
  // the FSM's tick produced a "fresh" RESULT we haven't applied yet.
  const lastAppliedOutcomeAtRef = React.useRef(0);
  React.useEffect(() => {
    if (turnEnded || paused) return;
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const prev = stateRef.current;
      const next = tickDefense(prev, now);
      if (next !== prev) {
        if (prev.phase !== 'RELEASE' && next.phase === 'RELEASE') {
          setFlashTrigger((t) => t + 1);
          // Reset swipe budget at the start of each release.
          swipesUsedRef.current = 0;
        }
        if (prev.phase !== 'IDLE' && next.phase === 'IDLE') {
          swipesUsedRef.current = 0;
        }
        if (prev.phase !== 'RESULT' && next.phase === 'RESULT') {
          // Apply outcome ONLY if it wasn't already applied via swipe.
          const outcomeStamp = next.phaseStartedAtMs;
          if (outcomeStamp !== lastAppliedOutcomeAtRef.current) {
            lastAppliedOutcomeAtRef.current = outcomeStamp;
            if (next.lastOutcome === 'LATE') applyBotShot(/*open=*/ false);
            else if (next.lastOutcome === 'EARLY') applyBotShot(/*open=*/ true);
            else if (next.lastOutcome === 'PERFECT') applyBlock();
          }
        }
        updateState(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // intentional: applyBotShot/applyBlock close over current state via refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnEnded, paused]);

  // ----- Outcome handlers -----
  function applyBotShot(open: boolean) {
    const result = botShotResult(defenderLevel);
    const made = result === 'make';
    const points = made ? (open ? POINTS_OPEN_MAKE : POINTS_CONTESTED_MAKE) : 0;
    if (made) {
      setBotScore((s) => s + points);
      setBannerText({
        text: open ? `BOT BUCKET (+${points})` : `BOT MAKE (+${points})`,
        color: PALETTE.redHot,
      });
      playSfx('swish');
      mediumTap();
    } else {
      setBannerText({ text: 'BOT MISSES', color: PALETTE.fog });
      playSfx('brick');
      mediumTap();
    }
    onShotResolved?.({
      outcome: open ? 'EARLY' : 'LATE',
      botMade: made,
      botPoints: points,
      perfectBlock: false,
    });
    setTimeout(() => setBannerText(null), POST_RESULT_PAUSE_MS - 100);
  }

  function applyBlock() {
    setPerfectBlocks((p) => p + 1);
    setConfettiTrigger((c) => c + 1);
    setShakeTrigger((t) => t + 1);
    setCrowdTrigger((t) => t + 1);
    setBannerText({ text: 'BLOCK!', color: PALETTE.greenGo });
    setBigFlash({ trigger: Date.now(), text: 'BLOCKED!', color: PALETTE.redHot });
    playSfx('block');
    playSfx('cheer');
    heavyTap();
    onShotResolved?.({
      outcome: 'PERFECT',
      botMade: false,
      botPoints: POINTS_BLOCK_FOR_SHOOTER,
      perfectBlock: true,
    });
    setTimeout(() => setBannerText(null), POST_RESULT_PAUSE_MS - 100);
  }

  /** Called when the player completes a swipe-up gesture. */
  function handleSwipe() {
    if (turnEnded) return;
    const cur = stateRef.current;

    // Enforce one-swipe-per-shot UNLESS Double Jump grants a second.
    if (swipesUsedRef.current >= 1) {
      if (doubleJumpAvailableRef.current) {
        doubleJumpAvailableRef.current = false;
      } else {
        // ignore; player already swiped this shot
        return;
      }
    }
    swipesUsedRef.current += 1;

    const now = performance.now();
    const r = processSwipe(cur, now);
    updateState(r.state);

    // Mark this resolution so the RAF tick doesn't double-apply.
    if (r.state.phase === 'RESULT') {
      lastAppliedOutcomeAtRef.current = r.state.phaseStartedAtMs;
    }

    if (r.outcome === 'PERFECT') {
      applyBlock();
    } else if (r.outcome === 'EARLY') {
      applyBotShot(/*open=*/ true);
    } else if (r.outcome === 'LATE') {
      applyBotShot(/*open=*/ false);
    } else if (r.outcome === 'BAITED') {
      setBannerText({ text: 'FAKED OUT', color: PALETTE.yellowBright });
      setTimeout(() => setBannerText(null), 700);
    } else if (r.outcome === 'IGNORED') {
      // Swipe didn't classify; refund the swipe budget so the player can try again.
      swipesUsedRef.current = Math.max(0, swipesUsedRef.current - 1);
    }
  }

  // ----- Gesture (swipe up) -----
  const swipeGesture = Gesture.Pan()
    .maxPointers(1)
    .minDistance(SWIPE_UP_MIN_DISTANCE_PX)
    .onEnd((e) => {
      'worklet';
      // Distance must exceed minimum AND velocity must be upward.
      const dx = e.translationX;
      const dy = e.translationY;
      if (dy >= 0) return; // not upward
      if (Math.abs(dy) < SWIPE_UP_MIN_DISTANCE_PX) return;
      if (-e.velocityY < SWIPE_UP_MIN_VELOCITY) return;
      runOnJS(handleSwipe)();
    });

  // ----- Web pointer fallback (same reason as OffenseScreen) -----
  // Track raw pointer-down/move/up to detect swipe-up.
  const swipeRef = React.useRef({
    active: false,
    startX: 0,
    startY: 0,
    startTime: 0,
  });
  const onWebDown = (ev: any) => {
    if (turnEnded || ev.button !== 0) return;
    ev.preventDefault?.();
    try { (ev.currentTarget as HTMLElement)?.setPointerCapture?.(ev.pointerId); } catch {}
    swipeRef.current = {
      active: true,
      startX: ev.clientX,
      startY: ev.clientY,
      startTime: performance.now(),
    };
  };
  const onWebUp = (ev: any) => {
    const s = swipeRef.current;
    if (!s.active) return;
    ev.preventDefault?.();
    try { (ev.currentTarget as HTMLElement)?.releasePointerCapture?.(ev.pointerId); } catch {}
    s.active = false;
    const dx = ev.clientX - s.startX;
    const dy = ev.clientY - s.startY;
    const elapsed = Math.max(1, performance.now() - s.startTime);
    if (dy >= 0) return; // not upward
    if (Math.abs(dy) < SWIPE_UP_MIN_DISTANCE_PX) return;
    const velocity = (Math.abs(dy) / elapsed) * 1000; // px/sec
    if (velocity < SWIPE_UP_MIN_VELOCITY) return;
    handleSwipe();
  };

  // ----- Layout -----
  // Defense perspective: shooter is mid-distance, basket is "at our feet"
  // (camera is the defender). The shooter slides between random arc spots
  // before each wind-up so the player has to read where the shot will come
  // from instead of staring at a static target.
  const basketSize = Math.min(width * 0.5, 200);
  const shooterSize = Math.min(width * 0.5, 200);
  const shooterTopY = height * 0.18;
  const basketTopY = height * 0.62;

  // Shared X position for the bot shooter — animates between attempts.
  const shooterX = useSharedValue(width / 2);
  React.useEffect(() => {
    shooterX.value = width / 2;
  }, [width, shooterX]);

  /**
   * When the FSM enters IDLE (a new attempt is starting), pick a fresh
   * X for the shooter inside the 3PT zone and animate over ~600ms so
   * the player can see where the next attempt will come from. The IDLE
   * phase already pauses for ~700ms before WINDUP so we have room.
   */
  React.useEffect(() => {
    if (state.phase !== 'IDLE') return;
    const minX = width * 0.18;
    const maxX = width * 0.82;
    const target = minX + Math.random() * (maxX - minX);
    shooterX.value = withTiming(target, {
      duration: 550,
      easing: Easing.out(Easing.quad),
    });
  }, [state.phase, state.phaseStartedAtMs, width, shooterX]);

  const shooterAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shooterX.value - shooterSize / 2 }],
  }));

  const flashCx = width / 2;
  const flashCy = shooterTopY + shooterSize * 0.4;

  // Frame index from FSM phase.
  const frame = phaseToFrame(state.phase);
  const flashing = state.phase === 'RELEASE';

  return (
    <View
      style={styles.root}
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        if (w !== layout.width || h !== layout.height) setLayout({ width: w, height: h });
      }}
    >
    <ScreenShake trigger={shakeTrigger} amplitude={CONFIG.SCREEN_SHAKE_PX} durationMs={CONFIG.SCREEN_SHAKE_MS}>
      <CourtBackground width={width} height={height} court={court} perspective="defense" />

      <CrowdReaction
        trigger={crowdTrigger}
        top={height * 0.55 - 4}
        height={height * 0.1}
      />

      {/* Bot shooter — animates between random arc positions each attempt. */}
      <Animated.View
        style={[styles.shooterWrap, { top: shooterTopY }, shooterAnimStyle]}
        pointerEvents="none"
      >
        <ShooterSprite
          size={shooterSize}
          frame={frame}
          variant={shooterVariant ?? DEFENDER_LEVEL_TO_VARIANT[defenderLevel]}
          flashing={flashing}
        />
      </Animated.View>

      {/* telegraph flash (rings) */}
      <View
        style={{ position: 'absolute', left: flashCx - 100, top: flashCy - 100 }}
        pointerEvents="none"
      >
        <TimingFlash trigger={flashTrigger} size={200} />
      </View>

      {/* basket from below */}
      <View
        style={[styles.basketWrap, { top: basketTopY, left: width / 2 - basketSize / 2 }]}
        pointerEvents="none"
      >
        <BasketSprite size={basketSize} />
      </View>

      {/* swipe-area overlay */}
      {Platform.OS === 'web' ? (
        <View
          style={[styles.swipeOverlay, styles.touchActionNone as object]}
          pointerEvents="auto"
          {...({
            onPointerDown: onWebDown,
            onPointerUp: onWebUp,
            onPointerCancel: onWebUp,
            onPointerLeave: onWebUp,
          } as object)}
        />
      ) : (
        <GestureDetector gesture={swipeGesture}>
          <View style={styles.swipeOverlay} />
        </GestureDetector>
      )}

      {/* HUD */}
      {matchScores && matchTimeRemainingSec !== undefined ? (
        <MatchScoreboard
          mode={matchMode}
          p1Score={matchScores.p1}
          oppScore={matchScores.opp + botScore}
          turnTimeSec={timeRemaining}
          matchTimeSec={matchTimeRemainingSec}
        />
      ) : (
        <SafeAreaView edges={['top']} style={styles.hudRow} pointerEvents="box-none">
          <PixelBorderPanel innerPadding={6}>
            <Text style={styles.hudText}>{playerLabel}</Text>
            <Text style={styles.hudScore}>BLOCKS {perfectBlocks}</Text>
          </PixelBorderPanel>
          <PixelBorderPanel innerPadding={6}>
            <Text style={styles.hudText}>BOT</Text>
            <Text style={styles.hudScore}>{botScore}</Text>
          </PixelBorderPanel>
          <PixelBorderPanel innerPadding={6}>
            <Text style={styles.hudText}>TIME</Text>
            <Text style={[styles.hudScore, timeRemaining <= 5 ? { color: PALETTE.redHot } : undefined]}>
              {timeRemaining}
            </Text>
          </PixelBorderPanel>
        </SafeAreaView>
      )}

      {/* swipe-up prompt */}
      <View style={styles.swipeHint} pointerEvents="none">
        <Text style={styles.swipeHintText}>SWIPE UP TO BLOCK</Text>
      </View>

      {/* result banner */}
      {bannerText && (
        <View style={styles.bannerWrap} pointerEvents="none">
          <PixelBorderPanel innerPadding={14} color={PALETTE.midnight}>
            <Text style={[styles.bannerText, { color: bannerText.color }]}>{bannerText.text}</Text>
          </PixelBorderPanel>
        </View>
      )}

      {/* confetti on perfect block */}
      <ConfettiBurst trigger={confettiTrigger} cx={width / 2} cy={height / 2} count={28} />

      {/* "BLOCKED!" / etc. center-screen flash */}
      <FlashText trigger={bigFlash.trigger} text={bigFlash.text} color={bigFlash.color} />

      {/* turn over overlay */}
      {turnEnded && (
        <View style={styles.turnOver}>
          <PixelBorderPanel innerPadding={20}>
            <Text style={styles.bannerText}>TURN OVER</Text>
            <Text style={styles.hudText}>BLOCKS: {perfectBlocks}</Text>
            <Text style={styles.hudText}>BOT POINTS: {botScore}</Text>
            <View style={{ height: SPACING.md }} />
            <PixelButton
              label="OK"
              size="md"
              onPress={() =>
                onTurnEnd?.(botScoreRef.current, perfectBlocksRef.current)
              }
            />
          </PixelBorderPanel>
        </View>
      )}
    </ScreenShake>
    </View>
  );
};

function phaseToFrame(phase: DefensePhase): 0 | 1 | 2 {
  switch (phase) {
    case 'IDLE':
    case 'RESULT':
    case 'FAKE_RESET': // shooter resets to idle stance per spec
      return 0;
    case 'WINDUP':
      return 1;
    case 'RELEASE':
      return 2;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.black, overflow: 'hidden' },
  shooterWrap: { position: 'absolute' },
  basketWrap: { position: 'absolute' },
  swipeOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  touchActionNone: {
    ...({ touchAction: 'none', userSelect: 'none' } as object),
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
  swipeHint: {
    position: 'absolute',
    bottom: SPACING.xl,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  swipeHintText: {
    fontFamily: FONT.family,
    fontSize: FONT.small,
    color: PALETTE.yellowBright,
    letterSpacing: 1,
    opacity: 0.8,
  },
  bannerWrap: {
    position: 'absolute',
    top: '38%',
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
