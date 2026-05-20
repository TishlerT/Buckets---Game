import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PixelButton } from './PixelButton';
import { PixelBorderPanel } from './PixelBorderPanel';
import { FONT, PALETTE, SPACING } from '@/constants/theme';

interface PauseMenuProps {
  onResume: () => void;
  onQuit: () => void;
  /** Optional badge text (e.g. "PAUSED" — defaults to that). */
  title?: string;
}

/**
 * Full-screen pause overlay shown when the player taps the pause button
 * during a match. Tapping outside the menu also resumes the game.
 */
export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onQuit,
  title = 'PAUSED',
}) => (
  <Pressable style={styles.scrim} onPress={onResume} accessibilityRole="button">
    <Pressable style={styles.panelWrap} onPress={() => {}}>
      <PixelBorderPanel innerPadding={SPACING.lg}>
        <Text style={styles.title}>{title}</Text>
        <View style={{ height: SPACING.md }} />
        <PixelButton label="RESUME" color={PALETTE.greenGo} onPress={onResume} />
        <View style={{ height: SPACING.sm }} />
        <PixelButton label="QUIT TO MENU" color={PALETTE.redHot} onPress={onQuit} />
      </PixelBorderPanel>
    </Pressable>
  </Pressable>
);

/**
 * Small circular pause-button rendered top-center between scoreboards.
 * Hidden by default; OffenseScreen and DefenseScreen render it when in
 * a game session (matchScores are provided).
 */
export const PauseButton: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <Pressable
    onPress={onPress}
    accessibilityLabel="PAUSE"
    accessibilityRole="button"
    style={styles.pauseBtn}
  >
    <View style={styles.pauseBar} />
    <View style={styles.pauseBar} />
  </Pressable>
);

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  panelWrap: {
    minWidth: 240,
  },
  title: {
    fontFamily: FONT.family,
    fontSize: FONT.titleM,
    color: PALETTE.yellowBright,
    letterSpacing: 2,
    textAlign: 'center',
  },
  pauseBtn: {
    width: 32,
    height: 32,
    borderWidth: 3,
    borderColor: PALETTE.black,
    backgroundColor: PALETTE.midnight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseBar: {
    width: 4,
    height: 14,
    backgroundColor: PALETTE.lineWhite,
    marginHorizontal: 2,
  },
});
