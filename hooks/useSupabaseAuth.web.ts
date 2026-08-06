import { useAuth } from '@clerk/clerk-expo';
import { useEffect } from 'react';

import { setSupabaseTokenGetter } from '@/hooks/lib/supabase.web';

/**
 * Gives the web Supabase client a way to mint Clerk session tokens.
 *
 * Call once, inside ClerkProvider. On web every `supabase.from(...)` call goes
 * through /api/db, which refuses anything without a verified Clerk token - so
 * until this runs, the data layer is inert by design rather than by accident.
 *
 * `getToken` is registered rather than its result: tokens are short-lived, so
 * capturing one at mount would work for about a minute and then start failing
 * in a way that looks like a server problem.
 */
export function useSupabaseAuth() {
  const { getToken, isLoaded } = useAuth();

  // Registered during render, deliberately NOT in an effect.
  //
  // React runs child effects before parent effects, so an effect here fires
  // only after GamifiedProgressProvider and AdventuresContentProvider have
  // already issued their first queries. Those went out with no token, the proxy
  // correctly answered 401, and the engine then crashed on `state.progress.map`
  // with `progress` undefined - an auth-ordering bug wearing the costume of a
  // null-safety one.
  //
  // Assignment is idempotent, so repeating it every render costs nothing. The
  // remaining gap - renders before Clerk finishes loading - is closed by
  // <ClerkLoaded> in app/_layout.tsx, which is what the real app does too.
  if (isLoaded) setSupabaseTokenGetter(getToken);

  useEffect(() => {
    // Clearing on unmount stops a stale getter from a torn-down Clerk instance
    // being used - it would reject, which reads as an auth outage rather than
    // as the shutdown it is.
    return () => setSupabaseTokenGetter(null);
  }, []);
}
