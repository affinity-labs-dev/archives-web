// RevenueCat lookups and customer linking.
//
// Ported from supabase/functions/restore-entitlement/index.ts, which has been
// running in production. Behaviour is unchanged; the Clerk verification and
// Supabase access now come from the shared _lib modules.

import { select, UpstreamError } from './supabase.js';

const RC_V1 = 'https://api.revenuecat.com/v1';
const RC_KEY = process.env.REVENUECAT_V1_API_KEY;

const CLERK_API = 'https://api.clerk.com/v1';
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || '';
const CLERK_ENVIRONMENT_URL =
  process.env.CLERK_ENVIRONMENT_URL || 'https://clerk.archiveszone.app/v1/environment';

// OAuth providers that assert a verified email with the identity.
const EMAIL_VERIFYING_PROVIDERS = new Set(['oauth_google', 'oauth_apple', 'oauth_microsoft']);

// Emails containing these would break PostgREST's or=() grammar.
const SAFE_EMAIL = /^[^\s,()"]+@[^\s,()"]+$/;

export function isConfigured() {
  return Boolean(RC_KEY);
}

/**
 * A RevenueCat customer. 404 means "no such customer"; anything else non-2xx is
 * an outage and must not be reported to the caller as "no subscription".
 */
export async function rcSubscriber(appUserId) {
  const res = await fetch(`${RC_V1}/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${RC_KEY}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new UpstreamError(`RevenueCat ${res.status} for ${appUserId}`);
  const body = await res.json();
  return body.subscriber ?? null;
}

/** The best currently-active entitlement on a customer, or null. */
export function activeEntitlement(sub) {
  if (!sub) return null;
  const now = Date.now();
  let best = null;

  for (const [name, ent] of Object.entries(sub.entitlements ?? {})) {
    const expires = ent.expires_date ?? null;
    if (expires && new Date(expires).getTime() <= now) continue;

    const productId = ent.product_identifier ?? null;
    const store = productId
      ? sub.subscriptions?.[productId]?.store ??
        sub.non_subscriptions?.[productId]?.[0]?.store ??
        null
      : null;

    const candidate = {
      entitlement: name,
      expiresAt: expires,
      productId,
      store,
      managementUrl: sub.management_url ?? null,
    };

    // A lifetime grant (no expiry) beats anything dated; otherwise latest wins.
    if (!best || !expires) best = candidate;
    else if (best.expiresAt && expires > best.expiresAt) best = candidate;
  }
  return best;
}

/** Permanently merges a customer onto the Clerk id. */
export async function aliasOnto(sourceId, targetId) {
  const res = await fetch(`${RC_V1}/subscribers/${encodeURIComponent(sourceId)}/alias`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${RC_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_app_user_id: targetId }),
  });
  return res.ok;
}

// ---------------------------------------------------------------- identity

async function primaryEmailFromClerk(clerkUserId) {
  const res = await fetch(`${CLERK_API}/users/${encodeURIComponent(clerkUserId)}`, {
    headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
  });
  if (res.status === 404) return { email: null, verified: false };
  if (!res.ok) throw new UpstreamError(`Clerk ${res.status} for ${clerkUserId}`);

  const user = await res.json();
  const primary = (user.email_addresses ?? []).find((a) => a.id === user.primary_email_address_id);
  if (!primary) return { email: null, verified: false };

  return {
    email: typeof primary.email_address === 'string' ? primary.email_address : null,
    verified: primary.verification?.status === 'verified',
  };
}

async function emailFromMirror(clerkUserId) {
  const rows = await select(
    `clerk_user?id=eq.${encodeURIComponent(clerkUserId)}&select=email&limit=1`
  );
  const email = rows[0]?.email;
  return typeof email === 'string' && email ? email : null;
}

let envCache = null;
let envFetchedAt = 0;

/**
 * Clerk leaves `verification` null on roughly a third of real accounts, so a
 * per-user check alone would refuse many genuine customers. The structural
 * guarantee is stronger: if the only ways to sign in are an emailed code or an
 * OAuth provider that asserts a verified address, then holding a live session
 * for an account IS proof of controlling its email. Checked live so that
 * enabling password sign-in later disables linking rather than weakening it.
 */
async function sessionProvesEmailOwnership() {
  if (!envCache || Date.now() - envFetchedAt > 3_600_000) {
    const res = await fetch(CLERK_ENVIRONMENT_URL);
    if (!res.ok) throw new UpstreamError(`Clerk environment ${res.status}`);
    envCache = await res.json();
    envFetchedAt = Date.now();
  }

  const settings = envCache.user_settings ?? {};
  const attrs = settings.attributes ?? {};

  const email = attrs.email_address;
  if (!email?.enabled || !email.used_for_first_factor) return false;
  if (!Array.isArray(email.verifications) || email.verifications.length === 0) return false;

  for (const [name, attr] of Object.entries(attrs)) {
    if (name === 'email_address') continue;
    if (attr?.enabled && attr?.used_for_first_factor) return false;
  }
  for (const [provider, cfg] of Object.entries(settings.social ?? {})) {
    if (cfg?.enabled && !EMAIL_VERIFYING_PROVIDERS.has(provider)) return false;
  }
  return true;
}

async function clerkAccountsWithEmail(email) {
  const rows = await select(
    `clerk_user?select=id,email&email=ilike.${encodeURIComponent(email)}&limit=10`
  );
  const target = email.trim().toLowerCase();
  return rows.filter((r) => typeof r.email === 'string' && r.email.trim().toLowerCase() === target)
    .length;
}

/**
 * Whether this caller's email may be used to claim a purchase filed under a
 * different RevenueCat id. Linking is permanent, so this fails closed.
 */
export async function linkingPolicy(clerkUserId) {
  let email = null;
  let verified = false;

  if (CLERK_SECRET_KEY) {
    ({ email, verified } = await primaryEmailFromClerk(clerkUserId));
  } else {
    email = await emailFromMirror(clerkUserId);
  }
  if (!email) return { allowed: false, reason: 'no_email' };

  let evidence;
  if (verified) evidence = 'verified_email';
  else if (await sessionProvesEmailOwnership()) evidence = 'session_proves_email';
  else return { allowed: false, reason: 'email_ownership_unproven' };

  if ((await clerkAccountsWithEmail(email)) > 1) {
    return { allowed: false, reason: 'email_shared_by_multiple_accounts' };
  }
  return { allowed: true, email, evidence };
}

/**
 * Other RevenueCat ids carrying this email, newest first.
 *
 * ilike for discovery because the mirror and the webhook payloads disagree on
 * case; every row is then re-checked with a strict lowercase compare, because
 * ilike also treats _ and % as wildcards and underscores are common in real
 * addresses. Only ids that actually appear in revenuecat_transactions are
 * returned - GET /v1/subscribers/{id} auto-creates a stub, so no guesses.
 */
export async function relatedAppUserIds(email) {
  if (!SAFE_EMAIL.test(email)) return [];
  const target = email.trim().toLowerCase();

  const NESTED = 'raw_payload->event->subscriber_attributes->$email->>value';
  const FLAT = 'raw_payload->subscriber_attributes->$email->>value';

  const params = new URLSearchParams();
  params.set('select', `app_user_id,em_nested:${NESTED},em_flat:${FLAT}`);
  params.set('or', `(app_user_id.ilike.${email},${NESTED}.ilike.${email},${FLAT}.ilike.${email})`);
  params.set('order', 'event_timestamp.desc');
  params.set('limit', '500');

  const rows = await select(`revenuecat_transactions?${params}`);
  const seen = new Set();

  for (const row of rows) {
    const id = row.app_user_id;
    if (typeof id !== 'string' || !id) continue;
    const evidence = [id, row.em_nested, row.em_flat];
    if (evidence.some((v) => typeof v === 'string' && v.trim().toLowerCase() === target)) {
      seen.add(id);
    }
  }
  return [...seen];
}
