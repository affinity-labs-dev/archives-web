// useAchievements.ts - Achievement tracking and unlocking system
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGamifiedProgress } from './GamifiedProgress';
import { useDailyStreak } from './useDailyStreak';
import { useAdventuresContent } from '@/context/AdventuresContentProvider';

const ACHIEVEMENTS_KEY = 'unlocked_achievements';

// Create context for shared achievement state
const AchievementsContext = createContext<ReturnType<typeof useAchievementsHook> | null>(null);

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
  {
    id: 'era_complete_women_of_islam',
    name: 'Women of Islam Scholar',
    description: 'Complete all of Women of Islam era',
    icon: 'ribbon',
    category: 'completion',
    color: '#E91E63',
    unlockCondition: { type: 'era_complete', threshold: 1, metadata: { era_id: 'women_of_islam' } },
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

// Hook implementation (internal)
function useAchievementsHook() {
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);
  const [unlockedQueue, setUnlockedQueue] = useState<Achievement[]>([]); // Queue for multiple achievements
  const [currentUnlocked, setCurrentUnlocked] = useState<Achievement | null>(null); // Currently showing achievement
  const [isLoading, setIsLoading] = useState(true);

  // Cache era module counts for progress calculation
  const [eraModuleCounts, setEraModuleCounts] = useState<Record<string, { total: number; completed: number }>>({});

  // Load new era progress data for direct calculation in getProgress
  const [newUserProgress, setNewUserProgress] = useState<any[]>([]);

  // Track achievements currently being unlocked to prevent duplicates
  const unlockingRef = React.useRef<Set<string>>(new Set());

  const { moduleProgress, calculateTotalXP } = useGamifiedProgress();
  const { streak } = useDailyStreak();
  const { getAdventures } = useAdventuresContent();

  // Load unlocked achievements
  useEffect(() => {
    loadUnlockedAchievements();
  }, []);

  // Load new era progress data
  useEffect(() => {
    const loadNewProgress = async () => {
      try {
        const data = await AsyncStorage.getItem('new_user_progress');
        if (data) {
          setNewUserProgress(JSON.parse(data));
        }
      } catch (error) {
        console.error('❌ [Achievements] Error loading new progress:', error);
      }
    };
    loadNewProgress();
  }, []);

  // Process achievement unlock queue - show next achievement when current is dismissed
  useEffect(() => {
    console.log(`🎊 [Queue Effect] Queue length: ${unlockedQueue.length}, Current: ${currentUnlocked?.name || 'none'}`);
    if (unlockedQueue.length > 0 && !currentUnlocked) {
      // Show next achievement in queue
      const [nextAchievement, ...remainingQueue] = unlockedQueue;
      setCurrentUnlocked(nextAchievement);
      setUnlockedQueue(remainingQueue);
      console.log(`🎊 [Achievements] Showing ${nextAchievement.name} (${remainingQueue.length} more in queue)`);
    }
  }, [unlockedQueue, currentUnlocked]);

  const loadUnlockedAchievements = async () => {
    try {
      const data = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        // Handle both old format (string[]) and new format (UnlockedAchievement[])
        if (Array.isArray(parsed) && parsed.length > 0) {
          let achievements: UnlockedAchievement[];

          if (typeof parsed[0] === 'string') {
            // Old format - migrate to new format
            achievements = parsed.map(id => ({
              id,
              unlockedAt: new Date().toISOString(), // Set to now for old achievements
            }));
            await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));
            console.log('🏆 [Achievements] Migrated old format:', achievements.length, 'unlocked');
          } else {
            // New format
            achievements = parsed;
            console.log('🏆 [Achievements] Loaded:', achievements.length, 'unlocked');
          }

          setUnlockedAchievements(achievements);

          // Populate ref with already unlocked achievements to prevent showing animations again
          achievements.forEach(a => {
            unlockingRef.current.add(a.id);
          });
          console.log('🔒 [Achievements] Protected from re-unlocking:', achievements.length, 'achievements');
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

    // Check if already unlocked OR currently being unlocked
    if (unlockedIds.includes(achievementId) || unlockingRef.current.has(achievementId)) {
      console.log(`⏭️ [Achievements] Skipping ${achievementId} - already unlocked or in progress`);
      return;
    }

    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) return;

    // Mark as being unlocked to prevent duplicates
    unlockingRef.current.add(achievementId);

    try {
      const newUnlock: UnlockedAchievement = {
        id: achievementId,
        unlockedAt: new Date().toISOString(),
      };
      const updated = [...unlockedAchievements, newUnlock];
      await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(updated));
      setUnlockedAchievements(updated);

      // Add to queue instead of setting single achievement
      setUnlockedQueue(prev => {
        const newQueue = [...prev, achievement];
        console.log(`🎊 [Achievements] Added to queue: ${achievement.name} (queue length: ${newQueue.length})`);
        return newQueue;
      });

      console.log('🎉 [Achievements] Unlocked:', achievement.name);
    } catch (error) {
      console.error('❌ [Achievements] Error unlocking:', error);
    } finally {
      // Keep in the set - don't remove so it acts as permanent guard
      // (The unlockedAchievements state check will also prevent re-unlocking)
    }
  };

  // Helper: Get total and completed quiz scores for an era
  // All eras use same calculation: Sum of correct answers / (modules × 5 questions)
  const getEraModuleCount = async (eraId: string, newModules: any[]): Promise<{ total: number; completed: number }> => {
    try {
      // Get module count from Supabase (works for ALL eras including Umayyad)
      const adventures = await getAdventures(eraId);
      const totalModules = adventures.reduce((sum, adv) => sum + (adv.content_list?.length || 0), 0);
      const totalPossible = totalModules * 5; // Each module has 5 questions

      // ALL eras (including Umayyad) read from newModules (new_user_progress storage)
      const eraModules = newModules.filter((m: any) => m.era_id === eraId && m.quizCompleted);
      const totalCorrect = eraModules.reduce((sum: number, m: any) => sum + (m.quizCorrectAnswers || 0), 0);

      console.log(`🏆 [Era ${eraId}] Quiz score: ${totalCorrect}/${totalPossible} correct answers`);
      return { total: totalPossible, completed: totalCorrect };
    } catch (error) {
      console.error(`❌ Error counting quiz scores for era ${eraId}:`, error);
      return { total: 0, completed: 0 };
    }
  };

  // Check all achievements and unlock if conditions met
  const checkAchievements = async () => {
    console.log('🏆 [Achievements] checkAchievements() STARTED');

    // Load new era progress data
    let newModules: any[] = [];
    try {
      const newModulesData = await AsyncStorage.getItem('new_user_progress');
      newModules = newModulesData ? JSON.parse(newModulesData) : [];
      console.log('🏆 [Achievements] Loaded progress data:', newModules.length, 'modules');
    } catch (error) {
      console.error('❌ Error loading new progress for achievements:', error);
    }

    // Get total XP from BOTH eras
    const totalXP = calculateTotalXP(moduleProgress, newModules);

    // Count perfect quiz scores from ALL eras (all use new_user_progress)
    // Perfect = quizCorrectAnswers === 5 OR quizScore === 3 (3 stars)
    const perfectQuizCount = newModules.filter(
      m => m.quizCompleted && (m.quizCorrectAnswers === 5 || m.quizScore === 3)
    ).length;

    console.log(`🏆 [Achievements] Perfect quiz count: ${perfectQuizCount}`);
    console.log(`🏆 [Achievements] Total XP: ${totalXP}`);

    // Count lessons completed today (only from new eras - legacy era doesn't track completedAt)
    const today = new Date().toDateString();

    // New eras: Count modules completed today (each module = 2 lessons)
    const lessonsToday = newModules.filter((m: any) => {
      if (!m.completedAt) return false;
      const completedDate = new Date(m.completedAt).toDateString();
      return completedDate === today;
    }).length * 2; // Each module has 2 lessons
    console.log(`🏆 [Achievements] Lessons today: ${lessonsToday}`);
    console.log(`🏆 [Achievements] Current streak: ${streak} days`);

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

        // Era completion check (dynamic - works for any era added to Supabase)
        case 'era_complete':
          const eraId = achievement.unlockCondition.metadata?.era_id;
          if (eraId) {
            const { total, completed } = await getEraModuleCount(eraId, newModules);

            // Cache the counts for progress calculation (used by getProgress)
            setEraModuleCounts(prev => ({
              ...prev,
              [eraId]: { total, completed }
            }));

            shouldUnlock = completed >= total && total > 0;
            console.log(`🏆 [Era Complete Check] ${eraId}: ${completed}/${total} correct answers (${Math.round((completed/total)*100)}%) - ${shouldUnlock ? 'UNLOCKED!' : 'Not yet'}`);
          }
          break;
      }

      if (shouldUnlock) {
        await unlockAchievement(achievement.id);
        // Continue checking other achievements (removed break to unlock all pending achievements)
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
    if (!achievement) {
      console.log(`⚠️ [Progress] Achievement not found: ${achievementId}`);
      return 0;
    }

    const totalXP = calculateTotalXP(moduleProgress, newUserProgress);

    // Count perfect quizzes from newUserProgress (unified system)
    const perfectQuizCount = newUserProgress.filter(
      m => m.quizCompleted && (m.quizCorrectAnswers === 5 || m.quizScore === 3)
    ).length;

    switch (achievement.unlockCondition.type) {
      case 'quiz_perfect':
        const progress = Math.min(100, (perfectQuizCount / achievement.unlockCondition.threshold) * 100);
        // console.log(`📊 [Progress] ${achievement.name}: ${perfectQuizCount}/${achievement.unlockCondition.threshold} perfect quizzes = ${progress}%`);
        return progress;

      case 'streak_days':
        return Math.min(100, (streak / achievement.unlockCondition.threshold) * 100);

      case 'total_xp':
        return Math.min(100, (totalXP / achievement.unlockCondition.threshold) * 100);

      case 'era_complete': {
        // Calculate incremental progress based on quiz scores (correct answers)
        const eraId = achievement.unlockCondition.metadata?.era_id;
        if (!eraId) return 0;

        // Try using cached counts first (works for ALL eras including Umayyad)
        const cachedCounts = eraModuleCounts[eraId];
        if (cachedCounts && cachedCounts.total > 0) {
          return Math.min(100, (cachedCounts.completed / cachedCounts.total) * 100);
        }

        // Fallback: Calculate directly from newUserProgress (ALL eras use same storage)
        const eraModules = newUserProgress.filter((m: any) => m.era_id === eraId && m.quizCompleted);
        if (eraModules.length === 0) return 0; // No quizzes completed yet

        const totalCorrect = eraModules.reduce((sum: number, m: any) => sum + (m.quizCorrectAnswers || 0), 0);
        const estimatedTotal = 15 * 5; // 75 questions (fallback until cache populates)
        return Math.min(100, (totalCorrect / estimatedTotal) * 100);
      }

      default:
        const unlockedIds = unlockedAchievements.map(a => a.id);
        return unlockedIds.includes(achievementId) ? 100 : 0;
    }
  };

  // Clear newly unlocked (after animation)
  // Clear current achievement and show next in queue
  const clearNewlyUnlocked = () => {
    console.log(`🎊 [Achievements] Dismissed achievement, ${unlockedQueue.length} remaining in queue`);
    setCurrentUnlocked(null); // This triggers useEffect to show next achievement
  };

  return {
    achievements: getAllAchievements(),
    unlockedCount: unlockedAchievements.length,
    totalCount: ACHIEVEMENTS.length,
    newlyUnlocked: currentUnlocked, // Return currently showing achievement
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

// Provider component to share state across all components
export function AchievementsProvider({ children }: { children: React.ReactNode }) {
  const achievements = useAchievementsHook();
  return React.createElement(
    AchievementsContext.Provider,
    { value: achievements },
    children
  );
}

// Hook to consume the context
export function useAchievements() {
  const context = useContext(AchievementsContext);
  if (!context) {
    throw new Error('useAchievements must be used within AchievementsProvider');
  }
  return context;
}
