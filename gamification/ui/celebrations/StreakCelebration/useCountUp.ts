// countUp: drive a digit ticker from 0 (or current value) → `streakCount`
// over `ANIM.countUp.dur` after `ANIM.countUp.delay`.
//
// PERFORMANCE — why Reanimated `useAnimatedProps` + `AnimatedTextInput`
// instead of `useState + setState` per frame:
//
//   The previous implementation used `requestAnimationFrame` to write a
//   React state every frame (~60 calls/sec) which forced a full
//   reconcile pass each frame. On a screen this dense (sunburst rotating,
//   flame Rive, day indicators staggering, week card laying out) Android
//   ran out of frame budget by the time the count was halfway, producing
//   the visible "1, 2, 3 lag" reported on lower-mid devices.
//
//   The Reanimated path keeps the digit count entirely on the UI thread:
//
//     1. A SHARED VALUE drives 0 → target via `withTiming`.
//     2. A `useAnimatedProps` worklet reads that shared value and writes
//        it directly into a `TextInput.text` prop on the UI thread.
//     3. React renders ONCE (when the screen mounts). Every count update
//        after that is a native prop write — zero JS thread cost, zero
//        reconcile.
//
//   `<TextInput editable={false} caretHidden>` is the canonical RN trick
//   for rendering animated text — `<Text>` has no `text` prop (its body
//   is children, not a prop), so animatedProps can't drive it. The
//   consumer styles the TextInput like a Text and gets the same visual.
//
// onComplete callback fires when the count lands at the target — the
// streak screen routes its confetti + chime through here so they sync
// with the final digit committing instead of a parallel setTimeout.

import { safeDuration } from '@/components/ui';
import { useEffect } from 'react';
import {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ANIM } from './constants';

interface UseCountUpParams {
  visible: boolean;
  streakCount: number;
  onComplete?: () => void;
}

export function useCountUp({ visible, streakCount, onComplete }: UseCountUpParams) {
  // Shared value drives the count on the UI thread. Starts at 0 and
  // ramps to `streakCount` via withTiming when `visible` flips true.
  const count = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      cancelAnimation(count);
      count.value = 0;
      return;
    }
    if (streakCount <= 0) {
      count.value = 0;
      return;
    }

    const dur = safeDuration(ANIM.countUp.dur);
    const delay = safeDuration(ANIM.countUp.delay);

    if (dur === 0) {
      // Reduced motion: snap to final value, fire onComplete immediately.
      count.value = streakCount;
      onComplete?.();
      return;
    }

    // Reset to 0 then ramp. Anchor explicitly each effect-run so a
    // re-fire (StrictMode dev double-invoke, parent re-render with
    // changed streakCount) starts fresh.
    count.value = 0;
    count.value = withDelay(
      delay,
      withTiming(
        streakCount,
        { duration: dur, easing: Easing.out(Easing.quad) },
        (finished) => {
          'worklet';
          if (finished && onComplete) {
            scheduleOnRN(onComplete);
          }
        },
      ),
    );

    return () => {
      cancelAnimation(count);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, streakCount]);

  // Animated props for `<AnimatedTextInput animatedProps={animatedProps} />`.
  // Worklet runs on UI thread, writes the rounded integer as the
  // TextInput's `text` prop — no React render involved.
  const animatedProps = useAnimatedProps(() => {
    'worklet';
    return {
      text: String(Math.floor(count.value)),
      // `defaultValue` is required by some RN versions for the prop
      // write to register on Android; including it on every tick is
      // harmless and ensures the first paint shows "0".
      defaultValue: String(Math.floor(count.value)),
    } as object;
  });

  return { animatedProps, count };
}
