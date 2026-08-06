import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import {
  Typography,
  DepthButton,
  ScrollFade,
  SpeechBubble,
  Typewriter,
  OptionList,
  colors,
  spacing,
} from '@/components/ui';
import { AnimatedEntrance } from '@/components/ui/animations';
import { MascotSlot, useMascotPresence } from '@/components/onboarding/Mascot';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { useOnboardingStore, type InterestKey } from '@/stores/onboardingStore';
import { analyticsService } from '@/services/AnalyticsService';

const INTEREST_OPTIONS: { id: InterestKey; label: string }[] = [
  { id: 'fun', label: 'Just for fun' },
  { id: 'heritage', label: 'Connect with heritage' },
  { id: 'children', label: 'Teach my children' },
  { id: 'productive', label: 'Spend time productively' },
  { id: 'other', label: 'Other' },
];

const EXIT_ANIMATION_MS = 700;
const TYPEWRITER_START_DELAY = 800;
// Subtitle slides from right in 550ms starting at 0ms;
// options stagger 80ms × 5 items + 550ms duration ≈ 950ms total.
// CONTINUE appears after options settle.
const CONTINUE_DELAY_AFTER_TYPEWRITER = 1000;

/**
 * Screen 5 — Interests multi-select.
 *
 * Sequential animation phases:
 *   A. Mascot + SpeechBubble slide in from left as a group.
 *   B. Typewriter reveals question after slide settles.
 *   C. Subtitle ("Pick as many as you like") slides in from right in sync with
 *      option cards (OptionList's built-in right-slide stagger). They share the
 *      same entrance direction + easing family so they read as one motion.
 *   D. CONTINUE slides up from below after all options have settled.
 *
 * On CONTINUE press: `exitSignal` triggers OptionList's left-slide exit cascade
 * (~700ms), then route pushes forward.
 */
export default function OnboardingStep5Screen() {
  const interests = useOnboardingStore((s) => s.interests);
  const setInterests = useOnboardingStore((s) => s.setInterests);
  const setStep = useOnboardingStore((s) => s.setStep);
  const [typewriterDone, setTypewriterDone] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useMascotPresence();

  useEffect(() => {
    analyticsService.trackOnboardingStepViewed('interests');
  }, []);
  // Remount key for OptionList — bumped on every focus so that returning from
  // a pushed screen (e.g., step-6) replays the entrance stagger. Needed because
  // `exitSignal` moves cards to translateX: -500 one-way; flipping it back to
  // false doesn't revert position.
  const [optionsKey, setOptionsKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setIsExiting(false);
      setOptionsKey((k) => k + 1);
    }, []),
  );

  const canContinue = interests.length > 0;

  const goNext = () => {
    if (!canContinue || isExiting) return;
    analyticsService.trackOnboardingInterestsSelected(interests, interests.length);
    setIsExiting(true);
    setTimeout(() => {
      setStep(6);
      router.push('/onboarding-step-6' as never);
    }, EXIT_ANIMATION_MS);
  };

  const handleSkip = () => {
    analyticsService.trackOnboardingSkipped('interests', 'create_account');
    router.push('/onboarding-step-7' as never);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <OnboardingHeader currentStep={5} totalSteps={12} screenName="interests" onSkip={handleSkip} />

        <View style={styles.body}>
          {/* Phase A — Mascot + bubble slide in from left as one unit */}
          <AnimatedEntrance preset="slideFromLeft" delay={100}>
            <View style={styles.mascotRow}>
              <MascotSlot />

              <View style={styles.bubbleWrapper}>
                <SpeechBubble
                  borderWidth={1.5}
                  autoPlay={false}
                  tail={{ direction: 'left', offset: 0.4, depth: 10, size: 14 }}
                  padding={spacing.md}
                >
                  {/* Phase B — typewriter starts after slide settles */}
                  <Typewriter
                    text="Why are you interested in Islamic history?"
                    variant="body.m"
                    color="onyx"
                    startDelay={TYPEWRITER_START_DELAY}
                    onComplete={() => setTypewriterDone(true)}
                  />
                </SpeechBubble>
              </View>
            </View>
          </AnimatedEntrance>

          {/* Phase C — subtitle + options slide in from right together */}
          {typewriterDone && (
            <View style={styles.optionsSection}>
              <AnimatedEntrance preset="slideFromRight">
                <Typography size="md" weight="600" color="onyx">
                  Pick as many as you like.
                </Typography>
              </AnimatedEntrance>

              <ScrollView
                style={styles.optionsScroll}
                contentContainerStyle={styles.optionsScrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <OptionList
                  key={optionsKey}
                  options={INTEREST_OPTIONS}
                  selectionMode="multi"
                  value={interests}
                  onChange={(val) => setInterests((val ?? []) as InterestKey[])}
                  exitSignal={isExiting}
                  animateIn
                />
              </ScrollView>
            </View>
          )}

          {/* Phase D — CONTINUE rises from below after options settle */}
          {typewriterDone && (
            <AnimatedEntrance preset="slideFromBottom" delay={CONTINUE_DELAY_AFTER_TYPEWRITER}>
              <View style={styles.bottom}>
                {/* Soft fade-out — masks the hard horizontal edge where
                    the OptionList's last visible row meets the CONTINUE
                    slot. Same pattern used by the personalize phases
                    and the quiz screen. */}
                <ScrollFade color={colors.snow} />
                <DepthButton
                  surfaceColor="onyx"
                  shadowColor="white"
                  borderColor="onyx"
                  onPress={goNext}
                  isDisabled={!canContinue}
                >
                  <Typography variant="label.m" color="white">
                    CONTINUE
                  </Typography>
                </DepthButton>
              </View>
            </AnimatedEntrance>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.snow },
  safe: { flex: 1 },
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  mascotRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bubbleWrapper: {
    flex: 1,
    paddingTop: spacing.md,
  },
  optionsSection: {
    flex: 1,
    marginTop: spacing.xl,
    gap: spacing.md,
    minHeight: 0,
  },
  // Bleed out to the screen edges so OptionList's entrance (slide from
  // right) and exit (slide to x:-500) aren't clipped at the body's
  // spacing.lg horizontal padding. paddingHorizontal in the content
  // container restores the visual x position of the cards.
  optionsScroll: {
    flex: 1,
    marginHorizontal: -spacing.lg,
  },
  optionsScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  bottom: { paddingBottom: spacing.lg },
});
