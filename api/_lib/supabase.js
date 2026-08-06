// Supabase access for serverless functions.
//
// This module is the only place the service role key is used, and it never
// runs in a browser. The point of the whole backend is that the client stops
// holding a Supabase credential at all - see api/_lib/README.md.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

/** Thrown when Supabase itself is unreachable, as opposed to returning no rows. */
export class UpstreamError extends Error {}

function assertConfigured() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    // Fail loudly rather than returning empty results, which would look to the
    // app like "this era has no adventures".
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  }
}

/**
 * GET against PostgREST with the service role.
 *
 * `path` is everything after /rest/v1/, e.g. `eras?select=*&order=order_by.asc`.
 */
export async function select(path) {
  assertConfigured();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!res.ok) {
    throw new UpstreamError(`Supabase ${res.status} for ${path.split('?')[0]}`);
  }
  return res.json();
}

/**
 * Raw PostgREST call, returning the response untouched.
 *
 * Unlike `select` and `upsert` above, this does not interpret the result. The
 * proxy needs the status and body verbatim: the mobile modules branch on
 * supabase-js error codes - `PGRST116` when `.single()` finds no row
 * (GamifiedProgress.tsx:734), `23505` on a duplicate insert that
 * RewardsContext.tsx:482 deliberately swallows - and those codes only survive
 * if nothing rewrites them on the way through.
 *
 * `headers` carries the caller's `Accept` and `Prefer`, which is what makes
 * `.single()` and `.upsert()` behave the same as they do against Supabase.
 */
export async function restRequest({ path, search, method, body, headers = {} }) {
  assertConfigured();
  const qs = search && String(search) ? `?${search}` : '';
  return fetch(`${SUPABASE_URL}/rest/v1/${path}${qs}`, {
    method,
    headers: {
      ...headers,
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/**
 * Upsert a row. `conflictColumn` is the primary key PostgREST merges on.
 */
export async function upsert(table, row, conflictColumn) {
  assertConfigured();
  const qs = conflictColumn ? `?on_conflict=${encodeURIComponent(conflictColumn)}` : '';
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${qs}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new UpstreamError(`Supabase upsert ${res.status} on ${table}: ${detail.slice(0, 200)}`);
  }
}

/**
 * PostgREST caps every response at 1000 rows and a `limit` cannot raise it, so
 * a single request silently truncates. Pages until a short page comes back.
 *
 * `path` must already contain a stable `order` - an unstable sort across page
 * boundaries repeats or drops rows.
 */
export async function selectAll(path, { pageSize = 1000, maxPages = 100 } = {}) {
  const out = [];
  for (let page = 0; page < maxPages; page++) {
    const sep = path.includes('?') ? '&' : '?';
    const rows = await select(`${path}${sep}limit=${pageSize}&offset=${page * pageSize}`);
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}
