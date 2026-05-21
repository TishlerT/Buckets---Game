import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { PALETTE } from '@/constants/theme';

interface HudPanelProps extends ViewProps {
  /** Inner padding around children. */
  innerPadding?: number;
  /** Override border thickness. Default 3 (chunky pixel border). */
  borderWidth?: number;
}

/**
 * The chunky pixel-border HUD panel used everywhere in Reference Image 2.
 *
 * Spec: "#0A0A0A background, #F5C518 border, no rounded corners,
 *        Press Start 2P font, no modern flat design."
 *
 * Children supply their own text styling; this component just frames them.
 */
export const HudPanel: React.FC<HudPanelProps> = ({
  innerPadding = 6,
  borderWidth = 3,
  style,
  children,
  ...rest
}) => (
  <View
    {...rest}
    style={[
      styles.panel,
      {
        borderWidth,
        padding: innerPadding,
      },
      style,
    ]}
  >
    {children}
  </View>
);

const styles = StyleSheet.create({
  panel: {
    backgroundColor: PALETTE.hudPanel,
    borderColor: PALETTE.hudPanelBorder,
    borderRadius: 0,
  },
});
