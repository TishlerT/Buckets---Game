import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { SharedValue } from 'react-native-reanimated';
import { BORDER, PALETTE, SPACING } from '@/constants/theme';

interface PowerMeterProps {
  /** Power 0..1 driven on the UI thread. */
  power: SharedValue<number>;
  width?: number;
  height?: number;
}

/**
 * Vertical pixel power meter with 10 segments. Lower segments are green,
 * upper segments turn yellow then red — communicating "you've pulled too
 * hard" without text.
 */
export const PowerMeter: React.FC<PowerMeterProps> = ({
  power,
  width = 28,
  height = 220,
}) => {
  const SEGMENTS = 10;
  const segH = (height - SPACING.xs) / SEGMENTS - 2;

  return (
    <View style={[styles.frame, { width, height }]}>
      {Array.from({ length: SEGMENTS }).map((_, i) => {
        const idxFromBottom = SEGMENTS - 1 - i;
        const fill =
          idxFromBottom < 4 ? PALETTE.greenGo : idxFromBottom < 7 ? PALETTE.yellowBright : PALETTE.redHot;
        return (
          <PowerSegment
            key={i}
            order={idxFromBottom}
            total={SEGMENTS}
            power={power}
            color={fill}
            height={segH}
          />
        );
      })}
    </View>
  );
};

interface PowerSegmentProps {
  order: number;
  total: number;
  power: SharedValue<number>;
  color: string;
  height: number;
}

const PowerSegment: React.FC<PowerSegmentProps> = ({ order, total, power, color, height }) => {
  // Each segment lights up when power >= (order + 0.5) / total.
  const threshold = (order + 0.5) / total;
  const animStyle = useAnimatedStyle(() => ({
    backgroundColor: power.value >= threshold ? color : PALETTE.shadow,
    opacity: power.value >= threshold ? 1 : 0.4,
  }));
  return <Animated.View style={[styles.segment, { height }, animStyle]} />;
};

const styles = StyleSheet.create({
  frame: {
    borderWidth: BORDER.thick,
    borderColor: PALETTE.black,
    backgroundColor: PALETTE.midnight,
    padding: 2,
    justifyContent: 'space-between',
  },
  segment: {
    borderWidth: 1,
    borderColor: PALETTE.black,
  },
});
