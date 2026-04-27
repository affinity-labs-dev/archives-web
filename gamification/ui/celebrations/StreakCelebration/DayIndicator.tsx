// Day indicator — done (purple + check), missed (grey + dash), or
// pending (acai-tertiary circle). Each indicator owns its own shared
// values so the parent can stagger them per the mock spec.

import { colors } from '@/components/ui';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

interface DayIndicatorProps {
  state: 'done' | 'missed' | 'pending';
  isToday: boolean;
  scale: SharedValue<number>;
  opacity: SharedValue<number>;
  // For `done` only — the inner check svg has its own stagger group.
  checkScale?: SharedValue<number>;
  checkOpacity?: SharedValue<number>;
}

export function DayIndicator({
  state,
  isToday,
  scale,
  opacity,
  checkScale,
  checkOpacity,
}: DayIndicatorProps) {
  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale?.value ?? 1 }],
    opacity: checkOpacity?.value ?? 1,
  }));

  if (state === 'done') {
    return (
      <Animated.View
        style={[
          styles.dayCircle,
          styles.dayCircleDone,
          isToday && styles.dayCircleToday,
          wrapStyle,
        ]}
      >
        <Animated.View style={checkStyle}>
          <Svg width={13} height={13} viewBox="0 0 14 14" fill="none">
            <Path
              d="M3 7.5L6 10.5L11 4.5"
              stroke="#fff"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Animated.View>
      </Animated.View>
    );
  }

  if (state === 'missed') {
    // Cross-platform missed indicator — em-dash via <Text> rendered
    // inconsistently on Android (font-metric / includeFontPadding
    // quirks shift the dash off-center). A 10×2 white View centered
    // in the circle is pixel-identical on iOS + Android.
    return (
      <Animated.View style={[styles.dayCircle, styles.dayCircleMissed, wrapStyle]}>
        <View style={styles.missedDash} />
      </Animated.View>
    );
  }

  // pending
  return <Animated.View style={[styles.dayCircle, styles.dayCirclePending, wrapStyle]} />;
}

const styles = StyleSheet.create({
  dayCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleDone: {
    backgroundColor: '#7E3FD8',
  },
  dayCircleToday: {
    transform: [{ scale: 1.05 }],
    shadowColor: '#7E3FD8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  dayCircleMissed: {
    backgroundColor: '#999999',
  },
  // Pending pill — Figma 3365:8850 renders these as light-purple (the
  // same acai-tertiary used as the page background). The HTML mock
  // had translucent white (rgba(255,255,255,0.16)) which on the black
  // week card appears dim grey, not purple — Figma is the authority
  // for the redesign so we override the mock here.
  dayCirclePending: {
    backgroundColor: colors.acaiTertiary,
  },
  // Cross-platform missed dash — 10×2 white View centered in the circle.
  // Replaces the previous `<Text>—</Text>` which centered inconsistently
  // on Android due to includeFontPadding + lineHeight font-metric quirks.
  missedDash: {
    width: 10,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
});
