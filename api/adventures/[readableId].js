import { select } from '../_lib/supabase.js';
import { handler, json, methodNotAllowed, CONTENT_CACHE } from '../_lib/http.js';

// GET /api/adventures/:readableId  -> replaces getAdventure()
export default handler(async (req, res) => {
  if (methodNotAllowed(req, res, ['GET'])) return;

  const { readableId } = req.query;
  if (!readableId) return json(res, 400, { error: 'Missing adventure id' });

  const rows = await select(
    `content?readable_id=eq.${encodeURIComponent(readableId)}&select=*`
  );
  json(res, 200, rows[0] || null, CONTENT_CACHE);
});
