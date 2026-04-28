import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, durations, easings, radius, safeDuration } from '@/components/ui/theme';
import type { ColorKey } from '@/components/ui/theme';

/**
 * Color input — accepts either a design-system token (`'bluePrimary'`,
 * `'concreteGrey'`, etc.) which gets resolved through `colors[key]`, or
 * any raw color string (`'#fff'`, `'rgba(255,255,255,0.4)'`) which is
 * passed through unchanged. The `(string & {})` empty-intersection trick
 * keeps IDE autocomplete suggesting token names while still accepting
 * any string at the type level.
 */
type ProgressBarColor = ColorKey | (string & {});

const resolveColor = (input: ProgressBarColor): string => {
  // Look up `colors[key]` for known design tokens; fall through to the
  // raw input string otherwise.
  return (colors as Record<string, string>)[input] ?? input;
};

export interface ProgressBarProps {
  /** Target percent 0-100. */
  percent: number;

  /** Animate from (percent - 10) to target on mount. Default `true`. */
  animateOnMount?: boolean;

  /**
   * Outer container height — also the fill's height when `trackHeight`
   * is omitted. The fill is rendered as an absolutely-positioned overlay
   * spanning this full height. Default `8`.
   */
  height?: number;

  /**
   * Track height. Defaults to `height`. When set lower than `height`,
   * the track sits as a thinner line behind a taller fill (figma 3365:9390/9391
   * pattern: 4px track, 6px fill). When equal, both layers visually
   * coincide and the bar reads as a single solid pill.
   */
  trackHeight?: number;

  /** Track color — design-system token or raw color string. Default `'concreteGrey'`. */
  trackColor?: ProgressBarColor;

  /** Fill color — design-system token or raw color string. Default `'bluePrimary'`. */
  fillColor?: ProgressBarColor;

  /** Border radius applied to both track and fill. Default `radius.pill`. */
  borderRadius?: number;

  /** Container style. */
  style?: StyleProp<ViewStyle>;
}

/**
 * ProgressBar — animated fill bar shared across the app.
 *
 * Stack rendering pattern:
 *   - Outer container: `height` tall, `position: relative`, vertically centers
 *     the track via flex.
 *   - Track: `trackHeight` tall, sits in the middle of the container with
 *     equal padding above/below when shorter than the container.
 *   - Fill: absolute, full container height, animated `width` percentage.
 *
 * On mount, animates from `(percent - 10)` to `percent` over the
 * `durations.progressBar` duration with `power2.out`. Subsequent percent
 * changes tween from current to new value with the same timing.
 */
export function ProgressBar({
  percent,
  animateOnMount = true,
  height = 8,
  trackHeight,
  trackColor = 'concreteGrey',
  fillColor = 'bluePrimary',
  borderRadius: br = radius.pill,
  style,
}: ProgressBarProps) {
  const resolvedTrackHeight = trackHeight ?? height;
  const resolvedTrackColor = resolveColor(trackColor);
  const resolvedFillColor = resolveColor(fillColor);

  const fillPercent = useSharedValue(animateOnMount ? Math.max(0, percent - 10) : percent);

  useEffect(() => {
    fillPercent.value = withTiming(percent, {
      duration: safeDuration(durations.progressBar),
      easing: easings.power2Out,
    });
  }, [percent, fillPercent]);

  const animatedFillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(100, fillPercent.value))}%`,
  }));

  return (
    <View
      style={[
        styles.container,
        { height },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }}
    >
      <View
        style={{
          height: resolvedTrackHeight,
          backgroundColor: resolvedTrackColor,
          borderRadius: br,
        }}
      />
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: resolvedFillColor,
            borderRadius: br,
          },
          animatedFillStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    justifyContent: 'center',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
});
