/**
 * NotificationPromptProvider
 *
 * Owns all contextual notification prompt logic for AFF-117:
 * - Per-user prompt history tracking (AsyncStorage keyed by Clerk user ID)
 * - Cooldown rules: max 1/day, 7-day cooldown after dismissal, permanent stop after acceptance
 * - Variant priority: streak > module > dailyStory > lapse > iosRepermission
 * - Lapse detection: 7+ days since last activity
 * - Sign-in permission check: prompts existing users who never went through onboarding Q3
 * - Renders NotificationPermissionModal directly (modal visibility managed here)
 *
 * Modal stacking safety: The Orchestrator queues NOTIFICATION_PROMPT as a celebration
 * item, so no other celebration modal renders simultaneously. When the Orchestrator
 * processes NOTIFICATION_PROMPT, it calls showPrompt() → this provider shows the modal.
 * On accept/dismiss, we call the Orchestrator's dismissCurrent() to advance the queue.
 *
 * Usage:
 *   const { showPrompt, shouldPrompt, getBestVariant } = useNotificationPrompt();
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useUser } from '@clerk/clerk-expo';
import { requestPushNotificationPermission } from '@/services/PushNotificationService';
import { analyticsService } from '@/services/AnalyticsService';
import AppLogger from '@/services/AppLogger';
import { toLocalDateString } from '@/utils/dateUtils';
import { NotificationPermissionModal } from '@/gamification/ui/achievement/AchievementGrid';
import { useOnboardingStore } from '@/stores/onboardingStore';

// ============================================================
// TYPES
// ============================================================

/** All notification prompt variants ordered by priority (lower index = higher priority) */
export type NotificationPromptVariant =
  | 'streak'        // After streak milestone (3/7/14 days)
  | 'module'        // After completing a module
  | 'dailyStory'    // After finishing daily story
  | 'lapse'         // Return from 7+ day break
  | 'iosRepermission'; // iOS re-permission for denied users

/** Priority order for variants (lower = higher priority). Tuple ensures all variants are listed. */
const VARIANT_PRIORITY: readonly [NotificationPromptVariant, ...NotificationPromptVariant[]] = [
  'streak',
  'module',
  'dailyStory',
  'lapse',
  'iosRepermission',
] as const satisfies readonly NotificationPromptVariant[];

/** Streak milestones that trigger notification prompt (different from achievement milestones) */
export const NOTIFICATION_STREAK_MILESTONES = [3, 7, 14] as const;

/** Minimum days of inactivity to qualify as a "lapse" */
const LAPSE_THRESHOLD_DAYS = 7;

/** Cooldown period after dismissal (days) */
const DISMISS_COOLDOWN_DAYS = 7;

/** A single prompt event in the history */
interface PromptHistoryEntry {
  variant: NotificationPromptVariant;
  date: string; // YYYY-MM-DD
  action: 'accepted' | 'dismissed';
}

/** Persisted state shape (AsyncStorage, per-user) */
interface NotificationPromptState {
  /** User accepted notifications — stop prompting permanently */
  accepted: boolean;
  /** Last date ANY prompt was shown (YYYY-MM-DD) — max 1/day */
  lastPromptDate: string | null;
  /** Last date user dismissed a prompt (YYYY-MM-DD) — 7-day cooldown */
  lastDismissDate: string | null;
  /** Full prompt history for analytics / debugging */
  promptHistory: PromptHistoryEntry[];
}

const DEFAULT_STATE: NotificationPromptState = {
  accepted: false,
  lastPromptDate: null,
  lastDismissDate: null,
  promptHistory: [],
};

// ============================================================
// STORAGE (per-user via Clerk user ID)
// ============================================================

const STORAGE_KEY_PREFIX = '@notification_prompt_state_';

function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

async function loadState(userId: string): Promise<NotificationPromptState> {
  try {
    const raw = await AsyncStorage.getItem(getStorageKey(userId));
    if (raw) {
      return { ...DEFAULT_STATE, ...JSON.parse(raw) };
    }
  } catch (error) {
    AppLogger.error('notification', 'Failed to load prompt state', {}, error);
  }
  return { ...DEFAULT_STATE };
}

async function saveState(userId: string, state: NotificationPromptState): Promise<void> {
  try {
    await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(state));
  } catch (error) {
    AppLogger.error('notification', 'Failed to save prompt state', {}, error);
  }
}

// ============================================================
// HELPERS
// ============================================================

/** Calculate days between two YYYY-MM-DD date strings */
function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA + 'T00:00:00');
  const b = new Date(dateB + 'T00:00:00');
  return Math.floor(Math.abs(b.getTime() - a.getTime()) / 86400000);
}

/** Check if cooldowns allow showing a prompt right now */
function passesCooldownRules(s: NotificationPromptState): boolean {
  const today = toLocalDateString(new Date());

  if (s.accepted) return false;
  if (s.lastPromptDate === today) return false;
  if (s.lastDismissDate) {
    const daysSinceDismiss = daysBetween(s.lastDismissDate, today);
    if (daysSinceDismiss < DISMISS_COOLDOWN_DAYS) return false;
  }
  return true;
}

// ============================================================
// CONTEXT
// ============================================================

interface NotificationPromptContextType {
  /**
   * Show the notification prompt modal with a specific variant.
   * Called by the Orchestrator when processing a NOTIFICATION_PROMPT queue item.
   * @param variant - Which prompt copy to show
   * @param onComplete - Callback to advance the Orchestrator queue (dismissCurrent)
   */
  showPrompt: (variant: NotificationPromptVariant, onComplete: () => void) => void;

  /**
   * Check if a notification prompt should be shown right now.
   * Evaluates: permission status, accepted flag, daily limit, dismiss cooldown.
   */
  shouldPrompt: () => Promise<boolean>;

  /**
   * Given a set of eligible variants for the current moment,
   * returns the highest-priority one (or null if none should show).
   */
  getBestVariant: (eligible: NotificationPromptVariant[]) => NotificationPromptVariant | null;

  /**
   * Check if a streak count qualifies as a notification-prompt milestone (3, 7, 14).
   */
  isStreakPromptMilestone: (streakDays: number) => boolean;

  /**
   * Check if user is returning from a lapse (7+ days inactive).
   * @param lastActiveDate - YYYY-MM-DD of last activity
   */
  isReturningFromLapse: (lastActiveDate: string) => boolean;

  /** Whether state has been loaded from AsyncStorage */
  isLoaded: boolean;
}

const NotificationPromptContext = createContext<NotificationPromptContextType | null>(null);

// ============================================================
// PROVIDER
// ============================================================

export function NotificationPromptProvider({ children }: { children: React.ReactNode }) {
  const isSignUpMode = useOnboardingStore((s) => s.isSignUpMode);
  console.log('🚀 ~ NotificationPromptProvider ~ isSignUpMode:', isSignUpMode);

  const [state, setState] = useState<NotificationPromptState>(DEFAULT_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const stateRef = useRef<NotificationPromptState>(DEFAULT_STATE);

  // Modal visibility state
  const [modalVisible, setModalVisible] = useState(false);
  const [activeVariant, setActiveVariant] = useState<NotificationPromptVariant>('module');
  const onCompleteRef = useRef<(() => void) | null>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // User identity from Clerk (for per-user storage + sign-in detection)
  const { user, isSignedIn } = useUser();
  const currentUserIdRef = useRef<string | null>(null);

  // Keep ref in sync for use in callbacks without stale closures
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ---- Load/reload state when user changes ----
  // Handles: initial load, account switching, sign-out → sign-in
  useEffect(() => {
    const userId = isSignedIn && user?.id ? user.id : null;
    console.log('🚀 ~ NotificationPromptProvider ~ isSignUpMode:', isSignUpMode);

    // Skip if same user (prevent unnecessary reloads on Clerk token refreshes)
    if (userId === currentUserIdRef.current) return;
    if (isSignUpMode) return;
    currentUserIdRef.current = userId;

    if (!userId) {
      // Signed out — cancel pending timer, close modal, then reset state
      // Order matters: close modal BEFORE resetting state to prevent
      // Android Fabric crash from Modal re-rendering during state transitions
      if (showTimerRef.current) { clearTimeout(showTimerRef.current); showTimerRef.current = null; }
      setModalVisible(false);
      onCompleteRef.current = null;
      setState(DEFAULT_STATE);
      stateRef.current = DEFAULT_STATE;
      setIsLoaded(false);
      return;
    }

    // Load this user's prompt state
    (async () => {
      const loaded = await loadState(userId);
      setState(loaded);
      stateRef.current = loaded;
      setIsLoaded(true);
      AppLogger.info('notification', 'Prompt state loaded for user', {
        userId,
        accepted: loaded.accepted,
        lastPromptDate: loaded.lastPromptDate,
        lastDismissDate: loaded.lastDismissDate,
        historyCount: loaded.promptHistory.length,
      });

      // ---- Sign-in permission check ----
      // Permission is device-level (shared across all users on this device).
      // If another user already granted permission, mark this user as accepted too.
      // If not yet granted and cooldowns pass, show the prompt.
      // iOS returns 'undetermined' when never asked; Android 13+ returns 'denied'.
      try {
        const { status } = await Notifications.getPermissionsAsync();
        AppLogger.info('notification', 'Sign-in permission check result', {
          status,
          platform: Platform.OS,
          currentAccepted: loaded.accepted,
          promptHistoryCount: loaded.promptHistory.length,
          lastPromptDate: loaded.lastPromptDate,
          lastDismissDate: loaded.lastDismissDate,
        });

        if (status === 'granted') {
          // Another user (or this user via onboarding) already granted on this device
          if (!loaded.accepted) {
            AppLogger.info('notification', 'Permission already granted on device, marking user accepted=true');
            const updated = { ...loaded, accepted: true };
            await saveState(userId, updated);
            setState(updated);
            stateRef.current = updated;
          } else {
            AppLogger.info('notification', 'Permission granted and already accepted, no update needed');
          }
        } else if (
          passesCooldownRules(loaded) &&
          (status === 'undetermined' || // iOS: never asked
           (Platform.OS === 'android' && status === 'denied' && loaded.promptHistory.length === 0))
           // Android < 13: auto-granted at install, always 'granted' → handled above.
           // Android 13+ (API 33+): 'denied' by default until explicit request.
           // promptHistory check distinguishes "never asked" from "user actually denied".
        ) {
          AppLogger.info('notification', 'Permission not yet granted on sign-in, showing prompt', { status, platform: Platform.OS });
          setActiveVariant('module');
          onCompleteRef.current = null; // No Orchestrator queue to advance
          setModalVisible(true);
        }
      } catch (err) {
        AppLogger.error('notification', 'Sign-in permission check failed', {}, err);
      }
    })();
  }, [isSignedIn, user?.id, isSignUpMode]);

  // ---- Helper: save with current user ID ----
  const saveCurrentState = useCallback(async (updated: NotificationPromptState) => {
    setState(updated);
    stateRef.current = updated;
    const userId = currentUserIdRef.current;
    if (userId) {
      await saveState(userId, updated);
    }
  }, []);

  // ---- Show the modal (called by Orchestrator) ----
  const showPrompt = useCallback((variant: NotificationPromptVariant, onComplete: () => void) => {
    AppLogger.info('notification', `Showing notification prompt: "${variant}"`);
    setActiveVariant(variant);
    onCompleteRef.current = onComplete;

    // Track prompt open with history context
    const s = stateRef.current;
    analyticsService.trackCustomEvent('notification_prompt_opened', {
      variant,
      promptHistoryCount: s.promptHistory.length,
      lastPromptDate: s.lastPromptDate,
      lastDismissDate: s.lastDismissDate,
    });

    showTimerRef.current = setTimeout(() => setModalVisible(true), 300); // slight delay for smoother UX
  }, []);

  // ---- Core evaluation: should we show ANY prompt right now? ----
  const shouldPrompt = useCallback(async (): Promise<boolean> => {
    const s = stateRef.current;

    // 1. Already accepted → permanent stop
    if (s.accepted) {
      AppLogger.info('notification', 'Prompt skip: user already accepted');
      return false;
    }

    // 2. Check OS-level permission — if already granted, no need to prompt
    try {
      const { status } = await Notifications.getPermissionsAsync();
      AppLogger.info('notification', 'shouldPrompt: OS permission check', {
        status,
        platform: Platform.OS,
        currentAccepted: s.accepted,
      });
      if (status === 'granted') {
        AppLogger.info('notification', 'shouldPrompt: user enabled in settings, marking accepted=true');
        // Mark as accepted so we never check again
        const updated = { ...s, accepted: true };
        await saveCurrentState(updated);
        return false;
      }
    } catch (err) {
      AppLogger.error('notification', 'shouldPrompt: permission check failed, proceeding cautiously', {}, err);
    }

    // 3. Check cooldown rules (daily limit + dismiss cooldown)
    if (!passesCooldownRules(s)) {
      return false;
    }

    return true;
  }, [saveCurrentState]);

  // ---- Pick highest-priority variant ----
  const getBestVariant = useCallback((eligible: NotificationPromptVariant[]): NotificationPromptVariant | null => {
    if (eligible.length === 0) return null;

    // Return the first match in priority order
    for (const variant of VARIANT_PRIORITY) {
      if (eligible.includes(variant)) {
        return variant;
      }
    }
    return eligible[0]; // fallback
  }, []);

  // ---- Handle "Enable Notifications" tap ----
  const handleAccept = useCallback(async () => {
    const variant = activeVariant;
    const today = toLocalDateString(new Date());
    AppLogger.info('notification', `User accepted via "${variant}" prompt`);

    setModalVisible(false);

    let granted = false;

    try {
      // Show native OS permission prompt + register Expo token with Affinity.
      const { status: result } = await requestPushNotificationPermission();
      granted = result === 'Granted';
      AppLogger.info('notification', 'Native permission result', { granted, result });

      // Sync to PostHog
      analyticsService.updatePushStatus(granted, granted ? 'Granted' : 'Denied');
    } catch (error) {
      AppLogger.error('notification', 'Native permission prompt error', {}, error);
    }

    // Update state — mark accepted permanently (even if denied at OS level,
    // we stop showing our custom prompt; iosRepermission handles re-ask later)
    const updated: NotificationPromptState = {
      ...stateRef.current,
      accepted: true,
      lastPromptDate: today,
      promptHistory: [
        ...stateRef.current.promptHistory,
        { variant, date: today, action: 'accepted' },
      ],
    };
    await saveCurrentState(updated);

    // Track analytics
    const permissionEvent = {
      permission_type: 'push_notifications' as const,
      screen: `notification_prompt_${variant}`,
      result: (granted ? 'granted' : 'denied') as 'granted' | 'denied',
      platform: Platform.OS,
    };
    analyticsService.trackPermissionRequested(permissionEvent);

    // Track specific push notification permission result
    if (granted) {
      analyticsService.trackPushNotificationsEnabled(permissionEvent);
    } else {
      analyticsService.trackPushNotificationsDeclined(permissionEvent);
    }

    // Advance the Orchestrator queue (null when triggered by sign-in check)
    onCompleteRef.current?.();
    onCompleteRef.current = null;
  }, [activeVariant, saveCurrentState]);

  // ---- Handle dismiss / close ----
  const handleDismiss = useCallback(async () => {
    const variant = activeVariant;
    const today = toLocalDateString(new Date());
    AppLogger.info('notification', `User dismissed "${variant}" prompt — 7-day cooldown starts`);

    setModalVisible(false);

    const updated: NotificationPromptState = {
      ...stateRef.current,
      lastPromptDate: today,
      lastDismissDate: today,
      promptHistory: [
        ...stateRef.current.promptHistory,
        { variant, date: today, action: 'dismissed' },
      ],
    };
    await saveCurrentState(updated);

    // Track analytics
    analyticsService.trackCustomEvent('notification_prompt_dismissed', {
      variant,
      dismiss_count: updated.promptHistory.filter(h => h.action === 'dismissed').length,
    });

    // Advance the Orchestrator queue (null when triggered by sign-in check)
    onCompleteRef.current?.();
    onCompleteRef.current = null;
  }, [activeVariant, saveCurrentState]);

  // ---- Streak milestone check ----
  const isStreakPromptMilestone = useCallback((streakDays: number): boolean => {
    return (NOTIFICATION_STREAK_MILESTONES as readonly number[]).includes(streakDays);
  }, []);

  // ---- Lapse detection ----
  const isReturningFromLapse = useCallback((lastActiveDate: string): boolean => {
    if (!lastActiveDate) return false;
    const today = toLocalDateString(new Date());
    const days = daysBetween(lastActiveDate, today);
    return days >= LAPSE_THRESHOLD_DAYS;
  }, []);

  return (
    <NotificationPromptContext.Provider
      value={{
        showPrompt,
        shouldPrompt,
        getBestVariant,
        isStreakPromptMilestone,
        isReturningFromLapse,
        isLoaded,
      }}
    >
      {children}

      {/* Notification Permission Modal - rendered by this provider, not Orchestrator */}
      {/* Only mount Modal when needed to prevent Android Fabric "child already has a parent" crash
          during logout — rapid provider tree re-renders cause Modal view re-parenting race conditions */}
      {isSignedIn && modalVisible && (
        <NotificationPermissionModal
          visible={modalVisible}
          variant={activeVariant}
          onEnableNotifications={handleAccept}
          onDismiss={handleDismiss}
        />
      )}
    </NotificationPromptContext.Provider>
  );
}

// ============================================================
// HOOK
// ============================================================

export function useNotificationPrompt(): NotificationPromptContextType {
  const context = useContext(NotificationPromptContext);
  if (!context) {
    throw new Error('useNotificationPrompt must be used within NotificationPromptProvider');
  }
  return context;
}
