import { describe, it, expect } from 'vitest';
import { stripRouteParam } from '../../db/rest/v1/[table].js';

// Vercel appends a dynamic route segment to req.url as well as putting it on
// req.query. The proxy reads its PostgREST filters from req.url, so an
// un-stripped `table=eras` arrives upstream as a column filter and every public
// read fails with `PGRST100: failed to parse filter (eras)`.
//
// That surfaced as a 400 on a live deployment, not as anything routing-shaped,
// which is exactly why it gets a test rather than a comment.

describe('stripRouteParam', () => {
  it('removes the injected segment and keeps the real filters', () => {
    expect(stripRouteParam('/api/db/rest/v1/eras?select=id&table=eras', 'table')).toBe(
      '/api/db/rest/v1/eras?select=id'
    );
  });

  it('drops the query string entirely when nothing else remains', () => {
    expect(stripRouteParam('/api/db/rest/v1/eras?table=eras', 'table')).toBe(
      '/api/db/rest/v1/eras'
    );
  });

  it('preserves order and repeated filters', () => {
    // Forced scoping relies on repeated params surviving intact - PostgREST ANDs
    // them, which is what stops a forged user_id escaping.
    const out = stripRouteParam(
      '/api/db/rest/v1/user_unlockables?user_id=eq.a&table=user_unlockables&user_id=eq.b',
      'table'
    );
    expect(out).toBe('/api/db/rest/v1/user_unlockables?user_id=eq.a&user_id=eq.b');
  });

  it('leaves a url alone when the param is absent', () => {
    expect(stripRouteParam('/api/db/rest/v1/eras?select=id', 'table')).toBe(
      '/api/db/rest/v1/eras?select=id'
    );
    expect(stripRouteParam('/api/db/rest/v1/eras', 'table')).toBe('/api/db/rest/v1/eras');
  });

  it('strips the rpc parameter too', () => {
    expect(
      stripRouteParam('/api/db/rest/v1/rpc/get_xp_percentile?fn=get_xp_percentile', 'fn')
    ).toBe('/api/db/rest/v1/rpc/get_xp_percentile');
  });
});
