import { upsert } from '../_lib/supabase.js';
import { requireUser } from '../_lib/auth.js';
import { handler, json, methodNotAllowed } from '../_lib/http.js';
import { validAdventureProgress } from '../_lib/validate.js';

// PUT /api/progress/adventures
//
// The row is keyed on the Clerk id from the verified token. The old browser
// version sent user_id in the POST body with only the public anon key, so
// anyone could overwrite anyone else's progress by knowing their Clerk id.
export default handler(async (req, res) => {
  if (methodNotAllowed(req, res, ['PUT', 'POST'])) return;

  const userId = await requireUser(req);
  const progress = req.body?.adventure_progress;

  if (!validAdventureProgress(progress)) {
    return json(res, 400, { error: 'Expected adventure_progress as {adventureId:{moduleId:0-3}}' });
  }

  await upsert(
    'web_gamification_data',
    { user_id: userId, adventure_progress: progress, updated_at: new Date().toISOString() },
    'user_id'
  );

  json(res, 200, { ok: true });
});
