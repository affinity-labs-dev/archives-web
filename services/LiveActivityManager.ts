/**
 * LiveActivityManager — JS-side orchestration for iOS Live Activities.
 *
 * Responsibilities:
 * 1. Check trigger conditions for StreakGuard (time >= 21:00, 0 cards today, streak >= 3)
 * 2. Start/update/end activities via the Expo Module bridge
 * 3. Handle midnight timeout → transition to .failed state
 * 4. Handle card completion → transition to .saved state
 * 5. Persist active activity ID across app restarts
 * 6. Enforce mutual exclusion (only 1 activity at a time)
 * 7. Clean up orphan activities on app launch
 *
 * Usage:
 *   import { liveActivityManager } from '@/services/LiveActivityManager';
 *
 *   // On app foreground (in _layout.tsx):
 *   liveActivityManager.checkAndStartStreakGuard(streak, completedToday);
 *
 *   // On card completion (in GamificationOrchestrator):
 *   liveActivityManager.onStreakSaved(newStreakCount);
 *
 *   // On app launch:
 *   liveActivityManager.cleanupOrphans();
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  areActivitiesEnabled,
  endAllActivities,
  endStreakGuard,
  listActiveActivities,
  startStreakGuard,
  updateStreakGuard,
  type ActivityId,
} from '@/modules/live-activity';

// MARK: - Constants

const STORAGE_KEY_ACTIVE_STREAK_GUARD = '@live_activity_streak_guard_id';
const STORAGE_KEY_STREAK_GUARD_DATE = '@live_activity_streak_guard_date';
const STREAK_GUARD_START_HOUR = 21; // 9 PM per spec
const MIN_STREAK_FOR_URGENCY = 3; // No urgency fatigue for new users
const LINGER_SECONDS = 15 * 60; // 15 minutes for saved/failed states

// MARK: - Manager class

class LiveActivityManager {
  private activeStreakGuardId: ActivityId | null = null;
  private midnightTimer: ReturnType<typeof setTimeout> | null = null;
  private initialized = false;

  // MARK: Initialization

  /**
   * Initialize the manager — call once on app launch.
   * Restores persisted activity ID and cleans up orphans.
   */
  async initialize(): Promise<void> {
    if (Platform.OS !== 'ios' || this.initialized) return;
    this.initialized = true;

    try {
      // Restore persisted activity ID
      const [storedId, storedDate] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_ACTIVE_STREAK_GUARD),
        AsyncStorage.getItem(STORAGE_KEY_STREAK_GUARD_DATE),
      ]);

      const today = new Date().toISOString().split('T')[0];

      // If stored activity is from a previous day, it's orphaned — clean up
      if (storedId && storedDate !== today) {
        console.log('🔄 [LiveActivity] Cleaning up stale activity from', storedDate);
        await this.forceEndAll();
        return;
      }

      if (storedId) {
        // Verify the activity still exists on iOS side
        const active = await listActiveActivities();
        const exists = active.some(a => a.id === storedId && a.type === 'StreakGuard');
        if (exists) {
          this.activeStreakGuardId = storedId;
          this.scheduleMidnightTimeout();
          console.log('✅ [LiveActivity] Restored active StreakGuard:', storedId);
        } else {
          // Activity was ended by iOS (8h timeout, system cleanup, etc.)
          console.log('⚠️ [LiveActivity] Stored activity no longer exists, clearing');
          await this.clearPersistedState();
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

    // Already have an active activity
    if (this.activeStreakGuardId) {
      console.log('🔥 [LiveActivity] StreakGuard already active, skipping');
      return;
    }

    // Check all conditions per spec
    const now = new Date();
    const currentHour = now.getHours();

    if (currentHour < STREAK_GUARD_START_HOUR) {
      // Before 9 PM — too early
      return;
    }

    if (hasCompletedAnyCardToday) {
      // User already completed a card — no urgency
      return;
    }

    if (currentStreak < MIN_STREAK_FOR_URGENCY) {
      // Streak too short — no urgency fatigue for new users
      return;
    }

    // Check if Live Activities are enabled
    const enabled = await areActivitiesEnabled();
    if (!enabled) {
      console.log('⚠️ [LiveActivity] Live Activities not enabled by user');
      return;
    }

    // All conditions met — start the activity
    try {
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0); // Next midnight
      const endDate = Math.floor(midnight.getTime() / 1000);

      const id = await startStreakGuard({
        currentStreak,
        streakStartDate,
        state: 'expiring',
        endDate,
      });

      this.activeStreakGuardId = id;

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
   * Called when user completes any daily story card — streak is saved.
   * Transitions the activity to .saved state and schedules dismissal.
   *
   * @param newStreakCount - The updated streak count (typically currentStreak + 1)
   */
  async onStreakSaved(newStreakCount: number): Promise<void> {
    if (!this.activeStreakGuardId) return;

    try {
      // Transition to saved state
      await updateStreakGuard({
        id: this.activeStreakGuardId,
        state: 'saved',
        endDate: 0, // Not meaningful for saved state
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
      // Transition to failed state
      await updateStreakGuard({
        id: this.activeStreakGuardId,
        state: 'failed',
        endDate: 0,
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

  // MARK: Midnight timer

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
    this.activeStreakGuardId = null;
    await this.clearPersistedState();
    console.log('🧹 [LiveActivity] Force-ended all activities');
  }

  private async clearPersistedState(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEY_ACTIVE_STREAK_GUARD,
      STORAGE_KEY_STREAK_GUARD_DATE,
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
}

// Singleton export
export const liveActivityManager = new LiveActivityManager();
