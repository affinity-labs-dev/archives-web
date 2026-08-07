// Cross-device progress sync, via the backend.
//
// This used to talk to PostgREST directly with the public anon key and put
// clerk.user.id in the request itself - so anyone holding that key (it shipped
// in the page) could read or overwrite any user's progress just by knowing
// their Clerk id. The row is now keyed on the `sub` claim of a verified token
// server-side; nothing here can name a different user.

import { getClerk } from '../auth.js';
import { cacheStreak, cacheActivityDates, extractActivityDates } from './streak.js';

const PROGRESS_KEY = 'archives_progress';
const DAILY_KEY = 'archives_daily_progress';
const MOBILE_XP_KEY = 'archives_mobile_xp';

async function authHeaders() {
  const clerk = getClerk();
  if (!clerk || !clerk.session) return null;
  const token = await clerk.session.getToken();
  if (!token) return null;
  return { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
}

// mastery_level → star count
function masteryToStars(level) {
  if (level === 'mastered') return 3;
  if (level === 'passed') return 2;
  return 1;
}

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch (e) {
    return {};
  }
}

/** Merge mobile progress (mastery levels) into local stars, best score wins. */
function mergeMobileProgress(cloud) {
  // The activity dates and the streak are useful even when there is no
  // adventure progress to merge, so they are read before the early return that
  // used to skip them.
  if (cloud) {
    if (cloud.streak) cacheStreak(cloud.streak);
    cacheActivityDates(extractActivityDates(cloud));
  }
  if (!cloud || !cloud.progress || !cloud.progress.length) return;

  var local = readJson(PROGRESS_KEY);
  for (var i = 0; i < cloud.progress.length; i++) {
    var entry = cloud.progress[i];
    var advId = entry.adventureId;
    var modId = entry.moduleId;
    if (!advId || !modId) continue;

    var stars = masteryToStars(entry.mastery_level);
    if (!local[advId] || Array.isArray(local[advId])) local[advId] = {};
    local[advId][modId] = Math.max(local[advId][modId] || 0, stars);
  }
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(local));

  if (cloud.totalXP || cloud.xp_by_era) {
    localStorage.setItem(
      MOBILE_XP_KEY,
      JSON.stringify({ totalXP: cloud.totalXP || 0, xp_by_era: cloud.xp_by_era || {} })
    );
  }
}

/** Merge this user's web progress from another browser. */
function mergeWebProgress(web) {
  if (!web) return;

  if (web.adventure_progress && Object.keys(web.adventure_progress).length) {
    var local = readJson(PROGRESS_KEY);
    for (var advId in web.adventure_progress) {
      if (!local[advId] || Array.isArray(local[advId])) local[advId] = {};
      var mods = web.adventure_progress[advId];
      for (var modId in mods) {
        local[advId][modId] = Math.max(local[advId][modId] || 0, mods[modId]);
      }
    }
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(local));
  }

  if (web.daily_progress && Object.keys(web.daily_progress).length) {
    var localDaily = readJson(DAILY_KEY);
    for (var date in web.daily_progress) {
      if (!localDaily[date]) localDaily[date] = {};
      var steps = web.daily_progress[date];
      for (var step in steps) {
        if (!(step in localDaily[date])) localDaily[date][step] = steps[step];
      }
    }
    localStorage.setItem(DAILY_KEY, JSON.stringify(localDaily));
  }
}

async function push(path, body) {
  var headers = await authHeaders();
  if (!headers) return;
  try {
    await fetch(path, { method: 'PUT', headers: headers, body: JSON.stringify(body) });
  } catch (err) {
    console.warn('Sync push failed:', err);
  }
}

// Both pushes stay debounced - progress changes in bursts as a quiz is answered.
var _advTimer = null;
export function pushAdventureProgress() {
  clearTimeout(_advTimer);
  _advTimer = setTimeout(function () {
    push('/api/progress/adventures', { adventure_progress: readJson(PROGRESS_KEY) });
  }, 1000);
}

var _dailyTimer = null;
export function pushDailyProgress() {
  clearTimeout(_dailyTimer);
  _dailyTimer = setTimeout(function () {
    push('/api/progress/daily', { daily_progress: readJson(DAILY_KEY) });
  }, 1000);
}

/** Boot: pull both sources in one request and merge into localStorage. */
export async function initSync() {
  var headers = await authHeaders();
  if (!headers) return;

  try {
    var res = await fetch('/api/progress', { headers: headers });
    if (!res.ok) return;
    var data = await res.json();
    mergeMobileProgress(data.mobile);
    mergeWebProgress(data.web);
    console.log('[Sync] Progress merged from mobile + web cloud');
  } catch (err) {
    console.warn('Progress sync failed:', err);
  }
}
