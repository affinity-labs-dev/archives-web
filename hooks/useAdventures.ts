import { useEffect, useState, useCallback } from 'react';
import { useAdventuresContent } from '@/context/AdventuresContentProvider';
import type { Adventure } from '@/components/shared/types';

export function useAdventures(eraId: string) {
  const { getAdventures, refreshAdventures, adventures: contextAdventures } = useAdventuresContent();
  const [adventures, setAdventures] = useState<Adventure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initial load
  useEffect(() => {
    async function loadAdventures() {
      try {
        setLoading(true);
        const data = await getAdventures(eraId);
        setAdventures(data);
        setError(null);
      } catch (err) {
        console.error('❌ Error loading adventures:', err);
        setError(err instanceof Error ? err : new Error('Failed to load adventures'));
      } finally {
        setLoading(false);
      }
    }

    loadAdventures();
  }, [eraId, getAdventures]);

  // Sync with context when real-time updates arrive
  useEffect(() => {
    if (contextAdventures[eraId]) {
      setAdventures(contextAdventures[eraId]);
    }
  }, [contextAdventures, eraId]);

  // Refresh function - forces fresh data from Supabase
  const handleRefresh = useCallback(async () => {
    await refreshAdventures(eraId);
  }, [eraId, refreshAdventures]);

  return { adventures, loading, error, refreshAdventures: handleRefresh };
}

export function useAdventure(readableId: string) {
  const { adventures } = useAdventuresContent();
  const [adventure, setAdventure] = useState<Adventure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!readableId) {
      setLoading(false);
      return;
    }

    console.log(`📊 Looking for adventure: ${readableId} in cached content...`);

    // Search all cached eras for this adventure
    let found: Adventure | null = null;
    for (const eraAdventures of Object.values(adventures)) {
      const match = eraAdventures.find(adv => adv.readable_id === readableId);
      if (match) {
        found = match;
        break;
      }
    }

    if (found) {
      console.log(`✅ Found adventure: ${readableId} in cache`);
      setAdventure(found);
      setError(null);
    } else {
      console.log(`⚠️ Adventure ${readableId} not found in cache`);
      setAdventure(null);
      setError(new Error('Adventure not found in cache'));
    }

    setLoading(false);
  }, [readableId, adventures]);

  return { adventure, loading, error };
}
