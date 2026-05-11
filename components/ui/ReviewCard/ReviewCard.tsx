import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { Typography } from '@/components/ui/Typography';
import { colors } from '@/components/ui/theme';
import type { ColorKey } from '@/components/ui/theme';

export interface ReviewCardProps {
  /** Reviewer name. */
  name: string;

  /** Review body text. */
  review: string;

  /** Rating slot — pass a <Stars /> SVG or custom component. */
  rating?: ReactNode;

  /** Background color token. Default `'blueSecondary'`. */
  backgroundColor?: ColorKey;

  /** Name text color. Default `'black'`. */
  nameColor?: ColorKey;

  /** Body text color. Default `'black'`. */
  bodyColor?: ColorKey;

  /** Container style. */
  style?: StyleProp<ViewStyle>;
}

/**
 * ReviewCard — testimonial card used on screen 6 (social proof).
 *
 * Exact dimensions from Figma: radius 19, padding 11/13/20/21, max width 358.
 */
export function ReviewCard({
  name,
  review,
  rating,
  backgroundColor = 'blueSecondary',
  nameColor = 'black',
  bodyColor = 'black',
  style,
}: ReviewCardProps) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors[backgroundColor],
        },
        style,
      ]}
    >
      <View style={styles.header}>
        <Typography variant="label.m" color={nameColor}>
          {name}
        </Typography>
        {rating}
      </View>
      <Typography variant="body.s" color={bodyColor} lineHeight={22}>
        {review}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 19,
    paddingTop: 11,
    paddingBottom: 13,
    paddingLeft: 20,
    paddingRight: 21,
    gap: 10,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
