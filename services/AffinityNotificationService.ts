/**
 * AffinityNotificationService.ts
 *
 * Registers users and devices with the Affinity Notification Service backend.
 * Runs in parallel with Customer.io — a failure here never affects CIO registration.
 *
 * Call order:
 *   1. registerUser(clerkId)      — on every sign-in (idempotent upsert)
 *   2. registerDevice(pushToken)  — after push permission granted + token obtained
 *   3. updatePermission(status)   — whenever permission status changes
 *   4. clearCurrentUser()         — on sign-out
 */

import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Localization from 'expo-localization';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AppLogger from './AppLogger';

const API_URL = process.env.EXPO_PUBLIC_AFFINITY_API_URL;
const API_KEY = process.env.EXPO_PUBLIC_AFFINITY_API_KEY;
const APP_ID  = process.env.EXPO_PUBLIC_AFFINITY_APP_ID;

// Held in module scope so registerDevice / updatePermission can use it
// without needing the Clerk user passed through PushNotificationService.
let _currentUserId: string | null = null;

// ── Internal HTTP helper ───────────────────────────────────────────────────────

async function apiFetch(
  path: string,
  method: 'POST' | 'PUT',
  body: Record<string, unknown>,
): Promise<unknown> {
  if (!API_URL || !API_KEY || !APP_ID) {
    AppLogger.warn('notification', 'AffinityNotificationService: env vars not configured — skipping');
    return null;
  }

  const response = await fetch(`${API_URL}/api/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return response.json();
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Register or upsert a user.
 * Safe to call on every app launch — the backend does an upsert by external_id.
 */
export async function registerUser(
  externalId: string,
  opts?: {
    notificationPermission?: 'granted' | 'denied' | 'undetermined';
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  if (Platform.OS === 'web') return;

  _currentUserId = externalId;

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  const locale = Localization.getLocales()[0]?.languageTag ?? null;

  // If permission not explicitly provided, read the real OS status so the
  // upsert never overwrites a previously-granted permission with 'undetermined'.
  let permissionStatus = opts?.notificationPermission;
  if (permissionStatus === undefined) {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      permissionStatus = status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
    } catch {
      permissionStatus = 'undetermined';
    }
  }

  try {
    await apiFetch('/users', 'POST', {
      app_id: APP_ID,
      external_id: externalId,
      notification_permission: permissionStatus,
      notifications_enabled: permissionStatus === 'granted',
      timezone,
      locale,
      metadata: opts?.metadata ?? {},
    });

    AppLogger.info('notification', 'User registered with Affinity', { externalId });
  } catch (error) {
    // Non-fatal — log and continue
    AppLogger.error('notification', 'Failed to register user with Affinity', { externalId }, error);
  }
}

/**
 * Register or upsert a device with an Expo push token.
 * Fetches the Expo push token internally — the Affinity backend routes via
 * Expo's push gateway (exponent-server-sdk) and requires ExponentPushToken format.
 * Must be called after registerUser — relies on _currentUserId being set.
 */
export async function registerDevice(): Promise<void> {
  if (Platform.OS === 'web') return;

  if (!Device.isDevice) {
    AppLogger.info('notification', 'registerDevice: skipping on simulator');
    return;
  }

  if (!_currentUserId) {
    AppLogger.warn('notification', 'registerDevice called before registerUser — skipping');
    return;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });

    const appVersion = Application.nativeApplicationVersion;
    const osVersion = String(Platform.Version);

    await apiFetch('/devices', 'POST', {
      app_id: APP_ID,
      user_external_id: _currentUserId,
      push_token: expoPushToken,
      platform: Platform.OS,
      app_version: appVersion,
      os_version: osVersion,
    });

    AppLogger.info('notification', 'Device registered with Affinity', {
      platform: Platform.OS,
      tokenPrefix: expoPushToken.substring(0, 24) + '...',
    });
  } catch (error) {
    AppLogger.error('notification', 'Failed to register device with Affinity', {}, error);
  }
}

/**
 * Update notification permission status for the current user.
 * Call after permission prompt resolves or on sign-in permission check.
 */
export async function updatePermission(
  status: 'granted' | 'denied' | 'undetermined',
): Promise<void> {
  if (Platform.OS === 'web') return;

  if (!_currentUserId) {
    AppLogger.warn('notification', 'updatePermission called before registerUser — skipping');
    return;
  }

  try {
    await apiFetch(`/users/${APP_ID}/${_currentUserId}`, 'PUT', {
      notification_permission: status,
      notifications_enabled: status === 'granted',
    });

    AppLogger.info('notification', 'Permission updated in Affinity', { status });
  } catch (error) {
    AppLogger.error('notification', 'Failed to update permission in Affinity', { status }, error);
  }
}

/**
 * Clear the stored user ID on sign-out.
 */
export function clearCurrentUser(): void {
  _currentUserId = null;
}

export default {
  registerUser,
  registerDevice,
  updatePermission,
  clearCurrentUser,
};
