import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { TokenCache } from '@clerk/clerk-expo';
import AppLogger from './AppLogger';

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
 *
 * Observability: All operations logged via AppLogger → Sentry breadcrumbs (AFF-310).
 */

// Prefix to namespace Clerk token keys in AsyncStorage
const AS_PREFIX = '__clerk_token_';

// Legacy SecureStore options (for migration reads only)
const secureStoreOpts: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

const createTokenCache = (): TokenCache => ({
  async getToken(key: string) {
    const asKey = `${AS_PREFIX}${key}`;

    // 1. Try AsyncStorage first (primary storage)
    try {
      const value = await AsyncStorage.getItem(asKey);
      if (value) {
        AppLogger.info('auth', 'Token read OK from AsyncStorage', { key });
        return value;
      }
    } catch (error) {
      AppLogger.error('auth', 'AsyncStorage token read error', { key }, error);
      // Fall through to SecureStore migration
    }

    // 2. Fallback: Try SecureStore (migration from previous versions)
    try {
      const value = await SecureStore.getItemAsync(key, secureStoreOpts);
      if (value) {
        AppLogger.info('auth', 'Migrating token from SecureStore to AsyncStorage', { key });

        // Migrate to AsyncStorage
        try {
          await AsyncStorage.setItem(asKey, value);
          AppLogger.info('auth', 'Token migration OK', { key });
        } catch (writeErr) {
          AppLogger.error('auth', 'Token migration write failed', { key }, writeErr);
          // Still return value — token is valid even if migration write failed
        }

        // Clean up SecureStore (best-effort, don't block)
        SecureStore.deleteItemAsync(key, secureStoreOpts).catch(() => {});

        return value;
      }
    } catch (error) {
      // SecureStore error during migration — log but do NOT delete the key (AFF-309 P0)
      AppLogger.error('auth', 'SecureStore migration read error', { key, source: 'secure_store' }, error);
    }

    // 3. Token not found anywhere
    AppLogger.warn('auth', 'No token found in any storage', { key });
    return null;
  },

  async saveToken(key: string, value: string) {
    const asKey = `${AS_PREFIX}${key}`;
    try {
      await AsyncStorage.setItem(asKey, value);
      AppLogger.info('auth', 'Token saved OK', { key });
    } catch (error) {
      AppLogger.error('auth', 'Token save failed', { key }, error);
    }
  },

  clearToken(key: string) {
    const asKey = `${AS_PREFIX}${key}`;

    // Clear from AsyncStorage (primary)
    AsyncStorage.removeItem(asKey)
      .then(() => {
        AppLogger.info('auth', 'Token cleared OK (AsyncStorage)', { key });
      })
      .catch((error) => {
        AppLogger.error('auth', 'Token clear failed (AsyncStorage)', { key }, error);
      });

    // Also clear from SecureStore (legacy cleanup, best-effort)
    SecureStore.deleteItemAsync(key, secureStoreOpts).catch(() => {});
  },
});

export const tokenCache =
  Platform.OS !== 'web' ? createTokenCache() : undefined;
