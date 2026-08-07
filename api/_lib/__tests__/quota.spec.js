import { describe, it, expect, vi, beforeEach } from 'vitest';

const restRequest = vi.fn();
vi.mock('../supabase.js', async () => {
  const actual = await vi.importActual('../supabase.js');
  return { ...actual, restRequest: (args) => restRequest(args) };
});

const { consumeQuota, currentMonth, FREE_EXPLAIN_PER_MONTH } = await import('../quota.js');

// The two properties worth pinning: the increment is a single RPC call (the
// atomicity lives in Postgres, so the JS must not read-then-write), and a
// Supabase outage fails OPEN - metering must never become the outage.

const ok = (body) => ({ ok: true, json: async () => body });

beforeEach(() => {
  restRequest.mockReset();
});

describe('consumeQuota', () => {
  it('spends one unit through the atomic RPC and reports the verdict', async () => {
    restRequest.mockResolvedValue(ok({ allowed: true, used: 3 }));
    const out = await consumeQuota({ userId: 'user_1', feature: 'explain', limit: 10 });

    expect(out).toEqual({ allowed: true, used: 3 });
    expect(restRequest).toHaveBeenCalledTimes(1);
    expect(restRequest.mock.calls[0][0]).toMatchObject({
      path: 'rpc/consume_ai_quota',
      method: 'POST',
      body: {
        p_user_id: 'user_1',
        p_feature: 'explain',
        p_month: currentMonth(),
        p_limit: 10,
      },
    });
  });

  it('reports an exhausted allowance', async () => {
    restRequest.mockResolvedValue(ok({ allowed: false, used: 10 }));
    const out = await consumeQuota({ userId: 'user_1', feature: 'explain', limit: 10 });
    expect(out.allowed).toBe(false);
    expect(out.used).toBe(10);
  });

  it('unwraps a single-row array, which PostgREST returns for table-returning functions', async () => {
    restRequest.mockResolvedValue(ok([{ allowed: true, used: 1 }]));
    const out = await consumeQuota({ userId: 'user_1', feature: 'explain', limit: 10 });
    expect(out).toEqual({ allowed: true, used: 1 });
  });

  it('fails open when the RPC errors, is missing, or the network is down', async () => {
    // A cost control that becomes an availability outage is the wrong trade;
    // the route marks the response degraded instead of refusing the user.
    const failures = [
      { ok: false, status: 404, text: async () => 'function does not exist' },
      { ok: false, status: 500, text: async () => 'boom' },
    ];
    for (const failure of failures) {
      restRequest.mockResolvedValue(failure);
      expect(await consumeQuota({ userId: 'u', feature: 'explain', limit: 10 })).toEqual({
        allowed: true,
        used: null,
        degraded: true,
      });
    }

    restRequest.mockRejectedValue(new Error('ECONNREFUSED'));
    expect(await consumeQuota({ userId: 'u', feature: 'explain', limit: 10 })).toEqual({
      allowed: true,
      used: null,
      degraded: true,
    });
  });

  it('fails open on a malformed RPC result rather than guessing', async () => {
    restRequest.mockResolvedValue(ok({ something: 'else' }));
    const out = await consumeQuota({ userId: 'u', feature: 'explain', limit: 10 });
    expect(out.allowed).toBe(true);
    expect(out.degraded).toBe(true);
  });

  it('buckets by UTC month', () => {
    expect(currentMonth(new Date('2026-08-07T23:59:00Z'))).toBe('2026-08');
    expect(currentMonth(new Date('2026-12-31T23:59:59Z'))).toBe('2026-12');
  });

  it('exports the free explain allowance the route and client both cite', () => {
    expect(FREE_EXPLAIN_PER_MONTH).toBe(10);
  });
});
