import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef } from "react";

import { liveActivityManager } from "@/services/LiveActivityManager";
import AppLogger from "@/services/AppLogger";
import { toLocalDateString } from "@/utils/dateUtils";

import type { Today } from "./useTodayQuest";

interface UseDailyStoryLiveActivityArgs {
  todayQuest: Today | null;
  displayedQuest: Today | null;
  isHistoricalView: boolean;
  watchCompleted: boolean;
  exploreCompleted: boolean;
  questCompleted: boolean;
  streak: number;
}

/**
 * iOS Live Activity coordination for Daily Story.
 *
 * - Starts the activity on first Today-tab focus (once per day, only if
 *   incomplete and streak has hydrated).
 * - Syncs streak changes to a running activity (card completions are
 *   handled by the consumer via the returned `updateDailyStoryIfActive`).
 *
 * Returned `updateDailyStoryIfActive` is a stable useCallback the consumer
 * can invoke from `onNext` callbacks when each card completes — same
 * behavior as the inline version it replaces.
 */
export function useDailyStoryLiveActivity({
  todayQuest,
  displayedQuest,
  isHistoricalView,
  watchCompleted,
  exploreCompleted,
  questCompleted,
  streak,
}: UseDailyStoryLiveActivityArgs) {
  // Guard: streak starts as 0 before cloud hydration — don't expose pre-hydration value
  const isStreakHydrated = streak > 0;
  const streakRef = useRef(streak);
  useEffect(() => {
    streakRef.current = streak;
  }, [streak]);

  // Live Activity — update DailyStory progress if activity is running.
  // Guard: only update if user is interacting with TODAY's quest (not historical/rewind).
  const updateDailyStoryIfActive = useCallback(
    (cards: {
      watchCompleted: boolean;
      exploreCompleted: boolean;
      questionsCompleted: boolean;
    }) => {
      if (!liveActivityManager.isDailyStoryActive) return;

      if (isHistoricalView) return;
      const quest = displayedQuest || todayQuest;
      const today = toLocalDateString(new Date());
      if (!quest || quest.date !== today) return;

      liveActivityManager
        .updateDailyStoryProgress({
          ...cards,
          currentStreak: streak,
        })
        .catch((err) => {
          AppLogger.error(
            "gamification",
            "DailyStory Live Activity update failed",
            {},
            err as Error,
          );
        });
    },
    [streak, isHistoricalView, displayedQuest, todayQuest],
  );

  // Imperative LA start — invoked by the START MY DAY button handler in
  // today.tsx after it stamps the timing record. Manager reads the record
  // and uses its `startedAt` for the count-up banner anchor. This is the
  // primary path: timer + banner only appear after explicit user action.
  const startActivityNow = useCallback(() => {
    if (!todayQuest) return;
    if (questCompleted && watchCompleted && exploreCompleted) return;
    const today = toLocalDateString(new Date());
    if (todayQuest.date !== today) return;
    if (!isStreakHydrated) return;

    liveActivityManager
      .startDailyStoryActivity({
        storyId: todayQuest.id,
        storyTitle: todayQuest.content.today_title,
        dayNumber: todayQuest.content.day_number,
        totalDays: todayQuest.content.total_days,
        currentStreak: streakRef.current,
        watchCompleted,
        exploreCompleted,
        questionsCompleted: questCompleted,
      })
      .catch((err) => {
        AppLogger.error(
          "gamification",
          "DailyStory Live Activity start failed",
          {},
          err as Error,
        );
      });
  }, [
    todayQuest,
    questCompleted,
    watchCompleted,
    exploreCompleted,
    isStreakHydrated,
  ]);

  // Cold-start recovery — on app foreground, if a timing record already
  // exists for today (user pressed START in a previous session that got
  // killed), the manager will read it and restore the LA banner with the
  // original startedAt. Same `startActivityNow` is used: the manager's
  // `getRecord` check is what gates whether anything actually happens.
  // No record = no LA, even on focus.
  useFocusEffect(
    useCallback(() => {
      startActivityNow();
    }, [startActivityNow]),
  );

  // Sync streak changes to Live Activity
  // (card completions already handled by `updateDailyStoryIfActive` from onNext callbacks)
  useEffect(() => {
    if (!liveActivityManager.isDailyStoryActive) return;
    if (isHistoricalView) return;
    liveActivityManager
      .updateDailyStoryProgress({
        watchCompleted,
        exploreCompleted,
        questionsCompleted: questCompleted,
        currentStreak: streak,
      })
      .catch((err) => {
        AppLogger.error(
          "gamification",
          "DailyStory streak sync failed",
          {},
          err as Error,
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streak, isHistoricalView]);

  return { updateDailyStoryIfActive, startActivityNow };
}
