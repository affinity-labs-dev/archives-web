import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers/mock-auth.js';

test.beforeEach(async ({ page }) => {
  await mockAuth(page);
});

test.describe('Video Playback', () => {
  test('lesson page renders a video element', async ({ page }) => {
    await page.goto('/#/lesson/prophets_1/0');
    await page.waitForSelector('.reel-player, .scrollable-view, video, .lesson-wrap', { state: 'attached', timeout: 15000 });

    // Check DOM for video (may not be visible on mobile if reading text is stacked below)
    const videoCount = await page.evaluate(() => document.querySelectorAll('video').length);
    expect(videoCount).toBeGreaterThan(0);
  });

  test('HLS video initializes and has a source', async ({ page }) => {
    await page.goto('/#/lesson/prophets_1/0');
    await page.waitForSelector('.reel-player, .scrollable-view, video, .lesson-wrap', { state: 'attached', timeout: 15000 });

    // Wait for video to be in the DOM (not necessarily visible)
    await page.waitForFunction(() => document.querySelector('video'), null, { timeout: 15000 });

    const hasSrc = await page.evaluate(() => {
      const v = document.querySelector('video');
      return !!(v && (v.src || v.querySelector('source') || v.dataset.hls));
    });
    expect(hasSrc).toBe(true);
  });

  test('no critical JavaScript errors on lesson page', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => {
      if (err.message.includes('RevenueCat') || err.message.includes('Clerk') ||
          err.message.includes('rive') || err.message.includes('net::ERR') ||
          err.message.includes('Failed to fetch')) return;
      errors.push(err.message);
    });

    await page.goto('/#/lesson/prophets_1/0');
    await page.waitForSelector('.reel-player, .scrollable-view, video, .lesson-wrap', { state: 'attached', timeout: 15000 });
    await page.waitForTimeout(3000);

    expect(errors).toEqual([]);
  });

  test('lesson video has no decode or network errors', async ({ page }) => {
    await page.goto('/#/lesson/prophets_1/0');
    await page.waitForFunction(() => document.querySelector('video'), null, { timeout: 15000 });

    // Give HLS time to initialize and attempt playback
    await page.waitForTimeout(3000);

    const videoError = await page.evaluate(() => {
      const v = document.querySelector('video');
      if (!v || !v.error) return null;
      return { code: v.error.code, message: v.error.message };
    });
    expect(videoError).toBeNull();
  });

  test('video has playsinline attribute (mobile compatibility)', async ({ page }) => {
    await page.goto('/#/lesson/prophets_1/0');
    await page.waitForFunction(() => document.querySelector('video'), null, { timeout: 15000 });

    const hasPlaysinline = await page.evaluate(() => {
      const v = document.querySelector('video');
      return v ? v.hasAttribute('playsinline') : false;
    });
    expect(hasPlaysinline).toBe(true);
  });
});

// The "Score Screen Video" block that was here is gone with the feature.
//
// The old score screen played one of three reward .mp4s full-bleed behind the
// result, and five tests covered it: that it rendered, pointed at the right
// file per score band, started, decoded without error, and did not stall.
//
// The celebration that replaced it has no video. Each tier is a Rive animation
// plus an audio cue, which fail in completely different ways - a Rive can load
// and draw a perfect still frame forever, which no video test would have
// caught. tests/e2e/celebration.spec.js covers that directly, including a
// canvas-over-time comparison and a CDN-failure fallback.
//
// The reward .mp4s under assets/videos/quiz_reward/ are now unreferenced.

test.describe('Audio', () => {
  test('Audio constructor is available for sound effects', async ({ page }) => {
    await page.goto('/#/');
    await page.waitForSelector('.era-card', { timeout: 15000 });
    const hasAudio = await page.evaluate(() => typeof Audio === 'function');
    expect(hasAudio).toBe(true);
  });

  test('sound effects files are referenced correctly', async ({ page }) => {
    const soundFiles = [
      'assets/audio/quiz/correct.wav',
      'assets/audio/quiz/incorrect.wav',
      'assets/audio/quiz/tap.wav',
    ];

    for (const file of soundFiles) {
      const response = await page.request.get(`http://localhost:8080/${file}`);
      expect(response.status()).toBe(200);
    }
  });
});
