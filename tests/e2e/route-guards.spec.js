import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers/mock-auth.js';

// Premium gating used to live only on the home-grid click handlers, so these
// three routes rendered premium content to anyone who typed the URL.
// rise_of_islam, umayyad and women_of_islam are the premium eras in Supabase.
const PREMIUM_ROUTES = [
  ['era', '#/era/umayyad'],
  ['adventure', '#/adventure/umayyad_adventure_1'],
  ['lesson', '#/lesson/umayyad_adventure_1/0'],
];

test.describe('Free user hitting premium routes directly', () => {
  for (const [name, route] of PREMIUM_ROUTES) {
    test(`${name} route is locked, not rendered`, async ({ page }) => {
      await mockAuth(page);
      await page.goto('/' + route);

      // The guard waits for the authoritative entitlement answer first.
      await expect(page.locator('.locked-state')).toBeVisible({ timeout: 20000 });
      await expect(page.locator('.locked-state__title')).toHaveText('Premium content');
    });
  }

  test('free eras are unaffected', async ({ page }) => {
    await mockAuth(page);
    await page.goto('/#/era/prophets');
    await page.waitForSelector('.adventure-card, .adventures', { timeout: 20000 });
    await expect(page.locator('.locked-state')).toHaveCount(0);
  });
});

test.describe('Subscriber hitting the same routes', () => {
  for (const [name, route] of PREMIUM_ROUTES) {
    test(`${name} route opens normally`, async ({ page }) => {
      await mockAuth(page, { premium: true });
      await page.goto('/' + route);
      await page.waitForTimeout(6000);
      // Never lock out someone who has actually paid.
      await expect(page.locator('.locked-state')).toHaveCount(0);
    });
  }
});
