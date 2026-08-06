#!/usr/bin/env node
//
// Move web progress into the tables the Expo app reads.
//
// Run this once, at cutover. Until then the web app writes
// web_gamification_data and the Expo app reads gamification_data and
// user_daily_quest_progress; after the port, nothing reads the web tables, so
// without this the people who used the web app open the new site and find
// their stars gone.
//
//   node scripts/migrate-web-progress.mjs            # dry run, prints a plan
//   node scripts/migrate-web-progress.mjs --apply    # writes
//
// Safe to run twice: every conversion is a best-score-wins merge, and a user
// whose row already contains everything is reported as unchanged and skipped.
//
// The mapping itself lives in api/_lib/progress-migration.js and is unit
// tested. This file is only I/O, so that the part that can silently corrupt
// someone's progress is the part that is covered by tests.

import { readFileSync } from 'node:fs';
import { migrateUser, webDailyToQuestRows } from '../api/_lib/progress-migration.js';

const APPLY = process.argv.includes('--apply');

// ─── env ──────────────────────────────────────────────────────────────────
// Read .env directly rather than requiring a loader: this is a one-off script
// and the repo has no build step.
function loadEnv() {
  try {
    for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    // Fine - the variables may already be in the environment.
  }
}
loadEnv();

const URL_BASE = process.env.SUPABASE_URL;
// The Vercel functions call it SUPABASE_SERVICE_KEY; .env here calls it
// SUPABASE_SERVICE_ROLE_KEY. Accept either rather than fail on the name.
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_BASE || !KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY (or _ROLE_KEY) must be set');
  process.exit(1);
}

const HEADERS = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function get(path) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

async function upsert(table, rows, onConflict) {
  if (!rows.length) return;
  const res = await fetch(
    `${URL_BASE}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`,
    {
      method: 'POST',
      headers: {
        ...HEADERS,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(rows),
    }
  );
  if (!res.ok) throw new Error(`upsert ${table} -> ${res.status} ${await res.text()}`);
}

/** PostgREST caps a response at 1000 rows regardless of `limit`. */
async function getAll(path, order) {
  const out = [];
  for (let page = 0; ; page++) {
    const sep = path.includes('?') ? '&' : '?';
    const rows = await get(`${path}${sep}order=${order}&limit=1000&offset=${page * 1000}`);
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

// ─── run ──────────────────────────────────────────────────────────────────
const timestamp = new Date().toISOString();

console.log(APPLY ? 'APPLYING changes' : 'DRY RUN - nothing will be written');

const webRows = await getAll('web_gamification_data?select=user_id,adventure_progress,daily_progress', 'user_id');
console.log(`web_gamification_data rows: ${webRows.length}`);
if (!webRows.length) process.exit(0);

// readable_id -> era_id. The era cannot be derived from the adventure id, so
// this lookup is what makes the conversion correct rather than plausible.
const content = await getAll('content?select=readable_id,era_id', 'readable_id');
const eraByAdventure = Object.fromEntries(content.map((r) => [String(r.readable_id), r.era_id]));

const userIds = webRows.map((r) => r.user_id);
const inList = `(${userIds.join(',')})`;

const existingRows = await get(`gamification_data?select=user_id,data&user_id=in.${inList}`);
const existingByUser = new Map(existingRows.map((r) => [r.user_id, r.data]));

// daily_quest_id is a foreign key, so a date with no published story cannot be
// written. Web users could only have progress on days that were published, but
// checking beats assuming.
const dailyContent = await getAll('daily_content?select=id', 'id');
const knownQuests = new Set(dailyContent.map((r) => r.id));

const existingDaily = await get(
  `user_daily_quest_progress?select=user_id,daily_quest_id,watch_completed,explore_completed,score,correct_answers,total_questions&user_id=in.${inList}`
);
const dailyByKey = new Map(existingDaily.map((r) => [`${r.user_id}:${r.daily_quest_id}`, r]));

const stateRows = [];
const questRows = [];
const unresolved = new Map();
let unchanged = 0;
let missingQuest = 0;

for (const webRow of webRows) {
  const userId = webRow.user_id;

  const result = migrateUser({
    existingState: existingByUser.get(userId) || null,
    webRow,
    eraByAdventure,
    userId,
    timestamp,
  });

  for (const id of result.unresolved) {
    unresolved.set(id, (unresolved.get(id) || 0) + 1);
  }

  if (result.changed) {
    stateRows.push({ user_id: userId, data: result.state, updated_at: timestamp });
  } else {
    unchanged++;
  }

  for (const row of webDailyToQuestRows(webRow.daily_progress, userId)) {
    if (!knownQuests.has(row.daily_quest_id)) {
      missingQuest++;
      continue;
    }
    const current = dailyByKey.get(`${userId}:${row.daily_quest_id}`);
    if (!current) {
      questRows.push(row);
      continue;
    }
    // Merge rather than overwrite: someone who did the day on their phone and
    // partially on the web must keep the better of the two.
    const merged = {
      ...row,
      watch_completed: current.watch_completed || row.watch_completed,
      explore_completed: current.explore_completed || row.explore_completed,
      score: Math.max(current.score || 0, row.score),
      correct_answers: Math.max(current.correct_answers || 0, row.correct_answers),
      total_questions: Math.max(current.total_questions || 0, row.total_questions),
    };
    const same =
      merged.watch_completed === current.watch_completed &&
      merged.explore_completed === current.explore_completed &&
      merged.score === (current.score || 0);
    if (!same) questRows.push(merged);
  }
}

console.log('');
console.log(`gamification_data rows to write:        ${stateRows.length}`);
console.log(`  already up to date (skipped):         ${unchanged}`);
console.log(`user_daily_quest_progress rows to write: ${questRows.length}`);
if (missingQuest) console.log(`  skipped - no daily story published:   ${missingQuest}`);

if (unresolved.size) {
  // Printed, never silently dropped: an unresolved id is progress that will not
  // survive the cutover, and the only fix is a row in `content`.
  console.log('');
  console.log('UNRESOLVED adventure ids (progress NOT migrated for these):');
  for (const [id, count] of [...unresolved].sort()) {
    console.log(`  ${id}  (${count} user${count === 1 ? '' : 's'})`);
  }
}

if (!APPLY) {
  console.log('');
  console.log('Dry run complete. Re-run with --apply to write.');
  process.exit(0);
}

await upsert('gamification_data', stateRows, 'user_id');
await upsert('user_daily_quest_progress', questRows, 'user_id,daily_quest_id');
console.log('');
console.log('Done.');
