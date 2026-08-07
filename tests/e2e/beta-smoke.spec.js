import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers/mock-auth.js';

// Does the deployed site actually work?
//
// The predecessor of this file checked the Expo beta and asserted its
// MaterialIcons/Ionicons fonts - it existed because the deploy script once
// reported six green ticks over a completely blank page, every HTTP response
// a 200. The Expo port is abandoned; beta now hosts the same vanilla app as
// production, which shows Clerk's sign-in to a signed-out visitor. So the
// smoke test signs in with the standard mock and asserts a signed-in render:
// routing, fonts, the content API and the rendering path in one selector.
//
// Run against whatever was just deployed:
//
//   BASE_URL=https://beta.archiveszone.app npx playwright test tests/e2e/beta-smoke.spec.js

const BASE = process.env.BASE_URL || 'https://beta.archiveszone.app';

test('the app renders, with fonts and no console errors', async ({ page }) => {
  // The CTA below waits out cold serverless functions; the suite default of
  // 30s is shorter than that wait, which turns a slow cold start into a
  // misleading "Test timeout" halfway through.
  test.setTimeout(150000);

  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)));

  // Anything served as text/html that should not be is the failure that
  // started this file: a missing asset silently answered with index.html.
  const htmlAssets = [];
  page.on('response', (r) => {
    const url = r.url();
    const type = r.headers()['content-type'] || '';
    if (/\.(ttf|otf|woff2?|js|png|jpg|riv|json)(\?|$)/.test(url) && type.includes('text/html')) {
      htmlAssets.push(url.replace(BASE, ''));
    }
  });

  await mockAuth(page);
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });

  // The section only exists once the app has mounted and today's story has
  // loaded, so it proves render, routing and the API in one assertion. Not
  // the CTA text: that reads START MY DAY or Continue depending on how much
  // of today the signed-in user has already done, and the mock user carries
  // whatever progress earlier test runs wrote for it.
  await page.waitForSelector('text=Today\'s Story', { timeout: 120000 });
  await page.waitForTimeout(2500);

  // Bounded is the celebration's display face, self-hosted via @font-face. If
  // it fails, the streak's 90px count-up reflows mid-animation - the kind of
  // break status codes cannot see.
  const bounded = await page.evaluate(() => document.fonts.check('90px Bounded'));
  expect(bounded, 'the Bounded font did not load').toBe(true);

  expect(htmlAssets, 'assets served as HTML - a missing file hit the SPA rewrite').toEqual([]);

  // Two error shapes are the mock's own exhaust, not the app's: ERR_FAILED is
  // mockAuth aborting the Clerk/Rive CDN scripts, and a 401 is a real endpoint
  // correctly refusing the mock's fake session token, which the app absorbs by
  // falling back to local data. Missing-asset failures are not lost to the
  // ERR_FAILED filter - they arrive as 404s here and are caught above as HTML
  // answers where a rewrite exists.
  const noise = /favicon|manifest|net::ERR_FAILED|status of 401/i;
  expect(errors.filter((e) => !noise.test(e))).toEqual([]);
});
