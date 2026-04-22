/**
 * Step number → route path mapping for the onboarding flow.
 *
 * Single source of truth for the resume-flow routing guard in app/index.tsx.
 * Keeps the guard decoupled from actual file layout — rename a screen file,
 * update one entry here. Step 8 is intentionally omitted (design pending).
 */

export const STEP_ROUTE_MAP: Record<number, string> = {
  1: '/onboarding-step-1',
  2: '/onboarding-step-2',
  3: '/onboarding-step-3',
  4: '/onboarding-step-4',
  5: '/onboarding-step-5',
  6: '/onboarding-step-6',
  7: '/onboarding-step-7',
  // 8: deferred — add when the design lands
  9: '/onboarding-step-9',
  10: '/onboarding-step-10',
  11: '/onboarding-step-11',
  12: '/onboarding-step-12',
  13: '/onboarding-step-13',
};

/**
 * Steps that occur AFTER sign-up succeeds. The resume-flow guard only
 * restores mid-flow position for these steps, since:
 *
 *   - Pre-auth (1-7): the user hasn't committed to an account; restarting
 *     from step 1 is fine.
 *   - Post-auth (9-12): re-collecting preferences would be annoying UX
 *     and we already have a persisted Clerk session to gate on.
 *   - Step 13 (paywall): excluded because reaching step 13 requires tapping
 *     GET STARTED at step 12, which calls markCompleted(). If the user
 *     kills the app on the paywall, `status === 'completed'` routes straight
 *     to the main app — no need to re-show the upsell.
 *
 * When step 8 is built, add it here.
 */
export const POST_SIGNUP_STEPS: readonly number[] = [9, 10, 11, 12] as const;

/** Step number whose CTA triggers `markCompleted()`. */
export const COMPLETION_STEP = 12;

/**
 * Internal step number → displayed step number (for the progress bar).
 *
 * Step 8 is reserved for a future design but not currently rendered, so
 * the user's journey is 1-7 → 9-13 (only 12 actual screens). Without this
 * shift, the progress bar jumps ~15% going from step 7 to step 9.
 *
 * When step 8 is built, delete this function and change the Headers back
 * to passing the raw step number.
 */
export function toDisplayStep(step: number): number {
  return step > 7 ? step - 1 : step;
}
