import { describe, it, expect, vi, beforeEach } from 'vitest';

// The streak endpoint writes into gamification_data - the table 58k mobile
// users depend on - so the two things worth pinning are the ones that decide
// WHAT gets written: the user id must come from the token and never the body,
// and the date must be the caller's local day and not an arbitrary one.
//
// The date check is the abuse control. It is the only thing stopping a caller
// replaying the endpoint with tomorrow's date to walk a streak upwards.

const requireUser = vi.fn();
const restRequest = vi.fn();

vi.mock('../../_lib/auth.js', async () => {
  const actual = await vi.importActual('../../_lib/auth.js');
  return { ...actual, requireUser: (req) => requireUser(req) };
});

vi.mock('../../_lib/supabase.js', async () => {
  const actual = await vi.importActual('../../_lib/supabase.js');
  return { ...actual, restRequest: (args) => restRequest(args) };
});

const { default: route } = await import('../streak.js');

const USER = 'user_2abcDEF';

function makeRes() {
  const res = {
    statusCode: 0,
    headers: {},
    body: undefined,
    setHeader(k, v) {
      this.headers[k.toLowerCase()] = v;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    // http.js writes with res.status(n).send(json-string), so the body arrives
    // as text and the assertions parse it.
    send(body) {
      this.body = body;
      return this;
    },
  };
  return res;
}

/** The response body, parsed. */
const parsed = (res) => (typeof res.body === 'string' ? JSON.parse(res.body) : res.body);

/** Today, and days either side of it, as the client would send them. */
function dayOffset(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const ok = (streak) => ({ ok: true, json: async () => streak });

beforeEach(() => {
  requireUser.mockReset().mockResolvedValue(USER);
  restRequest.mockReset().mockResolvedValue(ok({ currentStreak: 4 }));
});

describe('POST /api/progress/streak', () => {
  it('advances the streak and hands back what the database returned', async () => {
    const res = makeRes();
    await route({ method: 'POST', headers: {}, body: { date: dayOffset(0) } }, res);

    expect(res.statusCode).toBe(200);
    expect(parsed(res)).toEqual({ streak: { currentStreak: 4 } });
    expect(restRequest).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'rpc/bump_streak', method: 'POST' }),
    );
  });

  it('takes the user id from the token, never from the body', async () => {
    // The function has no authorisation of its own - the id is just an
    // argument - so a body-supplied id would let anyone set anyone's streak.
    const res = makeRes();
    await route(
      { method: 'POST', headers: {}, body: { date: dayOffset(0), p_user_id: 'user_SOMEONE_ELSE' } },
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(restRequest.mock.calls[0][0].body.p_user_id).toBe(USER);
  });

  it('accepts a local date a day either side of UTC', async () => {
    // A streak is a local-calendar idea and timezones run UTC-12 to UTC+14, so
    // the caller's "today" can legitimately be the server's yesterday or
    // tomorrow.
    for (const offset of [-1, 0, 1]) {
      const res = makeRes();
      await route({ method: 'POST', headers: {}, body: { date: dayOffset(offset) } }, res);
      expect(res.statusCode, `offset ${offset}`).toBe(200);
    }
  });

  it('refuses a date further out than any timezone could explain', async () => {
    // Without this, replaying the endpoint with successive future dates walks
    // a streak up as fast as you can send requests.
    for (const offset of [2, 7, 400, -2, -400]) {
      const res = makeRes();
      await route({ method: 'POST', headers: {}, body: { date: dayOffset(offset) } }, res);
      expect(res.statusCode, `offset ${offset}`).toBe(400);
      expect(restRequest, `offset ${offset} reached the database`).not.toHaveBeenCalled();
    }
  });

  it('refuses anything that is not a plain YYYY-MM-DD', async () => {
    for (const date of [undefined, null, '', 'today', '2026-3-1', '2026-03-01T00:00:00Z', 12345, {}]) {
      const res = makeRes();
      await route({ method: 'POST', headers: {}, body: { date } }, res);
      expect(res.statusCode, JSON.stringify(date)).toBe(400);
    }
    expect(restRequest).not.toHaveBeenCalled();
  });

  it('rejects anything but POST', async () => {
    const res = makeRes();
    await route({ method: 'GET', headers: {}, body: {} }, res);
    expect(res.statusCode).toBe(405);
    expect(restRequest).not.toHaveBeenCalled();
  });

  it('surfaces a database failure as a 502 rather than a wrong streak', async () => {
    restRequest.mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'function bump_streak does not exist',
    });
    const res = makeRes();
    await route({ method: 'POST', headers: {}, body: { date: dayOffset(0) } }, res);

    // The client treats a failure as "no answer" and falls back to its cached
    // number; what it must never get is a 200 carrying nothing.
    expect(res.statusCode).toBe(502);
    expect(parsed(res)).not.toHaveProperty('streak');
  });
});
