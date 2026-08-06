import { select } from '../_lib/supabase.js';
import { handler, json, methodNotAllowed, CONTENT_CACHE } from '../_lib/http.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/daily/today?date=YYYY-MM-DD  -> replaces getTodayStory()
//
// The date is supplied by the client on purpose. "Today" is a property of the
// user's timezone, not the server's: this function runs in UTC, so computing it
// here would roll the story over in the local afternoon for anyone west of
// Greenwich and mark streak days missed - exactly the bug fixed in localDateStr().
export default handler(async (req, res) => {
  if (methodNotAllowed(req, res, ['GET'])) return;

  const date = req.query.date;
  if (!date || !DATE_RE.test(date)) {
    return json(res, 400, { error: 'A date=YYYY-MM-DD query parameter is required' });
  }

  const rows = await select(
    `daily_content?date=eq.${encodeURIComponent(date)}&select=*`
  );
  if (rows[0]) return json(res, 200, rows[0], CONTENT_CACHE);

  // Fall back to the most recent published story, as getTodayStory() did.
  const fallback = await select(
    `daily_content?date=lte.${encodeURIComponent(date)}&order=date.desc&limit=1&select=*`
  );
  json(res, 200, fallback[0] || null, CONTENT_CACHE);
});
