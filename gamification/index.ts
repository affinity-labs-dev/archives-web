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
// Also manages streak tracking, achievements, and celebrations
export {
  GamificationOrchestratorProvider,
  useGamificationOrchestrator,
  checkXPMilestone,
  checkStreakMilestone,
  calculateStreakBonus,
  XP_MILESTONES,
  STREAK_MILESTONES,
  ACHIEVEMENTS, // All 21 achievements array (15 original + 6 new XP achievements)
} from './engines/GamificationOrchestrator';

export type {
  QuizCompleteInput,
  LessonCompleteInput,
  CelebrationItem, // Union of all celebration types (XP/Adventure/Streak/Achievement)
  StreakData as OrchestratorStreakData, // Renamed to avoid conflict with GamifiedProgress.StreakData
  Achievement as OrchestratorAchievement, // Achievement type from Orchestrator
  UnlockedAchievement,
  EraProgressStats, // Progress bar data (correctAnswers/totalQuestions)
} from './engines/GamificationOrchestrator';

// ========== NOTIFICATION PROMPT (AFF-117) ==========
export { NotificationPromptProvider, useNotificationPrompt, NOTIFICATION_STREAK_MILESTONES } from './engines/NotificationPromptProvider';
export type { NotificationPromptVariant } from './engines/NotificationPromptProvider';

// ========== PROVIDERS (Contexts) ==========
export { RewardsProvider, useRewards } from './engines/RewardsContext';
export { AIProvider, useAI } from './engines/AIContext';

// ========== STORES (Zustand) ==========
export { useEraProgressStore } from './stores/useEraProgressStore';
export type { UserProgress as StoreUserProgress } from './stores/useEraProgressStore';

// ========== SERVICES ==========
export { aiService } from './services/AIService';
export type { WebSearchSource, ChatResponseWithSources } from './services/AIService';
export { aiContextService } from './services/AIContextService';
export { aiStorageService } from './services/AIStorageService';
export type { StoredMessage } from './services/AIStorageService';
export { gameGeneratorService } from './services/GameGeneratorService';

// RAG Tools Service (function calling for AI chat)
export { aiToolsService, AI_TOOL_DECLARATIONS } from './services/AIToolsService';
export type { AIToolsContext, ToolResult } from './services/AIToolsService';
