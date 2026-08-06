// Shared TypeScript types for Progress, Era, and XP tracking across the app
// Used by ProgressContext, RewardsContext, Profile, and milestone tracking

// Enum for era identification
export enum EraType {
  LEGACY = 'legacy',  // Era 1 (Umayyad)
  NEW = 'new'         // Era 2+ (Rise of Islam, etc.)
}

// Enhanced module state enum for clear progression tracking
export enum ModuleState {
  LOCKED = 'locked',
  LESSON1_AVAILABLE = 'lesson1_available',
  LESSON1_COMPLETED = 'lesson1_completed',
  LESSON2_AVAILABLE = 'lesson2_available',
  LESSON2_COMPLETED = 'lesson2_completed',
  QUIZ_AVAILABLE = 'quiz_available',
  MODULE_COMPLETED = 'module_completed'
}

// Progress update action types for atomic operations
export type ProgressUpdateAction =
  | { type: 'LESSON_COMPLETED'; lessonId: string }
  | { type: 'QUIZ_COMPLETED'; quizScore: number; quizCorrectAnswers: number; adventureId?: string; moduleId?: string }
  | { type: 'QUIZ_RETAKEN'; quizScore: number; quizCorrectAnswers: number; adventureId?: string; moduleId?: string }
  | { type: 'MODULE_RESET' }

// Legacy interfaces for backward compatibility (Era 1 - Umayyad)
export interface ModuleProgress {
  adventureId: number
  moduleId: number
  isCompleted: boolean
  lessonsCompleted: string[]
  quizCompleted: boolean
  quizScore?: number
  unlockedAt?: string
}

export interface AdventureProgress {
  adventureId: number
  isUnlocked: boolean
  modulesCompleted: number
  totalModules: number
  unlockedAt?: string
}

// Enhanced data structures with state machine and retaking support (future migration)
export interface ModuleProgressV2 {
  adventureId: number
  moduleId: number
  state: ModuleState
  lesson1Completed: boolean
  lesson2Completed: boolean
  quizCompleted: boolean
  quizScore?: number // Number of correct answers (0-5)
  quizAttempts: number // Track retake attempts
  bestQuizScore?: number // Highest score achieved across all attempts
  unlockedAt: string
  completedAt?: string
  lastUpdated: string
}

export interface AdventureProgressV2 {
  adventureId: number
  isUnlocked: boolean
  modulesCompleted: number
  totalModules: number
  unlockedAt?: string
  completedAt?: string
}

export interface EraProgress {
  eraId: string // "umayyad", "riseOfIslam", etc.
  selectedAt?: string
  adventuresCompleted: number
  totalAdventures: number
  overallProgress: number // 0-100
}

// Centralized calculation functions (implemented in ProgressContext)
export type CalculateTotalXP = (legacyModules: any[], newModules: any[]) => number
export type CalculateModulesCompleted = (legacyModules: any[], newModules: any[]) => number
export type CheckIfCrossed50XPBoundary = (oldXP: number, newXP: number) => number | null
