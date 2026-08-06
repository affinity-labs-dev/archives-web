import { selectAll } from '../_lib/supabase.js';
import { handler, json, methodNotAllowed, CONTENT_CACHE } from '../_lib/http.js';

// GET /api/daily  -> replaces getDailyStories()
//
// Both callers (streak-celebration.js and daily-home.js) use nothing but
// `.date`, to work out which days have content so a gap doesn't break a streak.
// The old query selected `content` as well, so the browser downloaded every
// story's full JSON body - well over a hundred documents - and discarded all of
// it. Only the dates are sent now.
//
// selectAll pages past PostgREST's 1000-row cap, which the old unbounded query
// would eventually have hit silently as the archive grows.
export default handler(async (req, res) => {
  if (methodNotAllowed(req, res, ['GET'])) return;

  const rows = await selectAll('daily_content?order=date.desc&select=date,is_active');
  json(res, 200, rows, CONTENT_CACHE);
});
