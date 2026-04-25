import * as Haptics from "expo-haptics";
import { useRef } from "react";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";

import { analyticsService } from "@/services/AnalyticsService";
import AppLogger from "@/services/AppLogger";
import { toLocalDateString } from "@/utils/dateUtils";

import type { Today } from "./useTodayQuest";

interface UseTodayPaywallArgs {
  /** Called after a successful purchase/restore to load the gated date's content. */
  onUnlockHistoricalDate: (date: Date, quest: Today | null) => void;
  /** Same Supabase `fetchQuestByDate` the rest of today.tsx uses. */
  fetchQuestByDate: (dateString: string) => Promise<Today | null>;
}

/**
 * Paywall presentation flow for the daily-story rewind feature.
 *
 * Owns:
 * - `justPurchasedRef`: race-guard so the "subscription expired while historical"
 *   effect doesn't reset the user's view back to today before RevenueCat's
 *   listener has updated `isSubscribed`.
 * - `isPaywallPresentedRef`: prevents double-presentation if the user
 *   double-taps a locked date.
 *
 * `justPurchasedRef` is exposed via the return so the consumer can read it
 * from the subscription-expiration recovery effect.
 */
export function useTodayPaywall({
  onUnlockHistoricalDate,
  fetchQuestByDate,
}: UseTodayPaywallArgs) {
  const justPurchasedRef = useRef(false);
  const isPaywallPresentedRef = useRef(false);

  const handleShowPaywall = async (date: Date) => {
    if (isPaywallPresentedRef.current) {
      AppLogger.warn("subscription", "Paywall already presented, skipping");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    // Track paywall view triggered from daily story rewind
    analyticsService.trackSubscribeScreenViewed({
      trigger: "daily_story_rewind",
    });

    try {
      isPaywallPresentedRef.current = true;
      const result = await RevenueCatUI.presentPaywall();

      switch (result) {
        case PAYWALL_RESULT.PURCHASED:
        case PAYWALL_RESULT.RESTORED: {
          const action =
            result === PAYWALL_RESULT.PURCHASED ? "Purchase" : "Restore";
          AppLogger.info("subscription", `${action} completed`, {
            trigger: "daily_story_rewind",
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          // Set flag and schedule cleanup BEFORE async work so it always clears
          // even if fetchQuestByDate throws
          justPurchasedRef.current = true;
          setTimeout(() => {
            justPurchasedRef.current = false;
            AppLogger.info(
              "subscription",
              "Purchase protection window ended",
            );
          }, 5000);

          if (result === PAYWALL_RESULT.PURCHASED) {
            analyticsService.trackSubscribePurchaseCompleted({
              trigger: "daily_story_rewind",
              plan: "yearly", // TODO: imperative API doesn't return purchased plan; update if monthly added
            });
          } else {
            analyticsService.trackSubscribeRestoreSuccess({
              trigger: "daily_story_rewind",
            });
          }

          // Unlock the gated date immediately
          const dateStr = toLocalDateString(date);
          AppLogger.info(
            "subscription",
            `Unlocking content for: ${dateStr}`,
          );
          const historicalQuest = await fetchQuestByDate(dateStr);
          onUnlockHistoricalDate(date, historicalQuest);
          break;
        }

        case PAYWALL_RESULT.CANCELLED:
          AppLogger.info("subscription", "Paywall cancelled");
          analyticsService.trackSubscribePurchaseCancelled({
            trigger: "daily_story_rewind",
          });
          break;

        case PAYWALL_RESULT.NOT_PRESENTED:
          AppLogger.warn(
            "subscription",
            "Paywall not presented (no offerings or config issue)",
            { result },
          );
          analyticsService.trackSubscribePurchaseFailed({
            trigger: "daily_story_rewind",
            error_code: "NOT_PRESENTED",
          });
          break;

        case PAYWALL_RESULT.ERROR:
          AppLogger.error("subscription", "Paywall error", { result });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          analyticsService.trackSubscribePurchaseFailed({
            trigger: "daily_story_rewind",
            error_code: "ERROR",
          });
          break;
      }
    } catch (error) {
      AppLogger.error(
        "subscription",
        "Error presenting paywall",
        { trigger: "daily_story_rewind" },
        error,
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      analyticsService.trackSubscribePurchaseFailed({
        trigger: "daily_story_rewind",
        error_code: error instanceof Error ? error.message : "unknown",
      });
    } finally {
      isPaywallPresentedRef.current = false;
    }
  };

  return {
    handleShowPaywall,
    justPurchasedRef,
  };
}
