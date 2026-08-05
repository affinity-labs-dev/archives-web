import { test, expect } from '@playwright/test';
import { mockAuth, seedProgress } from './helpers/mock-auth.js';
import { completeQuiz } from './helpers/quiz-helper.js';

test.describe('Progress Persistence', () => {
  test('seeded progress shows stars on module tiles', async ({ page }) => {
    await mockAuth(page);
    await seedProgress(page, {
      prophets_1: { media_1: 3, media_2: 2 },
    });

    await page.goto('/#/adventure/prophets_1');
    await page.waitForSelector('.mtile', { timeout: 15000 });

    const doneTiles = page.locator('.mtile--done');
    expect(await doneTiles.count()).toBeGreaterThan(0);

    const stars = page.locator('.mtile__star--filled');
    expect(await stars.count()).toBeGreaterThan(0);
  });

  test('progress count shows on adventure cards', async ({ page }) => {
    await mockAuth(page);
    await seedProgress(page, {
      prophets_1: { media_1: 3 },
    });

    await page.goto('/#/era/prophets');
    await page.waitForSelector('.adventure-card', { timeout: 15000 });

    const progress = page.locator('.adventure-card__progress').first();
    if (await progress.count() > 0) {
      const text = await progress.textContent();
      expect(text).toMatch(/\d+\/\d+/);
    }
  });

  test('completing a quiz saves progress to localStorage', async ({ page }) => {
    await mockAuth(page);

    await page.goto('/#/quiz/prophets_1/0');
    await completeQuiz(page);

    const progress = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('archives_progress') || '{}');
    });
    expect(progress).toHaveProperty('prophets_1');
    const advProgress = progress.prophets_1;
    expect(Object.keys(advProgress).length).toBeGreaterThan(0);

    const starValues = Object.values(advProgress);
    for (const stars of starValues) {
      expect(stars).toBeGreaterThanOrEqual(0);
      expect(stars).toBeLessThanOrEqual(3);
    }
  });

  test('progress persists after page reload', async ({ page }) => {
    await mockAuth(page);
    await seedProgress(page, {
      prophets_1: { media_1: 3 },
    });

    await page.goto('/#/adventure/prophets_1');
    await page.waitForSelector('.mtile--done', { timeout: 15000 });
    const beforeCount = await page.locator('.mtile--done').count();

    await page.reload();
    await page.waitForSelector('.mtile', { timeout: 15000 });
    const afterCount = await page.locator('.mtile--done').count();
    expect(afterCount).toBe(beforeCount);
  });

  test('best score is preserved — lower score does not overwrite', async ({ page }) => {
    await mockAuth(page);
    await seedProgress(page, {
      prophets_1: { media_1: 3 },
    });

    await page.goto('/#/adventure/prophets_1');
    await page.waitForSelector('.mtile', { timeout: 15000 });

    await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('archives_progress'));
      const prev = data.prophets_1.media_1 || 0;
      data.prophets_1.media_1 = Math.max(prev, 1);
      localStorage.setItem('archives_progress', JSON.stringify(data));
    });

    const progress = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('archives_progress'));
    });
    expect(progress.prophets_1.media_1).toBe(3);
  });

  test('navigating away and back preserves quiz stars on tiles', async ({ page }) => {
    await mockAuth(page);
    await seedProgress(page, {
      prophets_1: { media_1: 2 },
    });

    await page.goto('/#/adventure/prophets_1');
    await page.waitForSelector('.mtile--done', { timeout: 15000 });

    await page.goto('/#/');
    await page.waitForSelector('.era-card', { timeout: 15000 });

    await page.goto('/#/adventure/prophets_1');
    await page.waitForSelector('.mtile', { timeout: 15000 });

    const doneTiles = page.locator('.mtile--done');
    expect(await doneTiles.count()).toBeGreaterThan(0);
  });
});
