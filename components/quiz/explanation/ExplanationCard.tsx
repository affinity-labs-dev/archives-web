// ExplanationCard — single Q block: badge + question + "Your answer:"
// line + bulb + AI text. Used for both subscribed (3 stacked) and the
// Q1 preview for free users. `showDivider` draws a hairline below the
// card when it's not the last in a list.

import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Typography, colors } from '@/components/ui';

import type { ExplanationItem } from './types';

interface ExplanationCardProps {
  item: ExplanationItem;
  showDivider: boolean;
}

export function ExplanationCard({ item, showDivider }: ExplanationCardProps) {
  const answerColor = item.isCorrect
    ? colors.correctSecondary
    : colors.incorrectSecondary;

  return (
    <View style={styles.wrap}>
      <View style={styles.badge}>
        <Typography family="onest" size="xs" weight="600" color="onyx">
          Q{item.questionNumber}
        </Typography>
      </View>

      <Typography
        family="onest"
        size="md"
        weight="600"
        color="onyx"
        style={styles.question}
      >
        {item.questionText}
      </Typography>

      <View style={styles.answerRow}>
        <Typography family="onest" size="sm" weight="500" color="onyx">
          Your answer:{' '}
        </Typography>
        <Typography
          family="onest"
          size="sm"
          weight="500"
          style={{ color: answerColor }}
        >
          {item.userAnswer}
        </Typography>
      </View>

      {item.loading ? (
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
        <View style={styles.explanationRow}>
          <Ionicons
            name="bulb"
            size={18}
            color={colors.acaiSecondary}
            style={styles.bulbIcon}
          />
          <Typography
            family="onest"
            size="md"
            weight="400"
            color="onyx"
            style={styles.explanationText}
          >
            {item.aiExplanation}
          </Typography>
        </View>
      ) : null}

      {showDivider && <View style={styles.divider} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.snow,
    borderRadius: 12.5,
    paddingHorizontal: 11,
    paddingVertical: 4,
    marginBottom: 12,
  },
  question: {
    marginBottom: 10,
  },
  answerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  explanationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
  bulbIcon: {
    marginTop: 2,
  },
  explanationText: {
    flex: 1,
    marginLeft: 12,
    lineHeight: 22,
  },
  errorText: {
    color: colors.incorrectSecondary,
  },
  loadingBlock: {
    paddingVertical: 12,
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(26,26,26,0.18)',
    marginTop: 16,
  },
});
