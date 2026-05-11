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
  /**
   * `true` once the user has completed Clerk sign-in or sign-up (via
   * onboarding-auth.tsx OR onboarding-step-7.tsx OAuth). Until this flips,
   * `partialize` returns `{}` and AsyncStorage stays empty — killing the
   * app at any pre-auth step (1-7) restarts the questionnaire from
   * scratch. After auth, every state mutation persists normally so the
   * user can resume across kill/relaunch.
   */
  authConfirmed: boolean;

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
  /**
   * Called from onboarding-auth.tsx (after successful Clerk sign-in /
   * sign-up) and from onboarding-step-7.tsx (after successful OAuth).
   * Flipping `authConfirmed` to true unlocks AsyncStorage persistence
   * for ALL onboarding state — the next state mutation writes the
   * full whitelist to storage. Pre-auth state changes still fire
   * persist writes but `partialize` returns `{}` so storage stays
   * effectively empty.
   */
  confirmAuth: () => void;
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
  authConfirmed: false,
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

      confirmAuth: () => set({ authConfirmed: true }),

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
      version: 1,
      // Auth-gated persistence. Two phases:
      //
      //   Phase 1 (`authConfirmed: false`, default) — pre-auth steps
      //     1-7. `partialize` returns `{}` so the persist middleware
      //     writes `{state:{}, version:1}` to AsyncStorage. On cold
      //     rehydrate, `{}` merges into INITIAL_STATE → user starts
      //     fresh from step 1. Names, selected answers, etc. all
      //     stay in-memory only.
      //
      //   Phase 2 (`authConfirmed: true`) — after Clerk sign-in /
      //     sign-up via `confirmAuth()`. The full whitelist persists
      //     normally, including `authConfirmed: true` itself, so the
      //     gate stays open across kill/relaunch.
      //
      // Why an in-line gate instead of skipping the persist
      // middleware entirely: Phase 2 needs the same whitelist
      // semantics, debouncing, and rehydrate flow that the
      // middleware provides. A flag-controlled `partialize` is the
      // smallest delta that gets us pre-auth privacy + post-auth
      // resume in one code path.
      partialize: (state) => {
        if (!state.authConfirmed) {
          // Returning `{}` writes an empty payload — earlier writes
          // (if any leaked through) get overwritten. On rehydrate
          // this merges to INITIAL_STATE.
          return {} as Partial<OnboardingState>;
        }
        return {
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
          // Persist the gate flag itself so the user stays in
          // Phase 2 across cold starts.
          authConfirmed: state.authConfirmed,
        };
      },
      // v0 → v1: existing users on the previous app version had data
      // persisted from the very first step (no auth gate). Migrating
      // them naively would clobber their state — we'd return `{}`
      // because their old payload has no `authConfirmed` field. The
      // safe upgrade rule: if the persisted `status` is `completed`
      // or `skipped`, the user MUST have already passed auth (those
      // terminal states are only reached after sign-in/sign-up), so
      // we infer `authConfirmed: true`. In-progress users without
      // auth confirmation legitimately lose their pre-auth state —
      // acceptable per the new contract.
      migrate: (persistedState: any, version: number) => {
        if (version === 0 && persistedState && typeof persistedState === 'object') {
          const isPostAuth =
            persistedState.status === 'completed' ||
            persistedState.status === 'skipped';
          return { ...persistedState, authConfirmed: isPostAuth };
        }
        return persistedState;
      },
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated(true);
      },
    },
  ),
);
