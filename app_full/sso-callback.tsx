import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoadingScreen from '@/components/LoadingScreen';
import AppLogger from '@/services/AppLogger';

/**
 * SSO Callback Screen
 *
 * This screen handles the OAuth redirect callback from Google/Apple Sign-In.
 * When the OAuth provider completes authentication, it redirects back to
 * archives://sso-callback which routes to this screen.
 *
 * The screen:
 * 1. Waits for Clerk to process the authentication
 * 2. Checks if user has already selected an era
 * 3. Routes to appropriate screen (tabs if era selected, era-selection otherwise)
 */
export default function SSOCallback() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      // Wait for Clerk to finish loading auth state
      if (!isLoaded) return;

      AppLogger.info('auth', 'SSO callback auth loaded', { isSignedIn: !!isSignedIn });

      if (isSignedIn) {
        // User successfully authenticated - check if they've selected an era
        const hasSelectedEra = await AsyncStorage.getItem('selected_era');
        AppLogger.info('auth', 'SSO callback routing', { hasSelectedEra: !!hasSelectedEra });

        // User has already completed era selection - go to Today tab (AFF-319)
        router.replace('/(tabs)/today');
      } else {
        // Authentication failed or was cancelled — return to the new-flow
        // create-account screen so the user can retry with a different
        // provider. Legacy `/(auth)/archives-auth` is kept as fallback but
        // is no longer the default entry point post-AFF-786.
        AppLogger.warn('auth', 'SSO callback: not signed in, returning to onboarding-step-7');
        router.replace('/onboarding-step-7');
      }
    };

    handleCallback();
  }, [isLoaded, isSignedIn, router]);

  // Show loading screen while processing the callback
  return <LoadingScreen />;
}
