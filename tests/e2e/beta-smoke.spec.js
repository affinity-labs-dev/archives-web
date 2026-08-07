import { test, expect } from '@playwright/test';

// Does the deployed site actually work?
//
// scripts/deploy-beta.sh used to check status codes only, and reported six
// green ticks over a completely blank page: MaterialIcons 404ed into the SPA
// rewrite, so useFonts never resolved, `if (!loaded) return null` held, and the
// app rendered nothing. Every HTTP response was a 200.
//
// So the deploy gate asserts rendering, not reachability. Run against whatever
// was just deployed:
//
//   BASE_URL=https://beta.archiveszone.app npx playwright test tests/e2e/beta-smoke.spec.js

const BASE = process.env.BASE_URL || 'https://beta.archiveszone.app';

test('the app renders, with fonts and no console errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)));

  // Anything served as text/html that should not be is the failure that started
  // this: a missing asset silently answered with index.html.
  const htmlAssets = [];
  page.on('response', (r) => {
    const url = r.url();
    const type = r.headers()['content-type'] || '';
    if (/\.(ttf|otf|woff2?|js|png|jpg|riv|json)(\?|$)/.test(url) && type.includes('text/html')) {
      htmlAssets.push(url.replace(BASE, ''));
    }
  });

  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });

  // The CTA only exists once the app has mounted and today's story has loaded,
  // so it proves render, routing, fonts and the API in one assertion.
  await page.waitForSelector('text=START MY DAY', { timeout: 120000 });
  await page.waitForTimeout(2500);

  const iconFonts = await page.evaluate(() => {
    const seen = [];
    document.fonts.forEach((f) => seen.push(f.family));
    return [...new Set(seen)].filter((f) => /ionicons|material/i.test(f));
  });

  // Without these every icon renders as a black square.
  expect(iconFonts, 'icon fonts did not load').toEqual(
    expect.arrayContaining(['ionicons', 'material'])
  );
  expect(htmlAssets, 'assets served as HTML - a missing file hit the SPA rewrite').toEqual([]);
  expect(errors.filter((e) => !/favicon|manifest/i.test(e))).toEqual([]);
});
