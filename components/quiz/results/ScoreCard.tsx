// ScoreCard — animated 2x2 grid showing percentage / XP / labels +
// progress bar. Count-up + bar fill driven by a single shared value
// so digit and bar animate together. Text uses the AnimatedTextInput
// trick (Reanimated `useAnimatedProps`) — digits commit on the UI
// thread, no JS round-trip.

import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Typography, colors, easings, safeDuration } from '@/components/ui';

import type { TierSpec } from './tiers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCORE_CARD_WIDTH = SCREEN_WIDTH - 40;

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface ScoreCardProps {
  percentage: number;
  totalPoints: number;
  correctAnswers: number;
  totalQuestions: number;
  spec: TierSpec;
}

export function ScoreCard({
  percentage,
  totalPoints,
  correctAnswers,
  totalQuestions,
  spec,
}: ScoreCardProps) {
  const progress = useSharedValue(0);

  // Pop animation on the percentage text — only fires for a perfect
  // score (matches `is100 = screenEl.id === 'screen-100'` gate in the
  // mock at `Downloads/03 questions/index.html:2433`). The percentage
  // text bumps from 1 → 1.32 → 1 the moment count-up lands, giving the
  // "100%" a celebratory beat instead of just sitting still after the
  // tally finishes. transformOrigin='0% 100%' (bottom-left) matches the
  // mock — number expands toward upper-right so the leading "1" stays
  // anchored visually.
  const popScale = useSharedValue(1);

  useEffect(() => {
    // Count-up + bar fill — start delay matches the score-card entrance
    // landing (850ms entrance delay + ~300ms slack for the card to settle).
    progress.value = withDelay(
      safeDuration(1150),
      withTiming(percentage, {
        duration: safeDuration(900),
        easing: easings.power2Out,
      }),
    );

    // Pop animation — mock spec at lines 2284-2290:
    //   scale 1 → 1.32 in 200ms with `back.out(2.4)`
    //   scale 1.32 → 1 in 260ms with `back.inOut(1.8)`
    // Fires at countDone = 1150ms entrance + 900ms count = 2050ms from
    // mount. We approximate `back.out(2.4)` with `easings.backOut2`
    // (closest preset, slightly less overshoot — visually within tuning
    // tolerance) and `back.inOut(1.8)` with `Easing.inOut(Easing.back)`
    // which is the canonical Reanimated equivalent.
    if (percentage === 100) {
      popScale.value = withDelay(
        safeDuration(1150 + 900),
        withSequence(
          withTiming(1.32, {
            duration: safeDuration(200),
            easing: easings.backOut2,
          }),
          withTiming(1, {
            duration: safeDuration(260),
            easing: Easing.inOut(Easing.back(1.8)),
          }),
        ),
      );
    }
  }, [percentage, progress, popScale]);

  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: popScale.value }],
  }));

  // Animated text holds JUST the digits — the trailing "%" is rendered
  // as a separate static `<Text>` sibling.
  //
  // Why: iOS `RCTSinglelineTextInputView` doesn't always re-layout the
  // text frame between Reanimated UI-thread `text` prop updates. When
  // the count-up lands on a frame where the digit count grows (e.g.
  // 99 → 100 on the LAST animation frame), the input's width is still
  // sized for "99%" — the trailing "%" gets clipped off the right edge.
  // A subsequent React commit (e.g. Continue button press flipping
  // `isProcessingContinue`) re-applies `defaultValue` and forces a
  // re-layout → the "%" reappears, producing the user-observed "%
  // disappears after animation, comes back on Continue" bug.
  //
  // Lower tiers happened to mask this because their final-frame digit
  // counts (1 or 2 digits) fit within the layout established mid-
  // animation; only 100% triggered the LAST-frame width growth.
  // Splitting "%" out makes the rendered character count of the input
  // bounded (≤ 3) AND independent of the `%` glyph entirely, so the
  // bug can't recur for any tier.
  const pctDigitsProps = useAnimatedProps(() => ({
    text: `${Math.round(progress.value)}`,
    defaultValue: `${Math.round(progress.value)}`,
  }));

  // Wrapper width tracks digit count so the input stays just-wide-enough
  // for the current value. Without this, either:
  //   - Fixed minWidth (e.g. 95 to fit "100"): 1- and 2-digit cases left
  //     a large dead zone on one side (right-align stranded the "%" too
  //     far from small numbers; left-align stranded "%" far right).
  //   - No minWidth: iOS TextInput doesn't re-layout reliably on the
  //     UI-thread text update of the last frame, clipping "100" to "10".
  // Stepping the width with the digit count grows the wrapper exactly
  // when the text grows — visually they change in lockstep, "%" sits
  // immediately after the last digit at every value.
  const digitsWidthStyle = useAnimatedStyle(() => {
    const v = Math.round(progress.value);
    // Bounded-Black 32pt glyph widths: digit ≈ 28-30px. Round numbers
    // chosen empirically to fit each digit-count bucket without clip.
    const w = v < 10 ? 30 : v < 100 ? 60 : 90;
    return { width: w };
  });

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  const cardBg = colors[spec.scoreCardBg];
  const textColor = colors[spec.scoreCardText];
  const subTextColor = colors[spec.scoreCardSubText];
  const fillColor = colors[spec.progressFill];

  // 2x2 grid: top row = % + XP, bottom row = Final Score + Correct.
  // `alignItems: 'stretch'` makes both columns share the row's height,
  // and each column uses `justifyContent: 'space-between'` so the
  // bottom labels share a baseline.
  return (
    <View style={[styles.scoreCard, { backgroundColor: cardBg }]}>
      <View style={styles.scoreRow}>
        <View style={styles.scoreColLeft}>
          {/* Digits row — AnimatedTextInput drives the count-up via
              Reanimated's UI-thread `text` prop trick; static `<Text>`
              renders the "%" so it's always present regardless of the
              input's layout state. The `Animated.View` wrapper grows
              with the digit count (30 / 60 / 90 px) so "%" tracks the
              right edge of the digits at every value — no fixed
              minWidth dead zone, no clip on "100". */}
          {/* Animated wrapper drives the pop — transformOrigin lives
              on a static style key (RN 0.74+ supports it natively).
              popStyle only mutates `scale`, so the digit-count math
              underneath (digitsWidthStyle on the inner Animated.View)
              stays untouched. */}
          <Animated.View
            style={[styles.percentageRow, styles.percentagePopAnchor, popStyle]}
          >
            <Animated.View style={digitsWidthStyle}>
              <AnimatedTextInput
                editable={false}
                pointerEvents="none"
                animatedProps={pctDigitsProps as any}
                style={[styles.percentageText, styles.percentageDigitsInput, { color: textColor }]}
              />
            </Animated.View>
            <Text style={[styles.percentageText, { color: textColor }]}>%</Text>
          </Animated.View>
          <Typography
            family="onest"
            size="sm"
            weight="600"
            style={{ color: subTextColor }}
          >
            Final Score
          </Typography>
        </View>

        <View style={styles.scoreColRight}>
          <View style={styles.xpRow}>
            <Ionicons name="star" size={18} color={textColor} />
            <Typography
              family="onest"
              size="lg"
              weight="600"
              style={{ color: textColor, marginLeft: 6 }}
            >
              {totalPoints} XP
            </Typography>
          </View>
          <Typography
            family="onest"
            size="sm"
            weight="600"
            style={{ color: subTextColor }}
          >
            Correct: {correctAnswers}/{totalQuestions}
          </Typography>
        </View>
      </View>

      <View
        style={[styles.progressTrack, { backgroundColor: spec.progressTrack }]}
      >
        <Animated.View
          style={[
            styles.progressFill,
            { backgroundColor: fillColor },
            fillStyle,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scoreCard: {
    width: SCORE_CARD_WIDTH,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 22,
    borderRadius: 20,
    marginBottom: 22,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  scoreColLeft: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  scoreColRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  // Bounded display, 32px black. We render through TextInput (Reanimated
  // text-prop trick) so the count-up commits on the UI thread — multiline
  // / paddingTop / borders all reset to keep it visually identical to a
  // plain Text node. Shared by both the AnimatedTextInput (digits) and
  // the static <Text> ("%") so the two children sit on the same baseline
  // with identical font metrics.
  percentageText: {
    fontFamily: 'Bounded-Black',
    fontSize: 32,
    lineHeight: 36,
    padding: 0,
    margin: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  // Digits-only input — fills its `Animated.View` parent (whose width
  // is animated by `digitsWidthStyle` based on the live digit count).
  // No fixed minWidth here: parent owns sizing, input just stretches.
  percentageDigitsInput: {
    width: '100%',
  },
  percentageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  // transformOrigin '0% 100%' = bottom-left of the row. Matches the
  // mock's `transformOrigin: '0% 100%'` on `popNumber` so the digits
  // bump UP and to the RIGHT during the pop, keeping the leading "1"
  // visually anchored to its original screen position. RN 0.74+ supports
  // this style key natively; older RN ignored it (treated as identity
  // origin = center).
  percentagePopAnchor: {
    transformOrigin: '0% 100%',
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});
