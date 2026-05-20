import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BouncingBall } from '@/components/BouncingBall';
import { PixelButton } from '@/components/PixelButton';
import { PixelBorderPanel } from '@/components/PixelBorderPanel';
import { useProgression } from '@/context/ProgressionContext';
import { xpProgressInLevel } from '@/game/progression';
import { FONT, PALETTE, SPACING } from '@/constants/theme';
import { RootStackParamList } from '@/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const DEFENDER_TO_LEVEL: Record<string, 1 | 2 | 3 | 4> = {
  grandpa: 1, recLeague: 2, pro: 3, alien: 4,
};
const LEVEL_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: 'GRANDPA', 2: 'REC LEAGUE', 3: 'PRO', 4: 'ALIEN',
};

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { progression, loading } = useProgression();
  const xpInfo = xpProgressInLevel(progression.totalXp);
  const xpPct = Math.min(100, Math.round((xpInfo.xpInLevel / Math.max(1, xpInfo.xpForNextLevel)) * 100));
  const selectedLevel = DEFENDER_TO_LEVEL[progression.selected.defender] ?? 1;
  return (
  <View style={styles.root}>
    {/* decorative background bouncing balls */}
    <BouncingBall xRatio={0.15} size={48} amplitude={120} durationMs={1100} bottomOffset={40} />
    <BouncingBall xRatio={0.5} size={72} amplitude={180} durationMs={950} bottomOffset={60} />
    <BouncingBall xRatio={0.85} size={40} amplitude={100} durationMs={1300} bottomOffset={30} />

    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.titleWrap}>
        <Text style={styles.title}>BUCKETS</Text>
        <Text style={styles.subtitle}>8-bit hoops • turn-based</Text>
        {!loading && (
          <View style={styles.xpRow}>
            <PixelBorderPanel innerPadding={6} color={PALETTE.midnight}>
              <View style={styles.xpInner}>
                <Text style={styles.xpLevelLabel}>LV {xpInfo.level}</Text>
                <View style={styles.xpBarTrack}>
                  <View style={[styles.xpBarFill, { width: `${xpPct}%` }]} />
                </View>
                <Text style={styles.xpDetailLabel}>
                  {xpInfo.xpInLevel}/{xpInfo.xpForNextLevel}
                </Text>
              </View>
            </PixelBorderPanel>
          </View>
        )}
      </View>

      <View style={styles.buttons}>
        <PixelButton
          label={`PLAY  •  ${LEVEL_LABELS[selectedLevel]}`}
          color={PALETTE.greenGo}
          testID="home.play"
          onPress={() =>
            navigation.navigate('Game', { mode: 'vsBot', defenderLevel: selectedLevel })
          }
        />
        <View style={{ height: SPACING.md }} />
        <PixelButton
          label="LOCAL 2P"
          color={PALETTE.blueIce}
          testID="home.local2p"
          onPress={() =>
            navigation.navigate('Game', { mode: 'local2P', defenderLevel: selectedLevel })
          }
        />
        <View style={{ height: SPACING.md }} />
        <PixelButton
          label="PROGRESSION"
          color={PALETTE.yellowBright}
          testID="home.progression"
          onPress={() => navigation.navigate('Progression')}
        />
        <View style={{ height: SPACING.md }} />
        <PixelButton
          label="SETTINGS"
          color={PALETTE.fog}
          size="md"
          testID="home.settings"
          onPress={() => navigation.navigate('Settings')}
        />
      </View>

      <Text style={styles.footer}>v0.1 • most threes wins</Text>
    </SafeAreaView>
  </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.midnight, overflow: 'hidden' },
  safe: { flex: 1, justifyContent: 'space-between', paddingHorizontal: SPACING.lg },
  titleWrap: { alignItems: 'center', marginTop: SPACING.xl },
  title: {
    fontFamily: FONT.family,
    fontSize: FONT.titleXL,
    color: PALETTE.orangeBall,
    letterSpacing: 4,
    textShadowColor: PALETTE.black,
    textShadowOffset: { width: 4, height: 4 },
    textShadowRadius: 0,
  },
  subtitle: {
    fontFamily: FONT.family,
    fontSize: FONT.small,
    color: PALETTE.lineWhite,
    marginTop: SPACING.md,
    letterSpacing: 1,
  },
  xpRow: {
    marginTop: SPACING.md,
    minWidth: 220,
  },
  xpInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  xpLevelLabel: {
    fontFamily: FONT.family,
    fontSize: FONT.tiny,
    color: PALETTE.yellowBright,
    letterSpacing: 1,
    marginRight: SPACING.sm,
  },
  xpBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: PALETTE.shadow,
    borderWidth: 1,
    borderColor: PALETTE.black,
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: PALETTE.greenGo,
  },
  xpDetailLabel: {
    fontFamily: FONT.family,
    fontSize: FONT.tiny,
    color: PALETTE.fog,
    marginLeft: SPACING.sm,
  },
  buttons: {
    width: '100%',
    alignItems: 'stretch',
    marginBottom: SPACING.xxl,
  },
  footer: {
    fontFamily: FONT.family,
    fontSize: FONT.tiny,
    color: PALETTE.fog,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
});
