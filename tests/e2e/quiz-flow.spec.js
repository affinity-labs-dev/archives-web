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

  test('completing all questions shows score screen', async ({ page }) => {
    await page.goto('/#/quiz/prophets_1/0');
    await completeQuiz(page);
    await expect(page.locator('.quiz-score')).toBeVisible();
  });

  test('score screen shows percentage, message, and action buttons', async ({ page }) => {
    await page.goto('/#/quiz/prophets_1/0');
    await completeQuiz(page);

    // Wait for score screen to fully render
    await page.waitForSelector('.quiz-score__percentage', { timeout: 10000 });

    // Percentage like "33%"
    const percentage = page.locator('.quiz-score__percentage');
    await expect(percentage).toBeVisible();
    const pctText = await percentage.textContent();
    expect(pctText).toMatch(/\d+%/);

    // Score like "1/3 correct"
    await expect(page.locator('.quiz-score__correct')).toBeVisible();

    // Result message
    const title = page.locator('.quiz-score__title');
    await expect(title).toBeVisible();
    const titleText = await title.textContent();
    expect(titleText).toMatch(/Brilliant|Got This/);

    // Action buttons
    await expect(page.locator('[data-action="retry"]')).toBeVisible();
    await expect(page.locator('[data-action="back"]')).toBeVisible();
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
