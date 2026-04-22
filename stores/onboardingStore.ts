import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Onboarding store — holds all data collected across the 13-step flow and
 * the lifecycle state needed for resume-on-relaunch.
 *
 * Persistence:
 *   - Zustand `persist` middleware writes to AsyncStorage under the
 *     `onboarding-store` key. The `_hasHydrated` flag is transient and
 *     excluded via `partialize` so every cold start correctly waits for
 *     rehydration before routing decisions run.
 *   - On rehydration, `onRehydrateStorage` flips `_hasHydrated` → true;
 *     the routing guard in app/index.tsx gates on this to avoid routing
 *     from the default `not_started` state before storage is read.
 *
 * Lifecycle status flow:
 *   not_started → in_progress → (completed | skipped)
 *
 *   - `setStep()` auto-transitions not_started → in_progress on first use.
 *   - `markCompleted()` fires at step-12 GET STARTED (COMPLETION_STEP).
 *   - `markSkipped()` fires at step-10 Skip (user bailed on personalize).
 *   - `reset()` restores INITIAL_STATE; called on account switch detection.
 */

export type InterestKey = 'fun' | 'heritage' | 'children' | 'productive' | 'other';
export type AgeGroup = '13-17' | '18-24' | '25-34' | '35-44' | '45+';
export type DailyGoalMinutes = 5 | 10 | 15 | 20;
export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

/**
 * Number of onboarding screens currently rendered. Step 8 is reserved in
 * STEP_ROUTE_MAP for a future design — until it lands, the actual flow has
 * 12 screens (1-7 + 9-13). When step 8 is built, bump this to 13 and drop
 * the `toDisplayStep()` shift in OnboardingRoutes.ts.
 */
export const TOTAL_ONBOARDING_STEPS = 12;

interface OnboardingState {
  // Collected answers
  name: string;
  interests: InterestKey[];
  dailyGoalMinutes: DailyGoalMinutes | null;
  ageGroup: AgeGroup | null;

  // Navigation / progress
  currentStep: number;
  totalSteps: number;
  lastStepVisited: number;

  // Lifecycle
  status: OnboardingStatus;
  onboardingCompletedAt: number | null;
  /** Clerk user id bound to this onboarding session — used to detect account switch. */
  userIdAtStart: string | null;

  // Transient (not persisted)
  _hasHydrated: boolean;

  // Actions
  setName: (name: string) => void;
  toggleInterest: (key: InterestKey) => void;
  setInterests: (keys: InterestKey[]) => void;
  setDailyGoal: (minutes: DailyGoalMinutes | null) => void;
  setAgeGroup: (group: AgeGroup | null) => void;
  setStep: (step: number) => void;
  markCompleted: () => void;
  markSkipped: () => void;
  bindToUser: (userId: string) => void;
  reset: () => void;
  submit: () => Promise<void>;
  _setHasHydrated: (v: boolean) => void;
}

const INITIAL_STATE = {
  name: '',
  interests: [] as InterestKey[],
  dailyGoalMinutes: null as DailyGoalMinutes | null,
  ageGroup: null as AgeGroup | null,
  currentStep: 1,
  totalSteps: TOTAL_ONBOARDING_STEPS,
  lastStepVisited: 1,
  status: 'not_started' as OnboardingStatus,
  onboardingCompletedAt: null as number | null,
  userIdAtStart: null as string | null,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,
      _hasHydrated: false,

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

      setStep: (step) =>
        set((state) => ({
          currentStep: step,
          lastStepVisited: Math.max(state.lastStepVisited, step),
          // Auto-transition not_started → in_progress on first movement.
          // Don't overwrite completed/skipped — those are terminal.
          status: state.status === 'not_started' ? 'in_progress' : state.status,
        })),

      markCompleted: () =>
        set({
          status: 'completed',
          onboardingCompletedAt: Date.now(),
        }),

      markSkipped: () =>
        set({
          status: 'skipped',
        }),

      bindToUser: (userId) => set({ userIdAtStart: userId }),

      reset: () => set({ ...INITIAL_STATE }),

      submit: async () => {
        const { name, interests, dailyGoalMinutes, ageGroup } = get();
        console.log('🚀 Onboarding submit', { name, interests, dailyGoalMinutes, ageGroup });
        // TODO Phase 3 finish screen: POST aggregated payload to backend
      },

      _setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'onboarding-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist only durable state; _hasHydrated is cold-start-only.
      partialize: (state) => ({
        name: state.name,
        interests: state.interests,
        dailyGoalMinutes: state.dailyGoalMinutes,
        ageGroup: state.ageGroup,
        currentStep: state.currentStep,
        totalSteps: state.totalSteps,
        lastStepVisited: state.lastStepVisited,
        status: state.status,
        onboardingCompletedAt: state.onboardingCompletedAt,
        userIdAtStart: state.userIdAtStart,
      }),
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated(true);
      },
    },
  ),
);
