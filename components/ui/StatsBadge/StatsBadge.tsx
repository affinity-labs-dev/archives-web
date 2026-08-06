import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { Typography } from '@/components/ui/Typography';
import { colors } from '@/components/ui/theme';
import type { ColorKey } from '@/components/ui/theme';

export interface StatsBadgeProps {
  /** Left pill (dark blue by default). */
  leftLabel: string;
  leftIcon?: ReactNode;
  leftBackgroundColor?: ColorKey;
  leftTextColor?: ColorKey;

  /** Right pill (light blue by default). */
  rightLabel: string;
  rightIcon?: ReactNode;
  rightBackgroundColor?: ColorKey;
  rightTextColor?: ColorKey;

  /** Max container width. Default `350`. */
  maxWidth?: number;

  /** Height. Default `50`. */
  height?: number;

  /** Container style. */
  style?: StyleProp<ViewStyle>;
}

/**
 * StatsBadge — interlocking dual pills used on the learning path screen (screen 12).
 *
 * Left pill has pill-rounded left + square right corners, right pill mirrors it —
 * creating an interlocking two-tone look. Both support icons + text content.
 */
export function StatsBadge({
  leftLabel,
  leftIcon,
  leftBackgroundColor = 'bluePrimary',
  leftTextColor = 'snow',
  rightLabel,
  rightIcon,
  rightBackgroundColor = 'blueSecondary',
  rightTextColor = 'onyx',
  maxWidth = 350,
  height = 50,
  style,
}: StatsBadgeProps) {
  return (
    <View style={[styles.container, { maxWidth, height }, style]}>
      <View
        style={[
          styles.leftPill,
          {
            height,
            backgroundColor: colors[leftBackgroundColor],
          },
        ]}
      >
        {leftIcon}
        <Typography variant="heading.m" color={leftTextColor} letterSpacing={0.22}>
          {leftLabel}
        </Typography>
      </View>

      <View
        style={[
          styles.rightPill,
          {
            height,
            backgroundColor: colors[rightBackgroundColor],
          },
        ]}
      >
        {rightIcon}
        <Typography variant="label.xs" color={rightTextColor}>
          {rightLabel}
        </Typography>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 4,
  },
  leftPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 9,
    paddingRight: 16,
    borderTopLeftRadius: 15,
    borderBottomLeftRadius: 15,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
    gap: 12,
    zIndex: 1,
  },
  rightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingLeft: 23,
    paddingRight: 16,
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
    borderTopRightRadius: 15,
    borderBottomRightRadius: 15,
    gap: 11,
  },
});
