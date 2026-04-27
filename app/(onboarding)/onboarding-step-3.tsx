import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import {
  Typography,
  DepthButton,
  SpeechBubble,
  Typewriter,
  colors,
  spacing,
} from '@/components/ui';
import { AnimatedEntrance } from '@/components/ui/animations';
import { Mascot } from '@/components/onboarding/Mascot/Mascot';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { useOnboardingStore } from '@/stores/onboardingStore';

const MAX_NAME_LENGTH = 7;
const TYPEWRITER_START_DELAY = 800;

/**
 * Screen 3 — Name input.
 *
 * Sequential animation phases:
 *   A. Mascot + SpeechBubble slide in together from left (group).
 *   B. After slide completes, Typewriter reveals "What's your name?".
 *   C. After typewriter completes, input card slides up from below.
 *   D. Shortly after, CONTINUE button slides up from below.
 *
 * Mascot's internal entrance is disabled so the group moves as one unit via
 * the outer AnimatedEntrance. Render-gating on `typewriterDone` ensures later
 * phases only mount after earlier ones finish — simpler than orchestrating
 * one giant animation timeline.
 */
export default function OnboardingStep3Screen() {
  const name = useOnboardingStore((s) => s.name);
  const setName = useOnboardingStore((s) => s.setName);
  const setStep = useOnboardingStore((s) => s.setStep);
  const [typewriterDone, setTypewriterDone] = useState(false);

  const canContinue = name.trim().length > 0;

  const goNext = () => {
    if (!canContinue) return;
    setStep(4);
    router.push('/onboarding-step-4' as never);
  };

  const handleSkip = () => {
    router.push('/onboarding-step-7' as never);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <OnboardingHeader currentStep={3} totalSteps={12} onSkip={handleSkip} />

        <KeyboardAvoidingView
          style={styles.body}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={16}
        >
          {/* Phase A — Mascot + bubble slide in from left as one unit */}
          <AnimatedEntrance preset="slideFromLeft" delay={100}>
            <View style={styles.mascotRow}>
              <Mascot size={110} autoPlayEntrance={false} />

              <View style={styles.bubbleWrapper}>
                <SpeechBubble
                  borderWidth={1.5}
                  autoPlay={false}
                  tail={{ direction: 'left', offset: 0.4, depth: 10, size: 14 }}
                  padding={spacing.md}
                >
                  {/* Phase B — typewriter starts after slide completes */}
                  <Typewriter
                    text="What's your name?"
                    variant="body.m"
                    color="onyx"
                    startDelay={TYPEWRITER_START_DELAY}
                    onComplete={() => setTypewriterDone(true)}
                  />
                </SpeechBubble>
              </View>
            </View>
          </AnimatedEntrance>

          {/* Phase C — input card rises from below */}
          {typewriterDone && (
            <AnimatedEntrance preset="slideFromBottom" style={styles.inputWrapper}>
              <View style={styles.inputCard}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your first name"
                  placeholderTextColor={colors.onyx}
                  maxLength={MAX_NAME_LENGTH}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="done"
                  style={styles.input}
                />
              </View>
            </AnimatedEntrance>
          )}

          <View style={styles.flex} />

          {/* Phase D — CONTINUE rises from below, slightly after input */}
          {typewriterDone && (
            <AnimatedEntrance preset="slideFromBottom" delay={300}>
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
        </KeyboardAvoidingView>
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
  inputWrapper: {
    marginTop: spacing.xxxl,
  },
  inputCard: {
    height: 72,
    borderWidth: 1.5,
    borderColor: colors.bluePrimary,
    borderRadius: 17,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    fontFamily: 'Onest-SemiBold',
    color: colors.onyx,
    padding: 0,
  },
  flex: { flex: 1 },
  bottom: { paddingBottom: spacing.lg },
});
