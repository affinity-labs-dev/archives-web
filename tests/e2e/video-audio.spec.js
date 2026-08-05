import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers/mock-auth.js';
import { completeQuiz } from './helpers/quiz-helper.js';

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

test.describe('Score Screen Video', () => {
  test('celebration video renders on quiz completion', async ({ page }) => {
    await page.goto('/#/quiz/prophets_1/0');
    await completeQuiz(page);

    const video = page.locator('.quiz-score__video');
    await expect(video).toBeVisible();

    const hasAutoplay = await video.getAttribute('autoplay');
    const hasMuted = await video.getAttribute('muted');
    expect(hasAutoplay).not.toBeNull();
    expect(hasMuted).not.toBeNull();
  });

  test('celebration video source points to correct reward file', async ({ page }) => {
    await page.goto('/#/quiz/prophets_1/0');
    await completeQuiz(page);

    const src = await page.locator('.quiz-score__video source').getAttribute('src');
    expect(src).toMatch(/quiz-reward[123]\.mp4/);
  });

  test('celebration video actually starts playing', async ({ page }) => {
    await page.goto('/#/quiz/prophets_1/0');
    await completeQuiz(page);

    // Wait for the video to advance past 0 seconds (proves it actually plays)
    await page.waitForFunction(() => {
      const v = document.querySelector('.quiz-score__video');
      return v && v.currentTime > 0.1 && !v.paused;
    }, null, { timeout: 15000 });
  });

  test('celebration video has no decode or network errors', async ({ page }) => {
    await page.goto('/#/quiz/prophets_1/0');
    await completeQuiz(page);

    // Give video a moment to attempt playback
    await page.waitForTimeout(2000);

    const videoError = await page.evaluate(() => {
      const v = document.querySelector('.quiz-score__video');
      if (!v || !v.error) return null;
      return { code: v.error.code, message: v.error.message };
    });
    expect(videoError).toBeNull();
  });

  test('celebration video does not stall after starting', async ({ page }) => {
    await page.goto('/#/quiz/prophets_1/0');
    await completeQuiz(page);

    // Wait for playback to begin
    await page.waitForFunction(() => {
      const v = document.querySelector('.quiz-score__video');
      return v && v.currentTime > 0;
    }, null, { timeout: 15000 });

    // Record time, wait 2s, check it advanced
    const time1 = await page.evaluate(() => document.querySelector('.quiz-score__video').currentTime);
    await page.waitForTimeout(2000);
    const time2 = await page.evaluate(() => document.querySelector('.quiz-score__video').currentTime);

    expect(time2).toBeGreaterThan(time1);
  });
});

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
