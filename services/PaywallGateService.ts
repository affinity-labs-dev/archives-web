/**
 * PaywallGateService — tracks which Clerk user_ids have already been shown
 * the onboarding free-trial paywall (`/onboarding-step-13`) on this install.
 *
 * Why this exists:
 *   Before AFF-786, every sign-in for a non-subscriber ran the paywall route.
 *   Product wants it to fire ONLY on the first sign-in per user per install:
 *   - User A first sign-in on device X → paywall.
 *   - User A signs out, signs back in on device X → skip paywall.
 *   - User B first sign-in on device X → paywall (their own first-time).
 *
 * Storage:
 *   AsyncStorage key `onboarding_paywall_seen_v1`, shape
 *     { version: 1, userIds: string[] }
 *
 * Survival across sign-out:
 *   `handleSignOut` in app/(tabs)/profile.tsx calls `AsyncStorage.clear()`.
 *   The signed-in flow snapshots this list via `getPaywallSeenSnapshot()`
 *   BEFORE the clear and restores via `restorePaywallSeenSnapshot()` AFTER —
 *   same pattern as RememberedAccountService's `upsertRememberedAccount`
 *   snapshot. This keeps the gate working on the next sign-in.
 *
 * Delete-account:
 *   Delete flow should call `removeUserFromPaywallSeen(userId)` so the user
 *   id is dropped from the list (though a dead id in the list is harmless —
 *   Clerk will never re-issue it).
 *
 * Versioning:
 *   Bump CURRENT_VERSION + add a migration branch in `readCache()` when the
 *   shape changes.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import AppLogger from './AppLogger';

const STORAGE_KEY = 'onboarding_paywall_seen_v1';
const CURRENT_VERSION = 1 as const;

interface PaywallSeenCache {
  version: typeof CURRENT_VERSION;
  userIds: string[];
}

const EMPTY_CACHE: PaywallSeenCache = {
  version: CURRENT_VERSION,
  userIds: [],
};

async function readCache(): Promise<PaywallSeenCache> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_CACHE;
    const parsed = JSON.parse(raw) as Partial<PaywallSeenCache>;
    if (parsed.version !== CURRENT_VERSION || !Array.isArray(parsed.userIds)) {
      AppLogger.warn('paywall', 'Paywall-seen cache version mismatch — resetting', {
        found: parsed.version,
        expected: CURRENT_VERSION,
      });
      return EMPTY_CACHE;
    }
    return { version: CURRENT_VERSION, userIds: parsed.userIds };
  } catch (err) {
    AppLogger.error('paywall', 'Paywall-seen cache read failed', undefined, err);
    return EMPTY_CACHE;
  }
}

async function writeCache(cache: PaywallSeenCache): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (err) {
    AppLogger.error('paywall', 'Paywall-seen cache write failed', undefined, err);
  }
}

export async function hasSeenOnboardingPaywall(userId: string): Promise<boolean> {
  const cache = await readCache();
  return cache.userIds.includes(userId);
}

export async function markOnboardingPaywallSeen(userId: string): Promise<void> {
  const cache = await readCache();
  if (cache.userIds.includes(userId)) return;
  await writeCache({
    version: CURRENT_VERSION,
    userIds: [...cache.userIds, userId],
  });
  AppLogger.info('paywall', 'Marked onboarding paywall seen', { userId });
}

export async function removeUserFromPaywallSeen(userId: string): Promise<void> {
  const cache = await readCache();
  if (!cache.userIds.includes(userId)) return;
  await writeCache({
    version: CURRENT_VERSION,
    userIds: cache.userIds.filter((id) => id !== userId),
  });
  AppLogger.info('paywall', 'Removed user from paywall-seen list', { userId });
}

export async function clearOnboardingPaywallSeen(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    AppLogger.info('paywall', 'Paywall-seen cache cleared');
  } catch (err) {
    AppLogger.error('paywall', 'Paywall-seen cache clear failed', undefined, err);
  }
}

/**
 * Snapshot the current paywall-seen list so it can survive the
 * `AsyncStorage.clear()` step in sign-out. Returns null when there's nothing
 * to preserve — caller can skip the restore step.
 */
export async function getPaywallSeenSnapshot(): Promise<PaywallSeenCache | null> {
  const cache = await readCache();
  if (cache.userIds.length === 0) return null;
  return cache;
}

/** Write a previously-captured snapshot back after `AsyncStorage.clear()`. */
export async function restorePaywallSeenSnapshot(
  snapshot: PaywallSeenCache,
): Promise<void> {
  await writeCache(snapshot);
  AppLogger.info('paywall', 'Paywall-seen snapshot restored', {
    count: snapshot.userIds.length,
  });
}

/**
 * Single route-decision helper for post-sign-in routing at step-7 and
 * onboarding-auth sign-in. Subscribed users always skip the paywall.
 * Non-subscribers hit the paywall on the first sign-in per user_id, then
 * skip it on every subsequent sign-in.
 *
 * If `userId` is missing for any reason, fails safe by routing to the
 * paywall — worst case is the user sees it an extra time; we never want to
 * accidentally route a brand-new user past it.
 */
export async function resolvePostSignInRoute(
  userId: string | null | undefined,
  isSubscribed: boolean,
): Promise<'/(tabs)/today' | '/onboarding-step-13'> {
  if (isSubscribed) return '/(tabs)/today';
  if (!userId) {
    AppLogger.warn('paywall', 'resolvePostSignInRoute: missing userId — defaulting to paywall');
    return '/onboarding-step-13';
  }
  const seen = await hasSeenOnboardingPaywall(userId);
  return seen ? '/(tabs)/today' : '/onboarding-step-13';
}
