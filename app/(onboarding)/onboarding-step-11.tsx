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
import {
  useOnboardingStore,
  type DailyGoalMinutes,
} from '@/stores/onboardingStore';

const DAILY_GOAL_OPTIONS: Array<{ id: string; label: string; minutes: DailyGoalMinutes }> = [
  { id: '5', label: '5 min / day \u2022 Casual', minutes: 5 },
  { id: '10', label: '10 min / day \u2022 Regular', minutes: 10 },
  { id: '15', label: '15 min / day \u2022 Serious', minutes: 15 },
  { id: '20', label: '20 min / day \u2022 Intense', minutes: 20 },
];

const TYPEWRITER_START_DELAY = 800;
const CONTINUE_DELAY_AFTER_TYPEWRITER = 900;

/**
 * Screen 11 — Daily learning goal (single-select).
 *
 * Figma: 3710:5793. Same mascot + bubble + OptionList template as step-5
 * (interests), but `selectionMode="single"`. Four options map to concrete
 * minute values stored in the Zustand `dailyGoalMinutes` field.
 */
export default function OnboardingStep11Screen() {
  const dailyGoalMinutes = useOnboardingStore((s) => s.dailyGoalMinutes);
  const setDailyGoal = useOnboardingStore((s) => s.setDailyGoal);
  const setStep = useOnboardingStore((s) => s.setStep);
  const [typewriterDone, setTypewriterDone] = useState(false);

  const canContinue = dailyGoalMinutes !== null;

  const goNext = () => {
    if (!canContinue) return;
    setStep(12);
    router.push('/onboarding-step-12' as never);
  };

  const handleSkip = () => {
    router.push('/(auth)/archives-auth' as never);
  };

  const handleChange = (val: string | string[] | null) => {
    if (typeof val === 'string') {
      const match = DAILY_GOAL_OPTIONS.find((o) => o.id === val);
      setDailyGoal(match ? match.minutes : null);
    } else {
      setDailyGoal(null);
    }
  };

  const selectedId = dailyGoalMinutes !== null ? String(dailyGoalMinutes) : null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <OnboardingHeader currentStep={11} totalSteps={14} onSkip={handleSkip} />

        <View style={styles.body}>
          {/* Phase A — Mascot + bubble slide in as one unit */}
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
                    text="What's your daily learning goal?"
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
                  This helps us personalize your plan.
                </Typography>
              </AnimatedEntrance>

              <View style={styles.optionsList}>
                <OptionList
                  options={DAILY_GOAL_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
                  selectionMode="single"
                  value={selectedId}
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
    minHeight: 240,
  },
  flex: { flex: 1 },
  bottom: { paddingBottom: spacing.lg },
});
