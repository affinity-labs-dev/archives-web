// ScoreCard — animated 2x2 grid showing percentage / XP / labels +
// progress bar. Count-up + bar fill driven by a single shared value
// so digit and bar animate together. Text uses the AnimatedTextInput
// trick (Reanimated `useAnimatedProps`) — digits commit on the UI
// thread, no JS round-trip.

import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
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
  }, [percentage, progress]);

  const pctTextProps = useAnimatedProps(() => ({
    text: `${Math.round(progress.value)}%`,
    defaultValue: `${Math.round(progress.value)}%`,
  }));

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
          <AnimatedTextInput
            editable={false}
            pointerEvents="none"
            animatedProps={pctTextProps as any}
            style={[styles.percentageText, { color: textColor }]}
          />
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
  // plain Text node.
  percentageText: {
    fontFamily: 'Bounded-Black',
    fontSize: 32,
    lineHeight: 36,
    padding: 0,
    margin: 0,
    minWidth: 100,
    includeFontPadding: false,
    textAlignVertical: 'center',
    marginBottom: 4,
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
