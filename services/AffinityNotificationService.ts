/**
 * AffinityNotificationService.ts
 *
 * Registers users and devices with the Affinity Notification Service backend.
 * A failure here is non-fatal and never blocks the app.
 *
 * Call order:
 *   1. registerUser(clerkId)      — on every sign-in (idempotent upsert)
 *   2. registerDevice()           — after push permission granted (fetches native token internally)
 *   3. updatePermission(status)   — whenever permission status changes
 *   4. logout()                   — on sign-out
 */

import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Localization from 'expo-localization';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import DeviceInfo from 'react-native-device-info';
import AppLogger from './AppLogger';

const API_URL = process.env.EXPO_PUBLIC_AFFINITY_API_URL;
const API_KEY = process.env.EXPO_PUBLIC_AFFINITY_API_KEY;
const APP_ID  = process.env.EXPO_PUBLIC_AFFINITY_APP_ID;

// Held in module scope so registerDevice / updatePermission can use it
// without needing the Clerk user passed through PushNotificationService.
let _currentUserId: string | null = null;
let _lastRegisteredToken: string | null = null;
let _deviceIdentifier: string | null = null;

// Gate: registerDevice() awaits this to ensure the user exists in the backend
// before attempting device registration. Reset on logout.
let _userReadyResolve: (() => void) | null = null;
let _userReady: Promise<void> = new Promise((r) => { _userReadyResolve = r; });

// Gate: registerLiveActivityToken() awaits this to ensure the device exists
// in the backend before attempting token registration. Reset on logout.
let _deviceReadyResolve: (() => void) | null = null;
let _deviceReady: Promise<void> = new Promise((r) => { _deviceReadyResolve = r; });

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
    email?: string | null;
    userType?: 'authenticated' | 'anonymous';
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
      user_type: opts?.userType ?? 'authenticated',
      email: opts?.email ?? null,
      timezone,
      locale,
      metadata: opts?.metadata ?? {},
    });

    AppLogger.info('notification', 'User registered with Affinity', { externalId });
    _userReadyResolve?.();
  } catch (error) {
    // Non-fatal — log and continue, but still resolve the gate so
    // registerDevice doesn't hang forever (it will fail with its own 404)
    _userReadyResolve?.();
    AppLogger.error('notification', 'Failed to register user with Affinity', { externalId }, error);
  }
}

/**
 * Register or upsert a device with its native push token (APNs for iOS, FCM for Android).
 * Fetches the token internally via getDevicePushTokenAsync().
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

  // Wait for registerUser() to finish so the user exists in the backend
  await _userReady;

  try {
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
    _deviceReadyResolve?.();
  } catch (error) {
    // Non-fatal — still resolve the gate so registerLiveActivityToken
    // doesn't hang forever (it will fail with its own error)
    _deviceReadyResolve?.();
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
  // Reset gates for the next sign-in cycle
  _userReady = new Promise((r) => { _userReadyResolve = r; });
  _deviceReady = new Promise((r) => { _deviceReadyResolve = r; });
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

/**
 * Report an engagement event (open / click / dismiss) back to the Affinity
 * Notification Service.  The delivery_id comes from the push payload `data`
 * field — injected automatically by the backend orchestrator.
 *
 * Non-fatal: failures are logged but never block the UI.
 */
export async function reportEvent(
  deliveryId: string,
  eventType: 'open' | 'click' | 'dismiss',
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (!APP_ID) return;

  try {
    await apiFetch('/sdk/events', 'POST', {
      app_id: APP_ID,
      delivery_id: deliveryId,
      event_type: eventType,
      user_external_id: _currentUserId,
      occurred_at: new Date().toISOString(),
      metadata: metadata ?? {},
    });

    AppLogger.info('notification', `Engagement event reported: ${eventType}`, {
      deliveryId,
    });
  } catch (error) {
    AppLogger.error('notification', `Failed to report ${eventType} event`, { deliveryId }, error);
  }
}

/**
 * Register a Live Activity push token with the backend.
 *
 * Two token types:
 * - push_to_start: for starting activities remotely (iOS 17.2+)
 * - activity: for updating/ending an existing activity via push
 *
 * Non-fatal: failures are logged but never block the UI.
 * Must be called after registerUser — relies on _currentUserId and _deviceIdentifier.
 */
export async function registerLiveActivityToken(params: {
  pushToken: string;
  tokenType: 'push_to_start' | 'activity';
  activityType: string;
  activityId?: string | null;
}): Promise<void> {
  if (Platform.OS !== 'ios') return;

  if (!_currentUserId) {
    AppLogger.warn('notification', 'registerLiveActivityToken: user not set — skipping');
    return;
  }

  // Wait for both user AND device to exist in the backend.
  // registerDevice() must complete first so the backend can find the
  // device by device_identifier when creating the live activity token.
  await _deviceReady;

  if (!_deviceIdentifier) {
    AppLogger.warn('notification', 'registerLiveActivityToken: device_identifier not available — skipping');
    return;
  }

  try {
    await apiFetch('/live-activities/tokens', 'POST', {
      app_id: APP_ID,
      user_external_id: _currentUserId,
      device_identifier: _deviceIdentifier,
      push_token: params.pushToken,
      token_type: params.tokenType,
      activity_type: params.activityType,
      activity_id: params.activityId ?? null,
    });

    AppLogger.info('notification', 'Live Activity token registered', {
      tokenType: params.tokenType,
      activityType: params.activityType,
      activityId: params.activityId ?? null,
      tokenPrefix: params.pushToken.substring(0, 16) + '...',
    });
  } catch (error) {
    AppLogger.error('notification', 'Failed to register Live Activity token', {
      tokenType: params.tokenType,
      activityType: params.activityType,
    }, error);
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
  reportEvent,
  registerLiveActivityToken,
  logout,
  getLastRegisteredToken,
  getDeviceIdentifier,
};
