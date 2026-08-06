import { describe, it, expect, vi, beforeEach } from 'vitest';

// These used to assert on PostgREST URLs and the anon key. api.js now calls
// same-origin /api/* endpoints and holds no credential, so the tests assert the
// request paths instead - and, importantly, that nothing is ever sent with them.

function mockJson(payload, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(payload),
  });
}

/** api.js caches by path for 5 minutes, so each test needs a fresh module. */
async function freshApi() {
  vi.resetModules();
  return import('../api.js');
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('api module', () => {
  it('calls the backend, not Supabase', async () => {
    global.fetch = mockJson([{ era_id: 'prophets' }]);
    const api = await freshApi();
    await api.getAllEras();

    const url = global.fetch.mock.calls[0][0];
    expect(url).toBe('/api/eras');
    expect(url).not.toContain('supabase.co');
  });

  it('sends no credentials', async () => {
    global.fetch = mockJson([]);
    const api = await freshApi();
    await api.getAllEras();

    // A bare fetch(path): no apikey header, no Authorization, nothing to leak.
    const [, init] = global.fetch.mock.calls[0];
    expect(init).toBeUndefined();
  });

  it('builds each content path', async () => {
    global.fetch = mockJson([]);
    const api = await freshApi();

    await api.getAdventures('umayyad');
    await api.getAdventure('prophets_1');
    await api.getEra('prophets');
    await api.getDailyStory('2026-08-06');
    await api.getDailyStories();

    expect(global.fetch.mock.calls.map((c) => c[0])).toEqual([
      '/api/adventures?era=umayyad',
      '/api/adventures/prophets_1',
      '/api/eras/prophets',
      '/api/daily/2026-08-06',
      '/api/daily',
    ]);
  });

  it('sends the local date to /api/daily/today', async () => {
    global.fetch = mockJson(null);
    const api = await freshApi();
    await api.getTodayStory();

    // The functions run in UTC, so the server must be told the user's own day.
    expect(global.fetch.mock.calls[0][0]).toMatch(
      /^\/api\/daily\/today\?date=\d{4}-\d{2}-\d{2}$/
    );
  });

  it('encodes path parameters', async () => {
    global.fetch = mockJson(null);
    const api = await freshApi();
    await api.getAdventure('a b/c');
    expect(global.fetch.mock.calls[0][0]).toBe('/api/adventures/a%20b%2Fc');
  });

  it('passes the response through untouched', async () => {
    const rows = [{ readable_id: 'prophets_1' }];
    global.fetch = mockJson(rows);
    const api = await freshApi();
    await expect(api.getAdventures('prophets')).resolves.toEqual(rows);
  });

  it('returns null when the backend has no row', async () => {
    global.fetch = mockJson(null);
    const api = await freshApi();
    await expect(api.getAdventure('nope')).resolves.toBeNull();
    await expect(api.getEra('nope')).resolves.toBeNull();
  });

  it('throws on a non-OK response instead of returning empty data', async () => {
    // Silently returning [] would render as "this era has no adventures".
    global.fetch = mockJson(null, false, 502);
    const api = await freshApi();
    await expect(api.getAllEras()).rejects.toThrow('API error: 502');
  });

  it('caches by path for repeat calls', async () => {
    global.fetch = mockJson([]);
    const api = await freshApi();
    await api.getAllEras();
    await api.getAllEras();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('caches per path, not globally', async () => {
    global.fetch = mockJson([]);
    const api = await freshApi();
    await api.getEra('prophets');
    await api.getEra('umayyad');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
