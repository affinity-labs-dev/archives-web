// The PostgREST proxy.
//
// The web build runs the mobile app's data modules unchanged. They still call
// `supabase.from(...)`, but the client points here and carries a Clerk session
// token instead of a Supabase key - so the browser holds no database
// credential at all, and the user id used for every read and write comes from
// a verified token rather than from whatever the client claims.
//
// This file is deliberately thin. Every decision lives in _lib/db-policy.js,
// which is pure and unit-tested; this is transport. The one rule it enforces
// itself is the response contract: PostgREST's status and body go back
// verbatim, because the mobile modules branch on supabase-js error codes and
// rewriting them here would break the mobile code we are trying not to touch.

import { requireUser } from '../_lib/auth.js';
import { handler, json, PRIVATE_CACHE } from '../_lib/http.js';
import { restRequest, UpstreamError } from '../_lib/supabase.js';
import { authorize, PolicyError, TABLE_POLICY, PUBLIC_READ } from '../_lib/db-policy.js';

/**
 * Headers the client is allowed to influence.
 *
 * `Accept` carries `application/vnd.pgrst.object+json`, which is how
 * `.single()` asks for exactly one row - and therefore how `PGRST116` comes
 * back when there is none. `Prefer` carries `resolution=merge-duplicates` for
 * `.upsert()` and `return=representation` for `.select()` after a write. Drop
 * either and calls that work on mobile fail on web.
 */
const FORWARD_REQUEST_HEADERS = ['accept', 'prefer', 'accept-profile', 'content-profile'];

/** `Content-Range` is where supabase-js reads row counts from. */
const FORWARD_RESPONSE_HEADERS = ['content-type', 'content-range'];

/**
 * The only database function the browser may reach, and the reason it needs a
 * wrapper rather than a passthrough.
 *
 * `get_xp_percentile(user_xp)` takes a number that has nothing to do with the
 * caller - it answers "what percentile is this XP value". Proxied verbatim it
 * is an oracle: a few dozen calls map the entire global XP distribution. So
 * the caller's argument is discarded and their own XP is looked up server-side.
 */
const XP_PERCENTILE = 'get_xp_percentile';

async function callXpPercentile(userId, res) {
  const search = new URLSearchParams({
    select: 'data',
    user_id: `eq.${userId}`,
  });
  const own = await restRequest({
    path: 'gamification_data',
    search,
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!own.ok) throw new UpstreamError(`gamification_data ${own.status}`);

  const rows = await own.json();
  const totalXP = Number(rows?.[0]?.data?.totalXP);
  if (!Number.isFinite(totalXP) || totalXP <= 0) {
    // Matches what the caller does with a null: useProfileStats.ts:79 simply
    // does not render a percentile. An error would be louder than the feature.
    return json(res, 200, null);
  }

  const rpc = await restRequest({
    path: `rpc/${XP_PERCENTILE}`,
    method: 'POST',
    body: { user_xp: totalXP },
    headers: { Accept: 'application/json' },
  });
  if (!rpc.ok) throw new UpstreamError(`${XP_PERCENTILE} ${rpc.status}`);
  return json(res, 200, await rpc.json());
}

/**
 * Strips the `/rest/v1` that supabase-js appends to its base URL.
 *
 * The client is configured with `.../api/db`, so a query for `gamification_data`
 * arrives as `/api/db/rest/v1/gamification_data`.
 */
function restPath(segments) {
  const parts = Array.isArray(segments) ? segments : [segments].filter(Boolean);
  if (parts[0] === 'rest' && parts[1] === 'v1') return parts.slice(2);
  return parts;
}

export default handler(async (req, res) => {
  // Absence of a token is not an error here. Public content is readable without
  // one - the content providers and RewardsContext load it before anyone signs
  // in, exactly as they do on mobile - and the policy decides per table. A bad
  // or expired token is treated as no token, so a stale session degrades to
  // signed-out rather than breaking content loading.
  let userId = null;
  try {
    userId = await requireUser(req);
  } catch {
    userId = null;
  }

  const path = restPath(req.query?.path);

  try {
    if (path[0] === 'rpc') {
      if (path.length !== 2 || path[1] !== XP_PERCENTILE) {
        throw new PolicyError('Unknown function', 404);
      }
      if (req.method !== 'POST') throw new PolicyError('Method not allowed', 405);
      // The percentile is the caller's own, so this one does need a session.
      if (!userId) throw new PolicyError('Not signed in', 401);
      return await callXpPercentile(userId, res);
    }

    // Parse the query off the raw URL rather than req.query: req.query also
    // holds the catch-all `path` segments, and re-serialising it would inject
    // them into the upstream query string.
    const searchParams = new URL(req.url, 'http://proxy.invalid').searchParams;

    const decision = authorize({
      method: req.method,
      path,
      searchParams,
      body: req.body,
      userId,
    });

    const forwarded = {};
    for (const name of FORWARD_REQUEST_HEADERS) {
      const value = req.headers[name];
      if (value) forwarded[name] = value;
    }

    const upstream = await restRequest({
      path: decision.table,
      search: decision.search,
      method: decision.method,
      body: decision.method === 'GET' || decision.method === 'HEAD' ? undefined : decision.body,
      headers: forwarded,
    });

    for (const name of FORWARD_RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    }
    // Public content is identical for everyone and safe to hold at the edge;
    // anything scoped must never touch a shared cache.
    res.setHeader(
      'Cache-Control',
      TABLE_POLICY[decision.table] === PUBLIC_READ && decision.method === 'GET'
        ? 'public, s-maxage=300, stale-while-revalidate=600'
        : PRIVATE_CACHE
    );

    // Status and body pass through untouched - see the note at the top.
    res.status(upstream.status).send(await upstream.text());
  } catch (err) {
    if (err instanceof PolicyError) {
      console.warn('db proxy refused:', req.method, path.join('/'), err.message);
      // Shaped like a PostgREST error so supabase-js surfaces it as one and the
      // mobile modules' existing error handling applies unchanged.
      return json(res, err.status, {
        message: err.message,
        code: `PROXY_${err.status}`,
        details: null,
        hint: null,
      });
    }
    throw err;
  }
});
