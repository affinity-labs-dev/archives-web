import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

// MARK: - Types (mirror of Swift SharedAttributes.swift)

/**
 * Three-way state for the StreakGuard Live Activity lifecycle.
 * Must match the Swift `StreakState` enum in targets/live-activity/Attributes.swift
 * and modules/live-activity/ios/SharedAttributes.swift.
 */
export type StreakState = 'expiring' | 'saved' | 'failed';

/**
 * Activity ID returned from a start call. Pass back to update/end calls.
 * iOS ActivityKit uses UUID strings internally.
 */
export type ActivityId = string;

export interface StreakGuardStartParams {
  /** Current streak count to display on the banner */
  currentStreak: number;
  /** YYYY-MM-DD when the streak started */
  streakStartDate: string;
  /** Initial lifecycle state. For normal flow, pass 'expiring'. */
  state: StreakState;
  /** Unix epoch seconds when the countdown ends (midnight local). Ignored for saved/failed. */
  endDate: number;
}

export interface StreakGuardUpdateParams {
  /** Activity ID returned from startStreakGuard */
  id: ActivityId;
  /** New state to transition to */
  state: StreakState;
  /** Unix epoch seconds (unchanged for most updates, or 0 for terminal states) */
  endDate: number;
  /** Updated streak count — pass currentStreak + 1 for .saved state */
  currentStreak: number;
}

export interface DailyStoryStartParams {
  /** YYYY-MM-DD identifier for the story */
  storyId: string;
  /** Human-readable title shown on the lock screen */
  storyTitle: string;
  /** Current era/adventure title, e.g. "The Golden Age" */
  eraTitle: string;
  /** Day X of the current adventure (1-indexed) */
  dayNumber: number;
  /** Total days in the adventure */
  totalDays: number;
  /** 1-indexed current card */
  currentCard: number;
  /** Total number of cards (usually 3) */
  totalCards: number;
  /** 0.0 – 1.0 progress through the story */
  progressPercent: number;
  /** Per-card completion flags (drive the expanded Dynamic Island pills) */
  watchCompleted: boolean;
  exploreCompleted: boolean;
  questionsCompleted: boolean;
}

export interface DailyStoryUpdateParams {
  /** Activity ID returned from startDailyStory */
  id: ActivityId;
  currentCard: number;
  totalCards: number;
  progressPercent: number;
  watchCompleted: boolean;
  exploreCompleted: boolean;
  questionsCompleted: boolean;
}

export interface ActiveActivityRef {
  id: ActivityId;
  type: 'StreakGuard' | 'DailyStory';
}

// MARK: - Native module binding

// On non-iOS platforms, `requireNativeModule` will throw. Guard the import so
// the rest of the app can still compile on Android and web, where Live
// Activities don't exist. Methods become no-ops on unsupported platforms.
const LiveActivityNative = Platform.OS === 'ios'
  ? requireNativeModule('LiveActivity')
  : null;

function assertIOS(): void {
  if (!LiveActivityNative) {
    throw new Error('Live Activities are iOS-only.');
  }
}

// MARK: - Status

/**
 * Check whether the user has Live Activities enabled for Archives.
 * Always returns `false` on non-iOS platforms and on iOS < 16.2.
 */
export async function areActivitiesEnabled(): Promise<boolean> {
  if (!LiveActivityNative) return false;
  return LiveActivityNative.areActivitiesEnabled();
}

/**
 * List all currently active Live Activities owned by this app.
 * Useful for reconciling JS-side state with iOS-side state on app launch.
 */
export async function listActiveActivities(): Promise<ActiveActivityRef[]> {
  if (!LiveActivityNative) return [];
  return LiveActivityNative.listActiveActivities();
}

// MARK: - StreakGuard

/**
 * Start a new StreakGuard Live Activity.
 *
 * Normal flow: pass `state: 'expiring'` with a future `endDate` (typically midnight).
 * The activity will display the countdown banner until you call `updateStreakGuard`
 * or `endStreakGuard`.
 *
 * @returns The activity ID, which must be passed to subsequent update/end calls.
 */
export async function startStreakGuard(params: StreakGuardStartParams): Promise<ActivityId> {
  assertIOS();
  return LiveActivityNative!.startStreakGuard(
    params.currentStreak,
    params.streakStartDate,
    params.state,
    params.endDate
  );
}

/**
 * Transition an existing StreakGuard activity to a new state.
 *
 * Typical usages:
 * - `.expiring` → `.saved` when user completes the daily story
 * - `.expiring` → `.failed` when midnight passes with no completion
 *
 * After transitioning to `saved` or `failed`, you should call `endStreakGuard`
 * with `dismissInSeconds: 15 * 60` so the banner lingers for 15 minutes before
 * iOS removes it.
 */
export async function updateStreakGuard(params: StreakGuardUpdateParams): Promise<void> {
  assertIOS();
  return LiveActivityNative!.updateStreakGuard(params.id, params.state, params.endDate, params.currentStreak);
}

/**
 * End a StreakGuard activity, scheduling removal after `dismissInSeconds`.
 *
 * Pass `0` for immediate removal.
 * For `.saved` and `.failed` terminal states, pass `15 * 60` to respect product spec.
 */
export async function endStreakGuard(id: ActivityId, dismissInSeconds: number): Promise<void> {
  assertIOS();
  return LiveActivityNative!.endStreakGuard(id, dismissInSeconds);
}

// MARK: - DailyStory

/**
 * Start a new DailyStory Live Activity.
 * Typically called when the user backgrounds the app mid-story.
 */
export async function startDailyStory(params: DailyStoryStartParams): Promise<ActivityId> {
  assertIOS();
  return LiveActivityNative!.startDailyStory(
    params.storyId,
    params.storyTitle,
    params.eraTitle,
    params.dayNumber,
    params.totalDays,
    params.currentCard,
    params.totalCards,
    params.progressPercent,
    params.watchCompleted,
    params.exploreCompleted,
    params.questionsCompleted
  );
}

/**
 * Update an existing DailyStory activity's progress state.
 * Call this as the user completes each card.
 */
export async function updateDailyStory(params: DailyStoryUpdateParams): Promise<void> {
  assertIOS();
  return LiveActivityNative!.updateDailyStory(
    params.id,
    params.currentCard,
    params.totalCards,
    params.progressPercent,
    params.watchCompleted,
    params.exploreCompleted,
    params.questionsCompleted
  );
}

/**
 * End a DailyStory activity.
 * Pass `0` for immediate removal.
 */
export async function endDailyStory(id: ActivityId, dismissInSeconds: number): Promise<void> {
  assertIOS();
  return LiveActivityNative!.endDailyStory(id, dismissInSeconds);
}

// MARK: - Safety net

/**
 * End every active Live Activity owned by this app, immediately.
 * Useful for test screens and orphan cleanup on app launch.
 */
export async function endAllActivities(): Promise<void> {
  if (!LiveActivityNative) return;
  return LiveActivityNative.endAllActivities();
}

// MARK: - Push-to-start token events

export interface PushToStartTokenEvent {
  /** Hex-encoded push-to-start token string */
  token: string;
  /** Which activity type this token is for */
  activityType: 'StreakGuard' | 'DailyStory';
  /** The Swift AttributeType name (for APNs payload) */
  attributeType: string;
}

/**
 * Start listening for push-to-start tokens (iOS 17.2+).
 * Native side listens for ActivityKit token updates and emits them to JS.
 * JS is responsible for POSTing tokens to the backend.
 *
 * Architecture: native emits token → JS receives via event → JS calls backend API.
 * This keeps backend API logic in JS (hot-reloadable, consistent error handling).
 */
export async function registerPushToStartTokens(): Promise<void> {
  if (!LiveActivityNative) return;
  return LiveActivityNative.registerPushToStartTokens();
}

/**
 * Subscribe to push-to-start token events.
 * Uses the native module directly as event emitter (Expo SDK 54+ pattern).
 * Call this once at app startup, store the subscription, and remove on cleanup.
 *
 * Example:
 *   const sub = addPushToStartTokenListener((event) => {
 *     await postTokenToBackend(event.token, event.activityType);
 *   });
 *   // Later: sub.remove();
 */
export function addPushToStartTokenListener(
  callback: (event: PushToStartTokenEvent) => void
): { remove: () => void } {
  if (!LiveActivityNative) return { remove: () => {} };
  return LiveActivityNative.addListener('onPushToStartToken', callback);
}
