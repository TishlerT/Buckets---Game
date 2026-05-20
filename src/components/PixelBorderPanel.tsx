import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { BORDER, PALETTE } from '@/constants/theme';

interface PixelBorderPanelProps extends ViewProps {
  color?: string;
  borderColor?: string;
  innerPadding?: number;
}

/**
 * Chunky pixel-bordered panel — used as a frame for menus, scoreboards,
 * pause dialogs, etc. The double-border (outer dark + inner light) gives
 * a sprite-sheet HUD look at any DPI without needing actual border images.
 */
export const PixelBorderPanel: React.FC<PixelBorderPanelProps> = ({
  color = PALETTE.midnight,
  borderColor = PALETTE.black,
  innerPadding = 12,
  children,
  style,
  ...rest
}) => (
  <View
    {...rest}
    style={[
      styles.outer,
      { borderColor, backgroundColor: borderColor, padding: BORDER.thin },
      style,
    ]}
  >
    <View
      style={[
        styles.inner,
        { borderColor: PALETTE.fog, backgroundColor: color, padding: innerPadding },
      ]}
    >
      {children}
    </View>
  </View>
);

const styles = StyleSheet.create({
  outer: { borderWidth: BORDER.thick },
  inner: { borderWidth: BORDER.thin },
});
