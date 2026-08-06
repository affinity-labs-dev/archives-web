import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The web Supabase client. Same export, same API, no credential.
//
// Metro resolves this file instead of supabase.ts when platform === 'web', so
// the ten modules that import `{ supabase }` are untouched and mobile is
// unaffected. They still write `supabase.from('gamification_data').select(...)`;
// what changes is where that request lands and who it is authenticated as.
//
// Native talks to Supabase directly with the anon key. A browser cannot: the
// key would be readable by anyone who opened devtools, and the user id is
// currently asserted by the client rather than proven, so anyone could read or
// overwrite anyone's row. So on web the client points at our own /api/db,
// which verifies a Clerk token, forces every query to the caller's own rows,
// and holds the service key server-side. See api/_lib/db-policy.js.
//
// Verified against supabase-js 2.58.0: it sets `Authorization: Bearer <key>`
// on the init it hands the custom fetch, and does not re-apply it afterwards -
// so swapping the header inside the fetch is what actually goes over the wire.
// That is load-bearing; if it ever stops being true, every request silently
// authenticates as nobody.

/**
 * Where the proxy lives.
 *
 * Same-origin by default, which is both the production layout and the reason
 * no CORS headers are needed. EXPO_PUBLIC_API_ORIGIN exists for a dev server
 * running on a different port than `vercel dev`.
 */
const API_ORIGIN =
  process.env.EXPO_PUBLIC_API_ORIGIN ||
  (typeof window !== 'undefined' ? window.location.origin : '');

/**
 * supabase-js appends `/rest/v1/<table>` to this, so a query for
 * `gamification_data` arrives at /api/db/rest/v1/gamification_data.
 */
const PROXY_URL = `${API_ORIGIN}/api/db`;

/**
 * supabase-js requires a key and sends it as the `apikey` header. The proxy
 * ignores it - authentication is the Clerk bearer token below. This deliberately
 * is not a real key and must never become one: shipping a placeholder is the
 * entire point, and the dist/ secret scan would fail the build if it were.
 */
const NO_KEY = 'proxy-authenticates-via-clerk';

type TokenGetter = () => Promise<string | null | undefined>;

let getToken: TokenGetter | null = null;

/**
 * Hands the client a way to mint a Clerk session token.
 *
 * Registered rather than read off a global: `window.Clerk` is only set on
 * clerk-js's script-tag path, not when it is bundled the way clerk-expo bundles
 * it, so depending on it would work in some builds and fail silently in others.
 *
 * Until this is called every request goes out unauthenticated and the proxy
 * answers 401 - which is the correct behaviour before sign-in anyway.
 */
export function setSupabaseTokenGetter(fn: TokenGetter | null) {
  getToken = fn;
}

/**
 * The current Clerk session token, for the few web calls that talk to the
 * backend directly rather than through supabase-js - image upload being the
 * one that exists today, because storage is not PostgREST.
 */
export async function getSupabaseToken(): Promise<string | null> {
  if (!getToken) return null;
  return (await getToken().catch(() => null)) ?? null;
}

const clerkAuthedFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers);

  // Replace the placeholder Authorization supabase-js just set. Deleting the
  // header when there is no token matters: sending `Bearer <placeholder>` would
  // make an unauthenticated request look like a malformed authenticated one.
  const token = getToken ? await getToken().catch(() => null) : null;
  if (token) headers.set('Authorization', `Bearer ${token}`);
  else headers.delete('Authorization');

  return fetch(input, { ...init, headers });
};

/**
 * A channel that does nothing, so the three realtime call sites keep working.
 *
 * `createClient` against a non-Supabase origin would otherwise retry a wss://
 * connection forever. Nothing is lost: all three subscriptions
 * (useEras.ts:123, useTodayQuest.ts:166, AdventuresContentService.ts:162) only
 * trigger a refetch when content changes, and content changes when the CMS
 * publishes - not while someone is looking at the page.
 */
function stubChannel(name: string) {
  const channel: any = {
    topic: name,
    on: () => channel,
    subscribe: (cb?: (status: string) => void) => {
      // Report the truth rather than staying silent - the call sites log this
      // status, and 'SUBSCRIBED' would be a lie that costs someone an hour.
      cb?.('CLOSED');
      return channel;
    },
    unsubscribe: async () => 'ok',
  };
  return channel;
}

export const supabase: SupabaseClient = createClient(PROXY_URL, NO_KEY, {
  auth: {
    // The proxy authenticates with Clerk, so GoTrue has nothing to do. Left on,
    // it would poll /auth/v1 endpoints the proxy does not serve.
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: { fetch: clerkAuthedFetch },
});

// Patched after construction rather than configured: supabase-js has no option
// that turns realtime off outright.
(supabase as any).channel = (name: string) => stubChannel(name);
(supabase as any).removeChannel = async () => 'ok';
(supabase as any).removeAllChannels = async () => [];
(supabase as any).getChannels = () => [];
