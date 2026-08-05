import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers/mock-auth.js';

// These exist because the original video suite passed for months while every
// Al-Andalus and daily-story video was unplayable in the browser.
//
// It missed the bug three ways, all worth remembering:
//   1. Every test pointed at prophets_1 - the one CDN that was configured
//      correctly. The broken eras were never loaded.
//   2. Asserting `video.src` proves nothing: hls.js attaches an MSE blob URL
//      to the element before it ever fetches the manifest, so the assertion
//      passes whether or not any media arrives.
//   3. `video.error` stays null on an hls.js failure - hls.js reports on its
//      own event bus - and the "no JS errors" test explicitly filtered out
//      "Failed to fetch" and "net::ERR", which is exactly what a CORS-blocked
//      manifest looks like.
//
// So: assert that media actually loaded, and cover more than one CDN.

// One reel per CDN the app serves video from.
const REELS = [
  { name: 'prophets (d1bcceam8ucosn)', route: '#/lesson/prophets_1/0' },
  { name: 'al-andalus (d8kbkcbgr0qv4)', route: '#/lesson/al_andalus_1_1/0' },
];

test.describe('Reel playback', () => {
  test.beforeEach(async ({ page }) => {
    // Premium: Al-Andalus is a gated era and would otherwise hit the paywall.
    await mockAuth(page, { premium: true });
  });

  for (const reel of REELS) {
    test(`${reel.name} loads actual media, not just a video element`, async ({ page }) => {
      // Watch the wire rather than patching window.Hls: wrapping the class
      // drops its non-enumerable statics (isSupported), which breaks the very
      // code under test.
      const mediaFailures = [];
      page.on('requestfailed', (req) => {
        const url = req.url();
        if (/\.(m3u8|ts|mp4|m4s)(\?|$)/.test(url)) {
          mediaFailures.push(`${req.failure()?.errorText} ${url}`);
        }
      });
      page.on('response', (res) => {
        const url = res.url();
        if (/\.(m3u8|ts|mp4|m4s)(\?|$)/.test(url) && res.status() >= 400) {
          mediaFailures.push(`HTTP ${res.status()} ${url}`);
        }
      });

      await page.goto('/' + reel.route);
      await page.waitForFunction(() => document.querySelector('video'), null, { timeout: 20000 });

      // readyState >= 2 (HAVE_CURRENT_DATA) means real decoded frames arrived.
      // A blocked manifest never gets past 0.
      await page.waitForFunction(
        () => {
          const v = document.querySelector('video');
          return v && v.readyState >= 2;
        },
        null,
        { timeout: 25000 }
      );

      const state = await page.evaluate(() => {
        const v = document.querySelector('video');
        return {
          readyState: v.readyState,
          duration: v.duration,
          error: v.error ? v.error.code : null,
        };
      });

      expect(mediaFailures).toEqual([]);
      expect(state.error).toBeNull();
      expect(state.readyState).toBeGreaterThanOrEqual(2);
      expect(state.duration).toBeGreaterThan(0);
    });
  }
});

test.describe('Video CDN reachability', () => {
  // Cheap guard against the underlying cause: a CDN that serves the bytes but
  // omits Access-Control-Allow-Origin, which only fails inside a browser.
  const MANIFESTS = [
    'https://d1bcceam8ucosn.cloudfront.net/prophets/era1-recap/hls/reel.m3u8',
    'https://d8kbkcbgr0qv4.cloudfront.net/al-andalus/e1-1-1-tariqs-leap/hls/reel.m3u8',
    'https://d3dld7ughp8odz.cloudfront.net/February/day-10-the-master-dies-the-canon-lives/hls/final_video.m3u8',
  ];

  for (const url of MANIFESTS) {
    const host = new URL(url).host;
    test(`${host} serves CORS headers`, async ({ page }) => {
      await mockAuth(page);
      await page.goto('/#/');

      const result = await page.evaluate(async (target) => {
        try {
          const res = await fetch(target);
          const body = await res.text();
          return { ok: res.ok, manifest: body.startsWith('#EXTM3U') };
        } catch (err) {
          return { ok: false, blocked: err.message };
        }
      }, url);

      expect(result.blocked).toBeUndefined();
      expect(result.ok).toBe(true);
      expect(result.manifest).toBe(true);
    });
  }
});
