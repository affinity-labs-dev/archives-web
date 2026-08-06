// useEras.ts - Fetch and cache eras from Supabase
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

// Era status enum matching Supabase
export type EraStatus = 'active' | 'premium' | 'founding' | 'coming_soon';
export type EraCardLayout = 'full_width' | 'grid';

// Era type matching Supabase schema
export interface Era {
  era_id: string;
  title: string;
  timeline: string;
  description: string | null;
  icon_url: string | null;
  bg_url: string | null;
  status: EraStatus;
  card_layout: EraCardLayout;
  design: string;
  order_by: number;
}

interface UseErasReturn {
  eras: Era[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const CACHE_KEY = 'cached_eras';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

interface CachedData {
  eras: Era[];
  timestamp: number;
}

export function useEras(): UseErasReturn {
  const [eras, setEras] = useState<Era[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEras = useCallback(async (useCache = true) => {
    try {
      setLoading(true);
      setError(null);

      // Try to load from cache first
      if (useCache) {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const { eras: cachedEras, timestamp }: CachedData = JSON.parse(cached);
          const isExpired = Date.now() - timestamp > CACHE_EXPIRY_MS;

          if (!isExpired && cachedEras.length > 0) {
            console.log('🗂️ [useEras] Using cached eras');
            setEras(cachedEras);
            setLoading(false);
            return;
          }
        }
      }

      // Fetch from Supabase
      console.log('🌐 [useEras] Fetching eras from Supabase...');
      const { data, error: supabaseError } = await supabase
        .from('eras')
        .select('*')
        .order('order_by', { ascending: true });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      if (!data || data.length === 0) {
        throw new Error('No eras found');
      }

      console.log(`✅ [useEras] Fetched ${data.length} eras`);

      // Cache the results
      const cacheData: CachedData = {
        eras: data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

      setEras(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch eras';
      console.error('❌ [useEras] Error:', message);
      setError(message);

      // Try to use cached data as fallback
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const { eras: cachedEras }: CachedData = JSON.parse(cached);
          if (cachedEras.length > 0) {
            console.log('🗂️ [useEras] Using stale cache as fallback');
            setEras(cachedEras);
          }
        }
      } catch {
        // Ignore cache read errors
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch without cache
  const refetch = useCallback(async () => {
    await fetchEras(false);
  }, [fetchEras]);

  useEffect(() => {
    fetchEras(true);

    // Subscribe to realtime changes on eras table
    const channel = supabase
      .channel('eras-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'eras' },
        (payload) => {
          console.log('🔄 [useEras] Realtime update received:', payload.eventType);
          // Refetch all eras when any change occurs
          fetchEras(false);
        }
      )
      .subscribe((status) => {
        console.log('📡 [useEras] Realtime subscription status:', status);
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('🔌 [useEras] Unsubscribing from realtime');
      supabase.removeChannel(channel);
    };
  }, [fetchEras]);

  return { eras, loading, error, refetch };
}

// Helper to check if an era is accessible based on status
export function isEraAccessible(
  status: EraStatus,
  hasSubscription: boolean = false,
  isFoundingMember: boolean = false
): boolean {
  switch (status) {
    case 'active':
      return true;
    case 'premium':
      return hasSubscription;
    case 'founding':
      return isFoundingMember||__DEV__;
    case 'coming_soon':
      return false;
    default:
      return false;
  }
}

// Helper to get the lock message for an era
export function getEraLockMessage(status: EraStatus): string {
  switch (status) {
    case 'premium':
      return 'Premium';
    case 'founding':
      return 'Founding Members';
    case 'coming_soon':
      return 'Coming Soon';
    default:
      return '';
  }
}
