import { useCallback, useState } from 'react';
import { Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import type { useAuth, useUser } from '@clerk/clerk-expo';
import type { useRouter } from 'expo-router';

import { analyticsService } from '@/services/AnalyticsService';
import { liveActivityManager } from '@/services/LiveActivityManager';
import {
  clearAllRememberedAccounts,
  upsertRememberedAccount,
} from '@/services/RememberedAccountService';
import {
  getPaywallSeenSnapshot,
  removeUserFromPaywallSeen,
  restorePaywallSeenSnapshot,
} from '@/services/PaywallGateService';
import type { NewUserProgress } from '@/components/profile/types';

type ClerkUser = ReturnType<typeof useUser>['user'];
type Router = ReturnType<typeof useRouter>;
type SignOut = ReturnType<typeof useAuth>['signOut'];

interface Args {
  user: ClerkUser;
  signOut: SignOut;
  router: Router;
  moduleProgress: any[];
  newUserProgress: NewUserProgress[];
  totalXP: number;
  onSettingsClose: () => void;
}

const KEYS_TO_CLEAR_ON_DELETE = [
  'selected_era',
  'adventure_progress',
  'module_progress',
  'new_user_progress',
  'totalXP',
  'user_preferences',
  'user_unlockables_data',
];

// Centralizes all account-mutating actions on the Profile tab
// (sign-out, delete, manage subscription, support/legal links).
// Co-locating them keeps the screen file focused on rendering and
// avoids spreading the AsyncStorage / analytics ordering across
// scattered callbacks where the sequencing is easy to break.
export function useProfileAccount({
  user,
  signOut,
  router,
  moduleProgress,
  newUserProgress,
  totalXP,
  onSettingsClose,
}: Args) {
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  // Reserved for a future RevenueCat customer-portal flow. Kept so
  // handleManageSubscription's re-entrancy guard has a real flag to
  // toggle when that lands.
  const [isLoadingPortal] = useState(false);

  const handleSignOut = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const hadSelectedEra = !!(await AsyncStorage.getItem('selected_era'));
      analyticsService.trackUserSessionOut({
        trigger: 'manual_profile',
        session_duration_seconds: null,
        had_selected_era: hadSelectedEra,
      });
      analyticsService.manualSignOutInProgress = true;

      // Snapshot remembered account so /welcome-back can offer a
      // one-tap re-sign-in without forcing the user back to the
      // onboarding-step-1 cold-start flow.
      const rememberedSnapshot =
        user?.id && user?.primaryEmailAddress?.emailAddress
          ? {
              userId: user.id,
              firstName: user.firstName ?? null,
              email: user.primaryEmailAddress.emailAddress,
              avatarUrl: user.imageUrl ?? null,
              lastAuthMethod: (() => {
                const provider = user.externalAccounts?.[0]?.provider ?? null;
                if (provider === 'apple') return 'oauth_apple' as const;
                if (provider === 'google') return 'oauth_google' as const;
                return 'email' as const;
              })(),
              lastSignedInAt: Date.now(),
            }
          : null;

      const paywallSeenSnapshot = await getPaywallSeenSnapshot();

      await liveActivityManager.forceEndAll();

      // Clerk needs the token from AsyncStorage before we wipe it.
      await signOut();

      // Allow the React tree to react to auth-out before we nuke
      // storage — guards against subscribers reading half-cleared keys.
      await new Promise((resolve) => setTimeout(resolve, 300));

      await AsyncStorage.clear();

      if (rememberedSnapshot) await upsertRememberedAccount(rememberedSnapshot);
      if (paywallSeenSnapshot) await restorePaywallSeenSnapshot(paywallSeenSnapshot);

      router.replace(
        (rememberedSnapshot ? '/welcome-back' : '/onboarding-step-1') as never,
      );
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, [signOut, user, router]);

  const handleDeleteAccount = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (isDeletingAccount) return;

    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your progress.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) {
              Alert.alert('Error', 'No user account found to delete.');
              return;
            }
            setIsDeletingAccount(true);
            onSettingsClose();

            try {
              const accountAgeDays = user.createdAt
                ? Math.floor(
                    (Date.now() - new Date(user.createdAt).getTime()) /
                      (1000 * 60 * 60 * 24),
                  )
                : undefined;

              const umayyedAdventuresComplete = [1, 2, 3, 4, 5].filter((advId) => {
                const modulesForAdventure = moduleProgress.filter(
                  (m) => m.adventureId === advId,
                );
                return (
                  modulesForAdventure.length === 3 &&
                  modulesForAdventure.every((m) => m.isCompleted)
                );
              }).length;
              const roiAdventuresComplete = newUserProgress.filter(
                (m) => m.isCompleted,
              ).length;
              const totalAdventuresCompleted =
                umayyedAdventuresComplete + roiAdventuresComplete;

              const hadSelectedEra = !!(await AsyncStorage.getItem('selected_era'));
              analyticsService.trackUserSessionOut({
                trigger: 'account_deleted',
                session_duration_seconds: null,
                had_selected_era: hadSelectedEra,
              });
              analyticsService.manualSignOutInProgress = true;

              analyticsService.trackUserAccountDeleted({
                account_age_days: accountAgeDays,
                total_xp: totalXP,
                adventures_completed: totalAdventuresCompleted,
              });

              await liveActivityManager.forceEndAll();
              try {
                await AsyncStorage.multiRemove(KEYS_TO_CLEAR_ON_DELETE);
              } catch (clearError) {
                console.error('Error clearing user data:', clearError);
              }
              await clearAllRememberedAccounts();

              if (user?.id) await removeUserFromPaywallSeen(user.id);

              await user.delete();
              router.replace('/onboarding-step-1');
            } catch (error) {
              setIsDeletingAccount(false);
              console.error('Account deletion error:', error);
              const errorMessage =
                error instanceof Error
                  ? error.message
                  : 'An unexpected error occurred while deleting your account.';
              Alert.alert(
                'Account Deletion Failed',
                `${errorMessage}\n\nPlease try again or contact support if the problem persists.`,
                [
                  { text: 'OK', style: 'default' },
                  {
                    text: 'Contact Support',
                    style: 'default',
                    onPress: () => {
                      Linking.openURL('https://archiveszone.app/support').catch(() =>
                        Alert.alert('Error', 'Could not open support page'),
                      );
                    },
                  },
                ],
              );
            }
          },
        },
      ],
    );
  }, [
    isDeletingAccount,
    user,
    moduleProgress,
    newUserProgress,
    totalXP,
    router,
    onSettingsClose,
  ]);

  const handleManageSubscription = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLoadingPortal) return;
    Alert.alert(
      'Manage Subscription',
      'To cancel or modify your subscription:\n\n1. Go to your email receipt from Archives\n2. Click "Manage Subscription" in the email\n3. Or contact support for assistance',
      [
        {
          text: 'Contact Support',
          onPress: () => {
            Linking.openURL('https://archiveszone.app/support').catch(() =>
              Alert.alert('Error', 'Could not open support page'),
            );
          },
        },
        { text: 'OK', style: 'cancel' },
      ],
    );
  }, [isLoadingPortal]);

  const handlePrivacyPolicy = useCallback(() => {
    console.log('Privacy policy pressed');
  }, []);

  const handleSupport = useCallback(() => {
    Linking.openURL('https://archiveszone.app/support').catch(() =>
      Alert.alert('Error', 'Could not open support page'),
    );
  }, []);

  const handleFAQ = useCallback(() => {
    console.log('FAQ pressed');
  }, []);

  return {
    isDeletingAccount,
    handleSignOut,
    handleDeleteAccount,
    handleManageSubscription,
    handlePrivacyPolicy,
    handleSupport,
    handleFAQ,
  };
}
