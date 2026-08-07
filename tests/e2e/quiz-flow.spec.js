import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers/mock-auth.js';
import { completeQuiz } from './helpers/quiz-helper.js';

test.beforeEach(async ({ page }) => {
  await mockAuth(page);
});

test.describe('Quiz Flow', () => {
  test('quiz loads with question text and answer buttons', async ({ page }) => {
    await page.goto('/#/quiz/prophets_1/0');
    await page.waitForSelector('.quiz__question', { timeout: 15000 });

    const question = page.locator('.quiz__question');
    await expect(question).toBeVisible();
    const text = await question.textContent();
    expect(text.length).toBeGreaterThan(0);

    const answers = page.locator('.quiz__answer');
    expect(await answers.count()).toBeGreaterThanOrEqual(2);
  });

  test('progress bar shows correct number of segments', async ({ page }) => {
    await page.goto('/#/quiz/prophets_1/0');
    await page.waitForSelector('.quiz__progress-bar', { timeout: 15000 });
    const bars = page.locator('.quiz__progress-bar');
    expect(await bars.count()).toBeGreaterThanOrEqual(1);
    await expect(bars.first()).toHaveClass(/active/);
  });

  test('selecting an answer shows visual feedback', async ({ page }) => {
    await page.goto('/#/quiz/prophets_1/0');
    await page.waitForSelector('.quiz__answer', { timeout: 15000 });

    await page.locator('.quiz__answer').first().click();

    await expect(page.locator('.quiz__answer.answered').first()).toBeVisible();

    const hasCorrect = await page.locator('.quiz__answer.correct').count();
    const hasWrong = await page.locator('.quiz__answer.wrong').count();
    expect(hasCorrect + hasWrong).toBeGreaterThan(0);
  });

  test('wrong answer reveals the correct answer', async ({ page }) => {
    await page.goto('/#/quiz/prophets_1/0');
    await page.waitForSelector('.quiz__answer', { timeout: 15000 });

    const answers = page.locator('.quiz__answer');
    const count = await answers.count();
    for (let i = 0; i < count; i++) {
      const isCorrect = await answers.nth(i).getAttribute('data-correct');
      if (isCorrect === 'false') {
        await answers.nth(i).click();
        break;
      }
    }

    await expect(page.locator('.quiz__answer.reveal-correct')).toBeVisible();
  });

  test('Continue button appears after answering', async ({ page }) => {
    await page.goto('/#/quiz/prophets_1/0');
    await page.waitForSelector('.quiz__answer', { timeout: 15000 });

    await page.locator('.quiz__answer').first().click();

    await expect(page.locator('.quiz__next')).toBeVisible();
    await expect(page.locator('.quiz__next')).toHaveText('Continue');
  });

  test('completing all questions shows the results screen', async ({ page }) => {
    await page.goto('/#/quiz/prophets_1/0');
    await completeQuiz(page);
    await expect(page.locator('.qres')).toBeVisible();
  });

  test('results screen shows the score, a tier message, and both pills', async ({ page }) => {
    // Reduced motion collapses the whole choreography to its end state, so
    // this asserts the finished screen without waiting out up to 8.7s of
    // entrance animation. tests/e2e/celebration.spec.js covers the timing.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#/quiz/prophets_1/0');
    await completeQuiz(page);

    await page.waitForSelector('.qres__pct', { timeout: 15000 });

    const pct = page.locator('.qres__pct');
    await expect(pct).toBeVisible();
    expect(await pct.textContent()).toMatch(/^\d+$/);

    await expect(page.locator('.qres__card-col--right .qres__card-label'))
      .toHaveText(/Correct: \d+\/\d+/);

    const headline = page.locator('.qres__headline');
    await expect(headline).toBeVisible();
    expect(await headline.textContent()).toMatch(/NICE EFFORT|GOT THIS|AMAZING JOB/);

    // Two actions and a CTA - Retake Quiz is gone, matching the app.
    await expect(page.locator('[data-action="explain"]')).toBeVisible();
    await expect(page.locator('[data-action="chat"]')).toBeVisible();
    await expect(page.locator('.qres__cta')).toBeVisible();
  });

  test('double-clicking an answer does not register twice', async ({ page }) => {
    await page.goto('/#/quiz/prophets_1/0');
    await page.waitForSelector('.quiz__answer', { timeout: 15000 });

    const firstAnswer = page.locator('.quiz__answer').first();
    await firstAnswer.click();
    // Use force:true for second click since the element may have pointer-events blocked
    await firstAnswer.click({ force: true });

    const nextButtons = page.locator('.quiz__next');
    expect(await nextButtons.count()).toBe(1);
  });
});
