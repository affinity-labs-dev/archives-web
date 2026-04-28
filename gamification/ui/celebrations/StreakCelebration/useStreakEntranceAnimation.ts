// All Reanimated state for the streak celebration entrance:
// 28 fixed-arity sharedValues, the master useEffect that drives the
// entrance + reset, and the bundled animatedStyles the JSX consumes.
//
// Why a fixed-arity hook count (and not weekData.map(useSharedValue))
// — `.map(useSharedValue)` would call `useSharedValue` once per day,
// making the hook count depend on `weekData.length`. That violates
// React's "same hooks in the same order every render" contract. By
// declaring 7 individual hooks per group and assembling them into
// arrays, each shared value remains its own subscription target and
// the hook order stays stable.

import { easings, safeDuration } from '@/components/ui';
import { useEffect } from 'react';
import {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { ANIM } from './constants';
import { type WeekDay } from './types';

interface UseStreakEntranceAnimationParams {
  visible: boolean;
  weekData: WeekDay[];
}

export function useStreakEntranceAnimation({
  visible,
  weekData,
}: UseStreakEntranceAnimationParams) {
  // Entrance shared values — one per element the mock tweens. Defaults
  // match the `gsap.set` initial states in `enterScreen6`.
  const sunburstOpacity = useSharedValue(0);
  const sunburstRotation = useSharedValue(0);
  // Card no longer animates scale — it caused a visible bottom-edge
  // shift downward as 0.94 → 1 expanded the rendered footprint
  // symmetrically around the layout center. The bottom edge moved
  // down ~13 px during the entrance, which read as "card jumping
  // down" against the absolute-positioned ctaSlot beneath. Opacity
  // alone preserves the soft entrance without the layout-edge jitter.
  const cardOpacity = useSharedValue(0);
  // Exit fade — driven by the close X / CONTINUE buttons. We run our
  // own opacity 1→0 animation BEFORE calling the parent's onContinue
  // so the parent's state cascade (orchestrator clearing
  // `currentCelebration`, today tab re-rendering its calendar fetch)
  // doesn't race the Modal's native fade-out and clobber calendar
  // data mid-close. `onContinue` fires from the worklet completion
  // callback once the local fade lands at 0.
  const exitOpacity = useSharedValue(1);
  const pedestalScale = useSharedValue(0.88);
  const pedestalOpacity = useSharedValue(0);
  const flameY = useSharedValue(-40);
  const flameScale = useSharedValue(0.85);
  const flameOpacity = useSharedValue(0);
  const numberScale = useSharedValue(0.88);
  const numberOpacity = useSharedValue(0);
  const labelY = useSharedValue(20);
  const labelOpacity = useSharedValue(0);
  const weekOpacity = useSharedValue(0);
  const weekLabelsOpacity = useSharedValue(0);
  const messageY = useSharedValue(16);
  const messageOpacity = useSharedValue(0);
  const buttonY = useSharedValue(30);
  const buttonOpacity = useSharedValue(0);

  // Per-day shared values — fixed arity (7 days, Mo→Su) so the hook
  // count is stable across every render. See file header for why.
  const dayScale0 = useSharedValue(0);
  const dayScale1 = useSharedValue(0);
  const dayScale2 = useSharedValue(0);
  const dayScale3 = useSharedValue(0);
  const dayScale4 = useSharedValue(0);
  const dayScale5 = useSharedValue(0);
  const dayScale6 = useSharedValue(0);
  const dayOpacity0 = useSharedValue(0);
  const dayOpacity1 = useSharedValue(0);
  const dayOpacity2 = useSharedValue(0);
  const dayOpacity3 = useSharedValue(0);
  const dayOpacity4 = useSharedValue(0);
  const dayOpacity5 = useSharedValue(0);
  const dayOpacity6 = useSharedValue(0);
  const checkScale0 = useSharedValue(0.5);
  const checkScale1 = useSharedValue(0.5);
  const checkScale2 = useSharedValue(0.5);
  const checkScale3 = useSharedValue(0.5);
  const checkScale4 = useSharedValue(0.5);
  const checkScale5 = useSharedValue(0.5);
  const checkScale6 = useSharedValue(0.5);
  const checkOpacity0 = useSharedValue(0);
  const checkOpacity1 = useSharedValue(0);
  const checkOpacity2 = useSharedValue(0);
  const checkOpacity3 = useSharedValue(0);
  const checkOpacity4 = useSharedValue(0);
  const checkOpacity5 = useSharedValue(0);
  const checkOpacity6 = useSharedValue(0);
  const dayScales: SharedValue<number>[] = [
    dayScale0,
    dayScale1,
    dayScale2,
    dayScale3,
    dayScale4,
    dayScale5,
    dayScale6,
  ];
  const dayOpacities: SharedValue<number>[] = [
    dayOpacity0,
    dayOpacity1,
    dayOpacity2,
    dayOpacity3,
    dayOpacity4,
    dayOpacity5,
    dayOpacity6,
  ];
  const checkScales: SharedValue<number>[] = [
    checkScale0,
    checkScale1,
    checkScale2,
    checkScale3,
    checkScale4,
    checkScale5,
    checkScale6,
  ];
  const checkOpacities: SharedValue<number>[] = [
    checkOpacity0,
    checkOpacity1,
    checkOpacity2,
    checkOpacity3,
    checkOpacity4,
    checkOpacity5,
    checkOpacity6,
  ];

  // Master entrance / reset effect. Tied to `visible`: on flip-true
  // resets every shared value to its initial offset and schedules the
  // tweens; on flip-false cancels infinite tweens (sunburst spin) and
  // snaps everything back so re-opens animate fresh.
  useEffect(() => {
    if (!visible) {
      cancelAnimation(sunburstRotation);
      sunburstOpacity.value = 0;
      sunburstRotation.value = 0;
      cardOpacity.value = 0;
      pedestalScale.value = 0.88;
      pedestalOpacity.value = 0;
      flameY.value = -40;
      flameScale.value = 0.85;
      flameOpacity.value = 0;
      numberScale.value = 0.88;
      numberOpacity.value = 0;
      labelY.value = 20;
      labelOpacity.value = 0;
      weekOpacity.value = 0;
      weekLabelsOpacity.value = 0;
      messageY.value = 16;
      messageOpacity.value = 0;
      buttonY.value = 30;
      buttonOpacity.value = 0;
      dayScales.forEach((sv, i) => {
        sv.value = weekData[i]?.completed ? 0.6 : 0.85;
      });
      dayOpacities.forEach((sv) => (sv.value = 0));
      checkScales.forEach((sv) => (sv.value = 0.5));
      checkOpacities.forEach((sv) => (sv.value = 0));
      // NOTE: exitOpacity is NOT reset here. After a close it sits at
      // 0 — we want it to STAY at 0 while the Modal completes its
      // native fade-out. Resetting to 1 here would cause a flicker
      // where contents momentarily reappear at full opacity right as
      // the Modal starts hiding. The reset to 1 lives in the
      // visible=true branch below so each fresh entrance arms it.
      return;
    }
    // Re-arm the exit fade for this entrance. Belongs here (not in
    // the cleanup branch) because we need it to STAY at 0 after a
    // close until the Modal fully unmounts — otherwise the close
    // flickers as RN's native fade-out fights our local opacity.
    exitOpacity.value = 1;

    // — Sunburst —
    sunburstOpacity.value = withTiming(1, {
      duration: safeDuration(ANIM.sunburstFade.dur),
      easing: easings.power2Out,
    });
    sunburstRotation.value = withDelay(
      safeDuration(ANIM.sunburstSpin.delay),
      withRepeat(
        withTiming(360, {
          duration: safeDuration(ANIM.sunburstSpin.dur),
          easing: Easing.linear,
        }),
        -1,
        false,
      ),
    );

    // — Card opacity only (scale animation removed — see comment on
    //    cardOpacity declaration above for why). Same delay + duration
    //    as the original mock so the card's entrance feel is
    //    preserved. —
    cardOpacity.value = withDelay(
      safeDuration(ANIM.card.delay),
      withTiming(1, {
        duration: safeDuration(ANIM.card.dur),
        easing: easings.power2Out,
      }),
    );

    // — Pedestal (back.out(1.6)) —
    const pedestalEasing = Easing.bezier(0.175, 0.885, 0.32, 1.16);
    pedestalScale.value = withDelay(
      safeDuration(ANIM.pedestal.delay),
      withTiming(1, {
        duration: safeDuration(ANIM.pedestal.dur),
        easing: pedestalEasing,
      }),
    );
    pedestalOpacity.value = withDelay(
      safeDuration(ANIM.pedestal.delay),
      withTiming(1, {
        duration: safeDuration(ANIM.pedestal.dur),
        easing: easings.power2Out,
      }),
    );

    // — Flame (elastic.out(1, 0.55)) — snappier elastic settle —
    const flameEasing = Easing.out(Easing.elastic(0.55));
    flameY.value = withDelay(
      safeDuration(ANIM.flame.delay),
      withTiming(0, { duration: safeDuration(ANIM.flame.dur), easing: flameEasing }),
    );
    flameScale.value = withDelay(
      safeDuration(ANIM.flame.delay),
      withTiming(1, { duration: safeDuration(ANIM.flame.dur), easing: flameEasing }),
    );
    flameOpacity.value = withDelay(
      safeDuration(ANIM.flame.delay),
      withTiming(1, { duration: safeDuration(ANIM.flame.dur), easing: easings.power2Out }),
    );

    // — Number (back.out(2)) —
    numberScale.value = withDelay(
      safeDuration(ANIM.number.delay),
      withTiming(1, {
        duration: safeDuration(ANIM.number.dur),
        easing: easings.backOut2,
      }),
    );
    numberOpacity.value = withDelay(
      safeDuration(ANIM.number.delay),
      withTiming(1, {
        duration: safeDuration(ANIM.number.dur),
        easing: easings.power2Out,
      }),
    );

    // — Label (back.out(1.5)) —
    labelY.value = withDelay(
      safeDuration(ANIM.label.delay),
      withTiming(0, {
        duration: safeDuration(ANIM.label.dur),
        easing: easings.backOut15,
      }),
    );
    labelOpacity.value = withDelay(
      safeDuration(ANIM.label.delay),
      withTiming(1, {
        duration: safeDuration(ANIM.label.dur),
        easing: easings.power2Out,
      }),
    );

    // — Week card —
    weekOpacity.value = withDelay(
      safeDuration(ANIM.week.delay),
      withTiming(1, {
        duration: safeDuration(ANIM.week.dur),
        easing: easings.power2Out,
      }),
    );
    weekLabelsOpacity.value = withDelay(
      safeDuration(ANIM.weekLabels.delay),
      withTiming(1, {
        duration: safeDuration(ANIM.weekLabels.dur),
        easing: easings.power2Out,
      }),
    );

    // — Day pop-in stagger —
    // Pending + missed share the `pending` track (40ms stagger,
    // power2.out, 350ms). Done indicators use the `done` track
    // (180ms stagger, back.out(2), 400ms) and their inner checks
    // chain in 120ms later (300ms back.out(2.2)).
    let pendingI = 0;
    let doneI = 0;
    weekData.forEach((day, idx) => {
      const isCompleted = day.completed;
      if (isCompleted) {
        const localDelay = ANIM.done.delay + doneI * ANIM.done.stagger;
        dayScales[idx].value = withDelay(
          safeDuration(localDelay),
          withTiming(1, {
            duration: safeDuration(ANIM.done.dur),
            easing: easings.backOut2,
          }),
        );
        dayOpacities[idx].value = withDelay(
          safeDuration(localDelay),
          withTiming(1, {
            duration: safeDuration(ANIM.done.dur),
            easing: easings.power2Out,
          }),
        );
        const checkDelay = ANIM.doneCheck.delay + doneI * ANIM.doneCheck.stagger;
        const checkEasing = Easing.bezier(0.175, 0.885, 0.32, 1.22);
        checkScales[idx].value = withDelay(
          safeDuration(checkDelay),
          withTiming(1, {
            duration: safeDuration(ANIM.doneCheck.dur),
            easing: checkEasing,
          }),
        );
        checkOpacities[idx].value = withDelay(
          safeDuration(checkDelay),
          withTiming(1, {
            duration: safeDuration(ANIM.doneCheck.dur),
            easing: easings.power2Out,
          }),
        );
        doneI++;
      } else {
        const localDelay = ANIM.pending.delay + pendingI * ANIM.pending.stagger;
        dayScales[idx].value = withDelay(
          safeDuration(localDelay),
          withTiming(1, {
            duration: safeDuration(ANIM.pending.dur),
            easing: easings.power2Out,
          }),
        );
        dayOpacities[idx].value = withDelay(
          safeDuration(localDelay),
          withTiming(1, {
            duration: safeDuration(ANIM.pending.dur),
            easing: easings.power2Out,
          }),
        );
        pendingI++;
      }
    });

    // — Message + Button (back.out(2)) —
    messageY.value = withDelay(
      safeDuration(ANIM.message.delay),
      withTiming(0, {
        duration: safeDuration(ANIM.message.dur),
        easing: easings.power2Out,
      }),
    );
    messageOpacity.value = withDelay(
      safeDuration(ANIM.message.delay),
      withTiming(1, {
        duration: safeDuration(ANIM.message.dur),
        easing: easings.power2Out,
      }),
    );
    buttonY.value = withDelay(
      safeDuration(ANIM.button.delay),
      withTiming(0, {
        duration: safeDuration(ANIM.button.dur),
        easing: easings.backOut2,
      }),
    );
    buttonOpacity.value = withDelay(
      safeDuration(ANIM.button.delay),
      withTiming(1, {
        duration: safeDuration(ANIM.button.dur),
        easing: easings.power2Out,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, weekData]);

  // ─── Animated styles ───
  const exitAnimatedStyle = useAnimatedStyle(() => ({
    opacity: exitOpacity.value,
  }));
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
  }));
  const pedestalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pedestalScale.value }],
    opacity: pedestalOpacity.value,
  }));
  const flameAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: flameY.value }, { scale: flameScale.value }],
    opacity: flameOpacity.value,
  }));
  const numberAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: numberScale.value }],
    opacity: numberOpacity.value,
  }));
  const labelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: labelY.value }],
    opacity: labelOpacity.value,
  }));
  const weekAnimatedStyle = useAnimatedStyle(() => ({
    opacity: weekOpacity.value,
  }));
  const weekLabelsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: weekLabelsOpacity.value,
  }));
  const messageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: messageY.value }],
    opacity: messageOpacity.value,
  }));
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: buttonY.value }],
    opacity: buttonOpacity.value,
  }));

  return {
    // raw shared values — exposed so JSX can pass-through to children
    // (Sunburst) or the close handler can drive the exit fade.
    sunburstOpacity,
    sunburstRotation,
    exitOpacity,
    // per-day arrays for DayIndicator props
    dayScales,
    dayOpacities,
    checkScales,
    checkOpacities,
    // bundled animated styles
    exitAnimatedStyle,
    cardAnimatedStyle,
    pedestalAnimatedStyle,
    flameAnimatedStyle,
    numberAnimatedStyle,
    labelAnimatedStyle,
    weekAnimatedStyle,
    weekLabelsAnimatedStyle,
    messageAnimatedStyle,
    buttonAnimatedStyle,
  };
}
