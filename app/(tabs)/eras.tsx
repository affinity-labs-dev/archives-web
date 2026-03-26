// Unified Era Selection Screen
// Handles both onboarding (first-time) and switching (returning user) modes
// Data fetched from Supabase via useEras hook

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Platform,
} from 'react-native';
import { LegendList } from '@legendapp/list';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { useGamifiedProgress, useEraProgressStore } from '@/gamification';
import { useEras, Era, isEraAccessible } from '@/hooks/useEras';
import { EraCard, EraSelectionSkeleton } from '@/components/EraSelection';
import ArchivesTheme from '@/constants/ArchivesTheme';
import { analyticsService } from '@/services/AnalyticsService';
import AppLogger from '@/services/AppLogger';
import { useRevenueCat } from '@/hooks/useRevenueCat';

export default function EraSelection() {
  const router = useRouter();
  const { mode, era } = useLocalSearchParams<{ mode?: 'onboarding'; era?: string }>();
  const isOnboarding = mode === 'onboarding';

  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { setSelectedEra } = useGamifiedProgress();
  const { eras, loading, error } = useEras();

  // Initialize from zustand store so the eras tab shows the currently selected era
  const globalSelectedEra = useEraProgressStore((s) => s.selectedEra);
  const [selectedEraId, setSelectedEraId] = useState<string | null>(null);

  // Sync local UI state when global selectedEra changes (e.g., on fresh login / tab switch)
  React.useEffect(() => {
    if (globalSelectedEra && selectedEraId === null) {
      setSelectedEraId(globalSelectedEra);
    }
  }, [globalSelectedEra, selectedEraId]);

  // Ref to prevent multiple simultaneous paywall presentations
  const isPaywallPresentedRef = useRef(false);

  // Get subscription status from RevenueCat (now linked to Clerk identity)
  const { isSubscribed, customerInfo } = useRevenueCat();
  const hasSubscription = isSubscribed;

  // Founding members purchased the Lifetime Subscription via web billing
  const foundingProductId = customerInfo?.entitlements.active['Access of All Eras - Yearly']?.productIdentifier;
  const isFoundingMember = foundingProductId === 'Archives_Lifetime_Offer';

  // Set user properties for analytics (fallback for onboarding)
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

  // Track page views
  useFocusEffect(
    useCallback(() => {
      const screenName = isOnboarding ? 'era_selection_onboarding' : 'era';
      console.log(`📊 [EraSelection] Screen focused - ${screenName}`);
      analyticsService.startPageView(screenName, isOnboarding ? '/era-selection' : '/eras');

      return () => {
        console.log(`📊 [EraSelection] Screen blurred - ${screenName}`);
        analyticsService.endPageView(screenName);
      };
    }, [isOnboarding])
  );

  // Deep link support: Auto-select era when era param is provided
  // Works with any era_id from Supabase (e.g., ?era=women_of_islam)
  React.useEffect(() => {
    if (!era || loading || error || eras.length === 0) return;

    // Find era matching the deep link param (by era_id)
    const matchedEra = eras.find((e) => e.era_id === era);

    if (matchedEra) {
      const canSelect = isEraAccessible(matchedEra.status, hasSubscription, isFoundingMember);
      if (canSelect) {
        console.log(`🔗 [DeepLink] Auto-selecting era: ${matchedEra.title} (${era})`);
        setSelectedEraId(matchedEra.era_id);
        Haptics.selectionAsync();
      } else {
        console.log(`🔗 [DeepLink] Era not accessible: ${matchedEra.title} (${era})`);
      }
    } else {
      console.log(`🔗 [DeepLink] Era not found: ${era}`);
    }
  }, [era, eras, loading, error, hasSubscription, isFoundingMember]);

  // Present paywall for locked premium eras (stable ref to avoid stale closure in handleEraSelect)
  const handleShowPaywall = useCallback(async (era: Era) => {
    if (isPaywallPresentedRef.current) {
      AppLogger.warn('subscription', 'Era paywall already presented, skipping');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    analyticsService.trackSubscribeScreenViewed({
      trigger: 'era_locked',
      era_id: era.era_id,
      era_name: era.title,
    });

    try {
      isPaywallPresentedRef.current = true;
      const result = await RevenueCatUI.presentPaywall();

      switch (result) {
        case PAYWALL_RESULT.PURCHASED:
        case PAYWALL_RESULT.RESTORED: {
          AppLogger.info('subscription', `Era paywall ${result === PAYWALL_RESULT.PURCHASED ? 'purchase' : 'restore'} completed`, { era_id: era.era_id });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          if (result === PAYWALL_RESULT.PURCHASED) {
            analyticsService.trackSubscribePurchaseCompleted({
              trigger: 'era_locked',
              plan: 'yearly',
              era_id: era.era_id,
              era_name: era.title,
            });
          } else {
            analyticsService.trackSubscribeRestoreSuccess({
              trigger: 'era_locked',
              era_id: era.era_id,
              era_name: era.title,
            });
          }

          // Auto-select the era after successful purchase
          // RevenueCat hook will update isSubscribed, making era accessible
          setSelectedEraId(era.era_id);
          break;
        }

        case PAYWALL_RESULT.CANCELLED:
          AppLogger.info('subscription', 'Era paywall cancelled', { era_id: era.era_id });
          analyticsService.trackSubscribePurchaseCancelled({
            trigger: 'era_locked',
            era_id: era.era_id,
            era_name: era.title,
          });
          break;

        case PAYWALL_RESULT.NOT_PRESENTED:
          AppLogger.warn('subscription', 'Paywall not presented for era', { era_id: era.era_id });
          break;

        case PAYWALL_RESULT.ERROR:
          AppLogger.error('subscription', 'Paywall error for era', { era_id: era.era_id });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          analyticsService.trackSubscribePurchaseFailed({
            trigger: 'era_locked',
            era_id: era.era_id,
            era_name: era.title,
            error_code: 'paywall_error',
          });
          break;
      }
    } catch (err) {
      AppLogger.error('subscription', 'Error presenting era paywall', { era_id: era.era_id }, err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      analyticsService.trackSubscribePurchaseFailed({
        trigger: 'era_locked',
        era_id: era.era_id,
        era_name: era.title,
        error_code: err instanceof Error ? err.message : 'unknown',
      });
    } finally {
      isPaywallPresentedRef.current = false;
    }
  }, []);

  const handleEraSelect = useCallback((era: Era) => {
    const canSelect = isEraAccessible(era.status, hasSubscription, isFoundingMember);
    if (!canSelect) {
      // Premium eras → show paywall; founding/coming_soon → ignore
      if (era.status === 'premium') {
        handleShowPaywall(era);
      }
      return;
    }

    Haptics.selectionAsync();
    setSelectedEraId(era.era_id);
  }, [hasSubscription, isFoundingMember, handleShowPaywall]);

  const handleContinue = async () => {
    if (!selectedEraId) return;

    const selectedEra = eras.find((e) => e.era_id === selectedEraId);
    if (!selectedEra) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Store selected era in context (using Supabase era_id directly)
    await setSelectedEra(selectedEra.era_id);

    // Track era selection
    analyticsService.trackEraSelected({
      era_name: selectedEra.title,
      era_id: selectedEra.era_id,
      screen: isOnboarding ? 'era_selection' : 'eras_tab',
      context: isOnboarding ? 'onboarding' : 'era_switch',
      selection_order: eras.findIndex((e) => e.era_id === selectedEraId),
    });

    if (isOnboarding) {
      // Mark onboarding as completed and save selected era
      await AsyncStorage.setItem('onboarding_completed', 'true');
      await AsyncStorage.setItem('selected_era', selectedEra.era_id);
      console.log('✅ Onboarding completed - selected era:', selectedEra.era_id);
      router.replace('/(tabs)');
    } else {
      router.push('/(tabs)');
    }
  };

  // Check if selected era is accessible
  const selectedEra = useMemo(
    () => eras.find((e) => e.era_id === selectedEraId),
    [eras, selectedEraId]
  );
  const canContinue =
    selectedEraId !== null &&
    selectedEra &&
    isEraAccessible(selectedEra.status, hasSubscription, isFoundingMember);

  // Sort all eras and pre-compute grid layout (eliminates O(n²) in render)
  type EraRow = { type: 'full' | 'grid'; eras: Era[] };
  const eraRows = useMemo(() => {
    const sorted = [...eras].sort((a, b) => a.order_by - b.order_by);
    const rows: EraRow[] = [];
    let i = 0;
    while (i < sorted.length) {
      const era = sorted[i];
      if (era.card_layout === 'full_width') {
        rows.push({ type: 'full', eras: [era] });
        i++;
      } else {
        // Grid: pair current with next grid card if available
        const pair: Era[] = [era];
        if (i + 1 < sorted.length && sorted[i + 1].card_layout === 'grid') {
          pair.push(sorted[i + 1]);
          i += 2;
        } else {
          i++;
        }
        rows.push({ type: 'grid', eras: pair });
      }
    }
    return rows;
  }, [eras]);

  // LegendList render callbacks (stable refs for virtualization)
  const renderEraRow = useCallback(({ item: row }: { item: EraRow }) => {
    if (row.type === 'full') {
      const era = row.eras[0];
      return (
        <EraCard
          era={era}
          isSelected={selectedEraId === era.era_id}
          onSelect={handleEraSelect}
          hasSubscription={hasSubscription}
          isFoundingMember={isFoundingMember}
        />
      );
    }

    return (
      <View style={styles.gridContainer}>
        <View style={styles.gridRow}>
          {row.eras.map((era) => (
            <EraCard
              key={era.era_id}
              era={era}
              isSelected={selectedEraId === era.era_id}
              onSelect={handleEraSelect}
              hasSubscription={hasSubscription}
              isFoundingMember={isFoundingMember}
            />
          ))}
        </View>
      </View>
    );
  }, [selectedEraId, handleEraSelect, hasSubscription, isFoundingMember]);

  const eraRowKeyExtractor = useCallback(
    (item: EraRow) => item.eras[0].era_id,
    []
  );

  return (
    <SafeAreaView style={[styles.safeArea, Platform.OS === 'android' && { paddingTop: 20 }]}>
      <StatusBar
        barStyle="dark-content"
        translucent={false}
        backgroundColor={ArchivesTheme.colors.creamWhite}
      />
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.headerSection}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Choose Your Era</Text>
            <Text style={styles.headerSubtitle}>
              Begin your journey through Islamic history
            </Text>
          </View>
        </View>

        {/* Content */}
        {loading ? (
          <EraSelectionSkeleton />
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load eras</Text>
            <Text style={styles.errorSubtext}>{error}</Text>
          </View>
        ) : (
          <LegendList
            recycleItems
            data={eraRows}
            extraData={selectedEraId}
            renderItem={renderEraRow}
            keyExtractor={eraRowKeyExtractor}
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            estimatedItemSize={250}
          />
        )}

        {/* Floating button */}
        <View style={styles.floatingButtonContainer}>
          <Pressable
            style={[styles.enterEraButton, canContinue && styles.enterEraButtonActive]}
            onPress={handleContinue}
            disabled={!canContinue}
          >
            <Text style={styles.enterEraButtonText}>ENTER ERA</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  container: {
    flex: 1,
  },
  // Header
  headerSection: {
    height: 80,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerContent: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 4,
    width: '100%',
  },
  headerTitle: {
    ...ArchivesTheme.typography.h2,
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'DM Sans',
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'left',
    paddingLeft: 25,
    paddingRight: 20,
    paddingTop: 10,
  },
  headerSubtitle: {
    ...ArchivesTheme.typography.body,
    fontWeight: '600',
    color: ArchivesTheme.colors.persianOrange,
    textAlign: 'left',
    paddingLeft: 25,
    paddingRight: 20,
  },

  // Scroll content
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 100,
    gap: 15,
  },

  // Grid layout
  gridContainer: {
    marginVertical: 5,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown,
    textAlign: 'center',
  },

  // Floating button
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  enterEraButton: {
    width: 280,
    height: 45,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 26.5,
    borderWidth: 2,
    borderColor: ArchivesTheme.colors.persianOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enterEraButtonActive: {
    backgroundColor: ArchivesTheme.colors.mossGreen,
    borderColor: ArchivesTheme.colors.mossGreen,
    shadowColor: ArchivesTheme.colors.mossGreen,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  enterEraButtonText: {
    ...ArchivesTheme.typography.buttonLarge,
    fontSize: 20,
    fontWeight: '600',
    color: ArchivesTheme.colors.creamWhite,
  },
});
