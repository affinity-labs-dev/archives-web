// routes/webhook.ts - POST /webhook/revenuecat

import type { FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../auth.js';

export async function webhookRoute(request: FastifyRequest, reply: FastifyReply) {
  // Verify webhook secret
  const authHeader = request.headers.authorization;
  const expectedSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    request.log.warn('Invalid webhook secret');
    return reply.status(401).send({ error: 'Invalid webhook secret' });
  }

  const body = request.body as any;
  const event = body?.event;

  if (!event) {
    return reply.status(400).send({ error: 'Missing event data' });
  }

  const appUserId = event.app_user_id;
  if (!appUserId) {
    return reply.status(400).send({ error: 'Missing app_user_id' });
  }

  request.log.info({ eventType: event.type, appUserId }, 'RevenueCat webhook received');

  try {
    // Call RevenueCat API to get definitive subscriber status
    const rcStatus = await fetchDefinitiveStatus(appUserId);

    // Upsert subscription_status table
    await supabase.from('subscription_status').upsert({
      user_id: appUserId,
      is_subscriber: rcStatus.isSubscriber,
      entitlements: rcStatus.entitlements,
      expires_at: rcStatus.expiresAt,
      updated_at: new Date().toISOString(),
    });

    request.log.info({ appUserId, isSubscriber: rcStatus.isSubscriber }, 'Subscription status updated');

    return reply.status(200).send({ success: true });
  } catch (error) {
    request.log.error({ error, appUserId }, 'Webhook processing error');
    // Return 200 anyway to prevent RevenueCat from retrying on our processing errors
    // (the data issue should be investigated, not retried)
    return reply.status(200).send({ success: false, error: 'Processing error' });
  }
}

async function fetchDefinitiveStatus(appUserId: string): Promise<{
  isSubscriber: boolean;
  entitlements: string[];
  expiresAt: string | null;
}> {
  const secretKey = process.env.REVENUECAT_SECRET_KEY;
  if (!secretKey) {
    return { isSubscriber: false, entitlements: [], expiresAt: null };
  }

  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${appUserId}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });

  if (!res.ok) {
    throw new Error(`RevenueCat API returned ${res.status}`);
  }

  const data = await res.json();
  const entitlements = data?.subscriber?.entitlements || {};
  const activeEntitlements: string[] = [];
  let latestExpiry: string | null = null;

  for (const [name, ent] of Object.entries(entitlements) as any[]) {
    const isActive = ent.expires_date === null || new Date(ent.expires_date) > new Date();
    if (isActive) {
      activeEntitlements.push(name);
      if (ent.expires_date && (!latestExpiry || ent.expires_date > latestExpiry)) {
        latestExpiry = ent.expires_date;
      }
    }
  }

  return {
    isSubscriber: activeEntitlements.length > 0,
    entitlements: activeEntitlements,
    expiresAt: latestExpiry,
  };
}
