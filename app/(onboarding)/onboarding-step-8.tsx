import React, { useState } from 'react';
import { View, StyleSheet, StatusBar, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Rive, { Alignment, Fit } from 'rive-react-native';
import { router } from 'expo-router';

import {
  Typography,
  DepthButton,
  SpeechBubble,
  Typewriter,
  colors,
  spacing,
  easings,
} from '@/components/ui';
import { AnimatedEntrance } from '@/components/ui/animations';
import { useOnboardingStore } from '@/stores/onboardingStore';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ibuCelebratingRive = require('@/assets/rive/ibu-celebrating.riv');

/**
 * Screen 8 — Post-signup celebration.
 *
 * Figma: 3710:5857. Shown immediately after a successful sign-up (OAuth or
 * email). Blue pastel background (#809DE4), speech bubble at top typed out
 * via Typewriter, Ibu-celebration mascot below, CONTINUE CTA near the
 * bottom + "Maybe later" underline link.
 *
 * Entrance timeline (derived from the guided-walkthrough HTML mock's S0
 * spec — same "Ibu celebrating" screen):
 *   speech bubble     delay 100ms   scale/rotation entrance
 *   typewriter text   delay 200ms   28ms / char
 *   mascot            delay 350ms   y 40→0, scale 0.95→1
 *   CTA + link        on typewriter complete   y 30→0 + fade
 *
 * Routing:
 *   CONTINUE     → setStep(9) → /onboarding-step-9
 *   Maybe later  → setStep(9) → /onboarding-step-9 (same destination today;
 *                  reserved for future walkthrough-opt-out branching — the
 *                  copy "Now let me walk you through..." implies an
 *                  optional tour that doesn't yet exist in production).
 *
 * No progress bar — this is a transition screen, not a question.
 */
export default function OnboardingStep8Screen() {
  const setStep = useOnboardingStore((s) => s.setStep);
  const [typewriterDone, setTypewriterDone] = useState(false);

  const goToNext = () => {
    setStep(9);
    router.push('/onboarding-step-9' as never);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.content}>
          {/* Speech bubble + typewriter copy */}
          <AnimatedEntrance
            preset={{
              scale: { from: 0.9, to: 1 },
              opacity: { from: 0, to: 1 },
              rotate: { from: -5, to: 0 },
              duration: 450,
              easing: easings.backOut2,
            }}
            delay={100}
            style={styles.bubbleWrapper}
          >
            <SpeechBubble
              borderWidth={1.5}
              autoPlay={false}
              tail={{ direction: 'bottom', offset: 0.5, depth: 10, size: 14 }}
              padding={spacing.md}
            >
              <Typewriter
                text="Great job! Now let me walk you through how the app works and you can start building streaks."
                speed={28}
                startDelay={200}
                size={20}
                weight="500"
                color="onyx"
                align="center"
                onComplete={() => setTypewriterDone(true)}
              />
            </SpeechBubble>
          </AnimatedEntrance>

          {/* Mascot */}
          <AnimatedEntrance
            preset={{
              translateY: { from: 40, to: 0 },
              scale: { from: 0.95, to: 1 },
              opacity: { from: 0, to: 1 },
              duration: 600,
              // Spec calls for back.out(1.6); theme's closest entries are
              // 1.15 and 1.175. 1.15 felt a touch too tame, 1.175 matches
              // the celebratory pop better.
              easing: easings.backOut17,
            }}
            delay={350}
            style={styles.mascotWrapper}
          >
            <Rive
              source={ibuCelebratingRive}
              autoplay
              fit={Fit.Contain}
              alignment={Alignment.Center}
              style={styles.mascot}
            />
          </AnimatedEntrance>
        </View>

        {/* CTA block — mounts only after typewriter completes so the
            entrance animation fires in sync with the narrative pacing. */}
        {typewriterDone ? (
          <View style={styles.bottomBar}>
            <AnimatedEntrance
              preset={{
                translateY: { from: 30, to: 0 },
                opacity: { from: 0, to: 1 },
                duration: 500,
                easing: easings.backOut2,
              }}
            >
              <DepthButton
                surfaceColor="onyx"
                shadowColor="white"
                borderColor="onyx"
                onPress={goToNext}
              >
                <Typography variant="label.m" color="white">
                  CONTINUE
                </Typography>
              </DepthButton>
            </AnimatedEntrance>

            <AnimatedEntrance preset="fadeIn" delay={200} style={styles.maybeLaterRow}>
              <Pressable onPress={goToNext} hitSlop={12}>
                <Text style={styles.maybeLaterText} allowFontScaling={false}>
                  Maybe later
                </Text>
              </Pressable>
            </AnimatedEntrance>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#809DE4' },
  safe: { flex: 1 },

  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    alignItems: 'center',
  },
  bubbleWrapper: {
    marginTop: spacing.md,
    maxWidth: 280,
    width: '100%',
    alignSelf: 'center',
  },
  mascotWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  mascot: {
    width: 340,
    height: 340,
  },

  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  maybeLaterRow: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  maybeLaterText: {
    fontFamily: 'Onest-SemiBold',
    fontSize: 18,
    lineHeight: 26,
    color: colors.onyx,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});
