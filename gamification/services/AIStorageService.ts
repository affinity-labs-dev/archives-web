// AIStorageService.ts - Handles AI chat persistence and image storage
// Uses Supabase for storing conversations, usage tracking, and images

import { supabase } from '@/hooks/lib/supabase';
import { decode } from 'base64-arraybuffer';

// Types
export interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  isUploadedImage?: boolean;
  timestamp: string;
  // Quiz context for Chat to Learn responses (displayed as a banner)
  quizContext?: {
    title: string;
    eraName: string;
    score: string;
  };
  // Hidden messages are kept in history for AI context but not rendered
  hidden?: boolean;
}

export interface UsageStats {
  total_cost: number;
  total_requests: number;
  by_type: {
    chat: { count: number; cost: number };
    image_generate: { count: number; cost: number };
    image_edit: { count: number; cost: number };
    image_analyze: { count: number; cost: number };
  };
}

// Monthly usage tracking for quota enforcement
export interface MonthlyUsage {
  month: string; // Format: "2025-01" (YYYY-MM)
  chat_count: number;
  image_generate_count: number;
  image_edit_count: number;
  image_analyze_count: number;
}

// Quota limits by subscription status
export interface QuotaLimits {
  chat: number;
  image_generate: number;
  image_edit: number;
  image_analyze: number;
}

// Quota check result
export interface QuotaCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetDate: string; // First day of next month
}

export interface AIUserData {
  user_id: string;
  messages: StoredMessage[];
  usage: UsageStats;
  monthly_usage?: MonthlyUsage;
  created_at: string;
  updated_at: string;
}

// Monthly quota limits
const QUOTA_LIMITS = {
  free: {
    chat: 100,
    image_generate: 10,
    image_edit: 10,
    image_analyze: 50,
  } as QuotaLimits,
  subscriber: {
    chat: -1, // Unlimited
    image_generate: 100,
    image_edit: 50,
    image_analyze: -1, // Unlimited
  } as QuotaLimits,
};

// Cost estimates per request type (USD)
const COST_ESTIMATES = {
  chat: 0.0005,
  image_generate: 0.03,
  image_edit: 0.04,
  image_analyze: 0.001,
};

class AIStorageService {
  private bucket = 'ai-images';

  /**
   * Get current month in YYYY-MM format
   */
  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Get first day of next month (quota reset date)
   */
  private getResetDate(): string {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString().split('T')[0];
  }

  /**
   * Get empty monthly usage object for current month
   */
  private getEmptyMonthlyUsage(): MonthlyUsage {
    return {
      month: this.getCurrentMonth(),
      chat_count: 0,
      image_generate_count: 0,
      image_edit_count: 0,
      image_analyze_count: 0,
    };
  }

  /**
   * Check if user can make a request (within monthly quota)
   */
  async checkQuota(
    userId: string,
    requestType: 'chat' | 'image_generate' | 'image_edit' | 'image_analyze',
    isSubscriber: boolean = false
  ): Promise<QuotaCheckResult> {
    try {
      const currentMonth = this.getCurrentMonth();
      const limits = isSubscriber ? QUOTA_LIMITS.subscriber : QUOTA_LIMITS.free;
      const limit = limits[requestType];

      // Unlimited check (-1 means unlimited)
      if (limit === -1) {
        return {
          allowed: true,
          remaining: -1,
          limit: -1,
          resetDate: this.getResetDate(),
        };
      }

      // Get current monthly usage
      const { data } = await supabase
        .from('ai_user_data')
        .select('monthly_usage')
        .eq('user_id', userId)
        .single();

      let monthlyUsage: MonthlyUsage = data?.monthly_usage || this.getEmptyMonthlyUsage();

      // Reset if different month
      if (monthlyUsage.month !== currentMonth) {
        monthlyUsage = this.getEmptyMonthlyUsage();
      }

      const countKey = `${requestType}_count` as keyof MonthlyUsage;
      const currentCount = (monthlyUsage[countKey] as number) || 0;
      const remaining = Math.max(0, limit - currentCount);
      const allowed = currentCount < limit;

      console.log(`📊 [AIStorage] Quota check: ${requestType} = ${currentCount}/${limit} (${isSubscriber ? 'subscriber' : 'free'})`);

      return {
        allowed,
        remaining,
        limit,
        resetDate: this.getResetDate(),
      };
    } catch (error) {
      console.error('❌ [AIStorage] Quota check failed:', error);
      // Allow on error to not block users
      return {
        allowed: true,
        remaining: 999,
        limit: 999,
        resetDate: this.getResetDate(),
      };
    }
  }

  /**
   * Get user's remaining quota for all types
   */
  async getRemainingQuota(
    userId: string,
    isSubscriber: boolean = false
  ): Promise<Record<string, QuotaCheckResult>> {
    const types: Array<'chat' | 'image_generate' | 'image_edit' | 'image_analyze'> = [
      'chat',
      'image_generate',
      'image_edit',
      'image_analyze',
    ];

    const results: Record<string, QuotaCheckResult> = {};

    for (const type of types) {
      results[type] = await this.checkQuota(userId, type, isSubscriber);
    }

    return results;
  }

  /**
   * Upload an image to Supabase Storage
   * Returns the public URL
   */
  async uploadImage(
    userId: string,
    base64Data: string,
    type: 'generated' | 'edited' | 'uploaded'
  ): Promise<string | null> {
    try {
      const filename = `${userId}/${Date.now()}_${type}.png`;

      // Convert base64 to ArrayBuffer
      const arrayBuffer = decode(base64Data);

      const { data, error } = await supabase.storage
        .from(this.bucket)
        .upload(filename, arrayBuffer, {
          contentType: 'image/png',
          upsert: false,
        });

      if (error) {
        console.error('❌ [AIStorage] Upload error:', error);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucket)
        .getPublicUrl(data.path);

      console.log('✅ [AIStorage] Image uploaded:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('❌ [AIStorage] Upload failed:', error);
      return null;
    }
  }

  /**
   * Load user's AI data (messages + usage)
   */
  async loadUserData(userId: string): Promise<AIUserData | null> {
    try {
      const { data, error } = await supabase
        .from('ai_user_data')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data found - user hasn't used AI yet
          console.log('📭 [AIStorage] No existing data for user');
          return null;
        }
        console.error('❌ [AIStorage] Load error:', error);
        return null;
      }

      console.log('✅ [AIStorage] Loaded user data, messages:', data.messages?.length || 0);
      return data as AIUserData;
    } catch (error) {
      console.error('❌ [AIStorage] Load failed:', error);
      return null;
    }
  }

  /**
   * Save user's messages
   */
  async saveMessages(userId: string, messages: StoredMessage[]): Promise<boolean> {
    try {
      // Sanitize messages to ensure they're JSON-serializable
      const sanitizedMessages = messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: typeof msg.timestamp === 'string' ? msg.timestamp : new Date().toISOString(),
        imageUrl: msg.imageUrl || undefined,
        isUploadedImage: msg.isUploadedImage || undefined,
        quizContext: msg.quizContext || undefined,
        hidden: msg.hidden || undefined,
      }));

      const { error } = await supabase
        .from('ai_user_data')
        .upsert(
          {
            user_id: userId,
            messages: sanitizedMessages,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('❌ [AIStorage] Save messages error:', error.message || error.code || error.details || JSON.stringify(error));
        return false;
      }

      console.log('✅ [AIStorage] Saved messages:', sanitizedMessages.length);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('❌ [AIStorage] Save failed:', errorMessage);
      return false;
    }
  }

  /**
   * Update usage stats after an AI request (tracks both lifetime and monthly)
   */
  async trackUsage(
    userId: string,
    requestType: 'chat' | 'image_generate' | 'image_edit' | 'image_analyze'
  ): Promise<boolean> {
    try {
      const currentMonth = this.getCurrentMonth();

      // First, get current usage
      const { data: existing } = await supabase
        .from('ai_user_data')
        .select('usage, monthly_usage')
        .eq('user_id', userId)
        .single();

      const cost = COST_ESTIMATES[requestType];

      // Build updated lifetime usage object
      const currentUsage: UsageStats = existing?.usage || {
        total_cost: 0,
        total_requests: 0,
        by_type: {
          chat: { count: 0, cost: 0 },
          image_generate: { count: 0, cost: 0 },
          image_edit: { count: 0, cost: 0 },
          image_analyze: { count: 0, cost: 0 },
        },
      };

      const updatedUsage: UsageStats = {
        total_cost: currentUsage.total_cost + cost,
        total_requests: currentUsage.total_requests + 1,
        by_type: {
          ...currentUsage.by_type,
          [requestType]: {
            count: currentUsage.by_type[requestType].count + 1,
            cost: currentUsage.by_type[requestType].cost + cost,
          },
        },
      };

      // Build updated monthly usage object
      let monthlyUsage: MonthlyUsage = existing?.monthly_usage || this.getEmptyMonthlyUsage();

      // Reset monthly usage if we're in a new month
      if (monthlyUsage.month !== currentMonth) {
        monthlyUsage = this.getEmptyMonthlyUsage();
      }

      // Increment the appropriate counter
      const countKey = `${requestType}_count` as keyof MonthlyUsage;
      (monthlyUsage[countKey] as number) = ((monthlyUsage[countKey] as number) || 0) + 1;

      // Upsert both usage objects
      const { error } = await supabase
        .from('ai_user_data')
        .upsert(
          {
            user_id: userId,
            usage: updatedUsage,
            monthly_usage: monthlyUsage,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('❌ [AIStorage] Track usage error:', error);
        return false;
      }

      console.log(`📊 [AIStorage] Tracked ${requestType}, monthly: ${monthlyUsage[countKey]}, total cost: $${updatedUsage.total_cost.toFixed(4)}`);
      return true;
    } catch (error) {
      console.error('❌ [AIStorage] Track usage failed:', error);
      return false;
    }
  }

  /**
   * Get user's current usage stats
   */
  async getUserUsage(userId: string): Promise<UsageStats | null> {
    try {
      const { data, error } = await supabase
        .from('ai_user_data')
        .select('usage')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data - return zero usage
          return {
            total_cost: 0,
            total_requests: 0,
            by_type: {
              chat: { count: 0, cost: 0 },
              image_generate: { count: 0, cost: 0 },
              image_edit: { count: 0, cost: 0 },
              image_analyze: { count: 0, cost: 0 },
            },
          };
        }
        return null;
      }

      return data.usage as UsageStats;
    } catch (error) {
      console.error('❌ [AIStorage] Get usage failed:', error);
      return null;
    }
  }

  /**
   * Check if user has exceeded their credit limit
   */
  async checkCreditLimit(userId: string, creditLimit: number = 5.0): Promise<boolean> {
    const usage = await this.getUserUsage(userId);
    if (!usage) return true; // Allow if we can't check

    const withinLimit = usage.total_cost < creditLimit;
    if (!withinLimit) {
      console.warn(`⚠️ [AIStorage] User ${userId} exceeded credit limit: $${usage.total_cost.toFixed(2)} / $${creditLimit}`);
    }
    return withinLimit;
  }

  /**
   * Clear user's chat history (keep usage stats)
   */
  async clearMessages(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ai_user_data')
        .update({ messages: [], updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (error) {
        console.error('❌ [AIStorage] Clear messages error:', error);
        return false;
      }

      console.log('✅ [AIStorage] Cleared messages for user');
      return true;
    } catch (error) {
      console.error('❌ [AIStorage] Clear failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const aiStorageService = new AIStorageService();
