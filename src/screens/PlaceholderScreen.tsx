import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PixelButton } from '@/components/PixelButton';
import { FONT, PALETTE, SPACING } from '@/constants/theme';

interface PlaceholderProps {
  title: string;
  description?: string;
  onBack: () => void;
}

/**
 * Stub screen used during scaffolding for routes whose real implementation
 * is built in a later phase. Real screens REPLACE this when their phase
 * lands; this component should not survive past Phase 4.
 */
export const PlaceholderScreen: React.FC<PlaceholderProps> = ({ title, description, onBack }) => (
  <View style={styles.root}>
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.body}>{description}</Text> : null}
      <View style={{ height: SPACING.xl }} />
      <PixelButton label="BACK" color={PALETTE.fog} onPress={onBack} testID="placeholder.back" />
    </SafeAreaView>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.black },
  safe: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  title: {
    fontFamily: FONT.family,
    fontSize: FONT.titleL,
    color: PALETTE.orangeBall,
    marginBottom: SPACING.md,
    letterSpacing: 2,
    textAlign: 'center',
  },
  body: {
    fontFamily: FONT.family,
    fontSize: FONT.small,
    color: PALETTE.lineWhite,
    textAlign: 'center',
    lineHeight: 18,
  },
});
