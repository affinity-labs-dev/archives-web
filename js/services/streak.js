// The universal streak.
//
// One streak, shared with the mobile app, advanced by any completion on either
// platform - a daily story or an adventure quiz. It lives in
// gamification_data.data.streak, which is the app's own state; the web app
// reads it and asks the server to advance it, and never computes it.
//
// It used to compute it. js/state.js#getDailyStreak walks the browser's
// daily-story progress and counts back from today, which meant adventure work
// counted for nothing and the number differed from the one on the user's
// phone. That derived function is still there and is still the fallback for
// anyone signed out or offline, but it is no longer the source of truth.

import { getClerk } from '../auth.js';
import { localDateStr } from '../utils.js';

const MOBILE_STREAK_KEY = 'archives_mobile_streak';
const MOBILE_ACTIVITY_KEY = 'archives_mobile_activity';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

/**
 * The streak as last known locally.
 *
 * Mirrored by initSync() on boot from the same row the phone writes, so a user
 * who has a 17-day streak on their phone sees 17 here on first paint - before
 * anything is asked of the network.
 */
export function getCachedStreak() {
  const s = readJson(MOBILE_STREAK_KEY, null);
  if (!s || typeof s.currentStreak !== 'number') return null;
  return s;
}

/**
 * Every local date this user was active on, from either platform.
 *
 * The week strip needs per-day history, and the streak object only carries
 * `lastActiveDate`. The mobile blob's progress entries each carry `completedAt`,
 * so those supply the phone's side; the browser's own daily progress supplies
 * the rest. Stored by initSync so the strip does not need a second request.
 */
export function getMobileActivityDates() {
  const list = readJson(MOBILE_ACTIVITY_KEY, []);
  return Array.isArray(list) ? list : [];
}

/** Extract activity dates from the mobile blob. Called by sync.js. */
export function extractActivityDates(mobile) {
  if (!mobile) return [];
  const dates = new Set();

  if (Array.isArray(mobile.progress)) {
    mobile.progress.forEach((entry) => {
      // completedAt is an ISO timestamp; the streak is a local-calendar idea,
      // so it has to be reduced to a local date rather than sliced as UTC.
      const at = entry && entry.completedAt;
      if (!at) return;
      const d = new Date(at);
      if (!isNaN(d)) dates.add(localDateStr(d));
    });
  }

  const streak = mobile.streak || {};
  if (streak.lastActiveDate) dates.add(streak.lastActiveDate);
  if (Array.isArray(streak.shieldedDates)) {
    streak.shieldedDates.forEach((d) => typeof d === 'string' && dates.add(d));
  }

  return Array.from(dates).sort();
}

export function cacheStreak(streak) {
  try {
    if (streak) localStorage.setItem(MOBILE_STREAK_KEY, JSON.stringify(streak));
  } catch (e) {
    /* private mode; the next boot will re-mirror it */
  }
}

export function cacheActivityDates(dates) {
  try {
    localStorage.setItem(MOBILE_ACTIVITY_KEY, JSON.stringify(dates || []));
  } catch (e) {
    /* as above */
  }
}

async function authHeaders() {
  const clerk = getClerk();
  if (!clerk || !clerk.session) return null;
  const token = await clerk.session.getToken();
  if (!token) return null;
  return { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
}

/**
 * Tell the server this user was active today, and get the new streak back.
 *
 * The date sent is the browser's LOCAL date, because that is what a streak
 * means and what the app uses. The server allows a day of slack either side of
 * its own UTC date, which covers every timezone without letting a caller claim
 * a future day.
 *
 * Resolves to null when signed out or when the request fails, and callers fall
 * back to the cached or derived number rather than showing nothing. Advancing a
 * streak is not worth blocking a celebration on.
 */
export async function bumpStreak() {
  const headers = await authHeaders();
  if (!headers) return null;

  try {
    const res = await fetch('/api/progress/streak', {
      method: 'POST',
      headers,
      body: JSON.stringify({ date: localDateStr(new Date()) }),
    });
    if (!res.ok) {
      console.warn('[Streak] bump failed:', res.status);
      return null;
    }
    const body = await res.json();
    const streak = body && body.streak;
    if (streak && typeof streak.currentStreak === 'number') {
      cacheStreak(streak);
      // Today counts from now on, whatever the strip knew a moment ago.
      const dates = getMobileActivityDates();
      const today = localDateStr(new Date());
      if (dates.indexOf(today) === -1) cacheActivityDates(dates.concat(today).sort());
      return streak;
    }
    return null;
  } catch (err) {
    console.warn('[Streak] bump failed:', err);
    return null;
  }
}
