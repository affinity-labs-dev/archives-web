import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers/mock-auth.js';

test.beforeEach(async ({ page }) => {
  await mockAuth(page);
});

test.describe('Navigation', () => {
  test('home page loads with era cards', async ({ page }) => {
    await page.goto('/#/');
    // Wait for the era grid to render (loading spinner disappears)
    await page.waitForSelector('.era-card', { timeout: 15000 });
    const cards = page.locator('.era-card');
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('home page shows the Archives logo', async ({ page }) => {
    await page.goto('/#/');
    await page.waitForSelector('.header__logo', { timeout: 10000 });
    const logo = page.locator('.header__logo img');
    await expect(logo).toBeVisible();
  });

  test('clicking an era card navigates to adventures list', async ({ page }) => {
    await page.goto('/#/');
    await page.waitForSelector('.era-card', { timeout: 15000 });
    // Click the first era card
    await page.locator('.era-card').first().click();
    // Should navigate to /era/:eraId
    await expect(page).toHaveURL(/#\/era\//);
    // Adventures grid should load
    await page.waitForSelector('.adventure-card', { timeout: 15000 });
    const adventureCards = page.locator('.adventure-card');
    expect(await adventureCards.count()).toBeGreaterThan(0);
  });

  test('clicking an adventure card navigates to adventure detail', async ({ page }) => {
    await page.goto('/#/era/prophets');
    await page.waitForSelector('.adventure-card', { timeout: 15000 });
    // Click first adventure
    await page.locator('.adventure-card').first().click();
    await expect(page).toHaveURL(/#\/adventure\//);
    // Module tiles should load
    await page.waitForSelector('.mtile', { timeout: 15000 });
    const tiles = page.locator('.mtile');
    expect(await tiles.count()).toBeGreaterThan(0);
  });

  test('clicking a module tile navigates to lesson', async ({ page }) => {
    await page.goto('/#/adventure/prophets_1');
    await page.waitForSelector('.mtile', { timeout: 15000 });
    // Click first module
    await page.locator('.mtile').first().click();
    await expect(page).toHaveURL(/#\/lesson\/prophets_1\/0/);
    // Lesson content should render — look for reel player, scrollable view, or video
    await page.waitForSelector('.reel-player, .scrollable-view, video, .lesson-wrap', { state: 'attached', timeout: 15000 });
  });

  test('back button navigates to previous route', async ({ page }) => {
    await page.goto('/#/adventure/prophets_1');
    await page.waitForSelector('.header__back', { timeout: 15000 });
    await page.locator('.header__back').click();
    // Should go back to era listing
    await expect(page).toHaveURL(/#\/era\//);
  });

  test('deep link to quiz route loads directly', async ({ page }) => {
    await page.goto('/#/quiz/prophets_1/0');
    // Should either show quiz or "No quiz available" — both mean routing worked
    await page.waitForSelector('.quiz-wrap, .error-msg', { timeout: 15000 });
  });

  test('deep link to lesson route loads directly', async ({ page }) => {
    await page.goto('/#/lesson/prophets_1/0');
    await page.waitForSelector('.reel-player, .scrollable-view, video, .lesson-wrap', { state: 'attached', timeout: 15000 });
  });

  test('breadcrumb links navigate correctly', async ({ page, viewport }) => {
    await page.goto('/#/adventure/prophets_1');
    await page.waitForSelector('.detail-wrap, .mtile', { timeout: 15000 });

    // Breadcrumbs may be hidden on small mobile viewports
    const bcLink = page.locator('.bc__link').first();
    if (await bcLink.isVisible().catch(() => false)) {
      await bcLink.click();
      await expect(page).toHaveURL(/#\//);
    } else {
      // On mobile, use the back button instead
      const backBtn = page.locator('.header__back');
      if (await backBtn.isVisible()) {
        await backBtn.click();
        await expect(page).toHaveURL(/#\/era\//);
      }
    }
  });

  test('daily story link navigates from home', async ({ page }) => {
    await page.goto('/#/');
    await page.waitForSelector('.home__daily', { timeout: 15000 });
    await page.locator('.home__daily').click();
    await expect(page).toHaveURL(/#\/daily/);
  });
});
