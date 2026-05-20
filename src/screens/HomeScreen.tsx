import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BouncingBall } from '@/components/BouncingBall';
import { PixelButton } from '@/components/PixelButton';
import { FONT, PALETTE, SPACING } from '@/constants/theme';
import { RootStackParamList } from '@/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC<Props> = ({ navigation }) => (
  <View style={styles.root}>
    {/* decorative background bouncing balls */}
    <BouncingBall xRatio={0.15} size={48} amplitude={120} durationMs={1100} bottomOffset={40} />
    <BouncingBall xRatio={0.5} size={72} amplitude={180} durationMs={950} bottomOffset={60} />
    <BouncingBall xRatio={0.85} size={40} amplitude={100} durationMs={1300} bottomOffset={30} />

    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.titleWrap}>
        <Text style={styles.title}>BUCKETS</Text>
        <Text style={styles.subtitle}>8-bit hoops • turn-based</Text>
      </View>

      <View style={styles.buttons}>
        <PixelButton
          label="PLAY"
          color={PALETTE.greenGo}
          testID="home.play"
          onPress={() =>
            navigation.navigate('Game', { mode: 'vsBot', defenderLevel: 1 })
          }
        />
        <View style={{ height: SPACING.md }} />
        <PixelButton
          label="LOCAL 2P"
          color={PALETTE.blueIce}
          testID="home.local2p"
          onPress={() =>
            navigation.navigate('Game', { mode: 'local2P', defenderLevel: 1 })
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
