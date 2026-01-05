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

// ========== SERVICES ==========
export { default as AIService } from './services/AIService';
export { default as AIContextService } from './services/AIContextService';
export { default as AIStorageService } from './services/AIStorageService';
export { default as GameGeneratorService } from './services/GameGeneratorService';
export { behaviorTrackerService } from './services/BehaviorTrackerService';
