import { pushAdventureProgress, pushDailyProgress } from './services/sync.js';

// === Settings ===
const SETTINGS_KEY = 'archives_settings';

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; }
  catch { return {}; }
}

function saveSettings(data) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
}

export function getSetting(key, defaultVal) {
  var s = loadSettings();
  return key in s ? s[key] : defaultVal;
}

export function setSetting(key, val) {
  var s = loadSettings();
  s[key] = val;
  saveSettings(s);
}

// === Progress ===
const KEY = 'archives_progress';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function markComplete(adventureId, moduleId, stars) {
  const data = load();
  if (!data[adventureId] || Array.isArray(data[adventureId])) data[adventureId] = {};
  // Store stars (keep best score)
  const prev = data[adventureId][moduleId] || 0;
  data[adventureId][moduleId] = Math.max(prev, stars || 0);
  save(data);
  pushAdventureProgress();
}

export function isComplete(adventureId, moduleId) {
  const data = load();
  const adv = data[adventureId];
  if (!adv) return false;
  return moduleId in adv;
}

export function getStars(adventureId, moduleId) {
  const data = load();
  const adv = data[adventureId];
  if (!adv) return 0;
  return adv[moduleId] || 0;
}

export function getCompletedCount(adventureId) {
  const data = load();
  const adv = data[adventureId];
  if (!adv) return 0;
  return Object.keys(adv).length;
}

export function getAllProgress() {
  return load();
}

// === Daily Story Progress ===
const DAILY_KEY = 'archives_daily_progress';

function loadDaily() {
  try { return JSON.parse(localStorage.getItem(DAILY_KEY)) || {}; }
  catch { return {}; }
}

function saveDaily(data) {
  localStorage.setItem(DAILY_KEY, JSON.stringify(data));
}

export function setDailyStepComplete(date, step, value) {
  var data = loadDaily();
  if (!data[date]) data[date] = {};
  data[date][step] = value || true;
  saveDaily(data);
  pushDailyProgress();
}

export function getDailyProgress(date) {
  return loadDaily()[date] || null;
}

export function getDailyProgressPercent(date, totalSteps) {
  var prog = loadDaily()[date];
  if (!prog || !totalSteps) return 0;
  var done = Object.keys(prog).length;
  return Math.round((done / totalSteps) * 100);
}

export function getDailyStreak(availableDates) {
  var data = loadDaily();
  var streak = 0;
  var d = new Date();
  // Check today first
  var todayStr = d.toISOString().split('T')[0];
  if (data[todayStr]) streak++;
  // Walk backwards from yesterday
  d.setDate(d.getDate() - 1);
  while (true) {
    var ds = d.toISOString().split('T')[0];
    if (availableDates && availableDates.indexOf(ds) === -1) {
      // No content for this day, skip (don't break streak)
      d.setDate(d.getDate() - 1);
      // Safety: stop if we go more than 60 days back
      if (new Date() - d > 60 * 86400000) break;
      continue;
    }
    if (data[ds]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export function getWeekStatus(availableDates) {
  var data = loadDaily();
  var today = new Date();
  var dow = today.getDay(); // 0=Sun
  // Monday = day 0 of the week
  var mondayOffset = dow === 0 ? -6 : 1 - dow;
  var monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  var labels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  var week = [];
  for (var i = 0; i < 7; i++) {
    var d = new Date(monday);
    d.setDate(monday.getDate() + i);
    var ds = d.toISOString().split('T')[0];
    var todayStr = today.toISOString().split('T')[0];
    var status;
    if (ds === todayStr) {
      status = data[ds] ? 'complete' : 'today';
    } else if (ds > todayStr) {
      status = 'future';
    } else {
      // Past day
      if (data[ds]) {
        status = 'complete';
      } else if (availableDates && availableDates.indexOf(ds) >= 0) {
        status = 'missed';
      } else {
        status = 'none'; // no content existed
      }
    }
    week.push({ date: ds, label: labels[i], status: status });
  }
  return week;
}
