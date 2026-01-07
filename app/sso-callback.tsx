import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoadingScreen from '@/components/LoadingScreen';

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

      console.log('🔐 [SSO Callback] Auth loaded, isSignedIn:', isSignedIn);

      if (isSignedIn) {
        // User successfully authenticated - check if they've selected an era
        const hasSelectedEra = await AsyncStorage.getItem('selected_era');
        console.log('🔐 [SSO Callback] Has selected era:', !!hasSelectedEra);

        if (hasSelectedEra) {
          // User has already completed era selection - go to main app
          router.replace('/(tabs)');
        } else {
          // New user or hasn't selected era - go to era selection
          router.replace('/(tabs)/eras?mode=onboarding');
        }
      } else {
        // Authentication failed or was cancelled - return to auth screen
        console.log('🔐 [SSO Callback] Not signed in, returning to auth');
        router.replace('/(auth)/archives-auth');
      }
    };

    handleCallback();
  }, [isLoaded, isSignedIn, router]);

  // Show loading screen while processing the callback
  return <LoadingScreen />;
}
