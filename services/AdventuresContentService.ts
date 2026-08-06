// Adventures Content Service - AsyncStorage Cache + Supabase Real-time Sync
// Manages local caching with real-time updates for adventure content

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/hooks/lib/supabase';
import type { Adventure } from '@/components/shared/types';
import { analyticsService } from './AnalyticsService';

type UpdateCallback = (eventType: string, data: Adventure) => void;

class AdventuresContentService {
  private realtimeSubscription: any = null;
  private listeners = new Set<UpdateCallback>();

  // ============= CACHE OPERATIONS (ASYNC) =============

  /**
   * Load adventures from AsyncStorage cache
   */
  async loadFromCache(eraId: string): Promise<Adventure[] | null> {
    try {
      const startTime = Date.now();
      const cached = await AsyncStorage.getItem(`content_era_${eraId}`);
      if (cached) {
        const data = JSON.parse(cached);
        // AFF-579: Track cache fetch time
        analyticsService.trackContentFetchTime({
          fetch_time_ms: Date.now() - startTime,
          era_id: eraId,
          record_count: data.length,
          source: 'cache',
        });
        console.log(`⚡ Loaded ${data.length} adventures from cache (era: ${eraId})`);
        return data;
      }
      console.log(`📭 No cache found for era: ${eraId}`);
      return null;
    } catch (error) {
      console.error('❌ Error loading from cache:', error);
      return null;
    }
  }

  /**
   * Save adventures to AsyncStorage cache
   */
  async saveToCache(eraId: string, adventures: Adventure[]) {
    try {
      await AsyncStorage.setItem(`content_era_${eraId}`, JSON.stringify(adventures));
      console.log(`💾 Saved ${adventures.length} adventures to cache (era: ${eraId})`);
    } catch (error) {
      console.error('❌ Error saving to cache:', error);
    }
  }

  /**
   * Check if cache exists for an era
   */
  async hasCache(eraId: string): Promise<boolean> {
    try {
      const cached = await AsyncStorage.getItem(`content_era_${eraId}`);
      return cached !== null;
    } catch (error) {
      console.error('❌ Error checking cache:', error);
      return false;
    }
  }

  /**
   * Clear cache for an era
   */
  async clearCache(eraId: string) {
    try {
      await AsyncStorage.removeItem(`content_era_${eraId}`);
      console.log(`🗑️ Cleared cache for era: ${eraId}`);
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
    }
  }

  /**
   * Clear all cached adventures
   */
  async clearAllCaches() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const contentKeys = keys.filter(key => key.startsWith('content_era_'));
      await AsyncStorage.multiRemove(contentKeys);
      console.log('🗑️ Cleared all content caches');
    } catch (error) {
      console.error('❌ Error clearing all caches:', error);
    }
  }

  // ============= SUPABASE OPERATIONS =============

  /**
   * Fetch adventures from Supabase content table
   */
  async fetchFromSupabase(eraId: string): Promise<Adventure[]> {
    console.log(`📥 Fetching adventures from Supabase (era: ${eraId})...`);

    const startTime = Date.now();
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('era_id', eraId)
      .order('order_by', { ascending: true });

    if (error) {
      console.error('❌ Supabase fetch error:', error);
      throw error;
    }

    // AFF-579: Track Supabase fetch time
    analyticsService.trackContentFetchTime({
      fetch_time_ms: Date.now() - startTime,
      era_id: eraId,
      record_count: data?.length || 0,
      source: 'supabase',
    });

    console.log(`✅ Fetched ${data?.length || 0} adventures from Supabase`);
    return data || [];
  }

  // ============= MAIN LOAD FUNCTION =============

  /**
   * Load adventures (cache-first, then Supabase if needed)
   */
  async loadAdventures(eraId: string): Promise<Adventure[]> {
    // Try cache first
    const cached = await this.loadFromCache(eraId);

    if (cached === null) {
      // No cache - fetch from Supabase
      console.log('🌐 No cache, fetching from Supabase...');
      const fresh = await this.fetchFromSupabase(eraId);
      await this.saveToCache(eraId, fresh);
      return fresh;
    }

    // Cache exists - return immediately
    console.log('⚡ Using cached data');
    return cached;
  }

  // ============= REAL-TIME SUBSCRIPTION =============

  /**
   * Start real-time subscription (called when app opens)
   */
  startRealtimeSync() {
    if (this.realtimeSubscription) {
      return;
    }

    console.log('🔄 Starting real-time subscription for content table...');

    this.realtimeSubscription = supabase
      .channel('content_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'content' },
        (payload) => {
          console.log('🔔 Real-time update received:', payload.eventType);
          this.handleRealtimeUpdate(payload);
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });
  }

  /**
   * Stop real-time subscription (called when app closes)
   */
  stopRealtimeSync() {
    if (this.realtimeSubscription) {
      supabase.removeChannel(this.realtimeSubscription);
      this.realtimeSubscription = null;
    }
  }

  // ============= REAL-TIME UPDATE HANDLER =============

  /**
   * Handle real-time updates from Supabase
   * Fetches fresh data from Supabase to avoid mixing stale cached data
   */
  private async handleRealtimeUpdate(payload: any) {
    const { eventType, new: newData, old: oldData } = payload;
    const eraId = newData?.era_id || oldData?.era_id;

    console.log('🔄 Handling real-time update for era:', eraId);

    if (!eraId) {
      console.warn('⚠️ No era_id in update');
      return;
    }

    // Fetch fresh data from Supabase instead of mixing with old cache
    // This prevents pollution of cache with old data missing new columns
    console.log('🌐 Fetching fresh data from Supabase to update cache...');
    const freshData = await this.fetchFromSupabase(eraId);

    // Save fresh cache (replaces old cache completely)
    console.log('💾 Saving fresh cache...');
    await this.saveToCache(eraId, freshData);
    console.log('✅ Cache updated with fresh data');

    // Notify listeners with the specific changed item (update UI)
    console.log('📢 Notifying listeners...');
    this.notifyListeners(eventType, newData || oldData);
  }

  // ============= LISTENER MANAGEMENT =============

  /**
   * Add listener for real-time updates
   */
  addListener(callback: UpdateCallback) {
    this.listeners.add(callback);
  }

  /**
   * Remove listener
   */
  removeListener(callback: UpdateCallback) {
    this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of updates
   */
  private notifyListeners(eventType: string, data: Adventure) {
    this.listeners.forEach(callback => {
      try {
        callback(eventType, data);
      } catch (error) {
        console.error('❌ Listener error:', error);
      }
    });
  }
}

// Export singleton instance
export const adventuresContentService = new AdventuresContentService();
