// Owns the paywall presentation flow for premium-locked eras.
// Re-entrancy guard lives inside the hook so the parent screen
// doesn't have to thread a ref through.

import { useCallback, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { Era } from '@/hooks/useEras';
import { analyticsService } from '@/services/AnalyticsService';
import AppLogger from '@/services/AppLogger';

interface UseEraPaywallOptions {
  onPurchaseComplete?: (era: Era) => void;
}

export function useEraPaywall({ onPurchaseComplete }: UseEraPaywallOptions = {}) {
  const isPaywallPresentedRef = useRef(false);

  const handleShowPaywall = useCallback(
    async (era: Era) => {
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
            AppLogger.info(
              'subscription',
              `Era paywall ${result === PAYWALL_RESULT.PURCHASED ? 'purchase' : 'restore'} completed`,
              { era_id: era.era_id },
            );
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

            onPurchaseComplete?.(era);
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
    },
    [onPurchaseComplete],
  );

  return { handleShowPaywall };
}
