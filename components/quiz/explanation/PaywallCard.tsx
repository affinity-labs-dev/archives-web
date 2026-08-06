// PaywallCard — free-tier paywall on the lavender AI sheet. Blue surface
// (blueSecondary) with an Ibu mascot avatar, locked-count title, white
// inner benefits panel with check pips, full-width UPGRADE CTA, and a
// "Already a member? Restore" link below.

import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';

import { DepthButton, Typography, colors } from '@/components/ui';
import { ibuFaceSvg } from '@/components/onboarding/Mascot/ibuFaceSvg';

interface PaywallCardProps {
  /** Total number of questions in the quiz (used in the title copy). */
  questionsCount: number;
  onUpgrade: () => void;
  onRestore?: () => void;
}

const BENEFITS = [
  'See why each answer was right (or wrong)',
  'Ask Ibu follow-ups on anything you missed',
  'Personalized takeaways for every quiz',
];

export function PaywallCard({
  questionsCount,
  onUpgrade,
  onRestore,
}: PaywallCardProps) {
  // The user has already seen Q1; remaining is everything still gated.
  const remaining = Math.max(0, questionsCount - 1);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.avatar}>
          <SvgXml xml={ibuFaceSvg} width={28} height={28} />
        </View>
        <View style={styles.headText}>
          <Typography
            family="onest"
            size="md"
            weight="700"
            style={styles.title}
          >
            Unlock all {questionsCount} explanations
          </Typography>
          <Typography
            family="onest"
            size="xs"
            weight="600"
            style={styles.subtitle}
          >
            {remaining} more {remaining === 1 ? 'answer' : 'answers'} waiting
            below
          </Typography>
        </View>
      </View>

      <View style={styles.benefits}>
        {BENEFITS.map((label) => (
          <View key={label} style={styles.benefitRow}>
            <View style={styles.plus}>
              <Ionicons name="checkmark" size={9} color={colors.white} />
            </View>
            <Typography
              family="onest"
              size="xs"
              weight="600"
              color="onyx"
              style={styles.benefitText}
            >
              {label}
            </Typography>
          </View>
        ))}
      </View>

      <DepthButton
        variant="secondary"
        size="medium"
        onPress={onUpgrade}
        haptic="medium"
        style={styles.cta}
      >
        <Typography family="onest" size="lg" weight="700" color="white">
          UPGRADE
        </Typography>
      </DepthButton>

      <TouchableOpacity onPress={onRestore || onUpgrade} activeOpacity={0.7}>
        <Typography
          family="onest"
          size="xs"
          weight="500"
          style={styles.restore}
        >
          Already a member? Restore
        </Typography>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // Blue (#A2C5FF) surface — reads as "Affinity blue" against the
  // lavender sheet without competing with the purple UPGRADE CTA.
  card: {
    backgroundColor: colors.blueSecondary,
    borderRadius: 20,
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // Cream circle holds the Ibu face SVG — same mascot used across
  // onboarding screens 3, 5, 8, 9, 10 for visual consistency.
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FAF3DA',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headText: {
    flex: 1,
  },
  title: {
    color: colors.bluePrimary,
    letterSpacing: -0.15,
    lineHeight: 18,
  },
  subtitle: {
    color: colors.bluePrimary,
    opacity: 0.75,
    letterSpacing: -0.12,
    marginTop: 2,
  },
  // Inner white panel — visually separates the value props from the
  // header so the whole card reads "title + 3 reasons + CTA".
  benefits: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 12,
    gap: 0,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    gap: 10,
  },
  plus: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.acaiSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
    letterSpacing: -0.13,
    fontSize: 12.5,
  },
  cta: {
    marginTop: 12,
  },
  restore: {
    color: colors.bluePrimary,
    textAlign: 'center',
    marginTop: 8,
  },
});
