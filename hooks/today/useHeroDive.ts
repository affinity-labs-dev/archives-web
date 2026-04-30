import { useEffect } from "react";
import {
  cancelAnimation,
  Easing,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { easings, safeDuration } from "@/components/ui";

/**
 * Hero dive animation — Start My Day → video lesson opening.
 *
 * Ports the mock's `performHeroDive` (Downloads/02 daily story/index.html:1688-1718)
 * + the screen2 crossfade (line 1755-1768) to Reanimated. Three layers run on
 * a single timeline so the user sees the centered Watch card "lao vào" the
 * lesson while other home elements fade out and the lesson crossfades in
 * underneath.
 *
 * Timeline:
 *   t=0      home opacity      1 → 0    250ms  power2.in        (other home elements)
 *   t=0      center card scale 1 → 2.1  550ms  power3.inOut     (the dive)
 *   t=0      center card opacity 1 → 0  550ms  power3.inOut     (the dive)
 *   t=550    lesson opacity    0 → 1    400ms  power2.inOut     (crossfade)
 *
 * Total: ~950ms forward. `safeDuration` collapses everything to 0 when the user
 * has reduced-motion enabled — `playDive()` resolves immediately.
 */
export function useHeroDive() {
  // Initial state: home + card visible at full opacity, card at natural scale,
  // lesson hidden. `playDive` mutates these; `reset` snaps back.
  const homeOpacity = useSharedValue(1);
  const cardScale = useSharedValue(1);
  const cardOpacity = useSharedValue(1);
  const lessonOpacity = useSharedValue(0);

  const power3InOut = Easing.inOut(Easing.cubic);

  /** Forward dive — home fades, card flies forward, lesson crossfades in. */
  const playDive = (): Promise<void> =>
    new Promise<void>((resolve) => {
      const homeMs = safeDuration(250);
      const diveMs = safeDuration(550);
      const lessonMs = safeDuration(400);

      homeOpacity.value = withTiming(0, {
        duration: homeMs,
        easing: easings.power2In,
      });
      cardScale.value = withTiming(2.1, {
        duration: diveMs,
        easing: power3InOut,
      });
      cardOpacity.value = withTiming(0, {
        duration: diveMs,
        easing: power3InOut,
      });
      lessonOpacity.value = withDelay(
        diveMs,
        withTiming(
          1,
          { duration: lessonMs, easing: easings.power2InOut },
          (finished) => {
            if (finished) scheduleOnRN(resolve);
          },
        ),
      );

      // Safety: if reduced motion zeroes durations, the callback may still
      // fire synchronously but the promise needs to resolve. The `withDelay`
      // chain handles this — `withTiming(0, …)` calls the callback.
    });

  /** Reverse — close lesson with mirrored timeline. */
  const playReverse = (): Promise<void> =>
    new Promise<void>((resolve) => {
      const lessonMs = safeDuration(300);
      const homeMs = safeDuration(250);
      const diveMs = safeDuration(450);

      lessonOpacity.value = withTiming(0, {
        duration: lessonMs,
        easing: easings.power2In,
      });
      // Resolve on the LONGEST animation after the lesson fade — cardScale
      // runs 450ms (vs home's 250ms), so settling cardScale first would
      // unmount the Modal while the card is still scaling 2.1→1, giving a
      // visible pop when `closeModal()` clears the slot. Resolve on
      // cardScale's callback so the Modal only tears down once every layer
      // has finished.
      cardScale.value = withDelay(
        lessonMs,
        withTiming(
          1,
          { duration: diveMs, easing: power3InOut },
          (finished) => {
            if (finished) scheduleOnRN(resolve);
          },
        ),
      );
      cardOpacity.value = withDelay(
        lessonMs,
        withTiming(1, { duration: diveMs, easing: power3InOut }),
      );
      homeOpacity.value = withDelay(
        lessonMs,
        withTiming(1, { duration: homeMs, easing: easings.power2InOut }),
      );
    });

  /** Snap everything back to entry state — used when closing without animation. */
  const reset = () => {
    homeOpacity.value = 1;
    cardScale.value = 1;
    cardOpacity.value = 1;
    lessonOpacity.value = 0;
  };

  // Cancel any in-flight tweens when the consumer unmounts. Without this, a
  // tab-switch mid-dive leaves Reanimated worklets running on a detached
  // component (resolved Promise from `playDive` would still fire, but its
  // listeners are gone — harmless yet noisy in dev). On Android the cancel
  // also frees the GPU compositor sooner, avoiding a brief opacity ghost
  // on the next mount.
  useEffect(() => {
    return () => {
      cancelAnimation(homeOpacity);
      cancelAnimation(cardScale);
      cancelAnimation(cardOpacity);
      cancelAnimation(lessonOpacity);
    };
  }, [homeOpacity, cardScale, cardOpacity, lessonOpacity]);

  return {
    homeOpacity,
    cardScale,
    cardOpacity,
    lessonOpacity,
    playDive,
    playReverse,
    reset,
  };
}

export type UseHeroDiveReturn = ReturnType<typeof useHeroDive>;
