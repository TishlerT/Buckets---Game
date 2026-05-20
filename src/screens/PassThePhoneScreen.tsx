import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Player } from '@/game/gameLoop';
import { PASS_PHONE_COUNTDOWN_SEC } from '@/constants/gameConfig';
import { FONT, PALETTE, SPACING } from '@/constants/theme';
import { PixelButton } from '@/components/PixelButton';

interface Props {
  nextPlayer: Player;
  onDone: () => void;
}

export const PassThePhoneScreen: React.FC<Props> = ({ nextPlayer, onDone }) => {
  const [count, setCount] = React.useState(PASS_PHONE_COUNTDOWN_SEC);
  const [readyTapped, setReadyTapped] = React.useState(false);

  React.useEffect(() => {
    if (!readyTapped) return;
    if (count <= 0) {
      onDone();
      return;
    }
    const id = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [count, onDone, readyTapped]);

  const playerLabel = nextPlayer === 'P1' ? 'PLAYER 1' : nextPlayer === 'P2' ? 'PLAYER 2' : 'BOT';

  return (
    <View style={styles.root}>
      <Text style={styles.bigText}>PASS THE PHONE</Text>
      <Text style={styles.smallText}>{playerLabel}'S TURN</Text>
      {!readyTapped ? (
        <PixelButton
          label="READY"
          color={PALETTE.greenGo}
          onPress={() => setReadyTapped(true)}
        />
      ) : (
        <Text style={styles.countdownText}>{count}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PALETTE.midnight,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  bigText: {
    fontFamily: FONT.family,
    fontSize: FONT.titleM,
    color: PALETTE.yellowBright,
    letterSpacing: 2,
    marginBottom: SPACING.lg,
  },
  smallText: {
    fontFamily: FONT.family,
    fontSize: FONT.body,
    color: PALETTE.lineWhite,
    letterSpacing: 2,
    marginBottom: SPACING.xl,
  },
  countdownText: {
    fontFamily: FONT.family,
    fontSize: 80,
    color: PALETTE.orangeBall,
    letterSpacing: 4,
    marginTop: SPACING.lg,
  },
});
