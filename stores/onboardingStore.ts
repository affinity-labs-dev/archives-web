import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OnboardingAnswers } from '@/gamification/engines/GamifiedProgress';

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
  isSignUpMode: boolean;

  // Navigation / progress
  currentStep: number;
  totalSteps: number;
  lastStepVisited: number;

  // Lifecycle
  status: OnboardingStatus;
  /** ms timestamp of first setStep call — marks when user actually started the flow. */
  startedAt: number | null;
  onboardingCompletedAt: number | null;
  onboardingSkippedAt: number | null;
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
  setIsSignUpMode: (isSignUpMode: boolean) => void;
  setStep: (step: number) => void;
  markCompleted: () => void;
  markSkipped: () => void;
  bindToUser: (userId: string) => void;
  reset: () => void;
  /** Pure builder — snapshot current state into cloud payload shape. */
  buildPayload: () => OnboardingAnswers;
  /**
   * Hydrate from cloud-loaded OnboardingAnswers. Guarded against overwriting
   * local progress — caller should only invoke when local `status` is
   * `not_started` (meaning: fresh install, nothing collected locally yet).
   */
  hydrateFromCloud: (answers: OnboardingAnswers) => void;
  _setHasHydrated: (v: boolean) => void;
}

const INITIAL_STATE = {
  name: '',
  isSignUpMode: false,
  interests: [] as InterestKey[],
  dailyGoalMinutes: null as DailyGoalMinutes | null,
  ageGroup: null as AgeGroup | null,
  currentStep: 1,
  totalSteps: TOTAL_ONBOARDING_STEPS,
  lastStepVisited: 1,
  status: 'not_started' as OnboardingStatus,
  startedAt: null as number | null,
  onboardingCompletedAt: null as number | null,
  onboardingSkippedAt: null as number | null,
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

      setIsSignUpMode: (isSignUpMode) => set({ isSignUpMode }),

      setStep: (step) =>
        set((state) => ({
          currentStep: step,
          lastStepVisited: Math.max(state.lastStepVisited, step),
          // Auto-transition not_started → in_progress on first movement.
          // Don't overwrite completed/skipped — those are terminal.
          status: state.status === 'not_started' ? 'in_progress' : state.status,
          // Stamp start time once — reused by the cloud payload.
          startedAt: state.startedAt ?? Date.now(),
        })),

      markCompleted: () =>
        set({
          status: 'completed',
          onboardingCompletedAt: Date.now(),
        }),

      markSkipped: () =>
        set({
          status: 'skipped',
          onboardingSkippedAt: Date.now(),
        }),

      bindToUser: (userId) => set({ userIdAtStart: userId }),

      reset: () => set({ ...INITIAL_STATE }),

      buildPayload: () => {
        const s = get();
        const effectiveStatus: OnboardingStatus =
          s.status === 'not_started' ? 'in_progress' : s.status;
        const startedAtIso = new Date(s.startedAt ?? Date.now()).toISOString();
        return {
          version: 2,
          name: s.name || null,
          interests: s.interests,
          daily_goal_minutes: s.dailyGoalMinutes,
          age_group: s.ageGroup,
          status: effectiveStatus,
          started_at: startedAtIso,
          completed_at: s.onboardingCompletedAt
            ? new Date(s.onboardingCompletedAt).toISOString()
            : null,
          skipped_at: s.onboardingSkippedAt
            ? new Date(s.onboardingSkippedAt).toISOString()
            : null,
        };
      },

      hydrateFromCloud: (answers) =>
        set({
          name: answers.name ?? '',
          interests: answers.interests as InterestKey[],
          dailyGoalMinutes: answers.daily_goal_minutes,
          ageGroup: answers.age_group,
          status: answers.status,
          startedAt: new Date(answers.started_at).getTime(),
          onboardingCompletedAt: answers.completed_at
            ? new Date(answers.completed_at).getTime()
            : null,
          onboardingSkippedAt: answers.skipped_at
            ? new Date(answers.skipped_at).getTime()
            : null,
        }),

      _setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'onboarding-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist only durable state; _hasHydrated is cold-start-only.
      partialize: (state) => ({
        name: state.name,
        interests: state.interests,
        isSignUpMode: state.isSignUpMode,
        dailyGoalMinutes: state.dailyGoalMinutes,
        ageGroup: state.ageGroup,
        currentStep: state.currentStep,
        totalSteps: state.totalSteps,
        lastStepVisited: state.lastStepVisited,
        status: state.status,
        startedAt: state.startedAt,
        onboardingCompletedAt: state.onboardingCompletedAt,
        onboardingSkippedAt: state.onboardingSkippedAt,
        userIdAtStart: state.userIdAtStart,
      }),
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated(true);
      },
    },
  ),
);
