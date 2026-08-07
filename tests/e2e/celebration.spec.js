import { test, expect } from '@playwright/test';

// The post-quiz celebration screens, driven through the harness at
// tests/fixtures/celebration-harness.html.
//
// The harness exists because these screens are long - the 3/3 tier holds 7.5
// seconds before the score card appears and 10 before the XP stars fly. Waiting
// that out per assertion would make the suite slow and flaky, so the harness
// builds each screen with its timeline PAUSED and exposes it. A test seeks to
// an exact instant and asserts what is on screen, deterministically.
//
// The one thing seeking cannot cover is Rive, which has its own clock. That is
// what the "actually animates" test at the bottom is for, and it is the most
// important test here - a Rive that loads and draws a perfect still frame
// passes every other check in this file.

const HARNESS = '/tests/fixtures/celebration-harness.html';

async function openScreen(page, query) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
  await page.goto(`${HARNESS}?${query}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 20000 });
  return errors;
}

const seek = (page, seconds) => page.evaluate((s) => window.__seek(s), seconds);

test.describe('quiz results', () => {
  test('picks the tier from the score', async ({ page }) => {
    // The three outcomes a daily story can produce.
    for (const [correct, headline] of [
      [1, 'NICE EFFORT!'],
      [2, "YOU'VE GOT THIS!"],
      [3, 'AMAZING JOB!'],
    ]) {
      await openScreen(page, `screen=results&correct=${correct}&total=3`);
      await seek(page, 20);
      await expect(page.locator('.qres__headline')).toHaveText(headline);
    }
  });

  test('holds everything back until its cue, then reveals in order', async ({ page }) => {
    // The 3/3 tier, whose 7.5s hold is the one most likely to be "optimised"
    // by someone who thinks the screen is broken.
    const errors = await openScreen(page, 'screen=results&correct=3&total=3');

    const card = page.locator('.qres__card-wrap');
    const headline = page.locator('.qres__headline');
    const cta = page.locator('.qres__cta');
    const opacity = (loc) =>
      loc.evaluate((el) => Number(getComputedStyle(el).opacity));

    // t=7.4s: the Rive is still playing alone. Nothing else exists yet.
    await seek(page, 7.4);
    expect(await opacity(card)).toBeLessThan(0.05);
    expect(await opacity(headline)).toBeLessThan(0.05);
    expect(await opacity(cta)).toBeLessThan(0.05);

    // t=8.6s: card and headline are in, the CTA is not (8.67s).
    await seek(page, 8.6);
    expect(await opacity(card)).toBeGreaterThan(0.9);
    expect(await opacity(headline)).toBeGreaterThan(0.9);
    expect(await opacity(cta)).toBeLessThan(0.05);

    // t=9.2s: everything is up.
    await seek(page, 9.2);
    expect(await opacity(cta)).toBeGreaterThan(0.9);

    expect(errors).toEqual([]);
  });

  test('counts the percentage up in step with the bar', async ({ page }) => {
    await openScreen(page, 'screen=results&correct=3&total=3');
    const pct = page.locator('.qres__pct');
    const fill = page.locator('.qres__fill');

    // The 3/3 bar runs 8.0s -> 9.9s, linear.
    await seek(page, 8.0);
    await expect(pct).toHaveText('0');

    // Mid-fill: the digits and the bar must agree. They are driven from one
    // tweened value precisely so they cannot drift apart.
    await seek(page, 8.95);
    const mid = Number(await pct.textContent());
    expect(mid).toBeGreaterThan(30);
    expect(mid).toBeLessThan(70);
    const width = await fill.evaluate((el) => parseFloat(el.style.width));
    expect(Math.abs(width - mid)).toBeLessThan(2);

    await seek(page, 10);
    await expect(pct).toHaveText('100');
    expect(await fill.evaluate((el) => parseFloat(el.style.width))).toBe(100);
  });

  test('shows XP as ten a question, and the real correct count', async ({ page }) => {
    await openScreen(page, 'screen=results&correct=2&total=3');
    await seek(page, 20);
    await expect(page.locator('.qres__xp')).toHaveText('20 XP');
    await expect(page.locator('.qres__card-col--right .qres__card-label')).toHaveText(
      'Correct: 2/3',
    );
  });

  test('a zero score is a real result, not a missing one', async ({ page }) => {
    // 0/3 must render the low tier with an honest 0%, not an empty card.
    await openScreen(page, 'screen=results&correct=0&total=3');
    await seek(page, 20);
    await expect(page.locator('.qres__headline')).toHaveText('NICE EFFORT!');
    await expect(page.locator('.qres__pct')).toHaveText('0');
    await expect(page.locator('.qres__xp')).toHaveText('0 XP');
  });

  test('both pills and the CTA report back', async ({ page }) => {
    await openScreen(page, 'screen=results&correct=3&total=3');
    await seek(page, 20);

    await page.locator('[data-action="explain"]').click();
    expect(await page.evaluate(() => window.__lastAction)).toBe('explain');

    await page.locator('[data-action="chat"]').click();
    expect(await page.evaluate(() => window.__lastAction)).toBe('chat');

    await page.locator('.qres__cta').click();
    expect(await page.evaluate(() => window.__lastAction)).toBe('continue');
  });
});

test.describe('daily story end', () => {
  test('names today, or the day being replayed', async ({ page }) => {
    await openScreen(page, 'screen=dailyend');
    await seek(page, 20);
    await expect(page.locator('.dsend__headline')).toContainText("TODAY'S STORY");

    await openScreen(page, 'screen=dailyend&date=2024-03-09');
    await seek(page, 20);
    // A past date is named rather than called "today". Parsed as local parts,
    // so it cannot slip a day for anyone west of Greenwich.
    await expect(page.locator('.dsend__headline')).toContainText("9 MAR'S STORY");
  });

  test('holds the headline until the Ibu has landed', async ({ page }) => {
    await openScreen(page, 'screen=dailyend');
    const headline = page.locator('.dsend__headline');
    const opacity = () => headline.evaluate((el) => Number(getComputedStyle(el).opacity));

    await seek(page, 1.5);
    expect(await opacity()).toBeLessThan(0.05);
    await seek(page, 2.7);
    expect(await opacity()).toBeGreaterThan(0.9);
  });
});

test.describe('streak', () => {
  test('counts up from zero to the real streak', async ({ page }) => {
    await openScreen(page, 'screen=streak&streak=12');
    const count = page.locator('.streak__count');

    // The count-up runs 750ms->1550ms after a 1750ms gate, so 2.5s-3.3s.
    await seek(page, 2.5);
    await expect(count).toHaveText('0');

    await seek(page, 2.9);
    const mid = Number(await count.textContent());
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(12);

    await seek(page, 4);
    await expect(count).toHaveText('12');
  });

  test('renders each day of the week in its own state', async ({ page }) => {
    const week = JSON.stringify([
      { day: 'M', status: 'complete' },
      { day: 'T', status: 'complete' },
      { day: 'W', status: 'missed' },
      { day: 'T', status: 'complete' },
      { day: 'F', status: 'today' },
      { day: 'S', status: 'future' },
      { day: 'S', status: 'future' },
    ]);
    await openScreen(page, `screen=streak&streak=4&week=${encodeURIComponent(week)}`);
    await seek(page, 20);

    await expect(page.locator('.streak__day')).toHaveCount(7);
    await expect(page.locator('.streak__day--done')).toHaveCount(3);
    await expect(page.locator('.streak__day--today')).toHaveCount(1);
    await expect(page.locator('.streak__day--missed')).toHaveCount(1);
    await expect(page.locator('.streak__day--pending')).toHaveCount(2);
  });

  test('changes its message with the streak', async ({ page }) => {
    await openScreen(page, 'screen=streak&streak=1');
    await seek(page, 20);
    const first = await page.locator('.streak__message').textContent();

    await openScreen(page, 'screen=streak&streak=30');
    await seek(page, 20);
    expect(await page.locator('.streak__message').textContent()).not.toBe(first);
  });
});

test.describe('robustness', () => {
  test('the Rive animations actually move', async ({ page }) => {
    // THE test in this file.
    //
    // Given neither a state machine nor an animation name, the web Rive
    // runtime plays the first timeline rather than the default state machine -
    // so a file can load, draw a flawless frame, and never move again. Every
    // other assertion here passes in that state. Only comparing the canvas
    // with itself over time catches it.
    await openScreen(page, 'screen=results&correct=2&total=3');
    await page.evaluate(() => window.__play());

    const sample = () =>
      page.evaluate(() => {
        const c = document.querySelector('.qres__mascot-canvas');
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        let sum = 0;
        for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] + d[i + 2] + d[i + 3];
        return sum;
      });

    await page.waitForTimeout(400);
    const a = await sample();
    await page.waitForTimeout(600);
    const b = await sample();

    expect(a, 'mascot canvas is blank - the .riv did not load').not.toBe(0);
    expect(b, 'mascot canvas never changed - it is drawn but frozen').not.toBe(a);
  });

  test('survives Rive failing to load', async ({ page }) => {
    // A CDN outage must degrade to a readable screen, not a black rectangle.
    await page.route('**/@rive-app/**', (r) => r.abort());
    await page.goto(`${HARNESS}?screen=results&correct=3&total=3`);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 20000 });
    await seek(page, 20);

    await expect(page.locator('.qres__headline')).toHaveText('AMAZING JOB!');
    await expect(page.locator('.qres__pct')).toHaveText('100');
    await expect(page.locator('.qres__cta')).toBeVisible();
    // The fallback colour behind the missing Rive, so text still has a surface.
    await expect(page.locator('.qres')).toHaveCSS('background-color', 'rgb(250, 250, 250)');
  });

  test('reduced motion lands on the finished screen immediately', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openScreen(page, 'screen=results&correct=3&total=3');
    await page.evaluate(() => window.__play());
    // No seeking and no waiting: with every duration collapsed to zero, the
    // whole 10s choreography should already be at its end state.
    await expect(page.locator('.qres__pct')).toHaveText('100');
    await expect(page.locator('.qres__cta')).toHaveCSS('opacity', '1');
    await expect(page.locator('.qres__headline')).toHaveCSS('opacity', '1');
  });
});
