import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Rect } from 'react-native-svg';
import { COIN_FLIP_DURATION_MS } from '@/constants/gameConfig';
import { FONT, PALETTE, SPACING } from '@/constants/theme';
import { Player } from '@/game/gameLoop';

interface CoinFlipOverlayProps {
  /** Pre-determined winner (FSM injects this). */
  winner: Player;
  /** Called once the animation completes and winner is shown. */
  onDone: () => void;
}

/**
 * Full-screen coin-flip animation. The coin spins on its Y axis and the
 * winner is announced after `COIN_FLIP_DURATION_MS`. Pure visuals — the
 * actual decision was made by the reducer; we just narrate it.
 */
export const CoinFlipOverlay: React.FC<CoinFlipOverlayProps> = ({ winner, onDone }) => {
  const flip = useSharedValue(0);
  const [showWinner, setShowWinner] = React.useState(false);

  React.useEffect(() => {
    flip.value = withTiming(
      8 * 360,
      { duration: COIN_FLIP_DURATION_MS, easing: Easing.out(Easing.cubic) },
      () => {
        // schedule the winner reveal
      }
    );
    const t1 = setTimeout(() => setShowWinner(true), COIN_FLIP_DURATION_MS);
    const t2 = setTimeout(() => onDone(), COIN_FLIP_DURATION_MS + 1100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [flip, onDone]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${flip.value}deg` }],
  }));

  return (
    <View style={styles.root} pointerEvents="none">
      <Text style={styles.title}>COIN FLIP</Text>
      <Animated.View style={[styles.coinWrap, animStyle]}>
        <Svg width={120} height={120} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={11} fill={PALETTE.yellowBright} stroke={PALETTE.black} strokeWidth={1.5} />
          <Rect x={9} y={6} width={6} height={12} fill={PALETTE.orangeShadow} />
          <Rect x={6} y={9} width={12} height={6} fill={PALETTE.orangeShadow} />
        </Svg>
      </Animated.View>
      {showWinner && (
        <View style={styles.winnerWrap}>
          <Text style={styles.winnerText}>
            {winner === 'P1' && 'PLAYER 1 ON OFFENSE'}
            {winner === 'P2' && 'PLAYER 2 ON OFFENSE'}
            {winner === 'BOT' && 'BOT ON OFFENSE'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: PALETTE.black,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  title: {
    fontFamily: FONT.family,
    fontSize: FONT.titleL,
    color: PALETTE.lineWhite,
    letterSpacing: 2,
    marginBottom: SPACING.xl,
  },
  coinWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  winnerWrap: {
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderWidth: 4,
    borderColor: PALETTE.yellowBright,
    backgroundColor: PALETTE.midnight,
  },
  winnerText: {
    fontFamily: FONT.family,
    fontSize: FONT.body,
    color: PALETTE.yellowBright,
    letterSpacing: 1,
    textAlign: 'center',
  },
});
