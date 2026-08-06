// PulseRing — 2.5px hollow border that scales 1→1.14 + fades 0.85→0 in a
// 1.5s ease-out infinite loop. Affordance signal on action-mode steps.
// Mock: CSS @keyframes wtPulse in Downloads/06 guided walkthrough/index.html
// line 1204-1207. Reduced-motion fallback per mock line 1210: static 0.9
// outline, no animation.
//
// Positioned absolutely against the overlay's coordinate space — parent
// passes a rect (x, y, w, h) measured from the target. Provider provides
// the measure call site; this component is purely presentational.

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/components/ui';
import { isReducedMotion, safeDuration } from '@/components/ui/theme/motion';

type Props = {
  // null = hidden (no rect to highlight, e.g. passive steps with no target).
  rect: { x: number; y: number; w: number; h: number } | null;
  // Engine sets this true only on action-mode steps with pulseTarget=true.
  active: boolean;
};

const PULSE_DURATION_MS = 1500;
const RECT_PADDING = 6;

export function PulseRing({ rect, active }: Props) {
  // scale + opacity animate together — single shared `progress` 0→1 drives both
  // via interpolation in the worklet. Cheaper than two values, and guarantees
  // they stay in lock-step (the mock combines them in one CSS keyframe set).
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!active || !rect || isReducedMotion()) {
      cancelAnimation(progress);
      progress.value = 0;
      return;
    }
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, {
        duration: safeDuration(PULSE_DURATION_MS),
        easing: Easing.out(Easing.quad),
      }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(progress);
    };
  }, [active, rect, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    // Mock keyframe: scale 1 → 1.14, opacity 0.85 → 0
    const scale = 1 + 0.14 * progress.value;
    const opacity = 0.85 * (1 - progress.value);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  // Reduced-motion path renders a static outline with fixed 0.9 opacity. We
  // skip the animated style entirely so the worklet doesn't run.
  if (!active || !rect) return null;
  if (isReducedMotion()) {
    return (
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            left: rect.x - RECT_PADDING,
            top: rect.y - RECT_PADDING,
            width: rect.w + RECT_PADDING * 2,
            height: rect.h + RECT_PADDING * 2,
            opacity: 0.9,
          },
        ]}
      />
    );
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        {
          left: rect.x - RECT_PADDING,
          top: rect.y - RECT_PADDING,
          width: rect.w + RECT_PADDING * 2,
          height: rect.h + RECT_PADDING * 2,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: colors.bluePrimary,
    borderRadius: 24,
  },
});
