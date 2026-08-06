// Content reads, via the backend.
//
// This module used to hold the Supabase URL and anon key and query PostgREST
// directly, which meant shipping a database credential to every visitor. It now
// calls same-origin /api/* endpoints; the credential lives only in the
// serverless functions. Nothing secret is exported from here any more - if you
// find yourself needing a key in the browser, that is the bug.
//
// The function signatures are unchanged, so no view needed touching.

import { localDateStr } from './utils.js';

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function get(path) {
  const cached = cache.get(path);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const res = await fetch(`/api${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);

  const data = await res.json();
  cache.set(path, { data, ts: Date.now() });
  return data;
}

export async function getAdventures(eraId = 'prophets') {
  return get(`/adventures?era=${encodeURIComponent(eraId)}`);
}

export async function getAdventure(readableId) {
  return get(`/adventures/${encodeURIComponent(readableId)}`);
}

export async function getEra(eraId = 'prophets') {
  return get(`/eras/${encodeURIComponent(eraId)}`);
}

export async function getAllEras() {
  return get('/eras');
}

export async function getTodayStory() {
  // The date is computed here rather than on the server: "today" belongs to the
  // user's timezone and the functions run in UTC. Sending it keeps the rollover
  // correct for anyone west of Greenwich.
  return get(`/daily/today?date=${encodeURIComponent(localDateStr())}`);
}

export async function getDailyStory(date) {
  return get(`/daily/${encodeURIComponent(date)}`);
}

export async function getDailyStories() {
  // Dates only - every caller uses nothing else, and the old query pulled about
  // a megabyte of story bodies just to build a list of days.
  return get('/daily');
}
