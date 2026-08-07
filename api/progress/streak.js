import { restRequest, UpstreamError } from '../_lib/supabase.js';
import { requireUser } from '../_lib/auth.js';
import { handler, json, methodNotAllowed } from '../_lib/http.js';

// POST /api/progress/streak
//
// Advance the caller's universal streak by one local day.
//
// The streak lives in gamification_data.data.streak and is shared with the
// mobile app, which bumps it on any completion - a daily story or an adventure
// quiz. The web app used to derive its own daily-story-only number and never
// look at this one, so the same user saw two different streaks on their phone
// and in their browser.
//
// All the logic is in the bump_streak() Postgres function. Doing it here would
// mean reading the whole GamifiedProgressState blob, editing one key and
// writing it back, which races the phone's own upsert of that same blob. The
// function touches data->'streak' under a row lock and cannot disturb progress,
// XP or achievements sitting beside it.
//
// The user id comes from the verified Clerk token and is passed as the
// function's argument. It is never read from the body - the function has no
// other authorisation, so a body-supplied id would let anyone set anyone's
// streak.

/** How far the client's local date may sit from the server's UTC date. */
const MAX_DAY_SKEW = 1;

/**
 * Accept the client's LOCAL date, within a day of the server's.
 *
 * The date has to come from the client because a streak is a local-calendar
 * idea and the app uses local dates too - a user in Auckland finishing a story
 * at 9am is on tomorrow's date by UTC. One day of slack covers every real
 * timezone (UTC-12 to UTC+14); anything wider would let a caller claim a future
 * date and inflate a streak by replaying it.
 */
function validLocalDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const asked = Date.parse(value + 'T00:00:00Z');
  if (Number.isNaN(asked)) return false;
  const now = Date.now();
  const utcToday = Date.parse(new Date(now).toISOString().slice(0, 10) + 'T00:00:00Z');
  return Math.abs(asked - utcToday) <= MAX_DAY_SKEW * 86400000;
}

export default handler(async (req, res) => {
  if (methodNotAllowed(req, res, ['POST'])) return;

  const userId = await requireUser(req);
  const date = req.body?.date;

  if (!validLocalDate(date)) {
    return json(res, 400, {
      error: 'Expected date as YYYY-MM-DD, within a day of today',
    });
  }

  // restRequest hands back the raw Response - it neither checks the status nor
  // parses the body, so both are this caller's job.
  const upstream = await restRequest({
    path: 'rpc/bump_streak',
    method: 'POST',
    body: { p_user_id: userId, p_today: date },
  });

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    throw new UpstreamError(
      `bump_streak ${upstream.status}: ${detail.slice(0, 200)}`
    );
  }

  const streak = await upstream.json();
  json(res, 200, { streak });
});
