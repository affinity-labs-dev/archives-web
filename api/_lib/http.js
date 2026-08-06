// Shared request/response helpers for the API routes.

import { AuthError } from './auth.js';
import { UpstreamError } from './supabase.js';

/** Content is public and identical for everyone, so let the CDN hold it. */
export const CONTENT_CACHE = 'public, s-maxage=300, stale-while-revalidate=600';
/** Anything user-scoped must never be cached by a shared cache. */
export const PRIVATE_CACHE = 'private, no-store';

export function json(res, status, body, cacheControl) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', cacheControl || PRIVATE_CACHE);
  res.status(status).send(JSON.stringify(body));
}

/** True if the request was handled (wrong method), so the route should return. */
export function methodNotAllowed(req, res, allowed) {
  if (allowed.includes(req.method)) return false;
  res.setHeader('Allow', allowed.join(', '));
  json(res, 405, { error: 'Method not allowed' });
  return true;
}

/**
 * Wraps a handler so failures become the right status instead of a 500 that
 * the client would read as "no data".
 *
 * The distinction matters: an upstream failure must not look like an empty
 * result, or the app renders "no adventures" when Supabase is simply down.
 */
export function handler(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      if (err instanceof AuthError) {
        console.warn('auth rejected:', err.message);
        return json(res, 401, { error: 'Invalid session' });
      }
      if (err instanceof UpstreamError) {
        console.error('upstream failure:', err.message);
        return json(res, 502, { error: 'Upstream unavailable' });
      }
      console.error('unhandled error:', err);
      return json(res, 500, { error: 'Server error' });
    }
  };
}
