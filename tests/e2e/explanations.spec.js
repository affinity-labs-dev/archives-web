import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers/mock-auth.js';
import { completeQuiz } from './helpers/quiz-helper.js';

// The explanations sheet, driven through a real quiz with /api/ai/explain
// answered at the network layer. The server-side half of the free-peek lock -
// that locked questions never enter the prompt - is pinned by the route's
// unit tests; what e2e adds is the client half: locked cards carry no real
// text for any CSS trick to reveal, and failure never costs authored content.

const AI_TEXTS = [
  'AI_DEEPER_ONE about the crossing.',
  'AI_DEEPER_TWO about the capital.',
  'AI_DEEPER_THREE about the fall.',
];

function respond(route, body) {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function openSheet(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/quiz/prophets_1/0');
  await completeQuiz(page);
  await page.click('[data-action="explain"]');
  await page.waitForSelector('.exp-sheet');
}

test.beforeEach(async ({ page }) => {
  await mockAuth(page);
});

test('the sheet is useful before the network answers', async ({ page }) => {
  // The endpoint never responds; everything on screen is client data.
  await page.route('**/api/ai/explain', () => { /* hold the request open */ });
  await openSheet(page);

  const sheet = page.locator('.exp-sheet');
  // Cards with verdict pips and the authored lesson text, at t=0.
  expect(await sheet.locator('.exp__card').count()).toBeGreaterThan(0);
  expect(await sheet.locator('.exp__pip').count()).toBeGreaterThan(0);
  await expect(sheet.locator('.exp__lesson').first()).toBeVisible();
  await expect(sheet.locator('.exp__deeper--loading').first()).toBeVisible();
});

test('full mode renders a deeper explanation per card and the ask pill', async ({ page }) => {
  await page.route('**/api/ai/explain', (route) =>
    respond(route, {
      explanations: AI_TEXTS.map((t) => ({ explanation: t })),
      mode: 'full',
      unlockedCount: 3,
      lockedCount: 0,
    }),
  );
  await openSheet(page);

  await expect(page.locator('.exp-sheet')).toContainText(AI_TEXTS[0]);
  await expect(page.locator('.exp-sheet')).toContainText(AI_TEXTS[2]);
  await expect(page.locator('#exp-ask')).toBeVisible();
  await expect(page.locator('.exp__promo')).toHaveCount(0);
});

test('preview mode locks all but the first card, with nothing to reveal', async ({ page }) => {
  await page.route('**/api/ai/explain', (route) =>
    respond(route, {
      explanations: [{ explanation: AI_TEXTS[0] }],
      mode: 'preview',
      unlockedCount: 1,
      lockedCount: 2,
    }),
  );
  await openSheet(page);

  const sheet = page.locator('.exp-sheet');
  await expect(sheet).toContainText(AI_TEXTS[0]);
  // The locked questions' AI text is nowhere in the DOM - the server never
  // sent it, and the client renders synthetic filler in its place.
  await expect(sheet).not.toContainText(AI_TEXTS[1]);
  await expect(sheet).not.toContainText(AI_TEXTS[2]);
  const locked = sheet.locator('.exp__deeper--locked');
  expect(await locked.count()).toBeGreaterThan(0);
  for (const el of await locked.all()) {
    expect((await el.textContent()).trim()).toBe('');
  }
  await expect(sheet.locator('.exp__promo')).toBeVisible();
});

test('a dead endpoint degrades the AI slots, never the authored cards', async ({ page }) => {
  await page.route('**/api/ai/explain', (route) => route.abort());
  await openSheet(page);

  const sheet = page.locator('.exp-sheet');
  await expect(sheet.locator('.exp__strip')).toBeVisible();
  // The lesson text survives the failure.
  await expect(sheet.locator('.exp__lesson').first()).toBeVisible();
  await expect(sheet.locator('#exp-retry')).toBeVisible();
});

test('closing the sheet returns to the celebration', async ({ page }) => {
  await page.route('**/api/ai/explain', (route) =>
    respond(route, {
      explanations: [{ explanation: AI_TEXTS[0] }],
      mode: 'preview',
      unlockedCount: 1,
      lockedCount: 2,
    }),
  );
  await openSheet(page);

  await page.click('#exp-close');
  await expect(page.locator('.exp-sheet')).toHaveCount(0);
  // The celebration is still there underneath, CTA intact.
  await expect(page.locator('.qres__cta')).toBeVisible();
});
