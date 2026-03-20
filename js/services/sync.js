import { SUPABASE_URL, ANON_KEY } from '../api.js';
import { getClerk } from '../auth.js';

const PROGRESS_KEY = 'archives_progress';
const DAILY_KEY = 'archives_daily_progress';
const MOBILE_STREAK_KEY = 'archives_mobile_streak';
const MOBILE_XP_KEY = 'archives_mobile_xp';

function getUserId() {
  const clerk = getClerk();
  return clerk && clerk.user ? clerk.user.id : null;
}

function headers() {
  return {
    'apikey': ANON_KEY,
    'Authorization': 'Bearer ' + ANON_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates',
  };
}

// mastery_level → star count
function masteryToStars(level) {
  if (level === 'mastered') return 3;
  if (level === 'passed') return 2;
  return 1;
}

// Pull mobile progress from gamification_data (read-only)
async function pullMobileProgress() {
  var userId = getUserId();
  if (!userId) return;

  var res = await fetch(SUPABASE_URL + '/rest/v1/gamification_data?user_id=eq.' + encodeURIComponent(userId) + '&select=data', {
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + ANON_KEY },
  });
  if (!res.ok) return;
  var rows = await res.json();
  if (!rows.length || !rows[0].data) return;

  var cloud = rows[0].data;

  // Convert progress[] to web format and merge
  if (cloud.progress && cloud.progress.length) {
    var local = {};
    try { local = JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; } catch (e) { /* empty */ }

    for (var i = 0; i < cloud.progress.length; i++) {
      var entry = cloud.progress[i];
      var advId = entry.adventureId;
      var modId = entry.moduleId;
      if (!advId || !modId) continue;

      var stars = masteryToStars(entry.mastery_level);
      if (!local[advId] || Array.isArray(local[advId])) local[advId] = {};
      var prev = local[advId][modId] || 0;
      local[advId][modId] = Math.max(prev, stars);
    }

    localStorage.setItem(PROGRESS_KEY, JSON.stringify(local));
  }

  // Store streak data
  if (cloud.streak) {
    localStorage.setItem(MOBILE_STREAK_KEY, JSON.stringify(cloud.streak));
  }

  // Store XP data
  if (cloud.totalXP || cloud.xp_by_era) {
    localStorage.setItem(MOBILE_XP_KEY, JSON.stringify({
      totalXP: cloud.totalXP || 0,
      xp_by_era: cloud.xp_by_era || {},
    }));
  }
}

// Pull web progress from web_gamification_data (in case used on another browser)
async function pullWebProgress() {
  var userId = getUserId();
  if (!userId) return;

  var res = await fetch(SUPABASE_URL + '/rest/v1/web_gamification_data?user_id=eq.' + encodeURIComponent(userId) + '&select=adventure_progress,daily_progress', {
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + ANON_KEY },
  });
  if (!res.ok) return;
  var rows = await res.json();
  if (!rows.length) return;

  var row = rows[0];

  // Merge adventure progress
  if (row.adventure_progress && Object.keys(row.adventure_progress).length) {
    var local = {};
    try { local = JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; } catch (e) { /* empty */ }

    var cloud = row.adventure_progress;
    for (var advId in cloud) {
      if (!local[advId] || Array.isArray(local[advId])) local[advId] = {};
      var mods = cloud[advId];
      for (var modId in mods) {
        var prev = local[advId][modId] || 0;
        local[advId][modId] = Math.max(prev, mods[modId]);
      }
    }
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(local));
  }

  // Merge daily progress
  if (row.daily_progress && Object.keys(row.daily_progress).length) {
    var localDaily = {};
    try { localDaily = JSON.parse(localStorage.getItem(DAILY_KEY)) || {}; } catch (e) { /* empty */ }

    var cloudDaily = row.daily_progress;
    for (var date in cloudDaily) {
      if (!localDaily[date]) localDaily[date] = {};
      var steps = cloudDaily[date];
      for (var step in steps) {
        // Keep existing or take cloud value
        if (!(step in localDaily[date])) {
          localDaily[date][step] = steps[step];
        }
      }
    }
    localStorage.setItem(DAILY_KEY, JSON.stringify(localDaily));
  }
}

// Push adventure progress to web_gamification_data
var _advTimer = null;
export function pushAdventureProgress() {
  clearTimeout(_advTimer);
  _advTimer = setTimeout(function () {
    var userId = getUserId();
    if (!userId) return;
    var data = {};
    try { data = JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; } catch (e) { /* empty */ }

    fetch(SUPABASE_URL + '/rest/v1/web_gamification_data', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        user_id: userId,
        adventure_progress: data,
        updated_at: new Date().toISOString(),
      }),
    }).catch(function (err) { console.warn('Sync push adventure:', err); });
  }, 1000);
}

// Push daily progress to web_gamification_data
var _dailyTimer = null;
export function pushDailyProgress() {
  clearTimeout(_dailyTimer);
  _dailyTimer = setTimeout(function () {
    var userId = getUserId();
    if (!userId) return;
    var data = {};
    try { data = JSON.parse(localStorage.getItem(DAILY_KEY)) || {}; } catch (e) { /* empty */ }

    fetch(SUPABASE_URL + '/rest/v1/web_gamification_data', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        user_id: userId,
        daily_progress: data,
        updated_at: new Date().toISOString(),
      }),
    }).catch(function (err) { console.warn('Sync push daily:', err); });
  }, 1000);
}

// Boot: pull from both sources, merge into localStorage
export async function initSync() {
  var userId = getUserId();
  if (!userId) return;

  await pullMobileProgress();
  await pullWebProgress();
  console.log('[Sync] Progress merged from mobile + web cloud');
}
