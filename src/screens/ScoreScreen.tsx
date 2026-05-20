import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { PixelButton } from '@/components/PixelButton';
import { PixelBorderPanel } from '@/components/PixelBorderPanel';
import { GameMode, GameState } from '@/game/gameLoop';
import {
  XP_CONTESTED_MAKE_BONUS,
  XP_LOSS,
  XP_PERFECT_BLOCK_BONUS,
  XP_WIN,
} from '@/constants/gameConfig';
import { FONT, PALETTE, SPACING } from '@/constants/theme';

interface Props {
  state: GameState;
  /** XP previously earned (for display); pass 0 if first session. */
  onRematch: () => void;
  onMainMenu: () => void;
  /** When provided, a HIGHLIGHT button appears above REMATCH. */
  onShowHighlight?: () => void;
}

export const ScoreScreen: React.FC<Props> = ({ state, onRematch, onMainMenu, onShowHighlight }) => {
  const winner = state.winner ?? 'TIE';
  const p1 = state.scores.P1;
  const opp =
    state.mode === 'vsBot' ? state.scores.BOT : state.scores.P2;

  // In vs-bot mode the device is always P1's, so "YOU" = P1.
  // In local 2P, both players share the device — show neutral "PLAYER N WINS"
  // copy instead of an ambiguous "YOU WIN".
  const playerWonVsBot = state.mode === 'vsBot' && winner === 'P1';
  const xpFromGame = playerWonVsBot ? XP_WIN : XP_LOSS;
  const xpFromBlocks = p1.perfectBlocks * XP_PERFECT_BLOCK_BONUS;
  const xpTotal = state.mode === 'vsBot' ? xpFromGame + xpFromBlocks : 0;

  const titleText =
    winner === 'TIE'
      ? 'TIE GAME'
      : state.mode === 'vsBot'
        ? winner === 'P1' ? 'YOU WIN!' : 'BOT WINS'
        : winner === 'P1' ? 'PLAYER 1 WINS' : 'PLAYER 2 WINS';
  const titleColor =
    winner === 'TIE'
      ? PALETTE.yellowBright
      : state.mode === 'vsBot' && winner === 'P1'
        ? PALETTE.greenGo
        : state.mode === 'local2P'
          ? PALETTE.greenGo
          : PALETTE.redHot;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {(playerWonVsBot || (state.mode === 'local2P' && winner !== 'TIE')) && (
          <ConfettiBurst trigger={1} cx={200} cy={300} count={36} maxRadius={300} />
        )}

        <View style={styles.titleWrap}>
          <Text style={[styles.titleText, { color: titleColor }]}>{titleText}</Text>
        </View>

        <View style={styles.boardWrap}>
          <PixelBorderPanel innerPadding={SPACING.md}>
            <View style={styles.row}>
              <Text style={styles.label}>{state.mode === 'local2P' ? 'P1' : 'YOU'}</Text>
              <Text style={styles.score}>{p1.points}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>BLOCKS</Text>
              <Text style={styles.score}>{p1.perfectBlocks}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.label}>{state.mode === 'local2P' ? 'P2' : 'BOT'}</Text>
              <Text style={styles.score}>{opp.points}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>BLOCKS</Text>
              <Text style={styles.score}>{opp.perfectBlocks}</Text>
            </View>
          </PixelBorderPanel>
        </View>

        {state.mode === 'vsBot' && (
          <View style={styles.xpWrap}>
            <PixelBorderPanel innerPadding={SPACING.md} color={PALETTE.shadow}>
              <Text style={styles.xpLabel}>XP EARNED</Text>
              <Text style={styles.xpTotal}>+{xpTotal}</Text>
              <Text style={styles.xpDetail}>
                {playerWonVsBot ? 'WIN' : 'LOSS'} +{xpFromGame}
              </Text>
              {p1.perfectBlocks > 0 && (
                <Text style={styles.xpDetail}>
                  {p1.perfectBlocks} BLOCK{p1.perfectBlocks === 1 ? '' : 'S'} +{xpFromBlocks}
                </Text>
              )}
            </PixelBorderPanel>
          </View>
        )}

        <View style={styles.buttons}>
          {onShowHighlight && (
            <>
              <PixelButton
                label="HIGHLIGHT!"
                color={PALETTE.yellowBright}
                onPress={onShowHighlight}
              />
              <View style={{ height: SPACING.md }} />
            </>
          )}
          <PixelButton label="REMATCH" color={PALETTE.greenGo} onPress={onRematch} />
          <View style={{ height: SPACING.md }} />
          <PixelButton label="MAIN MENU" color={PALETTE.fog} onPress={onMainMenu} />
        </View>

        <Text style={styles.unusedHint}>{XP_CONTESTED_MAKE_BONUS > 0 ? '' : ''}</Text>
        <Text style={{ display: 'none' }}>{(['vsBot', 'local2P'] as GameMode[]).join('|')}</Text>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.black },
  safe: {
    flex: 1,
    padding: SPACING.lg,
    justifyContent: 'space-between',
  },
  titleWrap: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  titleText: {
    fontFamily: FONT.family,
    fontSize: FONT.titleXL,
    letterSpacing: 4,
    textShadowColor: PALETTE.black,
    textShadowOffset: { width: 4, height: 4 },
    textShadowRadius: 0,
  },
  boardWrap: {
    width: '100%',
    paddingHorizontal: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  label: {
    fontFamily: FONT.family,
    fontSize: FONT.body,
    color: PALETTE.lineWhite,
    letterSpacing: 1,
  },
  score: {
    fontFamily: FONT.family,
    fontSize: FONT.titleL,
    color: PALETTE.yellowBright,
  },
  divider: {
    height: 2,
    backgroundColor: PALETTE.fog,
    marginVertical: SPACING.sm,
  },
  xpWrap: {
    paddingHorizontal: SPACING.md,
  },
  xpLabel: {
    fontFamily: FONT.family,
    fontSize: FONT.tiny,
    color: PALETTE.lineWhite,
    letterSpacing: 1,
  },
  xpTotal: {
    fontFamily: FONT.family,
    fontSize: FONT.titleL,
    color: PALETTE.yellowBright,
    letterSpacing: 2,
    marginVertical: SPACING.xs,
  },
  xpDetail: {
    fontFamily: FONT.family,
    fontSize: FONT.tiny,
    color: PALETTE.fog,
    letterSpacing: 1,
  },
  buttons: {
    width: '100%',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  unusedHint: { display: 'none' },
});
