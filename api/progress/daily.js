import { upsert } from '../_lib/supabase.js';
import { requireUser } from '../_lib/auth.js';
import { handler, json, methodNotAllowed } from '../_lib/http.js';
import { validDailyProgress } from '../_lib/validate.js';

// PUT /api/progress/daily
export default handler(async (req, res) => {
  if (methodNotAllowed(req, res, ['PUT', 'POST'])) return;

  const userId = await requireUser(req);
  const progress = req.body?.daily_progress;

  if (!validDailyProgress(progress)) {
    return json(res, 400, { error: "Expected daily_progress as {'YYYY-MM-DD':{step:value}}" });
  }

  await upsert(
    'web_gamification_data',
    { user_id: userId, daily_progress: progress, updated_at: new Date().toISOString() },
    'user_id'
  );

  json(res, 200, { ok: true });
});
