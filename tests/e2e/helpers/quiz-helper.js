/**
 * Answer all quiz questions by clicking through them.
 * Handles the streak celebration modal that may appear after the last question.
 * Returns when the score screen is visible.
 */
export async function completeQuiz(page) {
  await page.waitForSelector('.quiz__answer', { timeout: 15000 });

  let safetyCounter = 0;
  while (safetyCounter < 15) {
    safetyCounter++;

    // Check if score screen appeared
    if (await page.locator('.quiz-score').count() > 0) return;

    // Check if streak celebration appeared — dismiss it
    const streakBtn = page.locator('#streak-continue');
    if (await streakBtn.count() > 0 && await streakBtn.isVisible()) {
      await streakBtn.click();
      // Wait for score screen after dismissal
      await page.waitForSelector('.quiz-score', { timeout: 10000 });
      return;
    }

    // Click an answer if available
    const answer = page.locator('.quiz__answer:not(.answered)').first();
    if (await answer.count() === 0) {
      // All answered but no Continue button yet — wait
      await page.waitForTimeout(500);
      continue;
    }
    await answer.click();

    // Wait for Continue button and click it
    try {
      await page.waitForSelector('.quiz__next', { timeout: 5000 });
      await page.locator('.quiz__next').click();
    } catch {
      // Might already be on score screen
      continue;
    }

    // Brief wait for next question, score screen, or celebration
    await page.waitForTimeout(300);
  }

  // Final check — might be on streak celebration
  const streakBtn = page.locator('#streak-continue');
  if (await streakBtn.count() > 0 && await streakBtn.isVisible()) {
    await streakBtn.click();
  }
  await page.waitForSelector('.quiz-score', { timeout: 10000 });
}
