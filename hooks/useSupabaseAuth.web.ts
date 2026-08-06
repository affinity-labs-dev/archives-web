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

  useEffect(() => {
    if (!isLoaded) return;
    setSupabaseTokenGetter(getToken);
    // Clearing on unmount stops a stale getter from a torn-down Clerk instance
    // being used - it would reject, which reads as an auth outage rather than
    // as the shutdown it is.
    return () => setSupabaseTokenGetter(null);
  }, [getToken, isLoaded]);
}
