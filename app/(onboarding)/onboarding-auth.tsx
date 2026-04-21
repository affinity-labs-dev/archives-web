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
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { router, useLocalSearchParams } from 'expo-router';
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
 * Single-screen auth flow — merged login + signup. Initial mode comes from the
 * `?mode=signin|signup` route param. The Log In / Sign Up toggle buttons then
 * flip local state (no navigation) so the same screen swaps its shape.
 *
 * Shape by mode:
 *   Sign In (mode=signin) — title "WELCOME BACK", email + password only,
 *     "Forgot password?" link in the password label.
 *   Sign Up (mode=signup) — title "COMPLETE PROFILE", first/last name row,
 *     email, password, confirm password.
 *
 * Clerk `useSignIn` + `useSignUp` hooks + validation + error mapping cloned
 * verbatim from legacy `/(auth)/email-details.tsx`.
 *
 * Entrance (fixed delays; conditional fields use the same timeline regardless
 * of mode, empty-space gaps are acceptable):
 *   t=0    title
 *   t=150  toggle row
 *   t=300  first/last name row (signup only)
 *   t=400  email
 *   t=500  password
 *   t=600  confirm password (signup only)
 *   t=750  CONTINUE button
 */
export default function OnboardingAuthScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const { signIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp();

  const [isSignInMode, setIsSignInMode] = useState(params.mode === 'signin');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const canSubmit = isSignInMode
    ? email.trim().length > 0 && password.trim().length > 0 && !isLoading
    : firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      email.trim().length > 0 &&
      password.trim().length > 0 &&
      !isLoading;

  const switchMode = (toSignIn: boolean) => {
    if (isSignInMode === toSignIn) return;
    Haptics.selectionAsync();
    setIsSignInMode(toSignIn);
    setErrorMessage('');
  };

  const goToForgotPassword = () => {
    router.push('/(auth)/forgot-password' as never);
  };

  const onContinue = async () => {
    router.replace('/(tabs)/today' as never);
  };

  const validateInputs = (): boolean => {
    if (isSignInMode) {
      if (!email.trim() || !password.trim()) {
        setErrorMessage('Please fill in all fields');
        return false;
      }
    } else {
      if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
        setErrorMessage('Please fill in all fields');
        return false;
      }
    }

    const emailRegEx = /[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,64}/;
    if (!emailRegEx.test(email)) {
      setErrorMessage('Please enter a valid email address');
      return false;
    }

    if (!isSignInMode) {
      if (!confirmPassword.trim()) {
        setErrorMessage('Please confirm your password');
        return false;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match');
        return false;
      }
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters');
        return false;
      }
    }

    return true;
  };

  const signInUser = async () => {
    if (!signInLoaded) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const signInAttempt = await signIn.create({
        identifier: email,
        password,
      });

      if (signInAttempt.status === 'complete') {
        await setActiveSignIn({ session: signInAttempt.createdSessionId });
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

  const signUpUser = async () => {
    if (!signUpLoaded) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const signUpAttempt = await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
      });

      if (signUpAttempt.status === 'complete') {
        await setActiveSignUp({ session: signUpAttempt.createdSessionId });
        const userId = signUpAttempt.createdUserId || signUpAttempt.id;
        if (userId) {
          analyticsService.trackUserSignedUp(userId, { sign_up_method: 'email' });
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await onContinue();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await onContinue();
      }
    } catch (err: any) {
      setIsLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (err.errors && err.errors[0]) {
        setErrorMessage(err.errors[0].longMessage || err.errors[0].message);
      } else {
        setErrorMessage('An error occurred during sign up');
      }
    }
  };

  const onPressContinue = () => {
    if (!validateInputs()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isSignInMode) {
      signInUser();
    } else {
      signUpUser();
    }
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
                {isSignInMode ? 'Welcome back' : 'Complete profile'}
              </Typography>
            </AnimatedEntrance>

            {/* Log In / Sign Up toggle */}
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
                  active={isSignInMode}
                  label="Log In"
                  icon={
                    <SvgXml
                      xml={personAddSvg}
                      width={26}
                      height={18}
                      color={isSignInMode ? colors.white : colors.onyx}
                    />
                  }
                  onPress={() => switchMode(true)}
                  style={styles.toggleButton}
                />
                <AuthOutlineButton
                  compact
                  active={!isSignInMode}
                  label="Sign Up"
                  icon={
                    <SvgXml
                      xml={personCheckSvg}
                      width={26}
                      height={18}
                      color={!isSignInMode ? colors.white : colors.onyx}
                    />
                  }
                  onPress={() => switchMode(false)}
                  style={styles.toggleButton}
                />
              </View>
            </AnimatedEntrance>

            {/* First / Last name row — signup only */}
            {!isSignInMode && (
              <Animated.View
                entering={FadeIn.duration(400).delay(200)}
                exiting={FadeOut.duration(200)}
                layout={LinearTransition.duration(300)}
                style={styles.fieldWrapper}
              >
                <View style={styles.nameRow}>
                  <AuthInput
                    label="First Name"
                    placeholder="Basel"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    autoComplete="given-name"
                    containerStyle={styles.nameField}
                  />
                  <AuthInput
                    label="Last Name"
                    placeholder="Ghazi"
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                    autoComplete="family-name"
                    containerStyle={styles.nameField}
                  />
                </View>
              </Animated.View>
            )}

            {/* Email — layout prop smooths vertical slide when signup fields above mount/unmount */}
            <Animated.View
              layout={LinearTransition.duration(300)}
              style={styles.fieldWrapper}
            >
              <AnimatedEntrance
                preset={{
                  translateX: { from: 40, to: 0 },
                  opacity: { from: 0, to: 1 },
                  duration: 400,
                  easing: easings.power2Out,
                }}
                delay={400}
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
            </Animated.View>

            {/* Password — same layout wrapper pattern as email */}
            <Animated.View
              layout={LinearTransition.duration(300)}
              style={styles.fieldWrapper}
            >
              <AnimatedEntrance
                preset={{
                  translateX: { from: 40, to: 0 },
                  opacity: { from: 0, to: 1 },
                  duration: 400,
                  easing: easings.power2Out,
                }}
                delay={500}
              >
                <AuthInput
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  isPassword
                  autoComplete={isSignInMode ? 'password' : 'new-password'}
                  rightSlot={
                    isSignInMode ? (
                      <Pressable onPress={goToForgotPassword} hitSlop={8}>
                        <Typography size="xs" weight="600" color="bluePrimary">
                          Forgot password?
                        </Typography>
                      </Pressable>
                    ) : undefined
                  }
                />
              </AnimatedEntrance>
            </Animated.View>

            {/* Confirm password — signup only */}
            {!isSignInMode && (
              <Animated.View
                entering={FadeIn.duration(400).delay(200)}
                exiting={FadeOut.duration(200)}
                layout={LinearTransition.duration(300)}
                style={styles.fieldWrapper}
              >
                <AuthInput
                  label="Confirm Password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  isPassword
                  autoComplete="new-password"
                />
              </Animated.View>
            )}

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

            {/* CONTINUE */}
            <AnimatedEntrance
              preset="slideFromBottom"
              delay={750}
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
  nameRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  nameField: {
    flex: 1,
  },
  errorText: {
    marginTop: spacing.md,
  },
  flex: { flex: 1, minHeight: spacing.xl },
  bottom: {
    marginTop: spacing.xl,
  },
});
