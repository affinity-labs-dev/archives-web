import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  extractActivityDates,
  getCachedStreak,
  cacheStreak,
  cacheActivityDates,
  getMobileActivityDates,
} from '../streak.js';

// The streak is now shared with the mobile app. These cover the part of that
// which is pure: reading the app's blob and pulling out what the web needs.

describe('extractActivityDates', () => {
  beforeEach(() => localStorage.clear());

  it('returns nothing for a missing or empty blob', () => {
    expect(extractActivityDates(null)).toEqual([]);
    expect(extractActivityDates({})).toEqual([]);
  });

  it('takes a local date from each completion timestamp', () => {
    // completedAt is an ISO instant; the streak is a local-calendar idea, so
    // these have to be reduced to local dates rather than sliced as UTC.
    const dates = extractActivityDates({
      progress: [
        { completedAt: '2026-03-10T12:00:00.000Z' },
        { completedAt: '2026-03-12T12:00:00.000Z' },
      ],
    });
    expect(dates).toHaveLength(2);
    dates.forEach((d) => expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/));
  });

  it('includes lastActiveDate even when there is no progress array', () => {
    // A user who has only ever done daily stories has a streak but an empty
    // progress array, and their week strip would otherwise be blank.
    expect(extractActivityDates({ streak: { lastActiveDate: '2026-03-14' } })).toEqual([
      '2026-03-14',
    ]);
  });

  it('counts shielded days as activity', () => {
    // A shield is the app deciding the streak survives that day. Showing it as
    // missed would contradict the number sitting above it.
    const dates = extractActivityDates({
      streak: { lastActiveDate: '2026-03-14', shieldedDates: ['2026-03-13'] },
    });
    expect(dates).toContain('2026-03-13');
    expect(dates).toContain('2026-03-14');
  });

  it('de-duplicates and sorts', () => {
    const dates = extractActivityDates({
      progress: [
        { completedAt: '2026-03-10T09:00:00.000Z' },
        { completedAt: '2026-03-10T21:00:00.000Z' },
      ],
      streak: { lastActiveDate: '2026-03-09' },
    });
    expect(new Set(dates).size).toBe(dates.length);
    expect([...dates]).toEqual([...dates].sort());
  });

  it('survives malformed entries rather than throwing', () => {
    // This blob is written by another application and has already been seen
    // holding shapes its own types forbid.
    expect(() =>
      extractActivityDates({
        progress: [null, {}, { completedAt: 'not-a-date' }, { completedAt: 42 }],
        streak: { shieldedDates: [null, 7, '2026-03-01'] },
      }),
    ).not.toThrow();
    expect(extractActivityDates({
      progress: [{ completedAt: 'not-a-date' }],
      streak: { shieldedDates: ['2026-03-01'] },
    })).toEqual(['2026-03-01']);
  });
});

describe('the local mirror', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips a streak', () => {
    cacheStreak({ currentStreak: 17, longestStreak: 20, streakShields: 1 });
    expect(getCachedStreak().currentStreak).toBe(17);
  });

  it('reports nothing rather than a wrong zero when unset', () => {
    // The caller falls back to a derived count on null; a fabricated zero here
    // would show a user with a real streak that they have none.
    expect(getCachedStreak()).toBeNull();
  });

  it('ignores a malformed mirror', () => {
    localStorage.setItem('archives_mobile_streak', '{not json');
    expect(getCachedStreak()).toBeNull();
    localStorage.setItem('archives_mobile_streak', '{"currentStreak":"seventeen"}');
    expect(getCachedStreak()).toBeNull();
  });

  it('round-trips activity dates', () => {
    cacheActivityDates(['2026-03-01', '2026-03-02']);
    expect(getMobileActivityDates()).toEqual(['2026-03-01', '2026-03-02']);
  });

  it('returns an array even when the store holds something else', () => {
    localStorage.setItem('archives_mobile_activity', '"nope"');
    expect(getMobileActivityDates()).toEqual([]);
  });
});
