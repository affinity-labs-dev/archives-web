import { useEffect } from "react";
import {
  cancelAnimation,
  Easing,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { easings, safeDuration } from "@/components/ui";

/**
 * Hero dive animation — Start My Day → video lesson opening.
 *
 * Ports `performHeroDive` (Downloads/02 daily story/index.html:1688-1718) +
 * the screen2 crossfade (line 1755-1768) to Reanimated. Three visual layers
 * choreograph the "card lao vào lesson" feel: other home elements fade out,
 * the centered card scales forward + fades, then the lesson crossfades in.
 *
 * ──── Why two-phase, not one? (Android compositor constraint) ─────────────
 * Earlier revisions ran the entire timeline on a single `playDive()` while
 * the Modal stayed mounted (transparent={true}). On iOS the Today surface
 * paints behind the transparent Modal, so the dive was visible. On Android
 * RN's Modal extends `Dialog`, which puts the parent Activity into a
 * reduced-paint state — the home fade + card dive ran on UI thread but
 * weren't composited. User saw Modal pop instantly, no dive.
 *
 * Fix: split the timeline so each phase runs on the surface that's actually
 * being painted. `Phase1` (home + card) runs BEFORE the Modal mounts —
 * Today is the active surface on both platforms. `Phase2` (lesson opacity)
 * runs AFTER the Modal mounts — Modal is the active surface. Reverse
 * mirrors: lesson fades out (Modal phase) → Modal unmounts → home + card
 * return (Today phase).
 *
 * Timeline (forward):
 *   Phase1 — Today active surface, NO Modal yet:
 *     t=0    home opacity      1 → 0    250ms  power2.in
 *     t=0    center card scale 1 → 2.1  550ms  power3.inOut
 *     t=0    center card op    1 → 0    550ms  power3.inOut
 *   <openModal — Modal mounts, RAF×2 wait for layout>
 *   Phase2 — Modal active surface:
 *     t=0    lesson opacity    0 → 1    400ms  power2.inOut
 *
 * `safeDuration` collapses every duration to 0 when reduce-motion is on, so
 * the timeline snaps to its end state — promises resolve on the next tick.
 */
export function useHeroDive() {
  // Initial state: home + card visible at full opacity, card at natural scale,
  // lesson hidden. Phase functions mutate these; `reset` snaps back.
  const homeOpacity = useSharedValue(1);
  const cardScale = useSharedValue(1);
  const cardOpacity = useSharedValue(1);
  const lessonOpacity = useSharedValue(0);

  const power3InOut = Easing.inOut(Easing.cubic);

  /**
   * Forward Phase 1 — home fades + center card flies forward.
   * MUST run while Today is the active surface (no Modal mounted yet).
   * Resolves on cardOpacity's callback (550ms is the longest of the three
   * tweens; resolving on a shorter one would let the caller mount the Modal
   * mid-dive, which on Android would cut the cardScale animation short).
   */
  const playDivePhase1 = (): Promise<void> =>
    new Promise<void>((resolve) => {
      const homeMs = safeDuration(250);
      const diveMs = safeDuration(550);
      homeOpacity.value = withTiming(0, {
        duration: homeMs,
        easing: easings.power2In,
      });
      cardScale.value = withTiming(2.1, {
        duration: diveMs,
        easing: power3InOut,
      });
      cardOpacity.value = withTiming(
        0,
        { duration: diveMs, easing: power3InOut },
        (finished) => {
          if (finished) scheduleOnRN(resolve);
        },
      );
    });

  /**
   * Forward Phase 2 — lesson crossfades in.
   * MUST run after the Modal has mounted and laid out, otherwise the
   * crossfade reveals an unstyled blank during initial render.
   */
  const playDivePhase2 = (): Promise<void> =>
    new Promise<void>((resolve) => {
      const lessonMs = safeDuration(400);
      lessonOpacity.value = withTiming(
        1,
        { duration: lessonMs, easing: easings.power2InOut },
        (finished) => {
          if (finished) scheduleOnRN(resolve);
        },
      );
    });

  /**
   * Reverse Phase 1 — lesson fades out.
   * Runs while Modal is still mounted (Modal is the active surface).
   * Once this resolves, the caller should `closeModal()` to unmount.
   */
  const playReversePhase1 = (): Promise<void> =>
    new Promise<void>((resolve) => {
      const lessonMs = safeDuration(300);
      lessonOpacity.value = withTiming(
        0,
        { duration: lessonMs, easing: easings.power2In },
        (finished) => {
          if (finished) scheduleOnRN(resolve);
        },
      );
    });

  /**
   * Reverse Phase 2 — center card scales back + home fades back in.
   * MUST run after the Modal has unmounted (Today is again the active
   * surface). Resolves on cardScale (longest of the three at 450ms).
   */
  const playReversePhase2 = (): Promise<void> =>
    new Promise<void>((resolve) => {
      const homeMs = safeDuration(250);
      const diveMs = safeDuration(450);
      cardScale.value = withTiming(
        1,
        { duration: diveMs, easing: power3InOut },
        (finished) => {
          if (finished) scheduleOnRN(resolve);
        },
      );
      cardOpacity.value = withTiming(1, {
        duration: diveMs,
        easing: power3InOut,
      });
      homeOpacity.value = withTiming(1, {
        duration: homeMs,
        easing: easings.power2InOut,
      });
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
    playDivePhase1,
    playDivePhase2,
    playReversePhase1,
    playReversePhase2,
    reset,
  };
}

export type UseHeroDiveReturn = ReturnType<typeof useHeroDive>;
