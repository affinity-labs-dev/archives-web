// PaywallCard — free-tier overlay matching Figma 3527:6460. Light-blue
// surface (no border), white inner feature box with star-bullet sparkles,
// full-width UPGRADE DepthButton, restore-purchase link.

import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';

import { DepthButton, Typography, colors } from '@/components/ui';

import { starBulletSvg } from '../icons/starBulletSvg';

interface PaywallCardProps {
  questionsCount: number;
  onUpgrade: () => void;
}

const FEATURES = [
  'AI explanations for every question',
  'Understand your mistakes deeply',
  'Personalized study tips',
  'Unlimited quiz attempts',
];

export function PaywallCard({ questionsCount, onUpgrade }: PaywallCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons name="lock-closed" size={20} color={colors.onyx} />
        <Typography
          family="onest"
          size="lg"
          weight="600"
          color="onyx"
          style={styles.title}
        >
          Unlock All Explanations
        </Typography>
      </View>

      <Typography
        family="onest"
        size="sm"
        weight="500"
        color="onyx"
        style={styles.subtitle}
      >
        You are seeing a preview of Q1. Upgrade to get explanations for all{' '}
        {questionsCount} questions.
      </Typography>

      <View style={styles.featureBox}>
        {FEATURES.map((label) => (
          <View key={label} style={styles.featureRow}>
            <SvgXml
              xml={starBulletSvg}
              width={14}
              height={14}
              style={styles.featureIcon}
            />
            <Typography
              family="onest"
              size="xs"
              weight="500"
              color="onyx"
              style={styles.featureText}
            >
              {label}
            </Typography>
          </View>
        ))}
      </View>

      {/* Full-width UPGRADE button — DepthButton's `isFullWidth` default
          stretches to the parent's content box. No outer padding wrapper
          so it matches the feature box's width edge-to-edge (Figma
          3527:6487). */}
      <DepthButton
        variant="secondary"
        size="large"
        onPress={onUpgrade}
        haptic="medium"
        style={styles.cta}
      >
        <Typography family="onest" size="lg" weight="700" color="white">
          UPGRADE
        </Typography>
      </DepthButton>

      <TouchableOpacity onPress={onUpgrade} activeOpacity={0.7}>
        <Typography
          family="onest"
          size="xs"
          weight="500"
          color="onyx"
          style={styles.restore}
        >
          Already subscribed? Restore purchase
        </Typography>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // Light-blue surface, NO border. Figma's 0.1px border is effectively
  // invisible at native render so we drop it — fewer paint ops on
  // Android, cleaner look without the dark hairline.
  card: {
    backgroundColor: colors.blueSecondary,
    borderRadius: 17,
    padding: 16,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  title: {
    flex: 1,
  },
  subtitle: {
    marginBottom: 16,
    lineHeight: 20,
  },
  // Inner white card holds the feature list (Figma 3527:6477).
  featureBox: {
    backgroundColor: colors.snow,
    borderRadius: 17,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    marginRight: 12,
  },
  featureText: {
    flex: 1,
    lineHeight: 18,
  },
  cta: {
    marginBottom: 12,
  },
  restore: {
    textAlign: 'center',
  },
});
