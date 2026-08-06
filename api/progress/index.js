import { select } from '../_lib/supabase.js';
import { requireUser } from '../_lib/auth.js';
import { handler, json, methodNotAllowed, PRIVATE_CACHE } from '../_lib/http.js';

// GET /api/progress
//
// Replaces the two browser reads in js/services/sync.js. The user id comes from
// the verified Clerk token, so a caller can only ever read their own row - the
// old version put clerk.user.id in a query string alongside the public anon
// key, which let anyone read anyone's progress.
//
// Returns both sources unmerged; the client already knows how to combine them
// (mastery_level -> stars, best-score-wins).
export default handler(async (req, res) => {
  if (methodNotAllowed(req, res, ['GET'])) return;

  const userId = await requireUser(req);
  const id = encodeURIComponent(userId);

  const [mobileRows, webRows] = await Promise.all([
    select(`gamification_data?user_id=eq.${id}&select=data`),
    select(`web_gamification_data?user_id=eq.${id}&select=adventure_progress,daily_progress`),
  ]);

  json(
    res,
    200,
    {
      mobile: mobileRows[0]?.data ?? null,
      web: {
        adventure_progress: webRows[0]?.adventure_progress ?? null,
        daily_progress: webRows[0]?.daily_progress ?? null,
      },
    },
    PRIVATE_CACHE
  );
});
