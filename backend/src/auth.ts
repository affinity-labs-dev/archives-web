// auth.ts - Clerk JWT verification + subscription status from Supabase

import { verifyToken } from '@clerk/backend';
import { createClient } from '@supabase/supabase-js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthPayload } from './types.js';

// Supabase client (service role - bypasses RLS)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export { supabase };

/**
 * Fastify onRequest hook for /ai/* routes.
 * Verifies Clerk JWT, reads subscription status, attaches AuthPayload to request.
 */
export async function authHook(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    // Verify Clerk JWT
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });

    const userId = payload.sub;
    if (!userId) {
      reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Invalid token: no user ID' });
      return;
    }

    // Read subscription status from Supabase
    const isSubscriber = await getSubscriptionStatus(userId);

    // Attach auth payload to request for downstream use
    (request as any).auth = { userId, isSubscriber } satisfies AuthPayload;
  } catch (error) {
    request.log.error({ error }, 'Auth verification failed');
    reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Invalid or expired token' });
  }
}

/**
 * Read subscription status from the subscription_status table.
 * Falls back to RevenueCat API for first-time users, then caches in Supabase.
 */
async function getSubscriptionStatus(userId: string): Promise<boolean> {
  // Try Supabase first
  const { data } = await supabase
    .from('subscription_status')
    .select('is_subscriber, expires_at')
    .eq('user_id', userId)
    .single();

  if (data) {
    // Check if subscription has expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return false;
    }
    return data.is_subscriber;
  }

  // No row found — first-time user. Call RevenueCat API as fallback.
  const rcStatus = await fetchRevenueCatStatus(userId);

  // Cache the result in Supabase for future reads
  await supabase.from('subscription_status').upsert({
    user_id: userId,
    is_subscriber: rcStatus,
    updated_at: new Date().toISOString(),
  });

  return rcStatus;
}

/**
 * Fetch subscription status from RevenueCat server API.
 * Used as fallback when no row exists in subscription_status table.
 */
async function fetchRevenueCatStatus(userId: string): Promise<boolean> {
  const secretKey = process.env.REVENUECAT_SECRET_KEY;
  if (!secretKey) {
    console.warn('REVENUECAT_SECRET_KEY not set, defaulting to free tier');
    return false;
  }

  try {
    const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${userId}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    if (!res.ok) {
      console.warn(`RevenueCat API returned ${res.status} for user ${userId}`);
      return false;
    }

    const data = await res.json();
    const entitlements = data?.subscriber?.entitlements;
    if (!entitlements || Object.keys(entitlements).length === 0) {
      return false;
    }

    // Check if any entitlement is active
    return Object.values(entitlements).some(
      (e: any) => e.expires_date === null || new Date(e.expires_date) > new Date()
    );
  } catch (error) {
    console.error('RevenueCat API error:', error);
    return false;
  }
}
