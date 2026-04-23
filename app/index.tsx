// App Entry Point — smart router for new, returning, and mid-flow onboarding users.
import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { usePostHog } from 'posthog-react-native';
import { Platform } from 'react-native';

import LoadingScreen from '@/components/LoadingScreen';
import { analyticsService } from '@/services/AnalyticsService';
import AppLogger from '@/services/AppLogger';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { STEP_ROUTE_MAP, POST_SIGNUP_STEPS } from '@/constants/OnboardingRoutes';
import { hasRememberedAccount } from '@/services/RememberedAccountService';

/**
 * Routing decision tree (first-match wins):
 *
 *   1. Wait for Clerk + Zustand rehydration + remembered-account check →
 *      LoadingScreen.
 *   2. Signed-in + Clerk user.id ≠ userIdAtStart → account switch → reset +
 *      fresh start at step 1.
 *   3. Signed-in + status ∈ {completed, skipped} → /(tabs)/today.
 *   4. Signed-in + status = in_progress + currentStep ∈ POST_SIGNUP_STEPS →
 *      resume at STEP_ROUTE_MAP[currentStep].
 *   5. Signed-in + no onboarding state → existing returning user →
 *      /(tabs)/today.
 *   6. Not signed-in + status = in_progress + currentStep ∈ [1..7] → resume
 *      pre-auth onboarding at that step. Active mid-flow beats /welcome-back
 *      because a user who was *just* in onboarding hasn't really "left off"
 *      yet.
 *   7. Not signed-in + a remembered account exists (from a prior successful
 *      sign-in on this install) → /welcome-back for one-tap re-auth.
 *   8. Default → /onboarding-step-1.
 */
export default function Index() {
  const { isSignedIn, isLoaded, user } = useUser();
  const posthog = usePostHog();

  const hasHydrated = useOnboardingStore((s) => s._hasHydrated);
  const status = useOnboardingStore((s) => s.status);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const userIdAtStart = useOnboardingStore((s) => s.userIdAtStart);
  const reset = useOnboardingStore((s) => s.reset);

  // Cold-start check for a remembered-identity cache. Kept local to this
  // screen because the check is only relevant during the routing decision —
  // no consumer downstream needs it. Starts `null` (= still loading) so the
  // router waits before making a decision.
  const [hasRemembered, setHasRemembered] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    hasRememberedAccount()
      .then((result) => {
        if (!cancelled) setHasRemembered(result);
      })
      .catch((err) => {
        AppLogger.warn('navigation', 'Remembered-account check failed', { err: String(err) });
        if (!cancelled) setHasRemembered(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (posthog && Platform.OS !== 'web') {
      posthog.capture('app_entry_point', {
        screen: 'index',
        is_signed_in: isSignedIn ?? false,
        is_loaded: isLoaded ?? false,
      });
      AppLogger.info('navigation', 'App entry point tracked');
    }
  }, [posthog, isSignedIn, isLoaded]);

  // 1. Wait for Clerk, onboarding rehydration, and remembered-account probe.
  //    Without all three the guard would make a decision on incomplete data.
  if (!isLoaded || !hasHydrated || hasRemembered === null) {
    return <LoadingScreen />;
  }

  // 2. Account switch detection — a previously-bound Clerk id doesn't match
  //    the current signed-in user. Clears stale onboarding answers so the
  //    new account starts clean.
  if (isSignedIn && userIdAtStart && user?.id && user.id !== userIdAtStart) {
    AppLogger.info('navigation', 'Clerk user id mismatch — resetting onboarding', {
      previous: userIdAtStart,
      current: user.id,
    });
    reset();
    return <Redirect href="/onboarding-step-1" />;
  }

  const routingData = {
    previous_state: 'unknown' as const,
    new_state: (isSignedIn ? 'signed_in' : 'signed_out') as 'signed_in' | 'signed_out',
    user_id: user?.id ?? null,
    had_selected_era: false,
    app_state: `routing:status=${status},step=${currentStep},signed_in=${!!isSignedIn},remembered=${hasRemembered}`,
  };
  analyticsService.trackAuthStateChange(routingData);

  // 3-5. Signed-in branches
  if (isSignedIn) {
    if (status === 'completed' || status === 'skipped') {
      AppLogger.info('navigation', 'Routing to /(tabs)/today', { status });
      return <Redirect href="/(tabs)/today" />;
    }

    if (status === 'in_progress' && POST_SIGNUP_STEPS.includes(currentStep)) {
      const route = STEP_ROUTE_MAP[currentStep];
      if (route) {
        AppLogger.info('navigation', `Resuming post-auth onboarding at step ${currentStep}`, {
          route,
        });
        return <Redirect href={route as never} />;
      }
    }

    // Signed-in but no (or pre-auth) onboarding state → existing user
    AppLogger.info('navigation', 'Signed-in user w/o resumable state → /(tabs)/today');
    return <Redirect href="/(tabs)/today" />;
  }

  // 6. Not signed-in + pre-auth mid-flow → resume the in-progress onboarding.
  //    Takes priority over welcome-back: a user who's actively working through
  //    steps 1-7 hasn't "left off" yet.
  if (status === 'in_progress' && currentStep >= 1 && currentStep <= 7) {
    const route = STEP_ROUTE_MAP[currentStep];
    if (route) {
      AppLogger.info('navigation', `Resuming pre-auth onboarding at step ${currentStep}`, {
        route,
      });
      return <Redirect href={route as never} />;
    }
  }

  // 7. Not signed-in + a remembered identity exists → offer one-tap re-auth.
  if (hasRemembered) {
    AppLogger.info('navigation', 'Routing to /welcome-back (remembered account found)');
    return <Redirect href={'/welcome-back' as never} />;
  }

  // 8. Default: fresh install, start from the top.
  AppLogger.info('navigation', 'Starting onboarding from step 1');
  return <Redirect href="/onboarding-step-1" />;
}
