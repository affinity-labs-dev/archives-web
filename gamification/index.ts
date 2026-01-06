/**
 * Gamification Module - Public API
 *
 * This is the main entry point for all gamification functionality.
 * Import from '@/gamification' for cleaner imports.
 */

// ========== ENGINES (Core Logic) ==========
export {
  GamifiedProgressProvider,
  useGamifiedProgress,
  useGamification, // Legacy alias
  useProgress, // Legacy alias
  calculateTotalXP,
  calculateModulesCompleted,
  checkIfCrossed50XPBoundary,
  calculateXPForEra,
  calculateEraXP,
  // PostHog calculation functions
  calculateLessonsCompleted,
  calculateAdventuresCompleted,
  calculateErasCompleted,
} from './engines/GamifiedProgress';

export type {
  GamifiedProgressState,
  ProgressEntry,
  StreakData,
  Milestone,
  Achievement,
  BehaviorData,
  QuestionResult,
} from './engines/GamifiedProgress';

// ========== TYPES ==========
export {
  EraType,
  ModuleState,
} from './types/gamification';

export type {
  ProgressUpdateAction,
  ModuleProgress,
  AdventureProgress,
  ModuleProgressV2,
  AdventureProgressV2,
  EraProgress,
} from './types/gamification';

export type {
  GameMode,
  GameDifficulty,
  GameType,
  GameData,
  GameResult,
  GameState,
  JigsawGameData,
  TimelineGameData,
  WordSearchGameData,
  PatternGameData,
  GameGenerationRequest,
} from './types/games';

export {
  GAME_XP_REWARDS,
  DIFFICULTY_SETTINGS,
} from './types/games';

// ========== ORCHESTRATOR (Centralized Triggers + Streaks) ==========
// One engine with full control - components just report events
// Also manages streak tracking (replaces useDailyStreak for most use cases)
export {
  GamificationOrchestratorProvider,
  useGamificationOrchestrator,
  checkXPMilestone,
  checkStreakMilestone,
  calculateStreakBonus,
  XP_MILESTONES,
  STREAK_MILESTONES,
  ACHIEVEMENTS, // All 17 achievements array
} from './engines/GamificationOrchestrator';

export type {
  QuizCompleteInput,
  LessonCompleteInput,
  CelebrationItem,
  XPMilestoneCelebration,
  AdventureCompleteCelebration,
  StreakMilestoneCelebration,
  StreakData as OrchestratorStreakData, // Renamed to avoid conflict with GamifiedProgress.StreakData
  Achievement as OrchestratorAchievement, // Achievement type from Orchestrator
  UnlockedAchievement,
  AchievementCelebration,
} from './engines/GamificationOrchestrator';

// ========== PROVIDERS (Contexts) ==========
export { RewardsProvider, useRewards } from './engines/RewardsContext';
export { AIProvider, useAI } from './engines/AIContext';
export { PuzzleEngagementProvider, usePuzzleEngagement } from './engines/PuzzleEngagementContext';

// ========== HOOKS ==========
export { useDailyStreak } from './engines/useDailyStreak';

// ========== SERVICES ==========
export { default as AIService, aiService } from './services/AIService';
export { default as AIContextService } from './services/AIContextService';
export { default as AIStorageService, aiStorageService } from './services/AIStorageService';
export type { StoredMessage } from './services/AIStorageService';
export { default as GameGeneratorService } from './services/GameGeneratorService';
