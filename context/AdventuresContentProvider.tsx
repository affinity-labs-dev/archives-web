// Adventures Content Provider - React Context for cached adventure content
// Wraps AdventuresContentService in React Context with state management

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adventuresContentService } from '@/services/AdventuresContentService';
import type { Adventure } from '@/components/shared/types';

interface AdventuresContentContextType {
  getAdventures: (eraId: number) => Promise<Adventure[]>;
  adventures: Record<number, Adventure[]>;
  isLoading: boolean;
  error: string | null;
  refreshAdventures: (eraId: number) => Promise<void>;
}

const AdventuresContentContext = createContext<AdventuresContentContextType | undefined>(undefined);

export function AdventuresContentProvider({ children }: { children: React.ReactNode }) {
  const [adventures, setAdventures] = useState<Record<number, Adventure[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load adventures for an era (cache-first)
   */
  const getAdventures = useCallback(async (eraId: number): Promise<Adventure[]> => {
    try {
      setIsLoading(true);
      setError(null);

      // Load from cache or Supabase
      const data = await adventuresContentService.loadAdventures(eraId);

      // Update state
      setAdventures(prev => ({ ...prev, [eraId]: data }));
      setIsLoading(false);

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load adventures';
      console.error('❌ Error loading adventures:', errorMsg);
      setError(errorMsg);
      setIsLoading(false);
      throw err;
    }
  }, []); // No dependencies - stable function

  /**
   * Force refresh from Supabase (ignores cache)
   */
  const refreshAdventures = useCallback(async (eraId: number) => {
    try {
      console.log(`🔄 Force refresh for era ${eraId}`);
      const fresh = await adventuresContentService.fetchFromSupabase(eraId);
      adventuresContentService.saveToCache(eraId, fresh);
      setAdventures(prev => ({ ...prev, [eraId]: fresh }));
      console.log(`✅ Refresh complete for era ${eraId}`);
    } catch (err) {
      console.error('❌ Refresh error:', err);
    }
  }, []);

  /**
   * Set up real-time subscription when provider mounts
   */
  useEffect(() => {
    adventuresContentService.startRealtimeSync();

    // Listen for real-time updates and update state
    const handleUpdate = (eventType: string, data: Adventure) => {
      setAdventures(prev => {
        const eraId = data.era_id;
        const eraAdventures = prev[eraId] || [];

        let updated: Adventure[];

        if (eventType === 'INSERT') {
          updated = [...eraAdventures, data].sort((a, b) => a.order_by - b.order_by);
        } else if (eventType === 'UPDATE') {
          updated = eraAdventures.map(adv =>
            adv.readable_id === data.readable_id ? data : adv
          );
        } else if (eventType === 'DELETE') {
          updated = eraAdventures.filter(adv => adv.readable_id !== data.readable_id);
        } else {
          return prev;
        }

        return { ...prev, [eraId]: updated };
      });
    };

    adventuresContentService.addListener(handleUpdate);

    return () => {
      adventuresContentService.stopRealtimeSync();
      adventuresContentService.removeListener(handleUpdate);
    };
  }, []);

  return (
    <AdventuresContentContext.Provider value={{ getAdventures, adventures, isLoading, error, refreshAdventures }}>
      {children}
    </AdventuresContentContext.Provider>
  );
}

/**
 * Custom hook to use adventures content context
 */
export function useAdventuresContent() {
  const context = useContext(AdventuresContentContext);
  if (!context) {
    throw new Error('useAdventuresContent must be used within AdventuresContentProvider');
  }
  return context;
}
