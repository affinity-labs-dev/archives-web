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
const STREAK_GUARD_START_HOUR = 21; // 9 PM per spec
const MIN_STREAK_FOR_URGENCY = 3; // No urgency fatigue for new users
const LINGER_SECONDS = 15 * 60; // 15 minutes for saved/failed states

// MARK: - Manager class

class LiveActivityManager {
  private activeStreakGuardId: ActivityId | null = null;
  private lastStartedStreak: number = 0; // Track streak count for failed state display
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

    // All conditions met — start the activity
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
   * Called when user completes any daily story card — streak is saved.
   * Transitions the activity to .saved state and schedules dismissal.
   *
   * @param newStreakCount - The updated streak count (typically currentStreak + 1)
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
