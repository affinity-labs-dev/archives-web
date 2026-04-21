import React from 'react';
import { View, StyleSheet, StatusBar, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { Image } from 'expo-image';
import { router } from 'expo-router';

import {
  Typography,
  DepthButton,
  ReviewCard,
  colors,
  spacing,
  easings,
} from '@/components/ui';
import { AnimatedEntrance } from '@/components/ui/animations';
import { backArrowSvg } from '@/components/onboarding/icons/backArrowSvg';
import { starsSvg } from '@/components/onboarding/icons/starsSvg';
import { useOnboardingStore } from '@/stores/onboardingStore';

/**
 * Hardcoded testimonials. Names + reviews sourced from product team.
 * Star rating is universally 5 — rendered as a single SVG rather than dynamic
 * per-card since the design is identical across rows.
 */
const REVIEWS = [
  {
    name: 'Hana',
    review:
      "My 6 year old daughter insists to sit with me on Archives, we love questioning each other even long after finishing each day's lesson",
  },
  {
    name: 'Mohammed',
    review:
      'A very informative app with excellent visuals, perfect for kids! They love the daily story and listening along',
  },
  {
    name: 'Sumayah',
    review:
      'The best Islamic stories and history app out there! We loved the Prophets Eras and learning about all the Prophets',
  },
  {
    name: 'Hala',
    review:
      'I love this app! Very simple and easy to follow stories with visuals. I downloaded it for my kids but now I love going through the stories',
  },
  {
    name: 'Mostafa',
    review:
      "This app is the easiest way to learn Islamic history. Its a true gem for anyone passionate about learning about their heritage",
  },
  {
    name: 'Sarah',
    review:
      'Highly recommended for students, researchers, and anyone who values spending time productively',
  },
  {
    name: 'Abdul',
    review:
      'I only learned about Marco Polo in school and never about Ibn Battuta, Archives allows me to change that for my children',
  },
  {
    name: 'Fatimah',
    review:
      'The quizzes and stories and achievements all make it very engaging for me and my students to use. Highly recommend!',
  },
  {
    name: 'Rashid',
    review:
      'The daily story is a great way to keep engaged about Islamic history and only takes me 5 minutes a day.',
  },
  {
    name: 'Ali',
    review:
      'This app is a game changer! It keeps me interested throughout the week and reminds me to stay focused on what really matters.',
  },
];

/**
 * Screen 6 — Social proof / testimonials.
 *
 * Figma: 3313:7115. DEVELOPER_INSTRUCTIONS specifies 3 staggered entrances:
 *   Header    — y: -20 → 0, opacity 0 → 1, 500ms, power2.out, delay 0
 *   Reviews   — y:  30 → 0, opacity 0 → 1, 500ms, power2.out, delay 200
 *   Button    — y:  50 → 0, opacity 0 → 1, 500ms, back.out(1.5), delay 400
 *
 * No progress bar or skip — this is a moment screen, not a question. Back
 * button only. The review list is fully scrollable and reveals +350K lessons
 * completed / 4.9 avg rating stats baked into two SVG badges above the list.
 */
const avgRatingBadge = require('@/assets/images/average-rating.png');
const lessonsCompletedBadge = require('@/assets/images/lessons-completed.png');

export default function OnboardingStep6Screen() {
  const setStep = useOnboardingStore((s) => s.setStep);

  const goNext = () => {
    setStep(7);
    router.push('/onboarding-step-7' as never);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={16}>
            <SvgXml xml={backArrowSvg} width={12} height={22} />
          </Pressable>
        </View>

        {/* Header block — title + stats badges */}
        <AnimatedEntrance
          preset={{
            translateY: { from: -20, to: 0 },
            opacity: { from: 0, to: 1 },
            duration: 500,
            easing: easings.power2Out,
          }}
        >
          <View style={styles.titleBlock}>
            <Typography
              family="bounded"
              size={28}
              lineHeight={42}
              color="black"
              align="center"
              uppercase
            >
              {'Join over 50,000\nLearners today'}
            </Typography>
          </View>

          <View style={styles.statsRow}>
            <Image source={avgRatingBadge} style={styles.statBadge} contentFit="contain" />
            <Image
              source={lessonsCompletedBadge}
              style={styles.statBadge}
              contentFit="contain"
            />
          </View>
        </AnimatedEntrance>

        {/* Scrollable review list */}
        <AnimatedEntrance
          preset={{
            translateY: { from: 30, to: 0 },
            opacity: { from: 0, to: 1 },
            duration: 500,
            easing: easings.power2Out,
          }}
          delay={200}
          style={styles.reviewsWrapper}
        >
          <ScrollView
            contentContainerStyle={styles.reviewsContent}
            showsVerticalScrollIndicator={false}
          >
            {REVIEWS.map((r) => (
              <ReviewCard
                key={r.name}
                name={r.name}
                review={r.review}
                rating={<SvgXml xml={starsSvg} width={132} height={18} />}
              />
            ))}
          </ScrollView>
        </AnimatedEntrance>

        {/* CONTINUE button */}
        <AnimatedEntrance
          preset={{
            translateY: { from: 50, to: 0 },
            opacity: { from: 0, to: 1 },
            duration: 500,
            easing: easings.backOut15,
          }}
          delay={400}
          style={styles.bottom}
        >
          <DepthButton
            surfaceColor="onyx"
            shadowColor="white"
            borderColor="onyx"
            onPress={goNext}
          >
            <Typography variant="label.m" color="white">
              CONTINUE
            </Typography>
          </DepthButton>
        </AnimatedEntrance>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.snow },
  safe: { flex: 1 },
  topBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  titleBlock: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl,
    paddingTop: spacing.xl,
  },
  statBadge: {
    width: 149,
    height: 97,
  },
  reviewsWrapper: {
    flex: 1,
    marginTop: spacing.xl,
  },
  reviewsContent: {
    paddingHorizontal: 18,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  bottom: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
});
