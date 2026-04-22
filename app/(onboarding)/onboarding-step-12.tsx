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
import { useOnboardingStore, type AgeGroup } from '@/stores/onboardingStore';

const AGE_OPTIONS: Array<{ id: AgeGroup; label: string }> = [
  { id: '13-17', label: '13-17' },
  { id: '18-24', label: '18-24' },
  { id: '25-34', label: '25-34' },
  { id: '35-44', label: '35-44' },
  { id: '45+', label: '45+' },
];

const TYPEWRITER_START_DELAY = 800;
const CONTINUE_DELAY_AFTER_TYPEWRITER = 1000;

/**
 * Screen 12 — Age group (single-select).
 *
 * Figma: 3282:8051. Mirrors step-11 layout. Five options mapped to the
 * Zustand `ageGroup` field.
 */
export default function OnboardingStep12Screen() {
  const ageGroup = useOnboardingStore((s) => s.ageGroup);
  const setAgeGroup = useOnboardingStore((s) => s.setAgeGroup);
  const setStep = useOnboardingStore((s) => s.setStep);
  const [typewriterDone, setTypewriterDone] = useState(false);

  const canContinue = ageGroup !== null;

  const goNext = () => {
    if (!canContinue) return;
    setStep(13);
    router.push('/onboarding-step-13' as never);
  };

  const handleSkip = () => {
    router.push('/(auth)/archives-auth' as never);
  };

  const handleChange = (val: string | string[] | null) => {
    if (typeof val === 'string') {
      setAgeGroup(val as AgeGroup);
    } else {
      setAgeGroup(null);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <OnboardingHeader currentStep={12} totalSteps={14} onSkip={handleSkip} />

        <View style={styles.body}>
          <AnimatedEntrance preset="slideFromLeft" delay={100}>
            <View style={styles.mascotRow}>
              <Mascot size={96} autoPlayEntrance={false} />

              <View style={styles.bubbleWrapper}>
                <SpeechBubble
                  borderWidth={1.5}
                  autoPlay={false}
                  tail={{ direction: 'left', offset: 0.4, depth: 10, size: 14 }}
                  padding={spacing.md}
                >
                  <Typewriter
                    text="What is your age group?"
                    variant="body.m"
                    color="onyx"
                    startDelay={TYPEWRITER_START_DELAY}
                    onComplete={() => setTypewriterDone(true)}
                  />
                </SpeechBubble>
              </View>
            </View>
          </AnimatedEntrance>

          {typewriterDone && (
            <View style={styles.optionsSection}>
              <AnimatedEntrance preset="slideFromRight">
                <Typography size="md" weight="600" color="onyx">
                  This helps us tailor your experience.
                </Typography>
              </AnimatedEntrance>

              <View style={styles.optionsList}>
                <OptionList
                  options={AGE_OPTIONS}
                  selectionMode="single"
                  value={ageGroup}
                  onChange={handleChange}
                  animateIn
                />
              </View>
            </View>
          )}

          <View style={styles.flex} />

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
