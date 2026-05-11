// QuizFeedbackSheet — figma 3379:5130 (correct) / 5165 (incorrect).
// Backdrop fade + back-out slide-up + staggered content entrance per
// mock `index.html:2699-2717`. CONTINUE button is a DepthButton with
// the matching color pair (correct: green, incorrect: red).

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Ionicons } from '@expo/vector-icons';

import {
  DepthButton,
  Typography,
  colors,
  easings,
  safeDuration,
} from '@/components/ui';

const FEEDBACK_SHEET_HEIGHT = 200;
const FEEDBACK_OPEN_MS = 500;
const FEEDBACK_CLOSE_MS = 320;
const FEEDBACK_STAGGER_DELAY_MS = 220;
const FEEDBACK_STAGGER_GAP_MS = 60;
const FEEDBACK_ITEM_DURATION_MS = 320;

export interface QuizFeedbackSheetProps {
  visible: boolean;
  isCorrect: boolean;
  points: number;
  explanation: string;
  bottomInset: number;
  onContinue: () => void;
}

export default function QuizFeedbackSheet({
  visible,
  isCorrect,
  points,
  explanation,
  bottomInset,
  onContinue,
}: QuizFeedbackSheetProps) {
  const sheetTranslateY = useSharedValue(FEEDBACK_SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const titleY = useSharedValue(10);
  const titleOpacity = useSharedValue(0);
  const xpY = useSharedValue(10);
  const xpOpacity = useSharedValue(0);
  const expY = useSharedValue(10);
  const expOpacity = useSharedValue(0);
  const btnY = useSharedValue(10);
  const btnOpacity = useSharedValue(0);

  // Open animation — fires on visible flip true. Close is driven by the
  // CONTINUE tap below (animation completion calls onContinue).
  useEffect(() => {
    if (!visible) return;

    // Reset all elements to their starting offsets so re-opens animate
    // fresh (the user might dismiss + re-trigger feedback for the next
    // question without unmounting the sheet).
    sheetTranslateY.value = FEEDBACK_SHEET_HEIGHT;
    titleY.value = 10;
    titleOpacity.value = 0;
    xpY.value = 10;
    xpOpacity.value = 0;
    expY.value = 10;
    expOpacity.value = 0;
    btnY.value = 10;
    btnOpacity.value = 0;

    // Backdrop fades to 0.3 alongside the sheet.
    backdropOpacity.value = withTiming(0.3, {
      duration: safeDuration(FEEDBACK_OPEN_MS),
      easing: easings.backOut14,
    });
    // Sheet slides up — back.out(1.2) per mock.
    sheetTranslateY.value = withTiming(0, {
      duration: safeDuration(FEEDBACK_OPEN_MS),
      easing: easings.backOut14,
    });

    // Stagger inner contents: title → xp → exp → btn at 60ms gaps,
    // 320ms `back.out(1.6)` each, 220ms after sheet starts.
    const innerEasing = easings.backOut14;
    const animate = (
      yShared: typeof titleY,
      oShared: typeof titleOpacity,
      delayMs: number,
    ) => {
      yShared.value = withDelay(
        safeDuration(delayMs),
        withTiming(0, {
          duration: safeDuration(FEEDBACK_ITEM_DURATION_MS),
          easing: innerEasing,
        }),
      );
      oShared.value = withDelay(
        safeDuration(delayMs),
        withTiming(1, {
          duration: safeDuration(FEEDBACK_ITEM_DURATION_MS),
          easing: innerEasing,
        }),
      );
    };
    animate(
      titleY,
      titleOpacity,
      FEEDBACK_STAGGER_DELAY_MS + FEEDBACK_STAGGER_GAP_MS * 0,
    );
    animate(
      xpY,
      xpOpacity,
      FEEDBACK_STAGGER_DELAY_MS + FEEDBACK_STAGGER_GAP_MS * 1,
    );
    animate(
      expY,
      expOpacity,
      FEEDBACK_STAGGER_DELAY_MS + FEEDBACK_STAGGER_GAP_MS * 2,
    );
    animate(
      btnY,
      btnOpacity,
      FEEDBACK_STAGGER_DELAY_MS + FEEDBACK_STAGGER_GAP_MS * 3,
    );
  }, [
    visible,
    sheetTranslateY,
    backdropOpacity,
    titleY,
    titleOpacity,
    xpY,
    xpOpacity,
    expY,
    expOpacity,
    btnY,
    btnOpacity,
  ]);

  // Tap-handler runs the close animation, then notifies the parent.
  // Parent will then unmount the sheet via its showFeedback toggle.
  const handleTapContinue = () => {
    backdropOpacity.value = withTiming(0, {
      duration: safeDuration(FEEDBACK_CLOSE_MS),
      easing: easings.power2In,
    });
    sheetTranslateY.value = withTiming(
      FEEDBACK_SHEET_HEIGHT,
      {
        duration: safeDuration(FEEDBACK_CLOSE_MS),
        easing: easings.power2In,
      },
      // Worklet completion callback runs on the UI thread — `scheduleOnRN`
      // (the worklets-package replacement for the deprecated
      // `runOnJS`) hops back to the JS thread to invoke the parent's
      // onContinue. Using a plain `require()` here would call CommonJS
      // from the UI runtime and crash Hermes (SIGABRT in the
      // `AnimationFrameBatchinator::flush` path), so the import has to
      // be hoisted to the module scope.
      (finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(onContinue);
        }
      },
    );
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));
  const xpStyle = useAnimatedStyle(() => ({
    opacity: xpOpacity.value,
    transform: [{ translateY: xpY.value }],
  }));
  const expStyle = useAnimatedStyle(() => ({
    opacity: expOpacity.value,
    transform: [{ translateY: expY.value }],
  }));
  const btnStyle = useAnimatedStyle(() => ({
    opacity: btnOpacity.value,
    transform: [{ translateY: btnY.value }],
  }));

  if (!visible) return null;

  const sheetBg = isCorrect ? colors.correctTertiary : colors.incorrectTertiary;
  const titleColor = isCorrect ? colors.correctPrimary : colors.incorrectPrimary;
  const xpColor = colors.correctSecondary;
  const explanationColor = isCorrect
    ? colors.correctPrimary
    : colors.incorrectPrimary;
  const ctaSurface = isCorrect ? 'correctSecondary' : 'incorrectSecondary';
  const ctaShadow = isCorrect ? 'correctPrimary' : 'incorrectPrimary';

  return (
    <>
      <Animated.View
        style={[styles.feedbackBackdrop, backdropStyle]}
        pointerEvents={visible ? 'auto' : 'none'}
      />
      <Animated.View
        style={[
          styles.feedbackSheet,
          {
            backgroundColor: sheetBg,
            paddingBottom: bottomInset + 24,
          },
          sheetStyle,
        ]}
      >
        <View style={styles.feedbackHeader}>
          <View style={styles.feedbackTitleRow}>
            <Animated.View style={[styles.feedbackIconWrap, titleStyle]}>
              <Ionicons
                name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                size={28}
                color={titleColor}
              />
            </Animated.View>
            <Animated.View style={titleStyle}>
              <Typography
                family="onest"
                weight="900"
                size={24}
                extraColor={titleColor}
                style={styles.feedbackTitle}
              >
                {isCorrect ? 'CORRECT!' : 'INCORRECT!'}
              </Typography>
            </Animated.View>
          </View>
          {isCorrect && (
            <Animated.View style={xpStyle}>
              <Typography
                family="onest"
                weight="700"
                size={14}
                extraColor={xpColor}
                style={styles.feedbackXp}
              >
                {`+${points} XP`}
              </Typography>
            </Animated.View>
          )}
        </View>

        <Animated.View style={expStyle}>
          <Typography
            family="onest"
            weight="500"
            size={14}
            extraColor={explanationColor}
            style={styles.feedbackExplanation}
          >
            {explanation}
          </Typography>
        </Animated.View>

        <Animated.View style={[styles.feedbackContinue, btnStyle]}>
          <DepthButton
            variant="secondary"
            surfaceColor={ctaSurface}
            shadowColor={ctaShadow}
            onPress={handleTapContinue}
          >
            <Typography
              family="onest"
              weight="700"
              size={18}
              extraColor={colors.white}
              style={styles.feedbackContinueLabel}
            >
              CONTINUE
            </Typography>
          </DepthButton>
        </Animated.View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  // Feedback sheet — figma 3379:5130 (correct) + 5165 (incorrect).
  // Backdrop sits above the body but below the sheet (zIndex
  // calibrated so the SUBMIT button is hidden when sheet is open).
  feedbackBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 10,
  },
  feedbackSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 18,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 20,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  feedbackTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedbackIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackTitle: {
    letterSpacing: -0.24,
  },
  feedbackXp: {
    letterSpacing: -0.14,
  },
  feedbackExplanation: {
    letterSpacing: -0.14,
    lineHeight: 18,
    marginBottom: 16,
  },
  feedbackContinue: {
    marginTop: 4,
  },
  feedbackContinueLabel: {
    letterSpacing: -0.18,
  },
});
