// AnimatedCountUp — UI-thread number tween that pushes integer steps
// down to a `<Text>` via `runOnJS(setState)` only when the displayed
// integer actually changes (Math.round transition). React.memo + the
// `===`-comparison inside `useAnimatedReaction` mean the parent only
// re-renders when the visible digit changes, not every animation frame.
//
// Earlier versions used `<TextInput>` + `useAnimatedProps` to write the
// running value entirely on the UI thread — that approach is genuinely
// re-render-free, but on Android `TextInput` has different vertical
// alignment metrics from `<Text>` (font padding, baseline anchoring,
// no perfect mapping) and the displayed text visibly misaligned with
// surrounding Typography in the same row. Going back to a real `<Text>`
// trades a small amount of JS-thread work for visually correct
// alignment that matches every other Text in the app.
//
// `scheduleOnRN` (from `react-native-worklets`) is the post-Reanimated 3.x
// replacement for the now-deprecated `runOnJS`. Both schedule a function
// to run on the React Native JS thread from a worklet — `scheduleOnRN`
// is the new canonical name.

import React, { useEffect, useState } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { safeDuration } from '@/components/ui/theme';

export interface AnimatedCountUpProps {
  /** Target value to count up to. */
  target: number;
  /** Animation duration, ms. Default 800. */
  duration?: number;
  /** Delay before the count starts, ms. Default 0. */
  delay?: number;
  /** Optional suffix appended to the displayed number, e.g. `'%'` or `' XP'`. */
  suffix?: string;
  /** Optional prefix prepended, e.g. `'+'`. */
  prefix?: string;
  /** Text style — pass full Typography-equivalent style. */
  style?: StyleProp<TextStyle>;
}

const AnimatedCountUpComponent: React.FC<AnimatedCountUpProps> = ({
  target,
  duration = 800,
  delay = 0,
  suffix = '',
  prefix = '',
  style,
}) => {
  const [display, setDisplay] = useState(0);
  const value = useSharedValue(0);

  // Re-run the count whenever target / duration / delay change.
  useEffect(() => {
    value.value = 0;
    value.value = withDelay(
      safeDuration(delay),
      withTiming(target, {
        duration: safeDuration(duration),
        easing: Easing.out(Easing.cubic),
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration, delay]);

  // Cancel the running timing on unmount so the worklet stops scheduling
  // setState calls on a torn-down component during navigation.
  useEffect(() => {
    return () => cancelAnimation(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push only integer-step changes back to React state. With Math.round,
  // a 0→90 count over 800ms produces ~90 setState calls — far fewer than
  // the per-frame rate, and React batches commits within each frame.
  useAnimatedReaction(
    () => Math.round(value.value),
    (current, previous) => {
      if (current !== previous) {
        scheduleOnRN(setDisplay, current);
      }
    },
  );

  return <Text style={style}>{`${prefix}${display}${suffix}`}</Text>;
};

export const AnimatedCountUp = React.memo(AnimatedCountUpComponent);
