// quota.ts - Server-side quota enforcement (reads/writes ai_user_data table)

import { supabase } from './auth.js';
import type { QuotaInfo } from './types.js';

type RequestType = 'chat' | 'image_generate' | 'image_edit' | 'image_analyze';

interface MonthlyUsage {
  month: string;
  chat_count: number;
  image_generate_count: number;
  image_edit_count: number;
  image_analyze_count: number;
}

const QUOTA_LIMITS = {
  free: { chat: 100, image_generate: 10, image_edit: 10, image_analyze: 50 },
  subscriber: { chat: -1, image_generate: 100, image_edit: 50, image_analyze: -1 },
} as const;

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getResetDate(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0];
}

function emptyUsage(): MonthlyUsage {
  return {
    month: getCurrentMonth(),
    chat_count: 0,
    image_generate_count: 0,
    image_edit_count: 0,
    image_analyze_count: 0,
  };
}

/**
 * Check if a user can make a request. Returns remaining quota info.
 * Throws with status 429 data if quota exceeded.
 */
export async function checkQuota(
  userId: string,
  requestType: RequestType,
  isSubscriber: boolean
): Promise<void> {
  const limits = isSubscriber ? QUOTA_LIMITS.subscriber : QUOTA_LIMITS.free;
  const limit = limits[requestType];

  // Unlimited
  if (limit === -1) return;

  const usage = await getMonthlyUsage(userId);
  const countKey = `${requestType}_count` as keyof MonthlyUsage;
  const currentCount = (usage[countKey] as number) || 0;

  if (currentCount >= limit) {
    const error: any = new Error('Quota exceeded');
    error.statusCode = 429;
    error.body = {
      code: 'QUOTA_EXCEEDED',
      message: `Monthly ${requestType} limit reached (${limit})`,
      quotaRemaining: { [requestType]: 0 },
      resetDate: getResetDate(),
    };
    throw error;
  }
}

/**
 * Decrement quota after a successful Gemini call.
 * Returns updated remaining quota for the response.
 */
export async function decrementQuota(
  userId: string,
  requestType: RequestType,
  isSubscriber: boolean
): Promise<QuotaInfo> {
  const usage = await getMonthlyUsage(userId);
  const countKey = `${requestType}_count` as keyof MonthlyUsage;
  (usage[countKey] as number) += 1;
  usage.month = getCurrentMonth();

  // Write updated usage back to Supabase
  await supabase
    .from('ai_user_data')
    .upsert(
      { user_id: userId, monthly_usage: usage, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  // Calculate remaining for response
  const limits = isSubscriber ? QUOTA_LIMITS.subscriber : QUOTA_LIMITS.free;
  const remaining: QuotaInfo = {};
  for (const [type, limit] of Object.entries(limits)) {
    const key = `${type}_count` as keyof MonthlyUsage;
    const count = (usage[key] as number) || 0;
    remaining[type] = limit === -1 ? -1 : Math.max(0, limit - count);
  }

  return remaining;
}

async function getMonthlyUsage(userId: string): Promise<MonthlyUsage> {
  const { data } = await supabase
    .from('ai_user_data')
    .select('monthly_usage')
    .eq('user_id', userId)
    .single();

  let usage: MonthlyUsage = data?.monthly_usage || emptyUsage();

  // Reset if different month
  if (usage.month !== getCurrentMonth()) {
    usage = emptyUsage();
  }

  return usage;
}
