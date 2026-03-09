import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { TokenCache } from '@clerk/clerk-expo';

/**
 * AFF-309: Clerk Token Cache — AsyncStorage primary, SecureStore migration fallback.
 *
 * Switched from SecureStore-only to AsyncStorage-primary because SecureStore
 * (iOS Keychain) caused unexpected sign-outs due to flaky reads on cold start
 * and after app updates.
 *
 * Migration strategy (existing users keep their session):
 *   getToken:   AsyncStorage first → fallback to SecureStore → migrate to AsyncStorage
 *   saveToken:  Always write to AsyncStorage
 *   clearToken: Clear from both storages
 */

// Prefix to namespace Clerk token keys in AsyncStorage
const AS_PREFIX = '__clerk_token_';

// Legacy SecureStore options (for migration reads only)
const secureStoreOpts: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

// Deferred event buffer — PostHog isn't ready when Clerk reads tokens on app launch.
// Events are stored here and flushed once PostHog initializes via flushPendingTokenCacheEvents().
export interface PendingTokenCacheEvent {
  type: 'read_ok' | 'read_null' | 'read_error' | 'read_migrated' | 'write_ok' | 'write_error' | 'clear_ok' | 'clear_error';
  key: string;
  error_message?: string;
  platform: string;
  source?: 'async_storage' | 'secure_store';
}

const pendingEvents: PendingTokenCacheEvent[] = [];

function bufferEvent(
  type: PendingTokenCacheEvent['type'],
  key: string,
  opts?: { error?: unknown; source?: PendingTokenCacheEvent['source'] }
) {
  pendingEvents.push({
    type,
    key,
    error_message: opts?.error instanceof Error ? opts.error.message : opts?.error ? String(opts.error) : undefined,
    platform: Platform.OS,
    source: opts?.source,
  });
}

/**
 * Flush all buffered token cache events to PostHog via analyticsService.
 * Call this once after `analyticsService.initialize(posthog)` in AnalyticsWrapper.
 */
export function flushPendingTokenCacheEvents(
  trackFn: (event: PendingTokenCacheEvent) => void
) {
  while (pendingEvents.length > 0) {
    const event = pendingEvents.shift()!;
    trackFn(event);
  }
}

const createTokenCache = (): TokenCache => ({
  async getToken(key: string) {
    const asKey = `${AS_PREFIX}${key}`;

    // 1. Try AsyncStorage first (primary storage)
    try {
      const value = await AsyncStorage.getItem(asKey);
      if (value) {
        console.log(`🔐 [TokenCache] Read OK from AsyncStorage | key="${key}"`);
        bufferEvent('read_ok', key, { source: 'async_storage' });
        return value;
      }
    } catch (error) {
      console.error(`🔐 [TokenCache] AsyncStorage read error | key="${key}":`, error);
      // Fall through to SecureStore migration
    }

    // 2. Fallback: Try SecureStore (migration from previous versions)
    try {
      const value = await SecureStore.getItemAsync(key, secureStoreOpts);
      if (value) {
        console.log(`🔐 [TokenCache] 🔄 Migrating from SecureStore → AsyncStorage | key="${key}"`);

        // Migrate to AsyncStorage
        try {
          await AsyncStorage.setItem(asKey, value);
          console.log(`🔐 [TokenCache] ✅ Migration OK | key="${key}"`);
        } catch (writeErr) {
          console.error(`🔐 [TokenCache] Migration write failed | key="${key}":`, writeErr);
          // Still return value — token is valid even if migration write failed
        }

        // Clean up SecureStore (best-effort, don't block)
        SecureStore.deleteItemAsync(key, secureStoreOpts).catch(() => {});

        bufferEvent('read_migrated', key, { source: 'secure_store' });
        return value;
      }
    } catch (error) {
      // SecureStore error during migration — log but do NOT delete the key (AFF-309 P0)
      console.error(`🔐 [TokenCache] SecureStore migration read error | key="${key}":`, error);
      bufferEvent('read_error', key, { error, source: 'secure_store' });
    }

    // 3. Token not found anywhere
    console.log(`🔐 [TokenCache] No token found | key="${key}"`);
    bufferEvent('read_null', key);
    return null;
  },

  async saveToken(key: string, value: string) {
    const asKey = `${AS_PREFIX}${key}`;
    try {
      await AsyncStorage.setItem(asKey, value);
      console.log(`🔐 [TokenCache] Save OK | key="${key}"`);
      bufferEvent('write_ok', key, { source: 'async_storage' });
    } catch (error) {
      console.error(`🔐 [TokenCache] Save failed | key="${key}":`, error);
      bufferEvent('write_error', key, { error, source: 'async_storage' });
    }
  },

  clearToken(key: string) {
    const asKey = `${AS_PREFIX}${key}`;

    // Clear from AsyncStorage (primary)
    AsyncStorage.removeItem(asKey)
      .then(() => {
        console.log(`🔐 [TokenCache] Clear OK (AsyncStorage) | key="${key}"`);
        bufferEvent('clear_ok', key, { source: 'async_storage' });
      })
      .catch((error) => {
        console.error(`🔐 [TokenCache] Clear failed (AsyncStorage) | key="${key}":`, error);
        bufferEvent('clear_error', key, { error, source: 'async_storage' });
      });

    // Also clear from SecureStore (legacy cleanup, best-effort)
    SecureStore.deleteItemAsync(key, secureStoreOpts).catch(() => {});
  },
});

export const tokenCache =
  Platform.OS !== 'web' ? createTokenCache() : undefined;
