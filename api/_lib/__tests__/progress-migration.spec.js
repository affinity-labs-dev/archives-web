import { describe, it, expect } from 'vitest';
import {
  eraForAdventure,
  webAdventuresToEntries,
  mergeProgressEntries,
  migrateUser,
  webDailyToQuestRows,
  totalXpFor,
  starsToMastery,
  LEGACY_NUMERIC_ERA,
} from '../progress-migration.js';

const TS = '2026-08-06T12:00:00.000Z';
const USER = 'user_2abcDEF';

// The real mapping, as it comes back from the content table. `prophets_6` is in
// era `prophets_2`, which is the case that kills any derive-from-the-id shortcut.
const ERAS = {
  prophets_1: 'prophets',
  prophets_2: 'prophets',
  prophets_6: 'prophets_2',
  umayyad_adventure_1: 'umayyad',
  al_andalus_1_3: 'al_andalus_1',
  women_of_islam_1: 'women_of_islam',
};

describe('eraForAdventure', () => {
  it('resolves through the content map rather than the id', () => {
    expect(eraForAdventure('prophets_1', ERAS)).toBe('prophets');
    // The one that matters: the prefix says prophets, the content says otherwise.
    expect(eraForAdventure('prophets_6', ERAS)).toBe('prophets_2');
    expect(eraForAdventure('umayyad_adventure_1', ERAS)).toBe('umayyad');
    expect(eraForAdventure('al_andalus_1_3', ERAS)).toBe('al_andalus_1');
  });

  it('maps the bare numeric ids to Era 1', () => {
    // Not a guess: GamifiedProgress.tsx:885 hardcodes the same era for the same
    // shape when it migrates the app's own legacy data.
    for (const id of ['1', '2', '3', '4', '5', '6']) {
      expect(eraForAdventure(id, ERAS)).toBe(LEGACY_NUMERIC_ERA);
    }
    expect(eraForAdventure(3, ERAS)).toBe(LEGACY_NUMERIC_ERA);
  });

  it('returns null rather than inventing an era', () => {
    expect(eraForAdventure('prophets_era1_recap', {})).toBe(null);
    expect(eraForAdventure('something_new', ERAS)).toBe(null);
  });
});

describe('starsToMastery', () => {
  it('matches the thresholds the app uses', () => {
    expect(starsToMastery(3)).toBe('mastered');
    expect(starsToMastery(2)).toBe('passed');
    expect(starsToMastery(1)).toBe('attempted');
    expect(starsToMastery(0)).toBe('attempted');
  });
});

describe('webAdventuresToEntries', () => {
  it('converts the real shape', () => {
    const { entries } = webAdventuresToEntries(
      { prophets_1: { media_1: 3, media_2: 2 } },
      ERAS,
      TS
    );
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      era_id: 'prophets',
      adventureId: 'prophets_1',
      moduleId: 'media_1',
      quizScore: 3,
      quizCorrectAnswers: 3,
      mastery_level: 'mastered',
      xp_earned: 30,
      isCompleted: true,
      quizCompleted: true,
    });
  });

  it('keeps a zero-star module as attempted but not completed', () => {
    const { entries } = webAdventuresToEntries({ prophets_1: { media_1: 0 } }, ERAS, TS);
    expect(entries[0]).toMatchObject({
      quizScore: 0,
      xp_earned: 0,
      mastery_level: 'attempted',
      isCompleted: false,
      quizCompleted: false,
    });
  });

  it('reports unresolved adventures instead of dropping them silently', () => {
    const { entries, unresolved } = webAdventuresToEntries(
      { prophets_1: { media_1: 3 }, prophets_era1_recap: { media_1: 3 } },
      ERAS,
      TS
    );
    expect(entries).toHaveLength(1);
    expect(unresolved).toEqual(['prophets_era1_recap']);
  });

  it('survives the shapes older rows actually contain', () => {
    expect(webAdventuresToEntries(null, ERAS, TS).entries).toEqual([]);
    expect(webAdventuresToEntries({}, ERAS, TS).entries).toEqual([]);
    // An array where an object was expected - the pre-settled web format.
    expect(webAdventuresToEntries({ prophets_1: [3, 2] }, ERAS, TS).entries).toEqual([]);
    // Out-of-range and non-integer star counts are skipped, not clamped: a
    // clamp would invent a score nobody earned.
    expect(
      webAdventuresToEntries({ prophets_1: { a: 4, b: -1, c: 2.5, d: '3', e: null } }, ERAS, TS)
        .entries
    ).toEqual([]);
  });
});

describe('mergeProgressEntries', () => {
  const mobile3 = {
    era_id: 'prophets',
    adventureId: 'prophets_1',
    moduleId: 'media_1',
    quizScore: 3,
    quizCorrectAnswers: 3,
    xp_earned: 30,
    mastery_level: 'mastered',
    attempt_count: 1,
  };

  it('never lets a worse web score overwrite a better mobile one', () => {
    // The failure that would be worse than not migrating at all.
    const web0 = { ...mobile3, quizScore: 0, quizCorrectAnswers: 0, xp_earned: 0, mastery_level: 'attempted' };
    const merged = mergeProgressEntries([mobile3], [web0]);
    expect(merged).toHaveLength(1);
    expect(merged[0].xp_earned).toBe(30);
    expect(merged[0].mastery_level).toBe('mastered');
  });

  it('takes the web score when it is better', () => {
    const mobile1 = { ...mobile3, quizScore: 1, quizCorrectAnswers: 1, xp_earned: 10, mastery_level: 'attempted' };
    const merged = mergeProgressEntries([mobile1], [mobile3]);
    expect(merged[0].xp_earned).toBe(30);
    expect(merged[0].mastery_level).toBe('mastered');
    expect(merged[0].attempt_count).toBe(2);
  });

  it('adds modules mobile has never seen', () => {
    const other = { ...mobile3, moduleId: 'media_2' };
    expect(mergeProgressEntries([mobile3], [other])).toHaveLength(2);
  });

  it('keys on era as well as adventure and module', () => {
    // prophets_1 and prophets_6 live in different eras; same module id must not
    // collide across them.
    const otherEra = { ...mobile3, era_id: 'prophets_2' };
    expect(mergeProgressEntries([mobile3], [otherEra])).toHaveLength(2);
  });

  it('compares on XP so the AsyncStorage legacy shape still ranks', () => {
    // An entry with no xp_earned but a correct-answer count is the legacy form.
    const legacy = { ...mobile3, xp_earned: undefined, quizCorrectAnswers: 3 };
    const web1 = { ...mobile3, quizScore: 1, quizCorrectAnswers: 1, xp_earned: 10 };
    expect(mergeProgressEntries([legacy], [web1])[0].quizCorrectAnswers).toBe(3);
  });
});

describe('migrateUser', () => {
  const webRow = { adventure_progress: { prophets_1: { media_1: 3, media_2: 1 } } };

  it('builds a complete state for a user who has no mobile row', () => {
    const { state, changed } = migrateUser({
      existingState: null,
      webRow,
      eraByAdventure: ERAS,
      userId: USER,
      timestamp: TS,
    });
    expect(changed).toBe(true);
    expect(state.user_id).toBe(USER);
    expect(state.progress).toHaveLength(2);
    expect(state.totalXP).toBe(40);
    expect(state.xp_by_era).toEqual({ prophets: 40 });
    expect(state.behavior.total_modules).toBe(2);
    expect(state.behavior.mastered_modules).toBe(1);
    expect(state.behavior.mastery_percentage).toBe(50);
    // The state has to be shaped like one mobile wrote, or the app reads
    // undefined where it expects an object.
    expect(state.streak).toMatchObject({ currentStreak: 0, longestStreak: 0 });
    expect(state.xp_by_source.quizzes).toBe(40);
  });

  it('reports no change when the web row adds nothing', () => {
    const existing = migrateUser({
      existingState: null,
      webRow,
      eraByAdventure: ERAS,
      userId: USER,
      timestamp: TS,
    }).state;

    const again = migrateUser({
      existingState: existing,
      webRow,
      eraByAdventure: ERAS,
      userId: USER,
      timestamp: TS,
    });
    // Rerunning must be a no-op, both so the script is safe to run twice and so
    // its report means something.
    expect(again.changed).toBe(false);
    expect(again.added).toBe(0);
  });

  it('preserves mobile fields the web row knows nothing about', () => {
    const existing = {
      user_id: USER,
      progress: [],
      selectedEra: 'umayyad',
      streak: { currentStreak: 9, longestStreak: 12, lastActiveDate: '2026-08-05', longestStreakDate: '2026-07-01', streakShields: 2 },
      achievements_unlocked: ['first_quiz'],
      xp_by_source: { lessons: 5, quizzes: 0, games: 0 },
      behavior: {},
      metadata: { created_at: '2026-01-01T00:00:00.000Z' },
    };
    const { state } = migrateUser({
      existingState: existing,
      webRow,
      eraByAdventure: ERAS,
      userId: USER,
      timestamp: TS,
    });
    // A migration that resets someone's streak to zero is a data-loss bug that
    // looks exactly like the one it was written to prevent.
    expect(state.streak.currentStreak).toBe(9);
    expect(state.achievements_unlocked).toEqual(['first_quiz']);
    expect(state.selectedEra).toBe('umayyad');
    expect(state.xp_by_source.lessons).toBe(5);
    expect(state.metadata.created_at).toBe('2026-01-01T00:00:00.000Z');
  });

  it('passes unresolved adventures back to the caller', () => {
    const { unresolved } = migrateUser({
      existingState: null,
      webRow: { adventure_progress: { mystery_1: { media_1: 3 } } },
      eraByAdventure: ERAS,
      userId: USER,
      timestamp: TS,
    });
    expect(unresolved).toEqual(['mystery_1']);
  });

  it('tolerates a stored progress field that is not an array', () => {
    // One of the 22 live rows has `progress: {}`. Found by dry-running against
    // real data, not by imagining it - the type says array.
    const { state, changed } = migrateUser({
      existingState: { user_id: USER, progress: {}, behavior: {}, metadata: {} },
      webRow,
      eraByAdventure: ERAS,
      userId: USER,
      timestamp: TS,
    });
    expect(changed).toBe(true);
    expect(state.progress).toHaveLength(2);
    expect(state.totalXP).toBe(40);
  });

  it('handles a web row with no adventure progress at all', () => {
    // 9 of the 44 rows have only daily progress.
    const { changed } = migrateUser({
      existingState: null,
      webRow: { daily_progress: { '2026-08-01': { watch: true } } },
      eraByAdventure: ERAS,
      userId: USER,
      timestamp: TS,
    });
    expect(changed).toBe(false);
  });
});

describe('webDailyToQuestRows', () => {
  it('converts a fully completed day', () => {
    const rows = webDailyToQuestRows({ '2026-08-01': { watch: true, explore: true, questions: 3 } }, USER);
    expect(rows).toEqual([
      {
        user_id: USER,
        daily_quest_id: 'daily_2026-08-01',
        watch_completed: true,
        explore_completed: true,
        score: 3,
        correct_answers: 3,
        total_questions: 3,
      },
    ]);
  });

  it('keeps all three fields so the completion calendar still matches', () => {
    // useTodayHistory.ts:102 requires watch AND explore AND score > 0. Lose any
    // one and the day silently stops showing as complete.
    const [row] = webDailyToQuestRows({ '2026-08-01': { watch: true, explore: true, questions: 1 } }, USER);
    expect(row.watch_completed && row.explore_completed && row.score > 0).toBe(true);
  });

  it('records a partial day as partial', () => {
    const [row] = webDailyToQuestRows({ '2026-08-01': { watch: true } }, USER);
    expect(row).toMatchObject({
      watch_completed: true,
      explore_completed: false,
      score: 0,
      total_questions: 0,
    });
  });

  it('ignores anything that is not a date', () => {
    expect(webDailyToQuestRows({ 'not-a-date': { watch: true } }, USER)).toEqual([]);
    expect(webDailyToQuestRows({ '2026-8-1': { watch: true } }, USER)).toEqual([]);
    expect(webDailyToQuestRows(null, USER)).toEqual([]);
    expect(webDailyToQuestRows({ '2026-08-01': null }, USER)).toEqual([]);
  });
});

describe('totalXpFor', () => {
  it('matches the app formula, including the legacy fallback', () => {
    expect(totalXpFor([{ xp_earned: 30 }, { quizCorrectAnswers: 2 }])).toBe(50);
    expect(totalXpFor([])).toBe(0);
  });
});
