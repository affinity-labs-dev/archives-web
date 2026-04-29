import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { NewUserProgress } from '@/components/profile/types';

interface Args {
  moduleProgress: unknown;
  newUserProgress: NewUserProgress[];
  calculateTotalXP: () => number;
}

// Prefer the AsyncStorage `totalXP` snapshot over recomputing — the
// stored value is what the rest of the app (achievements, AI quota,
// etc.) treats as authoritative. Falls back to live calculation only
// when the snapshot hasn't been written yet (fresh install or the
// migration didn't seed it).
export function useStoredTotalXP({
  moduleProgress,
  newUserProgress,
  calculateTotalXP,
}: Args) {
  const [storedTotalXP, setStoredTotalXP] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const xpData = await AsyncStorage.getItem('totalXP');
        if (xpData) setStoredTotalXP(JSON.parse(xpData));
      } catch (error) {
        console.error('Error loading stored totalXP:', error);
      }
    })();
  }, [moduleProgress, newUserProgress]);

  return useMemo(() => {
    if (storedTotalXP !== null) return storedTotalXP;
    return calculateTotalXP() || 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedTotalXP, moduleProgress, newUserProgress, calculateTotalXP]);
}
