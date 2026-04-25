import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

import { supabase } from "@/hooks/lib/supabase";
import AppLogger from "@/services/AppLogger";

import type { Today } from "./useTodayQuest";

interface UseTodayProgressArgs {
  displayedQuest: Today | null;
  todayQuest: Today | null;
  userId: string | undefined;
  isHistoricalView: boolean;
}

/**
 * Per-section completion state for the active quest (today or historical).
 *
 * Loads progress from Supabase (with AsyncStorage fallback) on quest change,
 * exposes setters + a save helper that round-trips to both stores, and
 * derives the `progress` percentage with the loading-window guard the UI
 * needs to avoid showing stale progress during day-switch.
 *
 * The dependency array of the load effect is preserved exactly from the
 * pre-refactor today.tsx — including the intentional pairing of
 * `displayedQuest?.id` AND `displayedQuest` (the inner code reads both the
 * id and the full object, so both are tracked).
 */
export function useTodayProgress({
  displayedQuest,
  todayQuest,
  userId,
  isHistoricalView,
}: UseTodayProgressArgs) {
  const [watchCompleted, setWatchCompleted] = useState(false);
  const [exploreCompleted, setExploreCompleted] = useState(false);
  const [questCompleted, setQuestCompleted] = useState(false);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);

  // Load progress from AsyncStorage when quest changes
  useEffect(() => {
    // CRITICAL: Reset state IMMEDIATELY when quest changes (synchronous)
    // This prevents showing stale progress from previous date during async load
    setIsLoadingProgress(true);
    setWatchCompleted(false);
    setExploreCompleted(false);
    setQuestCompleted(false);

    const loadProgress = async () => {
      // When viewing historical date with no content, don't fall back to today's quest
      if (isHistoricalView && !displayedQuest) {
        AppLogger.info(
          "daily",
          "Historical date with no content - keeping progress at 0%",
        );
        setIsLoadingProgress(false);
        return;
      }

      const currentQuestId = displayedQuest?.id || todayQuest?.id;
      if (!currentQuestId) {
        setIsLoadingProgress(false);
        return;
      }

      try {
        // PRIMARY: Load all progress from Supabase (watch, explore, quiz)
        if (userId) {
          const { data, error } = await supabase
            .from("user_daily_quest_progress")
            .select("*")
            .eq("user_id", userId)
            .eq("daily_quest_id", currentQuestId)
            .maybeSingle();

          if (error) {
            AppLogger.warn("daily", "Supabase progress query error", {
              message: error.message,
            });
          }

          if (data) {
            // Load from Supabase (single source of truth)
            const watchDone = !!data.watch_completed;
            const exploreDone = !!data.explore_completed;
            // Quiz is only completed if score > 0 (not just if the field exists)
            const quizDone =
              data.score !== undefined && data.score !== null && data.score > 0;

            setWatchCompleted(watchDone);
            setExploreCompleted(exploreDone);
            setQuestCompleted(quizDone);

            AppLogger.info("daily", "Loaded progress from Supabase", {
              currentQuestId,
              watch: watchDone,
              explore: exploreDone,
              quiz: quizDone,
              score: data.score,
            });

            // BACKUP: Cache to AsyncStorage for offline access
            const key = `@today_progress_${currentQuestId}`;
            await AsyncStorage.setItem(
              key,
              JSON.stringify({
                watch: !!data.watch_completed,
                explore: !!data.explore_completed,
                completedDate: data.created_at || null,
              }),
            );
            return;
          }
        }

        // FALLBACK: If Supabase has no data or user not logged in, try AsyncStorage
        const key = `@today_progress_${currentQuestId}`;
        const stored = await AsyncStorage.getItem(key);

        if (stored) {
          const progress = JSON.parse(stored);
          const watchDone = progress.watch || false;
          const exploreDone = progress.explore || false;

          setWatchCompleted(watchDone);
          setExploreCompleted(exploreDone);

          AppLogger.info("daily", "Loaded progress from AsyncStorage (offline)", {
            currentQuestId,
            progress,
          });
        }
        // Note: If no stored data anywhere, state already reset to false at useEffect start
      } catch (error) {
        AppLogger.error("daily", "Error loading progress", {}, error);
      } finally {
        setIsLoadingProgress(false);
      }
    };

    loadProgress();
  }, [
    displayedQuest?.id,
    todayQuest?.id,
    userId,
    isHistoricalView,
    displayedQuest,
  ]);

  // Save watch/explore progress to Supabase (with AsyncStorage backup)
  const saveProgress = async (section: "watch" | "explore") => {
    const currentQuestId = displayedQuest?.id || todayQuest?.id;
    if (!currentQuestId || !userId) {
      AppLogger.warn(
        "daily",
        "Cannot save progress - missing quest ID or user",
      );
      return;
    }

    try {
      const fieldName =
        section === "watch" ? "watch_completed" : "explore_completed";

      // PRIMARY: Save to Supabase using upsert
      const { error: upsertError } = await supabase
        .from("user_daily_quest_progress")
        .upsert(
          {
            user_id: userId,
            daily_quest_id: currentQuestId,
            [fieldName]: true,
            // Provide defaults for NOT NULL fields when creating new row
            score: 0,
            correct_answers: 0,
            total_questions: 0,
          },
          {
            onConflict: "user_id,daily_quest_id",
            ignoreDuplicates: false, // Update existing row
          },
        );

      if (upsertError) {
        AppLogger.error(
          "daily",
          "Supabase upsert error",
          { section },
          upsertError,
        );
      } else {
        AppLogger.info("daily", "Saved section completion to Supabase", {
          section,
          currentQuestId,
        });
      }

      // BACKUP: Save to AsyncStorage for offline access
      const key = `@today_progress_${currentQuestId}`;
      const stored = await AsyncStorage.getItem(key);
      const existing = stored ? JSON.parse(stored) : {};

      const current = {
        watch: section === "watch" ? true : existing.watch || false,
        explore: section === "explore" ? true : existing.explore || false,
        completedDate: existing.completedDate || null,
      };

      await AsyncStorage.setItem(key, JSON.stringify(current));
      AppLogger.info("daily", "Cached section completion to AsyncStorage", {
        section,
        currentQuestId,
      });
    } catch (error) {
      AppLogger.error("daily", "Error saving progress", {}, error);
    }
  };

  // During loading transition, always show 0% to prevent flash of old progress
  const progress = (() => {
    if (isLoadingProgress) return 0;
    let completed = 0;
    if (watchCompleted) completed++;
    if (exploreCompleted) completed++;
    if (questCompleted) completed++;
    return Math.round((completed / 3) * 100);
  })();

  // SEQUENTIAL UNLOCK LOGIC:
  // - WATCH: Always available
  // - EXPLORE: Unlocked after WATCH completed
  // - QUIZ: Unlocked after EXPLORE completed
  const isExploreUnlocked = watchCompleted;
  const isQuizUnlocked = watchCompleted && exploreCompleted;

  return {
    watchCompleted,
    exploreCompleted,
    questCompleted,
    isLoadingProgress,
    progress,
    isExploreUnlocked,
    isQuizUnlocked,
    setWatchCompleted,
    setExploreCompleted,
    setQuestCompleted,
    saveProgress,
  };
}
