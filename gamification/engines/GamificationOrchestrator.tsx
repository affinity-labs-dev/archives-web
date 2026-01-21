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

import { ADVENTURE_KEYS } from '@/constants/WalkthroughKeys';
import { useAdventuresContent } from '@/context/AdventuresContentProvider';
import { analyticsService } from '@/services/AnalyticsService';
import PushNotificationService from '@/services/PushNotificationService';
import CustomerIOService from '@/services/CustomerIOService';
import { useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Modal } from 'react-native';
import { calculateTotalXP as calculateTotalXPUtil, useGamifiedProgress } from './GamifiedProgress';

// Import celebration screens
import { AchievementUnlockAnimation } from '@/gamification/ui/achievement/AchievementGrid';
import AdventureCompleteScreen from '@/gamification/ui/celebrations/AdventureCompleteScreen';
import StreakCelebrationScreen from '@/gamification/ui/celebrations/StreakCelebrationScreen';
import XPMilestoneScreen from '@/gamification/ui/celebrations/XPMilestoneScreen';

// ============================================================
// CONSTANTS
// ============================================================

export const XP_MILESTONES = [50, 100, 200, 400, 750] as const;
export const STREAK_MILESTONES = [7, 30, 100] as const;

// Storage keys
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
  image?: any; // Optional image asset (require() reference)
  unlockCondition: {
    type: 'quiz_perfect' | 'quiz_perfect_streak' | 'streak_days' | 'modules_in_day' | 'era_complete' | 'all_perfect_era' | 'night_owl' | 'early_bird' | 'total_xp';
    threshold: number;
    metadata?: any; // Additional data like era_id for era-specific achievements
  };
}

// ============================================================
// ALL ACHIEVEMENTS (20 total)
// ============================================================

const ACHIEVEMENTS: Achievement[] = [
  // Quiz Achievements
  {
    id: 'first_perfect',
    name: 'First Steps',
    description: 'Score 100% on your first quiz',
    image: require('@/assets/images/adventure-unlocked/firststeps.png'),
    unlockCondition: { type: 'quiz_perfect', threshold: 1 },
  },
  {
    id: 'quiz_master',
    name: 'Quiz Master',
    description: 'Score 100% on 5 quizzes',
    image: require('@/assets/images/adventure-unlocked/quizmaster.png'),
    unlockCondition: { type: 'quiz_perfect', threshold: 5 },
  },
  {
    id: 'perfect_scholar',
    name: 'Perfect Scholar',
    description: 'Score 100% on 10 quizzes',
    image: require('@/assets/images/adventure-unlocked/perfectscholar.png'),
    unlockCondition: { type: 'quiz_perfect', threshold: 10 },
  },
  {
    id: 'quiz_legend',
    name: 'Quiz Legend',
    description: 'Score 100% on 20 quizzes',
    image: require('@/assets/images/adventure-unlocked/quizlegend.png'),
    unlockCondition: { type: 'quiz_perfect', threshold: 20 },
  },

  // Streak Achievements
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    image: require('@/assets/images/adventure-unlocked/weekwarrior.png'),
    unlockCondition: { type: 'streak_days', threshold: 7 },
  },
  {
    id: 'month_master',
    name: 'Month Master',
    description: 'Maintain a 30-day streak',
    image: require('@/assets/images/adventure-unlocked/monthmaster.png'),
    unlockCondition: { type: 'streak_days', threshold: 30 },
  },
  {
    id: 'century_scholar',
    name: 'Century Scholar',
    description: 'Maintain a 100-day streak',
    image: require('@/assets/images/adventure-unlocked/100dayscholar.png'),
    unlockCondition: { type: 'streak_days', threshold: 100 },
  },

  // Speed Achievements
  {
    id: 'quick_learner',
    name: 'Quick Learner',
    description: 'Complete 3 modules in one day',
    image: require('@/assets/images/adventure-unlocked/quicklearner.png'),
    unlockCondition: { type: 'modules_in_day', threshold: 3 },
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Complete 5 modules in one day',
    image: require('@/assets/images/adventure-unlocked/speeddemon.png'),
    unlockCondition: { type: 'modules_in_day', threshold: 5 },
  },

  // Completion Achievements
  {
    id: 'era_complete_umayyad',
    name: 'Umayyad Expert',
    description: 'Complete all of Umayyad Dynasty era',
    image: require('@/assets/images/adventure-unlocked/umayyadexpert.png'),
    unlockCondition: { type: 'era_complete', threshold: 1, metadata: { era_id: 'umayyad' } },
  },
  {
    id: 'era_complete_roi',
    name: 'Rise of Islam',
    description: 'Complete all of Rise of Islam era',
    image: require('@/assets/images/adventure-unlocked/riseofislam.png'),
    unlockCondition: { type: 'era_complete', threshold: 1, metadata: { era_id: 'rise_of_islam' } },
  },
  {
    id: 'era_complete_women_of_islam',
    name: 'Women of Islam',
    description: 'Complete all of Women of Islam era',
    image: require('@/assets/images/adventure-unlocked/womenofislam.png'),
    unlockCondition: { type: 'era_complete', threshold: 1, metadata: { era_id: 'women_of_islam' } },
  },

  // Time-based Achievements
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Complete a lesson after 10 PM',
    image: require('@/assets/images/adventure-unlocked/nightowl.png'),
    unlockCondition: { type: 'night_owl', threshold: 1 },
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Complete a lesson before 7 AM',
    image: require('@/assets/images/adventure-unlocked/earlybird.png'),
    unlockCondition: { type: 'early_bird', threshold: 1 },
  },

  // XP Achievements - Islamic Scholar Progression
  {
    id: 'xp_100',
    name: 'Talib (Seeker)',
    description: 'Earn 100 total XP',
    image: require('@/assets/images/adventure-unlocked/talib(seeker).png'),
    unlockCondition: { type: 'total_xp', threshold: 100 },
  },
  {
    id: 'xp_250',
    name: 'Daris (Student)',
    description: 'Earn 250 total XP',
    image: require('@/assets/images/adventure-unlocked/daris(student).png'),
    unlockCondition: { type: 'total_xp', threshold: 250 },
  },
  {
    id: 'xp_500',
    name: 'Alim (Scholar)',
    description: 'Earn 500 total XP',
    image: require('@/assets/images/adventure-unlocked/alim(scholar).png'),
    unlockCondition: { type: 'total_xp', threshold: 500 },
  },
  {
    id: 'xp_1000',
    name: 'Hakim (Sage)',
    description: 'Earn 1000 total XP',
    image: require('@/assets/images/adventure-unlocked/hakim(sage).png'),
    unlockCondition: { type: 'total_xp', threshold: 1000 },
  },
  {
    id: 'xp_2000',
    name: 'Ustadh (Master)',
    description: 'Earn 2000 total XP',
    image: require('@/assets/images/adventure-unlocked/ustadh(master).png'),
    unlockCondition: { type: 'total_xp', threshold: 2000 },
  },
  {
    id: 'xp_3500',
    name: 'Shaykh al-Ilm',
    description: 'Earn 3500 total XP',
    image: require('@/assets/images/adventure-unlocked/shaykhalilm.png'),
    unlockCondition: { type: 'total_xp', threshold: 3500 },
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
  longestStreakDate: string; // Date when longest streak was achieved (required to match GamifiedProgress type)
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

interface StreakCelebration {
  type: 'STREAK_CELEBRATION';
  streakCount: number;
  weekData: { day: string; completed: boolean; isToday: boolean }[];
}

interface AchievementCelebration {
  type: 'ACHIEVEMENT';
  achievement: Achievement;
}

type CelebrationItem = XPMilestoneCelebration | AdventureCompleteCelebration | StreakMilestoneCelebration | StreakCelebration | AchievementCelebration;

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
  /** TEST: Simulate next day to test streak increment */
  simulateNextDay: () => Promise<void>;

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
 * Check if user has already seen the streak celebration today (Duolingo pattern).
 */
async function hasShownStreakCelebrationToday(): Promise<boolean> {
  try {
    const lastShown = await AsyncStorage.getItem('streak_celebration_last_shown');
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return lastShown === today;
  } catch (error) {
    console.error('❌ [Orchestrator] Error checking streak celebration:', error);
    return false;
  }
}

/**
 * Mark streak celebration as shown today.
 */
async function markStreakCelebrationShown(): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    await AsyncStorage.setItem('streak_celebration_last_shown', today);
    console.log(`✅ [Orchestrator] Streak celebration marked as shown for ${today}`);
  } catch (error) {
    console.error('❌ [Orchestrator] Error marking streak celebration shown:', error);
  }
}

/**
 * Sanitize numeric values to prevent Customer.io errors.
 * Converts NaN, Infinity, null, undefined to 0.
 */
function sanitizeNumericValue(value: any): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    console.warn(`⚠️ [Orchestrator] Invalid numeric value detected: ${value}, converting to 0`);
    return 0;
  }
  return value;
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

/**
 * Calculate week progress data for calendar widget.
 * Returns 7 days (Mo-Su) with completion status based on current streak.
 */
function calculateWeekData(currentStreak: number): { day: string; completed: boolean; isToday: boolean }[] {
  const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
  const todayIndex = today === 0 ? 6 : today - 1; // Convert to Mo-Su (0-6)

  // Calculate how many days this week are completed
  const completedThisWeek = Math.min(currentStreak, todayIndex + 1);

  return days.map((day, index) => ({
    day,
    completed: index < completedThisWeek,
    isToday: index === todayIndex,
  }));
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

  // Streak state (automatic loading disabled - only used for testing)
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [isStreakLoading, setIsStreakLoading] = useState(false); // Changed to false since auto-loading is disabled
  const [isNewDay, setIsNewDay] = useState(false);
  const streakLoadedRef = useRef(false);

  // Achievement state
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);
  const [isAchievementsLoading, setIsAchievementsLoading] = useState(true);
  const [eraModuleCounts, setEraModuleCounts] = useState<Record<string, { total: number; completed: number }>>({});
  const [newUserProgress, setNewUserProgress] = useState<any[]>([]);
  const unlockingRef = useRef<Set<string>>(new Set());

  // Hooks for achievements calculation and streak sync
  // IMPORTANT: Include isInitialized to wait for GamifiedProgress to load cloud data before reading achievements
  const { moduleProgress, unlockAchievement: persistAchievement, syncStreakToState, syncToCloud, reloadData, getStreak: getCloudStreak, getAchievements: getCloudAchievements, isInitialized: isProgressInitialized } = useGamifiedProgress();
  const { getAdventures } = useAdventuresContent();
  const { user } = useUser();
  const [previousUserId, setPreviousUserId] = useState<string | null>(null);

  // Load and update streak - DIRECT SUPABASE READ/WRITE (no local state confusion)
  const loadStreak = useCallback(async () => {
    try {
      console.log(`🔥 [Orchestrator] ======= LOADING STREAK FROM SUPABASE =======`);

      // STEP 1: Force reload from Supabase to get FRESH data (not stale local state)
      await reloadData();
      console.log(`✅ [Orchestrator] Fresh data loaded from Supabase`);

      // STEP 2: Read the FRESH streak data (now guaranteed to be from Supabase)
      const cloudStreak = getCloudStreak();
      console.log(`🔥 [Orchestrator] Current streak: ${cloudStreak.currentStreak}, Last active: ${cloudStreak.lastActiveDate}`);

      const today = new Date().toISOString().split('T')[0]; // ISO format: YYYY-MM-DD
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0]; // ISO format: YYYY-MM-DD

      console.log(`📅 [Orchestrator] Date comparison:`);
      console.log(`   Today: ${today}`);
      console.log(`   Yesterday: ${yesterdayStr}`);
      console.log(`   Last active: ${cloudStreak.lastActiveDate}`);

      // STEP 3: Check if we need to update streak
      let needsUpdate = false;
      let newStreak = cloudStreak.currentStreak;
      let newLongest = cloudStreak.longestStreak;
      let newLongestDate = cloudStreak.longestStreakDate;

      console.log(`🔍 [Orchestrator] Checking streak condition...`);
      if (cloudStreak.lastActiveDate === yesterdayStr) {
        // CONSECUTIVE DAY - Increment
        newStreak = cloudStreak.currentStreak + 1;
        needsUpdate = true;
        setIsNewDay(true);
        console.log(`🔥 [Orchestrator] ✅ CONSECUTIVE DAY DETECTED!`);
        console.log(`   Old streak: ${cloudStreak.currentStreak}`);
        console.log(`   New streak: ${newStreak}`);
      } else if (!cloudStreak.lastActiveDate || cloudStreak.lastActiveDate !== today) {
        // MISSED DAYS or FIRST TIME - Reset to 1
        newStreak = 1;
        needsUpdate = true;
        if (!cloudStreak.lastActiveDate) {
          console.log(`🔥 [Orchestrator] ⭐ FIRST TIME! Setting streak to 1`);
        } else {
          console.log(`🔥 [Orchestrator] ❌ MISSED DAYS DETECTED!`);
          console.log(`   Old streak: ${cloudStreak.currentStreak}`);
          console.log(`   Resetting to: 1`);
        }
      } else {
        // SAME DAY - No change
        console.log(`🔥 [Orchestrator] ⏸️  SAME DAY - No update needed`);
        console.log(`   Streak remains: ${cloudStreak.currentStreak}`);
      }

      // STEP 4: Update longest streak if new record
      if (needsUpdate && newStreak > newLongest) {
        newLongest = newStreak;
        newLongestDate = today;
        console.log(`🏆 [Orchestrator] 🎉 NEW LONGEST STREAK RECORD!`);
        console.log(`   Old longest: ${cloudStreak.longestStreak}`);
        console.log(`   New longest: ${newLongest}`);
        console.log(`   Date achieved: ${newLongestDate}`);
      }

      // STEP 5: Write back to Supabase if changed
      if (needsUpdate) {
        const updatedStreak: StreakData = {
          currentStreak: newStreak,
          longestStreak: newLongest,
          lastActiveDate: today,
          longestStreakDate: newLongestDate,
        };

        console.log(`💾 [Orchestrator] ========== WRITING STREAK TO SUPABASE ==========`);
        console.log(`   Current streak: ${updatedStreak.currentStreak}`);
        console.log(`   Longest streak: ${updatedStreak.longestStreak}`);
        console.log(`   Last active: ${updatedStreak.lastActiveDate}`);
        console.log(`   Longest date: ${updatedStreak.longestStreakDate}`);

        await syncStreakToState(updatedStreak);
        await syncToCloud(); // Force immediate write
        console.log(`✅ [Orchestrator] ========== STREAK SUCCESSFULLY SAVED TO SUPABASE ==========`);

        // Update PostHog - sanitize values to prevent Customer.io errors
        const sanitizedStreak = sanitizeNumericValue(newStreak);
        const sanitizedLongest = sanitizeNumericValue(newLongest);

        console.log(`📊 [Orchestrator] Preparing analytics update:`, {
          raw: { current_streak: newStreak, longest_streak: newLongest },
          sanitized: { current_streak: sanitizedStreak, longest_streak: sanitizedLongest },
          types: { streak: typeof newStreak, longest: typeof newLongest },
          isValid: { streak: Number.isFinite(newStreak), longest: Number.isFinite(newLongest) },
        });

        analyticsService.updateProgressProperties({
          current_streak: sanitizedStreak,
          longest_streak: sanitizedLongest,
          longest_streak_date: newLongestDate,
        });
        console.log(`✅ [Orchestrator] PostHog properties updated`);

        // Check for milestone
        if (!streakLoadedRef.current) {
          const milestone = checkStreakMilestone(cloudStreak.currentStreak, newStreak);
          if (milestone) {
            console.log(`🎯 [Orchestrator] 🎉 Streak milestone ${milestone} days reached!`);
          }
        }
      }

      // STEP 6: Streak celebration will be shown after module completion (Duolingo pattern)
      // Background streak update is silent - no UI shown here

      // STEP 7: Update local UI state (sanitize to prevent NaN in UI)
      setStreak(sanitizeNumericValue(newStreak));
      setLongestStreak(sanitizeNumericValue(newLongest));
      setIsStreakLoading(false);
      streakLoadedRef.current = true;

      console.log(`🔥 [Orchestrator] ======= STREAK LOAD COMPLETE =======`);
      console.log(`📊 [Orchestrator] Final state:`);
      console.log(`   Current streak: ${newStreak}`);
      console.log(`   Longest streak: ${newLongest}`);
      console.log(`   Updated: ${needsUpdate ? 'YES' : 'NO'}`);
    } catch (error) {
      console.error('❌ [Orchestrator] Error loading streak:', error);
      setStreak(0);
      setLongestStreak(0);
      setIsStreakLoading(false);
    }
  }, [reloadData, getCloudStreak, syncStreakToState, syncToCloud]);

  // Load streak on mount - check consecutive days and update automatically
  useEffect(() => {
    if (isProgressInitialized) {
      console.log('🔥 [Orchestrator] GamifiedProgress initialized, loading streak...');
      loadStreak();
    }
  }, [loadStreak, isProgressInitialized]);

  // ===== ACHIEVEMENT FUNCTIONS =====

  // Load unlocked achievements from storage AND cloud (merge both sources)
  // This ensures achievements are restored on new device/reinstall
  const loadUnlockedAchievements = useCallback(async () => {
    try {
      // 1. Load from local AsyncStorage
      let localAchievements: UnlockedAchievement[] = [];
      const data = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (typeof parsed[0] === 'string') {
            // Old format - migrate to new format
            localAchievements = parsed.map((id: string) => ({
              id,
              unlockedAt: new Date().toISOString(),
            }));
            console.log('🏆 [Orchestrator] Migrated old achievement format:', localAchievements.length, 'unlocked');
          } else {
            localAchievements = parsed;
            console.log('🏆 [Orchestrator] Loaded local achievements:', localAchievements.length, 'unlocked');
          }
        }
      }

      // 2. Get achievements from cloud (GamifiedProgress syncs to Supabase)
      const cloudAchievements = getCloudAchievements();
      const cloudUnlocked: UnlockedAchievement[] = cloudAchievements.map(a => ({
        id: a.id,
        unlockedAt: a.unlocked_at || new Date().toISOString(),
      }));
      console.log('🏆 [Orchestrator] Cloud achievements:', cloudUnlocked.length, 'unlocked');

      // 3. Merge: Union of local + cloud (no duplicates)
      const mergedMap = new Map<string, UnlockedAchievement>();
      localAchievements.forEach(a => mergedMap.set(a.id, a));
      cloudUnlocked.forEach(a => {
        if (!mergedMap.has(a.id)) {
          mergedMap.set(a.id, a);
        }
      });
      const mergedAchievements = Array.from(mergedMap.values());

      // 4. If cloud had achievements not in local, update local storage
      if (mergedAchievements.length > localAchievements.length) {
        await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(mergedAchievements));
        console.log('🏆 [Orchestrator] Synced cloud achievements to local:', mergedAchievements.length, 'total');
      }

      // 5. Update state and refs
      setUnlockedAchievements(mergedAchievements);
      mergedAchievements.forEach(a => unlockingRef.current.add(a.id));

      setIsAchievementsLoading(false);
    } catch (error) {
      console.error('❌ [Orchestrator] Error loading achievements:', error);
      setIsAchievementsLoading(false);
    }
  }, [getCloudAchievements]);

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

  // Load progress on mount (achievements loaded separately after GamifiedProgress initializes)
  useEffect(() => {
    loadNewProgress();
  }, [loadNewProgress]);

  // ========== RESET STATE ON USER CHANGE ==========
  // This ensures old user's streak/achievements don't show when switching accounts
  useEffect(() => {
    if (user?.id !== previousUserId) {
      console.log('🔄 [Orchestrator] User changed, resetting state...');
      console.log(`   Previous: ${previousUserId} → New: ${user?.id || 'signed out'}`);

      // Reset all state immediately
      setStreak(0);
      setLongestStreak(0);
      setIsNewDay(false);
      setUnlockedAchievements([]);
      setCelebrationQueue([]);
      setCurrentCelebration(null);
      setNewUserProgress([]);
      setEraModuleCounts({});
      streakLoadedRef.current = false;
      unlockingRef.current.clear();
      setPreviousUserId(user?.id || null);

      // Reload streak and progress for new user (if signed in)
      // NOTE: Achievements are loaded separately after GamifiedProgress initializes (see below)
      if (user?.id) {
        loadStreak();
        loadNewProgress();
      }
    }
  }, [user?.id, previousUserId, loadStreak, loadNewProgress]);

  // ========== LOAD ACHIEVEMENTS AFTER GAMIFIED PROGRESS INITIALIZES ==========
  // This is critical: We must wait for GamifiedProgress to load cloud data before
  // calling getCloudAchievements(), otherwise it returns empty array and we lose achievements
  useEffect(() => {
    if (isProgressInitialized && user?.id) {
      console.log('🏆 [Orchestrator] GamifiedProgress initialized, loading achievements from cloud...');
      loadUnlockedAchievements();
    }
  }, [isProgressInitialized, user?.id, loadUnlockedAchievements]);

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

      // Persist to GamifiedProgress (syncs to Supabase)
      await persistAchievement({
        id: achievementId,
        name: achievement.name,
      });

      // Add achievement celebration to queue
      setCelebrationQueue(prev => [...prev, {
        type: 'ACHIEVEMENT' as const,
        achievement,
      }]);

      console.log('🎉 [Orchestrator] Achievement unlocked:', achievement.name);
    } catch (error) {
      console.error('❌ [Orchestrator] Error unlocking achievement:', error);
    } finally {
      unlockingRef.current.delete(achievementId);
    }
  }, [unlockedAchievements, persistAchievement]);

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

    // Count modules completed today
    const today = new Date().toDateString();
    const modulesToday = newModules.filter((m: any) => {
      if (!m.completedAt) return false;
      const completedDate = new Date(m.completedAt).toDateString();
      return completedDate === today;
    });

    // DEBUG: Log what's being counted
    console.log(`🔍 [Orchestrator] Modules completed today (${today}):`, modulesToday.map((m: any) => ({
      adventureId: m.adventureId,
      moduleId: m.moduleId,
      completedAt: m.completedAt,
    })));

    const modulesCompletedToday = modulesToday.length;

    console.log(`🏆 [Orchestrator] Perfect quizzes: ${perfectQuizCount}, Total XP: ${totalXP}, Modules today: ${modulesCompletedToday}, Streak: ${streak}`);

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

        case 'modules_in_day':
          shouldUnlock = modulesCompletedToday >= achievement.unlockCondition.threshold;
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
  const dismissCurrent = useCallback(async () => {
    console.log(`✅ [Orchestrator] Dismissing celebration: ${currentCelebration?.type}`);

    // Check if we should prompt for notifications after this celebration
    // Conditions: Adventure 1 complete OR 50 XP milestone
    const shouldPromptNotification =
      (currentCelebration?.type === 'ADVENTURE_COMPLETE' &&
        currentCelebration.adventureId?.includes('adventure_1')) ||
      (currentCelebration?.type === 'XP_MILESTONE' &&
        (currentCelebration.milestoneXP === 50 || currentCelebration.milestoneXP === 200 || currentCelebration.milestoneXP === 750));

    if (shouldPromptNotification) {
      try {
        const status = await PushNotificationService.getPushPermissionStatus();
        if (status !== 'Granted') {
          console.log('🔔 [Orchestrator] Prompting for notifications after celebration...');

          // Small delay to let celebration dismiss animation complete
          setTimeout(async () => {
            const result = await PushNotificationService.requestPushNotificationPermission();
            console.log('🔔 [Orchestrator] Notification permission result:', result.status);

            // Update Customer.io profile
            CustomerIOService.setProfileAttributes({
              push_notifications_enabled: result.status === 'Granted',
              push_permission_status: result.status,
              push_permission_updated_at: Math.floor(Date.now() / 1000),
              cio_push_token: result.token || null,
            });

            // Update PostHog
            analyticsService.updatePushStatus(result.status === 'Granted', result.status);

            // Track the prompt source
            const source = currentCelebration?.type === 'ADVENTURE_COMPLETE'
              ? 'adventure_1_complete'
              : 'xp_milestone_50';
            analyticsService.trackCustomEvent('push_notification_prompted', {
              source,
              result: result.status,
            });
          }, 500);
        }
      } catch (error) {
        console.error('❌ [Orchestrator] Error checking notification permission:', error);
      }
    }

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

    // --- Check 1: Adventure Complete (HIGHEST PRIORITY - shows first) ---
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
        console.log(`🎯 [Orchestrator] Adventure ${adventureId} complete queued (FIRST)`);
      } else {
        console.log(`⏭️ [Orchestrator] Adventure ${adventureId} complete already seen, skipping`);
      }
    }

    // --- Check 2: XP Milestone ---
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

    // --- Check 3: Streak Celebration (Duolingo pattern) ---
    // Show after module completion if: (1) user has active streak, (2) not shown today
    if (streak > 0) {
      const alreadyShownToday = await hasShownStreakCelebrationToday();
      if (!alreadyShownToday) {
        const weekData = calculateWeekData(streak);
        newCelebrations.push({
          type: 'STREAK_CELEBRATION',
          streakCount: streak,
          weekData,
        });
        await markStreakCelebrationShown();
        console.log(`🔥 [Orchestrator] Streak celebration queued for ${streak} days (Duolingo pattern)`);
      } else {
        console.log(`⏭️ [Orchestrator] Streak celebration already shown today, skipping`);
      }
    }

    // Add to queue
    if (newCelebrations.length > 0) {
      setCelebrationQueue((prev) => [...prev, ...newCelebrations]);
      console.log(`📋 [Orchestrator] Added ${newCelebrations.length} celebrations to queue`);
    }

    // --- Check 4: Achievements ---
    // Check all achievement conditions (XP, perfect quizzes, streaks, etc.)
    await checkAchievements();

    // Check time-based achievements (night owl, early bird)
    await checkTimeBasedAchievement();
  }, [checkAchievements, checkTimeBasedAchievement]);

  // Report lesson completion - for future triggers
  const reportLessonComplete = useCallback(async (_input: LessonCompleteInput) => {
    // No lesson-specific celebrations currently
    // Can be extended for streaks, lesson milestones, etc.
    console.log(`🔄 [Orchestrator] Lesson complete reported (no triggers yet)`);
  }, []);

  // TEST FUNCTION: Set lastActiveDate to yesterday in Supabase, then trigger streak check
  const simulateNextDay = useCallback(async () => {
    console.log(`🧪 [TEST] ====== STARTING STREAK TEST ======`);

    // STEP 1: Read current streak from Supabase
    await reloadData();
    const currentStreak = getCloudStreak();
    console.log(`🧪 [TEST] Current streak: ${currentStreak.currentStreak}, Longest: ${currentStreak.longestStreak}, Last active: ${currentStreak.lastActiveDate}`);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0]; // ISO format: YYYY-MM-DD

    console.log(`🧪 [TEST] Setting lastActiveDate to yesterday (${yesterdayStr}) in Supabase...`);

    // STEP 2: Write yesterday's date to Supabase (simulate "last active yesterday")
    const testStreak: StreakData = {
      currentStreak: currentStreak.currentStreak,
      longestStreak: currentStreak.longestStreak,
      lastActiveDate: yesterdayStr, // Set to yesterday
      longestStreakDate: currentStreak.longestStreakDate,
    };

    await syncStreakToState(testStreak);
    await syncToCloud(); // Force immediate write
    console.log(`🧪 [TEST] ✅ Yesterday's date written to local state`);

    // Wait for Supabase write to fully commit
    console.log(`🧪 [TEST] Waiting 2 seconds for Supabase write to commit...`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify the write by reading directly from Supabase
    await reloadData();
    const verifyStreak = getCloudStreak();
    console.log(`🧪 [TEST] Verifying Supabase data:`);
    console.log(`   Last active date: ${verifyStreak.lastActiveDate}`);
    console.log(`   Expected: ${yesterdayStr}`);
    console.log(`   Match: ${verifyStreak.lastActiveDate === yesterdayStr ? '✅' : '❌'}`);

    if (verifyStreak.lastActiveDate !== yesterdayStr) {
      console.error(`❌ [TEST] FAILED TO WRITE TO SUPABASE! Date is still ${verifyStreak.lastActiveDate}`);
      return;
    }

    // STEP 3: Now call loadStreak() - it will read from Supabase, see yesterday, and increment
    console.log(`🧪 [TEST] ✅ Verified! Calling loadStreak() - should see yesterday and increment ${currentStreak.currentStreak} → ${currentStreak.currentStreak + 1}...`);
    console.log(`🧪 [TEST] ====================================`);
    await loadStreak();

    // STEP 4: Verify result
    const finalStreak = getCloudStreak();
    console.log(`🧪 [TEST] ====== TEST COMPLETE ======`);
    console.log(`🧪 [TEST] Expected current: ${currentStreak.currentStreak + 1}`);
    console.log(`🧪 [TEST] Actual current: ${finalStreak.currentStreak}`);
    console.log(`🧪 [TEST] Longest streak: ${finalStreak.longestStreak}`);
    console.log(`🧪 [TEST] Result: ${finalStreak.currentStreak === currentStreak.currentStreak + 1 ? '✅ PASS' : '❌ FAIL'}`);
  }, [reloadData, getCloudStreak, syncStreakToState, syncToCloud, loadStreak]);

  const isCelebrating = currentCelebration !== null;
  const streakBonus = calculateStreakBonus(streak);
  const achievements = getAllAchievements();

  // Expose test function globally in development
  useEffect(() => {
    if (__DEV__) {
      (global as any).testStreakIncrement = simulateNextDay;
      console.log('🧪 [TEST] Test function exposed! Call global.testStreakIncrement() to simulate next day');
    }
  }, [simulateNextDay]);

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
        simulateNextDay, // TEST FUNCTION
        // Achievements
        achievements,
        unlockedCount: unlockedAchievements.length,
        totalCount: ACHIEVEMENTS.length,
        isAchievementsLoading,
        getProgress,
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

      {/* Streak Celebration Screen - Shows daily on first app open */}
      <StreakCelebrationScreen
        visible={currentCelebration?.type === 'STREAK_CELEBRATION'}
        streakCount={currentCelebration?.type === 'STREAK_CELEBRATION' ? currentCelebration.streakCount : 0}
        weekData={currentCelebration?.type === 'STREAK_CELEBRATION' ? currentCelebration.weekData : []}
        onContinue={dismissCurrent}
      />

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

export { ACHIEVEMENTS, calculateStreakBonus, checkStreakMilestone, checkXPMilestone };
export type { AchievementCelebration, AdventureCompleteCelebration, CelebrationItem, StreakMilestoneCelebration, XPMilestoneCelebration };

