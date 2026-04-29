import { useMemo } from 'react';

interface Achievement {
  id: string;
  unlocked: boolean;
}

// Pick the first 3 unlocked achievements; if fewer than 3 are unlocked,
// fall back to the first 3 in the master list so the row always renders
// the same number of slots.
export function useDisplayedAchievements<T extends Achievement>(achievements: T[]) {
  return useMemo(() => {
    const unlocked = achievements.filter((a) => a.unlocked);
    if (unlocked.length >= 3) return unlocked.slice(0, 3);
    return achievements.slice(0, 3);
  }, [achievements]);
}
