// Monthly AI usage metering.
//
// Any signed-in free user can call /api/ai/explain, nothing in api/ rate
// limits, and it spends Gemini quota shared with paid chat. The dollars are
// survivable; exhausting the project's Gemini quota and taking subscribers'
// chat down is not. So free explain calls are counted per user per month,
// against a limit, in a table the browser cannot reach.
//
// The counter lives in `ai_usage`, which is deliberately ABSENT from
// db-policy.js's TABLE_POLICY: the /api/db proxy 404s unknown tables by
// construction, so no browser request can read or reset it. Storing it in
// ai_user_data was considered and rejected - that table is SCOPED_RW through
// the proxy, so a user could PATCH their own counter to zero and the quota
// would be theatre. db-policy.spec.js pins this.
//
// The increment happens BEFORE the model call, in one atomic RPC - a
// read-then-write here would race between two tabs both under the limit. The
// cost of charging a unit for a call that then fails is one unit of a soft
// monthly allowance; the cost of the race is a free bypass.

import { restRequest } from './supabase.js';

export const FREE_EXPLAIN_PER_MONTH = 10;

/** The UTC month bucket, e.g. "2026-08". User-local months would need a
 * timezone the server does not have; a boundary off by a few hours on a
 * 10/month allowance is noise. */
export function currentMonth(now = new Date()) {
  return now.toISOString().slice(0, 7);
}

/**
 * Spend one unit of a user's monthly allowance for a feature.
 *
 * @returns {Promise<{allowed: boolean, used: number|null, degraded?: true}>}
 *
 * Fails OPEN: if Supabase is down or the RPC is missing, the call is allowed
 * and marked degraded. A cost control that becomes an availability outage is
 * a worse trade than a few unmetered calls during an incident - and chat,
 * the expensive feature, has its own entitlement gate regardless.
 */
export async function consumeQuota({ userId, feature, limit }) {
  try {
    const resp = await restRequest({
      path: 'rpc/consume_ai_quota',
      method: 'POST',
      body: {
        p_user_id: userId,
        p_feature: feature,
        p_month: currentMonth(),
        p_limit: limit,
      },
    });
    if (!resp.ok) {
      console.error('consume_ai_quota failed:', resp.status, (await resp.text().catch(() => '')).slice(0, 200));
      return { allowed: true, used: null, degraded: true };
    }
    const row = await resp.json();
    // The function returns {allowed, used}; PostgREST may wrap single-row
    // composite results in an array depending on how it is declared.
    const result = Array.isArray(row) ? row[0] : row;
    if (!result || typeof result.allowed !== 'boolean') {
      console.error('consume_ai_quota returned an unexpected shape');
      return { allowed: true, used: null, degraded: true };
    }
    return { allowed: result.allowed, used: result.used ?? null };
  } catch (err) {
    console.error('consume_ai_quota unreachable:', err?.message || err);
    return { allowed: true, used: null, degraded: true };
  }
}
