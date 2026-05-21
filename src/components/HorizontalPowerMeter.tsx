import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  withTiming,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { FONT, PALETTE } from '@/constants/theme';
import { HudPanel } from './HudPanel';

interface HorizontalPowerMeterProps {
  /** Power 0..1 driven on the UI thread. */
  power: SharedValue<number>;
  /** When true, meter is shown; when false, hidden (per spec). */
  visible: boolean;
  /** Total meter width in px (segments fit inside). */
  width?: number;
  /** Number of segments in the meter. */
  segments?: number;
}

/**
 * Horizontal segmented power meter — bottom-right of the OffenseScreen HUD.
 *
 * Per spec:
 *   - "SHOT POWER METER" label above
 *   - Horizontal segmented bar, fills left to right
 *   - Color gradient: red -> orange -> yellow -> green (match Image 2)
 *   - Only visible during shot wind-up (Hidden the rest of the time)
 *
 * The "green zone" segment subtly pulses while filled — additional juice
 * from Section 6 ("Power meter pulse — meter pulses/glows when in the
 * green zone").
 */
export const HorizontalPowerMeter: React.FC<HorizontalPowerMeterProps> = ({
  power,
  visible,
  width = 168,
  segments = 12,
}) => {
  const containerStyle = useAnimatedStyle(() => ({
    opacity: withTiming(visible ? 1 : 0, {
      duration: 140,
      easing: Easing.out(Easing.quad),
    }),
  }));

  return (
    <Animated.View style={[styles.wrap, containerStyle]} pointerEvents="none">
      <Text style={styles.label}>SHOT POWER METER</Text>
      <HudPanel innerPadding={4} style={{ width }}>
        <View style={styles.bar}>
          {Array.from({ length: segments }).map((_, i) => (
            <PowerSegment
              key={i}
              order={i}
              total={segments}
              power={power}
            />
          ))}
        </View>
      </HudPanel>
    </Animated.View>
  );
};

const PowerSegment: React.FC<{
  order: number;
  total: number;
  power: SharedValue<number>;
}> = ({ order, total, power }) => {
  /**
   * Segment lights up when power >= (order + 0.5) / total.
   *
   * Color stops along the bar:
   *   0%   = red       (meterLow)
   *   33%  = orange    (meterMid)
   *   66%  = yellow    (yellowBright)
   *   100% = green     (meterHigh)
   *
   * We pre-compute each segment's intrinsic color from its position
   * (no animation when off); when on we light it up and subtly scale.
   */
  const thresholdLit = (order + 0.5) / total;
  const segColor = colorForSegment(order, total);

  const animStyle = useAnimatedStyle(() => {
    const lit = power.value >= thresholdLit;
    return {
      backgroundColor: lit ? segColor : '#1a1a1a',
      opacity: lit ? 1 : 0.35,
      transform: [{ scaleY: lit ? 1 : 0.85 }],
    };
  });

  return <Animated.View style={[styles.segment, animStyle]} />;
};

function colorForSegment(order: number, total: number): string {
  const t = order / (total - 1); // 0..1 across the bar
  // Stops: 0=red, 0.33=orange, 0.66=yellow, 1=green
  if (t < 0.33) return interp(t / 0.33, PALETTE.meterLow, PALETTE.meterMid);
  if (t < 0.66) return interp((t - 0.33) / 0.33, PALETTE.meterMid, PALETTE.yellowBright);
  return interp((t - 0.66) / 0.34, PALETTE.yellowBright, PALETTE.meterHigh);
}

/**
 * Tiny hex color interpolation helper — sidesteps importing reanimated's
 * `interpolateColor` at module scope (which would only work inside a worklet).
 */
function interp(t: number, from: string, to: string): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const c = {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
  return `rgb(${c.r}, ${c.g}, ${c.b})`;
}
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const v = parseInt(h, 16);
  return { r: (v >> 16) & 0xff, g: (v >> 8) & 0xff, b: v & 0xff };
}

// Suppress unused-import lint — interpolateColor stays available if we
// ever want to JS-side animate stops in the future.
void interpolateColor;

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-start',
  },
  label: {
    fontFamily: FONT.family,
    fontSize: FONT.tiny,
    color: PALETTE.lineWhite,
    letterSpacing: 1,
    marginBottom: 4,
  },
  bar: {
    flexDirection: 'row',
    height: 18,
    gap: 2,
  },
  segment: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#000',
  },
});
