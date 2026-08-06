import { requireUser } from '../_lib/auth.js';
import { handler, json, methodNotAllowed } from '../_lib/http.js';
import {
  isConfigured,
  rcSubscriber,
  activeEntitlement,
  aliasOnto,
  linkingPolicy,
  relatedAppUserIds,
} from '../_lib/revenuecat.js';

// POST /api/entitlement/restore
//
// Port of supabase/functions/restore-entitlement. Same request and response
// shape, so js/services/revenuecat.js only needs its URL changed.
//
// Most purchases are already keyed on the Clerk user id and the browser SDK
// finds those itself. The onboarding funnel checks people out under anonymous
// ids, which a client-side getCustomerInfo() can never see - this searches
// those and links them permanently.
export default handler(async (req, res) => {
  if (methodNotAllowed(req, res, ['POST'])) return;

  // Without the key every RevenueCat call 401s, which would read as "no
  // subscription" and strip access from a paying customer. Fail loudly: the
  // client keeps its cached status when this errors.
  if (!isConfigured()) {
    console.error('REVENUECAT_V1_API_KEY is not set');
    return json(res, 503, { error: 'Not configured' });
  }

  const clerkUserId = await requireUser(req);

  // 1. The Clerk id itself, where the great majority of purchases already sit.
  const own = activeEntitlement(await rcSubscriber(clerkUserId));
  if (own) {
    return json(res, 200, {
      premium: true,
      entitlement: own.entitlement,
      expiresAt: own.expiresAt,
      store: own.store,
      managementUrl: own.managementUrl,
      source: 'clerk_id',
      linked: false,
    });
  }

  // 2. Anything else this email has purchased under. An email match is only
  //    evidence of ownership if the address is proven to be theirs.
  const policy = await linkingPolicy(clerkUserId);
  if (!policy.allowed) {
    console.warn(JSON.stringify({ event: 'link_refused', clerk_user_id: clerkUserId, reason: policy.reason }));
    return json(res, 200, { premium: false, source: 'clerk_id', linked: false, reason: policy.reason });
  }

  const candidates = (await relatedAppUserIds(policy.email)).filter((id) => id !== clerkUserId);

  for (const candidate of candidates) {
    const found = activeEntitlement(await rcSubscriber(candidate));
    if (!found) continue;

    const linked = await aliasOnto(candidate, clerkUserId);

    // An alias permanently merges billing records, so every one is attributable.
    console.log(JSON.stringify({
      event: linked ? 'linked' : 'link_failed',
      clerk_user_id: clerkUserId,
      source_app_user_id: candidate,
      entitlement: found.entitlement,
      product_id: found.productId,
      expires_at: found.expiresAt,
      store: found.store,
      evidence: policy.evidence,
    }));

    // Re-read through the Clerk id so the response reflects what the app will
    // see from now on, rather than what was found on the other customer.
    const confirmed = linked ? activeEntitlement(await rcSubscriber(clerkUserId)) : null;
    const result = confirmed ?? found;

    return json(res, 200, {
      premium: true,
      entitlement: result.entitlement,
      expiresAt: result.expiresAt,
      store: result.store,
      managementUrl: result.managementUrl,
      source: candidate.startsWith('$RCAnonymousID:') ? 'anonymous_id' : 'email_id',
      linked,
    });
  }

  json(res, 200, { premium: false, source: 'searched', linked: false, searched: candidates.length });
});
