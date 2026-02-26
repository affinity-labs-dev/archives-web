// useDailyStoryTracking.ts - Custom hook for daily story PostHog analytics
// Follows useLessonTracking pattern: mount/unmount lifecycle, time tracking, debounced card views
import { useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyticsService } from '@/services/AnalyticsService';

type EntrySource = 'today_tab' | 'notification' | 'rewind' | 'deep_link';

interface UseDailyStoryTrackingProps {
  storyId: string | null;
  storyDate: string | null;
  storyTitle: string | null;
  entrySource: EntrySource;
  isToday: boolean;
  isSubscribed: boolean;
}

// AsyncStorage keys for person property counters
const STORIES_VIEWED_COUNT_KEY = '@daily_story_viewed_count';
const STORIES_COMPLETED_COUNT_KEY = '@daily_story_completed_count';

export function useDailyStoryTracking({
  storyId,
  storyDate,
  storyTitle,
  entrySource,
  isToday,
  isSubscribed,
}: UseDailyStoryTrackingProps) {
  const startTimeRef = useRef<number>(Date.now());
  const hasTrackedViewRef = useRef(false);
  const cardsSeenRef = useRef<Set<number>>(new Set());
  const completedRef = useRef(false);
  const lastTrackedStoryIdRef = useRef<string | null>(null);

  // Track story viewed on mount (when story loads)
  useEffect(() => {
    if (!storyId || !storyDate || !storyTitle) return;

    // Reset tracking when story changes
    if (lastTrackedStoryIdRef.current !== storyId) {
      hasTrackedViewRef.current = false;
      cardsSeenRef.current = new Set();
      completedRef.current = false;
      startTimeRef.current = Date.now();
      lastTrackedStoryIdRef.current = storyId;
    }

    if (!hasTrackedViewRef.current) {
      console.log(`📊 [DailyStoryTracking] Story viewed: ${storyId} (${storyDate})`);
      analyticsService.trackDailyStoryViewed({
        story_id: storyId,
        story_date: storyDate,
        story_title: storyTitle,
        entry_source: entrySource,
        is_today: isToday,
      });

      // Update last_daily_story_date person property
      analyticsService.updateDailyStoryProperties({
        last_daily_story_date: storyDate,
      });

      // Increment viewed count for completion rate calculation
      incrementCounter(STORIES_VIEWED_COUNT_KEY);

      hasTrackedViewRef.current = true;
    }

    // Track dismissed on unmount
    return () => {
      if (hasTrackedViewRef.current && storyId) {
        const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const cardsSeen = cardsSeenRef.current.size;
        const scrollDepth = Math.min(cardsSeen / 3, 1);

        console.log(`📊 [DailyStoryTracking] Story dismissed: ${storyId}, time: ${timeSpent}s, cards: ${cardsSeen}, completed: ${completedRef.current}`);
        analyticsService.trackDailyStoryDismissed({
          story_id: storyId,
          time_spent_seconds: timeSpent,
          scroll_depth_pct: parseFloat(scrollDepth.toFixed(2)),
          cards_seen: cardsSeen,
          completed: completedRef.current,
        });
      }
    };
  }, [storyId, storyDate, storyTitle, entrySource, isToday]);

  // Track card viewed (debounced: fires once per card per session)
  const trackCardViewed = useCallback((cardIndex: 1 | 2 | 3) => {
    if (!storyId || cardsSeenRef.current.has(cardIndex)) return;

    cardsSeenRef.current.add(cardIndex);
    const cardName = cardIndex === 1 ? 'WATCH' : cardIndex === 2 ? 'EXPLORE' : 'QUESTIONS';
    console.log(`📊 [DailyStoryTracking] Card viewed: ${cardName} (${cardIndex})`);

    analyticsService.trackDailyStoryCardViewed({
      story_id: storyId,
      card_index: cardIndex,
    });
  }, [storyId]);

  // Track story completed (deduplicated: fires once per session per story)
  const trackCompleted = useCallback(async () => {
    if (!storyId || !storyDate || completedRef.current) return;

    completedRef.current = true;
    const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);

    console.log(`📊 [DailyStoryTracking] Story completed: ${storyId}, time: ${timeSpent}s`);
    analyticsService.trackDailyStoryCompleted({
      story_id: storyId,
      story_date: storyDate,
      time_spent_seconds: timeSpent,
      entry_source: entrySource,
    });

    // Update person properties: increment completed count and recalculate rate
    try {
      const completedCount = await incrementCounter(STORIES_COMPLETED_COUNT_KEY);
      const viewedCountStr = await AsyncStorage.getItem(STORIES_VIEWED_COUNT_KEY);
      const viewedCount = viewedCountStr ? parseInt(viewedCountStr, 10) : 1;
      const completionRate = viewedCount > 0 ? parseFloat((completedCount / viewedCount).toFixed(2)) : 0;

      analyticsService.updateDailyStoryProperties({
        daily_stories_read_count: completedCount,
        daily_story_completion_rate: completionRate,
      });
    } catch (error) {
      console.error('📊 [DailyStoryTracking] Error updating person properties:', error);
    }
  }, [storyId, storyDate, entrySource]);

  // Track media played (video or audio)
  const trackMediaPlayed = useCallback((mediaType: 'audio' | 'video', mediaId: string) => {
    if (!storyId) return;

    console.log(`📊 [DailyStoryTracking] Media played: ${mediaType} - ${mediaId}`);
    analyticsService.trackDailyStoryMediaPlayed({
      story_id: storyId,
      media_type: mediaType,
      media_id: mediaId,
    });
  }, [storyId]);

  // Track rewind tapped (past story from calendar)
  const trackRewindTapped = useCallback((tapStoryDate: string, daysAgo: number) => {
    console.log(`📊 [DailyStoryTracking] Rewind tapped: ${tapStoryDate} (${daysAgo} days ago)`);
    analyticsService.trackDailyStoryRewindTapped({
      story_date: tapStoryDate,
      is_subscribed: isSubscribed,
      days_ago: daysAgo,
    });
  }, [isSubscribed]);

  // Track rewind blocked (non-subscriber gated)
  const trackRewindBlocked = useCallback((blockedStoryDate: string, daysAgo: number) => {
    console.log(`📊 [DailyStoryTracking] Rewind blocked: ${blockedStoryDate} (${daysAgo} days ago)`);
    analyticsService.trackDailyStoryRewindBlocked({
      story_date: blockedStoryDate,
      days_ago: daysAgo,
    });
  }, []);

  // Track streak incremented from daily story
  const trackStreakIncremented = useCallback((currentStreak: number, isFirstActionToday: boolean) => {
    if (!storyId) return;

    console.log(`📊 [DailyStoryTracking] Streak incremented: ${currentStreak} (first today: ${isFirstActionToday})`);
    analyticsService.trackDailyStoryStreakIncremented({
      story_id: storyId,
      current_streak: currentStreak,
      is_first_action_today: isFirstActionToday,
    });
  }, [storyId]);

  return {
    trackCardViewed,
    trackCompleted,
    trackMediaPlayed,
    trackRewindTapped,
    trackRewindBlocked,
    trackStreakIncremented,
  };
}

// Helper: Increment an AsyncStorage counter and return new value
async function incrementCounter(key: string): Promise<number> {
  try {
    const current = await AsyncStorage.getItem(key);
    const newValue = (current ? parseInt(current, 10) : 0) + 1;
    await AsyncStorage.setItem(key, String(newValue));
    return newValue;
  } catch (error) {
    console.error(`📊 [DailyStoryTracking] Error incrementing ${key}:`, error);
    return 1;
  }
}
