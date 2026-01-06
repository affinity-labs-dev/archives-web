/**
 * GamificationOrchestrator Provider
 *
 * TRUE orchestration - One engine with full control over all gamification triggers.
 * Components just report events, orchestrator handles everything:
 * - Checks conditions (XP milestones, adventure complete, streaks, achievements)
 * - Manages celebration queue
 * - Renders celebration UI as overlay
 * - Tracks daily streaks
 * - Manages achievement unlocking
 *
 * Usage:
 * 1. Wrap app with <GamificationOrchestratorProvider>
 * 2. In Quiz.tsx: const { reportQuizComplete } = useGamificationOrchestrator();
 * 3. Call: await reportQuizComplete({ eraId, xpEarned, ... });
 * 4. Orchestrator handles the rest - Quiz doesn't know about celebrations or achievements
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ADVENTURE_KEYS } from '@/constants/WalkthroughKeys';
import { analyticsService } from '@/services/AnalyticsService';
import { useGamifiedProgress, calculateTotalXP as calculateTotalXPUtil } from './GamifiedProgress';
import { useAdventuresContent } from '@/context/AdventuresContentProvider';

// Import celebration screens
import XPMilestoneScreen from '@/gamification/ui/celebrations/XPMilestoneScreen';
import AdventureCompleteScreen from '@/gamification/ui/celebrations/AdventureCompleteScreen';
import { AchievementUnlockAnimation } from '@/gamification/ui/achievement/AchievementGrid';

// ============================================================
// CONSTANTS
// ============================================================

export const XP_MILESTONES = [50, 100, 200, 400, 750] as const;
export const STREAK_MILESTONES = [7, 30, 100] as const;

// Storage keys
const STREAK_KEY = 'daily_streak';
const LAST_ACTIVE_KEY = 'last_active_date';
const ACHIEVEMENTS_KEY = 'unlocked_achievements';

// ============================================================
// ACHIEVEMENT TYPES
// ============================================================

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

// ============================================================
// ALL ACHIEVEMENTS (17 total)
// ============================================================

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

// ============================================================
// TYPES - Era-Agnostic Inputs
// ============================================================

/**
 * Input for quiz completion - components normalize their data to this format.
 */
export interface QuizCompleteInput {
  eraId: string;
  adventureId: string;
  moduleId: string;
  oldEraXP: number; // Era-specific XP before this quiz
  newEraXP: number; // Era-specific XP after this quiz
  adventureModulesCompleted: number; // How many modules done in this adventure
  adventureTotalModules: number; // Total modules in this adventure
  adventureData?: {
    title: string;
    subtitle?: string;
    description?: string;
    backgroundImage?: string;
    totalBadges?: number;
  };
}

/**
 * Input for lesson completion (extensible for future triggers).
 */
export interface LessonCompleteInput {
  eraId: string;
  adventureId: string;
  moduleId: string;
  lessonId: string;
}

// ============================================================
// TYPES - Streak Data
// ============================================================

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  longestStreakDate?: string; // Date when longest streak was achieved
}

// ============================================================
// TYPES - Internal Celebration Queue
// ============================================================

interface XPMilestoneCelebration {
  type: 'XP_MILESTONE';
  milestoneXP: number;
  totalXP: number;
  eraId: string;
}

interface AdventureCompleteCelebration {
  type: 'ADVENTURE_COMPLETE';
  adventureId: string;
  adventureTitle: string;
  adventureSubtitle?: string;
  adventureDescription?: string;
  backgroundImage?: string;
  completedModules: number;
  totalModules: number;
  totalXP: number;
  totalBadges: number;
  eraId: string;
}

interface StreakMilestoneCelebration {
  type: 'STREAK_MILESTONE';
  streakDays: number;
  isNewRecord: boolean;
}

interface AchievementCelebration {
  type: 'ACHIEVEMENT';
  achievement: Achievement;
}

type CelebrationItem = XPMilestoneCelebration | AdventureCompleteCelebration | StreakMilestoneCelebration | AchievementCelebration;

// ============================================================
// CONTEXT
// ============================================================

interface GamificationOrchestratorContextType {
  /** Report quiz completion - orchestrator checks triggers and shows celebrations */
  reportQuizComplete: (input: QuizCompleteInput) => Promise<void>;
  /** Report lesson completion - for future triggers */
  reportLessonComplete: (input: LessonCompleteInput) => Promise<void>;
  /** Check if any celebration is currently showing */
  isCelebrating: boolean;
  /** Current streak data */
  streak: number;
  longestStreak: number;
  isStreakLoading: boolean;
  /** Whether today is a new day (streak just updated) */
  isNewDay: boolean;
  /** Calculate streak bonus multiplier */
  streakBonus: number;
  /** Refresh streak data */
  refreshStreak: () => Promise<void>;

  // ===== ACHIEVEMENTS =====
  /** All achievements with unlock status (sorted: unlocked first, then by progress) */
  achievements: (Achievement & { unlocked: boolean; unlockedAt?: string })[];
  /** Number of unlocked achievements */
  unlockedCount: number;
  /** Total number of achievements */
  totalCount: number;
  /** Whether achievements are loading */
  isAchievementsLoading: boolean;
  /** Get progress (0-100) towards an achievement */
  getProgress: (achievementId: string) => number;
  /** Get achievements filtered by category */
  getAchievementsByCategory: (category: Achievement['category']) => (Achievement & { unlocked: boolean })[];
  /** Get a single achievement by ID */
  getAchievement: (id: string) => Achievement | undefined;
  /** Check time-based achievements (night owl, early bird) - call after lesson completion */
  checkTimeBasedAchievement: () => Promise<void>;
  /** Check all achievements and unlock if conditions met */
  checkAchievements: () => Promise<void>;

  // ===== ERA PROGRESS =====
  /** Get progress for a specific era */
  getEraProgress: (eraId: string) => Promise<EraProgressStats>;
}

/** Era progress data for progress bar (correctAnswers / totalQuestions) */
export interface EraProgressStats {
  correctAnswers: number;
  totalQuestions: number;
  percentage: number;
  totalXP: number;
}

const GamificationOrchestratorContext = createContext<GamificationOrchestratorContextType | null>(null);

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Check if XP crossed a milestone threshold.
 */
function checkXPMilestone(oldXP: number, newXP: number): number | null {
  for (const milestone of XP_MILESTONES) {
    if (oldXP < milestone && newXP >= milestone) {
      return milestone;
    }
  }
  return null;
}

/**
 * Check if user has already seen a specific XP milestone celebration.
 */
async function hasSeenXPMilestone(milestoneXP: number, eraId?: string): Promise<boolean> {
  try {
    const key = ADVENTURE_KEYS.getXPMilestoneKey(milestoneXP, eraId);
    const seen = await AsyncStorage.getItem(key);
    return seen === 'true';
  } catch (error) {
    console.error('❌ [Orchestrator] Error checking XP milestone:', error);
    return false;
  }
}

/**
 * Check if user has already seen adventure complete celebration.
 */
async function hasSeenAdventureComplete(adventureId: string): Promise<boolean> {
  try {
    const key = ADVENTURE_KEYS.getAdventureCompleteKey(adventureId);
    const seen = await AsyncStorage.getItem(key);
    return seen === 'true';
  } catch (error) {
    console.error('❌ [Orchestrator] Error checking adventure complete:', error);
    return false;
  }
}

/**
 * Check if streak crossed a milestone threshold.
 */
function checkStreakMilestone(oldStreak: number, newStreak: number): number | null {
  for (const milestone of STREAK_MILESTONES) {
    if (oldStreak < milestone && newStreak >= milestone) {
      return milestone;
    }
  }
  return null;
}

/**
 * Check if user has already seen a streak milestone celebration.
 */
async function hasSeenStreakMilestone(streakDays: number): Promise<boolean> {
  try {
    const key = `streak_milestone_seen_${streakDays}`;
    const seen = await AsyncStorage.getItem(key);
    return seen === 'true';
  } catch (error) {
    console.error('❌ [Orchestrator] Error checking streak milestone:', error);
    return false;
  }
}

/**
 * Mark streak milestone as seen.
 */
async function markStreakMilestoneSeen(streakDays: number): Promise<void> {
  try {
    const key = `streak_milestone_seen_${streakDays}`;
    await AsyncStorage.setItem(key, 'true');
  } catch (error) {
    console.error('❌ [Orchestrator] Error marking streak milestone seen:', error);
  }
}

/**
 * Calculate streak bonus multiplier based on current streak.
 */
function calculateStreakBonus(streak: number): number {
  if (streak >= 30) return 0.5; // 50% bonus
  if (streak >= 14) return 0.3; // 30% bonus
  if (streak >= 7) return 0.2;  // 20% bonus
  if (streak >= 3) return 0.1;  // 10% bonus
  return 0;
}

// ============================================================
// PROVIDER
// ============================================================

interface GamificationOrchestratorProviderProps {
  children: ReactNode;
}

export function GamificationOrchestratorProvider({ children }: GamificationOrchestratorProviderProps) {
  // Celebration queue - items waiting to be shown
  const [celebrationQueue, setCelebrationQueue] = useState<CelebrationItem[]>([]);
  // Currently displaying celebration
  const [currentCelebration, setCurrentCelebration] = useState<CelebrationItem | null>(null);

  // Streak state
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [isStreakLoading, setIsStreakLoading] = useState(true);
  const [isNewDay, setIsNewDay] = useState(false);
  const streakLoadedRef = useRef(false);

  // Achievement state
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);
  const [isAchievementsLoading, setIsAchievementsLoading] = useState(true);
  const [eraModuleCounts, setEraModuleCounts] = useState<Record<string, { total: number; completed: number }>>({});
  const [newUserProgress, setNewUserProgress] = useState<any[]>([]);
  const unlockingRef = useRef<Set<string>>(new Set());

  // Hooks for achievements calculation
  const { moduleProgress } = useGamifiedProgress();
  const { getAdventures } = useAdventuresContent();

  // Load and update streak on mount
  const loadStreak = useCallback(async () => {
    try {
      const [streakData, lastActive] = await Promise.all([
        AsyncStorage.getItem(STREAK_KEY),
        AsyncStorage.getItem(LAST_ACTIVE_KEY),
      ]);

      const today = new Date().toDateString();
      const data: StreakData = streakData
        ? JSON.parse(streakData)
        : { currentStreak: 0, longestStreak: 0, lastActiveDate: '' };

      const oldStreak = data.currentStreak;

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

        // Update longest streak and track the date when it was achieved
        const isNewRecord = data.currentStreak > data.longestStreak;
        if (isNewRecord) {
          data.longestStreak = data.currentStreak;
          data.longestStreakDate = today;
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
          longest_streak_date: data.longestStreakDate,
        });

        console.log(`🔥 [Orchestrator] Streak updated: ${oldStreak} → ${data.currentStreak}`);

        // Log streak milestone (achievements system handles celebrations)
        if (!streakLoadedRef.current) {
          const milestone = checkStreakMilestone(oldStreak, data.currentStreak);
          if (milestone) {
            console.log(`🎯 [Orchestrator] Streak milestone ${milestone} days reached! Achievement system will handle celebration.`);
          }
        }
      }

      setStreak(data.currentStreak);
      setLongestStreak(data.longestStreak);
      setIsStreakLoading(false);
      streakLoadedRef.current = true;
    } catch (error) {
      console.error('❌ [Orchestrator] Error loading streak:', error);
      setStreak(0);
      setLongestStreak(0);
      setIsStreakLoading(false);
    }
  }, []);

  // Load streak on mount
  useEffect(() => {
    loadStreak();
  }, [loadStreak]);

  // ===== ACHIEVEMENT FUNCTIONS =====

  // Load unlocked achievements from storage
  const loadUnlockedAchievements = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          let achievements: UnlockedAchievement[];

          if (typeof parsed[0] === 'string') {
            // Old format - migrate to new format
            achievements = parsed.map((id: string) => ({
              id,
              unlockedAt: new Date().toISOString(),
            }));
            await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));
            console.log('🏆 [Orchestrator] Migrated old achievement format:', achievements.length, 'unlocked');
          } else {
            achievements = parsed;
            console.log('🏆 [Orchestrator] Loaded achievements:', achievements.length, 'unlocked');
          }

          setUnlockedAchievements(achievements);
          achievements.forEach(a => unlockingRef.current.add(a.id));
        }
      }
      setIsAchievementsLoading(false);
    } catch (error) {
      console.error('❌ [Orchestrator] Error loading achievements:', error);
      setIsAchievementsLoading(false);
    }
  }, []);

  // Load new era progress data for achievements calculation
  const loadNewProgress = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem('new_user_progress');
      if (data) {
        setNewUserProgress(JSON.parse(data));
      }
    } catch (error) {
      console.error('❌ [Orchestrator] Error loading new progress:', error);
    }
  }, []);

  // Load achievements and progress on mount
  useEffect(() => {
    loadUnlockedAchievements();
    loadNewProgress();
  }, [loadUnlockedAchievements, loadNewProgress]);

  // Get era module count for progress calculation
  const getEraModuleCount = useCallback(async (eraId: string, newModules: any[]): Promise<{ total: number; completed: number }> => {
    try {
      const adventures = await getAdventures(eraId);
      // Count actual questions from content_list
      const totalPossible = adventures.reduce((sum, adv) => {
        const advQuestions = (adv.content_list || []).reduce((moduleSum, module) => {
          return moduleSum + (module.questions?.length || 0);
        }, 0);
        return sum + advQuestions;
      }, 0);

      const eraModules = newModules.filter((m: any) => m.era_id === eraId && m.quizCompleted);
      const totalCorrect = eraModules.reduce((sum: number, m: any) => sum + (m.quizCorrectAnswers || 0), 0);

      return { total: totalPossible, completed: totalCorrect };
    } catch (error) {
      console.error(`❌ [Orchestrator] Error counting quiz scores for era ${eraId}:`, error);
      return { total: 0, completed: 0 };
    }
  }, [getAdventures]);

  // Get era progress for progress bar display
  const getEraProgress = useCallback(async (eraId: string): Promise<EraProgressStats> => {
    try {
      const adventures = await getAdventures(eraId);

      // Count actual questions from content_list
      const totalQuestions = adventures.reduce((sum, adv) => {
        const advQuestions = (adv.content_list || []).reduce((moduleSum, module) => {
          return moduleSum + (module.questions?.length || 0);
        }, 0);
        return sum + advQuestions;
      }, 0);

      // Get correct answers from user progress
      const eraModules = newUserProgress.filter((m: any) => m.era_id === eraId && m.quizCompleted);
      const correctAnswers = eraModules.reduce((sum: number, m: any) => sum + (m.quizCorrectAnswers || 0), 0);

      const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
      const totalXP = correctAnswers * 10;

      console.log(`📊 [Orchestrator] Era progress for ${eraId}: ${correctAnswers}/${totalQuestions} (${percentage}%)`);

      return { correctAnswers, totalQuestions, percentage, totalXP };
    } catch (error) {
      console.error(`❌ [Orchestrator] Error getting era progress for ${eraId}:`, error);
      return { correctAnswers: 0, totalQuestions: 0, percentage: 0, totalXP: 0 };
    }
  }, [getAdventures, newUserProgress]);

  // Unlock an achievement
  const unlockAchievement = useCallback(async (achievementId: string) => {
    const unlockedIds = unlockedAchievements.map(a => a.id);

    if (unlockedIds.includes(achievementId) || unlockingRef.current.has(achievementId)) {
      console.log(`⏭️ [Orchestrator] Skipping ${achievementId} - already unlocked or in progress`);
      return;
    }

    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) return;

    unlockingRef.current.add(achievementId);

    try {
      const newUnlock: UnlockedAchievement = {
        id: achievementId,
        unlockedAt: new Date().toISOString(),
      };
      const updated = [...unlockedAchievements, newUnlock];
      await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(updated));
      setUnlockedAchievements(updated);

      // Add achievement celebration to queue
      setCelebrationQueue(prev => [...prev, {
        type: 'ACHIEVEMENT' as const,
        achievement,
      }]);

      console.log('🎉 [Orchestrator] Achievement unlocked:', achievement.name);
    } catch (error) {
      console.error('❌ [Orchestrator] Error unlocking achievement:', error);
    }
  }, [unlockedAchievements]);

  // Check all achievements and unlock if conditions met
  const checkAchievements = useCallback(async () => {
    console.log('🏆 [Orchestrator] checkAchievements() STARTED');

    // Reload new progress data for fresh calculation
    let newModules: any[] = [];
    try {
      const newModulesData = await AsyncStorage.getItem('new_user_progress');
      newModules = newModulesData ? JSON.parse(newModulesData) : [];
      setNewUserProgress(newModules); // Update state too
      console.log('🏆 [Orchestrator] Loaded progress data:', newModules.length, 'modules');
    } catch (error) {
      console.error('❌ [Orchestrator] Error loading new progress for achievements:', error);
    }

    const totalXP = calculateTotalXPUtil(moduleProgress, newModules);

    // Count perfect quiz scores (quizCorrectAnswers === 5 OR quizScore === 3)
    const perfectQuizCount = newModules.filter(
      m => m.quizCompleted && (m.quizCorrectAnswers === 5 || m.quizScore === 3)
    ).length;

    // Count lessons completed today
    const today = new Date().toDateString();
    const lessonsToday = newModules.filter((m: any) => {
      if (!m.completedAt) return false;
      const completedDate = new Date(m.completedAt).toDateString();
      return completedDate === today;
    }).length;

    console.log(`🏆 [Orchestrator] Perfect quizzes: ${perfectQuizCount}, Total XP: ${totalXP}, Lessons today: ${lessonsToday}, Streak: ${streak}`);

    const unlockedIds = unlockedAchievements.map(a => a.id);
    for (const achievement of ACHIEVEMENTS) {
      if (unlockedIds.includes(achievement.id)) continue;

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

        case 'era_complete':
          const eraId = achievement.unlockCondition.metadata?.era_id;
          if (eraId) {
            const { total, completed } = await getEraModuleCount(eraId, newModules);
            setEraModuleCounts(prev => ({ ...prev, [eraId]: { total, completed } }));
            shouldUnlock = completed >= total && total > 0;
          }
          break;

        case 'night_owl':
        case 'early_bird':
          // These are checked via checkTimeBasedAchievement
          break;
      }

      if (shouldUnlock) {
        await unlockAchievement(achievement.id);
      }
    }
  }, [unlockedAchievements, streak, moduleProgress, getEraModuleCount, unlockAchievement]);

  // Check time-based achievements (night owl, early bird)
  const checkTimeBasedAchievement = useCallback(async () => {
    const hour = new Date().getHours();

    if (hour >= 22 || hour < 6) {
      await unlockAchievement('night_owl');
    } else if (hour >= 5 && hour < 7) {
      await unlockAchievement('early_bird');
    }
  }, [unlockAchievement]);

  // Get all achievements with unlock status (sorted)
  const getAllAchievements = useCallback(() => {
    const unlockedIds = unlockedAchievements.map(a => a.id);

    const achievementsWithStatus = ACHIEVEMENTS.map(achievement => {
      const unlockedData = unlockedAchievements.find(u => u.id === achievement.id);
      return {
        ...achievement,
        unlocked: unlockedIds.includes(achievement.id),
        unlockedAt: unlockedData?.unlockedAt,
      };
    });

    // Sort: Recently unlocked first, then by progress, then locked
    return achievementsWithStatus.sort((a, b) => {
      if (a.unlocked && b.unlocked) {
        return new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime();
      }
      if (a.unlocked) return -1;
      if (b.unlocked) return 1;
      return 0;
    });
  }, [unlockedAchievements]);

  // Get progress towards an achievement (0-100)
  const getProgress = useCallback((achievementId: string): number => {
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) return 0;

    const totalXP = calculateTotalXPUtil(moduleProgress, newUserProgress);
    const perfectQuizCount = newUserProgress.filter(
      m => m.quizCompleted && (m.quizCorrectAnswers === 5 || m.quizScore === 3)
    ).length;

    switch (achievement.unlockCondition.type) {
      case 'quiz_perfect':
        return Math.min(100, (perfectQuizCount / achievement.unlockCondition.threshold) * 100);

      case 'streak_days':
        return Math.min(100, (streak / achievement.unlockCondition.threshold) * 100);

      case 'total_xp':
        return Math.min(100, (totalXP / achievement.unlockCondition.threshold) * 100);

      case 'era_complete': {
        const eraId = achievement.unlockCondition.metadata?.era_id;
        if (!eraId) return 0;

        const cachedCounts = eraModuleCounts[eraId];
        if (cachedCounts && cachedCounts.total > 0) {
          return Math.min(100, (cachedCounts.completed / cachedCounts.total) * 100);
        }

        const eraModules = newUserProgress.filter((m: any) => m.era_id === eraId && m.quizCompleted);
        if (eraModules.length === 0) return 0;

        const totalCorrect = eraModules.reduce((sum: number, m: any) => sum + (m.quizCorrectAnswers || 0), 0);
        const estimatedTotal = 15 * 5; // 75 questions fallback
        return Math.min(100, (totalCorrect / estimatedTotal) * 100);
      }

      default:
        return unlockedAchievements.some(a => a.id === achievementId) ? 100 : 0;
    }
  }, [moduleProgress, newUserProgress, streak, eraModuleCounts, unlockedAchievements]);

  // Get achievements by category
  const getAchievementsByCategory = useCallback((category: Achievement['category']) => {
    const unlockedIds = unlockedAchievements.map(a => a.id);
    return ACHIEVEMENTS.filter(a => a.category === category).map(achievement => ({
      ...achievement,
      unlocked: unlockedIds.includes(achievement.id),
    }));
  }, [unlockedAchievements]);

  // Get a single achievement by ID
  const getAchievement = useCallback((id: string) => {
    return ACHIEVEMENTS.find(a => a.id === id);
  }, []);

  // Process queue - show next celebration when current is dismissed
  useEffect(() => {
    if (!currentCelebration && celebrationQueue.length > 0) {
      const [next, ...rest] = celebrationQueue;
      setCurrentCelebration(next);
      setCelebrationQueue(rest);
      console.log(`🎉 [Orchestrator] Showing celebration: ${next.type}`);
    }
  }, [celebrationQueue, currentCelebration]);

  // Dismiss current celebration and move to next
  const dismissCurrent = useCallback(() => {
    console.log(`✅ [Orchestrator] Dismissing celebration: ${currentCelebration?.type}`);
    setCurrentCelebration(null);
    // Next celebration will be picked up by useEffect
  }, [currentCelebration]);

  // Report quiz completion - check all triggers
  const reportQuizComplete = useCallback(async (input: QuizCompleteInput) => {
    const {
      eraId,
      adventureId,
      oldEraXP,
      newEraXP,
      adventureModulesCompleted,
      adventureTotalModules,
      adventureData,
    } = input;

    console.log(`🔄 [Orchestrator] Quiz complete reported:`, {
      eraId,
      adventureId,
      oldEraXP,
      newEraXP,
      adventureModulesCompleted,
      adventureTotalModules,
    });

    const newCelebrations: CelebrationItem[] = [];

    // --- Check 1: XP Milestone ---
    const milestone = checkXPMilestone(oldEraXP, newEraXP);
    if (milestone) {
      const alreadySeen = await hasSeenXPMilestone(milestone, eraId);
      if (!alreadySeen) {
        newCelebrations.push({
          type: 'XP_MILESTONE',
          milestoneXP: milestone,
          totalXP: newEraXP,
          eraId,
        });
        console.log(`🎯 [Orchestrator] XP milestone ${milestone} queued for era ${eraId}`);
      } else {
        console.log(`⏭️ [Orchestrator] XP milestone ${milestone} already seen, skipping`);
      }
    }

    // --- Check 2: Adventure Complete ---
    const isAdventureComplete = adventureModulesCompleted >= adventureTotalModules;
    if (isAdventureComplete && adventureData) {
      const alreadySeen = await hasSeenAdventureComplete(adventureId);
      if (!alreadySeen) {
        newCelebrations.push({
          type: 'ADVENTURE_COMPLETE',
          adventureId,
          adventureTitle: adventureData.title,
          adventureSubtitle: adventureData.subtitle,
          adventureDescription: adventureData.description,
          backgroundImage: adventureData.backgroundImage,
          completedModules: adventureModulesCompleted,
          totalModules: adventureTotalModules,
          totalXP: newEraXP,
          totalBadges: adventureData.totalBadges || 3,
          eraId,
        });
        console.log(`🎯 [Orchestrator] Adventure ${adventureId} complete queued`);
      } else {
        console.log(`⏭️ [Orchestrator] Adventure ${adventureId} complete already seen, skipping`);
      }
    }

    // Add to queue
    if (newCelebrations.length > 0) {
      setCelebrationQueue((prev) => [...prev, ...newCelebrations]);
      console.log(`📋 [Orchestrator] Added ${newCelebrations.length} celebrations to queue`);
    }

    // --- Check 3: Achievements ---
    // Check all achievement conditions (XP, perfect quizzes, streaks, etc.)
    await checkAchievements();
  }, [checkAchievements]);

  // Report lesson completion - for future triggers
  const reportLessonComplete = useCallback(async (_input: LessonCompleteInput) => {
    // No lesson-specific celebrations currently
    // Can be extended for streaks, lesson milestones, etc.
    console.log(`🔄 [Orchestrator] Lesson complete reported (no triggers yet)`);
  }, []);

  const isCelebrating = currentCelebration !== null;
  const streakBonus = calculateStreakBonus(streak);
  const achievements = getAllAchievements();

  return (
    <GamificationOrchestratorContext.Provider
      value={{
        reportQuizComplete,
        reportLessonComplete,
        isCelebrating,
        streak,
        longestStreak,
        isStreakLoading,
        isNewDay,
        streakBonus,
        refreshStreak: loadStreak,
        // Achievements
        achievements,
        unlockedCount: unlockedAchievements.length,
        totalCount: ACHIEVEMENTS.length,
        isAchievementsLoading,
        getProgress,
        getAchievementsByCategory,
        getAchievement,
        checkTimeBasedAchievement,
        checkAchievements,
        getEraProgress,
      }}
    >
      {children}

      {/* XP Milestone Modal */}
      <Modal
        visible={currentCelebration?.type === 'XP_MILESTONE'}
        animationType="fade"
        presentationStyle="fullScreen"
        statusBarTranslucent
      >
        {currentCelebration?.type === 'XP_MILESTONE' && (
          <XPMilestoneScreen
            milestoneXP={currentCelebration.milestoneXP}
            totalXP={currentCelebration.totalXP}
            eraId={currentCelebration.eraId}
            onContinue={dismissCurrent}
          />
        )}
      </Modal>

      {/* Adventure Complete Modal */}
      <Modal
        visible={currentCelebration?.type === 'ADVENTURE_COMPLETE'}
        animationType="fade"
        presentationStyle="fullScreen"
        statusBarTranslucent
      >
        {currentCelebration?.type === 'ADVENTURE_COMPLETE' && (
          <AdventureCompleteScreen
            adventureTitle={currentCelebration.adventureTitle}
            adventureSubtitle={currentCelebration.adventureSubtitle}
            adventureDescription={currentCelebration.adventureDescription}
            backgroundImage={currentCelebration.backgroundImage}
            completedModules={currentCelebration.completedModules}
            totalModules={currentCelebration.totalModules}
            totalXP={currentCelebration.totalXP}
            totalBadges={currentCelebration.totalBadges}
            onContinue={dismissCurrent}
            onClose={dismissCurrent}
          />
        )}
      </Modal>

      {/* Achievement Unlock Modal */}
      {currentCelebration?.type === 'ACHIEVEMENT' && (
        <AchievementUnlockAnimation
          visible={true}
          achievement={currentCelebration.achievement}
          onDismiss={dismissCurrent}
        />
      )}
    </GamificationOrchestratorContext.Provider>
  );
}

// ============================================================
// HOOK
// ============================================================

export function useGamificationOrchestrator(): GamificationOrchestratorContextType {
  const context = useContext(GamificationOrchestratorContext);
  if (!context) {
    throw new Error('useGamificationOrchestrator must be used within GamificationOrchestratorProvider');
  }
  return context;
}

// ============================================================
// EXPORTS
// ============================================================

export { checkXPMilestone, checkStreakMilestone, calculateStreakBonus };
export type { CelebrationItem, XPMilestoneCelebration, AdventureCompleteCelebration, StreakMilestoneCelebration };
