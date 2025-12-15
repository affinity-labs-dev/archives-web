// useAchievements.ts - Achievement tracking and unlocking system
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProgress } from '@/context/ProgressContext';
import { useDailyStreak } from './useDailyStreak';

const ACHIEVEMENTS_KEY = 'unlocked_achievements';

export interface UnlockedAchievement {
  id: string;
  unlockedAt: string; // ISO timestamp
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string; // Ionicons name
  category: 'quiz' | 'streak' | 'speed' | 'completion' | 'time' | 'perfectionist';
  color: string;
  unlockCondition: {
    type: 'quiz_perfect' | 'quiz_perfect_streak' | 'streak_days' | 'lessons_in_day' | 'era_complete' | 'all_perfect_era' | 'night_owl' | 'early_bird' | 'total_xp';
    threshold: number;
    metadata?: any; // Additional data like era_id for era-specific achievements
  };
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// Define all achievements
const ACHIEVEMENTS: Achievement[] = [
  // Quiz Achievements
  {
    id: 'first_perfect',
    name: 'First Steps',
    description: 'Score 100% on your first quiz',
    icon: 'checkmark-circle',
    category: 'quiz',
    color: '#3498DB',
    unlockCondition: { type: 'quiz_perfect', threshold: 1 },
    rarity: 'common',
  },
  {
    id: 'quiz_master',
    name: 'Quiz Master',
    description: 'Score 100% on 5 quizzes',
    icon: 'school',
    category: 'quiz',
    color: '#9B59B6',
    unlockCondition: { type: 'quiz_perfect', threshold: 5 },
    rarity: 'rare',
  },
  {
    id: 'perfect_scholar',
    name: 'Perfect Scholar',
    description: 'Score 100% on 10 quizzes',
    icon: 'trophy',
    category: 'quiz',
    color: '#F39C12',
    unlockCondition: { type: 'quiz_perfect', threshold: 10 },
    rarity: 'epic',
  },
  {
    id: 'quiz_legend',
    name: 'Quiz Legend',
    description: 'Score 100% on 20 quizzes',
    icon: 'star',
    category: 'quiz',
    color: '#E74C3C',
    unlockCondition: { type: 'quiz_perfect', threshold: 20 },
    rarity: 'legendary',
  },

  // Streak Achievements
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: 'flame',
    category: 'streak',
    color: '#F39C12',
    unlockCondition: { type: 'streak_days', threshold: 7 },
    rarity: 'rare',
  },
  {
    id: 'month_master',
    name: 'Month Master',
    description: 'Maintain a 30-day streak',
    icon: 'flame',
    category: 'streak',
    color: '#E67E22',
    unlockCondition: { type: 'streak_days', threshold: 30 },
    rarity: 'epic',
  },
  {
    id: 'century_scholar',
    name: 'Century Scholar',
    description: 'Maintain a 100-day streak',
    icon: 'flame',
    category: 'streak',
    color: '#C0392B',
    unlockCondition: { type: 'streak_days', threshold: 100 },
    rarity: 'legendary',
  },

  // Speed Achievements
  {
    id: 'quick_learner',
    name: 'Quick Learner',
    description: 'Complete 3 lessons in one day',
    icon: 'flash',
    category: 'speed',
    color: '#3498DB',
    unlockCondition: { type: 'lessons_in_day', threshold: 3 },
    rarity: 'common',
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Complete 5 lessons in one day',
    icon: 'rocket',
    category: 'speed',
    color: '#E67E22',
    unlockCondition: { type: 'lessons_in_day', threshold: 5 },
    rarity: 'rare',
  },

  // Completion Achievements
  {
    id: 'era_complete_umayyad',
    name: 'Umayyad Expert',
    description: 'Complete all of Umayyad Dynasty era',
    icon: 'ribbon',
    category: 'completion',
    color: '#9B59B6',
    unlockCondition: { type: 'era_complete', threshold: 1, metadata: { era_id: 'umayyad' } },
    rarity: 'epic',
  },
  {
    id: 'era_complete_roi',
    name: 'Rise of Islam Scholar',
    description: 'Complete all of Rise of Islam era',
    icon: 'ribbon',
    category: 'completion',
    color: '#16A085',
    unlockCondition: { type: 'era_complete', threshold: 1, metadata: { era_id: 'rise_of_islam' } },
    rarity: 'epic',
  },

  // Time-based Achievements
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Complete a lesson after 10 PM',
    icon: 'moon',
    category: 'time',
    color: '#34495E',
    unlockCondition: { type: 'night_owl', threshold: 1 },
    rarity: 'common',
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Complete a lesson before 7 AM',
    icon: 'sunny',
    category: 'time',
    color: '#F39C12',
    unlockCondition: { type: 'early_bird', threshold: 1 },
    rarity: 'common',
  },

  // XP Achievements
  {
    id: 'xp_500',
    name: 'Knowledge Seeker',
    description: 'Earn 500 total XP',
    icon: 'trending-up',
    category: 'completion',
    color: '#3498DB',
    unlockCondition: { type: 'total_xp', threshold: 500 },
    rarity: 'rare',
  },
  {
    id: 'xp_1000',
    name: 'Wisdom Collector',
    description: 'Earn 1000 total XP',
    icon: 'analytics',
    category: 'completion',
    color: '#9B59B6',
    unlockCondition: { type: 'total_xp', threshold: 1000 },
    rarity: 'epic',
  },
  {
    id: 'xp_2500',
    name: 'Grand Scholar',
    description: 'Earn 2500 total XP',
    icon: 'flame',
    category: 'completion',
    color: '#E74C3C',
    unlockCondition: { type: 'total_xp', threshold: 2500 },
    rarity: 'legendary',
  },
];

export function useAchievements() {
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { moduleProgress, calculateTotalXP } = useProgress();
  const { streak } = useDailyStreak();

  // Load unlocked achievements
  useEffect(() => {
    loadUnlockedAchievements();
  }, []);

  const loadUnlockedAchievements = async () => {
    try {
      const data = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        // Handle both old format (string[]) and new format (UnlockedAchievement[])
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (typeof parsed[0] === 'string') {
            // Old format - migrate to new format
            const migrated: UnlockedAchievement[] = parsed.map(id => ({
              id,
              unlockedAt: new Date().toISOString(), // Set to now for old achievements
            }));
            setUnlockedAchievements(migrated);
            await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(migrated));
            console.log('🏆 [Achievements] Migrated old format:', migrated.length, 'unlocked');
          } else {
            // New format
            setUnlockedAchievements(parsed);
            console.log('🏆 [Achievements] Loaded:', parsed.length, 'unlocked');
          }
        }
      }
      setIsLoading(false);
    } catch (error) {
      console.error('❌ [Achievements] Error loading:', error);
      setIsLoading(false);
    }
  };

  // Unlock an achievement
  const unlockAchievement = async (achievementId: string) => {
    const unlockedIds = unlockedAchievements.map(a => a.id);
    if (unlockedIds.includes(achievementId)) {
      return; // Already unlocked
    }

    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) return;

    try {
      const newUnlock: UnlockedAchievement = {
        id: achievementId,
        unlockedAt: new Date().toISOString(),
      };
      const updated = [...unlockedAchievements, newUnlock];
      await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(updated));
      setUnlockedAchievements(updated);
      setNewlyUnlocked(achievement);

      console.log('🎉 [Achievements] Unlocked:', achievement.name);
    } catch (error) {
      console.error('❌ [Achievements] Error unlocking:', error);
    }
  };

  // Check all achievements and unlock if conditions met
  const checkAchievements = async () => {
    // Get total XP
    const totalXP = calculateTotalXP(moduleProgress, []);

    // Count perfect quiz scores
    const perfectQuizCount = moduleProgress.filter(
      m => m.quizCompleted && m.quizScore === 5
    ).length;

    // Count lessons completed today
    const today = new Date().toDateString();
    const lessonsToday = moduleProgress.filter(m => {
      if (!m.completedAt) return false;
      const completedDate = new Date(m.completedAt).toDateString();
      return completedDate === today && m.lessonsCompleted && m.lessonsCompleted.length > 0;
    }).length;

    // Check each achievement
    const unlockedIds = unlockedAchievements.map(a => a.id);
    for (const achievement of ACHIEVEMENTS) {
      if (unlockedIds.includes(achievement.id)) continue; // Already unlocked

      let shouldUnlock = false;

      switch (achievement.unlockCondition.type) {
        case 'quiz_perfect':
          shouldUnlock = perfectQuizCount >= achievement.unlockCondition.threshold;
          break;

        case 'streak_days':
          shouldUnlock = streak >= achievement.unlockCondition.threshold;
          break;

        case 'lessons_in_day':
          shouldUnlock = lessonsToday >= achievement.unlockCondition.threshold;
          break;

        case 'total_xp':
          shouldUnlock = totalXP >= achievement.unlockCondition.threshold;
          break;

        // Time-based checks would be done at completion time
        case 'night_owl':
        case 'early_bird':
          // These are checked manually when lesson completes
          break;

        // Era completion would be checked when final module completes
        case 'era_complete':
          // Checked manually
          break;
      }

      if (shouldUnlock) {
        await unlockAchievement(achievement.id);
        break; // Only unlock one per check to show animation
      }
    }
  };

  // Check time-based achievement
  const checkTimeBasedAchievement = async () => {
    const hour = new Date().getHours();

    if (hour >= 22 || hour < 6) {
      // Night Owl (10 PM - 6 AM)
      await unlockAchievement('night_owl');
    } else if (hour >= 5 && hour < 7) {
      // Early Bird (5 AM - 7 AM)
      await unlockAchievement('early_bird');
    }
  };

  // Get achievement by ID
  const getAchievement = (id: string) => {
    return ACHIEVEMENTS.find(a => a.id === id);
  };

  // Get all achievements with unlock status and sorted
  const getAllAchievements = () => {
    const unlockedIds = unlockedAchievements.map(a => a.id);

    const achievementsWithStatus = ACHIEVEMENTS.map(achievement => {
      const unlockedData = unlockedAchievements.find(u => u.id === achievement.id);
      return {
        ...achievement,
        unlocked: unlockedIds.includes(achievement.id),
        unlockedAt: unlockedData?.unlockedAt,
      };
    });

    // Sort: Recently unlocked first, then by progress percentage, then locked
    return achievementsWithStatus.sort((a, b) => {
      // Both unlocked - sort by unlock date (most recent first)
      if (a.unlocked && b.unlocked) {
        return new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime();
      }

      // One unlocked, one locked - unlocked first
      if (a.unlocked) return -1;
      if (b.unlocked) return 1;

      // Both locked - sort by progress
      const progressA = getProgress(a.id);
      const progressB = getProgress(b.id);
      return progressB - progressA;
    });
  };

  // Get achievements by category
  const getAchievementsByCategory = (category: Achievement['category']) => {
    const unlockedIds = unlockedAchievements.map(a => a.id);
    return ACHIEVEMENTS.filter(a => a.category === category).map(achievement => ({
      ...achievement,
      unlocked: unlockedIds.includes(achievement.id),
    }));
  };

  // Get progress towards an achievement
  const getProgress = (achievementId: string) => {
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) return 0;

    const totalXP = calculateTotalXP(moduleProgress, []);
    const perfectQuizCount = moduleProgress.filter(m => m.quizCompleted && m.quizScore === 5).length;

    switch (achievement.unlockCondition.type) {
      case 'quiz_perfect':
        return Math.min(100, (perfectQuizCount / achievement.unlockCondition.threshold) * 100);

      case 'streak_days':
        return Math.min(100, (streak / achievement.unlockCondition.threshold) * 100);

      case 'total_xp':
        return Math.min(100, (totalXP / achievement.unlockCondition.threshold) * 100);

      default:
        const unlockedIds = unlockedAchievements.map(a => a.id);
        return unlockedIds.includes(achievementId) ? 100 : 0;
    }
  };

  // Clear newly unlocked (after animation)
  const clearNewlyUnlocked = () => {
    setNewlyUnlocked(null);
  };

  return {
    achievements: getAllAchievements(),
    unlockedCount: unlockedAchievements.length,
    totalCount: ACHIEVEMENTS.length,
    newlyUnlocked,
    isLoading,
    checkAchievements,
    checkTimeBasedAchievement,
    unlockAchievement,
    getAchievement,
    getAchievementsByCategory,
    getProgress,
    clearNewlyUnlocked,
  };
}
