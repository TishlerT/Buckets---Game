import React from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CourtBackground } from '@/components/CourtBackground';
import { ShooterSprite } from '@/components/ShooterSprite';
import { BasketSprite } from '@/components/BasketSprite';
import { BallSprite } from '@/components/BallSprite';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { TimingFlash } from '@/components/TimingFlash';
import { PixelButton } from '@/components/PixelButton';
import { PixelBorderPanel } from '@/components/PixelBorderPanel';
import { HighlightSnapshot, loopDurationMs } from '@/game/highlights';
import { useProgression } from '@/context/ProgressionContext';
import { FONT, PALETTE, SPACING } from '@/constants/theme';

interface Props {
  highlight: HighlightSnapshot;
  onDone: () => void;
}

const DEFENDER_LEVEL_TO_VARIANT = {
  1: 'grandpa', 2: 'recLeague', 3: 'pro', 4: 'alien',
} as const;

/**
 * Replays the captured highlight as a 3-second looping pixel animation.
 *
 * For perfect_block: shooter cycles idle → wind-up → release with the
 * timing flash + confetti at the release moment.
 * For contested_make: ball flies up over the basket with confetti.
 *
 * Provides Save-to-Camera-Roll (PNG via expo-media-library) and Share
 * (system share sheet via expo-sharing) actions.
 */
export const HighlightScreen: React.FC<Props> = ({ highlight, onDone }) => {
  const stageRef = React.useRef<View>(null);
  const [busy, setBusy] = React.useState<'idle' | 'saving' | 'sharing'>('idle');
  const [tick, setTick] = React.useState(0);

  // Loop timer drives the animation. tick counts at 30fps for the loop length.
  React.useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 33);
    return () => clearInterval(id);
  }, []);

  // Map tick → 0..1 phase within the loop.
  const loopMs = loopDurationMs();
  const phase = ((tick * 33) % loopMs) / loopMs;

  // Determine the visual state for this phase.
  // 0.0 - 0.4 : shooter idle
  // 0.4 - 0.6 : shooter wind-up
  // 0.6 - 0.7 : release + flash
  // 0.7 - 1.0 : ball arc / confetti
  const inWindup = phase >= 0.4 && phase < 0.6;
  const inRelease = phase >= 0.6 && phase < 0.7;
  const inResolve = phase >= 0.7;
  const flashTrigger = inRelease ? Math.floor(tick / 30) : 0;

  // Confetti fires once per loop at the release.
  const confettiTrigger = Math.floor(((tick * 33) % loopMs) / 100) === 21 ? Math.floor((tick * 33) / loopMs) + 1 : 0;

  const { progression } = useProgression();
  const variant = DEFENDER_LEVEL_TO_VARIANT[highlight.defenderLevel] ?? progression.selected.defender;
  const court = progression.selected.court;

  const captureAsPng = async (): Promise<string | null> => {
    if (!stageRef.current) return null;
    try {
      const uri = await captureRef(stageRef.current, {
        format: 'png',
        quality: 1,
      });
      return uri;
    } catch {
      return null;
    }
  };

  const onSave = async () => {
    if (busy !== 'idle') return;
    setBusy('saving');
    try {
      const uri = await captureAsPng();
      if (!uri) throw new Error('capture failed');
      // Skip media-library on web (it isn't supported) — sharing only.
      if (Platform.OS !== 'web') {
        const perm = await MediaLibrary.requestPermissionsAsync();
        if (!perm.granted) throw new Error('camera roll permission denied');
        await MediaLibrary.saveToLibraryAsync(uri);
        Alert.alert('Saved!', 'Highlight saved to your camera roll.');
      } else {
        Alert.alert('Saved', 'On web, downloading the screenshot directly is browser-dependent.');
      }
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : String(err));
    } finally {
      setBusy('idle');
    }
  };

  const onShare = async () => {
    if (busy !== 'idle') return;
    setBusy('sharing');
    try {
      const uri = await captureAsPng();
      if (!uri) throw new Error('capture failed');
      const can = await Sharing.isAvailableAsync();
      if (!can) throw new Error('Sharing not available on this device.');
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'BUCKETS Highlight' });
    } catch (err) {
      Alert.alert('Share failed', err instanceof Error ? err.message : String(err));
    } finally {
      setBusy('idle');
    }
  };

  // Layout: court fills, basket up top, shooter beyond arc; same as defense
  // perspective so the moment looks like the actual gameplay.
  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        <Text style={styles.headline}>HIGHLIGHT!</Text>
        <Text style={styles.subhead}>
          {highlight.kind === 'perfect_block' ? 'PERFECT BLOCK' : `CONTESTED +${highlight.points}`}
        </Text>

        <View style={styles.stageWrap}>
          <View ref={stageRef} collapsable={false} style={styles.stage}>
            <CourtBackground width={300} height={420} court={court} perspective="defense" />
            <View style={styles.shooterWrap}>
              <ShooterSprite
                size={100}
                frame={inRelease || inResolve ? 2 : inWindup ? 1 : 0}
                variant={variant}
                flashing={inRelease}
              />
            </View>
            <View style={styles.basketWrap}>
              <BasketSprite size={120} />
            </View>
            {/* Ball during resolve phase */}
            {inResolve && (
              <View
                style={[
                  styles.ballWrap,
                  // animate the ball from shooter to basket linearly during resolve
                  {
                    transform: [
                      { translateX: (300 / 2) - 16 + Math.sin((phase - 0.7) * Math.PI * 2) * 12 },
                      { translateY: 80 + (phase - 0.7) * 220 },
                      { rotate: `${(phase - 0.7) * 720}deg` },
                    ],
                  },
                ]}
                pointerEvents="none"
              >
                <BallSprite size={32} />
              </View>
            )}
            <TimingFlash trigger={flashTrigger} size={200} />
            <ConfettiBurst trigger={confettiTrigger} cx={150} cy={200} count={20} />
            {/* Watermark at bottom */}
            <View style={styles.watermark} pointerEvents="none">
              <Text style={styles.watermarkText}>BUCKETS</Text>
              <Text style={styles.watermarkScore}>
                {highlight.playerTotal} – {highlight.oppTotal}
              </Text>
            </View>
          </View>
        </View>

        <PixelBorderPanel innerPadding={SPACING.sm} color={PALETTE.midnight}>
          <View style={styles.buttonRow}>
            <PixelButton
              label="SAVE"
              color={PALETTE.greenGo}
              size="md"
              onPress={onSave}
              disabled={busy !== 'idle'}
            />
            <View style={{ width: SPACING.sm }} />
            <PixelButton
              label="SHARE"
              color={PALETTE.blueIce}
              size="md"
              onPress={onShare}
              disabled={busy !== 'idle'}
            />
            <View style={{ width: SPACING.sm }} />
            <PixelButton
              label="DONE"
              color={PALETTE.fog}
              size="md"
              onPress={onDone}
              disabled={busy !== 'idle'}
            />
          </View>
        </PixelBorderPanel>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.black },
  safe: { flex: 1, padding: SPACING.lg, alignItems: 'center' },
  headline: {
    fontFamily: FONT.family,
    fontSize: FONT.titleXL,
    color: PALETTE.yellowBright,
    letterSpacing: 4,
    textShadowColor: PALETTE.black,
    textShadowOffset: { width: 4, height: 4 },
    textShadowRadius: 0,
  },
  subhead: {
    fontFamily: FONT.family,
    fontSize: FONT.body,
    color: PALETTE.lineWhite,
    letterSpacing: 2,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  stageWrap: {
    width: 300,
    height: 420,
    marginBottom: SPACING.lg,
    borderWidth: 4,
    borderColor: PALETTE.black,
    overflow: 'hidden',
  },
  stage: {
    width: 300,
    height: 420,
    backgroundColor: PALETTE.black,
  },
  shooterWrap: {
    position: 'absolute',
    top: 60,
    left: 100,
  },
  basketWrap: {
    position: 'absolute',
    top: 250,
    left: 90,
  },
  ballWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  watermark: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  watermarkText: {
    fontFamily: FONT.family,
    fontSize: FONT.body,
    color: PALETTE.orangeBall,
    letterSpacing: 2,
    textShadowColor: PALETTE.black,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  watermarkScore: {
    fontFamily: FONT.family,
    fontSize: FONT.tiny,
    color: PALETTE.lineWhite,
    letterSpacing: 1,
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
