// Supabase Edge Function: restore-entitlement
//
// Answers "does this signed-in Clerk user have an active Archives subscription?"
// and, when the subscription is filed under a different RevenueCat app_user_id,
// permanently aliases that customer onto the Clerk id so it never has to be
// searched for again.
//
// Why this exists: most purchases are already keyed on the Clerk user id, and
// the browser SDK finds those on its own. But the onboarding web funnel checks
// people out under an anonymous `$RCAnonymousID:…` id, and some web-billing
// customers are keyed by email. A client-side getCustomerInfo() can only ever
// ask about the one id it was configured with, so those purchases are
// invisible to the browser. This function searches the other ids.
//
// Linking a purchase filed under someone else's RevenueCat id is permanent, so
// it happens only when the caller's ownership of the email is provable and the
// email maps to exactly one Clerk account. See linkingPolicy().
//
// Secrets:
//   REVENUECAT_V1_API_KEY   required (never ships to the browser)
//   CLERK_SECRET_KEY        optional; adds a per-user verification check
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by the platform.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RC_V1 = "https://api.revenuecat.com/v1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RC_KEY = Deno.env.get("REVENUECAT_V1_API_KEY")!;
const CLERK_JWKS_URL = Deno.env.get("CLERK_JWKS_URL") ??
  "https://clerk.archiveszone.app/.well-known/jwks.json";
const CLERK_ISSUER = Deno.env.get("CLERK_ISSUER") ?? "https://clerk.archiveszone.app";

// Used to confirm the caller's email address is actually verified before their
// email is trusted to claim someone's subscription. Without it, linking a
// purchase from another RevenueCat id is refused - see linkingPolicy().
const CLERK_SECRET_KEY = Deno.env.get("CLERK_SECRET_KEY") ?? "";
const CLERK_API = "https://api.clerk.com/v1";

const CLERK_ENVIRONMENT_URL = Deno.env.get("CLERK_ENVIRONMENT_URL") ??
  "https://clerk.archiveszone.app/v1/environment";

// OAuth providers that assert a verified email address with the identity.
const EMAIL_VERIFYING_PROVIDERS = new Set([
  "oauth_google",
  "oauth_apple",
  "oauth_microsoft",
]);

const ALLOWED_ORIGINS = new Set([
  "https://web.archiveszone.app",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://web.archiveszone.app";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

// ------------------------------------------------------------- Clerk JWT

function b64urlToBytes(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const bin = atob(input.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlToJson(input: string): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(input)));
}

let jwksCache: { keys: Array<Record<string, string>> } | null = null;
let jwksFetchedAt = 0;

async function getVerifyKey(kid: string): Promise<CryptoKey> {
  const fresh = Date.now() - jwksFetchedAt < 3_600_000;
  const known = jwksCache?.keys.some((k) => k.kid === kid);
  if (!jwksCache || !fresh || !known) {
    const res = await fetch(CLERK_JWKS_URL);
    if (!res.ok) throw new Error("JWKS fetch failed: " + res.status);
    jwksCache = await res.json();
    jwksFetchedAt = Date.now();
  }
  const jwk = jwksCache!.keys.find((k) => k.kid === kid);
  if (!jwk) throw new Error("Unknown signing key");
  return await crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
}

// This is the only thing standing between a caller and someone else's
// subscription, so every claim is checked.
async function verifyClerkToken(token: string): Promise<{ sub: string }> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed token");

  const header = b64urlToJson(parts[0]) as { alg?: string; kid?: string };
  if (header.alg !== "RS256") throw new Error("Unexpected algorithm");
  if (!header.kid) throw new Error("Missing key id");

  const key = await getVerifyKey(header.kid);
  const signed = new TextEncoder().encode(parts[0] + "." + parts[1]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlToBytes(parts[2]), signed);
  if (!ok) throw new Error("Bad signature");

  const payload = b64urlToJson(parts[1]) as Record<string, unknown>;
  const now = Math.floor(Date.now() / 1000);
  const skew = 30;
  if (typeof payload.exp !== "number" || payload.exp < now - skew) throw new Error("Token expired");
  if (typeof payload.nbf === "number" && payload.nbf > now + skew) throw new Error("Token not yet valid");
  if (payload.iss !== CLERK_ISSUER) throw new Error("Unexpected issuer");
  if (typeof payload.sub !== "string" || !payload.sub) throw new Error("Token has no subject");

  return { sub: payload.sub };
}

// -------------------------------------------------------------- Supabase

async function restGet(path: string, params: URLSearchParams): Promise<Array<Record<string, unknown>>> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}?${params}`, {
    headers: { apikey: SERVICE_ROLE, Authorization: "Bearer " + SERVICE_ROLE },
  });
  if (!res.ok) throw new Error(`Supabase ${path} ${res.status}`);
  return await res.json();
}

// The email is read from Clerk's own mirror, never from the request body.
async function emailForClerkUser(clerkUserId: string): Promise<string | null> {
  const params = new URLSearchParams({ id: `eq.${clerkUserId}`, select: "email", limit: "1" });
  const rows = await restGet("clerk_user", params);
  const email = rows[0]?.email;
  return typeof email === "string" && email ? email : null;
}

// How many Clerk accounts claim this address. Shared and recycled addresses do
// occur in the mirror, and "which of these two people owns the subscription" is
// not a question this function is entitled to answer.
async function clerkAccountsWithEmail(email: string): Promise<number> {
  const params = new URLSearchParams({ select: "id,email", email: `ilike.${email}`, limit: "10" });
  const rows = await restGet("clerk_user", params);
  const target = email.trim().toLowerCase();
  // ilike wildcards can widen the match, so re-check exactly, as elsewhere.
  return rows.filter(
    (r) => typeof r.email === "string" && r.email.trim().toLowerCase() === target,
  ).length;
}

// Clerk's own record of this user's primary address, plus whether Clerk has an
// explicit verification on it. `verified: false` is not the same as "unverified"
// - Clerk leaves `verification` null on many genuine accounts - so callers must
// treat it as "no per-user proof" rather than as evidence against the user.
async function primaryEmailFromClerk(
  clerkUserId: string,
): Promise<{ email: string | null; verified: boolean }> {
  const res = await fetch(`${CLERK_API}/users/${encodeURIComponent(clerkUserId)}`, {
    headers: { Authorization: "Bearer " + CLERK_SECRET_KEY },
  });
  // 404 is an answer (no such user); anything else non-2xx means Clerk is down
  // or the key is wrong, and guessing "verified" there is exactly the mistake.
  if (res.status === 404) return { email: null, verified: false };
  if (!res.ok) throw new UpstreamError(`Clerk ${res.status} for ${clerkUserId}`);

  const user = await res.json();
  const addresses: Array<Record<string, any>> = user.email_addresses ?? [];
  const primary = addresses.find((a) => a.id === user.primary_email_address_id);
  if (!primary) return { email: null, verified: false };

  const email = primary.email_address;
  return {
    email: typeof email === "string" && email ? email : null,
    verified: primary.verification?.status === "verified",
  };
}

let envCache: Record<string, any> | null = null;
let envFetchedAt = 0;

async function clerkEnvironment(): Promise<Record<string, any>> {
  if (envCache && Date.now() - envFetchedAt < 3_600_000) return envCache;
  const res = await fetch(CLERK_ENVIRONMENT_URL);
  if (!res.ok) throw new UpstreamError(`Clerk environment ${res.status}`);
  envCache = await res.json();
  envFetchedAt = Date.now();
  return envCache!;
}

// Clerk does not record a verification object on every email address - roughly
// a third of current accounts have `verification: null` - so a per-user check
// alone would refuse a large slice of genuine customers.
//
// The structural guarantee is stronger anyway: if the only ways to authenticate
// are an emailed code or an OAuth provider that asserts a verified address,
// then holding a live session for an account IS proof of controlling its email.
// This checks that invariant on every request rather than trusting a dashboard
// setting, so enabling (say) password sign-in later disables linking instead of
// silently weakening it.
async function sessionProvesEmailOwnership(): Promise<boolean> {
  const env = await clerkEnvironment();
  const settings = env.user_settings ?? {};
  const attrs: Record<string, any> = settings.attributes ?? {};

  const email = attrs.email_address;
  if (!email?.enabled || !email.used_for_first_factor) return false;
  if (!Array.isArray(email.verifications) || email.verifications.length === 0) return false;

  // Any other first factor would let someone in without receiving that code.
  for (const [name, attr] of Object.entries(attrs)) {
    if (name === "email_address") continue;
    if (attr?.enabled && attr?.used_for_first_factor) return false;
  }

  // Every enabled social provider must vouch for the address it hands over.
  const social: Record<string, any> = settings.social ?? {};
  for (const [provider, cfg] of Object.entries(social)) {
    if (cfg?.enabled && !EMAIL_VERIFYING_PROVIDERS.has(provider)) return false;
  }

  return true;
}

type LinkPolicy =
  | { allowed: true; email: string; evidence: "verified_email" | "session_proves_email" }
  | { allowed: false; reason: string };

// Decides whether this caller's email may be used to claim a purchase filed
// under a different RevenueCat id. Getting this wrong hands one customer's
// subscription to another, permanently, so it fails closed.
async function linkingPolicy(clerkUserId: string): Promise<LinkPolicy> {
  let email: string | null = null;
  let verified = false;

  if (CLERK_SECRET_KEY) {
    ({ email, verified } = await primaryEmailFromClerk(clerkUserId));
  } else {
    // Mirror fallback. The structural check below is what actually carries the
    // guarantee, so losing the key degrades detail, not safety.
    email = await emailForClerkUser(clerkUserId);
  }
  if (!email) return { allowed: false, reason: "no_email" };

  let evidence: "verified_email" | "session_proves_email";
  if (verified) {
    evidence = "verified_email";
  } else if (await sessionProvesEmailOwnership()) {
    evidence = "session_proves_email";
  } else {
    return { allowed: false, reason: "email_ownership_unproven" };
  }

  const accounts = await clerkAccountsWithEmail(email);
  if (accounts > 1) return { allowed: false, reason: "email_shared_by_multiple_accounts" };

  return { allowed: true, email, evidence };
}

// Emails with a comma or paren would break PostgREST's or=() grammar. Those are
// legal-but-vanishing-rare, and skipping the lookup is better than a broken filter.
const SAFE_EMAIL = /^[^\s,()"]+@[^\s,()"]+$/;

// Other RevenueCat ids carrying this email, newest activity first.
//
// Discovery uses `ilike` because the mirror and the webhook payloads disagree on
// case ("User@x.com" vs "user@x.com") and an exact `eq` silently misses those.
// `ilike` also treats _ and % as wildcards, and underscores are common in real
// addresses, so every row is re-checked in code below against a strict
// lowercase comparison. The widened query can only add candidates; the JS check
// is what decides.
//
// Only ids that actually appear in revenuecat_transactions are returned:
// GET /v1/subscribers/{id} auto-creates a stub customer, so we never probe a guess.
async function relatedAppUserIds(email: string): Promise<string[]> {
  if (!SAFE_EMAIL.test(email)) return [];
  const target = email.trim().toLowerCase();

  const NESTED = "raw_payload->event->subscriber_attributes->$email->>value";
  const FLAT = "raw_payload->subscriber_attributes->$email->>value";

  const params = new URLSearchParams();
  // Webhook payloads are inconsistent: most nest under .event, some are flat.
  params.set("select", `app_user_id,em_nested:${NESTED},em_flat:${FLAT}`);
  params.set(
    "or",
    `(app_user_id.ilike.${email},${NESTED}.ilike.${email},${FLAT}.ilike.${email})`,
  );
  params.set("order", "event_timestamp.desc");
  params.set("limit", "500");

  const rows = await restGet("revenuecat_transactions", params);
  const seen = new Set<string>();

  for (const row of rows) {
    const id = row.app_user_id;
    if (typeof id !== "string" || !id) continue;

    const evidence = [id, row.em_nested, row.em_flat];
    const matches = evidence.some(
      (v) => typeof v === "string" && v.trim().toLowerCase() === target,
    );
    if (matches) seen.add(id);
  }

  return [...seen];
}

// ------------------------------------------------------------ RevenueCat

interface Found {
  entitlement: string;
  expiresAt: string | null;
  productId: string | null;
  store: string | null;
  managementUrl: string | null;
}

// Raised when RevenueCat itself is unavailable, as opposed to answering
// "this customer has nothing".
class UpstreamError extends Error {}

async function rcSubscriber(appUserId: string): Promise<Record<string, any> | null> {
  const res = await fetch(`${RC_V1}/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: "Bearer " + RC_KEY },
  });

  // 404 is a real answer: no such customer. Everything else non-2xx (401, 429,
  // 5xx) is an operational failure, and reporting it as "no subscription" is
  // how you take premium away from someone who paid for it.
  if (res.status === 404) return null;
  if (!res.ok) throw new UpstreamError(`RevenueCat ${res.status} for ${appUserId}`);

  const body = await res.json();
  return body.subscriber ?? null;
}

function activeEntitlement(sub: Record<string, any> | null): Found | null {
  if (!sub) return null;
  const now = Date.now();
  let best: Found | null = null;

  for (const [name, ent] of Object.entries(sub.entitlements ?? {})) {
    const e = ent as Record<string, any>;
    const expires: string | null = e.expires_date ?? null;
    if (expires && new Date(expires).getTime() <= now) continue;

    const productId: string | null = e.product_identifier ?? null;
    const store: string | null = productId
      ? (sub.subscriptions?.[productId]?.store ?? sub.non_subscriptions?.[productId]?.[0]?.store ?? null)
      : null;

    const candidate: Found = {
      entitlement: name,
      expiresAt: expires,
      productId,
      store,
      managementUrl: sub.management_url ?? null,
    };

    // A lifetime grant (no expiry) beats anything dated; otherwise latest wins.
    if (!best) best = candidate;
    else if (!expires) best = candidate;
    else if (best.expiresAt && expires > best.expiresAt) best = candidate;
  }

  return best;
}

async function aliasOnto(sourceId: string, targetId: string): Promise<boolean> {
  const res = await fetch(`${RC_V1}/subscribers/${encodeURIComponent(sourceId)}/alias`, {
    method: "POST",
    headers: { Authorization: "Bearer " + RC_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ new_app_user_id: targetId }),
  });
  return res.ok;
}

// ----------------------------------------------------------------- handler

serve(async (req: Request) => {
  const cors = corsHeaders(req.headers.get("origin"));
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Without the secret every RevenueCat call 401s, which would otherwise read
  // as "no subscription" and downgrade a paying customer. Fail loudly instead:
  // the client keeps its cached status when this call errors.
  if (!RC_KEY) {
    console.error("REVENUECAT_V1_API_KEY is not set");
    return json({ error: "Not configured" }, 503);
  }

  let clerkUserId: string;
  try {
    const auth = req.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return json({ error: "Missing bearer token" }, 401);
    ({ sub: clerkUserId } = await verifyClerkToken(token));
  } catch (err) {
    console.warn("Token rejected:", (err as Error).message);
    return json({ error: "Invalid session" }, 401);
  }

  try {
    // 1. The Clerk id itself - where the great majority of purchases already sit.
    const own = activeEntitlement(await rcSubscriber(clerkUserId));
    if (own) {
      return json({
        premium: true,
        entitlement: own.entitlement,
        expiresAt: own.expiresAt,
        store: own.store,
        managementUrl: own.managementUrl,
        source: "clerk_id",
        linked: false,
      });
    }

    // 2. Anything else this email has ever purchased under. An email match is
    //    only evidence of ownership if the address is proven to be theirs.
    const policy = await linkingPolicy(clerkUserId);
    if (!policy.allowed) {
      console.warn(JSON.stringify({
        event: "link_refused",
        clerk_user_id: clerkUserId,
        reason: policy.reason,
      }));
      return json({ premium: false, source: "clerk_id", linked: false, reason: policy.reason });
    }

    const email = policy.email;
    const candidates = (await relatedAppUserIds(email)).filter((id) => id !== clerkUserId);

    for (const candidate of candidates) {
      const found = activeEntitlement(await rcSubscriber(candidate));
      if (!found) continue;

      const linked = await aliasOnto(candidate, clerkUserId);

      // Audit trail: an alias is a permanent merge of billing records, so every
      // one needs to be attributable and reversible by hand after the fact.
      console.log(JSON.stringify({
        event: linked ? "linked" : "link_failed",
        clerk_user_id: clerkUserId,
        source_app_user_id: candidate,
        entitlement: found.entitlement,
        product_id: found.productId,
        expires_at: found.expiresAt,
        store: found.store,
        evidence: policy.evidence,
      }));

      // Re-read through the Clerk id so the response reflects what the app will
      // see from now on, rather than what we found on the other customer.
      const confirmed = linked ? activeEntitlement(await rcSubscriber(clerkUserId)) : null;
      const result = confirmed ?? found;

      return json({
        premium: true,
        entitlement: result.entitlement,
        expiresAt: result.expiresAt,
        store: result.store,
        managementUrl: result.managementUrl,
        source: candidate.startsWith("$RCAnonymousID:") ? "anonymous_id" : "email_id",
        linked,
      });
    }

    return json({ premium: false, source: "searched", linked: false, searched: candidates.length });
  } catch (err) {
    // An error response is deliberate here. The client keeps whatever status it
    // already had when this call fails; a 200 saying premium:false would be
    // cached and would strip access from a paying customer.
    if (err instanceof UpstreamError) {
      console.error("Upstream failure:", err.message);
      return json({ error: "Upstream unavailable" }, 502);
    }
    console.error("restore-entitlement failed:", err);
    return json({ error: "Lookup failed" }, 500);
  }
});
