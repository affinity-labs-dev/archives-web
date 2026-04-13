/**
 * LiveActivityManager — JS-side orchestration for iOS Live Activities.
 *
 * Manages two activity types:
 *
 * StreakGuard — "Your streak is expiring!" (9 PM → midnight)
 *   Trigger: time >= 21:00, 0 cards completed today, streak >= 3
 *   Terminal: .saved (card completed) or .failed (midnight)
 *
 * DailyStory — "You're working on your quest" (Today tab open)
 *   Trigger: user opens Today tab for the first time that day
 *   Terminal: .completed (quiz done) or .incomplete (midnight)
 *
 * Mutual exclusion: StreakGuard displaces DailyStory when its conditions are
 * met (9 PM + incomplete + streak >= 3). More urgent message takes priority.
 *
 * Usage:
 *   import { liveActivityManager } from '@/services/LiveActivityManager';
 *
 *   // On app foreground (in GamificationOrchestrator):
 *   liveActivityManager.checkAndStartStreakGuard(streak, completedToday, date);
 *
 *   // On card completion (in GamificationOrchestrator):
 *   liveActivityManager.onStreakSaved(newStreakCount);
 *
 *   // On Today tab open — first time that day (in today.tsx):
 *   liveActivityManager.startDailyStoryActivity({ storyId, ... });
 *
 *   // On card progress (in today.tsx):
 *   liveActivityManager.updateDailyStoryProgress({ watchCompleted: true, ... });
 *
 *   // On quest complete (in GamificationOrchestrator):
 *   liveActivityManager.onDailyStoryCompleted(newStreak, xpEarned);
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  areActivitiesEnabled,
  endAllActivities,
  endDailyStory,
  endStreakGuard,
  listActiveActivities,
  startDailyStory,
  startStreakGuard,
  updateDailyStory,
  updateStreakGuard,
  type ActivityId,
} from '@/modules/live-activity';

// MARK: - Dev test overrides
// Set these to true in __DEV__ to bypass trigger conditions for testing.
// All default to false — production behavior unchanged.

const DEV_OVERRIDES = __DEV__ ? {
  /** Skip the "time >= 21:00" check — activity can start at any hour */
  bypassTimeCheck: false,
  /** Skip the "zero cards completed today" check */
  bypassCardCheck: false,
  /** Skip the "streak >= 3" check — works even with streak 0 */
  bypassStreakCheck: false,
  /** Override streak count displayed on the banner (null = use real value) */
  fakeStreakCount: null as number | null,
  /** Override countdown duration in seconds (null = midnight). 60 = 1 min countdown for quick testing */
  fakeCountdownSeconds: null as number | null,
} : {
  bypassTimeCheck: false,
  bypassCardCheck: false,
  bypassStreakCheck: false,
  fakeStreakCount: null,
  fakeCountdownSeconds: null,
};

// MARK: - Constants

const STORAGE_KEY_ACTIVE_STREAK_GUARD = '@live_activity_streak_guard_id';
const STORAGE_KEY_STREAK_GUARD_DATE = '@live_activity_streak_guard_date';
const STORAGE_KEY_ACTIVE_DAILY_STORY = '@live_activity_daily_story_id';
const STORAGE_KEY_DAILY_STORY_DATE = '@live_activity_daily_story_date';
const STREAK_GUARD_START_HOUR = 21; // 9 PM per spec
const MIN_STREAK_FOR_URGENCY = 3; // No urgency fatigue for new users
const LINGER_SECONDS = 15 * 60; // 15 minutes for terminal states (saved/failed/completed/incomplete)

// MARK: - Manager class

class LiveActivityManager {
  private activeStreakGuardId: ActivityId | null = null;
  private lastStartedStreak: number = 0; // Track streak count for failed state display
  private midnightTimer: ReturnType<typeof setTimeout> | null = null;
  private initialized = false;

  // DailyStory state
  private activeDailyStoryId: ActivityId | null = null;
  private dailyStoryMidnightTimer: ReturnType<typeof setTimeout> | null = null;
  /** Cached card state for update calls (avoids re-passing immutable fields) */
  private dailyStoryMeta: {
    currentStreak: number;
    endDate: number;
    watchCompleted: boolean;
    exploreCompleted: boolean;
    questionsCompleted: boolean;
  } | null = null;

  // MARK: Initialization

  /**
   * Initialize the manager — call once on app launch.
   * Restores persisted activity ID and cleans up orphans.
   */
  async initialize(): Promise<void> {
    if (Platform.OS !== 'ios' || this.initialized) return;
    this.initialized = true;

    try {
      // Restore persisted activity IDs (both types in parallel)
      const [storedStreakId, storedStreakDate, storedStoryId, storedStoryDate] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_ACTIVE_STREAK_GUARD),
        AsyncStorage.getItem(STORAGE_KEY_STREAK_GUARD_DATE),
        AsyncStorage.getItem(STORAGE_KEY_ACTIVE_DAILY_STORY),
        AsyncStorage.getItem(STORAGE_KEY_DAILY_STORY_DATE),
      ]);

      const today = new Date().toISOString().split('T')[0];

      // If any stored activity is from a previous day, clean up everything
      const streakStale = storedStreakId && storedStreakDate !== today;
      const storyStale = storedStoryId && storedStoryDate !== today;
      if (streakStale || storyStale) {
        console.log('🔄 [LiveActivity] Cleaning up stale activities from', storedStreakDate || storedStoryDate);
        await this.forceEndAll();
        return;
      }

      // Verify activities still exist on iOS side
      const active = await listActiveActivities();

      // Restore StreakGuard
      if (storedStreakId) {
        const exists = active.some(a => a.id === storedStreakId && a.type === 'StreakGuard');
        if (exists) {
          this.activeStreakGuardId = storedStreakId;
          this.scheduleMidnightTimeout();
          console.log('✅ [LiveActivity] Restored active StreakGuard:', storedStreakId);
        } else {
          console.log('⚠️ [LiveActivity] Stored StreakGuard no longer exists, clearing');
          await AsyncStorage.multiRemove([STORAGE_KEY_ACTIVE_STREAK_GUARD, STORAGE_KEY_STREAK_GUARD_DATE]);
        }
      }

      // Restore DailyStory
      if (storedStoryId) {
        const exists = active.some(a => a.id === storedStoryId && a.type === 'DailyStory');
        if (exists) {
          this.activeDailyStoryId = storedStoryId;
          this.scheduleDailyStoryMidnightTimeout();
          console.log('✅ [LiveActivity] Restored active DailyStory:', storedStoryId);
        } else {
          // Activity was ended by iOS (8h timeout, system cleanup, etc.)
          // Only clear ID — keep date flag so we don't re-start on same day
          console.log('⚠️ [LiveActivity] Stored DailyStory no longer exists, clearing ID');
          await AsyncStorage.removeItem(STORAGE_KEY_ACTIVE_DAILY_STORY);
        }
      }
    } catch (error) {
      console.error('❌ [LiveActivity] Initialize failed:', error);
    }
  }

  // MARK: StreakGuard trigger

  /**
   * Check conditions and start StreakGuard if appropriate.
   * Call this on every app foreground event.
   *
   * @param currentStreak - User's current streak count
   * @param hasCompletedAnyCardToday - Whether any daily story card was completed today
   * @param streakStartDate - YYYY-MM-DD when streak started (for display)
   */
  async checkAndStartStreakGuard(
    currentStreak: number,
    hasCompletedAnyCardToday: boolean,
    streakStartDate: string
  ): Promise<void> {
    if (Platform.OS !== 'ios') return;

    // Already have an active activity (tracked in JS memory)
    if (this.activeStreakGuardId) {
      console.log('🔥 [LiveActivity] StreakGuard already active (JS tracked), skipping');
      return;
    }

    // Also check iOS-side — activity may have been started by push-to-start
    // (native side, not via JS bridge) so JS doesn't know about it
    try {
      const activeOnDevice = await listActiveActivities();
      const existingStreakGuard = activeOnDevice.find(a => a.type === 'StreakGuard');
      if (existingStreakGuard) {
        // Adopt the existing activity so JS can manage it going forward
        this.activeStreakGuardId = existingStreakGuard.id;
        console.log('🔥 [LiveActivity] StreakGuard already active (iOS side), adopting:', existingStreakGuard.id);
        return;
      }
    } catch {
      // listActiveActivities can fail on iOS < 16.2 — continue
    }

    // Check all conditions per spec (DEV_OVERRIDES bypass individual checks for testing)
    const now = new Date();
    const currentHour = now.getHours();

    if (!DEV_OVERRIDES.bypassTimeCheck && currentHour < STREAK_GUARD_START_HOUR) {
      console.log('⏰ [LiveActivity] Before 9 PM, skipping');
      return;
    }

    if (!DEV_OVERRIDES.bypassCardCheck && hasCompletedAnyCardToday) {
      console.log('✅ [LiveActivity] Card already completed today, skipping');
      return;
    }

    if (!DEV_OVERRIDES.bypassStreakCheck && currentStreak < MIN_STREAK_FOR_URGENCY) {
      console.log('📊 [LiveActivity] Streak too short:', currentStreak, '< ', MIN_STREAK_FOR_URGENCY);
      return;
    }

    // Check if Live Activities are enabled
    const enabled = await areActivitiesEnabled();
    if (!enabled) {
      console.log('⚠️ [LiveActivity] Live Activities not enabled by user');
      return;
    }

    // All conditions met — displace DailyStory if active, then start StreakGuard
    // Per spec: StreakGuard replaces DailyStory (more urgent message takes priority)
    if (this.activeDailyStoryId) {
      console.log('🔄 [LiveActivity] Displacing DailyStory — StreakGuard conditions met');
      try {
        await endDailyStory(this.activeDailyStoryId, 0);
      } catch {
        // DailyStory may already have been ended by iOS
      }
      this.cancelDailyStoryMidnightTimeout();
      this.activeDailyStoryId = null;
      this.dailyStoryMeta = null;
      await this.clearDailyStoryPersistedState();
    }

    try {
      // Dev overrides for quick testing
      const displayStreak = DEV_OVERRIDES.fakeStreakCount ?? currentStreak;
      let endDate: number;
      if (DEV_OVERRIDES.fakeCountdownSeconds != null) {
        endDate = Math.floor(Date.now() / 1000) + DEV_OVERRIDES.fakeCountdownSeconds;
      } else {
        const midnight = new Date();
        midnight.setHours(24, 0, 0, 0);
        endDate = Math.floor(midnight.getTime() / 1000);
      }

      const id = await startStreakGuard({
        currentStreak: displayStreak,
        streakStartDate,
        state: 'expiring',
        endDate,
      });

      this.activeStreakGuardId = id;
      this.lastStartedStreak = displayStreak;

      // Persist for app restart recovery
      const today = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem(STORAGE_KEY_ACTIVE_STREAK_GUARD, id);
      await AsyncStorage.setItem(STORAGE_KEY_STREAK_GUARD_DATE, today);

      // Schedule midnight transition to .failed
      this.scheduleMidnightTimeout();

      console.log('🔥 [LiveActivity] Started StreakGuard', { id, currentStreak, endDate });
    } catch (error) {
      console.error('❌ [LiveActivity] Failed to start StreakGuard:', error);
    }
  }

  // MARK: State transitions

  /**
   * Called when streak is saved (user completes today quest or module quiz).
   * Transitions the activity to .saved state and schedules 15-min dismissal.
   *
   * @param newStreakCount - The updated streak count after save
   */
  async onStreakSaved(newStreakCount: number): Promise<void> {
    if (!this.activeStreakGuardId) return;

    try {
      // Transition to saved state — show new streak count (currentStreak + 1)
      await updateStreakGuard({
        id: this.activeStreakGuardId,
        state: 'saved',
        endDate: 0,
        currentStreak: newStreakCount,
      });

      // End with 15 minute linger
      await endStreakGuard(this.activeStreakGuardId, LINGER_SECONDS);

      console.log('✅ [LiveActivity] Streak saved! Activity ending with 15min linger');

      // Clean up
      this.cancelMidnightTimeout();
      await this.clearPersistedState();
      this.activeStreakGuardId = null;
    } catch (error) {
      console.error('❌ [LiveActivity] Failed to transition to saved:', error);
      // Force cleanup on error
      await this.forceEndAll();
    }
  }

  /**
   * Called at midnight when user hasn't completed any cards.
   * Transitions to .failed state and schedules dismissal.
   */
  private async onStreakFailed(): Promise<void> {
    if (!this.activeStreakGuardId) return;

    try {
      // Transition to failed state — keep original streak count (the one that was lost)
      await updateStreakGuard({
        id: this.activeStreakGuardId,
        state: 'failed',
        endDate: 0,
        currentStreak: this.lastStartedStreak,
      });

      // End with 15 minute linger
      await endStreakGuard(this.activeStreakGuardId, LINGER_SECONDS);

      console.log('💀 [LiveActivity] Streak failed. Activity ending with 15min linger');

      // Clean up
      await this.clearPersistedState();
      this.activeStreakGuardId = null;
    } catch (error) {
      console.error('❌ [LiveActivity] Failed to transition to failed:', error);
      await this.forceEndAll();
    }
  }

  // MARK: DailyStory lifecycle

  /**
   * Start a DailyStory Live Activity.
   * Called when the user opens the Today tab for the first time that day.
   * Only starts once per day — subsequent tab opens are no-ops.
   */
  async startDailyStoryActivity(params: {
    storyId: string;
    storyTitle: string;
    dayNumber: number;
    totalDays: number;
    currentStreak: number;
    watchCompleted: boolean;
    exploreCompleted: boolean;
    questionsCompleted: boolean;
  }): Promise<void> {
    if (Platform.OS !== 'ios') return;

    // Already have an active DailyStory — no-op
    if (this.activeDailyStoryId) {
      console.log('📖 [LiveActivity] DailyStory already active, skipping');
      return;
    }

    // First-time-only: check if we already started a DailyStory today
    // (activity may have already ended via .completed/.incomplete/StreakGuard replacement)
    const today = new Date().toISOString().split('T')[0];
    const startedDate = await AsyncStorage.getItem(STORAGE_KEY_DAILY_STORY_DATE);
    if (startedDate === today) {
      console.log('📖 [LiveActivity] DailyStory already started today, skipping');
      return;
    }

    // Check iOS-side for existing DailyStory (may have been started by push-to-start)
    try {
      const activeOnDevice = await listActiveActivities();
      const existingStory = activeOnDevice.find(a => a.type === 'DailyStory');
      if (existingStory) {
        this.activeDailyStoryId = existingStory.id;
        console.log('📖 [LiveActivity] DailyStory already active (iOS side), adopting:', existingStory.id);
        return;
      }
    } catch {
      // listActiveActivities can fail on iOS < 16.2 — continue
    }

    // Check if Live Activities are enabled
    const enabled = await areActivitiesEnabled();
    if (!enabled) {
      console.log('⚠️ [LiveActivity] Live Activities not enabled by user');
      return;
    }

    try {
      // Calculate midnight endDate
      let endDate: number;
      if (DEV_OVERRIDES.fakeCountdownSeconds != null) {
        endDate = Math.floor(Date.now() / 1000) + DEV_OVERRIDES.fakeCountdownSeconds;
      } else {
        const midnight = new Date();
        midnight.setHours(24, 0, 0, 0);
        endDate = Math.floor(midnight.getTime() / 1000);
      }

      // Calculate initial progress from card states
      const completedCount = [params.watchCompleted, params.exploreCompleted, params.questionsCompleted].filter(Boolean).length;
      const totalCards = 3;
      const progressPercent = completedCount / totalCards;
      const currentCard = params.watchCompleted ? (params.exploreCompleted ? (params.questionsCompleted ? 3 : 3) : 2) : 1;
      const displayStreak = DEV_OVERRIDES.fakeStreakCount ?? params.currentStreak;

      const id = await startDailyStory({
        storyId: params.storyId,
        storyTitle: params.storyTitle,
        eraTitle: 'Daily Quest',
        dayNumber: params.dayNumber,
        totalDays: params.totalDays,
        state: 'inProgress',
        currentCard,
        totalCards,
        progressPercent,
        watchCompleted: params.watchCompleted,
        exploreCompleted: params.exploreCompleted,
        questionsCompleted: params.questionsCompleted,
        currentStreak: displayStreak,
        endDate,
        xpEarned: 0,
      });

      this.activeDailyStoryId = id;
      this.dailyStoryMeta = {
        currentStreak: displayStreak,
        endDate,
        watchCompleted: params.watchCompleted,
        exploreCompleted: params.exploreCompleted,
        questionsCompleted: params.questionsCompleted,
      };

      // Persist for app restart recovery
      const today = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem(STORAGE_KEY_ACTIVE_DAILY_STORY, id);
      await AsyncStorage.setItem(STORAGE_KEY_DAILY_STORY_DATE, today);

      // Schedule midnight transition to .incomplete
      this.scheduleDailyStoryMidnightTimeout();

      console.log('📖 [LiveActivity] Started DailyStory', { id, storyId: params.storyId, endDate });
    } catch (error) {
      console.error('❌ [LiveActivity] Failed to start DailyStory:', error);
    }
  }

  /**
   * Update the DailyStory activity as the user completes each card.
   * No-ops silently if no activity is active.
   */
  async updateDailyStoryProgress(params: {
    watchCompleted: boolean;
    exploreCompleted: boolean;
    questionsCompleted: boolean;
    currentStreak: number;
  }): Promise<void> {
    if (!this.activeDailyStoryId || !this.dailyStoryMeta) return;

    try {
      const completedCount = [params.watchCompleted, params.exploreCompleted, params.questionsCompleted].filter(Boolean).length;
      const totalCards = 3;
      const progressPercent = completedCount / totalCards;
      const currentCard = params.watchCompleted ? (params.exploreCompleted ? 3 : 2) : 1;

      await updateDailyStory({
        id: this.activeDailyStoryId,
        state: 'inProgress',
        currentCard,
        totalCards,
        progressPercent,
        watchCompleted: params.watchCompleted,
        exploreCompleted: params.exploreCompleted,
        questionsCompleted: params.questionsCompleted,
        currentStreak: params.currentStreak,
        endDate: this.dailyStoryMeta.endDate,
        xpEarned: 0,
      });

      // Update cached state
      this.dailyStoryMeta = {
        ...this.dailyStoryMeta,
        watchCompleted: params.watchCompleted,
        exploreCompleted: params.exploreCompleted,
        questionsCompleted: params.questionsCompleted,
        currentStreak: params.currentStreak,
      };

      console.log('📖 [LiveActivity] DailyStory progress updated:', { completedCount, progressPercent });
    } catch (error) {
      console.error('❌ [LiveActivity] Failed to update DailyStory:', error);
    }
  }

  /**
   * Called when the user completes all 3 daily story cards (quiz done).
   * Transitions to .completed state and schedules 15-min dismissal.
   *
   * @param newStreakCount - Updated streak count after completion
   * @param xpEarned - XP from quiz results (correctAnswers * 10)
   */
  async onDailyStoryCompleted(newStreakCount: number, xpEarned: number): Promise<void> {
    if (!this.activeDailyStoryId) return;

    try {
      await updateDailyStory({
        id: this.activeDailyStoryId,
        state: 'completed',
        currentCard: 3,
        totalCards: 3,
        progressPercent: 1.0,
        watchCompleted: true,
        exploreCompleted: true,
        questionsCompleted: true,
        currentStreak: newStreakCount,
        endDate: 0,
        xpEarned,
      });

      // End with 15 minute linger — drops Dynamic Island, keeps lock screen banner
      await endDailyStory(this.activeDailyStoryId, LINGER_SECONDS);

      console.log('✅ [LiveActivity] DailyStory completed! XP:', xpEarned, '— ending with 15min linger');

      // Clean up
      this.cancelDailyStoryMidnightTimeout();
      await this.clearDailyStoryPersistedState();
      this.activeDailyStoryId = null;
      this.dailyStoryMeta = null;
    } catch (error) {
      console.error('❌ [LiveActivity] Failed to transition DailyStory to completed:', error);
      await this.forceEndAll();
    }
  }

  /**
   * Called at midnight when user hasn't finished all 3 cards.
   * Transitions to .incomplete state and schedules 15-min dismissal.
   */
  private async onDailyStoryIncomplete(): Promise<void> {
    if (!this.activeDailyStoryId) return;

    try {
      await updateDailyStory({
        id: this.activeDailyStoryId,
        state: 'incomplete',
        currentCard: this.dailyStoryMeta ? (
          this.dailyStoryMeta.watchCompleted ? (this.dailyStoryMeta.exploreCompleted ? 3 : 2) : 1
        ) : 1,
        totalCards: 3,
        progressPercent: this.dailyStoryMeta
          ? [this.dailyStoryMeta.watchCompleted, this.dailyStoryMeta.exploreCompleted, this.dailyStoryMeta.questionsCompleted].filter(Boolean).length / 3
          : 0,
        watchCompleted: this.dailyStoryMeta?.watchCompleted ?? false,
        exploreCompleted: this.dailyStoryMeta?.exploreCompleted ?? false,
        questionsCompleted: this.dailyStoryMeta?.questionsCompleted ?? false,
        currentStreak: this.dailyStoryMeta?.currentStreak ?? 0,
        endDate: 0,
        xpEarned: 0,
      });

      await endDailyStory(this.activeDailyStoryId, LINGER_SECONDS);

      console.log('⏰ [LiveActivity] DailyStory incomplete (midnight). Ending with 15min linger');

      // Clean up
      await this.clearDailyStoryPersistedState();
      this.activeDailyStoryId = null;
      this.dailyStoryMeta = null;
    } catch (error) {
      console.error('❌ [LiveActivity] Failed to transition DailyStory to incomplete:', error);
      await this.forceEndAll();
    }
  }

  // MARK: DailyStory midnight timer

  private scheduleDailyStoryMidnightTimeout(): void {
    this.cancelDailyStoryMidnightTimeout();

    const now = Date.now();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now;

    if (msUntilMidnight <= 0) {
      this.onDailyStoryIncomplete();
      return;
    }

    // Add 2 second buffer to ensure we're clearly past midnight
    this.dailyStoryMidnightTimer = setTimeout(() => {
      this.onDailyStoryIncomplete();
    }, msUntilMidnight + 2000);

    console.log('⏰ [LiveActivity] DailyStory midnight timeout scheduled in', Math.round(msUntilMidnight / 1000), 'seconds');
  }

  private cancelDailyStoryMidnightTimeout(): void {
    if (this.dailyStoryMidnightTimer) {
      clearTimeout(this.dailyStoryMidnightTimer);
      this.dailyStoryMidnightTimer = null;
    }
  }

  /**
   * Clear the active DailyStory ID but KEEP the date flag.
   * The date flag acts as "started today" guard — prevents re-starting
   * after the activity ends (completed/incomplete/replaced by StreakGuard).
   * It's only cleared on stale-day cleanup in initialize().
   */
  private async clearDailyStoryPersistedState(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY_ACTIVE_DAILY_STORY);
  }

  // MARK: StreakGuard midnight timer

  private scheduleMidnightTimeout(): void {
    this.cancelMidnightTimeout();

    const now = Date.now();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now;

    if (msUntilMidnight <= 0) {
      // Already past midnight — trigger immediately
      this.onStreakFailed();
      return;
    }

    // Add 2 second buffer to ensure we're clearly past midnight
    this.midnightTimer = setTimeout(() => {
      this.onStreakFailed();
    }, msUntilMidnight + 2000);

    console.log('⏰ [LiveActivity] Midnight timeout scheduled in', Math.round(msUntilMidnight / 1000), 'seconds');
  }

  private cancelMidnightTimeout(): void {
    if (this.midnightTimer) {
      clearTimeout(this.midnightTimer);
      this.midnightTimer = null;
    }
  }

  // MARK: Cleanup

  /**
   * Force-end all activities and clear all persisted state.
   * Use as safety net on errors or app launch cleanup.
   */
  async forceEndAll(): Promise<void> {
    try {
      await endAllActivities();
    } catch {
      // Ignore — might not have any active activities
    }
    this.cancelMidnightTimeout();
    this.cancelDailyStoryMidnightTimeout();
    this.activeStreakGuardId = null;
    this.activeDailyStoryId = null;
    this.dailyStoryMeta = null;
    await this.clearPersistedState();
    console.log('🧹 [LiveActivity] Force-ended all activities');
  }

  private async clearPersistedState(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEY_ACTIVE_STREAK_GUARD,
      STORAGE_KEY_STREAK_GUARD_DATE,
      STORAGE_KEY_ACTIVE_DAILY_STORY,
      STORAGE_KEY_DAILY_STORY_DATE,
    ]);
  }

  // MARK: Status

  /** Whether a StreakGuard activity is currently active. */
  get isStreakGuardActive(): boolean {
    return this.activeStreakGuardId !== null;
  }

  /** The current active StreakGuard activity ID, or null. */
  get streakGuardId(): ActivityId | null {
    return this.activeStreakGuardId;
  }

  /** Whether a DailyStory activity is currently active. */
  get isDailyStoryActive(): boolean {
    return this.activeDailyStoryId !== null;
  }

  /** The current active DailyStory activity ID, or null. */
  get dailyStoryId(): ActivityId | null {
    return this.activeDailyStoryId;
  }
}

// Singleton export
export const liveActivityManager = new LiveActivityManager();
