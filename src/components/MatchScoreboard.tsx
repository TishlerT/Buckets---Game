import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PixelBorderPanel } from './PixelBorderPanel';
import { GameMode } from '@/game/gameLoop';
import { FONT, PALETTE, SPACING } from '@/constants/theme';

interface MatchScoreboardProps {
  mode: GameMode;
  /** P1's running point total. */
  p1Score: number;
  /** Opponent's running point total (BOT in vs-bot, P2 in 2P). */
  oppScore: number;
  /** Optional turn timer, in seconds. */
  turnTimeSec?: number;
  /** Match clock remaining, in seconds. */
  matchTimeSec: number;
}

/**
 * Persistent match-level scoreboard rendered at the top of OFFENSE and
 * DEFENSE screens. Shows running totals for both sides and the match
 * clock, per spec ("Score display: persistent pixel scoreboard at top
 * of screen during play").
 */
export const MatchScoreboard: React.FC<MatchScoreboardProps> = ({
  mode,
  p1Score,
  oppScore,
  turnTimeSec,
  matchTimeSec,
}) => {
  const oppLabel = mode === 'vsBot' ? 'BOT' : 'P2';
  return (
    <SafeAreaView edges={['top']} style={styles.row} pointerEvents="box-none">
      <PixelBorderPanel innerPadding={6}>
        <Text style={styles.label}>P1</Text>
        <Text style={styles.score}>{p1Score}</Text>
      </PixelBorderPanel>
      <View style={styles.center}>
        {turnTimeSec !== undefined && (
          <PixelBorderPanel innerPadding={4} color={PALETTE.shadow}>
            <Text style={styles.label}>TURN</Text>
            <Text
              style={[
                styles.score,
                turnTimeSec <= 5 ? { color: PALETTE.redHot } : undefined,
              ]}
            >
              {Math.max(0, Math.ceil(turnTimeSec))}
            </Text>
          </PixelBorderPanel>
        )}
        <View style={{ height: 4 }} />
        <PixelBorderPanel innerPadding={4} color={PALETTE.midnight}>
          <Text style={styles.label}>MATCH</Text>
          <Text style={[styles.scoreSmall, matchTimeSec <= 10 ? { color: PALETTE.redHot } : undefined]}>
            {formatMatchTime(matchTimeSec)}
          </Text>
        </PixelBorderPanel>
      </View>
      <PixelBorderPanel innerPadding={6}>
        <Text style={styles.label}>{oppLabel}</Text>
        <Text style={styles.score}>{oppScore}</Text>
      </PixelBorderPanel>
    </SafeAreaView>
  );
};

function formatMatchTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.max(0, Math.ceil(s) % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.sm,
  },
  center: {
    alignItems: 'center',
    flexShrink: 1,
  },
  label: {
    fontFamily: FONT.family,
    fontSize: FONT.tiny,
    color: PALETTE.lineWhite,
    letterSpacing: 1,
    textAlign: 'center',
  },
  score: {
    fontFamily: FONT.family,
    fontSize: FONT.titleM,
    color: PALETTE.yellowBright,
    textAlign: 'center',
    marginTop: 2,
  },
  scoreSmall: {
    fontFamily: FONT.family,
    fontSize: FONT.body,
    color: PALETTE.yellowBright,
    textAlign: 'center',
  },
});
