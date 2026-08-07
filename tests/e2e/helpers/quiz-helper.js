/**
 * Answer every quiz question, and return once the results screen is up.
 *
 * The screens after the last question changed shape: there used to be a
 * streak modal followed by a score screen, and there is now a results screen
 * followed (on the daily story) by the end screen and the streak. So this
 * waits for `.qres` rather than `.quiz-score`, and dismissing the celebration
 * is a separate step - most callers only care that the quiz finished and the
 * progress was written, which happens before any of it appears.
 */
export async function completeQuiz(page) {
  await page.waitForSelector('.quiz__answer', { timeout: 15000 });

  let safety = 0;
  while (safety < 15) {
    safety++;

    if (await page.locator('.qres').count() > 0) return;

    const answer = page.locator('.quiz__answer:not(.answered)').first();
    if (await answer.count() === 0) {
      // Answered, but the Continue button has not rendered yet.
      await page.waitForTimeout(500);
      continue;
    }
    await answer.click();

    try {
      await page.waitForSelector('.quiz__next', { timeout: 5000 });
      await page.locator('.quiz__next').click();
    } catch {
      continue;
    }

    await page.waitForTimeout(300);
  }

  await page.waitForSelector('.qres', { timeout: 15000 });
}

/**
 * Click through the celebration to whatever comes after it.
 *
 * Each screen's CONTINUE is its own element, and which screens appear depends
 * on the flow: adventures get results then streak, the daily story gets an end
 * screen between them, and the streak is skipped entirely if it has already
 * been shown today. So this clicks whatever is present rather than assuming a
 * fixed sequence.
 *
 * Buttons animate in on a delay - up to 8.67s on the 3/3 tier - so each wait
 * has to allow for the whole choreography. Tests that do not care about the
 * celebration should force reduced motion instead, which collapses it to zero:
 *   await page.emulateMedia({ reducedMotion: 'reduce' });
 */
export async function dismissCelebration(page) {
  const steps = ['.qres__cta', '.dsend__cta', '.streak__cta'];
  for (const sel of steps) {
    const btn = page.locator(sel);
    try {
      await btn.waitFor({ state: 'visible', timeout: 12000 });
    } catch {
      continue; // this screen is not part of the current flow
    }
    await btn.click();
    await page.waitForTimeout(600); // the 400ms crossfade, plus slack
  }
  await page.locator('#cel-root').waitFor({ state: 'detached', timeout: 15000 });
}
