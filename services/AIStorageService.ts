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

export interface AIUserData {
  user_id: string;
  messages: StoredMessage[];
  usage: UsageStats;
  created_at: string;
  updated_at: string;
}

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
      const { error } = await supabase
        .from('ai_user_data')
        .upsert(
          {
            user_id: userId,
            messages: messages,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('❌ [AIStorage] Save messages error:', error);
        return false;
      }

      console.log('✅ [AIStorage] Saved messages:', messages.length);
      return true;
    } catch (error) {
      console.error('❌ [AIStorage] Save failed:', error);
      return false;
    }
  }

  /**
   * Update usage stats after an AI request
   */
  async trackUsage(
    userId: string,
    requestType: 'chat' | 'image_generate' | 'image_edit' | 'image_analyze'
  ): Promise<boolean> {
    try {
      // First, get current usage
      const { data: existing } = await supabase
        .from('ai_user_data')
        .select('usage')
        .eq('user_id', userId)
        .single();

      const cost = COST_ESTIMATES[requestType];

      // Build updated usage object
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

      // Upsert the updated usage
      const { error } = await supabase
        .from('ai_user_data')
        .upsert(
          {
            user_id: userId,
            usage: updatedUsage,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('❌ [AIStorage] Track usage error:', error);
        return false;
      }

      console.log(`📊 [AIStorage] Tracked ${requestType}, total cost: $${updatedUsage.total_cost.toFixed(4)}`);
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
