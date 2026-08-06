// Converting web progress into the shape the Expo app reads.
//
// The two apps have stored progress in different tables and different shapes:
//
//   web    web_gamification_data.adventure_progress  {advId: {modId: stars}}
//          web_gamification_data.daily_progress      {date: {step: value}}
//   mobile gamification_data.data                    a GamifiedProgressState blob
//          user_daily_quest_progress                 one row per user per day
//
// When the web app becomes the Expo app, nothing reads the web tables any
// more. Without this conversion the 44 people with a web_gamification_data row
// open the new site and see every star gone - which reads as total data loss,
// not as a migration gap.
//
// Everything here is pure so the mapping can be tested exhaustively before it
// is run against real rows. The I/O lives in scripts/migrate-web-progress.mjs.

/**
 * The era that the numeric adventure ids belong to.
 *
 * The oldest web rows key adventures as bare `1`..`6` with modules `1`..`3`.
 * They are not in the `content` table under those ids, so they cannot be
 * resolved by lookup - but they are not a guess either: the Expo app's own
 * legacy migration treats exactly this shape as Era 1 and hardcodes the same
 * era (GamifiedProgress.tsx:885, `umayyad:${adventureId}:${moduleId}`).
 */
export const LEGACY_NUMERIC_ERA = 'umayyad';

/** Star counts are 0-3; mobile stores a mastery level. Mirrors Quiz.tsx. */
export function starsToMastery(stars) {
  if (stars >= 3) return 'mastered';
  if (stars >= 2) return 'passed';
  return 'attempted';
}

/**
 * Resolves an adventure id to its era.
 *
 * `eraByAdventure` comes from the `content` table, because the era genuinely
 * cannot be derived from the id: `prophets_1` is in era `prophets` but
 * `prophets_6` is in `prophets_2`, and `umayyad_adventure_1` is in `umayyad`.
 * Any string-surgery shortcut here silently files progress under the wrong era.
 *
 * Returns null when the id resolves to nothing, so the caller can report it
 * rather than invent an era.
 */
export function eraForAdventure(adventureId, eraByAdventure) {
  const id = String(adventureId);
  if (eraByAdventure[id]) return eraByAdventure[id];
  if (/^\d+$/.test(id)) return LEGACY_NUMERIC_ERA;
  return null;
}

/** The merge key mobile uses for a module. */
export function progressKey(entry) {
  return `${entry.era_id}:${entry.adventureId}:${entry.moduleId}`;
}

/**
 * Turns `{advId: {modId: stars}}` into mobile ProgressEntry objects.
 *
 * Returns unresolved adventure ids alongside the entries instead of dropping
 * them quietly - a migration that silently skips rows is indistinguishable
 * from one that worked.
 */
export function webAdventuresToEntries(adventureProgress, eraByAdventure, timestamp) {
  const entries = [];
  const unresolved = [];

  for (const adventureId of Object.keys(adventureProgress || {})) {
    const modules = adventureProgress[adventureId];
    // Older web rows stored an array here before the shape settled.
    if (!modules || typeof modules !== 'object' || Array.isArray(modules)) continue;

    const era = eraForAdventure(adventureId, eraByAdventure);
    if (!era) {
      unresolved.push(adventureId);
      continue;
    }

    for (const moduleId of Object.keys(modules)) {
      const stars = modules[moduleId];
      // Deliberately not coerced. `Number(null)` is 0, so coercing would turn a
      // missing value into a real zero-star "attempted" entry that the user
      // never earned. validate.js already rejects anything but an integer on
      // the way into this column, so a number is what a valid row contains.
      if (typeof stars !== 'number' || !Number.isInteger(stars) || stars < 0 || stars > 3) {
        continue;
      }

      entries.push({
        era_id: era,
        adventureId: String(adventureId),
        moduleId: String(moduleId),
        lessonsCompleted: [],
        quizScore: stars,
        // The web quiz is three questions, so stars and correct answers are the
        // same number. Recording it keeps XP consistent with mobile's formula.
        quizCorrectAnswers: stars,
        completedAt: timestamp,
        // A zero-star entry means attempted and failed, which is why it is kept
        // rather than skipped - but it is not a completion.
        isCompleted: stars > 0,
        quizCompleted: stars > 0,
        mastery_level: starsToMastery(stars),
        xp_earned: stars * 10,
        first_attempt_at: timestamp,
        attempt_count: 1,
      });
    }
  }

  return { entries, unresolved };
}

/**
 * Merges web entries into whatever mobile already has, best score wins.
 *
 * Direction matters. 22 of the 44 affected users already have a mobile row, so
 * this is a merge and not an insert, and letting a 0-star web entry overwrite a
 * 3-star mobile one would be worse than not migrating at all.
 */
/**
 * A progress list, whatever the stored row actually held.
 *
 * One of the 22 live rows has `progress: {}` - an empty object where the type
 * says array. Treating that as "no entries" is right and is also the only
 * option: there is nothing in an empty object to preserve.
 */
export function asProgressArray(value) {
  return Array.isArray(value) ? value : [];
}

export function mergeProgressEntries(existing, incoming) {
  const byKey = new Map();
  for (const entry of asProgressArray(existing)) byKey.set(progressKey(entry), entry);

  for (const entry of incoming) {
    const key = progressKey(entry);
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, entry);
      continue;
    }
    // Compare on XP rather than stars: it is the field mobile derives totals
    // from, and the legacy AsyncStorage format sets it without setting stars.
    const currentXp = current.xp_earned || (current.quizCorrectAnswers || 0) * 10;
    if (entry.xp_earned > currentXp) {
      byKey.set(key, { ...current, ...entry, attempt_count: (current.attempt_count || 1) + 1 });
    }
  }

  return [...byKey.values()];
}

/** Mirrors calculateXPFromProgress (GamifiedProgress.tsx:261). */
export function totalXpFor(progress) {
  return progress.reduce((sum, p) => sum + (p.xp_earned || (p.quizCorrectAnswers || 0) * 10), 0);
}

/** Mirrors calculateXPByEra. */
export function xpByEraFor(progress) {
  const out = {};
  for (const p of progress) {
    const xp = p.xp_earned || (p.quizCorrectAnswers || 0) * 10;
    out[p.era_id] = (out[p.era_id] || 0) + xp;
  }
  return out;
}

/** The empty blob mobile writes for a brand-new user (GamifiedProgress.tsx:439). */
export function emptyState(userId, timestamp) {
  const day = timestamp.split('T')[0];
  return {
    user_id: userId,
    progress: [],
    adventureProgress: [],
    selectedEra: '',
    totalXP: 0,
    xp_by_era: {},
    xp_by_source: { lessons: 0, quizzes: 0, games: 0 },
    streak: {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: day,
      longestStreakDate: day,
      streakShields: 0,
    },
    milestones: [],
    achievements_unlocked: [],
    behavior: {
      session_style: 'moderate',
      avg_attempts_per_visit: 0,
      engagement_trend: 'stable',
      weak_modules: [],
      strong_modules: [],
      last_computed: timestamp,
      mastery_percentage: 0,
      mastered_modules: 0,
      total_modules: 0,
      active_days: 0,
    },
    metadata: {
      created_at: timestamp,
      last_updated: timestamp,
      migration_completed: false,
      total_quiz_attempts: 0,
      total_modules_attempted: 0,
    },
  };
}

/**
 * The whole conversion for one user: existing mobile state plus a web row in,
 * the state to write out.
 *
 * Returns `changed: false` when the web row adds nothing, so the caller can
 * skip the write. Rewriting 22 rows to identical values would make the
 * migration's own report useless for telling whether it did anything.
 */
export function migrateUser({ existingState, webRow, eraByAdventure, userId, timestamp }) {
  const { entries, unresolved } = webAdventuresToEntries(
    webRow?.adventure_progress,
    eraByAdventure,
    timestamp
  );

  const base = existingState || emptyState(userId, timestamp);
  const before = asProgressArray(base.progress);
  const merged = mergeProgressEntries(before, entries);

  const changed =
    merged.length !== before.length || totalXpFor(merged) !== totalXpFor(before);

  if (!changed) return { state: base, changed: false, unresolved, added: 0 };

  const mastered = merged.filter((p) => p.mastery_level === 'mastered').length;
  const state = {
    ...base,
    user_id: userId,
    progress: merged,
    totalXP: totalXpFor(merged),
    xp_by_era: xpByEraFor(merged),
    xp_by_source: {
      ...base.xp_by_source,
      quizzes: totalXpFor(merged),
    },
    behavior: {
      ...base.behavior,
      mastered_modules: mastered,
      total_modules: merged.length,
      mastery_percentage: merged.length ? Math.round((mastered / merged.length) * 100) : 0,
    },
    metadata: {
      ...base.metadata,
      last_updated: timestamp,
      total_modules_attempted: merged.length,
    },
  };

  return { state, changed: true, unresolved, added: merged.length - before.length };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Turns `{date: {watch, explore, questions}}` into user_daily_quest_progress rows.
 *
 * `daily_content.id` is `daily_<date>`, so no lookup is needed to name the
 * quest - but the caller must still check the row exists, since this is a
 * foreign key.
 *
 * The completion calendar (useTodayHistory.ts:102) requires watch_completed AND
 * explore_completed AND score > 0, so all three fields have to survive or the
 * day stops showing as complete even though the progress is there.
 */
export function webDailyToQuestRows(dailyProgress, userId) {
  const rows = [];

  for (const date of Object.keys(dailyProgress || {})) {
    if (!DATE_RE.test(date)) continue;
    const steps = dailyProgress[date];
    if (!steps || typeof steps !== 'object' || Array.isArray(steps)) continue;

    // The web app writes `questions` as a 0-3 star count over a 3-question
    // quiz, which is the same number mobile stores as correct_answers.
    const score = Number(steps.questions) || 0;

    rows.push({
      user_id: userId,
      daily_quest_id: `daily_${date}`,
      watch_completed: Boolean(steps.watch),
      explore_completed: Boolean(steps.explore),
      score,
      correct_answers: score,
      total_questions: score > 0 ? 3 : 0,
    });
  }

  return rows;
}
