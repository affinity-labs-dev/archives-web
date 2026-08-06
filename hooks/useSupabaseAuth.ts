/**
 * No-op on native.
 *
 * Native talks to Supabase directly with the anon key, so there is no proxy to
 * authenticate against and nothing to register. The web sibling
 * (useSupabaseAuth.web.ts) is where the real work happens.
 *
 * This file exists so the shared root layout can call the hook unconditionally
 * instead of branching on Platform.OS - the same `.web.ts` sibling pattern as
 * hooks/useColorScheme.web.ts.
 */
export function useSupabaseAuth() {}
