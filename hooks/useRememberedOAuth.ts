/**
 * useRememberedOAuth — shared OAuth flow for the /welcome-back screen.
 *
 * Same Clerk + haptics + error-mapping wiring as AppleOutlineButton and
 * GoogleOutlineButton, but strategy-parameterized so one screen can trigger
 * either Apple or Google without duplicating ~100 lines of error handling.
 *
 * Returning users typically breeze through OAuth: the platform provider still
 * has their session cookie (Apple ID / Google account picker), so Face ID /
 * Touch ID / device PIN is the only interaction they'll see. We never store
 * the Clerk token here — Clerk's own token cache (services/ClerkTokenCache.ts)
 * handles that. This hook just opens the provider flow and resolves.
 */

import React from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useOAuth, useSessionList } from '@clerk/clerk-expo';

import { analyticsService } from '@/services/AnalyticsService';

export type OAuthStrategy = 'oauth_apple' | 'oauth_google';

interface UseRememberedOAuthParams {
  strategy: OAuthStrategy;
  onSuccess?: (isNewUser: boolean) => void;
  onError?: (error: { message: string }) => void;
  /** Called when Clerk reports `missing_requirements`. Welcome-back users
   *  should never hit this (they signed up once already), but we surface it
   *  so the caller can decide whether to show NameCollectionModal or fail. */
  onMissingRequirements?: (email: string | undefined) => void;
}

interface UseRememberedOAuthResult {
  start: () => Promise<void>;
  isLoading: boolean;
}

function useWarmUpBrowser() {
  React.useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

function friendlyProvider(strategy: OAuthStrategy): 'apple' | 'google' {
  return strategy === 'oauth_apple' ? 'apple' : 'google';
}

export function useRememberedOAuth({
  strategy,
  onSuccess = () => {},
  onError = () => {},
  onMissingRequirements,
}: UseRememberedOAuthParams): UseRememberedOAuthResult {
  useWarmUpBrowser();

  const { startOAuthFlow } = useOAuth({ strategy });
  const { setActive } = useSessionList();
  const [isLoading, setIsLoading] = React.useState(false);
  const provider = friendlyProvider(strategy);

  const start = React.useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      setIsLoading(true);

      const redirectUrl = Linking.createURL('sso-callback');
      const { createdSessionId, signIn, signUp } = await startOAuthFlow({ redirectUrl });

      if (createdSessionId) {
        if (setActive && typeof setActive === 'function') {
          await setActive({ session: createdSessionId });
        }
        const isNewUser = !!signUp?.createdUserId;
        analyticsService.trackUserSessionIn(provider);
        onSuccess(isNewUser);
        return;
      }

      if (signIn?.status === 'complete') {
        if (setActive && typeof setActive === 'function' && signIn.createdSessionId) {
          await setActive({ session: signIn.createdSessionId });
        }
        analyticsService.trackUserSessionIn(provider);
        onSuccess(false);
        return;
      }

      if (signUp?.status === 'complete') {
        if (setActive && typeof setActive === 'function' && signUp.createdSessionId) {
          await setActive({ session: signUp.createdSessionId });
        }
        analyticsService.trackUserSessionIn(provider);
        onSuccess(true);
        return;
      }

      if (signUp?.status === 'missing_requirements') {
        const email = signUp.emailAddress ?? undefined;
        if (onMissingRequirements) {
          onMissingRequirements(email);
        } else {
          onError({ message: 'Additional information needed to complete sign-in.' });
        }
        return;
      }

      onError({ message: 'Authentication incomplete. Please try again.' });
    } catch (err: unknown) {
      const errWithErrors = err as { errors?: { code?: string; message?: string; longMessage?: string }[] };
      const clerkError = errWithErrors?.errors?.[0];

      if (!clerkError) {
        const errorMsg = `Failed to sign in with ${provider === 'apple' ? 'Apple' : 'Google'}. Please try again.`;
        onError({ message: errorMsg });
        Alert.alert('Sign In Error', errorMsg);
        return;
      }

      switch (clerkError.code) {
        case 'oauth_access_denied': {
          const msg = `${provider === 'apple' ? 'Apple' : 'Google'} sign-in was cancelled.`;
          onError({ message: msg });
          break;
        }
        case 'session_exists':
          // Clerk reports an active session already — treat as success.
          onSuccess(false);
          break;
        case 'strategy_for_user_invalid': {
          const msg = `${provider === 'apple' ? 'Apple' : 'Google'} sign-in is not available for this account. Try signing in with email and password instead.`;
          onError({ message: msg });
          Alert.alert('Sign In Error', msg);
          break;
        }
        case 'identifier_already_signed_up': {
          const msg = `An account with this ${provider === 'apple' ? 'Apple ID' : 'Google email'} already exists. Please sign in instead.`;
          onError({ message: msg });
          Alert.alert('Account Exists', msg);
          break;
        }
        default: {
          const msg = clerkError.longMessage || clerkError.message || `${provider === 'apple' ? 'Apple' : 'Google'} sign-in failed`;
          onError({ message: msg });
          Alert.alert(`${provider === 'apple' ? 'Apple' : 'Google'} Sign In Error`, msg);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [startOAuthFlow, setActive, onSuccess, onError, onMissingRequirements, provider]);

  return { start, isLoading };
}
