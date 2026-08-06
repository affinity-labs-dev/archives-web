-- Remove write access to the content tables from the public (anon) key.
-- APPLIED 2026-08-06 via the Supabase management API.
--
-- content, eras and adventures already had row-level security enabled with a
-- SELECT-only policy, so writes were refused regardless of the grant. This is
-- belt-and-braces for them.
--
-- daily_content is the one that mattered: RLS was switched OFF on that table,
-- so the grant was the only gate and anyone holding the public key could edit
-- or delete daily stories.
--
-- Safe: js/api.js is read-only (no write methods at all) and the content
-- upload scripts authenticate with the service role key.

revoke insert, update, delete, truncate on table public.content       from anon, authenticated;
revoke insert, update, delete, truncate on table public.eras          from anon, authenticated;
revoke insert, update, delete, truncate on table public.daily_content from anon, authenticated;
revoke insert, update, delete, truncate on table public.adventures    from anon, authenticated;

-- Verified after applying, with the public key:
--   PATCH/DELETE on content, eras, daily_content -> 401
--   SELECT on all four -> 200 (apps unaffected)
--
-- STILL OPEN: user_data and gamification_data remain writable by anon (RLS is
-- off and the mobile app writes to them with this key). Mobile-side work.
