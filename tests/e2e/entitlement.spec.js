import { test, expect } from '@playwright/test';
import { mockAuth, mockRestoreEndpoint } from './helpers/mock-auth.js';

// Locates a premium era card on the home grid. Three eras are marked premium
// in Supabase (rise_of_islam, umayyad, women_of_islam).
function premiumCard(page) {
  return page.locator('.era-card:has(.era-card__badge--premium)').first();
}

// The status pill lives inside the avatar dropdown, which is closed by default.
async function openUserMenu(page) {
  await page.locator('.user-menu__trigger').click();
  await expect(page.locator('.user-menu__dropdown--open')).toBeVisible();
}

test.describe('Free user', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
  });

  test('sees the Free pill in the user menu', async ({ page }) => {
    await page.goto('/#/');
    await page.waitForSelector('.era-card', { timeout: 15000 });
    await openUserMenu(page);
    await expect(page.locator('.user-menu__status--free')).toBeVisible();
    await expect(page.locator('.user-menu__status--premium')).toHaveCount(0);
  });

  test('gets the paywall when opening a premium era', async ({ page }) => {
    await page.goto('/#/');
    await page.waitForSelector('.era-card', { timeout: 15000 });

    await premiumCard(page).click();
    await expect(page.locator('.paywall-overlay')).toBeVisible();
    await expect(page).not.toHaveURL(/#\/era\//);
  });

  test('restore reports nothing found when there is no purchase', async ({ page }) => {
    await page.goto('/#/');
    await page.waitForSelector('.era-card', { timeout: 15000 });

    await premiumCard(page).click();
    await page.waitForSelector('.paywall-overlay');

    await page.locator('#pw-restore').click();
    await expect(page.locator('#pw-restore')).toHaveText('No purchases found');
    await expect(page.locator('.paywall-overlay')).toBeVisible();
  });
});

test.describe('Subscriber', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, { premium: true });
  });

  test('sees the Premium pill and no Upgrade button', async ({ page }) => {
    await page.goto('/#/');
    await page.waitForSelector('.era-card', { timeout: 15000 });
    await openUserMenu(page);
    await expect(page.locator('.user-menu__status--premium')).toBeVisible();
    await expect(page.locator('.user-menu__upgrade')).toHaveCount(0);
  });

  test('opens a premium era without hitting the paywall, on first paint', async ({ page }) => {
    await page.goto('/#/');
    await page.waitForSelector('.era-card', { timeout: 15000 });

    // No reload, no waiting for a late entitlement callback - the very first
    // render must already treat this user as a subscriber.
    await premiumCard(page).click();
    await expect(page).toHaveURL(/#\/era\//);
    await expect(page.locator('.paywall-overlay')).toHaveCount(0);
  });
});

test.describe('Restore', () => {
  test('unlocks in place when the server finds a linked purchase', async ({ page }) => {
    await mockAuth(page);
    await page.goto('/#/');
    await page.waitForSelector('.era-card', { timeout: 15000 });

    await premiumCard(page).click();
    await page.waitForSelector('.paywall-overlay');

    // The user bought through the onboarding funnel under an anonymous id;
    // the function finds it by email and aliases it onto their Clerk id.
    await mockRestoreEndpoint(page, {
      premium: true,
      entitlement: 'Subscribers (monthly and Yearly combine)',
      expiresAt: '2099-01-01T00:00:00Z',
      store: 'rc_billing',
      source: 'anonymous_id',
      linked: true,
    });

    await page.locator('#pw-restore').click();

    await expect(page.locator('.paywall-overlay')).toHaveCount(0, { timeout: 10000 });
    await expect(page).toHaveURL(/#\/era\//);
    await openUserMenu(page);
    await expect(page.locator('.user-menu__status--premium')).toBeVisible();
  });
});
