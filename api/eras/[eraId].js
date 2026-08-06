import { select } from '../_lib/supabase.js';
import { handler, json, methodNotAllowed, CONTENT_CACHE } from '../_lib/http.js';

// GET /api/eras/:eraId  -> replaces getEra()
export default handler(async (req, res) => {
  if (methodNotAllowed(req, res, ['GET'])) return;

  const { eraId } = req.query;
  if (!eraId) return json(res, 400, { error: 'Missing era id' });

  const rows = await select(`eras?era_id=eq.${encodeURIComponent(eraId)}&select=*`);
  // null rather than 404: callers treat "no such era" as an empty result, and
  // getEra() returned null before.
  json(res, 200, rows[0] || null, CONTENT_CACHE);
});
