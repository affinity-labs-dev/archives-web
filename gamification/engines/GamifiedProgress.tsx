/**
 * GamifiedProgress.tsx
 *
 * UNIFIED Source of Truth for All User Progress & Gamification Data
 *
 * This file replaces:
 * - context/ProgressContext.tsx (progress tracking)
 * - services/SimplifiedSyncService.ts (cloud sync)
 *
 * Manages:
 * - User progress (lessons, quizzes, module completion)
 * - XP tracking (totalXP, xp_by_era, xp_by_source)
 * - Streaks (daily engagement)
 * - Milestones & Achievements
 * - Behavior analytics
 *
 * Storage:
 * - Supabase: 'gamification_data' table (SINGLE source of truth)
 * - AsyncStorage: Local cache for offline-first experience
 *
 * Migration:
 * - Automatically migrates from old 'user_data' table on first launch
 * - Zero data loss - old data preserved as backup
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '@/hooks/lib/supabase';
import { analyticsService } from '@/services/AnalyticsService';
import { EraType, ModuleState } from '@/gamification/types/gamification';
import type { ProgressUpdateAction, ModuleProgress, AdventureProgress } from '@/gamification/types/gamification';

// ========== CONSTANTS ==========

const STORAGE_KEY = 'gamification_engine_data';
const SUPABASE_TABLE = 'gamification_data';
const LEGACY_USER_DATA_TABLE = 'user_data';
const SYNC_DEBOUNCE_MS = 2000;

// Legacy AsyncStorage keys (for migration)
const LEGACY_KEYS = {
  MODULE_PROGRESS: 'module_progress',
  ADVENTURE_PROGRESS: 'adventure_progress',
  NEW_USER_PROGRESS: 'new_user_progress',
  SELECTED_ERA: 'selected_era',
  DAILY_STREAK: 'daily_streak',
  LAST_ACTIVE_DATE: 'last_active_date',
};

// ========== TYPE DEFINITIONS ==========

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  longestStreakDate: string;
}

export interface ProgressEntry {
  era_id: string;
  adventureId: string | number;
  moduleId: string | number;
  lessonsCompleted: string[];
  quizScore: number;
  quizCorrectAnswers: number;
  completedAt: string;
  isCompleted: boolean;
  quizCompleted: boolean;
  mastery_level: 'attempted' | 'passed' | 'mastered';
  xp_earned: number;
  first_attempt_at: string;
  attempt_count: number;
}

export interface Milestone {
  type: string;
  threshold?: number;
  era_id?: string;
  adventure_id?: string;
  module_id?: string;
  achieved_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  unlocked_at: string;
  era_id?: string;
  adventureId?: string;
  moduleId?: string;
}

export interface BehaviorData {
  session_style: string;
  avg_attempts_per_visit: number;
  engagement_trend: string;
  weak_modules: string[];
  strong_modules: string[];
  last_computed: string;
  mastery_percentage: number;
  mastered_modules: number;
  total_modules: number;
  active_days: number;
}

export interface GamifiedProgressState {
  user_id: string;

  // Progress data (unified - ALL eras use this)
  progress: ProgressEntry[];

  // Adventure progress (tracks unlock status)
  adventureProgress: AdventureProgress[];

  // Era selection
  selectedEra: string;

  // XP tracking
  totalXP: number;
  xp_by_era: Record<string, number>;
  xp_by_source: {
    lessons: number;
    quizzes: number;
    games: number;
  };

  // Engagement
  streak: StreakData;

  // Achievements & Milestones
  milestones: Milestone[];
  achievements_unlocked: Achievement[];

  // Analytics
  behavior: BehaviorData;

  // Metadata
  metadata: {
    created_at: string;
    last_updated: string;
    migration_completed: boolean;
    migration_source?: string;
    total_quiz_attempts: number;
    total_modules_attempted: number;
  };
}

export interface QuestionResult {
  q_index: number;
  question_text?: string;
  correct: boolean;
  user_answer?: string;
  correct_answer?: string;
  time_taken_seconds?: number;
}

// ========== CONTEXT TYPE ==========

interface GamifiedProgressContextType {
  // State
  state: GamifiedProgressState | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Era management
  selectedEra: string | null;
  setSelectedEra: (eraId: string) => Promise<void>;

  // Progress tracking
  adventureProgress: AdventureProgress[];
  moduleProgress: ModuleProgress[];
  getAdventureProgress: (adventureId: number) => AdventureProgress | null;
  getModuleProgress: (adventureId: number, moduleId: number) => ModuleProgress | null;
  // New era progress getter (uses string IDs)
  getProgressByStringIds: (adventureId: string, moduleId: string) => ProgressEntry | null;
  saveNewProgressData: (moduleData: any) => Promise<void>;

  // Quiz tracking (detailed)
  trackQuizAttempt: (params: {
    era_id: string;
    adventure_id: string;
    module_id: string;
    quiz_score: number;
    quiz_correct_answers: number;
    started_at: string;
    completed_at: string;
    questions: QuestionResult[];
  }) => Promise<void>;

  // XP calculations
  calculateTotalXP: () => number;
  calculateModulesCompleted: () => number;
  checkIfCrossed50XPBoundary: (oldXP: number, newXP: number) => number | null;
  getROIAdventureStats: (adventureId: string) => Promise<{ xp: number; completedModules: number }>;
  getXPByEra: () => Record<string, number>;

  // Legacy helpers
  canRetakeModule: (adventureId: number, moduleId: number) => boolean;
  isModuleUnlocked: (adventureId: number, moduleId: number) => boolean;
  isLessonCompleted: (adventureId: number, moduleId: number, lessonId: string) => boolean;
  getOverallProgress: () => number;
  getModuleStarCount: (adventureId: number, moduleId: number) => number;

  // Streak
  getStreak: () => StreakData;
  syncStreakToState: (streakData: StreakData) => Promise<void>;

  // Achievements & Milestones
  getMilestones: () => Milestone[];
  getAchievements: () => Achievement[];
  addMilestone: (milestone: Omit<Milestone, 'achieved_at'>) => Promise<void>;
  unlockAchievement: (achievement: Omit<Achievement, 'unlocked_at'>) => Promise<void>;

  // Sync & reload
  reloadData: () => Promise<void>;
  syncToCloud: () => Promise<void>;
}

// ========== XP CALCULATION FUNCTIONS ==========

const calculateXPFromProgress = (progress: ProgressEntry[]): number => {
  return progress.reduce((sum, p) => sum + (p.xp_earned || 0), 0);
};

const calculateXPByEra = (progress: ProgressEntry[]): Record<string, number> => {
  const xpByEra: Record<string, number> = {};

  progress.forEach(p => {
    if (p.era_id) {
      xpByEra[p.era_id] = (xpByEra[p.era_id] || 0) + (p.xp_earned || 0);
    }
  });

  return xpByEra;
};

/**
 * Calculate XP per era dynamically (for PostHog person properties)
 * Returns: { "umayyad": 200, "rise_of_islam": 80 } - keys are era_ids from Supabase
 * Used for PostHog person properties and cloud sync
 */
export const calculateEraXP = (modules: any[]): Record<string, number> => {
  const eraXP: Record<string, number> = {};

  // Group modules by era_id and calculate XP for each
  modules.forEach(m => {
    if (m.era_id && m.quizCorrectAnswers !== undefined) {
      const xp = m.quizCorrectAnswers * 10;
      eraXP[m.era_id] = (eraXP[m.era_id] || 0) + xp;
    }
  });

  return eraXP;
};

// XP milestones for celebration screens
const XP_MILESTONES = [50, 100, 200, 400, 750];

const checkMilestoneCrossed = (oldXP: number, newXP: number): number | null => {
  for (const milestone of XP_MILESTONES) {
    if (oldXP < milestone && newXP >= milestone) {
      return milestone;
    }
  }
  return null;
};

// ========== POSTHOG CALCULATION FUNCTIONS ==========

/**
 * Calculate total lessons completed across all eras
 * Used for PostHog person property: lessons_completed
 */
export const calculateLessonsCompleted = (legacyModules: ModuleProgress[], newModules: ProgressEntry[]): number => {
  let totalLessons = 0;

  // Era 1: Count lessons from lessonsCompleted array
  legacyModules.forEach(m => {
    if (m.lessonsCompleted && Array.isArray(m.lessonsCompleted)) {
      totalLessons += m.lessonsCompleted.length;
    }
  });

  // Era 2+: Count lessons from lessonsCompleted array
  newModules.forEach(m => {
    if (m.lessonsCompleted && Array.isArray(m.lessonsCompleted)) {
      totalLessons += m.lessonsCompleted.length;
    }
  });

  return totalLessons;
};

/**
 * Calculate adventures completed across all eras
 * Era 1: Adventure complete when all 3 modules have quizScore >= 2
 * Era 2+: Adventure complete when all modules have isCompleted = true
 * Used for PostHog person property: adventures_completed
 */
export const calculateAdventuresCompleted = (legacyModules: ModuleProgress[], newModules: ProgressEntry[]): number => {
  let totalAdventures = 0;

  // Era 1: Group by adventureId, check if all 3 modules completed (quizScore >= 2)
  const era1Adventures = new Map<number, number[]>();
  legacyModules.forEach(m => {
    if (!era1Adventures.has(m.adventureId)) {
      era1Adventures.set(m.adventureId, []);
    }
    if (m.quizScore && m.quizScore >= 2) {
      era1Adventures.get(m.adventureId)!.push(m.moduleId);
    }
  });
  // Count adventures with all 3 modules completed
  era1Adventures.forEach((modules) => {
    if (modules.length >= 3) {
      totalAdventures += 1;
    }
  });

  // Era 2+: Group by adventureId, check if all modules completed
  const era2Adventures = new Map<string, { total: number; completed: number }>();
  newModules.forEach(m => {
    const advId = String(m.adventureId);
    if (!era2Adventures.has(advId)) {
      era2Adventures.set(advId, { total: 0, completed: 0 });
    }
    const stats = era2Adventures.get(advId)!;
    stats.total += 1;
    if (m.isCompleted && m.quizCompleted) {
      stats.completed += 1;
    }
  });
  // Count adventures where all modules are completed (assuming 3 modules per adventure)
  era2Adventures.forEach((stats) => {
    if (stats.completed >= 3 && stats.completed === stats.total) {
      totalAdventures += 1;
    }
  });

  return totalAdventures;
};

/**
 * Calculate eras completed
 * Era 1 (Umayyad): Complete when all 5 adventures are completed (15 modules with quizScore >= 2)
 * Era 2+: Complete when all adventures in that era are completed
 * Used for PostHog person property: eras_completed
 */
export const calculateErasCompleted = (legacyModules: ModuleProgress[], newModules: ProgressEntry[]): number => {
  let erasCompleted = 0;

  // Era 1: Check if all 15 modules have quizScore >= 2
  const era1CompletedModules = legacyModules.filter(m => m.quizScore && m.quizScore >= 2).length;
  if (era1CompletedModules >= 15) {
    erasCompleted += 1;
  }

  // Era 2+: Group by era_id and check if all modules in each era are completed
  const eraProgress = new Map<string, { total: number; completed: number }>();
  newModules.forEach(m => {
    const eraId = m.era_id;
    if (eraId) {
      if (!eraProgress.has(eraId)) {
        eraProgress.set(eraId, { total: 0, completed: 0 });
      }
      const stats = eraProgress.get(eraId)!;
      stats.total += 1;
      if (m.isCompleted && m.quizCompleted) {
        stats.completed += 1;
      }
    }
  });
  // Count eras where all modules are completed (minimum 15 modules = 5 adventures × 3 modules)
  eraProgress.forEach((stats) => {
    if (stats.completed >= 15 && stats.completed === stats.total) {
      erasCompleted += 1;
    }
  });

  return erasCompleted;
};

// ========== INITIAL DATA ==========

const INITIAL_ADVENTURE_DATA: AdventureProgress[] = [
  { adventureId: 1, isUnlocked: true, modulesCompleted: 0, totalModules: 3 },
  { adventureId: 2, isUnlocked: true, modulesCompleted: 0, totalModules: 3 },
  { adventureId: 3, isUnlocked: true, modulesCompleted: 0, totalModules: 3 },
  { adventureId: 4, isUnlocked: true, modulesCompleted: 0, totalModules: 3 },
  { adventureId: 5, isUnlocked: true, modulesCompleted: 0, totalModules: 3 },
];

const createEmptyState = (userId: string): GamifiedProgressState => ({
  user_id: userId,
  progress: [],
  adventureProgress: INITIAL_ADVENTURE_DATA,
  selectedEra: '',
  totalXP: 0,
  xp_by_era: {},
  xp_by_source: { lessons: 0, quizzes: 0, games: 0 },
  streak: {
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: new Date().toISOString().split('T')[0],
    longestStreakDate: new Date().toISOString().split('T')[0],
  },
  milestones: [],
  achievements_unlocked: [],
  behavior: {
    session_style: 'moderate',
    avg_attempts_per_visit: 0,
    engagement_trend: 'stable',
    weak_modules: [],
    strong_modules: [],
    last_computed: new Date().toISOString(),
    mastery_percentage: 0,
    mastered_modules: 0,
    total_modules: 0,
    active_days: 0,
  },
  metadata: {
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    migration_completed: false,
    total_quiz_attempts: 0,
    total_modules_attempted: 0,
  },
});

// ========== WEB-COMPATIBLE STORAGE ==========

class WebCompatibleStorage {
  private static isClient = typeof window !== 'undefined';

  static async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web' && !this.isClient) {
      return null;
    }
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn(`Storage getItem error for key ${key}:`, error);
      return null;
    }
  }

  static async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web' && !this.isClient) {
      return;
    }
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.warn(`Storage setItem error for key ${key}:`, error);
    }
  }
}

// ========== CONTEXT ==========

const GamifiedProgressContext = createContext<GamifiedProgressContextType | undefined>(undefined);

// ========== PROVIDER ==========

export function GamifiedProgressProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GamifiedProgressState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [syncTimer, setSyncTimer] = useState<NodeJS.Timeout | null>(null);

  const { user, isSignedIn } = useUser();
  const [previousUserId, setPreviousUserId] = useState<string | null>(null);

  // ========== RESET STATE ON USER CHANGE ==========
  // This ensures old user's data doesn't show when switching accounts
  useEffect(() => {
    if (user?.id !== previousUserId) {
      console.log('🔄 [GamifiedProgress] User changed, resetting state...');
      console.log(`   Previous: ${previousUserId} → New: ${user?.id || 'signed out'}`);

      // Reset state immediately to prevent showing old user's data
      setState(null);
      setIsInitialized(false);
      setIsLoading(true);
      setPreviousUserId(user?.id || null);
    }
  }, [user?.id, previousUserId]);

  // ========== INITIALIZATION ==========

  useEffect(() => {
    const initialize = async () => {
      if (!isSignedIn || !user?.id) {
        console.log('🎮 [GamifiedProgress] No user signed in');
        setState(null);
        setIsInitialized(false);
        setIsLoading(false);
        return;
      }

      console.log('🎮 [GamifiedProgress] Initializing for user:', user.id);
      setIsLoading(true);

      try {
        // Step 1: Check gamification_data table (new system)
        const cloudData = await fetchFromCloud(user.id);

        if (cloudData && cloudData.metadata?.migration_completed) {
          // Already migrated - use cloud data
          console.log('✅ [GamifiedProgress] Loaded from cloud (already migrated)');
          setState(cloudData);
          await saveToLocal(cloudData);
        } else {
          // Step 2: Check for legacy data and migrate
          console.log('🔄 [GamifiedProgress] Checking for legacy data to migrate...');
          const migratedData = await migrateFromLegacy(user.id, cloudData);
          setState(migratedData);
          await saveToLocal(migratedData);
          await saveToCloud(migratedData);
          console.log('✅ [GamifiedProgress] Migration complete');
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('❌ [GamifiedProgress] Initialization error:', error);
        // Fallback to empty state
        const emptyState = createEmptyState(user.id);
        setState(emptyState);
        setIsInitialized(true);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [isSignedIn, user?.id]);

  // ========== CLOUD SYNC ==========

  const fetchFromCloud = async (userId: string): Promise<GamifiedProgressState | null> => {
    try {
      const { data, error } = await supabase
        .from(SUPABASE_TABLE)
        .select('data')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('🎮 [GamifiedProgress] No cloud data found (new user)');
        } else {
          console.error('❌ [GamifiedProgress] Cloud fetch error:', error);
        }
        return null;
      }

      return data?.data as GamifiedProgressState;
    } catch (error) {
      console.error('❌ [GamifiedProgress] Cloud fetch error:', error);
      return null;
    }
  };

  const saveToCloud = async (data: GamifiedProgressState): Promise<void> => {
    if (!data.user_id) return;

    try {
      const { error } = await supabase
        .from(SUPABASE_TABLE)
        .upsert({
          user_id: data.user_id,
          data: data,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) {
        console.error('❌ [GamifiedProgress] Cloud save error:', error);
      } else {
        console.log('☁️ [GamifiedProgress] Saved to cloud');
      }
    } catch (error) {
      console.error('❌ [GamifiedProgress] Cloud save error:', error);
    }
  };

  const saveToLocal = async (data: GamifiedProgressState): Promise<void> => {
    try {
      await WebCompatibleStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      console.log('💾 [GamifiedProgress] Saved to local storage');
    } catch (error) {
      console.error('❌ [GamifiedProgress] Local save error:', error);
    }
  };

  const debouncedSync = useCallback((data: GamifiedProgressState) => {
    if (syncTimer) {
      clearTimeout(syncTimer);
    }

    const timer = setTimeout(() => {
      saveToCloud(data);
    }, SYNC_DEBOUNCE_MS);

    setSyncTimer(timer);
  }, [syncTimer]);

  const saveState = useCallback(async (newState: GamifiedProgressState) => {
    // Update local state
    setState(newState);

    // Save to local storage immediately
    await saveToLocal(newState);

    // Debounced cloud sync
    debouncedSync(newState);
  }, [debouncedSync]);

  // ========== MIGRATION ==========

  const migrateFromLegacy = async (userId: string, existingCloud?: GamifiedProgressState | null): Promise<GamifiedProgressState> => {
    console.log('🔄 [GamifiedProgress] Starting migration...');

    // Start with empty state or existing cloud data
    let newState = existingCloud || createEmptyState(userId);
    newState.user_id = userId;

    // Step 1: Fetch from user_data table (old system)
    try {
      const { data: userData, error } = await supabase
        .from(LEGACY_USER_DATA_TABLE)
        .select('data')
        .eq('user_id', userId)
        .single();

      if (!error && userData?.data) {
        console.log('📊 [GamifiedProgress] Found user_data to migrate');
        const legacyData = userData.data;

        // Migrate selectedEra
        if (legacyData.selectedEra) {
          newState.selectedEra = legacyData.selectedEra;
        }

        // Migrate streak
        if (legacyData.streak) {
          newState.streak = {
            currentStreak: legacyData.streak.current || legacyData.streak.currentStreak || 0,
            longestStreak: legacyData.streak.longest || legacyData.streak.longestStreak || 0,
            lastActiveDate: legacyData.streak.lastActiveDate || new Date().toISOString().split('T')[0],
            longestStreakDate: legacyData.streak.longestStreakDate || new Date().toISOString().split('T')[0],
          };
        }

        // Migrate adventures
        if (legacyData.adventures && Array.isArray(legacyData.adventures)) {
          newState.adventureProgress = legacyData.adventures;
        }

        // Build unified progress map (ALL eras go into progress array)
        const progressMap = new Map<string, ProgressEntry>();

        // Migrate Era 1 (Umayyad) modules to unified progress array
        if (legacyData.modules && Array.isArray(legacyData.modules)) {
          console.log(`  📚 Migrating ${legacyData.modules.length} Era 1 modules to progress array`);
          for (const m of legacyData.modules) {
            const adventureId = typeof m.adventureId === 'number' ? m.adventureId : parseInt(m.adventureId, 10);
            const moduleId = typeof m.moduleId === 'number' ? m.moduleId : parseInt(m.moduleId, 10);
            const key = `umayyad:${adventureId}:${moduleId}`;
            const quizScore = m.quizScore || 0;
            const xpEarned = quizScore * 10;
            const masteryLevel = quizScore >= 3 ? 'mastered' : quizScore >= 2 ? 'passed' : 'attempted';

            progressMap.set(key, {
              era_id: 'umayyad',
              adventureId,
              moduleId,
              lessonsCompleted: Array.isArray(m.lessonsCompleted) ? m.lessonsCompleted : [],
              quizScore,
              quizCorrectAnswers: quizScore, // Era 1: quizScore = correct answers
              completedAt: m.unlockedAt || new Date().toISOString(),
              isCompleted: m.isCompleted || false,
              quizCompleted: m.quizCompleted || false,
              mastery_level: masteryLevel,
              xp_earned: xpEarned,
              first_attempt_at: m.unlockedAt || new Date().toISOString(),
              attempt_count: 1,
            });
          }
        }

        // Migrate Era 2+ (newProgress) to progress array
        if (legacyData.newProgress && Array.isArray(legacyData.newProgress)) {
          console.log(`  📚 Migrating ${legacyData.newProgress.length} Era 2+ modules`);

          for (const entry of legacyData.newProgress) {
            const key = `${entry.era_id}:${entry.adventureId}:${entry.moduleId}`;
            const xpEarned = (entry.quizCorrectAnswers || 0) * 10;
            const quizScore = entry.quizScore || entry.quizCorrectAnswers || 0;
            const masteryLevel = quizScore >= 3 ? 'mastered' : quizScore >= 2 ? 'passed' : 'attempted';

            if (progressMap.has(key)) {
              const existing = progressMap.get(key)!;
              if (xpEarned > existing.xp_earned) {
                existing.quizScore = quizScore;
                existing.quizCorrectAnswers = entry.quizCorrectAnswers || 0;
                existing.xp_earned = xpEarned;
                existing.mastery_level = masteryLevel;
                existing.completedAt = entry.completedAt;
              }
              existing.lessonsCompleted = entry.lessonsCompleted || existing.lessonsCompleted;
              existing.attempt_count++;
            } else {
              progressMap.set(key, {
                era_id: entry.era_id,
                adventureId: entry.adventureId,
                moduleId: entry.moduleId,
                lessonsCompleted: entry.lessonsCompleted || [],
                quizScore: quizScore,
                quizCorrectAnswers: entry.quizCorrectAnswers || 0,
                completedAt: entry.completedAt || new Date().toISOString(),
                isCompleted: entry.isCompleted || false,
                quizCompleted: entry.quizCompleted || false,
                mastery_level: masteryLevel,
                xp_earned: xpEarned,
                first_attempt_at: entry.completedAt || new Date().toISOString(),
                attempt_count: 1,
              });
            }
          }
        }

        newState.progress = Array.from(progressMap.values());
      }
    } catch (error) {
      console.log('⚠️ [GamifiedProgress] No user_data found or error:', error);
    }

    // Step 2: Read from legacy AsyncStorage keys (if no cloud data)
    try {
      // Adventure progress
      const legacyAdventures = await WebCompatibleStorage.getItem(LEGACY_KEYS.ADVENTURE_PROGRESS);
      if (legacyAdventures) {
        newState.adventureProgress = JSON.parse(legacyAdventures);
      }

      // Era 1 modules from AsyncStorage (convert to unified progress format)
      const legacyModules = await WebCompatibleStorage.getItem(LEGACY_KEYS.MODULE_PROGRESS);
      const hasEra1InProgress = newState.progress.some(p => p.era_id === 'umayyad');
      if (legacyModules && !hasEra1InProgress) {
        const modules = JSON.parse(legacyModules);
        console.log(`  💾 Loading ${modules.length} Era 1 modules from AsyncStorage`);
        for (const m of modules) {
          const quizScore = m.quizScore || 0;
          newState.progress.push({
            era_id: 'umayyad',
            adventureId: m.adventureId,
            moduleId: m.moduleId,
            lessonsCompleted: m.lessonsCompleted || [],
            quizScore,
            quizCorrectAnswers: quizScore,
            completedAt: m.unlockedAt || new Date().toISOString(),
            isCompleted: m.isCompleted || false,
            quizCompleted: m.quizCompleted || false,
            mastery_level: quizScore >= 3 ? 'mastered' : quizScore >= 2 ? 'passed' : 'attempted',
            xp_earned: quizScore * 10,
            first_attempt_at: m.unlockedAt || new Date().toISOString(),
            attempt_count: 1,
          });
        }
      }

      // Era 2+ progress from AsyncStorage
      const newProgress = await WebCompatibleStorage.getItem(LEGACY_KEYS.NEW_USER_PROGRESS);
      const hasEra2InProgress = newState.progress.some(p => p.era_id !== 'umayyad');
      if (newProgress && !hasEra2InProgress) {
        const entries = JSON.parse(newProgress);
        console.log(`  💾 Loading ${entries.length} Era 2+ progress from AsyncStorage`);
        for (const e of entries) {
          const quizScore = e.quizScore || 0;
          newState.progress.push({
            era_id: e.era_id,
            adventureId: e.adventureId,
            moduleId: e.moduleId,
            lessonsCompleted: e.lessonsCompleted || [],
            quizScore,
            quizCorrectAnswers: e.quizCorrectAnswers || 0,
            completedAt: e.completedAt || new Date().toISOString(),
            isCompleted: e.isCompleted || false,
            quizCompleted: e.quizCompleted || false,
            mastery_level: quizScore >= 3 ? 'mastered' : quizScore >= 2 ? 'passed' : 'attempted',
            xp_earned: (e.quizCorrectAnswers || 0) * 10,
            first_attempt_at: e.completedAt || new Date().toISOString(),
            attempt_count: 1,
          });
        }
      }

      // Selected era
      const selectedEra = await WebCompatibleStorage.getItem(LEGACY_KEYS.SELECTED_ERA);
      if (selectedEra && !newState.selectedEra) {
        newState.selectedEra = selectedEra;
      }

      // Streak
      const streak = await WebCompatibleStorage.getItem(LEGACY_KEYS.DAILY_STREAK);
      const lastActive = await WebCompatibleStorage.getItem(LEGACY_KEYS.LAST_ACTIVE_DATE);
      if (streak) {
        newState.streak.currentStreak = parseInt(streak, 10) || 0;
      }
      if (lastActive) {
        newState.streak.lastActiveDate = lastActive;
      }
    } catch (error) {
      console.log('⚠️ [GamifiedProgress] Error reading legacy AsyncStorage:', error);
    }

    // Step 3: Calculate totals (unified - all from progress array)
    const totalXP = calculateXPFromProgress(newState.progress);
    newState.totalXP = totalXP;

    // Calculate XP by era
    newState.xp_by_era = calculateXPByEra(newState.progress);

    // Calculate XP by source (sum of all era XP = quizzes)
    newState.xp_by_source = {
      lessons: 0,
      quizzes: Object.values(newState.xp_by_era).reduce((sum, xp) => sum + xp, 0),
      games: 0,
    };

    // Update behavior stats
    const masteredCount = newState.progress.filter(p => p.mastery_level === 'mastered').length;
    newState.behavior.mastered_modules = masteredCount;
    newState.behavior.total_modules = newState.progress.length;
    newState.behavior.mastery_percentage = newState.behavior.total_modules > 0
      ? Math.round((masteredCount / newState.behavior.total_modules) * 100)
      : 0;

    // Mark migration complete
    newState.metadata.migration_completed = true;
    newState.metadata.migration_source = 'user_data + AsyncStorage';
    newState.metadata.last_updated = new Date().toISOString();
    newState.metadata.total_quiz_attempts = newState.progress.length;
    newState.metadata.total_modules_attempted = newState.progress.filter(p => p.quizCompleted).length;

    console.log('📊 [GamifiedProgress] Migration results:');
    console.log(`  Total XP: ${newState.totalXP}`);
    console.log(`  Total modules: ${newState.progress.length}`);
    console.log(`  XP by era:`, newState.xp_by_era);

    return newState;
  };

  // ========== ERA MANAGEMENT ==========

  const setSelectedEra = useCallback(async (eraId: string) => {
    if (!state) return;

    const newState = {
      ...state,
      selectedEra: eraId,
      metadata: { ...state.metadata, last_updated: new Date().toISOString() },
    };

    await saveState(newState);

    // Also save to legacy key for backward compatibility
    await WebCompatibleStorage.setItem(LEGACY_KEYS.SELECTED_ERA, eraId);
  }, [state, saveState]);

  // ========== PROGRESS GETTERS ==========

  const getAdventureProgress = useCallback((adventureId: number): AdventureProgress | null => {
    if (!state) return null;
    return state.adventureProgress.find(a => a.adventureId === adventureId) || null;
  }, [state]);

  const getModuleProgress = useCallback((adventureId: number, moduleId: number): ModuleProgress | null => {
    if (!state) return null;
    // Find in unified progress array (supports all eras)
    const entry = state.progress.find(
      p => p.adventureId === adventureId && p.moduleId === moduleId
    );
    if (!entry) return null;
    // Convert ProgressEntry to ModuleProgress format for backward compatibility
    return {
      adventureId: typeof entry.adventureId === 'number' ? entry.adventureId : parseInt(String(entry.adventureId), 10),
      moduleId: typeof entry.moduleId === 'number' ? entry.moduleId : parseInt(String(entry.moduleId), 10),
      isCompleted: entry.isCompleted,
      lessonsCompleted: entry.lessonsCompleted,
      quizCompleted: entry.quizCompleted,
      quizScore: entry.quizScore,
      unlockedAt: entry.first_attempt_at || entry.completedAt,
    };
  }, [state]);

  // Get progress for new era modules (uses string IDs)
  // This is the SOURCE OF TRUTH for module progress - avoids AsyncStorage race conditions
  const getProgressByStringIds = useCallback((adventureId: string, moduleId: string): ProgressEntry | null => {
    if (!state) return null;
    return state.progress.find(
      p => p.adventureId === adventureId && p.moduleId === moduleId
    ) || null;
  }, [state]);

  // ========== SAVE PROGRESS ==========

  const saveNewProgressData = useCallback(async (moduleData: any): Promise<void> => {
    if (!state) {
      console.error('❌ [GamifiedProgress] Cannot save: Not initialized');
      return;
    }

    console.log('🔄 [GamifiedProgress] Saving new progress:', moduleData);

    const key = `${moduleData.era_id}:${moduleData.adventureId}:${moduleData.moduleId}`;
    const xpEarned = (moduleData.quizCorrectAnswers || 0) * 10;
    const quizScore = moduleData.quizScore || moduleData.quizCorrectAnswers || 0;
    const masteryLevel = quizScore >= 3 ? 'mastered' : quizScore >= 2 ? 'passed' : 'attempted';

    // Find existing entry
    const existingIndex = state.progress.findIndex(
      p => p.era_id === moduleData.era_id &&
           p.adventureId === moduleData.adventureId &&
           p.moduleId === moduleData.moduleId
    );

    let updatedProgress = [...state.progress];

    if (existingIndex >= 0) {
      // Update existing (retake)
      const existing = updatedProgress[existingIndex];
      updatedProgress[existingIndex] = {
        ...existing,
        lessonsCompleted: moduleData.lessonsCompleted || existing.lessonsCompleted,
        quizScore: Math.max(existing.quizScore, quizScore),
        quizCorrectAnswers: Math.max(existing.quizCorrectAnswers || 0, moduleData.quizCorrectAnswers || 0),
        completedAt: existing.completedAt, // NEVER update on retake - keep original completion date
        isCompleted: moduleData.isCompleted || existing.isCompleted,
        quizCompleted: moduleData.quizCompleted || existing.quizCompleted,
        mastery_level: masteryLevel,
        xp_earned: Math.max(existing.xp_earned, xpEarned),
        attempt_count: (moduleData.quizCompleted && existing.quizCompleted)
          ? existing.attempt_count + 1  // Actual retake
          : existing.attempt_count,     // Not a retake, keep same
      };
    } else {
      // Add new
      updatedProgress.push({
        era_id: moduleData.era_id,
        adventureId: moduleData.adventureId,
        moduleId: moduleData.moduleId,
        lessonsCompleted: moduleData.lessonsCompleted || [],
        quizScore,
        quizCorrectAnswers: moduleData.quizCorrectAnswers || 0,
        completedAt: moduleData.completedAt || new Date().toISOString(),
        isCompleted: moduleData.isCompleted || false,
        quizCompleted: moduleData.quizCompleted || false,
        mastery_level: masteryLevel,
        xp_earned: xpEarned,
        first_attempt_at: new Date().toISOString(),
        attempt_count: 1,
      });
    }

    // Recalculate XP (unified - all from progress array)
    const totalXP = calculateXPFromProgress(updatedProgress);

    // Update xp_by_era
    const xpByEra = calculateXPByEra(updatedProgress);

    // Update behavior
    const masteredCount = updatedProgress.filter(p => p.mastery_level === 'mastered').length;

    const newState: GamifiedProgressState = {
      ...state,
      progress: updatedProgress,
      totalXP,
      xp_by_era: xpByEra,
      xp_by_source: {
        lessons: 0,
        quizzes: Object.values(xpByEra).reduce((sum, xp) => sum + xp, 0),
        games: 0,
      },
      behavior: {
        ...state.behavior,
        mastered_modules: masteredCount,
        total_modules: updatedProgress.length,
        mastery_percentage: updatedProgress.length > 0
          ? Math.round((masteredCount / updatedProgress.length) * 100)
          : 0,
      },
      metadata: {
        ...state.metadata,
        last_updated: new Date().toISOString(),
        total_quiz_attempts: updatedProgress.length,
        total_modules_attempted: updatedProgress.length,
      },
    };

    await saveState(newState);

    // Also save to legacy AsyncStorage for backward compatibility
    await WebCompatibleStorage.setItem(
      LEGACY_KEYS.NEW_USER_PROGRESS,
      JSON.stringify(updatedProgress.map(p => ({
        era_id: p.era_id,
        adventureId: p.adventureId,
        moduleId: p.moduleId,
        lessonsCompleted: p.lessonsCompleted,
        quizScore: p.quizScore,
        quizCorrectAnswers: p.quizCorrectAnswers,
        completedAt: p.completedAt,
        isCompleted: p.isCompleted,
        quizCompleted: p.quizCompleted,
      })))
    );

    // Update PostHog (unified - pass empty array for legacy param)
    const lessonsCompleted = calculateLessonsCompleted([], updatedProgress);
    const adventuresCompleted = calculateAdventuresCompleted([], updatedProgress);
    const erasCompleted = calculateErasCompleted([], updatedProgress);

    analyticsService.updateProgressProperties({
      total_xp: totalXP,
      quizzes_completed: updatedProgress.filter(p => p.quizCompleted).length,
      modules_completed: updatedProgress.filter(p => p.isCompleted).length,
      lessons_completed: lessonsCompleted,
      adventures_completed: adventuresCompleted,
      eras_completed: erasCompleted,
      era_xp: xpByEra,
    });

    console.log(`✅ Progress saved. Total XP: ${totalXP}`);
  }, [state, saveState]);

  // ========== QUIZ TRACKING (Detailed) ==========

  const trackQuizAttempt = useCallback(async (params: {
    era_id: string;
    adventure_id: string;
    module_id: string;
    quiz_score: number;
    quiz_correct_answers: number;
    started_at: string;
    completed_at: string;
    questions: QuestionResult[];
  }): Promise<void> => {
    // This calls saveNewProgressData with the quiz data
    await saveNewProgressData({
      era_id: params.era_id,
      adventureId: params.adventure_id,
      moduleId: params.module_id,
      quizScore: params.quiz_score,
      quizCorrectAnswers: params.quiz_correct_answers,
      completedAt: params.completed_at,
      isCompleted: true,
      quizCompleted: true,
    });
  }, [saveNewProgressData]);

  // ========== XP CALCULATIONS ==========

  const calculateTotalXP = useCallback((): number => {
    if (!state) return 0;
    return state.totalXP;
  }, [state]);

  const calculateModulesCompleted = useCallback((): number => {
    if (!state) return 0;
    return state.progress.filter(p => p.isCompleted).length;
  }, [state]);

  const checkIfCrossed50XPBoundary = useCallback((oldXP: number, newXP: number): number | null => {
    return checkMilestoneCrossed(oldXP, newXP);
  }, []);

  const getROIAdventureStats = useCallback(async (adventureId: string): Promise<{ xp: number; completedModules: number }> => {
    if (!state) return { xp: 0, completedModules: 0 };

    const adventureModules = state.progress.filter(p => p.adventureId === adventureId);

    return {
      xp: adventureModules.reduce((sum, p) => sum + (p.xp_earned || 0), 0),
      completedModules: adventureModules.filter(p => p.isCompleted && p.quizCompleted).length,
    };
  }, [state]);

  const getXPByEra = useCallback((): Record<string, number> => {
    if (!state) return {};
    return state.xp_by_era;
  }, [state]);

  // ========== LEGACY HELPERS ==========

  const canRetakeModule = useCallback((adventureId: number, moduleId: number): boolean => {
    const module = getModuleProgress(adventureId, moduleId);
    return module?.quizCompleted || false;
  }, [getModuleProgress]);

  const isModuleUnlocked = useCallback((adventureId: number, moduleId: number): boolean => {
    // For Umayyad Dynasty (adventures 1-5): All modules are unlocked
    if (adventureId >= 1 && adventureId <= 5) {
      return true;
    }

    const adventure = getAdventureProgress(adventureId);
    if (!adventure?.isUnlocked) return false;
    if (moduleId === 1) return true;

    const prevModule = getModuleProgress(adventureId, moduleId - 1);
    return prevModule?.isCompleted || false;
  }, [getAdventureProgress, getModuleProgress]);

  const isLessonCompleted = useCallback((adventureId: number, moduleId: number, lessonId: string): boolean => {
    const module = getModuleProgress(adventureId, moduleId);
    return module?.lessonsCompleted.includes(lessonId) || false;
  }, [getModuleProgress]);

  const getOverallProgress = useCallback((): number => {
    if (!state) return 0;
    const totalModules = state.adventureProgress.reduce((sum, a) => sum + a.totalModules, 0);
    const completedModules = state.progress.filter(p => p.isCompleted).length;
    return totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
  }, [state]);

  const getModuleStarCount = useCallback((adventureId: number, moduleId: number): number => {
    const module = getModuleProgress(adventureId, moduleId);
    if (!module || !module.quizCompleted || typeof module.quizScore !== 'number') return 0;

    const score = module.quizScore;
    return score <= 2 ? 1 : score <= 4 ? 2 : 3;
  }, [getModuleProgress]);

  // ========== STREAK ==========

  const getStreak = useCallback((): StreakData => {
    if (!state) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: new Date().toISOString().split('T')[0],
        longestStreakDate: new Date().toISOString().split('T')[0],
      };
    }
    return state.streak;
  }, [state]);

  // Sync streak data to state (called by GamificationOrchestrator)
  // This ensures streak is saved to cloud via the unified sync system
  const syncStreakToState = useCallback(async (streakData: StreakData): Promise<void> => {
    if (!state) return;

    const newState = {
      ...state,
      streak: streakData,
      metadata: { ...state.metadata, last_updated: new Date().toISOString() },
    };

    await saveState(newState);
    console.log(`🔥 [GamifiedProgress] Streak synced to state: ${streakData.currentStreak} days`);
  }, [state, saveState]);

  // ========== ACHIEVEMENTS & MILESTONES ==========

  const getMilestones = useCallback((): Milestone[] => {
    return state?.milestones || [];
  }, [state]);

  const getAchievements = useCallback((): Achievement[] => {
    return state?.achievements_unlocked || [];
  }, [state]);

  const addMilestone = useCallback(async (milestone: Omit<Milestone, 'achieved_at'>): Promise<void> => {
    if (!state) return;

    // Check if this milestone already exists (same type + threshold + era_id)
    const alreadyExists = state.milestones.some(
      (m) => m.type === milestone.type && m.threshold === milestone.threshold && m.era_id === milestone.era_id
    );
    if (alreadyExists) {
      console.log(`⏭️ [GamifiedProgress] Milestone already exists: ${milestone.type} ${milestone.threshold} for era ${milestone.era_id}`);
      return;
    }

    const newMilestone: Milestone = {
      ...milestone,
      achieved_at: new Date().toISOString(),
    };

    const newState = {
      ...state,
      milestones: [...state.milestones, newMilestone],
      metadata: { ...state.metadata, last_updated: new Date().toISOString() },
    };

    await saveState(newState);
    console.log(`✅ [GamifiedProgress] Added milestone: ${milestone.type} ${milestone.threshold} for era ${milestone.era_id}`);
  }, [state, saveState]);

  const unlockAchievement = useCallback(async (achievement: Omit<Achievement, 'unlocked_at'>): Promise<void> => {
    if (!state) return;

    // Check if already unlocked
    if (state.achievements_unlocked.some(a => a.id === achievement.id)) {
      return;
    }

    const newAchievement: Achievement = {
      ...achievement,
      unlocked_at: new Date().toISOString(),
    };

    const newState = {
      ...state,
      achievements_unlocked: [...state.achievements_unlocked, newAchievement],
      metadata: { ...state.metadata, last_updated: new Date().toISOString() },
    };

    await saveState(newState);
  }, [state, saveState]);

  // ========== SYNC & RELOAD ==========

  const reloadData = useCallback(async (): Promise<void> => {
    if (!user?.id) return;

    console.log('🔄 [GamifiedProgress] Reloading data...');
    setIsLoading(true);

    try {
      const cloudData = await fetchFromCloud(user.id);
      if (cloudData) {
        setState(cloudData);
        await saveToLocal(cloudData);
      }
    } catch (error) {
      console.error('❌ [GamifiedProgress] Reload error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const syncToCloud = useCallback(async (): Promise<void> => {
    if (!state) return;
    await saveToCloud(state);
  }, [state]);

  // ========== CONTEXT VALUE ==========

  const contextValue: GamifiedProgressContextType = {
    state,
    isLoading,
    isInitialized,

    selectedEra: state?.selectedEra || null,
    setSelectedEra,

    adventureProgress: state?.adventureProgress || INITIAL_ADVENTURE_DATA,
    // Convert unified progress to ModuleProgress format for backward compatibility
    moduleProgress: (state?.progress || []).map(p => ({
      adventureId: typeof p.adventureId === 'number' ? p.adventureId : parseInt(String(p.adventureId), 10),
      moduleId: typeof p.moduleId === 'number' ? p.moduleId : parseInt(String(p.moduleId), 10),
      isCompleted: p.isCompleted,
      lessonsCompleted: p.lessonsCompleted,
      quizCompleted: p.quizCompleted,
      quizScore: p.quizScore,
      unlockedAt: p.first_attempt_at || p.completedAt,
    })),
    getAdventureProgress,
    getModuleProgress,
    getProgressByStringIds,
    saveNewProgressData,
    trackQuizAttempt,

    calculateTotalXP,
    calculateModulesCompleted,
    checkIfCrossed50XPBoundary,
    getROIAdventureStats,
    getXPByEra,

    canRetakeModule,
    isModuleUnlocked,
    isLessonCompleted,
    getOverallProgress,
    getModuleStarCount,

    getStreak,
    syncStreakToState,

    getMilestones,
    getAchievements,
    addMilestone,
    unlockAchievement,

    reloadData,
    syncToCloud,
  };

  return (
    <GamifiedProgressContext.Provider value={contextValue}>
      {children}
    </GamifiedProgressContext.Provider>
  );
}

// ========== HOOK ==========

export function useGamifiedProgress(): GamifiedProgressContextType {
  const context = useContext(GamifiedProgressContext);
  if (context === undefined) {
    throw new Error('useGamifiedProgress must be used within a GamifiedProgressProvider');
  }
  return context;
}

// Legacy hook alias (for backward compatibility)
export const useGamification = useGamifiedProgress;

// ========== LEGACY COMPATIBILITY ==========

// Re-export for backward compatibility with existing imports
export { EraType, ModuleState } from '@/gamification/types/gamification';
export type { ProgressUpdateAction, ModuleProgress, AdventureProgress } from '@/gamification/types/gamification';

// Legacy hook alias
export const useProgress = useGamifiedProgress;

// Legacy XP calculation exports (for components that import directly)
// Note: legacyModules parameter kept for backward compatibility but all modules now use unified format
export const calculateTotalXP = (legacyModules: any[], newModules: any[]): number => {
  // All modules now use unified format with quizCorrectAnswers
  return calculateXPFromProgress([...legacyModules, ...newModules]);
};

export const calculateModulesCompleted = (legacyModules: any[], newModules: any[]): number => {
  const legacyCompleted = legacyModules.filter((m: any) => m.quizScore && m.quizScore >= 2).length;
  const newCompleted = newModules.filter((m: any) => m.isCompleted).length;
  return legacyCompleted + newCompleted;
};

export const checkIfCrossed50XPBoundary = (oldXP: number, newXP: number): number | null => {
  return checkMilestoneCrossed(oldXP, newXP);
};

// All eras now use unified format with quizCorrectAnswers
export const calculateXPForEra = (modules: any[], _eraType: EraType): number => {
  // EraType parameter kept for backward compatibility but all modules use same format
  return calculateXPFromProgress(modules);
};
