// Unified Era Selection Screen (v5.0 Design System)
// Handles both onboarding (first-time) and switching (returning user) modes

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { LegendList } from '@legendapp/list';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGamifiedProgress, useEraProgressStore } from '@/gamification';
import { useEras, Era, isEraAccessible } from '@/hooks/useEras';
import { EraCard, EraSelectionSkeleton } from '@/components/EraSelection';
import { Typography, DepthButton } from '@/components/ui';
import { colors, spacing } from '@/components/ui/theme';
import { analyticsService } from '@/services/AnalyticsService';
import AppLogger from '@/services/AppLogger';
import { useRevenueCat } from '@/hooks/useRevenueCat';

type EraRow = { type: 'full' | 'grid' | 'sectionHeader'; eras: Era[]; label?: string };

/** Convert a flat era list into full-width / grid row pairs */
function buildEraRows(eraList: Era[]): EraRow[] {
  const result: EraRow[] = [];
  let i = 0;
  while (i < eraList.length) {
    const era = eraList[i];
    if (era.card_layout === 'full_width') {
      result.push({ type: 'full', eras: [era] });
      i++;
    } else {
      const pair: Era[] = [era];
      if (i + 1 < eraList.length && eraList[i + 1].card_layout === 'grid') {
        pair.push(eraList[i + 1]);
        i += 2;
      } else {
        i++;
      }
      result.push({ type: 'grid', eras: pair });
    }
  }
  return result;
}

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
  React.useEffect(() => {
    if (!era || loading || error || eras.length === 0) return;

    const matchedEra = eras.find((e) => e.era_id === era);

    if (matchedEra) {
      const canSelect = isEraAccessible(matchedEra.status, isSubscribed, isFoundingMember);
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
  }, [era, eras, loading, error, isSubscribed, isFoundingMember]);

  // Present paywall for locked premium eras
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
    const canSelect = isEraAccessible(era.status, isSubscribed, isFoundingMember);
    if (!canSelect) {
      if (era.status === 'premium') {
        handleShowPaywall(era);
      }
      return;
    }

    Haptics.selectionAsync();
    setSelectedEraId(era.era_id);
  }, [isSubscribed, isFoundingMember, handleShowPaywall]);

  const handleContinue = async () => {
    if (!selectedEraId) return;

    const selectedEra = eras.find((e) => e.era_id === selectedEraId);
    if (!selectedEra) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    analyticsService.trackEraSelected({
      era_name: selectedEra.title,
      era_id: selectedEra.era_id,
      screen: isOnboarding ? 'era_selection' : 'eras_tab',
      context: isOnboarding ? 'onboarding' : 'era_switch',
      selection_order: eras.findIndex((e) => e.era_id === selectedEraId),
    });

    if (isOnboarding) {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      await AsyncStorage.setItem('selected_era', selectedEra.era_id);
      await setSelectedEra(selectedEra.era_id);
      console.log('✅ Onboarding completed - selected era:', selectedEra.era_id);
      router.replace('/(tabs)');
    } else {
      // Defer the global era update until after navigation transition begins.
      // Updating the store before push triggers re-renders across all tabs
      // (video views remount, count-up animations start) while this screen's
      // exit animations are still flushing — this race causes a native crash
      // in expo-video VideoTrack teardown + Reanimated worklet flush.
      router.push('/(tabs)');
      requestAnimationFrame(() => {
        setSelectedEra(selectedEra.era_id);
      });
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
    isEraAccessible(selectedEra.status, isSubscribed, isFoundingMember);

  // Split eras into available (active/premium) and coming soon sections
  const eraRows = useMemo(() => {
    const sorted = [...eras].sort((a, b) => a.order_by - b.order_by);

    const available = sorted.filter(e => e.status === 'active' || e.status === 'premium');
    const comingSoon = sorted.filter(e => e.status !== 'active' && e.status !== 'premium');

    const rows: EraRow[] = buildEraRows(available);

    if (comingSoon.length > 0) {
      rows.push({ type: 'sectionHeader', eras: [], label: 'Eras Coming Soon...' });
      rows.push(...buildEraRows(comingSoon));
    }

    return rows;
  }, [eras]);

  // LegendList render callbacks
  const renderEraRow = useCallback(({ item: row }: { item: EraRow }) => {
    if (row.type === 'sectionHeader') {
      return (
        <View style={styles.sectionHeaderContainer}>
          <Typography family="onest" size={18} weight="700" extraColor="#41425E">
            {row.label}
          </Typography>
        </View>
      );
    }

    if (row.type === 'full') {
      const era = row.eras[0];
      return (
        <EraCard
          era={era}
          isSelected={selectedEraId === era.era_id}
          onSelect={handleEraSelect}
          hasSubscription={isSubscribed}
          isFoundingMember={isFoundingMember}
        />
      );
    }

    return (
      <View style={styles.gridRow}>
        {row.eras.map((era) => (
          <EraCard
            key={era.era_id}
            era={era}
            isSelected={selectedEraId === era.era_id}
            onSelect={handleEraSelect}
            hasSubscription={isSubscribed}
            isFoundingMember={isFoundingMember}
          />
        ))}
      </View>
    );
  }, [selectedEraId, handleEraSelect, isSubscribed, isFoundingMember]);

  const eraRowKeyExtractor = useCallback(
    (item: EraRow) => item.type === 'sectionHeader' ? 'section-coming-soon' : item.eras[0].era_id,
    []
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, Platform.OS === 'android' && { paddingTop: 20 }]}>
      <StatusBar
        barStyle="dark-content"
        translucent={false}
        backgroundColor={colors.snow}
      />
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.headerSection}>
          <Typography family="onest" size={28} weight="700" color="onyx">
            Choose Your Era
          </Typography>
          <Typography variant="body.m" color="acaiPrimary" weight="600">
            Begin your journey through Islamic history
          </Typography>
        </View>

        {/* Content — key forces remount on focus so entering animations replay */}
        {loading ? (
          <EraSelectionSkeleton />
        ) : error ? (
          <View style={styles.errorContainer}>
            <Typography variant="heading.m" color="onyx">
              Failed to load eras
            </Typography>
            <Typography variant="body.s" color="textMuted" align="center">
              {error}
            </Typography>
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

        {/* Floating ENTER ERA button */}
        <View style={styles.floatingButtonContainer}>
          <DepthButton
            variant="tertiary"
            size="medium"
            radius={26.5}
            pressEffect="dip"
            onPress={handleContinue}
            isDisabled={!canContinue}
            isFullWidth
          >
            <Typography family="onest" size={18} weight="700" color="white" letterSpacing={-0.18}>
              ENTER ERA
            </Typography>
          </DepthButton>
        </View>
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
  headerSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  sectionHeaderContainer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg - 4,
    paddingTop: spacing.md,
    paddingBottom: 70,
    gap: 10,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 16,
    left: spacing.xl,
    right: spacing.xl,
  },
});
