// QuizOptionButton — universal MCQ + True/False option per figma
// 3379:5273-5284 (default + selected) / 5107-5118 (correct) / 5142-5154
// (incorrect). Layered shadow + surface like a DepthButton, with
// per-state colors and tap/submit animations ported from the mock
// (`Downloads/02 daily story/index.html:2640-2697`).

import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {
  DepthButton,
  Typography,
  colors,
  easings,
  safeDuration,
} from '@/components/ui';

// Width is the only geometry constant we control — height (49), radius
// (17) and shadow offset (6) all come from DepthButton's `size="medium"`
// spec, which already matches the figma values 1:1.
const OPTION_WIDTH = 300;

export interface QuizOptionButtonProps {
  text: string;
  isSelected: boolean;
  /** Reveal phase only — this option IS the canonical correct answer. */
  isCorrect?: boolean;
  /** Reveal phase only — this option WAS the user's wrong selection. */
  isWrong?: boolean;
  /** Reveal phase only — true when the user picked the correct answer. */
  isUserCorrect?: boolean;
  /** Submit has been pressed; option is no longer interactive. */
  showResult?: boolean;
  onPress: () => void;
  /**
   * Hands the parent a ref to the option's outer wrapper view so it can
   * `measureInWindow` the option's screen position — used by the confetti
   * burst to anchor the puff at the selected option's center.
   */
  registerView?: (view: View | null) => void;
}

export default function QuizOptionButton({
  text,
  isSelected,
  isCorrect,
  isWrong,
  isUserCorrect,
  showResult,
  onPress,
  registerView,
}: QuizOptionButtonProps) {
  // Visual state machine — extends the OptionCard pattern (default +
  // selected use blue; correct + incorrect add the green/red reveal
  // states for the quiz). All four states pipe through `DepthButton`
  // with surface/shadow/border color overrides per figma 3379:5273-5280
  // (default + selected) / 5107-5114 (correct) / 5142-5149 (incorrect).
  const state: 'default' | 'selected' | 'correct' | 'incorrect' =
    showResult && isCorrect
      ? 'correct'
      : showResult && isWrong
        ? 'incorrect'
        : isSelected
          ? 'selected'
          : 'default';

  // Color tokens forwarded to DepthButton's surface/shadow/border slots.
  // The `tertiary` variant has no built-in border, so we layer one in via
  // the override; `tertiary-alt` already comes with a 2px border. We use
  // `tertiary-alt` for every state so the 1.5px outline reads consistently
  // across default/correct/incorrect, and switch to `tertiary` only for
  // selected (matches OptionCard).
  const variant: 'tertiary' | 'tertiary-alt' =
    state === 'selected' ? 'tertiary' : 'tertiary-alt';
  const surfaceToken:
    | 'white'
    | 'blueSecondary'
    | 'correctTertiary'
    | 'incorrectTertiary' =
    state === 'correct'
      ? 'correctTertiary'
      : state === 'incorrect'
        ? 'incorrectTertiary'
        : state === 'selected'
          ? 'blueSecondary'
          : 'white';
  const shadowToken:
    | 'blueSecondary'
    | 'bluePrimary'
    | 'correctSecondary'
    | 'incorrectPrimary' =
    state === 'correct'
      ? 'correctSecondary'
      : state === 'incorrect'
        ? 'incorrectPrimary'
        : state === 'selected'
          ? 'bluePrimary'
          : 'blueSecondary';
  const borderToken:
    | 'bluePrimary'
    | 'snow'
    | 'correctSecondary'
    | 'incorrectSecondary' =
    state === 'correct'
      ? 'correctSecondary'
      : state === 'incorrect'
        ? 'incorrectSecondary'
        : state === 'selected'
          ? 'snow'
          : 'bluePrimary';

  // Per-option Reanimated transforms. Three independent shared values:
  //   - scale: pop on select, bounce on correct submit
  //   - translateX: shake on incorrect submit
  //   - translateY: lift during the celebratory bounce
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Pop animation when transitioning to selected — mock
  // `index.html:2647-2650`. Scale 1→1.04 (100ms power2.out) →
  // 1 (250ms elastic.out(1, 0.4)).
  const wasSelectedRef = useRef(isSelected);
  useEffect(() => {
    const wasSelected = wasSelectedRef.current;
    wasSelectedRef.current = isSelected;
    if (!wasSelected && isSelected) {
      scale.value = withSequence(
        withTiming(1.04, {
          duration: safeDuration(100),
          easing: easings.power2Out,
        }),
        withTiming(1, {
          duration: safeDuration(250),
          easing: Easing.out(Easing.elastic(1)),
        }),
      );
    }
  }, [isSelected, scale]);

  // Reveal animations — only fire on the showResult false→true edge so
  // re-renders don't replay the bounce/shake.
  const wasShowingResultRef = useRef(false);
  useEffect(() => {
    const wasShowing = wasShowingResultRef.current;
    wasShowingResultRef.current = !!showResult;
    if (wasShowing || !showResult) return;

    if (isCorrect && isUserCorrect) {
      // User picked correctly — celebratory bounce.
      // Mock `index.html:2668-2670`:
      //   scale 1.08 + y -6 (180ms power2.out) → 1 + 0 (450ms elastic.out(1, 0.45))
      scale.value = withSequence(
        withTiming(1.08, {
          duration: safeDuration(180),
          easing: easings.power2Out,
        }),
        withTiming(1, {
          duration: safeDuration(450),
          easing: Easing.out(Easing.elastic(1)),
        }),
      );
      translateY.value = withSequence(
        withTiming(-6, {
          duration: safeDuration(180),
          easing: easings.power2Out,
        }),
        withTiming(0, {
          duration: safeDuration(450),
          easing: Easing.out(Easing.elastic(1)),
        }),
      );
    } else if (isCorrect && !isUserCorrect) {
      // User picked wrong; this is the right answer — yoyo bounce drawing
      // the eye 350ms after the shake starts (mock 2695-2697).
      scale.value = withDelay(
        safeDuration(350),
        withRepeat(
          withTiming(1.04, {
            duration: safeDuration(250),
            easing: easings.power2Out,
          }),
          2,
          true,
        ),
      );
    } else if (isWrong) {
      // User picked wrong — shake (mock 2687-2693). Six-step x sequence.
      translateX.value = withSequence(
        withTiming(-10, {
          duration: safeDuration(60),
          easing: easings.power2Out,
        }),
        withTiming(10, {
          duration: safeDuration(80),
          easing: easings.power2InOut,
        }),
        withTiming(-8, {
          duration: safeDuration(80),
          easing: easings.power2InOut,
        }),
        withTiming(6, {
          duration: safeDuration(80),
          easing: easings.power2InOut,
        }),
        withTiming(-4, {
          duration: safeDuration(80),
          easing: easings.power2InOut,
        }),
        withTiming(0, {
          duration: safeDuration(100),
          easing: easings.power2Out,
        }),
      );
    }
  }, [
    showResult,
    isCorrect,
    isWrong,
    isUserCorrect,
    scale,
    translateX,
    translateY,
  ]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // Outer wrapper exists purely to host a non-animated ref the parent can
  // `measureInWindow` (Reanimated's Animated.View ref points at a managed
  // shadow node, which complicates measurement on Android). `collapsable`
  // forces RN to keep this view in the native hierarchy on Android even
  // when it has no styling impact — without it, measurements return 0,0.
  return (
    <View ref={registerView} collapsable={false}>
      <Animated.View style={[styles.optionWrap, animatedStyle]}>
        <DepthButton
          variant={variant}
          size="medium"
          surfaceColor={surfaceToken}
          shadowColor={shadowToken}
          borderColor={borderToken}
          onPress={onPress}
          isDisabled={showResult}
        >
          <Typography
            family="onest"
            weight={state === 'default' ? '500' : '600'}
            extraColor={colors.black}
            style={styles.optionText}
          >
            {text}
          </Typography>
        </DepthButton>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Option button wrapper — fixes a 300px width frame so DepthButton's
  // `isFullWidth` (default true) stretches the surface to match figma
  // 3379:5273-5280. The wrapper also hosts the per-option Reanimated
  // transforms (scale pop / shake / bounce) so they don't fight the
  // DepthButton's internal layout.
  optionWrap: {
    width: OPTION_WIDTH,
  },
  optionText: {
    textAlign: 'center',
    letterSpacing: -0.18,
    paddingHorizontal: 12,
  },
});
