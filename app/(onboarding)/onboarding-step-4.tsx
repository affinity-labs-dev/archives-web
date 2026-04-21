import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WelcomeStackedText } from '@/components/onboarding/WelcomeStackedText/WelcomeStackedText';
import { colors, spacing } from '@/components/ui';
import { useOnboardingStore } from '@/stores/onboardingStore';

const AUTO_ADVANCE_MS = 2800;

/**
 * Screen 4 — Welcome, {name}!
 *
 * Figma: 3282:7703. Full-screen aspen gold background. Celebration moment using
 * WelcomeStackedText (3-layer accordion text). Auto-advances to step 5 after
 * ~2.8s, or tap anywhere to skip forward. No progress header (moment-only screen).
 */
export default function OnboardingStep4Screen() {
  const name = useOnboardingStore((s) => s.name);
  const setStep = useOnboardingStore((s) => s.setStep);
  const displayName = name.trim() || 'friend';

  useEffect(() => {
    const t = setTimeout(() => {
      setStep(5);
      router.push('/onboarding-step-5' as never);
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(t);
  }, []);

  const skipForward = () => {
    setStep(5);
    router.push('/onboarding-step-5' as never);
  };

  return (
    <Pressable style={styles.root} onPress={skipForward}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.centerGroup}>
          <WelcomeStackedText text={`Welcome,\n${displayName}!`} size="hero" />
        </View>
      </SafeAreaView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.aspenGold,
  },
  safe: {
    flex: 1,
  },
  centerGroup: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
});
