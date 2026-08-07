import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the sync module (imported by state.js) to prevent side effects
vi.mock('../services/sync.js', () => ({
  pushAdventureProgress: vi.fn(),
  pushDailyProgress: vi.fn(),
}));

import {
  getSetting, setSetting,
  markComplete, isComplete, getStars, getCompletedCount, getAllProgress,
  setDailyStepComplete, getDailyProgress, getDailyProgressPercent,
  getDailyStreak, getWeekStatus,
} from '../state.js';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

// === Corrupted localStorage Recovery ===
describe('Corrupted localStorage', () => {
  it('recovers from corrupted settings JSON', () => {
    localStorage.setItem('archives_settings', '{broken json!!!');
    expect(getSetting('sfx', true)).toBe(true);
  });

  it('recovers from corrupted progress JSON', () => {
    localStorage.setItem('archives_progress', 'not json');
    expect(isComplete('any', 'mod')).toBe(false);
    expect(getCompletedCount('any')).toBe(0);
  });

  it('recovers from corrupted daily JSON', () => {
    localStorage.setItem('archives_daily_progress', '{{{{');
    expect(getDailyProgress('2026-01-01')).toBeNull();
    expect(getDailyProgressPercent('2026-01-01', 5)).toBe(0);
  });
});

// === Settings ===
describe('Settings', () => {
  it('returns default when key missing', () => {
    expect(getSetting('sfx', true)).toBe(true);
  });

  it('stores and retrieves a setting', () => {
    setSetting('sfx', false);
    expect(getSetting('sfx', true)).toBe(false);
  });

  it('overwrites previous value', () => {
    setSetting('theme', 'dark');
    setSetting('theme', 'light');
    expect(getSetting('theme')).toBe('light');
  });
});

// === Adventure Progress ===
describe('Adventure Progress', () => {
  it('marks a module complete with stars', () => {
    markComplete('prophets_1', 'media_1', 2);
    expect(isComplete('prophets_1', 'media_1')).toBe(true);
    expect(getStars('prophets_1', 'media_1')).toBe(2);
  });

  it('keeps the best star score on retry', () => {
    markComplete('prophets_1', 'media_1', 3);
    markComplete('prophets_1', 'media_1', 1);
    expect(getStars('prophets_1', 'media_1')).toBe(3);
  });

  it('upgrades star score on better retry', () => {
    markComplete('prophets_1', 'media_1', 1);
    markComplete('prophets_1', 'media_1', 3);
    expect(getStars('prophets_1', 'media_1')).toBe(3);
  });

  it('returns false/0 for unknown adventure', () => {
    expect(isComplete('unknown', 'mod')).toBe(false);
    expect(getStars('unknown', 'mod')).toBe(0);
    expect(getCompletedCount('unknown')).toBe(0);
  });

  it('counts completed modules', () => {
    markComplete('prophets_1', 'media_1', 2);
    markComplete('prophets_1', 'media_2', 1);
    expect(getCompletedCount('prophets_1')).toBe(2);
  });

  it('handles markComplete with 0 stars', () => {
    markComplete('prophets_1', 'media_1', 0);
    expect(isComplete('prophets_1', 'media_1')).toBe(true);
    expect(getStars('prophets_1', 'media_1')).toBe(0);
  });

  it('returns entire progress object', () => {
    markComplete('a', 'm1', 3);
    markComplete('b', 'm2', 2);
    const all = getAllProgress();
    expect(all).toEqual({ a: { m1: 3 }, b: { m2: 2 } });
  });
});

// === Daily Progress ===
describe('Daily Progress', () => {
  it('records a step and retrieves it', () => {
    setDailyStepComplete('2026-03-24', 'watch', true);
    const prog = getDailyProgress('2026-03-24');
    expect(prog.watch).toBe(true);
  });

  it('returns null for unknown date', () => {
    expect(getDailyProgress('1999-01-01')).toBeNull();
  });

  it('accumulates steps', () => {
    setDailyStepComplete('2026-03-24', 'watch', true);
    setDailyStepComplete('2026-03-24', 'read', true);
    setDailyStepComplete('2026-03-24', 'quiz', true);
    const prog = getDailyProgress('2026-03-24');
    expect(Object.keys(prog)).toHaveLength(3);
  });

  it('stores a zero star count as 0, not true', () => {
    // `value || true` used to erase this. The questions step stores a star
    // count, so a 0/3 day became indistinguishable from an unscored
    // completion - and synced `true` to the cloud, where the mobile app
    // expects a number.
    setDailyStepComplete('2026-03-25', 'questions', 0);
    expect(getDailyProgress('2026-03-25').questions).toBe(0);
  });

  it('still defaults to true when no value is given', () => {
    setDailyStepComplete('2026-03-26', 'watch');
    expect(getDailyProgress('2026-03-26').watch).toBe(true);
  });

  it('keeps a non-zero star count intact', () => {
    setDailyStepComplete('2026-03-27', 'questions', 3);
    expect(getDailyProgress('2026-03-27').questions).toBe(3);
  });
});

describe('getDailyProgressPercent', () => {
  it('calculates percentage correctly', () => {
    setDailyStepComplete('2026-03-24', 'watch', true);
    setDailyStepComplete('2026-03-24', 'read', true);
    expect(getDailyProgressPercent('2026-03-24', 5)).toBe(40);
  });

  it('returns 0 for no progress', () => {
    expect(getDailyProgressPercent('2026-03-24', 5)).toBe(0);
  });

  it('returns 0 when totalSteps is 0', () => {
    setDailyStepComplete('2026-03-24', 'watch', true);
    expect(getDailyProgressPercent('2026-03-24', 0)).toBe(0);
  });

  it('returns 100 when all steps done', () => {
    setDailyStepComplete('2026-03-24', 'a', true);
    setDailyStepComplete('2026-03-24', 'b', true);
    expect(getDailyProgressPercent('2026-03-24', 2)).toBe(100);
  });
});

describe('getDailyStreak', () => {
  it('returns 0 when no progress at all', () => {
    expect(getDailyStreak([])).toBe(0);
  });

  it('counts today as 1 if completed', () => {
    const today = new Date().toISOString().split('T')[0];
    setDailyStepComplete(today, 'watch', true);
    expect(getDailyStreak([today])).toBe(1);
  });

  it('counts consecutive days', () => {
    const dates = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      dates.push(ds);
      setDailyStepComplete(ds, 'watch', true);
    }
    expect(getDailyStreak(dates)).toBe(3);
  });

  it('skips days with no available content (does not break streak)', () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

    // Complete today and 2 days ago, but yesterday had no content
    setDailyStepComplete(todayStr, 'watch', true);
    setDailyStepComplete(twoDaysAgoStr, 'watch', true);

    // Available dates exclude yesterday → streak should be 2
    expect(getDailyStreak([todayStr, twoDaysAgoStr])).toBe(2);
  });
});

describe('getWeekStatus', () => {
  it('returns 7 entries', () => {
    const week = getWeekStatus([]);
    expect(week).toHaveLength(7);
  });

  it('labels are Mon-Sun', () => {
    const week = getWeekStatus([]);
    expect(week.map(d => d.label)).toEqual(['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']);
  });

  it('marks today correctly', () => {
    const today = new Date().toISOString().split('T')[0];
    const week = getWeekStatus([]);
    const todayEntry = week.find(d => d.date === today);
    expect(todayEntry).toBeDefined();
    expect(todayEntry.status).toBe('today');
  });

  it('marks today as complete if progress exists', () => {
    const today = new Date().toISOString().split('T')[0];
    setDailyStepComplete(today, 'watch', true);
    const week = getWeekStatus([today]);
    const todayEntry = week.find(d => d.date === today);
    expect(todayEntry.status).toBe('complete');
  });

  it('marks future days as future', () => {
    const week = getWeekStatus([]);
    const today = new Date().toISOString().split('T')[0];
    const futureDays = week.filter(d => d.date > today);
    futureDays.forEach(d => {
      expect(d.status).toBe('future');
    });
  });

  it('marks past available day without progress as missed', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const ys = yesterday.toISOString().split('T')[0];
    const week = getWeekStatus([ys]);
    const entry = week.find(d => d.date === ys);
    // Only check if yesterday is in this week
    if (entry) {
      expect(entry.status).toBe('missed');
    }
  });
});
