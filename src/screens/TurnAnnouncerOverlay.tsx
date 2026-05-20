import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Player, TurnRole } from '@/game/gameLoop';
import { TURN_ANNOUNCE_MS } from '@/constants/gameConfig';
import { FONT, PALETTE, SPACING } from '@/constants/theme';

interface TurnAnnouncerOverlayProps {
  player: Player;
  role: TurnRole;
  /** Called when the announce duration elapses. */
  onDone: () => void;
}

export const TurnAnnouncerOverlay: React.FC<TurnAnnouncerOverlayProps> = ({
  player,
  role,
  onDone,
}) => {
  React.useEffect(() => {
    const id = setTimeout(onDone, TURN_ANNOUNCE_MS);
    return () => clearTimeout(id);
  }, [onDone]);

  const playerLabel = player === 'P1' ? 'PLAYER 1' : player === 'P2' ? 'PLAYER 2' : 'BOT';
  const roleColor = role === 'OFFENSE' ? PALETTE.greenGo : PALETTE.blueIce;

  return (
    <View style={styles.root} pointerEvents="none">
      <Text style={styles.smallText}>YOUR TURN —</Text>
      <Text style={[styles.bigText, { color: roleColor }]}>{role}</Text>
      <Text style={styles.smallText}>{playerLabel}</Text>
      <Text style={styles.smallTextDim}>
        {role === 'OFFENSE' ? 'SLINGSHOT THE 3' : 'SWIPE UP TO BLOCK'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 13, 26, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  smallText: {
    fontFamily: FONT.family,
    fontSize: FONT.body,
    color: PALETTE.lineWhite,
    letterSpacing: 2,
    marginVertical: SPACING.md,
  },
  smallTextDim: {
    fontFamily: FONT.family,
    fontSize: FONT.small,
    color: PALETTE.fog,
    letterSpacing: 1,
    marginTop: SPACING.sm,
  },
  bigText: {
    fontFamily: FONT.family,
    fontSize: FONT.titleXL,
    letterSpacing: 4,
  },
});
