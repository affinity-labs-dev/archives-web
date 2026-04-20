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

export interface ProgressBarProps {
  /** Target percent 0-100. */
  percent: number;

  /** Animate from (percent - 10) to target on mount. Default `true`. */
  animateOnMount?: boolean;

  /** Height in pixels. Default `8`. */
  height?: number;

  /** Track color token. Default `'concreteGrey'`. */
  trackColor?: ColorKey;

  /** Fill color token. Default `'bluePrimary'`. */
  fillColor?: ColorKey;

  /** Custom border radius. Default `radius.pill`. */
  borderRadius?: number;

  /** Container style. */
  style?: StyleProp<ViewStyle>;
}

/**
 * ProgressBar — animated fill bar for onboarding progress indicator.
 *
 * On mount, animates from `(percent - 10)` to `percent` over 600ms (power2.out).
 * When `percent` prop updates, tweens to new value.
 */
export function ProgressBar({
  percent,
  animateOnMount = true,
  height = 8,
  trackColor = 'concreteGrey',
  fillColor = 'bluePrimary',
  borderRadius: br = radius.pill,
  style,
}: ProgressBarProps) {
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
        styles.track,
        {
          height,
          backgroundColor: colors[trackColor],
          borderRadius: br,
        },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: colors[fillColor],
            borderRadius: br,
          },
          animatedFillStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
