import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { BORDER, FONT, PALETTE, SPACING } from '@/constants/theme';

interface PixelButtonProps {
  label: string;
  onPress: () => void;
  color?: string;
  textColor?: string;
  disabled?: boolean;
  width?: number | `${number}%`;
  testID?: string;
  /** Smaller variant for inline / secondary actions. */
  size?: 'lg' | 'md' | 'sm';
}

/**
 * Chunky pixel button — flat top, hard 1-pixel-style border, no rounded corners.
 * Pressing it visually "presses in" by translating down a pixel and removing
 * the offset shadow (mimicking NES-era button mechanics).
 */
export const PixelButton: React.FC<PixelButtonProps> = ({
  label,
  onPress,
  color = PALETTE.yellowBright,
  textColor = PALETTE.black,
  disabled = false,
  width,
  testID,
  size = 'lg',
}) => {
  const [pressed, setPressed] = React.useState(false);

  const padV = size === 'lg' ? SPACING.md : size === 'md' ? SPACING.sm : SPACING.xs;
  const padH = size === 'lg' ? SPACING.lg : size === 'md' ? SPACING.md : SPACING.sm;
  const fontSize = size === 'lg' ? FONT.body : size === 'md' ? FONT.small : FONT.tiny;

  const wrapperStyle: ViewStyle = {
    width: width ?? undefined,
    opacity: disabled ? 0.5 : 1,
  };

  return (
    <View style={wrapperStyle}>
      {/* hard offset shadow underneath for that chunky pixel feel */}
      {!pressed && !disabled && (
        <View
          style={[
            styles.shadow,
            { backgroundColor: PALETTE.black, paddingVertical: padV, paddingHorizontal: padH },
          ]}
        >
          <Text style={[styles.label, { fontSize, color: 'transparent' }]}>{label}</Text>
        </View>
      )}
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={[
          styles.button,
          {
            backgroundColor: color,
            borderColor: PALETTE.black,
            paddingVertical: padV,
            paddingHorizontal: padH,
            transform: pressed ? [{ translateX: 4 }, { translateY: 4 }] : undefined,
          },
        ]}
      >
        <Text style={[styles.label, { color: textColor, fontSize }]}>{label}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  shadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    borderWidth: BORDER.thick,
    borderColor: PALETTE.black,
  },
  button: {
    borderWidth: BORDER.thick,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FONT.family,
    letterSpacing: 1,
    textAlign: 'center',
  },
});
