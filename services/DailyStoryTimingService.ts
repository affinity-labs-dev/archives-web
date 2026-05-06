import AsyncStorage from '@react-native-async-storage/async-storage';

import AppLogger from '@/services/AppLogger';
import { toLocalDateString } from '@/utils/dateUtils';

// Authoritative store for Daily Story timing data — used by both the Live
// Activity banner (count-up timer reads `startedAt`) and future in-app stat
// UI (computes elapsed time from completedAt/incompleteAt − startedAt).
//
// Per-day key with date suffix means rollover is automatic: yesterday's record
// stays parked under its own key, today's writes go to a fresh slot. No batch
// cleanup required.
//
// All timestamps are Unix seconds (matches the Live Activity native bridge,
// which uses Double seconds for ActivityKit ContentState fields).

const KEY_PREFIX = '@daily_story_timing_';

const buildKey = (date: string): string => `${KEY_PREFIX}${date}`;

const nowSeconds = (): number => Math.floor(Date.now() / 1000);

// Local midnight (start of next day) for a given YYYY-MM-DD, in Unix seconds.
// Used as the canonical "stop time" when finalizing an abandoned record:
// the user's intended completion deadline for that calendar day.
const midnightOfNextDay = (date: string): number => {
  const dayStart = new Date(`${date}T00:00:00`);
  dayStart.setHours(24, 0, 0, 0);
  return Math.floor(dayStart.getTime() / 1000);
};

export interface DailyStoryTimingRecord {
  /** Unix seconds — when user first engaged with daily story on this date. */
  startedAt: number;
  /** Unix seconds — when all 3 cards completed. `null` until completion. */
  completedAt: number | null;
  /** Unix seconds — when midnight passed without completion. `null` if still in-progress
   *  or already completed. Mutually exclusive with `completedAt`. */
  incompleteAt: number | null;
  /** Snapshot of (completedAt | incompleteAt) − startedAt at the moment of finalization.
   *  Frozen so future stat UI doesn't recompute drift if Date.now() is misused. */
  elapsedSeconds: number | null;
}

async function readRaw(date: string): Promise<DailyStoryTimingRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(buildKey(date));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as DailyStoryTimingRecord).startedAt === 'number'
    ) {
      return parsed as DailyStoryTimingRecord;
    }
    return null;
  } catch (err) {
    AppLogger.warn('gamification', 'DailyStoryTiming readRaw failed', {
      date,
      error: String(err),
    });
    return null;
  }
}

async function writeRecord(date: string, record: DailyStoryTimingRecord): Promise<void> {
  try {
    await AsyncStorage.setItem(buildKey(date), JSON.stringify(record));
  } catch (err) {
    AppLogger.warn('gamification', 'DailyStoryTiming writeRecord failed', {
      date,
      error: String(err),
    });
  }
}

export const DailyStoryTimingService = {
  /**
   * Idempotent — only sets `startedAt` if no record exists for `date`.
   * Subsequent calls (e.g. user re-opens today screen mid-day, or restores
   * after kill+restart) return the existing record unchanged so the timer
   * continues from the original moment of engagement.
   */
  async markStarted(date: string): Promise<DailyStoryTimingRecord> {
    const existing = await readRaw(date);
    if (existing) return existing;

    const fresh: DailyStoryTimingRecord = {
      startedAt: nowSeconds(),
      completedAt: null,
      incompleteAt: null,
      elapsedSeconds: null,
    };
    await writeRecord(date, fresh);
    AppLogger.info('gamification', 'DailyStoryTiming markStarted', {
      date,
      startedAt: fresh.startedAt,
    });
    return fresh;
  },

  /**
   * Records completion. Idempotent — skips if `completedAt` already set so
   * a double-fire from quiz handlers doesn't overwrite the original moment.
   * Computes `elapsedSeconds` snapshot.
   */
  async markCompleted(date: string): Promise<DailyStoryTimingRecord | null> {
    const existing = await readRaw(date);
    if (!existing) {
      AppLogger.warn('gamification', 'DailyStoryTiming markCompleted called with no startedAt', { date });
      return null;
    }
    if (existing.completedAt != null) return existing;

    const completedAt = nowSeconds();
    const updated: DailyStoryTimingRecord = {
      ...existing,
      completedAt,
      // If incompleteAt was already set (rare race with midnight crossover),
      // completion overrides — user actually finished. Clear the stale field.
      incompleteAt: null,
      elapsedSeconds: completedAt - existing.startedAt,
    };
    await writeRecord(date, updated);
    AppLogger.info('gamification', 'DailyStoryTiming markCompleted', {
      date,
      elapsedSeconds: updated.elapsedSeconds,
    });
    return updated;
  },

  /**
   * Records incompletion. Skipped if `completedAt` is already set — completion
   * always wins over a late midnight signal (avoids stomping the real finish
   * timestamp when scheduler fires after user finished at 23:59:59).
   *
   * `atTimestamp` defaults to now. Crossover handler passes midnight-of-stale-
   * date so the incomplete moment is the deadline the user missed, not the
   * arbitrary moment they next opened the app.
   */
  async markIncomplete(date: string, atTimestamp?: number): Promise<DailyStoryTimingRecord | null> {
    const existing = await readRaw(date);
    if (!existing) return null;
    if (existing.completedAt != null) return existing;
    if (existing.incompleteAt != null) return existing;

    const incompleteAt = atTimestamp ?? nowSeconds();
    const updated: DailyStoryTimingRecord = {
      ...existing,
      incompleteAt,
      elapsedSeconds: incompleteAt - existing.startedAt,
    };
    await writeRecord(date, updated);
    AppLogger.info('gamification', 'DailyStoryTiming markIncomplete', {
      date,
      elapsedSeconds: updated.elapsedSeconds,
    });
    return updated;
  },

  /**
   * Replay overwrite — RESTART MY DAY discards the previous attempt's timing
   * (decision #5: overwrite, not history array). Resets `startedAt` to now and
   * clears finalization fields. Future `markCompleted` will measure from this
   * fresh start.
   */
  async resetForReplay(date: string): Promise<DailyStoryTimingRecord> {
    const fresh: DailyStoryTimingRecord = {
      startedAt: nowSeconds(),
      completedAt: null,
      incompleteAt: null,
      elapsedSeconds: null,
    };
    await writeRecord(date, fresh);
    AppLogger.info('gamification', 'DailyStoryTiming resetForReplay', { date });
    return fresh;
  },

  /**
   * Returns the record for `date`, with lazy finalization for stale records:
   * if `date` is in the past and the record was never finalized (no
   * completedAt/incompleteAt), synthesize an `incompleteAt` using midnight of
   * the next day. Defensive — catches edge cases where the crossover handler
   * never ran (e.g. storage error, app uninstalled+reinstalled mid-day) so
   * future stat UI never sees a permanently "in progress" record.
   *
   * Note: lazy finalization here only mutates the *returned value*, not
   * storage. The caller can persist by calling `markIncomplete` if needed.
   * Read-only callers (stat UI) get a consistent view without side effects.
   */
  async getRecord(date: string): Promise<DailyStoryTimingRecord | null> {
    const record = await readRaw(date);
    if (!record) return null;

    const today = toLocalDateString(new Date());
    if (date < today && record.completedAt == null && record.incompleteAt == null) {
      const incompleteAt = midnightOfNextDay(date);
      return {
        ...record,
        incompleteAt,
        elapsedSeconds: incompleteAt - record.startedAt,
      };
    }
    return record;
  },

  // Helper exported for callers that need midnight-of-date math without
  // duplicating the Date arithmetic.
  midnightOfNextDay,
};
