import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PixelButton } from '@/components/PixelButton';
import { PixelBorderPanel } from '@/components/PixelBorderPanel';
import { useSettings } from '@/context/SettingsContext';
import { useProgression } from '@/context/ProgressionContext';
import { applyMute } from '@/game/audio';
import { FONT, PALETTE, SPACING } from '@/constants/theme';
import { RootStackParamList } from '@/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { settings, setMuted, setHapticsEnabled } = useSettings();
  const { reset } = useProgression();
  const [confirmingReset, setConfirmingReset] = React.useState(false);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        <Text style={styles.title}>SETTINGS</Text>

        <PixelBorderPanel innerPadding={SPACING.md}>
          <Row
            label="MUTE AUDIO"
            value={settings.muted}
            onChange={(v) => {
              setMuted(v);
              applyMute(v);
            }}
          />
          <Row
            label="HAPTICS"
            value={settings.hapticsEnabled}
            onChange={setHapticsEnabled}
          />
        </PixelBorderPanel>

        <View style={{ height: SPACING.lg }} />

        <PixelBorderPanel innerPadding={SPACING.md} color={PALETTE.shadow}>
          <Text style={styles.sectionLabel}>RESET PROGRESSION</Text>
          <Text style={styles.sectionHint}>
            Wipes XP, unlocks, and selections. This cannot be undone.
          </Text>
          <View style={{ height: SPACING.sm }} />
          {confirmingReset ? (
            <View style={styles.row}>
              <PixelButton
                label="CONFIRM"
                color={PALETTE.redHot}
                size="sm"
                onPress={async () => {
                  await reset();
                  setConfirmingReset(false);
                }}
              />
              <View style={{ width: SPACING.sm }} />
              <PixelButton
                label="CANCEL"
                color={PALETTE.fog}
                size="sm"
                onPress={() => setConfirmingReset(false)}
              />
            </View>
          ) : (
            <PixelButton
              label="RESET"
              color={PALETTE.redHot}
              size="sm"
              onPress={() => setConfirmingReset(true)}
            />
          )}
        </PixelBorderPanel>

        <View style={{ flex: 1 }} />

        <PixelButton label="BACK" color={PALETTE.fog} onPress={() => navigation.goBack()} />
      </SafeAreaView>
    </View>
  );
};

interface RowProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}
const Row: React.FC<RowProps> = ({ label, value, onChange }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <View style={{ flex: 1 }} />
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: PALETTE.shadow, true: PALETTE.greenGo }}
      thumbColor={PALETTE.lineWhite}
    />
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.midnight },
  safe: { flex: 1, padding: SPACING.lg },
  title: {
    fontFamily: FONT.family,
    fontSize: FONT.titleL,
    color: PALETTE.orangeBall,
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    textShadowColor: PALETTE.black,
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  rowLabel: {
    fontFamily: FONT.family,
    fontSize: FONT.body,
    color: PALETTE.lineWhite,
    letterSpacing: 1,
  },
  sectionLabel: {
    fontFamily: FONT.family,
    fontSize: FONT.body,
    color: PALETTE.lineWhite,
    letterSpacing: 1,
  },
  sectionHint: {
    fontFamily: FONT.family,
    fontSize: FONT.tiny,
    color: PALETTE.fog,
    marginTop: 6,
  },
});
