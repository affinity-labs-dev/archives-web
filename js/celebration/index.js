// The post-quiz flow.
//
// One entry point for both the daily story and the adventure quizzes, which
// previously had a near-identical score screen each - two copies of the same
// stars, the same percentage counter and the same actions, drifting apart.
//
// Screen order, and note it INVERTS what the site used to do. The old flow
// showed the streak modal first and the score second, which meant the streak
// was computed before the day's completion had been written and came out one
// short - papered over with a `if (streak < 1) streak = 1` clamp. Persisting
// first and celebrating after makes the number simply correct.

import { getDailyStories } from '../api.js';
import { getDailyStreak, getWeekStatus } from '../state.js';
import { bumpStreak, getCachedStreak, getMobileActivityDates } from '../services/streak.js';
import { localDateStr } from '../utils.js';
import { createStage } from './stage.js';
import { buildQuizResults } from './quiz-results.js';
import { buildDailyStoryEnd } from './daily-story-end.js';
import { buildStreak, wasShownToday, markShownToday } from './streak.js';
import * as cues from './cues.js';

/**
 * Warm what the celebration will need.
 *
 * Called when a quiz starts, not when it ends: the audio then has the length
 * of the quiz to download, and - the part that actually matters - the audio
 * elements exist before the first answer tap, which is the gesture cues.js
 * uses to unlock playback on iOS.
 */
export function prepareCelebration() {
  cues.prepare();
}

/** Consume a user gesture to make the audio playable. Wire to the first answer. */
export function unlockCelebrationAudio() {
  cues.unlock();
}

/**
 * Build the week strip the streak screen renders.
 *
 * The union of both platforms, because the streak is. getWeekStatus only sees
 * the browser's daily-story progress, so a day the user spent on adventures -
 * or spent on their phone - read as missed under a streak number that counted
 * it. The mobile side comes from the activity dates sync.js extracts from the
 * app's own progress entries.
 *
 * `none` means no content was published that day. That is not the user's
 * failure, so it shows as pending rather than as a missed day.
 */
function toWeek(availableDates) {
  const week = getWeekStatus(availableDates) || [];
  const elsewhere = new Set(getMobileActivityDates());
  const today = localDateStr(new Date());

  return week.map((d) => {
    let status = d.status === 'none' ? 'future' : d.status;
    // Anything the other platform recorded counts, unless the day is still
    // ahead of us - a future date cannot be complete.
    if (elsewhere.has(d.date) && status !== 'future') {
      status = d.date === today ? 'today' : 'complete';
    }
    return { day: (d.label || '').charAt(0).toUpperCase(), status };
  });
}

/**
 * The streak to celebrate, from the server's answer.
 *
 * Falls back to the last mirrored value, then to the old derived count, so a
 * signed-out or offline user still sees something honest rather than a blank or
 * a zero. The cache only wins when it is at least as high as the derived
 * number: it can be stale, but it cannot be lower than what this browser can
 * prove locally.
 */
function resolveStreak(bumped, availableDates) {
  if (bumped && typeof bumped.currentStreak === 'number') {
    return { count: bumped.currentStreak, source: 'server' };
  }

  const cached = getCachedStreak();
  const derived = getDailyStreak(availableDates);
  if (cached && cached.currentStreak >= derived) {
    return { count: cached.currentStreak, source: 'cache' };
  }
  return { count: derived, source: 'derived' };
}

/**
 * Run the celebration.
 *
 * @param {object} opts
 * @param {number} opts.correct
 * @param {number} opts.total
 * @param {'daily'|'adventure'} opts.mode
 * @param {string} [opts.dailyDate]      YYYY-MM-DD, daily only
 * @param {Function} [opts.onExplanations]
 * @param {Function} [opts.onChat]
 * @param {Function} [opts.onContinue]   called once, when the flow ends
 * @returns {{destroy: Function}}
 */
export function runCelebration(opts) {
  const { correct = 0, total = 0, mode = 'daily' } = opts || {};
  const stage = createStage();
  let finished = false;
  let destroyed = false;

  // Record the activity now, not when the streak screen is about to show.
  //
  // Finishing a quiz IS the activity, and the app counts it that way - both
  // reportQuizComplete and reportTodayComplete bump the streak. Doing it inside
  // showStreak would have meant an adventure quiz on a day the streak screen
  // had already been shown never reached the server at all.
  //
  // Fire-and-forget, resolving to null when signed out or offline. Nothing
  // waits on it except the streak screen, which is several seconds away.
  const streakBump = bumpStreak();

  const finish = () => {
    if (finished || destroyed) return;
    finished = true;
    stage.destroy();
    if (opts.onContinue) opts.onContinue();
  };

  // Fonts are loaded on demand rather than preloaded site-wide, so a visitor
  // who never finishes a quiz never pays for them. Waiting here matters for
  // the streak screen in particular: its count-up is 90px Bounded, and a font
  // swapping in mid-count visibly reflows the number.
  //
  // Never blocking: if the fonts fail or the API is missing, the screen shows
  // in the fallback face rather than not at all.
  const fontsReady =
    typeof document !== 'undefined' && document.fonts
      ? Promise.race([
          Promise.all([
            document.fonts.load('900 90px Bounded'),
            document.fonts.load('600 16px Onest'),
          ]),
          new Promise((r) => setTimeout(r, 1200)),
        ]).catch(() => {})
      : Promise.resolve();

  const showStreak = () => {
    if (destroyed) return;
    // The gate is checked here, not up front, so abandoning the results screen
    // does not silently spend today's streak celebration.
    if (wasShownToday()) {
      finish();
      return;
    }

    getDailyStories()
      .then((stories) => (stories || []).map((s) => s.date))
      .catch(() => [])
      .then(async (dates) => {
        if (destroyed) return;
        const { count: streak } = resolveStreak(await streakBump, dates);
        if (destroyed) return;

        // Nothing to celebrate at zero.
        //
        // Far rarer now the streak is the shared one - any completion on either
        // platform advances it, so finishing a quiz almost always leaves it at
        // 1 or more. It still happens for a signed-out user, whose completions
        // reach no server, and there a screen reading "0 Day Streak!" over
        // "Every journey starts with a single day" is worse than no screen.
        //
        // The old code hid this by clamping the number up to 1, which showed
        // people a streak they did not have.
        if (streak < 1) {
          finish();
          return;
        }

        // Marked only now that it is actually being shown. Marking earlier
        // meant a skipped screen still spent the day's allowance, so finishing
        // a past story in the morning silently suppressed the real streak when
        // they came back for today's.
        markShownToday();

        const screen = stage.next((slot) =>
          buildStreak(slot, { streak, week: toWeek(dates), onContinue: finish }),
        );
        if (screen) screen.timeline.play();
      })
      .catch((err) => {
        // Without this the user is stranded: the last screen has already faded
        // out, so a throw in here leaves an empty stage with no way forward
        // and nothing in the console to explain it.
        console.error('[celebration] streak screen failed', err);
        finish();
      });
  };

  const afterResults = () => {
    if (destroyed) return;
    if (mode !== 'daily') {
      showStreak();
      return;
    }
    const screen = stage.next((slot) =>
      buildDailyStoryEnd(slot, { dailyDate: opts.dailyDate, onContinue: showStreak }),
    );
    if (screen) screen.timeline.play();
  };

  fontsReady.then(() => {
    if (destroyed) return;
    const screen = stage.first((slot) =>
      buildQuizResults(slot, {
        correct,
        total,
        // Ten a question, matching the app's totalPoints. Display only - the
        // web app has no XP of its own to persist it against.
        xp: correct * 10,
        onExplanations: opts.onExplanations,
        onChat: opts.onChat,
        onContinue: afterResults,
      }),
    );
    if (screen) screen.timeline.play();
  });

  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stage.destroy();
    },
  };
}
