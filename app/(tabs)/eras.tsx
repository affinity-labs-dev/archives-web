// Unified Era Selection Screen (v5.0 Design System)
// Handles both onboarding (first-time) and switching (returning user) modes.
//
// State + side-effects live in `hooks/eras/`:
//   - useEraPaywall      — RevenueCat paywall flow for premium-locked eras
//   - useEraSelection    — local selectedEraId + global-store sync + deep-link
//   - useEraRows         — split eras into available / coming-soon LegendList rows
//   - useEraNavigation   — handleContinue (analytics + persistence + routing)
//
// Presentational pieces live in `components/EraSelection/`:
//   - EraSelectionHeader — title + subtitle
//   - EraList            — LegendList row renderer
//   - EraEnterButton     — floating bottom CTA

import React, { useCallback } from 'react';
import { Platform, StatusBar, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  EraEnterButton,
  ErasContentArea,
  EraSelectionHeader,
} from '@/components/EraSelection';
import { Typography } from '@/components/ui';
import { colors } from '@/components/ui/theme';
import {
  useEraNavigation,
  useEraPaywall,
  useEraRows,
  useEraSelection,
} from '@/hooks/eras';
import { useEras, isEraAccessible } from '@/hooks/useEras';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { analyticsService } from '@/services/AnalyticsService';

export default function EraSelection() {
  const { mode, era: deepLinkEraId } = useLocalSearchParams<{ mode?: 'onboarding'; era?: string }>();
  const isOnboarding = mode === 'onboarding';

  const { isSignedIn } = useAuth();
  const { user } = useUser();

  const { eras, loading, error } = useEras();

  // Subscription state — drives accessibility checks and paywall gating.
  const { isSubscribed, customerInfo } = useRevenueCat();
  const foundingProductId =
    customerInfo?.entitlements.active['Access of All Eras - Yearly']?.productIdentifier;
  const isFoundingMember = foundingProductId === 'Archives_Lifetime_Offer';

  // Set user properties for analytics (fallback for onboarding).
  React.useEffect(() => {
    if (isSignedIn && user) {
      analyticsService.setUserProperties(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      });
      console.log('✅ [EraSelection] User properties set for Clerk ID:', user.id);
    }
  }, [isSignedIn, user]);

  // Page view tracking
  useFocusEffect(
    useCallback(() => {
      const screenName = isOnboarding ? 'era_selection_onboarding' : 'era';
      analyticsService.startPageView(screenName, isOnboarding ? '/era-selection' : '/eras');
      return () => {
        analyticsService.endPageView(screenName);
      };
    }, [isOnboarding]),
  );

  // Paywall flow — auto-selects the era after a successful purchase/restore
  // by feeding the era_id back into our local selection state.
  const { handleShowPaywall } = useEraPaywall({
    onPurchaseComplete: (era) => setSelectedEraId(era.era_id),
  });

  // Selection state + deep-link auto-select + accessibility-aware tap handler.
  const { selectedEraId, setSelectedEraId, handleEraSelect } = useEraSelection({
    eras,
    loading,
    error,
    deepLinkEraId,
    isSubscribed,
    isFoundingMember,
    onLockedPremiumTap: handleShowPaywall,
  });

  // LegendList rows (available + coming-soon split, with grid pairing).
  const eraRows = useEraRows(eras);

  // Continue flow — analytics, persistence, navigation.
  const { handleContinue } = useEraNavigation({ isOnboarding, eras });

  const selectedEra = React.useMemo(
    () => eras.find((e) => e.era_id === selectedEraId),
    [eras, selectedEraId],
  );
  const canContinue =
    selectedEraId !== null &&
    !!selectedEra &&
    isEraAccessible(selectedEra.status, isSubscribed, isFoundingMember);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, Platform.OS === 'android' && { paddingTop: 20 }]}
    >
      <StatusBar barStyle="dark-content" translucent={false} backgroundColor={colors.snow} />

      <View style={styles.container}>
        <EraSelectionHeader />

        {error ? (
          <View style={styles.errorContainer}>
            <Typography variant="heading.m" color="onyx">
              Failed to load eras
            </Typography>
            <Typography variant="body.s" color="textMuted" align="center">
              {error}
            </Typography>
          </View>
        ) : (
          <ErasContentArea
            loading={loading}
            eraRows={eraRows}
            selectedEraId={selectedEraId}
            isSubscribed={isSubscribed}
            isFoundingMember={isFoundingMember}
            onEraSelect={handleEraSelect}
          />
        )}

        <EraEnterButton onPress={() => handleContinue(selectedEraId)} disabled={!canContinue} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.snow,
  },
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
});
