import { useEffect, useRef } from 'react';

import { useGamifiedProgress } from '@/gamification';
import { useOnboardingStore } from '@/stores/onboardingStore';
import AppLogger from '@/services/AppLogger';

/**
 * Bridge between Zustand onboardingStore and GamifiedProgress cloud sync.
 *
 * Runs three concerns:
 *
 *   1. Hydrate — on first mount after GamifiedProgress finishes loading, if
 *      the cloud row contains `onboarding_answers` and local store is fresh
 *      (`status === 'not_started'`), restore into Zustand so existing users
 *      who reinstall or switch devices don't re-enter the flow.
 *
 *   2. Initial flush — once Clerk user id is bound AND GamifiedProgress is
 *      initialized, upload the current payload (pre-auth name/interests
 *      collected in steps 3 + 5) so the server row exists from auth time.
 *
 *   3. Incremental sync — subscribe to store changes. Intermediate edits
 *      (daily_goal, age_group) take the debounced 2s cloud path via
 *      `writeOnboardingAnswers`. Terminal transitions (status flip to
 *      completed / skipped) bypass the debounce via `flushOnboardingAnswers`
 *      so the last state reaches the server even if the user force-quits
 *      immediately after tapping the CTA.
 *
 * Intended to be called ONCE at the top of the provider tree (in
 * AnalyticsWrapper in app/_layout.tsx). Cleanup is handled via effect
 * return — no global subscribers leaked between renders.
 */
export function useOnboardingSync() {
  const { state: gamifiedState, isInitialized, writeOnboardingAnswers, flushOnboardingAnswers } =
    useGamifiedProgress();
  const onboardingUserId = useOnboardingStore((s) => s.userIdAtStart);

  const hasHydratedRef = useRef(false);
  const hasFlushedInitialRef = useRef<string | null>(null);

  // 1. Hydrate local store from cloud data on first load.
  useEffect(() => {
    if (!isInitialized || hasHydratedRef.current) return;
    const cloudAnswers = gamifiedState?.onboarding_answers;
    if (!cloudAnswers) return;

    const localStatus = useOnboardingStore.getState().status;
    if (localStatus !== 'not_started') {
      // Local has progress / completion / skip — trust local over cloud to
      // avoid clobbering the user's in-flight edits. On next sync, local
      // will win via `last_updated` timestamp.
      hasHydratedRef.current = true;
      return;
    }

    AppLogger.info('sync', 'Hydrating onboardingStore from cloud payload', {
      status: cloudAnswers.status,
    });
    useOnboardingStore.getState().hydrateFromCloud(cloudAnswers);
    hasHydratedRef.current = true;
  }, [isInitialized, gamifiedState?.onboarding_answers]);

  // 2. Initial flush on auth success (userId bound + gamified state ready).
  //    Per-userId ref prevents repeated flush on re-renders; also allows
  //    re-flush if user switches accounts (new userId → ref resets).
  useEffect(() => {
    if (!onboardingUserId || !isInitialized) return;
    if (hasFlushedInitialRef.current === onboardingUserId) return;

    const payload = useOnboardingStore.getState().buildPayload();
    AppLogger.info('sync', 'Initial onboarding flush after auth', {
      userId: onboardingUserId,
      status: payload.status,
    });
    flushOnboardingAnswers(payload).catch((err) => {
      AppLogger.warn('sync', 'Initial onboarding flush failed (silent retry via GamifiedProgress)', {
        err: String(err),
      });
    });
    hasFlushedInitialRef.current = onboardingUserId;
  }, [onboardingUserId, isInitialized, flushOnboardingAnswers]);

  // 3. Subscribe to store changes — terminal flush, otherwise debounced write.
  useEffect(() => {
    if (!onboardingUserId || !isInitialized) return;

    const unsubscribe = useOnboardingStore.subscribe((newState, prevState) => {
      const answersChanged =
        newState.name !== prevState.name ||
        newState.interests !== prevState.interests ||
        newState.dailyGoalMinutes !== prevState.dailyGoalMinutes ||
        newState.ageGroup !== prevState.ageGroup ||
        newState.status !== prevState.status;
      if (!answersChanged) return;

      const payload = newState.buildPayload();
      const isTerminal = newState.status === 'completed' || newState.status === 'skipped';
      const writer = isTerminal ? flushOnboardingAnswers : writeOnboardingAnswers;

      writer(payload).catch((err) => {
        AppLogger.warn('sync', 'Onboarding sync failed (silent retry)', {
          status: payload.status,
          isTerminal,
          err: String(err),
        });
      });
    });

    return unsubscribe;
  }, [onboardingUserId, isInitialized, writeOnboardingAnswers, flushOnboardingAnswers]);
}
