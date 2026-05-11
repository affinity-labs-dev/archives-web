import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { router } from 'expo-router';
import type { StyleProp, ViewStyle } from 'react-native';

import { ProgressBar, Typography, spacing } from '@/components/ui';
import { colors, type ColorKey } from '@/components/ui/theme';
import { backArrowSvg } from './icons/backArrowSvg';
import { analyticsService } from '@/services/AnalyticsService';

export interface OnboardingHeaderProps {
  /** 1-indexed current step. */
  currentStep: number;

  /** Total steps in the flow (for percent calc). */
  totalSteps: number;

  /** Screen name for analytics tracking. */
  screenName?: string;

  /** Skip press handler. Hidden if undefined AND `showSkip` false. */
  onSkip?: () => void;

  /** Back press handler. Defaults to `router.back()`. */
  onBack?: () => void;

  /** Show skip button. Default `true`. */
  showSkip?: boolean;

  /** Show back button. Default `true`. */
  showBack?: boolean;

  /** Progress bar track color token. Default `'acaiTertiary'`. */
  trackColor?: ColorKey;

  /** Progress bar fill color token. Default `'onyx'`. */
  fillColor?: ColorKey;

  /** Back arrow + skip text color token. Default `'onyx'`. */
  foregroundColor?: ColorKey;

  style?: StyleProp<ViewStyle>;
}

/**
 * OnboardingHeader — shared top bar for onboarding screens 3+.
 *
 * Layout: [back] [progress bar] [Skip]
 *
 * Figma: 5px progress bar, 1.5px back chevron at 10×18, Skip at 20px medium.
 */
export function OnboardingHeader({
  currentStep,
  totalSteps,
  screenName,
  onSkip,
  onBack,
  showSkip = true,
  showBack = true,
  trackColor = 'acaiTertiary',
  fillColor = 'onyx',
  foregroundColor = 'onyx',
  style,
}: OnboardingHeaderProps) {
  const percent = Math.max(0, Math.min(100, (currentStep / totalSteps) * 100));
  const handleBack = onBack ?? (() => router.back());
  const fg = colors[foregroundColor];

  const wrappedBack = () => {
    if (screenName) analyticsService.trackOnboardingBackTapped(screenName);
    handleBack();
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.sideSlot}>
        {showBack && (
          <Pressable onPress={wrappedBack} hitSlop={16}>
            <SvgXml xml={backArrowSvg} width={18} height={22} />
          </Pressable>
        )}
      </View>

      <View style={styles.progressWrapper}>
        <ProgressBar
          percent={percent}
          height={5}
          trackColor={trackColor}
          fillColor={fillColor}
        />
      </View>

      <View style={[styles.sideSlot, styles.sideSlotRight]}>
        {showSkip && (
          <Pressable onPress={onSkip} hitSlop={16}>
            <Typography variant="label.m" extraColor={fg}>
              Skip
            </Typography>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    minHeight: 28,
  },
  sideSlot: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideSlotRight: {
    alignItems: 'flex-end',
  },
  progressWrapper: {
    flex: 1,
  },
});
