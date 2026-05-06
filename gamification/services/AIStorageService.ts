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
  // AI-suggested follow-up questions (1-2 strings, only on assistant messages)
  suggestedFollowUps?: string[];
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

export interface AIUserData {
  user_id: string;
  messages: StoredMessage[];
  usage: UsageStats;
  monthly_usage?: MonthlyUsage;
  created_at: string;
  updated_at: string;
}

class AIStorageService {
  private bucket = 'ai-images';

  /**
   * Get first day of next month (quota reset date)
   */
  private getResetDate(): string {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString().split('T')[0];
  }

  /**
   * Check if user can make a request.
   * Quota enforcement is now handled server-side by the backend.
   * This method always allows the request; the backend will return 429 if quota is exceeded.
   * Kept for backward compatibility with AIChatModal.
   */
  async checkQuota(
    _userId: string,
    _requestType: 'chat' | 'image_generate' | 'image_edit' | 'image_analyze',
    _isSubscriber: boolean = false
  ): Promise<{ allowed: boolean; remaining: number; limit: number; resetDate: string }> {
    return {
      allowed: true,
      remaining: -1,
      limit: -1,
      resetDate: this.getResetDate(),
    };
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
   * Track usage after an AI request.
   * Actual quota enforcement and usage tracking is now handled by the backend.
   * This method is kept for backward compatibility with AIChatModal;
   * it just logs the event client-side.
   */
  async trackUsage(
    _userId: string,
    requestType: 'chat' | 'image_generate' | 'image_edit' | 'image_analyze'
  ): Promise<boolean> {
    console.log(`📊 [AIStorage] Usage tracked (client-side): ${requestType}`);
    return true;
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
