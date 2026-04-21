import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { useSignIn } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import {
  Typography,
  DepthButton,
  colors,
  spacing,
  easings,
} from '@/components/ui';
import { AnimatedEntrance } from '@/components/ui/animations';
import { AuthOutlineButton } from '@/components/onboarding/auth/AuthOutlineButton';
import { AuthInput } from '@/components/onboarding/auth/AuthInput';
import { backArrowSvg } from '@/components/onboarding/icons/backArrowSvg';
import { personAddSvg, personCheckSvg } from '@/components/onboarding/icons/personIcons';
import { analyticsService } from '@/services/AnalyticsService';

/**
 * Screen — Login (email + password sign-in).
 *
 * Figma: 3645:5390. Cloned from `/(auth)/email-details.tsx` with the signin
 * logic isolated — no mode toggle state, the Sign Up button navigates to the
 * signup screen instead of flipping state. Clerk `useSignIn` + error mapping
 * preserved.
 *
 * Entrance sequence:
 *   t=0    title "WELCOME BACK"
 *   t=150  toggle row
 *   t=300  email field
 *   t=400  password field
 *   t=650  CONTINUE button
 */
export default function OnboardingLoginScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const canSubmit = email.trim().length > 0 && password.trim().length > 0 && !isLoading;

  const goToSignUp = () => {
    router.replace('/onboarding-signup' as never);
  };

  const goToForgotPassword = () => {
    router.push('/(auth)/forgot-password' as never);
  };

  const onContinue = async () => {
    router.replace('/(tabs)/today' as never);
  };

  const signInUser = async () => {
    if (!isLoaded) return;
    if (!canSubmit) return;

    // Basic email format check
    const emailRegEx = /[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,64}/;
    if (!emailRegEx.test(email)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const signInAttempt = await signIn.create({
        identifier: email,
        password,
      });

      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId });
        analyticsService.trackUserSessionIn('email');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await onContinue();
      } else {
        setIsLoading(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setErrorMessage('Sign in incomplete. Please try again.');
      }
    } catch (err: any) {
      setIsLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (err.errors && err.errors[0]) {
        setErrorMessage(err.errors[0].longMessage || err.errors[0].message);
      } else {
        setErrorMessage('An error occurred during sign in');
      }
    }
  };

  const onPressContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    signInUser();
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

        <KeyboardAvoidingView
          style={styles.body}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title */}
            <AnimatedEntrance
              preset={{
                translateY: { from: -25, to: 0 },
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
                Welcome back
              </Typography>
            </AnimatedEntrance>

            {/* Log In / Sign Up toggle row */}
            <AnimatedEntrance
              preset={{
                translateY: { from: 20, to: 0 },
                opacity: { from: 0, to: 1 },
                duration: 500,
                easing: easings.backOut15,
              }}
              delay={150}
              style={styles.toggleRowWrapper}
            >
              <View style={styles.toggleRow}>
                <AuthOutlineButton
                  compact
                  active
                  label="Log In"
                  icon={
                    <SvgXml
                      xml={personAddSvg}
                      width={26}
                      height={18}
                      color={colors.white}
                    />
                  }
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

            {/* Email */}
            <AnimatedEntrance
              preset={{
                translateX: { from: 40, to: 0 },
                opacity: { from: 0, to: 1 },
                duration: 400,
                easing: easings.power2Out,
              }}
              delay={300}
              style={styles.fieldWrapper}
            >
              <AuthInput
                label="Your Email Address"
                placeholder="basel@archiveszone.app"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </AnimatedEntrance>

            {/* Password */}
            <AnimatedEntrance
              preset={{
                translateX: { from: 40, to: 0 },
                opacity: { from: 0, to: 1 },
                duration: 400,
                easing: easings.power2Out,
              }}
              delay={400}
              style={styles.fieldWrapper}
            >
              <AuthInput
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                isPassword
                autoComplete="password"
                rightSlot={
                  <Pressable onPress={goToForgotPassword} hitSlop={8}>
                    <Typography size="xs" weight="600" color="bluePrimary">
                      Forgot password?
                    </Typography>
                  </Pressable>
                }
              />
            </AnimatedEntrance>

            {errorMessage ? (
              <Typography
                size="sm"
                weight="500"
                extraColor="#D32F2F"
                align="center"
                style={styles.errorText}
              >
                {errorMessage}
              </Typography>
            ) : null}

            <View style={styles.flex} />

            <AnimatedEntrance
              preset="slideFromBottom"
              delay={650}
              style={styles.bottom}
            >
              <DepthButton
                surfaceColor="onyx"
                shadowColor="white"
                borderColor="onyx"
                onPress={onPressContinue}
                isDisabled={!canSubmit}
              >
                <Typography variant="label.m" color="white">
                  {isLoading ? 'Loading...' : 'CONTINUE'}
                </Typography>
              </DepthButton>
            </AnimatedEntrance>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.snow },
  safe: { flex: 1 },
  topBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  body: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  toggleRowWrapper: {
    marginTop: spacing.xl,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  toggleButton: {
    width: 148,
  },
  fieldWrapper: {
    marginTop: spacing.lg,
  },
  errorText: {
    marginTop: spacing.md,
  },
  flex: { flex: 1, minHeight: spacing.xl },
  bottom: {
    marginTop: spacing.xl,
  },
});
