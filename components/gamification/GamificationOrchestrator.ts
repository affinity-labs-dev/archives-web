/**
 * GamificationOrchestrator.ts
 *
 * Single Source of Truth for All Gamification Data
 *
 * This file manages:
 * - User progress (XP, streaks, module completion)
 * - Quiz attempts (complete history with question-level detail)
 * - Milestones (achievements timeline)
 * - Achievements (badge unlocks)
 * - Behavior analytics (session patterns, engagement trends)
 *
 * Storage:
 * - AsyncStorage: 'gamification_data' (ONE key)
 * - Supabase: 'gamification_data' table (ONE JSONB column)
 *
 * Schema: Document 1 from DATA_SCHEMA_INSTRUCTIONS.md
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/hooks/lib/supabase';

// ========== TYPE DEFINITIONS ==========

/**
 * QuestionResult: Individual question performance (used by trackAttempt)
 */
export interface QuestionResult {
  q_index: number;
  question_text?: string;
  correct: boolean;
  user_answer?: string;
  correct_answer?: string;
  time_taken_seconds?: number;
}

/**
 * GamificationData: Complete Document 1 schema
 * Updated to match uploaded data structure from cleaned JSON
 */
export interface GamificationData {
  user_id: string;
  streak: {
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: string;
    longestStreakDate: string;
  };
  modules: any[];
  totalXP: number;
  adventures: any[];
  selectedEra: string;
  xp_by_era: {
    [eraId: string]: number;
  };
  xp_by_source: {
    lessons: number;
    quizzes: number;
    games: number;
  };
  progress: Array<{
    era_id: string;
    adventureId: string;
    moduleId: string;
    lessonsCompleted: string[]; // Track individual lesson completions
    quizScore: number;
    completedAt: string;
    isModuleCompleted: boolean;
    quizCompleted: boolean;
    mastery_level: string;
    xp_earned: number;
    first_attempt_at: string;
    attempt_count: number;
  }>;
  milestones: Array<{
    type: string;
    threshold?: number;
    era_id: string;
    adventure_id?: string;
    module_id?: string;
    achieved_at: string;
  }>;
  behavior: {
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
  };
  achievements_unlocked: Array<{
    id: string;
    name: string;
    unlocked_at: string;
    era_id?: string;
    adventureId?: string;
    moduleId?: string;
  }>;
  metadata: {
    created_at: string;
    last_updated: string;
    total_quiz_attempts: number;
    total_modules_attempted: number;
  };
}

// ========== CONSTANTS ==========

const GAMIFICATION_STORAGE_KEY = 'gamification_data';
const GAMIFICATION_TABLE = 'gamification_data';
const SYNC_DEBOUNCE_MS = 2000; // Debounce time for cloud sync (milliseconds)

// ========== GAMIFICATION ORCHESTRATOR CLASS ==========

class GamificationOrchestrator {
  private static instance: GamificationOrchestrator;
  private data: GamificationData | null = null;
  private userId: string | null = null;
  private syncDebounceTimer: NodeJS.Timeout | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): GamificationOrchestrator {
    if (!this.instance) {
      this.instance = new GamificationOrchestrator();
    }
    return this.instance;
  }

  // ========== INITIALIZATION ==========

  /**
   * Initialize orchestrator for a user
   * Call this on app launch after authentication
   */
  async initialize(userId: string): Promise<void> {
    console.log('🎮 [GamificationOrchestrator] Initializing for user:', userId);
    this.userId = userId;

    // Check cloud first
    console.log('☁️ [GamificationOrchestrator] Checking cloud for data...');
    const cloudData = await this.syncFromCloud();

    // ALSO check user_data.newProgress for source of truth
    console.log('📊 [GamificationOrchestrator] Checking user_data for actual progress...');
    const userData = await this.fetchUserData(userId);

    if (userData && userData.newProgress && userData.newProgress.length > 0) {
      // user_data exists - ALWAYS use it as source of truth for progress
      console.log(`📊 [GamificationOrchestrator] user_data has ${userData.newProgress.length} modules`);
      console.log('🔄 [GamificationOrchestrator] Syncing from user_data.newProgress...');

      // Migrate from user_data (updates progress array with latest lessons)
      this.data = this.migrateFromUserData(userId, userData, cloudData);
      await this.save();
      console.log('✅ [GamificationOrchestrator] Synced from user_data and saved to cloud');
    } else if (cloudData) {
      // No user_data but cloud data exists - use cloud
      this.data = cloudData;
      await this.save();
      console.log('✅ [GamificationOrchestrator] Loaded from cloud (no user_data)');
    } else {
      // New user - create empty schema
      console.log('🎮 [GamificationOrchestrator] New user - creating empty schema');
      this.data = this.createEmptySchema(userId);
      await this.save();
    }

    console.log('🎮 [GamificationOrchestrator] Initialized successfully');
    console.log(`  📊 Total XP: ${this.data.totalXP}`);
    console.log(`  📝 Quiz attempts: ${this.data.progress.length}`);
  }

  /**
   * Load data from AsyncStorage
   */
  async load(): Promise<GamificationData | null> {
    try {
      const stored = await AsyncStorage.getItem(GAMIFICATION_STORAGE_KEY);
      if (stored) {
        this.data = JSON.parse(stored);
        console.log('🎮 [GamificationOrchestrator] Loaded from AsyncStorage');
        return this.data;
      }
      return null;
    } catch (error) {
      console.error('❌ [GamificationOrchestrator] Error loading from AsyncStorage:', error);
      return null;
    }
  }

  /**
   * Save data to AsyncStorage and trigger cloud sync
   */
  async save(): Promise<void> {
    if (!this.data) return;

    try {
      // Update timestamp
      this.data.metadata.last_updated = new Date().toISOString();

      // Save to AsyncStorage
      await AsyncStorage.setItem(GAMIFICATION_STORAGE_KEY, JSON.stringify(this.data));
      console.log('💾 [GamificationOrchestrator] Saved to AsyncStorage');

      // Trigger debounced cloud sync
      this.debouncedSync();
    } catch (error) {
      console.error('❌ [GamificationOrchestrator] Error saving:', error);
    }
  }

  // ========== CLOUD SYNC ==========

  /**
   * Sync data to Supabase cloud
   */
  async syncToCloud(): Promise<void> {
    if (!this.userId || !this.data) {
      console.log('⚠️ [GamificationOrchestrator] Cannot sync: No user or data');
      return;
    }

    try {
      console.log('☁️ [GamificationOrchestrator] Starting cloud sync...');
      console.log('  📊 Syncing totalXP:', this.data.totalXP);
      console.log('  📊 Syncing xp_by_era:', JSON.stringify(this.data.xp_by_era, null, 2));
      console.log('  📝 Progress entries:', this.data.progress.length);

      const { error } = await supabase
        .from(GAMIFICATION_TABLE)
        .upsert(
          {
            user_id: this.userId,
            data: this.data,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('❌ [GamificationOrchestrator] Supabase sync error:', error);
      } else {
        console.log('☁️ [GamificationOrchestrator] ✅ Synced to cloud successfully');
        console.log('  📊 Cloud now has totalXP:', this.data.totalXP);
        console.log('  📊 Cloud now has xp_by_era:', JSON.stringify(this.data.xp_by_era, null, 2));
      }
    } catch (error) {
      console.error('❌ [GamificationOrchestrator] Sync error:', error);
    }
  }

  /**
   * Sync data from Supabase cloud
   */
  async syncFromCloud(): Promise<GamificationData | null> {
    if (!this.userId) {
      console.log('⚠️ [GamificationOrchestrator] Cannot sync from cloud: No user ID');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from(GAMIFICATION_TABLE)
        .select('data')
        .eq('user_id', this.userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('🎮 [GamificationOrchestrator] No cloud data found (new user)');
        } else {
          console.error('❌ [GamificationOrchestrator] Error fetching from cloud:', error);
        }
        return null;
      }

      if (data?.data) {
        const gamificationData = data.data as GamificationData;
        console.log('☁️ [GamificationOrchestrator] Downloaded from cloud');
        console.log(`  📊 Total XP: ${gamificationData.totalXP}`);
        console.log(`  📝 Quiz attempts: ${gamificationData.progress?.length || 0}`);
        console.log(`  🏆 Milestones: ${gamificationData.milestones?.length || 0}`);
        console.log(`  🎖️  Achievements: ${gamificationData.achievements_unlocked?.length || 0}`);
        return gamificationData;
      }

      return null;
    } catch (error) {
      console.error('❌ [GamificationOrchestrator] Sync from cloud error:', error);
      return null;
    }
  }

  /**
   * Fetch user_data from Supabase (source of truth for quiz completions)
   */
  private async fetchUserData(userId: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('user_data')
        .select('data')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.log('⚠️ [GamificationOrchestrator] No user_data found');
        return null;
      }

      return data?.data || null;
    } catch (error) {
      console.error('❌ [GamificationOrchestrator] Error fetching user_data:', error);
      return null;
    }
  }

  /**
   * Migrate from user_data.newProgress to gamification_data format
   * Copies lessonsCompleted arrays directly from user_data (accurate data)
   * Preserves extra gamification data (milestones, achievements, behavior) from cloud
   */
  private migrateFromUserData(userId: string, userData: any, cloudData?: GamificationData | null): GamificationData {
    const newProgress = userData.newProgress || [];

    // Convert newProgress entries to gamification progress format
    const progressMap = new Map<string, any>();

    for (const entry of newProgress) {
      const key = `${entry.era_id}:${entry.adventureId}:${entry.moduleId}`;
      const xpEarned = entry.quizCorrectAnswers * 10;
      const masteryLevel = entry.quizScore >= 3 ? 'mastered' : entry.quizScore >= 2 ? 'passed' : 'attempted';

      if (progressMap.has(key)) {
        // Retry - keep best score
        const existing = progressMap.get(key);
        if (xpEarned > existing.xp_earned) {
          existing.quizScore = entry.quizScore;
          existing.xp_earned = xpEarned;
          existing.mastery_level = masteryLevel;
          existing.completedAt = entry.completedAt;
        }
        // Copy lessons from user_data
        existing.lessonsCompleted = entry.lessonsCompleted || [];
        existing.attempt_count++;
      } else {
        // First attempt - copy lessons from user_data
        progressMap.set(key, {
          era_id: entry.era_id,
          adventureId: entry.adventureId,
          moduleId: entry.moduleId,
          lessonsCompleted: entry.lessonsCompleted || [],
          quizScore: entry.quizScore,
          completedAt: entry.completedAt,
          isModuleCompleted: true,
          quizCompleted: true,
          mastery_level: masteryLevel,
          xp_earned: xpEarned,
          first_attempt_at: entry.completedAt,
          attempt_count: 1,
        });
      }
    }

    const progress = Array.from(progressMap.values());

    // Calculate totalXP and xp_by_era
    const totalXP = progress.reduce((sum, p) => sum + p.xp_earned, 0);

    const xpByEra: { [eraId: string]: number } = {};
    progress.forEach((p) => {
      if (!xpByEra[p.era_id]) xpByEra[p.era_id] = 0;
      xpByEra[p.era_id] += p.xp_earned;
    });

    // Calculate behavior stats
    const masteredCount = progress.filter(p => p.mastery_level === 'mastered').length;
    const masteryPercentage = progress.length > 0
      ? Math.round((masteredCount / progress.length) * 100)
      : 0;

    console.log('📊 [Migration] Results:');
    console.log(`  Total XP: ${totalXP}`);
    console.log(`  XP by era:`, JSON.stringify(xpByEra, null, 2));
    console.log(`  Modules: ${progress.length}`);
    console.log(`  Mastered: ${masteredCount} (${masteryPercentage}%)`);

    // Preserve extra gamification data from cloud if it exists
    return {
      user_id: userId,
      streak: cloudData?.streak || userData.streak || {
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: new Date().toISOString().split('T')[0],
        longestStreakDate: new Date().toISOString().split('T')[0],
      },
      modules: cloudData?.modules || [],
      totalXP,
      adventures: cloudData?.adventures || [],
      selectedEra: userData.selectedEra || cloudData?.selectedEra || '',
      xp_by_era: xpByEra,
      xp_by_source: cloudData?.xp_by_source || {
        lessons: 0,
        quizzes: totalXP,
        games: 0,
      },
      progress, // ✅ Always from user_data (source of truth)
      milestones: cloudData?.milestones || [], // ✅ Preserve from cloud
      behavior: {
        session_style: cloudData?.behavior?.session_style || 'moderate',
        avg_attempts_per_visit: cloudData?.behavior?.avg_attempts_per_visit || 0,
        engagement_trend: cloudData?.behavior?.engagement_trend || 'stable',
        weak_modules: cloudData?.behavior?.weak_modules || [],
        strong_modules: cloudData?.behavior?.strong_modules || [],
        last_computed: new Date().toISOString(),
        mastery_percentage: masteryPercentage, // Recalculate
        mastered_modules: masteredCount, // Recalculate
        total_modules: progress.length, // Recalculate
        active_days: cloudData?.behavior?.active_days || 0,
      },
      achievements_unlocked: cloudData?.achievements_unlocked || [], // ✅ Preserve from cloud
      metadata: {
        created_at: cloudData?.metadata?.created_at || new Date().toISOString(),
        last_updated: new Date().toISOString(),
        total_quiz_attempts: progress.length,
        total_modules_attempted: progress.length,
      },
    };
  }

  /**
   * Debounced cloud sync to prevent excessive writes
   */
  private debouncedSync(): void {
    // Clear existing timer
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      console.log('🕐 [GamificationOrchestrator] Cleared previous sync timer');
    }

    // Set new timer
    console.log(`🕐 [GamificationOrchestrator] Scheduled cloud sync in ${SYNC_DEBOUNCE_MS}ms`);
    this.syncDebounceTimer = setTimeout(() => {
      console.log('🕐 [GamificationOrchestrator] Debounce timer fired, calling syncToCloud()');
      this.syncToCloud();
    }, SYNC_DEBOUNCE_MS);
  }

  // ========== ATTEMPT TRACKING ==========

  /**
   * Track a quiz attempt
   * Call this when user completes a quiz
   */
  async trackAttempt(params: {
    era_id: string;
    adventure_id: string;
    module_id: string;
    quiz_score: number;
    started_at: string;
    completed_at: string;
    questions: QuestionResult[];
  }): Promise<void> {
    if (!this.data) {
      console.error('❌ [GamificationOrchestrator] Cannot track attempt: Not initialized');
      return;
    }

    console.log('🎮 [GamificationOrchestrator] Tracking attempt:', params.module_id, `(Score: ${params.quiz_score}/3)`);

    // 🔥 Read lessons from AsyncStorage (real-time data from ProgressContext)
    let lessonsCompleted: string[] = [];
    try {
      const progressData = await AsyncStorage.getItem('new_user_progress');
      if (progressData) {
        const modules = JSON.parse(progressData);
        const existingModule = modules.find((m: any) =>
          m.adventureId === params.adventure_id && m.moduleId === params.module_id
        );
        lessonsCompleted = existingModule?.lessonsCompleted || [];
        console.log(`  📚 Found ${lessonsCompleted.length} completed lessons:`, lessonsCompleted);
      }
    } catch (error) {
      console.error('❌ [GamificationOrchestrator] Error reading lessons from AsyncStorage:', error);
    }

    // Calculate XP earned (10 XP per correct answer)
    const xp_earned = params.quiz_score * 10;

    // Check if this is a retry (module already exists in progress array)
    const existingAttemptIndex = this.data.progress.findIndex(
      (p) => p.era_id === params.era_id &&
             p.adventureId === params.adventure_id &&
             p.moduleId === params.module_id
    );

    const isRetry = existingAttemptIndex !== -1;
    const masteryLevel = params.quiz_score >= 3 ? 'mastered' : params.quiz_score >= 2 ? 'passed' : 'attempted';

    if (isRetry) {
      // Update existing attempt
      const existing = this.data.progress[existingAttemptIndex];
      existing.quizScore = Math.max(existing.quizScore, params.quiz_score); // Keep best score
      existing.completedAt = params.completed_at;
      existing.mastery_level = masteryLevel;
      existing.xp_earned = Math.max(existing.xp_earned, xp_earned); // Keep best XP
      // ✅ Always preserve/update lessons (even on retry) - use real-time data from AsyncStorage
      existing.lessonsCompleted = lessonsCompleted.length > 0 ? lessonsCompleted : existing.lessonsCompleted || [];
      existing.attempt_count++;
      console.log(`  🔄 Updated existing attempt (now ${existing.attempt_count} attempts)`);
    } else {
      // Add new attempt to progress array
      this.data.progress.push({
        era_id: params.era_id,
        adventureId: params.adventure_id,
        moduleId: params.module_id,
        lessonsCompleted, // ✅ Use real-time data from AsyncStorage
        quizScore: params.quiz_score,
        completedAt: params.completed_at,
        isModuleCompleted: true,
        quizCompleted: true,
        mastery_level: masteryLevel,
        xp_earned,
        first_attempt_at: params.completed_at,
        attempt_count: 1,
      });
      console.log(`  ✨ Added new attempt to progress array`);
    }

    // Update totalXP (sum of all xp_earned)
    this.data.totalXP = this.data.progress.reduce((sum, p) => sum + p.xp_earned, 0);
    console.log(`  💰 Recalculated totalXP: ${this.data.totalXP}`);

    // Update xp_by_era
    console.log('  🔄 Recalculating xp_by_era from progress array...');
    console.log(`  📊 Progress array has ${this.data.progress.length} entries`);
    const xpByEra: { [eraId: string]: number } = {};
    this.data.progress.forEach((p) => {
      if (!xpByEra[p.era_id]) xpByEra[p.era_id] = 0;
      xpByEra[p.era_id] += p.xp_earned;
    });
    console.log('  📊 Calculated xp_by_era:', JSON.stringify(xpByEra, null, 2));
    console.log('  📊 Previous xp_by_era:', JSON.stringify(this.data.xp_by_era, null, 2));
    this.data.xp_by_era = xpByEra;
    console.log('  ✅ xp_by_era assignment completed');

    // Update metadata
    this.data.metadata.last_updated = new Date().toISOString();
    this.data.metadata.total_quiz_attempts = this.data.progress.length;
    this.data.metadata.total_modules_attempted = this.data.progress.length;

    // Update behavior
    const masteredCount = this.data.progress.filter(p => p.mastery_level === 'mastered').length;
    this.data.behavior.mastered_modules = masteredCount;
    this.data.behavior.total_modules = this.data.progress.length;
    this.data.behavior.mastery_percentage = this.data.progress.length > 0
      ? Math.round((masteredCount / this.data.progress.length) * 100)
      : 0;

    // Save everything
    console.log('  💾 Calling save()...');
    await this.save();

    console.log('✅ [GamificationOrchestrator] Attempt tracked successfully');
    console.log(`  📊 Total XP: ${this.data.totalXP} (+${xp_earned})`);
    console.log(`  📝 Total attempts: ${this.data.progress.length}`);
  }

  // ========== UTILITIES ==========

  /**
   * Create empty schema for new user
   */
  private createEmptySchema(userId: string): GamificationData {
    return {
      user_id: userId,
      streak: {
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: new Date().toISOString().split('T')[0],
        longestStreakDate: new Date().toISOString().split('T')[0],
      },
      modules: [],
      totalXP: 0,
      adventures: [],
      selectedEra: '',
      xp_by_era: {},
      xp_by_source: {
        lessons: 0,
        quizzes: 0,
        games: 0,
      },
      progress: [],
      milestones: [],
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
      achievements_unlocked: [],
      metadata: {
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        total_quiz_attempts: 0,
        total_modules_attempted: 0,
      },
    };
  }

  // ========== PUBLIC API ==========

  getData(): GamificationData | null {
    return this.data;
  }

  // ========== DEBUG / DEVELOPMENT ==========

  async resetData(): Promise<void> {
    if (!this.userId) return;
    this.data = this.createEmptySchema(this.userId);
    await AsyncStorage.removeItem(GAMIFICATION_STORAGE_KEY);
    console.log('🗑️ [GamificationOrchestrator] Data reset');
  }

  async exportData(): Promise<string> {
    return JSON.stringify(this.data, null, 2);
  }

  async importData(jsonString: string): Promise<void> {
    try {
      this.data = JSON.parse(jsonString);
      await this.save();
      console.log('📥 [GamificationOrchestrator] Data imported');
    } catch (error) {
      console.error('❌ [GamificationOrchestrator] Import error:', error);
    }
  }
}

// ========== EXPORTS ==========

export const gamificationOrchestrator = GamificationOrchestrator.getInstance();

export default gamificationOrchestrator;
