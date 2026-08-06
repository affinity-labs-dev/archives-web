/**
 * RememberedAccountService — persists "last signed-in identity" metadata so
 * the /welcome-back screen can greet a signed-out user by name/avatar and
 * offer a one-tap re-auth instead of forcing them back through onboarding.
 *
 * Design notes:
 *  - Array schema from day one (see AFF-786 plan Q4) — UI currently surfaces
 *    one active account, but the storage shape is ready for a future
 *    "switch account" bottom sheet without a migration step.
 *  - Stores display-only metadata (firstName, email, avatarUrl, lastAuthMethod).
 *    NO credentials, NO session tokens. Clerk's own token cache
 *    (see services/ClerkTokenCache.ts) is the source of truth for auth state;
 *    this cache is purely a UI hint.
 *  - AsyncStorage (not SecureStore) because the data is non-sensitive and
 *    SecureStore on cold start has historically been flaky (AFF-309).
 *  - Version field guards future schema changes. Bump `CURRENT_VERSION` and
 *    add a migration branch in `readCache()` when the shape changes.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import AppLogger from './AppLogger';

const STORAGE_KEY = 'remembered_accounts_v1';
const CURRENT_VERSION = 1 as const;

export type RememberedAuthMethod = 'oauth_apple' | 'oauth_google' | 'email';

export interface RememberedAccount {
  userId: string;
  firstName: string | null;
  email: string;
  avatarUrl: string | null;
  lastAuthMethod: RememberedAuthMethod;
  lastSignedInAt: number;
  rememberedSince: number;
  /** Reserved for future TTL policy (AFF-786 Q1: no expiry today). */
  expiresAt?: number | null;
}

interface RememberedAccountsCache {
  version: typeof CURRENT_VERSION;
  accounts: RememberedAccount[];
  activeUserId: string | null;
}

const EMPTY_CACHE: RememberedAccountsCache = {
  version: CURRENT_VERSION,
  accounts: [],
  activeUserId: null,
};

async function readCache(): Promise<RememberedAccountsCache> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_CACHE;
    const parsed = JSON.parse(raw) as Partial<RememberedAccountsCache>;
    // Unknown / future versions: wipe rather than trust unknown shape.
    if (parsed.version !== CURRENT_VERSION || !Array.isArray(parsed.accounts)) {
      AppLogger.warn('auth', 'Remembered cache version mismatch — resetting', {
        found: parsed.version,
        expected: CURRENT_VERSION,
      });
      return EMPTY_CACHE;
    }
    return {
      version: CURRENT_VERSION,
      accounts: parsed.accounts,
      activeUserId: parsed.activeUserId ?? null,
    };
  } catch (err) {
    AppLogger.error('auth', 'Remembered cache read failed', undefined, err);
    return EMPTY_CACHE;
  }
}

async function writeCache(cache: RememberedAccountsCache): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (err) {
    AppLogger.error('auth', 'Remembered cache write failed', undefined, err);
  }
}

/**
 * Insert or update a remembered account and mark it active. Does NOT touch
 * Clerk — callers are expected to snapshot fields off the Clerk `user` object
 * before calling this.
 */
export async function upsertRememberedAccount(
  account: Omit<RememberedAccount, 'rememberedSince'> & { rememberedSince?: number },
): Promise<void> {
  const cache = await readCache();
  const now = Date.now();
  const existing = cache.accounts.find((a) => a.userId === account.userId);
  const merged: RememberedAccount = {
    userId: account.userId,
    firstName: account.firstName,
    email: account.email,
    avatarUrl: account.avatarUrl,
    lastAuthMethod: account.lastAuthMethod,
    lastSignedInAt: account.lastSignedInAt ?? now,
    rememberedSince: existing?.rememberedSince ?? account.rememberedSince ?? now,
    expiresAt: account.expiresAt ?? null,
  };
  const others = cache.accounts.filter((a) => a.userId !== account.userId);
  // Sort by most-recent first so callers always see a stable order.
  const accounts = [merged, ...others].sort((a, b) => b.lastSignedInAt - a.lastSignedInAt);
  await writeCache({
    version: CURRENT_VERSION,
    accounts,
    activeUserId: account.userId,
  });
  AppLogger.info('auth', 'Remembered account upserted', {
    userId: account.userId,
    method: account.lastAuthMethod,
    total: accounts.length,
  });
}

export async function getRememberedAccounts(): Promise<RememberedAccount[]> {
  const { accounts } = await readCache();
  const now = Date.now();
  // Expiry is a no-op today (AFF-786 Q1) but keeps the helper forward-safe:
  // callers don't need to know whether TTL is on or off.
  return accounts.filter((a) => !a.expiresAt || a.expiresAt > now);
}

export async function getActiveAccount(): Promise<RememberedAccount | null> {
  const cache = await readCache();
  const accounts = cache.accounts.filter(
    (a) => !a.expiresAt || a.expiresAt > Date.now(),
  );
  if (accounts.length === 0) return null;
  if (cache.activeUserId) {
    const pinned = accounts.find((a) => a.userId === cache.activeUserId);
    if (pinned) return pinned;
  }
  // Fall back to most recent (list is already sorted desc in writeCache).
  return accounts[0];
}

export async function setActiveAccount(userId: string): Promise<void> {
  const cache = await readCache();
  if (!cache.accounts.some((a) => a.userId === userId)) {
    AppLogger.warn('auth', 'setActiveAccount: unknown userId', { userId });
    return;
  }
  await writeCache({ ...cache, activeUserId: userId });
}

/**
 * Remove a single remembered account. If the removed account was active, the
 * next most-recent account (if any) becomes active automatically.
 */
export async function removeRememberedAccount(userId: string): Promise<void> {
  const cache = await readCache();
  const accounts = cache.accounts.filter((a) => a.userId !== userId);
  const activeUserId =
    cache.activeUserId === userId
      ? accounts[0]?.userId ?? null
      : cache.activeUserId;
  await writeCache({ version: CURRENT_VERSION, accounts, activeUserId });
  AppLogger.info('auth', 'Remembered account removed', {
    userId,
    remaining: accounts.length,
  });
}

/** Wipe every remembered account — used by the "Delete account" flow. */
export async function clearAllRememberedAccounts(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    AppLogger.info('auth', 'All remembered accounts cleared');
  } catch (err) {
    AppLogger.error('auth', 'Clear remembered accounts failed', undefined, err);
  }
}

/**
 * Convenience: has the user ever signed in on this install? Used by the
 * entry-point router to choose between /onboarding-step-1 and /welcome-back.
 */
export async function hasRememberedAccount(): Promise<boolean> {
  const accounts = await getRememberedAccounts();
  return accounts.length > 0;
}
