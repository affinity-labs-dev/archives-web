import { select } from '../_lib/supabase.js';
import { handler, json, methodNotAllowed, CONTENT_CACHE } from '../_lib/http.js';

// The same column list getAdventures() used - deliberately not `*`, because the
// grid never needs content_list, which is the bulk of each row.
const COLUMNS =
  'readable_id,era_id,adventure_title,adventure_description,timeline,order_by,icon_url,card_content';

// GET /api/adventures?era=:eraId  -> replaces getAdventures()
export default handler(async (req, res) => {
  if (methodNotAllowed(req, res, ['GET'])) return;

  const era = req.query.era || 'prophets';
  const rows = await select(
    `content?era_id=eq.${encodeURIComponent(era)}&order=order_by.asc&select=${COLUMNS}`
  );
  json(res, 200, rows, CONTENT_CACHE);
});
