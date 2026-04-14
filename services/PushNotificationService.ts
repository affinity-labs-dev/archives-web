// PushNotificationService.ts - iOS/Android push notification registration
// Requests OS permission and registers the native device token with AffinityNotificationService.

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AffinityNotificationService from './AffinityNotificationService';
import { analyticsService } from './AnalyticsService';
import AppLogger from './AppLogger';

/** Shared push permission status — PascalCase to match PostHog person property values */
export type PushPermissionStatus = 'Granted' | 'Denied' | 'NotDetermined';

interface PushRegistrationResult {
  status: PushPermissionStatus;
  token: string | null;
}

/**
 * Request push notification permission and register the native device token
 * (APNs for iOS, FCM for Android) with AffinityNotificationService.
 *
 * 1. Use expo-notifications to request OS permission
 * 2. Delegate to AffinityNotificationService.registerDevice() which fetches the token internally
 */
export async function requestPushNotificationPermission(): Promise<PushRegistrationResult> {
  if (Platform.OS === 'web') {
    AppLogger.info('notification', 'Web platform, skipping');
    return { status: 'NotDetermined', token: null };
  }

  if (!Device.isDevice) {
    AppLogger.info('notification', 'Not a physical device, skipping push registration');
    return { status: 'NotDetermined', token: null };
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    AppLogger.info('notification', 'Existing permission status', { status: existingStatus });

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      AppLogger.info('notification', 'Requesting permission...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      AppLogger.info('notification', 'Permission request result', { status });
    }

    const permissionStatus: PushPermissionStatus =
      finalStatus === 'granted' ? 'Granted' :
      finalStatus === 'denied' ? 'Denied' : 'NotDetermined';

    let token: string | null = null;
    try {
      const tokenData = await Notifications.getDevicePushTokenAsync();
      const tokenValue = tokenData.data;
      token = tokenValue;

      AppLogger.info('notification', 'Got device token', {
        type: tokenData.type,
        tokenPrefix: tokenValue.substring(0, 20) + '...',
      });
    } catch (tokenError) {
      AppLogger.error('notification', 'Error getting device token', {}, tokenError);
    }

    if (token !== null) {
      // registerDevice() already reads OS permission internally —
      // no need for a separate updatePermission() call.
      await AffinityNotificationService.registerDevice();
    }

    return { status: permissionStatus, token };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('aps-environment')) {
      AppLogger.warn('notification', 'Push notifications require physical device or proper iOS configuration');
      return { status: 'NotDetermined', token: null };
    }

    AppLogger.error('notification', 'Error requesting push permission', {}, error);
    return { status: 'NotDetermined', token: null };
  }
}

/**
 * Get current push notification permission status from the OS.
 */
export async function getPushPermissionStatus(): Promise<PushPermissionStatus> {
  if (Platform.OS === 'web') {
    return 'NotDetermined';
  }

  try {
    const { status } = await Notifications.getPermissionsAsync();

    if (status === 'granted') return 'Granted';
    if (status === 'denied') return 'Denied';
    return 'NotDetermined';
  } catch (error) {
    AppLogger.error('notification', 'Error getting permission status', {}, error);
    return 'NotDetermined';
  }
}

/**
 * Sync push token on app launch if user already has notifications enabled.
 *
 * - Granted: registerDevice() already reads OS permission and sends it,
 *   so a separate updatePermission call is unnecessary.
 * - Denied/undetermined: use updateDevice() to patch permission without
 *   attempting to fetch a push token (which may fail when denied).
 */
export async function syncPushToken(): Promise<void> {
  if (Platform.OS === 'web') {
    AppLogger.info('notification', 'syncPushToken: skipping on web');
    return;
  }

  if (!Device.isDevice) {
    AppLogger.info('notification', 'syncPushToken: skipping on simulator');
    return;
  }

  try {
    const { status } = await Notifications.getPermissionsAsync();
    AppLogger.info('notification', 'syncPushToken: permission status', { status });

    if (status === 'granted') {
      // registerDevice() internally reads OS permission and sends it —
      // no need for a separate updatePermission() call.
      await AffinityNotificationService.registerDevice();

      analyticsService.updatePushStatus(true, 'Granted');
      AppLogger.info('notification', 'syncPushToken: analytics updated');
    } else {
      AppLogger.info('notification', 'syncPushToken: permission not granted, skipping');

      const permission = status === 'denied' ? 'denied' : 'undetermined' as const;
      const permissionStatus = status === 'denied' ? 'Denied' : 'NotDetermined';

      // Patch permission only — don't call registerDevice() which would
      // attempt getDevicePushTokenAsync() and may fail when denied.
      await AffinityNotificationService.updateDevice({
        notification_permission: permission,
        notifications_enabled: false,
      });

      analyticsService.updatePushStatus(false, permissionStatus);
    }
  } catch (error) {
    AppLogger.error('notification', 'syncPushToken error', {}, error);
  }
}

export default {
  requestPushNotificationPermission,
  getPushPermissionStatus,
  syncPushToken,
};
