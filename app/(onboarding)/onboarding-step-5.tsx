import React, { useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import {
  Typography,
  DepthButton,
  SpeechBubble,
  Typewriter,
  OptionList,
  colors,
  spacing,
} from '@/components/ui';
import { AnimatedEntrance } from '@/components/ui/animations';
import { Mascot } from '@/components/onboarding/Mascot/Mascot';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { useOnboardingStore, type InterestKey } from '@/stores/onboardingStore';

const INTEREST_OPTIONS: Array<{ id: InterestKey; label: string }> = [
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

  const canContinue = interests.length > 0;

  const goNext = () => {
    if (!canContinue || isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      setStep(6);
      // TODO Phase 2 continuation: route to /onboarding-step-6 when built
      router.back();
    }, EXIT_ANIMATION_MS);
  };

  const handleSkip = () => {
    router.push('/(auth)/archives-auth' as never);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <OnboardingHeader currentStep={5} totalSteps={14} onSkip={handleSkip} />

        <View style={styles.body}>
          {/* Phase A — Mascot + bubble slide in from left as one unit */}
          <AnimatedEntrance preset="slideFromLeft" delay={100}>
            <View style={styles.mascotRow}>
              <Mascot size={110} autoPlayEntrance={false} />

              <View style={styles.bubbleWrapper}>
                <SpeechBubble
                  borderWidth={1.5}
                  autoPlay={false}
                  fullWidth
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

              <View style={styles.optionsList}>
                <OptionList
                  options={INTEREST_OPTIONS}
                  selectionMode="multi"
                  value={interests}
                  onChange={(val) => setInterests((val ?? []) as InterestKey[])}
                  exitSignal={isExiting}
                  animateIn
                />
              </View>
            </View>
          )}

          <View style={styles.flex} />

          {/* Phase D — CONTINUE rises from below after options settle */}
          {typewriterDone && (
            <AnimatedEntrance preset="slideFromBottom" delay={CONTINUE_DELAY_AFTER_TYPEWRITER}>
              <View style={styles.bottom}>
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
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  optionsList: {
    minHeight: 320,
  },
  flex: { flex: 1 },
  bottom: { paddingBottom: spacing.lg },
});
