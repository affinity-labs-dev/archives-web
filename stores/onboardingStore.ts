import { create } from 'zustand';

/**
 * Onboarding store — holds all data collected across the 14-step flow until
 * submission at the final screen. Kept in memory only (no AsyncStorage persist)
 * since onboarding is a single session that either completes or restarts.
 *
 * Screens push data in as the user progresses; `submit()` is called once on the
 * finish screen to POST the aggregated payload to the backend.
 */

export type InterestKey = 'fun' | 'heritage' | 'children' | 'productive' | 'other';
export type AgeGroup = '13-17' | '18-24' | '25-34' | '35-44' | '45+';
export type DailyGoalMinutes = 5 | 10 | 15 | 20;

export const TOTAL_ONBOARDING_STEPS = 14;

interface OnboardingState {
  // Collected answers
  name: string;
  interests: InterestKey[];
  dailyGoalMinutes: DailyGoalMinutes | null;
  ageGroup: AgeGroup | null;

  // Navigation progress (for progress bar + analytics)
  currentStep: number;
  totalSteps: number;

  // Actions
  setName: (name: string) => void;
  toggleInterest: (key: InterestKey) => void;
  setInterests: (keys: InterestKey[]) => void;
  setDailyGoal: (minutes: DailyGoalMinutes | null) => void;
  setAgeGroup: (group: AgeGroup | null) => void;
  setStep: (step: number) => void;
  reset: () => void;
  submit: () => Promise<void>;
}

const INITIAL_STATE = {
  name: '',
  interests: [] as InterestKey[],
  dailyGoalMinutes: null as DailyGoalMinutes | null,
  ageGroup: null as AgeGroup | null,
  currentStep: 1,
  totalSteps: TOTAL_ONBOARDING_STEPS,
};

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  ...INITIAL_STATE,

  setName: (name) => set({ name }),

  toggleInterest: (key) =>
    set((state) => ({
      interests: state.interests.includes(key)
        ? state.interests.filter((k) => k !== key)
        : [...state.interests, key],
    })),

  setInterests: (keys) => set({ interests: keys }),

  setDailyGoal: (minutes) => set({ dailyGoalMinutes: minutes }),

  setAgeGroup: (group) => set({ ageGroup: group }),

  setStep: (step) => set({ currentStep: step }),

  reset: () => set({ ...INITIAL_STATE }),

  submit: async () => {
    const { name, interests, dailyGoalMinutes, ageGroup } = get();
    console.log('🚀 Onboarding submit', { name, interests, dailyGoalMinutes, ageGroup });
    // TODO Phase 3 finish screen: POST aggregated payload to backend
  },
}));
