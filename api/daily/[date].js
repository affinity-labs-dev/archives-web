import { select } from '../_lib/supabase.js';
import { handler, json, methodNotAllowed, CONTENT_CACHE } from '../_lib/http.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/daily/:date  -> replaces getDailyStory(date)
export default handler(async (req, res) => {
  if (methodNotAllowed(req, res, ['GET'])) return;

  const { date } = req.query;
  if (!date || !DATE_RE.test(date)) {
    return json(res, 400, { error: 'Expected a YYYY-MM-DD date' });
  }

  const rows = await select(
    `daily_content?date=eq.${encodeURIComponent(date)}&select=*`
  );
  json(res, 200, rows[0] || null, CONTENT_CACHE);
});
