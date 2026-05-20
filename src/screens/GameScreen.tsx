import React from 'react';
import { StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CoinFlipOverlay } from './CoinFlipOverlay';
import { TurnAnnouncerOverlay } from './TurnAnnouncerOverlay';
import { PassThePhoneScreen } from './PassThePhoneScreen';
import { OffenseScreen, ShotResolvedEvent } from './OffenseScreen';
import { DefenseScreen, DefenseShotResolved } from './DefenseScreen';
import { ScoreScreen } from './ScoreScreen';
import {
  GameAction,
  GameState,
  flipCoinForMode,
  gameReducer,
  initGameState,
} from '@/game/gameLoop';
import { RootStackParamList } from '@/navigation';
import { PALETTE } from '@/constants/theme';

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

  // Tick the global game timer every second EXCEPT during pre-game phases.
  React.useEffect(() => {
    if (state.phase !== 'OFFENSE' && state.phase !== 'DEFENSE') return;
    if (state.gameTimeRemainingSec <= 0) return;
    const id = setTimeout(() => dispatch({ type: 'GAME_TIMER_TICK' }), 1000);
    return () => clearTimeout(id);
  }, [state.phase, state.gameTimeRemainingSec]);

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

  // Per-shot callbacks (currently unused by the loop directly, but useful
  // hooks for analytics / highlight buffer in Phase 8).
  const handleOffenseShot = React.useCallback((_e: ShotResolvedEvent) => {}, []);
  const handleDefenseShot = React.useCallback((_e: DefenseShotResolved) => {
    // When defense uses Double Jump, the OffenseScreen's effects bag is
    // gone; we just consume our cross-turn flag locally.
    if (doubleJumpAvailable) setDoubleJumpAvailable(false);
  }, [doubleJumpAvailable]);

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
      case 'OFFENSE':
        return (
          <OffenseScreen
            defenderLevel={s.defenderLevel}
            onTurnEnd={handleOffenseTurnEnd}
            onShotResolved={handleOffenseShot}
            onPowerUpCollected={handlePowerUpCollected}
            playerLabel={s.activePlayer === 'P1' ? 'PLAYER 1' : 'PLAYER 2'}
            matchScores={{
              p1: s.scores.P1.points,
              opp: s.mode === 'vsBot' ? s.scores.BOT.points : s.scores.P2.points,
            }}
            matchTimeRemainingSec={s.gameTimeRemainingSec}
            matchMode={s.mode}
          />
        );
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
            matchTimeRemainingSec={s.gameTimeRemainingSec}
            matchMode={s.mode}
            doubleJumpAvailable={doubleJumpAvailable}
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
        return (
          <ScoreScreen
            state={s}
            onRematch={() =>
              navigation.replace('Game', { mode: s.mode, defenderLevel: s.defenderLevel })
            }
            onMainMenu={() => navigation.navigate('Home')}
          />
        );
    }
  };

  return <View style={styles.root}>{renderActiveScreen(state)}</View>;
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.black },
  fill: { flex: 1 },
});
