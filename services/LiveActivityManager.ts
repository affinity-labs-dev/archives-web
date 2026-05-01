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
import AppLogger from './AppLogger';
import { toLocalDateString } from '@/utils/dateUtils';

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
const STORAGE_KEY_STREAK_GUARD_LAST_STREAK = '@live_activity_streak_guard_last_streak';
const STORAGE_KEY_ACTIVE_DAILY_STORY = '@live_activity_daily_story_id';
const STORAGE_KEY_DAILY_STORY_DATE = '@live_activity_daily_story_date';
const STORAGE_KEY_DAILY_STORY_META = '@live_activity_daily_story_meta';
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
  private startingDailyStory = false;
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
   * Restores persisted activity IDs and cleans up stale-day orphans per-type
   * (preserves DailyStory "started today" date flag if still valid).
   *
   * Sets `initialized = true` only on successful completion — failed init
   * can be retried on next app launch.
   */
  async initialize(): Promise<void> {
    if (Platform.OS !== 'ios' || this.initialized) return;

    try {
      const [
        storedStreakId,
        storedStreakDate,
        storedStreakLastStreak,
        storedStoryId,
        storedStoryDate,
        storedStoryMeta,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_ACTIVE_STREAK_GUARD),
        AsyncStorage.getItem(STORAGE_KEY_STREAK_GUARD_DATE),
        AsyncStorage.getItem(STORAGE_KEY_STREAK_GUARD_LAST_STREAK),
        AsyncStorage.getItem(STORAGE_KEY_ACTIVE_DAILY_STORY),
        AsyncStorage.getItem(STORAGE_KEY_DAILY_STORY_DATE),
        AsyncStorage.getItem(STORAGE_KEY_DAILY_STORY_META),
      ]);

      const today = toLocalDateString(new Date());

      // Per-type stale-day cleanup (don't wipe both types if only one is stale)
      if (storedStreakId && storedStreakDate !== today) {
        AppLogger.info('gamification', 'Cleaning up stale StreakGuard', { from: storedStreakDate });
        await this.clearStreakGuardPersistedState();
      }
      if (storedStoryId && storedStoryDate !== today) {
        AppLogger.info('gamification', 'Cleaning up stale DailyStory', { from: storedStoryDate });
        await this.clearDailyStoryFullState();
      }

      // Verify activities still exist on iOS side
      let active: { id: string; type: string }[] = [];
      try {
        active = await listActiveActivities();
      } catch (err) {
        AppLogger.warn('gamification', 'listActiveActivities failed (iOS < 16.2?)', { error: String(err) });
      }

      // Restore StreakGuard (if still valid today)
      if (storedStreakId && storedStreakDate === today) {
        const exists = active.some(a => a.id === storedStreakId && a.type === 'StreakGuard');
        if (exists) {
          this.activeStreakGuardId = storedStreakId;
          // Restore lastStartedStreak so onStreakFailed renders the correct value
          // after kill+restart. Falls back to 0 if missing/corrupt.
          const parsedStreak = storedStreakLastStreak ? parseInt(storedStreakLastStreak, 10) : 0;
          this.lastStartedStreak = Number.isFinite(parsedStreak) ? parsedStreak : 0;
          this.scheduleMidnightTimeout();
          AppLogger.info('gamification', 'Restored active StreakGuard', { id: storedStreakId, lastStreak: this.lastStartedStreak });
        } else {
          AppLogger.warn('gamification', 'Stored StreakGuard no longer exists, clearing');
          await this.clearStreakGuardPersistedState();
        }
      }

      // Restore DailyStory (if still valid today)
      if (storedStoryId && storedStoryDate === today) {
        const exists = active.some(a => a.id === storedStoryId && a.type === 'DailyStory');
        if (exists) {
          this.activeDailyStoryId = storedStoryId;
          // Restore meta — required so updateDailyStoryProgress can issue the
          // native update call after a kill+restart. Without this, the in-memory
          // `dailyStoryMeta` stays null and updates silently early-return.
          this.dailyStoryMeta = this.parseDailyStoryMeta(storedStoryMeta);
          this.scheduleDailyStoryMidnightTimeout();
          AppLogger.info('gamification', 'Restored active DailyStory', { id: storedStoryId, hasMeta: this.dailyStoryMeta !== null });
        } else {
          // iOS ended activity (8h timeout). Clear ID + meta only — keep date
          // flag so we don't re-start DailyStory on the same day.
          AppLogger.warn('gamification', 'Stored DailyStory no longer exists, clearing ID');
          await AsyncStorage.multiRemove([STORAGE_KEY_ACTIVE_DAILY_STORY, STORAGE_KEY_DAILY_STORY_META]);
        }
      }

      // Set initialized flag only after successful restoration — allows retry on error
      this.initialized = true;
    } catch (error) {
      AppLogger.error('gamification', 'LiveActivity initialize failed', {}, error as Error);
      // Leave this.initialized = false so next app launch can retry
    }
  }

  /** Clear StreakGuard persisted keys (called on stale cleanup or terminal). */
  private async clearStreakGuardPersistedState(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEY_ACTIVE_STREAK_GUARD,
        STORAGE_KEY_STREAK_GUARD_DATE,
        STORAGE_KEY_STREAK_GUARD_LAST_STREAK,
      ]);
    } catch (err) {
      AppLogger.warn('gamification', 'Failed to clear StreakGuard persisted state', { error: String(err) });
    }
  }

  /** Clear BOTH DailyStory keys (ID + date flag + meta). Use only for stale-day cleanup. */
  private async clearDailyStoryFullState(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEY_ACTIVE_DAILY_STORY,
        STORAGE_KEY_DAILY_STORY_DATE,
        STORAGE_KEY_DAILY_STORY_META,
      ]);
    } catch (err) {
      AppLogger.warn('gamification', 'Failed to clear DailyStory full state', { error: String(err) });
    }
  }

  /**
   * Persist `dailyStoryMeta` so it survives app kill+restart.
   * Without this, `updateDailyStoryProgress` would silently no-op after restart
   * because the in-memory meta is null even though the activity ID was restored.
   */
  private async persistDailyStoryMeta(meta: NonNullable<typeof this.dailyStoryMeta>): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_DAILY_STORY_META, JSON.stringify(meta));
    } catch (err) {
      AppLogger.warn('gamification', 'Failed to persist DailyStory meta', { error: String(err) });
    }
  }

  /** Safely parse a persisted meta blob; returns null on missing/corrupt JSON. */
  private parseDailyStoryMeta(raw: string | null): typeof this.dailyStoryMeta {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed.endDate === 'number' &&
        typeof parsed.currentStreak === 'number' &&
        typeof parsed.watchCompleted === 'boolean' &&
        typeof parsed.exploreCompleted === 'boolean' &&
        typeof parsed.questionsCompleted === 'boolean'
      ) {
        // Old meta blobs may carry an extra `startDate` field from the
        // count-up experiment — JSON.parse keeps it, but we ignore it. The
        // returned object's TS type doesn't declare `startDate` so callers
        // can't accidentally rely on it.
        return parsed;
      }
      AppLogger.warn('gamification', 'Persisted DailyStory meta has unexpected shape, ignoring');
      return null;
    } catch (err) {
      AppLogger.warn('gamification', 'Failed to parse DailyStory meta', { error: String(err) });
      return null;
    }
  }

  /** Compute today's local midnight as Unix epoch seconds (fallback endDate). */
  private todayMidnightEpochSeconds(): number {
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    return Math.floor(midnight.getTime() / 1000);
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

    let orphanDailyStoryId: string | null = null;

    // Already have an active activity (tracked in JS memory)
    if (this.activeStreakGuardId) {
      AppLogger.info('gamification', 'StreakGuard already active (JS tracked), skipping');
      return;
    }

    // Also check iOS-side — activity may have been started by push-to-start
    // (native side, not via JS bridge) so JS doesn't know about it
    try {
      const activeOnDevice = await listActiveActivities();
      const existingStreakGuard = activeOnDevice.find(a => a.type === 'StreakGuard');
      if (existingStreakGuard) {
        this.activeStreakGuardId = existingStreakGuard.id;
        AppLogger.info('gamification', 'StreakGuard already active (iOS side), adopting', { id: existingStreakGuard.id });
        return;
      }
      // Track orphaned DailyStory in local var — only adopt into this.activeDailyStoryId
      // at displacement time. Setting it here would leave zombie state if conditions fail below.
      if (!this.activeDailyStoryId) {
        const existingDailyStory = activeOnDevice.find(a => a.type === 'DailyStory');
        if (existingDailyStory) {
          AppLogger.info('gamification', 'Found orphaned DailyStory for potential displacement', { id: existingDailyStory.id });
          orphanDailyStoryId = existingDailyStory.id;
        }
      }
    } catch (err) {
      AppLogger.warn('gamification', 'listActiveActivities failed in checkAndStartStreakGuard', { error: String(err) });
    }

    // Check all conditions per spec (DEV_OVERRIDES bypass individual checks for testing)
    const now = new Date();
    const currentHour = now.getHours();

    if (!DEV_OVERRIDES.bypassTimeCheck && currentHour < STREAK_GUARD_START_HOUR) {
      AppLogger.info('gamification', 'Before 9 PM, skipping StreakGuard');
      return;
    }

    if (!DEV_OVERRIDES.bypassCardCheck && hasCompletedAnyCardToday) {
      AppLogger.info('gamification', 'Card already completed today, skipping StreakGuard');
      return;
    }

    if (!DEV_OVERRIDES.bypassStreakCheck && currentStreak < MIN_STREAK_FOR_URGENCY) {
      AppLogger.info('gamification', 'Streak too short for urgency', { currentStreak, min: MIN_STREAK_FOR_URGENCY });
      return;
    }

    // Check if Live Activities are enabled
    const enabled = await areActivitiesEnabled();
    if (!enabled) {
      AppLogger.info('gamification', 'Live Activities not enabled by user');
      return;
    }

    // All conditions met — displace DailyStory if active, then start StreakGuard
    // Per spec: StreakGuard replaces DailyStory (more urgent message takes priority)
    if (this.activeDailyStoryId || orphanDailyStoryId) {
      AppLogger.info('gamification', 'Displacing DailyStory — StreakGuard conditions met');
      const displacedId = this.activeDailyStoryId || orphanDailyStoryId;
      this.cancelDailyStoryMidnightTimeout();
      this.activeDailyStoryId = null;
      this.dailyStoryMeta = null;
      try {
        await endDailyStory(displacedId, 0);
      } catch (err) {
        AppLogger.warn('gamification', 'endDailyStory during displacement failed (may already be ended)', { error: String(err) });
      }
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

      // Persist all three so onStreakFailed renders the correct streak after
      // kill+restart (without the third key, .failed banner shows streak 0).
      const today = toLocalDateString(new Date());
      await AsyncStorage.setItem(STORAGE_KEY_ACTIVE_STREAK_GUARD, id);
      await AsyncStorage.setItem(STORAGE_KEY_STREAK_GUARD_DATE, today);
      await AsyncStorage.setItem(STORAGE_KEY_STREAK_GUARD_LAST_STREAK, String(displayStreak));

      this.scheduleMidnightTimeout();

      AppLogger.info('gamification', 'Started StreakGuard', { id, currentStreak, endDate });
    } catch (error) {
      AppLogger.error('gamification', 'Failed to start StreakGuard', {}, error as Error);
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
    // Atomic claim: capture ID + cancel timer + clear state BEFORE any await.
    // This prevents race with onStreakFailed if user completes at 23:59:59
    // and the midnight timer fires at 00:00:02 mid-transition.
    const id = this.activeStreakGuardId;
    if (!id) return;
    this.activeStreakGuardId = null;
    this.cancelMidnightTimeout();

    try {
      await updateStreakGuard({
        id,
        state: 'saved',
        endDate: 0,
        currentStreak: newStreakCount,
      });
      await endStreakGuard(id, LINGER_SECONDS);
      await this.clearStreakGuardPersistedState();
      AppLogger.info('gamification', 'Streak saved, ending with 15min linger', { newStreakCount });
    } catch (error) {
      AppLogger.error('gamification', 'Failed to transition to saved', {}, error as Error);
      // Best-effort cleanup — don't force-end other activities
      await this.clearStreakGuardPersistedState();
    }
  }

  /**
   * Called at midnight when user hasn't saved streak in time.
   * Transitions to .failed state and schedules dismissal.
   */
  private async onStreakFailed(): Promise<void> {
    // Atomic claim: capture ID + clear state BEFORE any await (prevents race with onStreakSaved)
    const id = this.activeStreakGuardId;
    if (!id) return;
    this.activeStreakGuardId = null;

    try {
      await updateStreakGuard({
        id,
        state: 'failed',
        endDate: 0,
        currentStreak: this.lastStartedStreak,
      });
      await endStreakGuard(id, LINGER_SECONDS);
      await this.clearStreakGuardPersistedState();
      AppLogger.info('gamification', 'Streak failed, ending with 15min linger');
    } catch (error) {
      AppLogger.error('gamification', 'Failed to transition to failed', {}, error as Error);
      await this.clearStreakGuardPersistedState();
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

    if (this.activeDailyStoryId || this.startingDailyStory) {
      AppLogger.info('gamification', 'DailyStory already active/starting, skipping');
      return;
    }

    // StreakGuard takes priority — never start DailyStory while StreakGuard is running.
    // Covers both JS-tracked (orchestrator just started it) and iOS-side (started natively
    // or restored from a previous session before JS initialized).
    if (this.activeStreakGuardId) {
      AppLogger.info('gamification', 'StreakGuard active — skipping DailyStory start');
      return;
    }
    try {
      const activeOnDevice = await listActiveActivities();
      if (activeOnDevice.some(a => a.type === 'StreakGuard')) {
        AppLogger.info('gamification', 'StreakGuard active on iOS — skipping DailyStory start');
        return;
      }
    } catch (err) {
      AppLogger.warn('gamification', 'listActiveActivities failed in StreakGuard pre-check', { error: String(err) });
    }

    this.startingDailyStory = true;

    try {
      // First-time-only: check if we already started a DailyStory today
      const today = toLocalDateString(new Date());
      const startedDate = await AsyncStorage.getItem(STORAGE_KEY_DAILY_STORY_DATE);
      if (startedDate === today) {
        AppLogger.info('gamification', 'DailyStory already started today, skipping');
        return;
      }

      // Check iOS-side for existing DailyStory (may have been started by push-to-start)
      try {
        const activeOnDevice = await listActiveActivities();
        const existingStory = activeOnDevice.find(a => a.type === 'DailyStory');
        if (existingStory) {
          this.activeDailyStoryId = existingStory.id;
          AppLogger.info('gamification', 'DailyStory already active (iOS side), adopting', { id: existingStory.id });
          return;
        }
      } catch (err) {
        AppLogger.warn('gamification', 'listActiveActivities failed in startDailyStoryActivity', { error: String(err) });
      }

      // Check if Live Activities are enabled
      const enabled = await areActivitiesEnabled();
      if (!enabled) {
        AppLogger.info('gamification', 'Live Activities not enabled by user');
        return;
      }

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
        eraTitle: params.storyTitle,
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

      // Persist for app restart recovery (ID + date flag + meta).
      // Meta is required so updateDailyStoryProgress can issue the native call
      // after kill+restart — without it, updates silently no-op.
      const persistDate = toLocalDateString(new Date());
      await AsyncStorage.setItem(STORAGE_KEY_ACTIVE_DAILY_STORY, id);
      await AsyncStorage.setItem(STORAGE_KEY_DAILY_STORY_DATE, persistDate);
      await this.persistDailyStoryMeta(this.dailyStoryMeta);

      this.scheduleDailyStoryMidnightTimeout();

      AppLogger.info('gamification', 'Started DailyStory', { id, storyId: params.storyId, endDate });
    } catch (error) {
      AppLogger.error('gamification', 'Failed to start DailyStory', {}, error as Error);
    } finally {
      this.startingDailyStory = false;
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
    if (!this.activeDailyStoryId) return;

    // Fallback: if meta is missing (e.g. corrupt persisted state), rebuild from
    // the current call + today's midnight. Without this, updates would no-op
    // on the rare path where the ID was restored but meta wasn't.
    if (!this.dailyStoryMeta) {
      AppLogger.warn('gamification', 'DailyStory meta missing on update — rebuilding from caller state');
      this.dailyStoryMeta = {
        currentStreak: params.currentStreak,
        endDate: this.todayMidnightEpochSeconds(),
        watchCompleted: params.watchCompleted,
        exploreCompleted: params.exploreCompleted,
        questionsCompleted: params.questionsCompleted,
      };
    }

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

      this.dailyStoryMeta = {
        ...this.dailyStoryMeta,
        watchCompleted: params.watchCompleted,
        exploreCompleted: params.exploreCompleted,
        questionsCompleted: params.questionsCompleted,
        currentStreak: params.currentStreak,
      };
      // Persist updated meta so subsequent kill+restart sees the latest state.
      await this.persistDailyStoryMeta(this.dailyStoryMeta);

      AppLogger.info('gamification', 'DailyStory progress updated', { completedCount, progressPercent });
    } catch (error) {
      // Native may throw `activityNotFound` if iOS already ended the activity
      // (8h timeout, user dismissed, or background reaper). Clean up local
      // state so the next foreground doesn't keep retrying a dead ID.
      //
      // Match all known variants — Swift throws `LiveActivityError.activityNotFound`
      // which surfaces in JS as message "No active Live Activity found with ID: <uuid>".
      // Earlier matcher checked `'not found'` literally — that substring doesn't
      // appear in the actual message ("Activity found" yes, "not found" no), so
      // the catch fell through and the error spammed on every card completion.
      const message = ((error as Error)?.message ?? String(error)).toLowerCase();
      if (
        message.includes('activitynotfound') ||
        message.includes('not found') ||
        message.includes('no active live activity')
      ) {
        AppLogger.warn('gamification', 'DailyStory activity gone on iOS — clearing local state', { error: message });
        this.activeDailyStoryId = null;
        this.dailyStoryMeta = null;
        this.cancelDailyStoryMidnightTimeout();
        await this.clearDailyStoryPersistedState();
        return;
      }
      AppLogger.error('gamification', 'Failed to update DailyStory', {}, error as Error);
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
    // Atomic claim: capture ID + cancel timer + clear state BEFORE await
    // (prevents race with onDailyStoryIncomplete midnight timer)
    const id = this.activeDailyStoryId;
    if (!id) return;
    this.activeDailyStoryId = null;
    this.dailyStoryMeta = null;
    this.cancelDailyStoryMidnightTimeout();

    try {
      await updateDailyStory({
        id,
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
      await endDailyStory(id, LINGER_SECONDS);
      await this.clearDailyStoryPersistedState();
      AppLogger.info('gamification', 'DailyStory completed, ending with 15min linger', { xpEarned, newStreakCount });
    } catch (error) {
      AppLogger.error('gamification', 'Failed to transition DailyStory to completed', {}, error as Error);
      await this.clearDailyStoryPersistedState();
    }
  }

  /**
   * Called at midnight when user hasn't finished all 3 cards.
   * Transitions to .incomplete state and schedules 15-min dismissal.
   */
  private async onDailyStoryIncomplete(): Promise<void> {
    // Atomic claim: capture ID + snapshot meta + clear state BEFORE await
    const id = this.activeDailyStoryId;
    if (!id) return;
    const meta = this.dailyStoryMeta;
    this.activeDailyStoryId = null;
    this.dailyStoryMeta = null;

    try {
      const completedCount = meta
        ? [meta.watchCompleted, meta.exploreCompleted, meta.questionsCompleted].filter(Boolean).length
        : 0;
      const currentCard = meta ? (meta.watchCompleted ? (meta.exploreCompleted ? 3 : 2) : 1) : 1;

      await updateDailyStory({
        id,
        state: 'incomplete',
        currentCard,
        totalCards: 3,
        progressPercent: completedCount / 3,
        watchCompleted: meta?.watchCompleted ?? false,
        exploreCompleted: meta?.exploreCompleted ?? false,
        questionsCompleted: meta?.questionsCompleted ?? false,
        currentStreak: meta?.currentStreak ?? 0,
        endDate: 0,
        xpEarned: 0,
      });
      await endDailyStory(id, LINGER_SECONDS);
      await this.clearDailyStoryPersistedState();
      AppLogger.info('gamification', 'DailyStory incomplete (midnight), ending with 15min linger');
    } catch (error) {
      AppLogger.error('gamification', 'Failed to transition DailyStory to incomplete', {}, error as Error);
      await this.clearDailyStoryPersistedState();
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

    // Add 2 second buffer to ensure we're clearly past midnight.
    // NOTE: setTimeout does NOT fire while iOS suspends JS in background — see
    // checkMidnightCrossover() which handles that case on app foreground.
    this.dailyStoryMidnightTimer = setTimeout(() => {
      this.onDailyStoryIncomplete();
    }, msUntilMidnight + 2000);

    AppLogger.info('gamification', 'DailyStory midnight timeout scheduled', { seconds: Math.round(msUntilMidnight / 1000) });
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
   * Only cleared on stale-day cleanup in initialize() / checkMidnightCrossover().
   */
  private async clearDailyStoryPersistedState(): Promise<void> {
    try {
      // Remove ID + meta together. The date flag stays as a "started today"
      // guard until stale-day cleanup in initialize() / checkMidnightCrossover().
      await AsyncStorage.multiRemove([STORAGE_KEY_ACTIVE_DAILY_STORY, STORAGE_KEY_DAILY_STORY_META]);
    } catch (err) {
      AppLogger.warn('gamification', 'Failed to clear DailyStory persisted state', { error: String(err) });
    }
  }

  // MARK: StreakGuard midnight timer

  private scheduleMidnightTimeout(): void {
    this.cancelMidnightTimeout();

    const now = Date.now();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now;

    if (msUntilMidnight <= 0) {
      this.onStreakFailed();
      return;
    }

    // NOTE: setTimeout does NOT fire while iOS suspends JS in background.
    // checkMidnightCrossover() handles that case via the AppState foreground listener.
    this.midnightTimer = setTimeout(() => {
      this.onStreakFailed();
    }, msUntilMidnight + 2000);

    AppLogger.info('gamification', 'StreakGuard midnight timeout scheduled', { seconds: Math.round(msUntilMidnight / 1000) });
  }

  private cancelMidnightTimeout(): void {
    if (this.midnightTimer) {
      clearTimeout(this.midnightTimer);
      this.midnightTimer = null;
    }
  }

  // MARK: Midnight crossover (app foreground handler)

  /**
   * Called on app foreground to catch midnight crossovers that happened
   * while JS was suspended (iOS background — setTimeout doesn't fire).
   *
   * If activity's persisted date is yesterday, transition to terminal state now.
   * Also clears DailyStory "started today" flag if it's stale (so new day
   * can start a fresh activity when user opens Today tab).
   */
  async checkMidnightCrossover(): Promise<void> {
    if (Platform.OS !== 'ios') return;

    try {
      const today = toLocalDateString(new Date());
      const [storedStreakDate, storedStoryDate] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_STREAK_GUARD_DATE),
        AsyncStorage.getItem(STORAGE_KEY_DAILY_STORY_DATE),
      ]);

      // StreakGuard: if active with stale date, fire .failed transition
      if (this.activeStreakGuardId && storedStreakDate && storedStreakDate !== today) {
        AppLogger.info('gamification', 'StreakGuard midnight crossover detected on foreground', { storedDate: storedStreakDate });
        await this.onStreakFailed();
      }

      // DailyStory: if active with stale date, silently dismiss (no retroactive
      // ".incomplete" banner — user opening app next morning shouldn't see yesterday's
      // terminal state; today's fresh activity will start when they open Today tab).
      if (this.activeDailyStoryId && storedStoryDate && storedStoryDate !== today) {
        AppLogger.info('gamification', 'DailyStory midnight crossover — silently ending stale activity', { storedDate: storedStoryDate });
        const staleId = this.activeDailyStoryId;
        this.activeDailyStoryId = null;
        this.dailyStoryMeta = null;
        this.cancelDailyStoryMidnightTimeout();
        try {
          await endDailyStory(staleId, 0);
        } catch (err) {
          AppLogger.warn('gamification', 'endDailyStory during crossover cleanup failed', { error: String(err) });
        }
        await this.clearDailyStoryFullState();
      }

      // DailyStory date flag stale (no active activity but flag from yesterday):
      // clear so new day can start fresh activity.
      if (!this.activeDailyStoryId && storedStoryDate && storedStoryDate !== today) {
        await AsyncStorage.removeItem(STORAGE_KEY_DAILY_STORY_DATE);
      }
    } catch (err) {
      AppLogger.warn('gamification', 'checkMidnightCrossover failed', { error: String(err) });
    }
  }

  // MARK: Reconcile with native

  /**
   * Reconcile JS state with native ActivityKit on app foreground.
   *
   * ActivityKit does NOT notify JS when the user dismisses an activity
   * (swipe-away on lock screen, long-press → Stop, OS reaper, 8h timeout).
   * Without reconciliation, JS keeps `activeDailyStoryId`/`activeStreakGuardId`
   * pointing at a dead native activity — causing:
   *  - `isDailyStoryActive` getter to lie (true when no activity exists)
   *  - `useFocusEffect` early-return that prevents re-creating the activity
   *  - update calls that throw `activityNotFound`
   *
   * This is a lazy fix: we only detect the dismissal *next time JS gets CPU*
   * (foreground). That's the best we can do — there is no eager callback.
   *
   * Behavior:
   *  - If JS thinks DailyStory is active but native disagrees → clear ID + meta
   *    (keep date flag, since the activity DID start today; we don't want to
   *    re-create it for the same quest the user dismissed).
   *  - If JS thinks StreakGuard is active but native disagrees → clear all
   *    StreakGuard state. The 9 PM trigger check will re-evaluate on next
   *    `checkAndStartStreakGuard` and start a fresh one if conditions still hold.
   *
   * Call after `checkMidnightCrossover()` and before `checkAndStartStreakGuard()`
   * on every foreground.
   */
  async reconcileWithNative(): Promise<void> {
    if (Platform.OS !== 'ios') return;
    if (!this.activeDailyStoryId && !this.activeStreakGuardId) return;

    let active: { id: string; type: string }[] = [];
    try {
      active = await listActiveActivities();
    } catch (err) {
      AppLogger.warn('gamification', 'reconcileWithNative — listActiveActivities failed', { error: String(err) });
      return;
    }

    if (this.activeDailyStoryId) {
      const stillExists = active.some(a => a.id === this.activeDailyStoryId && a.type === 'DailyStory');
      if (!stillExists) {
        AppLogger.info('gamification', 'reconcileWithNative — DailyStory gone on iOS, clearing JS state', { id: this.activeDailyStoryId });
        this.activeDailyStoryId = null;
        this.dailyStoryMeta = null;
        this.cancelDailyStoryMidnightTimeout();
        await this.clearDailyStoryPersistedState();
      }
    }

    if (this.activeStreakGuardId) {
      const stillExists = active.some(a => a.id === this.activeStreakGuardId && a.type === 'StreakGuard');
      if (!stillExists) {
        AppLogger.info('gamification', 'reconcileWithNative — StreakGuard gone on iOS, clearing JS state', { id: this.activeStreakGuardId });
        this.activeStreakGuardId = null;
        this.cancelMidnightTimeout();
        await this.clearStreakGuardPersistedState();
      }
    }
  }

  // MARK: Cleanup

  /**
   * Force-end all activities and clear all persisted state.
   * Safety net — wraps storage ops in try-catch since this is called from
   * error handlers and must not throw.
   */
  async forceEndAll(): Promise<void> {
    try {
      await endAllActivities();
    } catch (err) {
      AppLogger.warn('gamification', 'endAllActivities failed during forceEndAll', { error: String(err) });
    }
    this.cancelMidnightTimeout();
    this.cancelDailyStoryMidnightTimeout();
    this.activeStreakGuardId = null;
    this.activeDailyStoryId = null;
    this.dailyStoryMeta = null;
    try {
      await this.clearAllPersistedState();
    } catch (err) {
      AppLogger.warn('gamification', 'clearAllPersistedState failed during forceEndAll', { error: String(err) });
    }
    AppLogger.info('gamification', 'Force-ended all Live Activities');
  }

  /** Clear ALL persisted keys including DailyStory date flag. Use for nuclear reset. */
  private async clearAllPersistedState(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEY_ACTIVE_STREAK_GUARD,
      STORAGE_KEY_STREAK_GUARD_DATE,
      STORAGE_KEY_STREAK_GUARD_LAST_STREAK,
      STORAGE_KEY_ACTIVE_DAILY_STORY,
      STORAGE_KEY_DAILY_STORY_DATE,
      STORAGE_KEY_DAILY_STORY_META,
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
