import { describe, it, expect, vi, beforeEach } from 'vitest';

// The route's own logic - path stripping, header forwarding, status passthrough,
// the RPC wrapper - is not covered by the policy tests, and it is where a
// mistake would be silent: forwarding the wrong Accept header does not throw,
// it just makes `.single()` stop returning PGRST116 and the mobile modules take
// the wrong branch.

const requireUser = vi.fn();
const restRequest = vi.fn();

vi.mock('../auth.js', async () => {
  const actual = await vi.importActual('../auth.js');
  return { ...actual, requireUser: (req) => requireUser(req) };
});

vi.mock('../supabase.js', async () => {
  const actual = await vi.importActual('../supabase.js');
  return { ...actual, restRequest: (args) => restRequest(args) };
});

const { default: route } = await import('../../db/[...path].js');

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
    send(body) {
      this.body = body;
      return this;
    },
  };
  return res;
}

function makeReq({ method = 'GET', path = [], url = '/api/db', headers = {}, body } = {}) {
  return { method, url, headers: { authorization: 'Bearer tok', ...headers }, query: { path }, body };
}

/** A PostgREST-shaped response. */
function upstream({ status = 200, body = '[]', headers = {} } = {}) {
  return {
    status,
    ok: status < 400,
    headers: new Headers({ 'content-type': 'application/json', ...headers }),
    text: async () => body,
    json: async () => JSON.parse(body),
  };
}

beforeEach(() => {
  requireUser.mockReset().mockResolvedValue(USER);
  restRequest.mockReset().mockResolvedValue(upstream());
});

describe('authentication', () => {
  it('refuses a scoped table without a token, without touching the database', async () => {
    requireUser.mockRejectedValue(new Error('no token'));
    const res = makeRes();
    await route(makeReq({ path: ['rest', 'v1', 'gamification_data'] }), res);

    expect(res.statusCode).toBe(401);
    expect(restRequest).not.toHaveBeenCalled();
  });

  it('serves public content without a token', async () => {
    // Content loads before anyone signs in - the providers do it at startup,
    // as mobile does with the anon key. Refusing it broke app boot.
    requireUser.mockRejectedValue(new Error('no token'));
    const res = makeRes();
    await route(makeReq({ path: ['rest', 'v1', 'eras'] }), res);

    expect(res.statusCode).toBe(200);
    expect(restRequest).toHaveBeenCalled();
    expect(restRequest.mock.calls[0][0].search.has('user_id')).toBe(false);
  });

  it('treats an invalid token as no token rather than as an error', async () => {
    // A stale session should degrade to signed-out, not break content loading.
    requireUser.mockRejectedValue(new Error('expired'));
    const res = makeRes();
    await route(makeReq({ path: ['rest', 'v1', 'content'] }), res);
    expect(res.statusCode).toBe(200);
  });

  it('still refuses the percentile function without a token', async () => {
    requireUser.mockRejectedValue(new Error('no token'));
    const res = makeRes();
    await route(
      makeReq({ method: 'POST', path: ['rest', 'v1', 'rpc', 'get_xp_percentile'], body: {} }),
      res
    );
    expect(res.statusCode).toBe(401);
    expect(restRequest).not.toHaveBeenCalled();
  });
});

describe('path handling', () => {
  it('strips the /rest/v1 that supabase-js appends to its base URL', async () => {
    await route(
      makeReq({ path: ['rest', 'v1', 'gamification_data'], url: '/api/db/rest/v1/gamification_data?select=data' }),
      makeRes()
    );
    expect(restRequest.mock.calls[0][0].path).toBe('gamification_data');
  });

  it('reads the query off the URL, not off req.query', async () => {
    // req.query also holds the catch-all `path` segments; re-serialising it
    // would inject `path=rest&path=v1&...` into the upstream query string.
    await route(
      makeReq({
        path: ['rest', 'v1', 'gamification_data'],
        url: '/api/db/rest/v1/gamification_data?select=data',
      }),
      makeRes()
    );
    const search = restRequest.mock.calls[0][0].search;
    expect(search.has('path')).toBe(false);
    expect(search.get('select')).toBe('data');
    expect(search.get('user_id')).toBe(`eq.${USER}`);
  });
});

describe('header forwarding', () => {
  it('forwards Accept so .single() still produces PGRST116', async () => {
    await route(
      makeReq({
        path: ['rest', 'v1', 'gamification_data'],
        headers: { accept: 'application/vnd.pgrst.object+json' },
      }),
      makeRes()
    );
    expect(restRequest.mock.calls[0][0].headers.accept).toBe('application/vnd.pgrst.object+json');
  });

  it('forwards Prefer so .upsert() still merges', async () => {
    await route(
      makeReq({
        method: 'POST',
        path: ['rest', 'v1', 'gamification_data'],
        headers: { prefer: 'resolution=merge-duplicates,return=representation' },
        body: { data: {} },
      }),
      makeRes()
    );
    expect(restRequest.mock.calls[0][0].headers.prefer).toBe(
      'resolution=merge-duplicates,return=representation'
    );
  });

  it('does not forward the caller Authorization to Supabase', async () => {
    // The Clerk token means nothing upstream; restRequest supplies the service
    // key. Passing it through would be a confusing no-op at best.
    await route(makeReq({ path: ['rest', 'v1', 'eras'] }), makeRes());
    expect(restRequest.mock.calls[0][0].headers.authorization).toBeUndefined();
  });

  it('returns Content-Range so supabase-js can read counts', async () => {
    restRequest.mockResolvedValue(upstream({ headers: { 'content-range': '0-4/42' } }));
    const res = makeRes();
    await route(makeReq({ path: ['rest', 'v1', 'eras'] }), res);
    expect(res.headers['content-range']).toBe('0-4/42');
  });
});

describe('response passthrough', () => {
  it('returns PostgREST status and body untouched', async () => {
    // GamifiedProgress.tsx:734 branches on PGRST116 and RewardsContext.tsx:482
    // deliberately swallows 23505. Rewriting either breaks mobile code we are
    // explicitly not touching.
    const err = JSON.stringify({ code: 'PGRST116', message: 'no rows', details: null, hint: null });
    restRequest.mockResolvedValue(upstream({ status: 406, body: err }));

    const res = makeRes();
    await route(makeReq({ path: ['rest', 'v1', 'gamification_data'] }), res);

    expect(res.statusCode).toBe(406);
    expect(JSON.parse(res.body).code).toBe('PGRST116');
  });

  it('passes a duplicate-key error through as itself', async () => {
    const err = JSON.stringify({ code: '23505', message: 'duplicate key' });
    restRequest.mockResolvedValue(upstream({ status: 409, body: err }));

    const res = makeRes();
    await route(
      makeReq({ method: 'POST', path: ['rest', 'v1', 'user_unlockables'], body: [{ item_id: 'a' }] }),
      res
    );
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).code).toBe('23505');
  });

  it('shapes its own refusals like PostgREST errors', async () => {
    const res = makeRes();
    await route(makeReq({ path: ['rest', 'v1', 'billing_events'] }), res);

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    // supabase-js reads `message`; the modules' error handling expects an
    // object with a code rather than a bare string.
    expect(body).toHaveProperty('message');
    expect(body).toHaveProperty('code');
    expect(restRequest).not.toHaveBeenCalled();
  });
});

describe('caching', () => {
  it('lets the edge hold public content', async () => {
    const res = makeRes();
    await route(makeReq({ path: ['rest', 'v1', 'eras'] }), res);
    expect(res.headers['cache-control']).toContain('s-maxage');
  });

  it('never lets a shared cache hold a user row', async () => {
    const res = makeRes();
    await route(makeReq({ path: ['rest', 'v1', 'gamification_data'] }), res);
    expect(res.headers['cache-control']).toBe('private, no-store');
  });
});

describe('the xp percentile function', () => {
  it('ignores the caller argument and uses their own XP', async () => {
    // Proxied verbatim the RPC is an oracle for the global XP distribution:
    // it answers "what percentile is this number" for any number at all.
    restRequest
      .mockResolvedValueOnce(upstream({ body: JSON.stringify([{ data: { totalXP: 250 } }]) }))
      .mockResolvedValueOnce(upstream({ body: '87' }));

    const res = makeRes();
    await route(
      makeReq({ method: 'POST', path: ['rest', 'v1', 'rpc', 'get_xp_percentile'], body: { user_xp: 999999 } }),
      res
    );

    const lookup = restRequest.mock.calls[0][0];
    expect(lookup.path).toBe('gamification_data');
    expect(lookup.search.get('user_id')).toBe(`eq.${USER}`);

    const rpc = restRequest.mock.calls[1][0];
    expect(rpc.path).toBe('rpc/get_xp_percentile');
    expect(rpc.body.user_xp).toBe(250);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toBe(87);
  });

  it('returns null when the caller has no XP yet', async () => {
    restRequest.mockResolvedValueOnce(upstream({ body: '[]' }));
    const res = makeRes();
    await route(
      makeReq({ method: 'POST', path: ['rest', 'v1', 'rpc', 'get_xp_percentile'], body: {} }),
      res
    );
    // useProfileStats.ts:79 treats null as "do not show a percentile", which is
    // the right outcome and quieter than an error.
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toBe(null);
    expect(restRequest).toHaveBeenCalledTimes(1);
  });

  it('refuses any other function', async () => {
    const res = makeRes();
    await route(
      makeReq({ method: 'POST', path: ['rest', 'v1', 'rpc', 'delete_everything'], body: {} }),
      res
    );
    expect(res.statusCode).toBe(404);
    expect(restRequest).not.toHaveBeenCalled();
  });
});

describe('the scoping that matters most', () => {
  it('cannot be made to unselect every user\'s avatar', async () => {
    // RewardsContext.tsx:395 issues a PATCH filtered only on user_id. Without
    // forced scoping, one forged request rewrites that column for everyone.
    await route(
      makeReq({
        method: 'PATCH',
        path: ['rest', 'v1', 'user_unlockables'],
        url: '/api/db/rest/v1/user_unlockables',
        body: { is_selected: false },
      }),
      makeRes()
    );
    const call = restRequest.mock.calls[0][0];
    expect(call.search.get('user_id')).toBe(`eq.${USER}`);
    expect(call.body.user_id).toBe(USER);
  });

  it('stamps every row of a batch insert', async () => {
    await route(
      makeReq({
        method: 'POST',
        path: ['rest', 'v1', 'user_unlockables'],
        body: [{ item_id: 'a', user_id: 'someone_else' }, { item_id: 'b' }],
      }),
      makeRes()
    );
    expect(restRequest.mock.calls[0][0].body.every((r) => r.user_id === USER)).toBe(true);
  });
});
