import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers/mock-auth.js';

// The daily story shipped every content type through a whitelist that did not
// include the one the CMS actually uses. `content_type: "video"` matched no
// branch, so the watch step rendered an empty panel - no <video>, no error, no
// spinner. 77 of 184 published stories are that type, including every day of
// the current month, and it went unnoticed for weeks because the existing
// video suite only ever loaded adventure lessons, never a daily story.
//
// So these mock the payload rather than trusting today's content: the point is
// to pin the type handling, and a fixture makes the test fail on the day the
// whitelist regresses instead of on the day the CMS happens to publish a reel.

/** A daily story whose watch step is a single progressive mp4. */
function videoStory(overrides = {}) {
  return {
    date: '2026-08-06',
    content: {
      today_title: 'Bought as Boys',
      day_number: '1',
      card1: {
        content_type: 'video',
        media_url: 'https://d3dld7ughp8odz.cloudfront.net/February/day-1-bought-as-boys/final_video.mp4',
        bottom_content: { reading_text: '<p>A reading passage.</p>' },
        ...overrides,
      },
    },
  };
}

async function mockToday(page, story) {
  await page.route('**/api/daily/today**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(story),
    })
  );
}

test.describe('Daily story watch step', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page, { premium: true });
  });

  test('content_type "video" renders a player, not an empty panel', async ({ page }) => {
    await mockToday(page, videoStory());
    await page.goto('/#/daily/play');

    // The panel existing is not enough - that was true while the bug was live.
    // A <video> inside it is the thing that was missing.
    const video = page.locator('.ds__panel[data-step="0"] video');
    await expect(video).toHaveCount(1, { timeout: 15000 });
  });

  test('the mp4 actually loads frames', async ({ page }) => {
    // src being set proves nothing (see video-playback.spec.js) - decode does.
    await mockToday(page, videoStory());
    await page.goto('/#/daily/play');

    await page.waitForFunction(
      () => {
        const v = document.querySelector('.ds__panel[data-step="0"] video');
        return v && v.readyState >= 2;
      },
      null,
      { timeout: 25000 }
    );

    const state = await page.evaluate(() => {
      const v = document.querySelector('.ds__panel[data-step="0"] video');
      return { readyState: v.readyState, duration: v.duration, error: v.error?.code ?? null };
    });

    expect(state.error).toBeNull();
    expect(state.duration).toBeGreaterThan(0);
  });

  test('an unrecognised content type still renders a player', async ({ page }) => {
    // The general form of the bug. A type nobody has written a renderer for
    // should degrade to a playable video, not to a blank step.
    await mockToday(page, videoStory({ content_type: 'some_future_type' }));
    await page.goto('/#/daily/play');

    await expect(page.locator('.ds__panel[data-step="0"] video')).toHaveCount(1, { timeout: 15000 });
  });

  test('carousel types keep their own renderer', async ({ page }) => {
    // Guards the fix from overreaching: normalising must not swallow the two
    // types that do have dedicated renderers.
    await mockToday(
      page,
      videoStory({
        content_type: 'image_carousel',
        media_url: [
          'https://d3dld7ughp8odz.cloudfront.net/February/day-1-bought-as-boys/image_1.png',
          'https://d3dld7ughp8odz.cloudfront.net/February/day-1-bought-as-boys/image_2.png',
        ],
        bottom_content: { carousel_captions: ['One', 'Two'] },
      })
    );
    await page.goto('/#/daily/play');

    const panel = page.locator('.ds__panel[data-step="0"]');
    await expect(panel.locator('img')).not.toHaveCount(0, { timeout: 15000 });
    await expect(panel.locator('video')).toHaveCount(0);
  });
});
