import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers/mock-auth.js';

// The celebration wired into the real daily-story view.
//
// celebration.spec.js drives the screens directly through a harness, which
// proves they look and behave right but says nothing about whether the view
// actually calls them. This does the opposite: it answers a real quiz in the
// real view and checks that the flow, the progress write and the teardown all
// happen. The content API is stubbed because it is a Vercel function and does
// not exist under a static local server.

// Today, in local parts. The streak is derived by walking back from today
// through the dates content exists on, so a fixture dated in the past can
// never produce a streak of 1 no matter what the code does.
const now = new Date();
const DATE = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, '0'),
  String(now.getDate()).padStart(2, '0'),
].join('-');

const STORY = {
  id: 'daily-test',
  date: DATE,
  content: {
    today_title: 'The Test Era',
    card1: {
      content_type: 'reel',
      title: 'Watch',
      media_url: 'https://example.invalid/none.mp4',
      content: { reading_text: 'Some reading text.' },
      bottom_content: { reading_text: 'Deeper reading text.' },
    },
    card3: {
      title: 'Questions',
      questions: [
        {
          question_text: 'Q one?',
          question_type: 'mcq',
          explanation: 'Because one.',
          answers: [
            { text: 'Right one', is_correct: true },
            { text: 'Wrong one', is_correct: false },
          ],
        },
        {
          question_text: 'Q two?',
          question_type: 'mcq',
          explanation: 'Because two.',
          answers: [
            { text: 'Right two', is_correct: true },
            { text: 'Wrong two', is_correct: false },
          ],
        },
      ],
    },
  },
};

async function mockContent(page) {
  await page.route('**/api/daily/**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(STORY) }),
  );
  await page.route('**/api/daily*', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ date: DATE }]),
    }),
  );
  await page.route('**/api/progress**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  );
}

/**
 * Let the streak screen through.
 *
 * mock-auth.js seeds `archives_streak_shown_date` with today so the streak
 * does not interrupt every unrelated test. Tests that are ABOUT the streak
 * have to undo that, and the init script must be registered after mockAuth's
 * so it wins.
 */
async function allowStreak(page) {
  await page.addInitScript(() => localStorage.removeItem('archives_streak_shown_date'));
}

/**
 * Jump to the questions step.
 *
 * The daily story is a panel flow - watch, then (when present) explore, then
 * questions - and only the active panel is visible. The step pills are the
 * app's own way in, so using them keeps this a real user path rather than a
 * poke at internals.
 */
async function gotoQuestions(page) {
  const pills = page.locator('.ds__step-pill');
  await pills.first().waitFor({ timeout: 20000 });
  await pills.last().click();
  await page.locator('#ds-quiz-container .quiz__answer').first().waitFor({ timeout: 20000 });
}

/** Answer every question, choosing right or wrong as asked. */
async function answerAll(page, correct) {
  for (let i = 0; i < STORY.content.card3.questions.length; i++) {
    await page.waitForSelector('.quiz__answer:not(.answered)', { timeout: 15000 });
    const answers = page.locator('.quiz__answer:not(.answered)');
    await answers.nth(correct ? 0 : 1).click();
    await page.locator('.quiz__next').click();
    await page.waitForTimeout(200);
  }
}

test.beforeEach(async ({ page }) => {
  await mockAuth(page);
  await mockContent(page);
  // Collapses the choreography to its end state, so the flow can be driven
  // without waiting out ~9s of animation per screen.
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('a finished daily story runs results, end screen and streak in order', async ({ page }) => {
  await allowStreak(page);
  await page.goto(`/#/daily/play/${DATE}`);
  await gotoQuestions(page);
  await answerAll(page, true);

  // 1. Results.
  await expect(page.locator('.qres')).toBeVisible();
  await expect(page.locator('.qres__headline')).toHaveText('AMAZING JOB!');
  await expect(page.locator('.qres__pct')).toHaveText('100');
  await expect(page.locator('.qres__xp')).toHaveText('20 XP');

  // 2. The daily story end screen - daily only.
  await page.locator('.qres__cta').click();
  await expect(page.locator('.dsend')).toBeVisible();
  await expect(page.locator('.dsend__headline')).toContainText('IS COMPLETE!');

  // 3. The streak.
  await page.locator('.dsend__cta').click();
  await expect(page.locator('.streak')).toBeVisible();
  await expect(page.locator('.streak__count')).toHaveText('1');

  // 4. Out, and fully torn down.
  await page.locator('.streak__cta').click();
  await expect(page.locator('#cel-root')).toHaveCount(0);
});

test('writes the star count before the streak is computed', async ({ page }) => {
  // The order matters and used to be wrong: the old flow celebrated first, so
  // the streak could not see today's completion and came out one short, which
  // a `if (streak < 1) streak = 1` clamp hid. Getting 1 here on a fresh
  // profile proves the write lands first, without leaning on that clamp.
  await allowStreak(page);
  await page.goto(`/#/daily/play/${DATE}`);
  await gotoQuestions(page);
  await answerAll(page, true);

  const stored = await page.evaluate(
    (d) => JSON.parse(localStorage.getItem('archives_daily_progress') || '{}')[d],
    DATE,
  );
  expect(stored.questions).toBe(3);

  await page.locator('.qres__cta').click();
  await page.locator('.dsend__cta').click();
  await expect(page.locator('.streak__count')).toHaveText('1');
});

test('a zero score stores 0 rather than losing the result', async ({ page }) => {
  await page.goto(`/#/daily/play/${DATE}`);
  await gotoQuestions(page);
  await answerAll(page, false);

  await expect(page.locator('.qres__headline')).toHaveText('NICE EFFORT!');
  await expect(page.locator('.qres__pct')).toHaveText('0');

  const stored = await page.evaluate(
    (d) => JSON.parse(localStorage.getItem('archives_daily_progress') || '{}')[d],
    DATE,
  );
  // Not `true`. A 0-star day is a real result and the mobile app expects a
  // number here.
  expect(stored.questions).toBe(0);
});

test('shows the streak once a day', async ({ page }) => {
  // Clear the gate, then set it explicitly, so this test states its own
  // precondition rather than depending on mockAuth happening to seed it.
  await allowStreak(page);
  await page.addInitScript(() => {
    const d = new Date();
    const key = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-');
    localStorage.setItem('archives_streak_shown_date', key);
  });

  await page.goto(`/#/daily/play/${DATE}`);
  await gotoQuestions(page);
  await answerAll(page, true);

  await page.locator('.qres__cta').click();
  await page.locator('.dsend__cta').click();
  // Already seen today, so it is skipped and the flow ends here.
  await expect(page.locator('#cel-root')).toHaveCount(0);
  await expect(page.locator('.streak')).toHaveCount(0);
});

test('navigating away mid-celebration tears it down', async ({ page }) => {
  await page.goto(`/#/daily/play/${DATE}`);
  await gotoQuestions(page);
  await answerAll(page, true);
  await expect(page.locator('.qres')).toBeVisible();

  // The celebration is mounted on document.body, not inside #app, so the
  // router emptying #app does not remove it - the view's cleanup closure has
  // to. If that ever regresses, the celebration sits over the next page with
  // its audio still playing.
  await page.evaluate(() => { window.location.hash = '/daily'; });
  await expect(page.locator('#cel-root')).toHaveCount(0);

  const playing = await page.evaluate(() =>
    Array.from(document.querySelectorAll('audio')).filter((a) => !a.paused).length,
  );
  expect(playing, 'audio still playing after leaving').toBe(0);
});

test('a late entitlement result does not wipe the celebration', async ({ page }) => {
  // RevenueCat answers a second or two after first paint, and the app
  // re-renders the current route when it does. That re-render runs the view's
  // cleanup, and the celebration is mounted on document.body by that view -
  // so it used to be destroyed mid-animation, dropping the user back into the
  // story having seen no result. The same would happen on Restore.
  await page.goto(`/#/daily/play/${DATE}`);
  await gotoQuestions(page);
  await answerAll(page, true);
  await expect(page.locator('.qres')).toBeVisible();

  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent('archives:premium-changed', { detail: { premium: true } }),
    ),
  );

  await expect(page.locator('#cel-root')).toHaveCount(1);
  await expect(page.locator('.qres__headline')).toHaveText('AMAZING JOB!');
});

test('skips the streak when there is nothing to celebrate', async ({ page }) => {
  // Finishing a story that is not today's leaves the streak at 0, because the
  // count runs back from today. Real users reach this: past days are
  // replayable from the archive, and content is published ahead of time.
  //
  // Two things have to hold. The screen must not appear reading "0 Day
  // Streak!" over "Every journey starts with a single day" - the old code hid
  // that by clamping the number up to 1, which showed people a streak they did
  // not have. And skipping it must not spend the day's allowance, or finishing
  // a past story in the morning would silently suppress the real streak when
  // they came back for today's.
  const future = new Date();
  future.setDate(future.getDate() + 3);
  const FUTURE = [
    future.getFullYear(),
    String(future.getMonth() + 1).padStart(2, '0'),
    String(future.getDate()).padStart(2, '0'),
  ].join('-');

  await allowStreak(page);
  await page.route('**/api/daily/**', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...STORY, date: FUTURE }),
    }),
  );
  await page.route('**/api/daily*', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ date: FUTURE }]),
    }),
  );

  await page.goto(`/#/daily/play/${FUTURE}`);
  await gotoQuestions(page);
  await answerAll(page, true);

  await page.locator('.qres__cta').click();
  await page.locator('.dsend__cta').click();

  await expect(page.locator('.streak')).toHaveCount(0);
  await expect(page.locator('#cel-root')).toHaveCount(0);
  // The allowance is untouched, so today's story still gets its streak.
  expect(
    await page.evaluate(() => localStorage.getItem('archives_streak_shown_date')),
  ).toBeNull();
});
