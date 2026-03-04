import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { TokenCache } from '@clerk/clerk-expo';

const secureStoreOpts: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

// Deferred event buffer — PostHog isn't ready when Clerk reads tokens on app launch.
// Events are stored here and flushed once PostHog initializes via flushPendingTokenCacheEvents().
interface PendingTokenCacheEvent {
  type: 'read_null' | 'read_error' | 'write_error' | 'clear_error';
  key: string;
  error_message?: string;
  platform: string;
}

const pendingEvents: PendingTokenCacheEvent[] = [];

function bufferEvent(type: PendingTokenCacheEvent['type'], key: string, error?: unknown) {
  pendingEvents.push({
    type,
    key,
    error_message: error instanceof Error ? error.message : error ? String(error) : undefined,
    platform: Platform.OS,
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
    try {
      const value = await SecureStore.getItemAsync(key, secureStoreOpts);
      if (!value) {
        console.log(`🔐 [TokenCache] Key "${key}" returned null on ${Platform.OS}`);
        bufferEvent('read_null', key);
      } else {
        console.log(`🔐 [TokenCache] Key "${key}" read successfully on ${Platform.OS}`);
      }
      return value;
    } catch (error) {
      console.error(`🔐 [TokenCache] Failed to read "${key}" on ${Platform.OS}:`, error);
      bufferEvent('read_error', key, error);
      try {
        await SecureStore.deleteItemAsync(key, secureStoreOpts);
        console.log(`🔐 [TokenCache] Deleted corrupted key "${key}" on ${Platform.OS}`);
      } catch (deleteError) {
        console.error(`🔐 [TokenCache] Failed to delete corrupted key "${key}" on ${Platform.OS}:`, deleteError);
      }
      return null;
    }
  },

  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value, secureStoreOpts);
      console.log(`🔐 [TokenCache] Key "${key}" saved successfully on ${Platform.OS}`);
    } catch (error) {
      console.error(`🔐 [TokenCache] Failed to write "${key}" on ${Platform.OS}:`, error);
      bufferEvent('write_error', key, error);
    }
  },

  clearToken(key: string) {
    SecureStore.deleteItemAsync(key, secureStoreOpts)
      .then(() => {
        console.log(`🔐 [TokenCache] Key "${key}" cleared successfully on ${Platform.OS}`);
      })
      .catch((error) => {
        console.error(`🔐 [TokenCache] Failed to clear "${key}" on ${Platform.OS}:`, error);
        bufferEvent('clear_error', key, error);
      });
  },
});

export const tokenCache =
  Platform.OS !== 'web' ? createTokenCache() : undefined;
