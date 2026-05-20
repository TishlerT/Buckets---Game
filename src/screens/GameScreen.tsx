import React from 'react';
import { StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CoinFlipOverlay } from './CoinFlipOverlay';
import { TurnAnnouncerOverlay } from './TurnAnnouncerOverlay';
import { PassThePhoneScreen } from './PassThePhoneScreen';
import { OffenseScreen, ShotResolvedEvent } from './OffenseScreen';
import { DefenseScreen, DefenseShotResolved } from './DefenseScreen';
import { ScoreScreen } from './ScoreScreen';
import { HighlightScreen } from './HighlightScreen';
import {
  HighlightSnapshot,
  makeContestedMake,
  makePerfectBlock,
  pickBestHighlight,
} from '@/game/highlights';
import {
  GameAction,
  GameState,
  flipCoinForMode,
  gameReducer,
  initGameState,
} from '@/game/gameLoop';
import { useProgression } from '@/context/ProgressionContext';
import { xpForGameResult } from '@/game/progression';
import { startMusic, stopMusic } from '@/game/audio';
import { PauseButton, PauseMenu } from '@/components/PauseMenu';
import { RootStackParamList } from '@/navigation';
import { PALETTE, SPACING } from '@/constants/theme';
import { Pressable } from 'react-native';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

/**
 * GameScreen orchestrates the full match by holding the gameLoop reducer
 * state and rendering the right sub-screen based on `state.phase`.
 */
export const GameScreen: React.FC<Props> = ({ route, navigation }) => {
  const { mode, defenderLevel } = route.params;
  const [state, dispatch] = React.useReducer(gameReducer, undefined, () =>
    initGameState({ mode, defenderLevel })
  );

  // Cross-turn power-up state. `doubleJumpAvailable` carries from offense
  // (when collected) into the next defense turn.
  const [doubleJumpAvailable, setDoubleJumpAvailable] = React.useState(false);

  const { progression, awardXp } = useProgression();
  const xpAwardedRef = React.useRef(false);
  const [paused, setPaused] = React.useState(false);

  // Highlight ring buffer — captures contested makes + perfect blocks.
  const highlightBufferRef = React.useRef<HighlightSnapshot[]>([]);
  const [highlightToShow, setHighlightToShow] = React.useState<HighlightSnapshot | null>(null);
  const [showingHighlight, setShowingHighlight] = React.useState(false);
  const contestedMakesRef = React.useRef(0);

  // Background music: start on first OFFENSE/DEFENSE, stop on END / unmount.
  React.useEffect(() => {
    if (state.phase === 'OFFENSE' || state.phase === 'DEFENSE') {
      startMusic(0.35);
    } else if (state.phase === 'END') {
      stopMusic();
    }
    return () => { /* don't stop on every effect re-run */ };
  }, [state.phase]);
  React.useEffect(() => () => stopMusic(), []);

  // Award XP on first transition into END phase (vs-bot only — no XP in 2P
  // because the device is shared and we'd need per-account tracking).
  React.useEffect(() => {
    if (state.phase !== 'END') return;
    if (xpAwardedRef.current) return;
    if (state.mode === 'vsBot') {
      xpAwardedRef.current = true;
      const result = xpForGameResult({
        win: state.winner === 'P1',
        perfectBlocks: state.scores.P1.perfectBlocks,
        contestedMakes: contestedMakesRef.current,
      });
      awardXp(result.total);
    }
    // Pick the best highlight from the buffer (if any) for the score screen.
    const best = pickBestHighlight(highlightBufferRef.current);
    setHighlightToShow(best);
  }, [state.phase, state.mode, state.winner, state.scores, awardXp]);

  // Schedule a coin-flip resolution exactly once at the start.
  React.useEffect(() => {
    if (state.phase !== 'COIN_FLIP') return;
    const winner = flipCoinForMode(state.mode);
    // Tiny delay so the overlay can mount before the first reducer dispatch
    // (the overlay also waits internally before calling onDone).
    const id = setTimeout(() => {
      // The overlay's onDone will dispatch this; we just pre-compute winner.
      // We stash it via the closure below.
      coinWinnerRef.current = winner;
    }, 0);
    return () => clearTimeout(id);
  }, [state.phase, state.mode]);

  const coinWinnerRef = React.useRef<ReturnType<typeof flipCoinForMode>>('P1');

  // Tick the global game timer every second EXCEPT during pre-game phases
  // and while paused.
  React.useEffect(() => {
    if (paused) return;
    if (state.phase !== 'OFFENSE' && state.phase !== 'DEFENSE') return;
    if (state.gameTimeRemainingSec <= 0) return;
    const id = setTimeout(() => dispatch({ type: 'GAME_TIMER_TICK' }), 1000);
    return () => clearTimeout(id);
  }, [state.phase, state.gameTimeRemainingSec, paused]);

  const handleOffenseTurnEnd = React.useCallback(
    (pointsScored: number) => {
      dispatch({ type: 'TURN_ENDED', pointsScored, perfectBlocks: 0 });
    },
    []
  );
  const handleDefenseTurnEnd = React.useCallback(
    (botPointsScored: number, perfectBlocks: number) => {
      dispatch({ type: 'TURN_ENDED', pointsScored: botPointsScored, perfectBlocks });
    },
    []
  );

  // Per-shot callbacks. We use these to capture highlight candidates.
  const handleOffenseShot = React.useCallback(
    (e: ShotResolvedEvent) => {
      if (e.result === 'make' && e.contested) {
        contestedMakesRef.current += 1;
        highlightBufferRef.current.push(
          makeContestedMake({
            points: e.points,
            playerTotal: state.scores.P1.points + e.points,
            oppTotal: state.mode === 'vsBot' ? state.scores.BOT.points : state.scores.P2.points,
            defenderLevel: state.defenderLevel,
          })
        );
      }
    },
    [state.scores, state.mode, state.defenderLevel]
  );
  const handleDefenseShot = React.useCallback(
    (e: DefenseShotResolved) => {
      if (doubleJumpAvailable) setDoubleJumpAvailable(false);
      if (e.perfectBlock) {
        highlightBufferRef.current.push(
          makePerfectBlock({
            playerTotal: state.scores.P1.points,
            oppTotal: state.mode === 'vsBot' ? state.scores.BOT.points : state.scores.P2.points,
            defenderLevel: state.defenderLevel,
          })
        );
      }
    },
    [doubleJumpAvailable, state.scores, state.mode, state.defenderLevel]
  );

  /** Called by OffenseScreen when a power-up is collected. */
  const handlePowerUpCollected = React.useCallback((kind: string) => {
    if (kind === 'doubleJump') setDoubleJumpAvailable(true);
  }, []);

  const renderActiveScreen = (s: GameState) => {
    switch (s.phase) {
      case 'COIN_FLIP':
        return (
          <View style={styles.fill}>
            <CoinFlipOverlay
              winner={coinWinnerRef.current}
              onDone={() =>
                dispatch({ type: 'COIN_FLIP_RESOLVED', winner: coinWinnerRef.current })
              }
            />
          </View>
        );
      case 'ANNOUNCE':
        return (
          <View style={styles.fill}>
            <TurnAnnouncerOverlay
              player={s.activePlayer}
              role={s.currentRole}
              onDone={() => dispatch({ type: 'ANNOUNCE_DONE' })}
            />
          </View>
        );
      case 'OFFENSE': {
        // Active player gets credited live in the scoreboard; the opponent
        // column shows whoever isn't currently shooting.
        const activeIsP1 = s.activePlayer === 'P1';
        const p1Display = activeIsP1 ? s.scores.P1.points : s.scores.P1.points;
        const oppDisplay =
          s.mode === 'vsBot'
            ? s.scores.BOT.points
            : (activeIsP1 ? s.scores.P2.points : s.scores.P2.points);
        return (
          <OffenseScreen
            defenderLevel={s.defenderLevel}
            onTurnEnd={handleOffenseTurnEnd}
            onShotResolved={handleOffenseShot}
            onPowerUpCollected={handlePowerUpCollected}
            playerLabel={activeIsP1 ? 'PLAYER 1' : 'PLAYER 2'}
            matchScores={{
              // In 2P, the active player's live score adds to their own column.
              p1: activeIsP1 ? p1Display : p1Display,
              opp: oppDisplay,
            }}
            activePlayer={s.activePlayer}
            matchTimeRemainingSec={s.gameTimeRemainingSec}
            matchMode={s.mode}
            paused={paused}
            court={progression.selected.court}
            defenderVariant={progression.selected.defender}
            ballSkin={progression.selected.skin}
          />
        );
      }
      case 'DEFENSE':
        return (
          <DefenseScreen
            defenderLevel={s.defenderLevel}
            onTurnEnd={handleDefenseTurnEnd}
            onShotResolved={handleDefenseShot}
            playerLabel={s.activePlayer === 'P1' ? 'PLAYER 1' : 'PLAYER 2'}
            matchScores={{
              p1: s.scores.P1.points,
              opp: s.mode === 'vsBot' ? s.scores.BOT.points : s.scores.P2.points,
            }}
            activePlayer={s.activePlayer}
            matchTimeRemainingSec={s.gameTimeRemainingSec}
            matchMode={s.mode}
            paused={paused}
            doubleJumpAvailable={doubleJumpAvailable}
            court={progression.selected.court}
            shooterVariant={progression.selected.defender}
          />
        );
      case 'PASS_PHONE':
        return (
          <PassThePhoneScreen
            nextPlayer={s.activePlayer}
            onDone={() => dispatch({ type: 'PASS_PHONE_DONE' })}
          />
        );
      case 'END':
        if (showingHighlight && highlightToShow) {
          return (
            <HighlightScreen
              highlight={highlightToShow}
              onDone={() => setShowingHighlight(false)}
            />
          );
        }
        return (
          <ScoreScreen
            state={s}
            contestedMakes={contestedMakesRef.current}
            onRematch={() => {
              setShowingHighlight(false);
              setHighlightToShow(null);
              highlightBufferRef.current = [];
              contestedMakesRef.current = 0;
              xpAwardedRef.current = false;
              navigation.replace('Game', { mode: s.mode, defenderLevel: s.defenderLevel });
            }}
            onMainMenu={() => navigation.navigate('Home')}
            onShowHighlight={
              highlightToShow ? () => setShowingHighlight(true) : undefined
            }
          />
        );
    }
  };

  // Pause is only visible during gameplay.
  const isPlaying = state.phase === 'OFFENSE' || state.phase === 'DEFENSE';

  return (
    <View style={styles.root}>
      {renderActiveScreen(state)}
      {isPlaying && !paused && (
        <View style={styles.pauseBtnWrap} pointerEvents="box-none">
          <Pressable
            accessibilityLabel="PAUSE"
            accessibilityRole="button"
            onPress={() => setPaused(true)}
          >
            <PauseButton onPress={() => setPaused(true)} />
          </Pressable>
        </View>
      )}
      {paused && (
        <PauseMenu
          onResume={() => setPaused(false)}
          onQuit={() => {
            stopMusic();
            navigation.navigate('Home');
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.black },
  fill: { flex: 1 },
  pauseBtnWrap: {
    position: 'absolute',
    top: 60,
    right: 0,
    left: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
    zIndex: 10,
  },
});

void SPACING;
