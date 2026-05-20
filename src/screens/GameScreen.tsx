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
  const handleDefenseShot = React.useCallback((_e: DefenseShotResolved) => {}, []);

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
            playerLabel={
              s.activePlayer === 'P1' ? 'PLAYER 1' :
              s.activePlayer === 'P2' ? 'PLAYER 2' : 'BOT'
            }
          />
        );
      case 'DEFENSE':
        return (
          <DefenseScreen
            defenderLevel={s.defenderLevel}
            onTurnEnd={handleDefenseTurnEnd}
            onShotResolved={handleDefenseShot}
            playerLabel={
              s.activePlayer === 'P1' ? 'PLAYER 1' :
              s.activePlayer === 'P2' ? 'PLAYER 2' : 'YOU'
            }
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
