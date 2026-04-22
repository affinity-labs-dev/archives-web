import React from 'react';
import { View, StyleSheet, StatusBar, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import Rive, { Alignment, Fit } from 'rive-react-native';
import { router } from 'expo-router';

import { Typography, colors, spacing, easings } from '@/components/ui';
import { AnimatedEntrance } from '@/components/ui/animations';
import { AppleOutlineButton } from '@/components/onboarding/auth/AppleOutlineButton';
import { GoogleOutlineButton } from '@/components/onboarding/auth/GoogleOutlineButton';
import { AuthOutlineButton } from '@/components/onboarding/auth/AuthOutlineButton';
import { backArrowSvg } from '@/components/onboarding/icons/backArrowSvg';
import { personAddSvg, personCheckSvg } from '@/components/onboarding/icons/personIcons';
import { useOnboardingStore } from '@/stores/onboardingStore';
import AppLogger from '@/services/AppLogger';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ibuJumpingRive = require('@/assets/rive/ibu-jumping.riv');

/**
 * Screen 7 — Create Account.
 *
 * Figma: 3421:7503. No progress bar (this is the auth entry point, not a
 * question step). Back arrow top-left only.
 *
 * Layout (top → bottom):
 *   1. Title "LET'S CREATE AN ACCOUNT"
 *   2. Subtitle "Sign up to save your progress and unlock achievements"
 *   3. Rive mascot (Ibu jumping)
 *   4. Log In / Sign Up toggle row (navigates to existing auth screen with mode)
 *   5. Divider
 *   6. Continue with Apple  — reuses existing AppleSignInButton (Clerk OAuth)
 *   7. Continue with Google — reuses existing GoogleSignInButton (Clerk OAuth)
 *   8. Continue with Email  — navigates to email-details form
 *
 * Staggered entrance per DEVELOPER_INSTRUCTIONS.md:
 *   title @ 0ms, subtitle @ 150ms, rive @ 300ms, toggle @ 500ms,
 *   divider @ 550ms, apple @ 600ms, google @ 700ms, email @ 800ms.
 */
export default function OnboardingStep7Screen() {
  const setStep = useOnboardingStore((s) => s.setStep);

  const onAuthSuccess = (isNewUser: boolean) => {
    setStep(8);
    AppLogger.info('auth', 'Onboarding step-7 auth success', { isNewUser });
    // TODO Phase 2: when step-8 (Daily Goal) is built, route there for new users
    // instead of jumping straight into the app.
    router.replace('/(tabs)/today' as never);
  };

  const onAuthError = (error: { message: string }) => {
    AppLogger.warn('auth', 'Onboarding step-7 auth error', { message: error.message });
  };

  const goToLogIn = () => {
    router.push('/onboarding-auth?mode=signin' as never);
  };

  const goToSignUp = () => {
    router.push('/onboarding-auth?mode=signup' as never);
  };

  const goToEmail = () => {
    // TEMP: wired to step-9 (notification) for testing until step-8 design
    // is ready. Revert to '/onboarding-auth?mode=signin' once the proper
    // flow is in place.
    router.push('/onboarding-step-9' as never);
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

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Title */}
          <AnimatedEntrance
            preset={{
              translateY: { from: 25, to: 0 },
              opacity: { from: 0, to: 1 },
              duration: 500,
              easing: easings.backOut15,
            }}
          >
            <Typography
              family="bounded"
              size={28}
              lineHeight={42}
              color="onyx"
              uppercase
            >
              Let&apos;s create an account
            </Typography>
          </AnimatedEntrance>

          {/* 2. Subtitle */}
          <AnimatedEntrance
            preset={{
              translateY: { from: 20, to: 0 },
              opacity: { from: 0, to: 1 },
              duration: 500,
              easing: easings.backOut15,
            }}
            delay={150}
            style={styles.subtitleWrapper}
          >
            <Typography size={20} weight="600" color="onyx">
              Sign up to save your progress and unlock achievements
            </Typography>
          </AnimatedEntrance>

          {/* 3. Rive mascot */}
          <AnimatedEntrance
            preset={{
              scale: { from: 0.8, to: 1 },
              opacity: { from: 0, to: 1 },
              duration: 600,
              easing: easings.backOut15,
            }}
            delay={300}
          >
            <View style={styles.riveWrapper}>
              <Rive
                source={ibuJumpingRive}
                autoplay
                fit={Fit.Contain}
                alignment={Alignment.Center}
                style={styles.rive}
              />
            </View>
          </AnimatedEntrance>

          {/* 4. Log In / Sign Up toggle row */}
          <AnimatedEntrance
            preset={{
              translateY: { from: 30, to: 0 },
              opacity: { from: 0, to: 1 },
              duration: 500,
              easing: easings.backOut15,
            }}
            delay={500}
          >
            <View style={styles.toggleRow}>
              <AuthOutlineButton
                compact
                label="Log In"
                icon={
                  <SvgXml
                    xml={personAddSvg}
                    width={26}
                    height={18}
                    color={colors.onyx}
                  />
                }
                onPress={goToLogIn}
                style={styles.toggleButton}
              />
              <AuthOutlineButton
                compact
                label="Sign Up"
                icon={
                  <SvgXml
                    xml={personCheckSvg}
                    width={26}
                    height={18}
                    color={colors.onyx}
                  />
                }
                onPress={goToSignUp}
                style={styles.toggleButton}
              />
            </View>
          </AnimatedEntrance>

          {/* 5. Divider */}
          <AnimatedEntrance preset="fadeIn" delay={550}>
            <View style={styles.divider} />
          </AnimatedEntrance>

          {/* 6-8. Social auth buttons */}
          <View style={styles.socialButtonsSection}>
            <AnimatedEntrance
              preset={{
                translateX: { from: -30, to: 0 },
                opacity: { from: 0, to: 1 },
                duration: 400,
                easing: easings.power2Out,
              }}
              delay={600}
            >
              <AppleOutlineButton
                onSuccess={onAuthSuccess}
                onError={onAuthError}
              />
            </AnimatedEntrance>

            <AnimatedEntrance
              preset={{
                translateX: { from: 30, to: 0 },
                opacity: { from: 0, to: 1 },
                duration: 400,
                easing: easings.power2Out,
              }}
              delay={700}
            >
              <GoogleOutlineButton
                onSuccess={onAuthSuccess}
                onError={onAuthError}
              />
            </AnimatedEntrance>

            <AnimatedEntrance
              preset={{
                translateX: { from: -30, to: 0 },
                opacity: { from: 0, to: 1 },
                duration: 400,
                easing: easings.power2Out,
              }}
              delay={800}
            >
              <AuthOutlineButton
                label="Continue with Email"
                icon={
                  <Ionicons name="mail-outline" size={22} color={colors.onyx} />
                }
                onPress={goToEmail}
              />
            </AnimatedEntrance>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.snow },
  safe: { flex: 1 },
  topBar: {
    paddingHorizontal: spacing.md,
    minHeight: 28,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  subtitleWrapper: {
    marginTop: spacing.sm,
  },
  riveWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  rive: {
    width: 220,
    height: 220,
    backgroundColor: 'transparent',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  toggleButton: {
    width: 148,
  },
  divider: {
    height: 1,
    backgroundColor: colors.concreteGrey,
    marginTop: spacing.lg,
  },
  socialButtonsSection: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
