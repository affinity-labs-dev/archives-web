import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import {
  SpeechBubble,
  Typewriter,
  colors,
  spacing,
} from '@/components/ui';
import { AnimatedEntrance } from '@/components/ui/animations';
import { Mascot } from '@/components/onboarding/Mascot/Mascot';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { useOnboardingStore, TOTAL_ONBOARDING_STEPS } from '@/stores/onboardingStore';
import { toDisplayStep } from '@/constants/OnboardingRoutes';
import { DailyGoalPhase } from '@/components/onboarding/personalize/DailyGoalPhase';
import { AgeGroupPhase } from '@/components/onboarding/personalize/AgeGroupPhase';
import { analyticsService } from '@/services/AnalyticsService';

type Phase = 10 | 11;

const EXIT_ANIMATION_MS = 700;
const TYPEWRITER_START_DELAY = 800;

const QUESTION_BY_PHASE: Record<Phase, string> = {
  10: "What's your daily learning goal?",
  11: 'What is your age group?',
};

/**
 * Screens 11–12 — merged personalize orchestrator.
 *
 * Persistent frame (mounts once, never re-animates on phase change):
 *   - OnboardingHeader (progress bar animates phase-driven via withTiming)
 *   - Mascot + SpeechBubble shell
 *
 * Transient inner content:
 *   - Typewriter is keyed by phase → unmounts + remounts with new text,
 *     so the mascot + bubble stay put but the message retypes.
 *   - Subtitle / OptionList / CTA live inside the phase body component,
 *     which remounts via `bodyKey` so their entrance animations replay
 *     once `typewriterDone` flips to true.
 *
 * CONTINUE tap timeline (step-5 pattern, adapted to internal phase swap):
 *   t=0      setIsExiting(true) → current OptionList runs left-slide
 *            cascade (translateX:-500, rotate:-8, opacity:0 with per-card
 *            stagger, 700ms total).
 *   t=700ms  batched setState: phase=target, bodyKey++, typewriterDone=false,
 *            isExiting=false. Phase body unmounts then remounts; typewriter
 *            remounts with the new question; options/CTA stay hidden until
 *            typewriterDone flips back.
 *
 * Back navigation (phase 12 → 11) mirrors the same cascade. Back on phase
 * 11 exits the route via `router.back()`.
 */
export default function OnboardingStep10Screen() {
  const setStep = useOnboardingStore((s) => s.setStep);
  const markSkipped = useOnboardingStore((s) => s.markSkipped);
  const [phase, setPhase] = useState<Phase>(10);
  const [isExiting, setIsExiting] = useState(false);
  const [bodyKey, setBodyKey] = useState(0);
  const [typewriterDone, setTypewriterDone] = useState(false);

  useEffect(() => {
    analyticsService.trackOnboardingStepViewed(phase === 10 ? 'daily_goal' : 'age_group');
  }, [phase]);

  // Recover from stale exit state when the user navigates back into this
  // screen. `handleAgeGroupDone` (forward nav) latches `isExiting=true` and
  // triggers OptionList's exit cascade — without this reset, on return all
  // gestures stay blocked and the option list remains animated off-screen.
  // Skipped on initial mount via the ref so the entrance plays only once.
  const hasFocusedOnceRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }
      setIsExiting(false);
      setBodyKey((k) => k + 1);
    }, []),
  );

  const handleTypewriterComplete = useCallback(() => setTypewriterDone(true), []);

  const runExitThen = (fn: () => void) => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(fn, EXIT_ANIMATION_MS);
  };

  const switchPhase = (target: Phase) => {
    runExitThen(() => {
      setStep(target);
      setPhase(target);
      setTypewriterDone(false);
      setIsExiting(false);
      setBodyKey((k) => k + 1);
    });
  };

  const handleDailyGoalDone = () => switchPhase(11);

  const handleAgeGroupDone = () => {
    runExitThen(() => {
      setStep(11);
      router.push('/onboarding-step-11' as never);
    });
  };

  const handleBack = () => {
    if (isExiting) return;
    if (phase === 11) switchPhase(10);
    else router.back();
  };

  const handleSkip = () => {
    if (isExiting) return;
    analyticsService.trackOnboardingSkipped(phase === 10 ? 'daily_goal' : 'age_group', 'soft_paywall');
    // Mark skipped so next app launch routes straight to tabs — user
    // explicitly bailed on personalization; don't resume mid-flow.
    markSkipped();
    router.push('/onboarding-step-13' as never);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <OnboardingHeader
          currentStep={toDisplayStep(phase)}
          totalSteps={TOTAL_ONBOARDING_STEPS}
          screenName={phase === 10 ? 'daily_goal' : 'age_group'}
          onBack={handleBack}
          onSkip={handleSkip}
        />

        <View style={styles.body}>
          {/* Mascot + bubble shell — mounts once, stays put. */}
          <AnimatedEntrance preset="slideFromLeft" delay={100}>
            <View style={styles.mascotRow}>
              <Mascot width={110} height={96} autoPlayEntrance={false} />

              <View style={styles.bubbleWrapper}>
                <SpeechBubble
                  borderWidth={1.5}
                  autoPlay={false}
                  tail={{ direction: 'left', offset: 0.4, depth: 10, size: 14 }}
                  padding={spacing.md}
                >
                  {/* Keyed by phase so text retypes when question changes. */}
                  <Typewriter
                    key={`tw-${phase}`}
                    text={QUESTION_BY_PHASE[phase]}
                    variant="body.m"
                    color="onyx"
                    startDelay={TYPEWRITER_START_DELAY}
                    onComplete={handleTypewriterComplete}
                  />
                </SpeechBubble>
              </View>
            </View>
          </AnimatedEntrance>

          {/* Phase body — subtitle/options/CTA. Remounts on phase swap
              via bodyKey so entrance animations replay. */}
          {phase === 10 && (
            <DailyGoalPhase
              key={`body-${bodyKey}`}
              typewriterDone={typewriterDone}
              exitSignal={isExiting}
              onNext={handleDailyGoalDone}
            />
          )}
          {phase === 11 && (
            <AgeGroupPhase
              key={`body-${bodyKey}`}
              typewriterDone={typewriterDone}
              exitSignal={isExiting}
              onNext={handleAgeGroupDone}
            />
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
});
