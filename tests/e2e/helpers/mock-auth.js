/**
 * Injects a fake Clerk object and blocks external CDN scripts
 * so the app thinks the user is signed in without real auth.
 *
 * Pass { premium: true } to sign in as a subscriber. That works by seeding the
 * entitlement cache the app reads synchronously at boot — the same path a real
 * returning subscriber takes — since the RevenueCat CDN is blocked in tests.
 */
export const TEST_USER_ID = 'test_user_123';

export async function mockAuth(page, options = {}) {
  const premium = options.premium === true;

  // Block the real Clerk CDN script from loading (would overwrite our mock)
  await page.route('**/clerk**', route => route.abort());
  // Block RevenueCat CDN imports (not needed for tests)
  await page.route('**/esm.sh/**', route => route.abort());
  // Block Rive CDN (not needed for tests)
  await page.route('**/rive-app**', route => route.abort());

  await page.addInitScript(({ userId, premium }) => {
    // Create a fake Clerk object before the real script loads
    window.Clerk = {
      load: () => Promise.resolve(),
      user: {
        id: userId,
        fullName: 'Test User',
        imageUrl: '',
        primaryEmailAddress: { emailAddress: 'test@example.com' },
      },
      session: { getToken: () => Promise.resolve('test-session-token') },
      addListener: () => () => {}, // returns unsubscribe fn
      signOut: () => {},
      mountSignIn: () => {},
    };

    // Deliberately NOT setting window.__archivesPremium here. Doing so used to
    // make the premium assertions pass even when the app never derived the
    // status itself, which hid a real bug: the user menu rendered "Free" for a
    // whole session. Seed only the cache and let the app do the rest.
    if (premium) {
      localStorage.setItem(
        'archives_premium:' + userId,
        JSON.stringify({ premium: true, expiresAt: null, checkedAt: new Date().toISOString() })
      );
    } else {
      localStorage.removeItem('archives_premium:' + userId);
    }

    // Suppress streak celebration modal so it doesn't block quiz score screen
    localStorage.setItem('archives_streak_shown_date', new Date().toISOString().split('T')[0]);
  }, { userId: TEST_USER_ID, premium });

  // By default the entitlement endpoint answers "no purchases found", so tests
  // never depend on the network or on a real Clerk token.
  if (!options.skipRestoreMock) {
    await mockRestoreEndpoint(page, { premium: false, source: 'searched', linked: false });
  }
}

/**
 * Stub the restore-entitlement Edge Function with a fixed response.
 */
export async function mockRestoreEndpoint(page, body) {
  await page.route('**/functions/v1/restore-entitlement', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(body),
    })
  );
}

/**
 * Seed localStorage with known progress data before the page loads.
 */
export async function seedProgress(page, progress) {
  await page.addInitScript((data) => {
    localStorage.setItem('archives_progress', JSON.stringify(data));
  }, progress);
}

/**
 * Seed daily progress.
 */
export async function seedDailyProgress(page, dailyProgress) {
  await page.addInitScript((data) => {
    localStorage.setItem('archives_daily_progress', JSON.stringify(data));
  }, dailyProgress);
}
