// useDailyStreak.ts - Track daily learning streaks
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyticsService } from '@/services/AnalyticsService';

const STREAK_KEY = 'daily_streak';
const LAST_ACTIVE_KEY = 'last_active_date';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
}

export function useDailyStreak() {
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewDay, setIsNewDay] = useState(false);

  useEffect(() => {
    loadStreak();
  }, []);

  const loadStreak = async () => {
    try {
      const [streakData, lastActive] = await Promise.all([
        AsyncStorage.getItem(STREAK_KEY),
        AsyncStorage.getItem(LAST_ACTIVE_KEY),
      ]);

      const today = new Date().toDateString();
      const data: StreakData = streakData ? JSON.parse(streakData) : { currentStreak: 0, longestStreak: 0, lastActiveDate: '' };

      if (!lastActive || lastActive !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        if (lastActive === yesterdayStr) {
          // Consecutive day - increment streak
          data.currentStreak += 1;
          setIsNewDay(true);
        } else if (lastActive && lastActive !== today) {
          // Missed days - reset streak
          data.currentStreak = 1;
        } else if (!lastActive) {
          // First time
          data.currentStreak = 1;
        }

        // Update longest streak
        if (data.currentStreak > data.longestStreak) {
          data.longestStreak = data.currentStreak;
        }

        // Save updated data
        await Promise.all([
          AsyncStorage.setItem(STREAK_KEY, JSON.stringify(data)),
          AsyncStorage.setItem(LAST_ACTIVE_KEY, today),
        ]);

        // Update PostHog person properties with streak data
        analyticsService.updateProgressProperties({
          current_streak: data.currentStreak,
          current_streak_date: today,
          longest_streak: data.longestStreak,
        });

        console.log('🔥 [useDailyStreak] Streak updated:', data.currentStreak);
      }

      setStreak(data.currentStreak);
      setLongestStreak(data.longestStreak);
      setIsLoading(false);
    } catch (error) {
      console.error('❌ [useDailyStreak] Error loading streak:', error);
      setStreak(0);
      setLongestStreak(0);
      setIsLoading(false);
    }
  };

  const resetStreak = async () => {
    try {
      await AsyncStorage.removeItem(STREAK_KEY);
      await AsyncStorage.removeItem(LAST_ACTIVE_KEY);
      setStreak(0);
      setLongestStreak(0);
      console.log('🗑️ [useDailyStreak] Streak reset');
    } catch (error) {
      console.error('❌ [useDailyStreak] Error resetting streak:', error);
    }
  };

  const getStreakBonus = () => {
    if (streak >= 30) return 0.5; // 50% bonus
    if (streak >= 14) return 0.3; // 30% bonus
    if (streak >= 7) return 0.2; // 20% bonus
    if (streak >= 3) return 0.1; // 10% bonus
    return 0;
  };

  const refresh = () => {
    loadStreak();
  };

  return {
    streak,
    longestStreak,
    isLoading,
    isNewDay,
    streakBonus: getStreakBonus(),
    resetStreak,
    refresh,
  };
}
