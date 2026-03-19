/**
 * AffinityNotificationService.ts
 *
 * Registers users and devices with the Affinity Notification Service backend.
 * A failure here is non-fatal and never blocks the app.
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
import DeviceInfo from 'react-native-device-info';
import Constants from 'expo-constants';
import AppLogger from './AppLogger';

const API_URL = process.env.EXPO_PUBLIC_AFFINITY_API_URL;
const API_KEY = process.env.EXPO_PUBLIC_AFFINITY_API_KEY;
const APP_ID  = process.env.EXPO_PUBLIC_AFFINITY_APP_ID;

// Held in module scope so registerDevice / updatePermission can use it
// without needing the Clerk user passed through PushNotificationService.
let _currentUserId: string | null = null;
let _lastRegisteredToken: string | null = null;
let _deviceIdentifier: string | null = null;

// ── Internal HTTP helper ───────────────────────────────────────────────────────

async function apiFetch(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH',
  body?: Record<string, unknown>,
): Promise<unknown> {
  if (!API_URL || !API_KEY || !APP_ID) {
    AppLogger.warn('notification', 'AffinityNotificationService: env vars not configured — skipping');
    return null;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${API_KEY}`,
  };
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}/api/v1${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  // 204 No Content — no JSON to parse
  if (response.status === 204) return null;

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
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  if (Platform.OS === 'web') return;

  _currentUserId = externalId;

  // Eagerly resolve device_identifier so updateDevice() works even if
  // registerDevice() hasn't been called yet (e.g. permission denied path).
  if (!_deviceIdentifier && Device.isDevice) {
    try {
      _deviceIdentifier = await DeviceInfo.getUniqueId();
    } catch {
      // Non-fatal — updateDevice() will gracefully no-op if still null
    }
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  const locale = Localization.getLocales()[0]?.languageTag ?? null;

  try {
    await apiFetch('/users', 'POST', {
      app_id: APP_ID,
      external_id: externalId,
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
    // const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    // const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    const { data: deviceToken } = await Notifications.getDevicePushTokenAsync();
    _lastRegisteredToken = deviceToken;

    const appVersion = Application.nativeApplicationVersion;
    const osVersion = String(Platform.Version);

    // Persistent hardware ID: identifierForVendor (iOS) / androidId (Android).
    // Allows the backend to deactivate stale push tokens when the user
    // reinstalls the app and a new token is issued for the same device.
    const deviceIdentifier = await DeviceInfo.getUniqueId();
    _deviceIdentifier = deviceIdentifier;

    // Read the real OS permission so the device record is accurate
    let notificationPermission: 'granted' | 'denied' | 'undetermined' = 'undetermined';
    try {
      const { status } = await Notifications.getPermissionsAsync();
      notificationPermission = status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
    } catch {
      // keep default
    }

    await apiFetch('/devices', 'POST', {
      app_id: APP_ID,
      user_external_id: _currentUserId,
      push_token: deviceToken,
      platform: Platform.OS,
      device_identifier: deviceIdentifier,
      app_version: appVersion,
      os_version: osVersion,
      notification_permission: notificationPermission,
      notifications_enabled: notificationPermission === 'granted',
    });

    AppLogger.info('notification', 'Device registered with Affinity', {
      platform: Platform.OS,
      tokenPrefix: deviceToken.substring(0, 24) + '...',
    });
  } catch (error) {
    AppLogger.error('notification', 'Failed to register device with Affinity', {}, error);
  }
}

/**
 * Update notification permission status for the current device.
 * Permission is per-device (not per-user) since each device has its own
 * OS-level notification permission. Re-registers the device with the
 * updated permission status.
 */
export async function updatePermission(
  _status: 'granted' | 'denied' | 'undetermined',
): Promise<void> {
  if (Platform.OS === 'web') return;

  if (!_currentUserId) {
    AppLogger.warn('notification', 'updatePermission called before registerUser — skipping');
    return;
  }

  // Re-register the device — the backend upserts by push_token and
  // reads the real OS permission internally.
  await registerDevice();
}

/**
 * Deactivate the current device on user logout.
 * Tells the backend to stop sending notifications to this device.
 *
 * Prefers device_identifier (stable hardware ID) over push_token.
 * Falls back to push_token if device_identifier is unavailable.
 * The device is reactivated automatically on next sign-in via registerDevice().
 */
export async function logout(): Promise<void> {
  if (Platform.OS === 'web') return;

  if (!Device.isDevice) return;

  try {
    if (_deviceIdentifier) {
      // Preferred: use stable hardware ID — works even if push token rotated
      await apiFetch(
        `/devices/logout?device_identifier=${encodeURIComponent(_deviceIdentifier)}&app_id=${APP_ID}`,
        'POST',
      );
    } else {
      // Fallback: use push token (legacy path)
      const { data: deviceToken } = await Notifications.getDevicePushTokenAsync();
      await apiFetch(
        `/devices/logout?push_token=${encodeURIComponent(deviceToken)}`,
        'POST',
      );
    }

    AppLogger.info('notification', 'Device deactivated on logout', {
      method: _deviceIdentifier ? 'device_identifier' : 'push_token',
    });
  } catch (error) {
    // Non-fatal — don't block the logout flow
    AppLogger.error('notification', 'Failed to deactivate device on logout', {}, error);
  }

  _currentUserId = null;
  _deviceIdentifier = null;
}

/**
 * Update device fields (permission, version, metadata) using the stable
 * device_identifier. No-op if device_identifier is not yet known.
 */
export async function updateDevice(
  fields: {
    push_token?: string;
    notification_permission?: 'granted' | 'denied' | 'undetermined';
    notifications_enabled?: boolean;
    app_version?: string;
    os_version?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  if (Platform.OS === 'web') return;

  if (!_deviceIdentifier) return;

  try {
    await apiFetch(
      `/devices?app_id=${APP_ID}&device_identifier=${encodeURIComponent(_deviceIdentifier)}`,
      'PATCH',
      fields,
    );

    AppLogger.info('notification', 'Device updated via identifier', {
      fields: Object.keys(fields),
    });
  } catch (error) {
    AppLogger.error('notification', 'Failed to update device', {}, error);
  }
}

export function getLastRegisteredToken(): string | null {
  return _lastRegisteredToken;
}

export function getDeviceIdentifier(): string | null {
  return _deviceIdentifier;
}

export default {
  registerUser,
  registerDevice,
  updatePermission,
  updateDevice,
  logout,
  getLastRegisteredToken,
  getDeviceIdentifier,
};
