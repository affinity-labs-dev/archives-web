import { select } from '../_lib/supabase.js';
import { handler, json, methodNotAllowed, CONTENT_CACHE } from '../_lib/http.js';

// GET /api/eras  -> replaces getAllEras()
export default handler(async (req, res) => {
  if (methodNotAllowed(req, res, ['GET'])) return;
  const rows = await select('eras?order=order_by.asc&select=*');
  json(res, 200, rows, CONTENT_CACHE);
});
