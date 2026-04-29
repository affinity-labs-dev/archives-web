import type { OrchestratorAchievement } from '@/gamification';

// What the Profile tab renders. The orchestrator decorates its own
// Achievement shape (NOT the GamifiedProgress.Achievement re-exported as
// `Achievement` from `@/gamification` — they're unrelated) with derived
// `unlocked` / `unlockedAt` fields when it builds its `achievements`
// array. Anything consuming `useGamificationOrchestrator().achievements`
// should expect this intersection.
export type DisplayAchievement = OrchestratorAchievement & {
  unlocked: boolean;
  unlockedAt?: string;
};

// Era 2+ progress entry persisted to AsyncStorage under `new_user_progress`.
// The Profile tab's stats reuse it for adventures-completed counts and
// downstream XP plumbing alongside the legacy moduleProgress array.
export interface NewUserProgress {
  adventureId: string;
  moduleId: string;
  quizScore: number;
  quizCorrectAnswers?: number;
  isCompleted: boolean;
  quizCompleted: boolean;
  completedAt: string;
  era_id: number;
}

export interface MonthlyBadge {
  id: string;
  month: number;
  display_text: string;
  imagePath: string;
  earned: boolean;
  level: number;
}

export interface BadgePreview {
  month: number;
  label: string;
  earned: boolean;
  image: any;
}
