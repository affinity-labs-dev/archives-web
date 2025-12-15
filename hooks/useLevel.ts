// useLevel.ts - Calculate user level from total XP
import { useState, useEffect } from 'react';
import { useProgress } from '@/context/ProgressContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_LEVEL_KEY = 'last_user_level';

export interface Level {
  level: number;
  name: string;
  minXP: number;
  maxXP: number;
  color: string;
}

const LEVELS: Level[] = [
  { level: 1, name: 'Seeker', minXP: 0, maxXP: 100, color: '#95A5A6' },
  { level: 2, name: 'Student', minXP: 100, maxXP: 250, color: '#3498DB' },
  { level: 3, name: 'Scholar', minXP: 250, maxXP: 500, color: '#9B59B6' },
  { level: 4, name: 'Sage', minXP: 500, maxXP: 1000, color: '#E67E22' },
  { level: 5, name: 'Master', minXP: 1000, maxXP: 2000, color: '#F39C12' },
  { level: 6, name: 'Grand Master', minXP: 2000, maxXP: Infinity, color: '#C0392B' },
];

export function useLevel() {
  const { moduleProgress, calculateTotalXP } = useProgress();
  const [currentLevel, setCurrentLevel] = useState<Level>(LEVELS[0]);
  const [didLevelUp, setDidLevelUp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    calculateLevel();
  }, [moduleProgress]);

  const calculateLevel = async () => {
    try {
      const totalXP = calculateTotalXP(moduleProgress, []);

      // Find current level based on XP
      const level = LEVELS.find((l) => totalXP >= l.minXP && totalXP < l.maxXP) || LEVELS[LEVELS.length - 1];

      // Check if user leveled up
      const lastLevelStr = await AsyncStorage.getItem(LAST_LEVEL_KEY);
      const lastLevel = lastLevelStr ? parseInt(lastLevelStr) : 0;

      if (level.level > lastLevel && lastLevel > 0) {
        setDidLevelUp(true);
        console.log('🎉 [useLevel] Level up!', level.level);

        // Reset level-up flag after 5 seconds
        setTimeout(() => setDidLevelUp(false), 5000);
      }

      // Save current level
      await AsyncStorage.setItem(LAST_LEVEL_KEY, level.level.toString());

      setCurrentLevel(level);
      setIsLoading(false);
    } catch (error) {
      console.error('❌ [useLevel] Error calculating level:', error);
      setCurrentLevel(LEVELS[0]);
      setIsLoading(false);
    }
  };

  const getProgress = () => {
    const totalXP = calculateTotalXP(moduleProgress, []);
    const xpInCurrentLevel = totalXP - currentLevel.minXP;
    const xpNeededForNextLevel = currentLevel.maxXP - currentLevel.minXP;

    if (currentLevel.maxXP === Infinity) {
      return 100; // Max level
    }

    return Math.min(100, (xpInCurrentLevel / xpNeededForNextLevel) * 100);
  };

  const getNextLevel = () => {
    const nextLevelIndex = LEVELS.findIndex((l) => l.level === currentLevel.level) + 1;
    return nextLevelIndex < LEVELS.length ? LEVELS[nextLevelIndex] : null;
  };

  const getTotalXP = () => calculateTotalXP(moduleProgress, []);

  const refresh = () => {
    calculateLevel();
  };

  return {
    currentLevel,
    nextLevel: getNextLevel(),
    progress: getProgress(),
    totalXP: getTotalXP(),
    didLevelUp,
    isLoading,
    allLevels: LEVELS,
    refresh,
  };
}
