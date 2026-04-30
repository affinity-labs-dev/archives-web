import React, { useEffect, useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import Rive, { Alignment, Fit } from 'rive-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Typography, colors, spacing, easings } from '@/components/ui';
import { AnimatedEntrance } from '@/components/ui/animations';
import { useOnboardingStore } from '@/stores/onboardingStore';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const reruledLoadingRive = require('@/assets/rive/reruled-loading.riv');

const LOADING_MESSAGES = [
  'Analyzing your interests...',
  'Building your learning path...',
  'Personalizing your experience...',
];
const FINAL_MESSAGE = 'Your learning path is ready!';

const CYCLE_INTERVAL_MS = 2000;
const EXIT_DURATION_MS = 400;        // loading group fade-out
const FINAL_ENTER_DELAY_MS = 500;    // wait for exit before final enters
const FINAL_ENTER_DURATION_MS = 700; // final message fade+scale in
const FINAL_VISIBLE_MS = 1800;       // hold final state before auto-advance
const AUTO_ADVANCE_TOTAL_MS =
  LOADING_MESSAGES.length * CYCLE_INTERVAL_MS +
  EXIT_DURATION_MS +
  FINAL_ENTER_DELAY_MS +
  FINAL_ENTER_DURATION_MS +
  FINAL_VISIBLE_MS;

/**
 * Screen 13 — Generating personalized learning path (auto-advance).
 *
 * Figma: 3282:8114. Follows the 01-onboarding HTML prototype: mascot fades
 * in centered, three loading messages cross-fade every 1.2s, then a final
 * "Your learning path is ready!" state settles before auto-advancing to
 * the next phase. No user interaction required (back + skip still work).
 *
 * Total runtime: 3 cycles × 1200ms + 1800ms final = 5400ms.
 */
export default function OnboardingStep13Screen() {
  const setStep = useOnboardingStore((s) => s.setStep);
  const [messageIndex, setMessageIndex] = useState(0);
  const [showFinal, setShowFinal] = useState(false);

  useEffect(() => {
    const cycleTimer = setInterval(() => {
      setMessageIndex((i) => {
        const next = i + 1;
        if (next >= LOADING_MESSAGES.length) {
          clearInterval(cycleTimer);
          setShowFinal(true);
          return i;
        }
        return next;
      });
    }, CYCLE_INTERVAL_MS);

    const advanceTimer = setTimeout(() => {
      setStep(12);
      router.replace('/onboarding-step-12' as never);
    }, AUTO_ADVANCE_TOTAL_MS);

    return () => {
      clearInterval(cycleTimer);
      clearTimeout(advanceTimer);
    };
  }, [setStep]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.centerBlock}>
          {/* Two groups that swap via Reanimated entering/exiting — the
              loading group (Rive + cycling message) fades out, then the
              final message fades + scales in. Delay on the final group's
              entering waits for the loading group's exit to finish. */}
          {!showFinal && (
            <Animated.View
              entering={FadeIn.duration(800)}
              exiting={FadeOut.duration(EXIT_DURATION_MS)}
              style={styles.loadingGroup}
            >
              {/* Wrap Rive in a fixed-size View so its native component
                  cannot greedy-flex beyond the intended bounding box. */}
              <View style={styles.riveBox}>
                <Rive
                  source={reruledLoadingRive}
                  autoplay
                  fit={Fit.Cover}
                  alignment={Alignment.Center}
                  style={styles.riveFill}
                />
              </View>

              {/* Key change triggers entrance replay on each message swap */}
              <AnimatedEntrance
                key={`msg-${messageIndex}`}
                preset={{
                  translateY: { from: 10, to: 0 },
                  opacity: { from: 0, to: 1 },
                  duration: 350,
                  easing: easings.power2Out,
                }}
                style={styles.textGap}
              >
                <Typography
                  size={20}
                  weight="600"
                  color="onyx"
                  align="center"
                  lineHeight={26}
                >
                  {LOADING_MESSAGES[messageIndex]}
                </Typography>
              </AnimatedEntrance>
            </Animated.View>
          )}

          {showFinal && (
            <Animated.View
              entering={FadeIn.duration(FINAL_ENTER_DURATION_MS).delay(
                FINAL_ENTER_DELAY_MS,
              )}
            >
              <Typography
                family="bounded"
                size={22}
                lineHeight={28}
                color="onyx"
                align="center"
                uppercase
              >
                {FINAL_MESSAGE}
              </Typography>
            </Animated.View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.snow },
  safe: { flex: 1 },
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingGroup: {
    alignItems: 'center',
  },
  riveBox: {
    width: 220,
    height: 220,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  riveFill: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  textGap: {
    marginTop: spacing.xs,
  },
});
