import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HudPanel } from './HudPanel';
import { FONT, PALETTE } from '@/constants/theme';
import { CONFIG } from '@/constants/gameConfig';

interface BucketsHudProps {
  /** P1 / home / active-player score. */
  p1Score: number;
  /** P2 / opponent / guest score. */
  p2Score: number;
  /** Total match time remaining in seconds (drives top-center TIME). */
  matchTimeSec: number;
  /** Per-shot shot-clock remaining in seconds (bottom-left). */
  shotClockSec: number;
  /** Per-turn timer in seconds (top-right CLOCK). */
  turnClockSec: number;
  /** Current action label under the center scoreboard (e.g. "3PT ATTEMPT"). */
  actionLabel?: string;
  /** Active player label for scoring (defaults to "PLAYER 1"). */
  p1Label?: string;
  p2Label?: string;
}

/**
 * Top + bottom HUD overlay built to match Reference Image 2 exactly:
 *
 *  ┌───────────────┐                ┌────────┐
 *  │ PLAYER 1: 12  │  ┌───────────┐ │ CLOCK  │
 *  │ P2 SCORE: 8   │  │HOME TIME G│ │   24   │
 *  │ SHOT 0:14     │  │  12 1:14 8│ └────────┘
 *  └───────────────┘  │3PT ATTEMPT│
 *                     └───────────┘
 *
 *  ┌──────────┐                      SHOT POWER METER
 *  │SHOT CLOCK│                      ┌──────────┐
 *  │   24     │                      │██████░░░░│
 *  └──────────┘                      └──────────┘
 *
 * Scores pop (scale 1.3x then snap back) when they change — that
 * "score pop" lives here so any place using BucketsHud gets it for free.
 */
export const BucketsHud: React.FC<BucketsHudProps> = ({
  p1Score,
  p2Score,
  matchTimeSec,
  shotClockSec,
  turnClockSec,
  actionLabel = '3PT ATTEMPT',
  p1Label = 'PLAYER 1',
  p2Label = 'P2',
}) => {
  return (
    <View style={styles.root} pointerEvents="box-none">
      {/* ----- TOP ROW ----- */}
      <SafeAreaView edges={['top']} style={styles.topRow} pointerEvents="box-none">
        {/* TOP LEFT — scores + per-shot countdown */}
        <HudPanel innerPadding={8} style={styles.topLeftPanel}>
          <ScoreRow label={`${p1Label}:`} value={p1Score} highlight />
          <ScoreRow label={`${p2Label} SCORE:`} value={p2Score} />
          <View style={styles.spacer} />
          <View style={styles.shotMiniRow}>
            <Text style={styles.smallLabel}>SHOT</Text>
            <Text style={styles.smallValue}>{formatMmSs(shotClockSec)}</Text>
          </View>
        </HudPanel>

        {/* TOP CENTER — home / time / guest + action label */}
        <HudPanel innerPadding={6} style={styles.topCenterPanel}>
          <View style={styles.centerScoreRow}>
            <View style={styles.centerCol}>
              <Text style={styles.smallLabel}>HOME</Text>
              <Text style={styles.centerScoreDigit}>{pad2(p1Score)}</Text>
            </View>
            <View style={styles.centerCol}>
              <Text style={styles.smallLabel}>TIME</Text>
              <Text style={styles.centerTimeDigit}>{formatMmSs(matchTimeSec)}</Text>
            </View>
            <View style={styles.centerCol}>
              <Text style={styles.smallLabel}>GUEST</Text>
              <Text style={styles.centerScoreDigit}>{pad2(p2Score)}</Text>
            </View>
          </View>
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </HudPanel>

        {/* TOP RIGHT — large red clock */}
        <HudPanel innerPadding={8} style={styles.topRightPanel}>
          <Text style={[styles.smallLabel, styles.clockLabel]}>CLOCK</Text>
          <Text
            style={[
              styles.bigRedDigit,
              turnClockSec <= 5 ? styles.bigRedDigitUrgent : undefined,
            ]}
          >
            {Math.max(0, Math.ceil(turnClockSec))}
          </Text>
        </HudPanel>
      </SafeAreaView>

      {/* ----- BOTTOM ROW (left half only — power meter rendered separately) ----- */}
      <SafeAreaView edges={['bottom']} style={styles.bottomLeftWrap} pointerEvents="box-none">
        <HudPanel innerPadding={6} style={styles.bottomLeftPanel}>
          <Text style={styles.smallLabel}>SHOT CLOCK</Text>
          <Text
            style={[
              styles.bigRedDigit,
              shotClockSec <= 5 ? styles.bigRedDigitUrgent : undefined,
            ]}
          >
            {Math.max(0, Math.ceil(shotClockSec))}
          </Text>
        </HudPanel>
      </SafeAreaView>
    </View>
  );
};

/**
 * A single "LABEL: value" row inside the top-left panel. Value pops on
 * change (scale 1.3 → 1) so points scored register visually.
 */
const ScoreRow: React.FC<{
  label: string;
  value: number;
  highlight?: boolean;
}> = ({ label, value, highlight }) => {
  const scale = useSharedValue(1);
  const prev = React.useRef(value);
  React.useEffect(() => {
    if (value !== prev.current) {
      prev.current = value;
      scale.value = withSequence(
        withTiming(CONFIG.SCORE_POP_SCALE, { duration: 90, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 8, stiffness: 220 })
      );
    }
  }, [value, scale]);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <View style={styles.scoreRow}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <Animated.Text
        style={[
          styles.scoreValue,
          highlight ? styles.scoreValueHighlight : undefined,
          animStyle,
        ]}
      >
        {value}
      </Animated.Text>
    </View>
  );
};

// ---------- helpers ----------

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatMmSs(totalSec: number): string {
  const s = Math.max(0, Math.ceil(totalSec));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  // ---- top row ----
  topRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 6,
    gap: 8,
  },
  topLeftPanel: {
    minWidth: 130,
  },
  topCenterPanel: {
    flexGrow: 0,
    flexShrink: 1,
  },
  topRightPanel: {
    minWidth: 70,
    alignItems: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  spacer: { height: 4 },
  scoreLabel: {
    fontFamily: FONT.family,
    fontSize: FONT.tiny,
    color: PALETTE.lineWhite,
    letterSpacing: 1,
  },
  scoreValue: {
    fontFamily: FONT.family,
    fontSize: FONT.small,
    color: PALETTE.lineWhite,
    letterSpacing: 1,
  },
  scoreValueHighlight: {
    color: PALETTE.hudPanelBorder,
  },
  shotMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  smallLabel: {
    fontFamily: FONT.family,
    fontSize: FONT.tiny,
    color: PALETTE.lineWhite,
    letterSpacing: 1,
  },
  smallValue: {
    fontFamily: FONT.family,
    fontSize: FONT.small,
    color: PALETTE.redHot,
  },
  // top-center scoreboard
  centerScoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  centerCol: {
    alignItems: 'center',
    minWidth: 36,
  },
  centerScoreDigit: {
    fontFamily: FONT.family,
    fontSize: FONT.titleM,
    color: PALETTE.hudPanelBorder,
    letterSpacing: 1,
  },
  centerTimeDigit: {
    fontFamily: FONT.family,
    fontSize: FONT.body,
    color: PALETTE.redHot,
    letterSpacing: 1,
  },
  actionLabel: {
    fontFamily: FONT.family,
    fontSize: FONT.tiny,
    color: PALETTE.hudPanelBorder,
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 6,
  },
  // top-right clock
  clockLabel: {
    color: PALETTE.hudPanelBorder,
    marginBottom: 4,
  },
  bigRedDigit: {
    fontFamily: FONT.family,
    fontSize: FONT.titleL,
    color: PALETTE.redHot,
    letterSpacing: 1,
    textAlign: 'center',
  },
  bigRedDigitUrgent: {
    color: PALETTE.yellowBright,
  },
  // bottom-left
  bottomLeftWrap: {
    position: 'absolute',
    left: 10,
    bottom: 10,
  },
  bottomLeftPanel: {
    alignItems: 'center',
    minWidth: 100,
  },
});
