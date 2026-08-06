// Clerk session verification.
//
// Ported from supabase/functions/restore-entitlement/index.ts, which has been
// running this exact verification in production. Kept dependency-free (Node's
// built-in Web Crypto) rather than pulling in @clerk/backend, so the API needs
// no install step and matches the rest of this repo's no-build-step approach.
//
// This is the only thing standing between a caller and someone else's data, so
// every claim is checked. In particular the Clerk user id used for reads and
// writes comes from `sub` on a verified token - never from the request body,
// which is how the old browser-side sync let anyone overwrite anyone's row.

const CLERK_ISSUER = process.env.CLERK_ISSUER || 'https://clerk.archiveszone.app';
const CLERK_JWKS_URL =
  process.env.CLERK_JWKS_URL || `${CLERK_ISSUER}/.well-known/jwks.json`;
// Clerk sets `azp` to the origin that requested the token. Restricting it stops
// a token minted for another site being replayed here.
const ALLOWED_PARTIES = (process.env.CLERK_AUTHORIZED_PARTIES || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export class AuthError extends Error {}

function b64urlToBytes(input) {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const bin = atob(input.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlToJson(input) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(input)));
}

let jwksCache = null;
let jwksFetchedAt = 0;

async function getVerifyKey(kid) {
  const fresh = Date.now() - jwksFetchedAt < 3_600_000;
  const known = jwksCache?.keys?.some((k) => k.kid === kid);
  if (!jwksCache || !fresh || !known) {
    const res = await fetch(CLERK_JWKS_URL);
    if (!res.ok) throw new AuthError(`JWKS fetch failed: ${res.status}`);
    jwksCache = await res.json();
    jwksFetchedAt = Date.now();
  }
  const jwk = jwksCache.keys.find((k) => k.kid === kid);
  if (!jwk) throw new AuthError('Unknown signing key');
  return crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

/** Verifies a Clerk session token and returns its claims. Throws AuthError. */
export async function verifyClerkToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new AuthError('Malformed token');

  const header = b64urlToJson(parts[0]);
  if (header.alg !== 'RS256') throw new AuthError('Unexpected algorithm');
  if (!header.kid) throw new AuthError('Missing key id');

  const key = await getVerifyKey(header.kid);
  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    b64urlToBytes(parts[2]),
    signed
  );
  if (!ok) throw new AuthError('Bad signature');

  const claims = b64urlToJson(parts[1]);
  const now = Math.floor(Date.now() / 1000);
  const skew = 30;

  if (typeof claims.exp !== 'number' || claims.exp < now - skew) {
    throw new AuthError('Token expired');
  }
  if (typeof claims.nbf === 'number' && claims.nbf > now + skew) {
    throw new AuthError('Token not yet valid');
  }
  if (claims.iss !== CLERK_ISSUER) throw new AuthError('Unexpected issuer');
  if (typeof claims.sub !== 'string' || !claims.sub) {
    throw new AuthError('Token has no subject');
  }
  if (ALLOWED_PARTIES.length && claims.azp && !ALLOWED_PARTIES.includes(claims.azp)) {
    throw new AuthError('Unauthorized party');
  }

  return claims;
}

/**
 * Pulls and verifies the bearer token from a request.
 * Returns the Clerk user id, or throws AuthError.
 */
export async function requireUser(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new AuthError('Missing bearer token');
  const claims = await verifyClerkToken(token);
  return claims.sub;
}
