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

export const TOTAL_ONBOARDING_STEPS = 14;

interface OnboardingState {
  // Collected answers
  name: string;
  interests: InterestKey[];

  // Navigation progress (for progress bar + analytics)
  currentStep: number;
  totalSteps: number;

  // Actions
  setName: (name: string) => void;
  toggleInterest: (key: InterestKey) => void;
  setInterests: (keys: InterestKey[]) => void;
  setStep: (step: number) => void;
  reset: () => void;
  submit: () => Promise<void>;
}

const INITIAL_STATE = {
  name: '',
  interests: [] as InterestKey[],
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

  setStep: (step) => set({ currentStep: step }),

  reset: () => set({ ...INITIAL_STATE }),

  submit: async () => {
    const { name, interests } = get();
    console.log('🚀 Onboarding submit', { name, interests });
    // TODO Phase 3 finish screen: POST aggregated payload to backend
  },
}));
