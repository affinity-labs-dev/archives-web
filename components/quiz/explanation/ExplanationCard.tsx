// ExplanationCard — single Q block on the lavender AI sheet. White (55%
// opacity) tile on the sheet surface with a 3px green/red status rail
// pinned to the left edge, a pill badge (Q1/Q2/Q3 + colored pip), an
// optional concept tag, the question, the answer comparison row and a
// lightbulb-prefixed AI explanation.
//
// Variants:
//   • normal   — full Q card (correct or wrong) with explanation
//   • peek     — locked Q2 teaser used in the free-tier paywall peek

import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Typography, colors } from '@/components/ui';

import type { ExplanationItem } from './types';

interface ExplanationCardProps {
  item: ExplanationItem;
  /** Locked peek variant (Q2 teaser behind the paywall). */
  isLockedPeek?: boolean;
}

export function ExplanationCard({ item, isLockedPeek }: ExplanationCardProps) {
  const isCorrect = item.isCorrect;

  const railColor = isLockedPeek
    ? 'rgba(26,26,26,0.12)'
    : isCorrect
      ? colors.correctSecondary
      : colors.incorrectSecondary;

  const pipBg = isLockedPeek
    ? 'rgba(26,26,26,0.35)'
    : isCorrect
      ? colors.correctSecondary
      : colors.incorrectSecondary;

  const pipIcon: keyof typeof Ionicons.glyphMap = isLockedPeek
    ? 'lock-closed'
    : isCorrect
      ? 'checkmark'
      : 'close';

  const answerColor = isCorrect
    ? colors.correctSecondary
    : colors.incorrectSecondary;

  return (
    <View style={styles.card}>
      <View style={[styles.statusRail, { backgroundColor: railColor }]} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.badge}>
            <View style={[styles.pip, { backgroundColor: pipBg }]}>
              <Ionicons name={pipIcon} size={9} color={colors.white} />
            </View>
            <Typography family="onest" size="xs" weight="700" color="onyx">
              Q{item.questionNumber}
            </Typography>
          </View>
          {item.concept && (
            <Typography
              family="onest"
              size="xs"
              weight="600"
              color="onyx"
              style={styles.concept}
            >
              {item.concept.toUpperCase()}
            </Typography>
          )}
        </View>

        <Typography
          family="onest"
          size="md"
          weight="700"
          color="onyx"
          style={styles.questionText}
        >
          {item.questionText}
        </Typography>

        {!isLockedPeek && (
          <View style={styles.answerRow}>
            <Typography
              family="onest"
              size="sm"
              weight="600"
              color="onyx"
              style={styles.answerLabel}
            >
              Your answer{' '}
            </Typography>
            <Typography
              family="onest"
              size="sm"
              weight="700"
              style={{ color: answerColor }}
            >
              {item.userAnswer}
            </Typography>
            {!isCorrect && (
              <>
                <View style={styles.dot} />
                <Typography
                  family="onest"
                  size="sm"
                  weight="600"
                  color="onyx"
                  style={styles.answerLabel}
                >
                  Correct{' '}
                </Typography>
                <Typography
                  family="onest"
                  size="sm"
                  weight="700"
                  style={{ color: colors.correctSecondary }}
                >
                  {item.correctAnswer}
                </Typography>
              </>
            )}
          </View>
        )}

        {!isLockedPeek &&
          (item.loading ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator size="small" color={colors.acaiSecondary} />
            </View>
          ) : item.error ? (
            <Typography
              family="onest"
              size="sm"
              weight="500"
              style={styles.errorText}
            >
              {item.error}
            </Typography>
          ) : item.aiExplanation ? (
            <View style={styles.explainRow}>
              <Ionicons
                name="bulb"
                size={14}
                color={colors.acaiSecondary}
                style={styles.bulb}
              />
              <Typography
                family="onest"
                size="sm"
                weight="500"
                color="onyx"
                style={styles.explainText}
              >
                {item.aiExplanation}
              </Typography>
            </View>
          ) : null)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 55% white tile floats on the lavender (#E5D4FF) sheet — gives the card
  // a soft "frosted" feel without needing a real blur on Android.
  card: {
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
  },
  // 3px tall colored rail pinned to the left edge — green for correct,
  // red for wrong, charcoal-grey for the locked peek.
  statusRail: {
    position: 'absolute',
    left: 0,
    top: 14,
    bottom: 14,
    width: 3,
    borderRadius: 2,
  },
  content: {
    paddingTop: 14,
    paddingRight: 16,
    paddingBottom: 16,
    paddingLeft: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 2,
    backgroundColor: colors.white,
    borderRadius: 999,
    height: 22,
    gap: 5,
  },
  pip: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  concept: {
    marginLeft: 10,
    opacity: 0.6,
    letterSpacing: 0.6,
    fontSize: 10.5,
  },
  questionText: {
    marginTop: 10,
    lineHeight: 19.5,
    letterSpacing: -0.15,
  },
  answerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    marginTop: 10,
  },
  answerLabel: {
    opacity: 0.65,
  },
  // Tiny dot separator between "Your answer X" and "Correct Y" on wrong
  // questions. Translated up by 3px so it sits on the text x-height.
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(26,26,26,0.3)',
    marginHorizontal: 10,
    transform: [{ translateY: -3 }],
    alignSelf: 'center',
  },
  explainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    gap: 10,
  },
  bulb: {
    marginTop: 3,
  },
  explainText: {
    flex: 1,
    lineHeight: 19.5,
    letterSpacing: -0.13,
  },
  errorText: {
    color: colors.incorrectSecondary,
    marginTop: 10,
  },
  loadingBlock: {
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
});
