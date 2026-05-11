/**
 * Zustand Store: Era & Progress State
 *
 * Solves two critical issues:
 * 1. Race condition on fresh login — components read AsyncStorage before
 *    GamifiedProgress finishes cloud sync. This store provides reactive
 *    state that updates instantly when GamifiedProgress sets data.
 * 2. selectedEra not shared between tabs — eras tab had local state
 *    disconnected from the global selectedEra. This store is the
 *    single source of truth for UI state across all tabs.
 *
 * Data flow:
 *   GamifiedProgress (cloud sync) → zustand store → UI components
 *
 * GamifiedProgress remains the source of truth for persistence (Supabase + AsyncStorage).
 * This store is the reactive bridge that ensures UI stays in sync.
 */

import { create } from 'zustand';

// Matches the shape components expect (subset of ProgressEntry)
export interface UserProgress {
  era_id: string;
  adventureId: string;
  moduleId: string;
  quizScore: number;
  quizCorrectAnswers?: number;
  isCompleted: boolean;
  quizCompleted: boolean;
  completedAt: string;
}

interface EraProgressStore {
  // Selected era — shared across all tabs
  selectedEra: string | null;
  setSelectedEra: (eraId: string | null) => void;

  // User progress — reactive replacement for AsyncStorage reads
  userProgress: UserProgress[];
  setUserProgress: (progress: UserProgress[]) => void;

  // Reset on account switch
  reset: () => void;
}

export const useEraProgressStore = create<EraProgressStore>((set) => ({
  selectedEra: null,
  setSelectedEra: (eraId) => set({ selectedEra: eraId }),

  userProgress: [],
  setUserProgress: (progress) => set({ userProgress: progress }),

  reset: () => set({ selectedEra: null, userProgress: [] }),
}));
