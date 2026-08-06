import proxy from '../../[...path].js';

// Vercel does not route the catch-all `api/db/[...path].js` - every request to
// /api/db/* returned a platform 404, while single dynamic segments
// (api/eras/[eraId], api/daily/[date]) resolved fine. Verified against a real
// deployment, not assumed.
//
// The catch-all is not actually needed. supabase-js only ever produces two URL
// shapes against its base URL:
//
//   <base>/rest/v1/<table>
//   <base>/rest/v1/rpc/<function>
//
// so the depth is fixed and a plain dynamic segment covers it - the routing
// that is known to work here.
//
// The implementation stays in [...path].js: one handler, one policy, and every
// existing test exercises the real thing. This file only restates the request
// in the shape that handler expects, so local development (which serves the
// catch-all directly through dev/api-middleware.js) and production run
// identical code.

/**
 * Removes a Vercel-injected route parameter from the query string.
 *
 * Vercel appends the dynamic segment to `req.url` as well as putting it on
 * `req.query`, and the proxy reads its filters from `req.url` - so without this
 * the table name arrives at PostgREST as a column filter and every public read
 * came back `PGRST100: failed to parse filter (eras)`. It fails as a 400 rather
 * than something obviously routing-shaped, which is what makes it worth naming.
 *
 * Nothing legitimate is lost: PostgREST filters are column names, and neither
 * `table` nor `fn` is a column on any table in the allowlist.
 */
export function stripRouteParam(url, name) {
  const parsed = new URL(url, 'http://proxy.invalid');
  parsed.searchParams.delete(name);
  const qs = parsed.searchParams.toString();
  return `${parsed.pathname}${qs ? `?${qs}` : ''}`;
}

export default function handler(req, res) {
  req.url = stripRouteParam(req.url, 'table');
  req.query = { ...req.query, path: ['rest', 'v1', req.query.table] };
  return proxy(req, res);
}
