import { describe, it, expect, beforeEach, vi } from 'vitest';

// The identifier that actually exists in the RevenueCat project. The original
// bug was checking for 'premium', which no customer has ever had.
const REAL = 'Subscribers (monthly and Yearly combine)';

function customerInfo(active) {
  return { entitlements: { active: active, all: active } };
}

async function loadModule() {
  vi.resetModules();
  return await import('../revenuecat.js');
}

describe('hasActiveEntitlement', () => {
  it('recognises the project entitlement by its real identifier', async () => {
    const { hasActiveEntitlement, PREMIUM_ENTITLEMENT } = await loadModule();
    expect(PREMIUM_ENTITLEMENT).toBe(REAL);
    expect(hasActiveEntitlement(customerInfo({ [REAL]: { expirationDate: null } }))).toBe(true);
  });

  it('does not require the name to match, so a rename cannot un-premium everyone', async () => {
    const { hasActiveEntitlement } = await loadModule();
    expect(hasActiveEntitlement(customerInfo({ 'Renamed Later': {} }))).toBe(true);
  });

  it('is false with no active entitlements', async () => {
    const { hasActiveEntitlement } = await loadModule();
    expect(hasActiveEntitlement(customerInfo({}))).toBe(false);
  });

  it('is false for malformed or missing customer info', async () => {
    const { hasActiveEntitlement } = await loadModule();
    expect(hasActiveEntitlement(null)).toBe(false);
    expect(hasActiveEntitlement({})).toBe(false);
    expect(hasActiveEntitlement({ entitlements: {} })).toBe(false);
  });

  it('unwraps the { customerInfo } shape some SDK calls return', async () => {
    const { hasActiveEntitlement } = await loadModule();
    expect(hasActiveEntitlement({ customerInfo: customerInfo({ [REAL]: {} }) })).toBe(true);
  });
});

describe('activeExpiry', () => {
  it('returns the latest expiry across active entitlements', async () => {
    const { activeExpiry } = await loadModule();
    const info = customerInfo({
      a: { expirationDate: '2026-09-05T22:20:47Z' },
      b: { expirationDate: '2027-01-01T00:00:00Z' },
    });
    expect(activeExpiry(info)).toBe(new Date('2027-01-01T00:00:00Z').toISOString());
  });

  it('treats a missing expiry as lifetime', async () => {
    const { activeExpiry } = await loadModule();
    expect(activeExpiry(customerInfo({ a: { expirationDate: null } }))).toBeNull();
  });

  it('reads the REST field name too', async () => {
    const { activeExpiry } = await loadModule();
    const info = customerInfo({ a: { expires_date: '2026-09-05T22:20:47Z' } });
    expect(activeExpiry(info)).toBe(new Date('2026-09-05T22:20:47Z').toISOString());
  });
});

describe('readCache', () => {
  const USER = 'user_abc123';
  const KEY = 'archives_premium:' + USER;

  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips a stored status', async () => {
    const { readCache } = await loadModule();
    localStorage.setItem(KEY, JSON.stringify({ premium: true, expiresAt: '2099-01-01T00:00:00Z' }));
    expect(readCache(USER).premium).toBe(true);
  });

  it('ignores a premium status past its expiry', async () => {
    const { readCache } = await loadModule();
    localStorage.setItem(KEY, JSON.stringify({ premium: true, expiresAt: '2020-01-01T00:00:00Z' }));
    expect(readCache(USER)).toBeNull();
  });

  it('honours a lifetime status with no expiry', async () => {
    const { readCache } = await loadModule();
    localStorage.setItem(KEY, JSON.stringify({ premium: true, expiresAt: null }));
    expect(readCache(USER).premium).toBe(true);
  });

  it('survives corrupted JSON and missing entries', async () => {
    const { readCache } = await loadModule();
    localStorage.setItem(KEY, '{not json');
    expect(readCache(USER)).toBeNull();
    expect(readCache('user_nobody')).toBeNull();
    expect(readCache(null)).toBeNull();
  });
});

describe('initPurchases', () => {
  const USER = 'user_abc123';
  const KEY = 'archives_premium:' + USER;

  beforeEach(() => {
    localStorage.clear();
    delete window.__archivesPremium;
  });

  it('seeds premium from cache before anything awaits, so first paint is correct', async () => {
    const mod = await loadModule();
    localStorage.setItem(KEY, JSON.stringify({ premium: true, expiresAt: null }));

    // Deliberately not awaited: this is what app.js does immediately before
    // calling startRouter().
    mod.initPurchases(USER);
    expect(mod.isPremium()).toBe(true);
    expect(window.__archivesPremium).toBe(true);
  });

  it('does not downgrade a subscriber when both lookups fail', async () => {
    const mod = await loadModule();
    localStorage.setItem(KEY, JSON.stringify({ premium: true, expiresAt: null }));

    // No Clerk instance and no network in jsdom, so the SDK import and the
    // server check both fail. A failed request is not evidence of no purchase.
    await mod.initPurchases(USER);
    expect(mod.isPremium()).toBe(true);
  });

  it('starts free when there is no cached status', async () => {
    const mod = await loadModule();
    mod.initPurchases(USER);
    expect(mod.isPremium()).toBe(false);
  });
});

// The rule that a failed server check must never be read as "not a subscriber".
// Tested here rather than through initPurchases because the RevenueCat SDK
// import (an https: URL) always fails under vitest, so sdkAnswered can never be
// true there - which would make the regression invisible.
describe('decideStatus', () => {
  const PREMIUM = { premium: true };
  const FREE = { premium: false };

  it('leaves the status alone whenever the server check failed', async () => {
    const { decideStatus } = await loadModule();
    // The regression: the SDK said no (it only knows the Clerk id) and the
    // server - the only thing that checks the other ids - never answered.
    expect(decideStatus(true, null, true)).toBe('unknown');
    expect(decideStatus(false, null, true)).toBe('unknown');
  });

  it('trusts a definitive server answer either way', async () => {
    const { decideStatus } = await loadModule();
    expect(decideStatus(true, PREMIUM, false)).toBe('premium');
    expect(decideStatus(false, PREMIUM, false)).toBe('premium');
    expect(decideStatus(true, FREE, false)).toBe('free');
    expect(decideStatus(false, FREE, false)).toBe('free');
  });

  it('falls back to the SDK answer when the server was not reachable at all', async () => {
    const { decideStatus } = await loadModule();
    // No Clerk session to call the server with, but the SDK did answer.
    expect(decideStatus(true, null, false)).toBe('free');
    // Neither source answered - nothing was learned.
    expect(decideStatus(false, null, false)).toBe('unknown');
  });
});

// The RevenueCat SDK import (an https: URL) always fails under vitest, so these
// exercise the server path in isolation.
describe('server entitlement check', () => {
  const USER = 'user_abc123';
  const KEY = 'archives_premium:' + USER;

  async function loadWithSession(fetchImpl) {
    vi.resetModules();
    vi.doMock('../../auth.js', () => ({
      getClerk: () => ({ session: { getToken: () => Promise.resolve('tok') } }),
      sanitizeUrl: (u) => u,
    }));
    vi.stubGlobal('fetch', fetchImpl);
    return await import('../revenuecat.js');
  }

  beforeEach(() => {
    localStorage.clear();
    delete window.__archivesPremium;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.doUnmock('../../auth.js');
  });

  it('keeps a subscriber premium when the server is unavailable', async () => {
    localStorage.setItem(KEY, JSON.stringify({ premium: true, expiresAt: null }));
    const mod = await loadWithSession(async () => ({ ok: false, status: 502 }));

    await mod.initPurchases(USER);

    // A 502 means "we could not find out", not "you did not pay".
    expect(mod.isPremium()).toBe(true);
    expect(JSON.parse(localStorage.getItem(KEY)).premium).toBe(true);
  });

  it('keeps a subscriber premium when the request throws', async () => {
    localStorage.setItem(KEY, JSON.stringify({ premium: true, expiresAt: null }));
    const mod = await loadWithSession(async () => { throw new Error('offline'); });

    await mod.initPurchases(USER);
    expect(mod.isPremium()).toBe(true);
  });

  it('grants premium when the server finds a linked purchase', async () => {
    const mod = await loadWithSession(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ premium: true, expiresAt: '2099-01-01T00:00:00Z', linked: true }),
    }));

    await mod.initPurchases(USER);
    expect(mod.isPremium()).toBe(true);
    expect(window.__archivesPremium).toBe(true);
  });

  it('reports free when the server definitively finds nothing', async () => {
    const mod = await loadWithSession(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ premium: false, source: 'searched' }),
    }));

    await mod.initPurchases(USER);
    expect(mod.isPremium()).toBe(false);
  });

  it('restore sets the management url before announcing the status change', async () => {
    const seen = [];
    window.addEventListener('archives:premium-changed', function handler() {
      seen.push(window.__archivesManagementUrl);
      window.removeEventListener('archives:premium-changed', handler);
    });

    const mod = await loadWithSession(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        premium: true,
        expiresAt: null,
        managementUrl: 'https://apps.apple.com/account/subscriptions',
      }),
    }));

    await mod.restorePurchases();

    // The event re-renders the user menu, which reads the URL off window - so
    // the URL has to be in place before the event fires, or the menu rebuilds
    // without a "Manage subscription" link and nothing re-renders it again.
    expect(seen[0]).toBe('https://apps.apple.com/account/subscriptions');
  });
});
