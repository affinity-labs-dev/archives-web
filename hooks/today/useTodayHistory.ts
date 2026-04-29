import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/hooks/lib/supabase";
import AppLogger from "@/services/AppLogger";
import { toLocalDateString } from "@/utils/dateUtils";

import type { Today } from "./useTodayQuest";

interface UseTodayHistoryArgs {
  todayQuest: Today | null;
  userId: string | undefined;
  isSubscribed: boolean;
  isSubscriptionLoading: boolean;
  /**
   * Race-guard shared with useTodayPaywall: the subscription-expiration
   * recovery effect skips its reset while this ref is `true` (the paywall
   * sets it for 5s after a successful purchase to wait for the RevenueCat
   * listener to update isSubscribed).
   */
  justPurchasedRef: React.MutableRefObject<boolean>;
}

/**
 * Calendar / historical-date navigation state for the Today screen.
 *
 * Owns the displayed-date state (selectedDate / displayedQuest /
 * isHistoricalView), the calendar's completed-dates cache, and the
 * Supabase fetchers (fetchQuestByDate / fetchCompletedQuestDates).
 *
 * Three sync effects live here:
 * - When `todayQuest` loads or selectedDate is "today", set displayedQuest.
 * - When the subscription expires while viewing historical content,
 *   reset to today (skipped during the post-purchase race window).
 * - On mount + every time `questCompleted` flips, refresh the
 *   completed-dates cache for the calendar (60-day window).
 *
 * The handleDateClick orchestration (paywall gating, tracking) stays in
 * today.tsx because it spans this hook + the paywall hook + tracking.
 */
export function useTodayHistory({
  todayQuest,
  userId,
  isSubscribed,
  isSubscriptionLoading,
  justPurchasedRef,
}: UseTodayHistoryArgs) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [displayedQuest, setDisplayedQuest] = useState<Today | null>(null);
  const [isHistoricalView, setIsHistoricalView] = useState(false);
  const [completedDatesCache, setCompletedDatesCache] =
    useState<Set<string> | null>(null);

  // Fetch historical quest by date from Supabase
  const fetchQuestByDate = async (
    dateString: string,
  ): Promise<Today | null> => {
    try {
      AppLogger.info("daily", "Fetching quest for date", { dateString });
      const { data, error } = await supabase
        .from("daily_content")
        .select("*")
        .eq("date", dateString)
        .maybeSingle();

      if (error) {
        AppLogger.error("daily", "Error fetching quest by date", { dateString }, error);
        return null;
      }

      if (!data) {
        AppLogger.info("daily", "No content found for date", { dateString });
        return null;
      }

      AppLogger.info("daily", "Quest loaded for date", { dateString });
      return data as Today;
    } catch (err) {
      AppLogger.error("daily", "Exception fetching quest by date", { dateString }, err);
      return null;
    }
  };

  // Fetch completed quest dates from Supabase for calendar display
  const fetchCompletedQuestDates = async (
    startDate: Date,
    endDate: Date,
  ): Promise<Set<string>> => {
    if (!userId) return new Set();

    try {
      const startDateStr = toLocalDateString(startDate);
      const endDateStr = toLocalDateString(endDate);

      // Only mark dates as completed if ALL sections are done:
      // watch_completed = true, explore_completed = true, score > 0 (quiz done)
      const { data, error } = await supabase
        .from("user_daily_quest_progress")
        .select(
          "daily_quest_id, daily_content!fk_daily_quest!inner(date), watch_completed, explore_completed, score",
        )
        .eq("user_id", userId)
        .eq("watch_completed", true)
        .eq("explore_completed", true)
        .gt("score", 0)
        .gte("daily_content.date", startDateStr)
        .lte("daily_content.date", endDateStr);

      if (error) {
        AppLogger.error("daily", "Error fetching completed dates", {}, error);
        return new Set();
      }

      const completedDates = new Set(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data?.map((row: any) => row.daily_content.date) || [],
      );
      AppLogger.info("daily", "Fetched completed dates", {
        count: completedDates.size,
        dates: Array.from(completedDates),
      });
      return completedDates;
    } catch (error) {
      AppLogger.error("daily", "Exception fetching completed dates", {}, error);
      return new Set();
    }
  };

  // Set displayedQuest when todayQuest loads (for current day)
  useEffect(() => {
    const today = toLocalDateString(new Date());
    const selectedDateStr = toLocalDateString(selectedDate);

    if (todayQuest && selectedDateStr === today) {
      setDisplayedQuest(todayQuest);
      setIsHistoricalView(false);
    }
  }, [todayQuest, selectedDate]);

  // Handle subscription expiration while viewing historical content
  useEffect(() => {
    // Skip reset if user just completed a purchase (prevents race condition)
    // The RevenueCat listener hasn't updated isSubscribed yet, but purchase was successful
    if (justPurchasedRef.current) {
      AppLogger.info(
        "subscription",
        "Skipping reset - purchase just completed, waiting for subscription state sync",
      );
      return;
    }

    // If user is viewing historical content and subscription expires, reset to today
    if (isHistoricalView && !isSubscribed && !isSubscriptionLoading) {
      AppLogger.warn(
        "subscription",
        "Subscription expired while viewing historical content - resetting to today",
      );
      const today = new Date();
      setSelectedDate(today);
      setIsHistoricalView(false);
      setDisplayedQuest(todayQuest);
    }
  }, [
    isSubscribed,
    isSubscriptionLoading,
    isHistoricalView,
    todayQuest,
    justPurchasedRef,
  ]);

  // Stable refresh callback: re-loads the calendar's completed-dates
  // cache for the trailing 60-day window. Caller (today.tsx) wires this
  // to fire on user-id change AND on questCompleted toggle so the
  // calendar updates the day a user finishes.
  const refreshCompletedDates = useCallback(async () => {
    if (!userId) {
      setCompletedDatesCache(new Set());
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch for a wider range to cover both week view and month modal
    // Go back 60 days to cover historical data
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 60);

    const completedDates = await fetchCompletedQuestDates(startDate, today);
    setCompletedDatesCache(completedDates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // On mount + every user-id change, refresh the cache. The questCompleted
  // refresh is wired from today.tsx via a separate useEffect so this hook
  // doesn't need to know about useTodayProgress's state.
  useEffect(() => {
    refreshCompletedDates();
  }, [refreshCompletedDates]);

  return {
    selectedDate,
    setSelectedDate,
    displayedQuest,
    setDisplayedQuest,
    isHistoricalView,
    setIsHistoricalView,
    completedDatesCache,
    fetchQuestByDate,
    refreshCompletedDates,
  };
}
