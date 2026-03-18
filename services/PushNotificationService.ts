// PushNotificationService.ts - iOS/Android push notification registration
// Requests OS permission and registers the Expo push token with AffinityNotificationService.

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AffinityNotificationService from './AffinityNotificationService';
import { analyticsService } from './AnalyticsService';

type PermissionStatus = 'Granted' | 'Denied' | 'NotDetermined';

interface PushRegistrationResult {
  status: PermissionStatus;
  token: string | null;
}

/**
 * Request push notification permission and register the Expo push token with
 * AffinityNotificationService.
 *
 * 1. Use expo-notifications to request OS permission
 * 2. Register Expo push token + sync permission with AffinityNotificationService
 */
export async function requestPushNotificationPermission(): Promise<PushRegistrationResult> {
  if (Platform.OS === 'web') {
    console.log('🔔 [PushService] Web platform, skipping');
    return { status: 'NotDetermined', token: null };
  }

  if (!Device.isDevice) {
    console.log('🔔 [PushService] Not a physical device, skipping push registration');
    return { status: 'NotDetermined', token: null };
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('🔔 [PushService] Existing permission status:', existingStatus);

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      console.log('🔔 [PushService] Requesting permission...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('🔔 [PushService] Permission request result:', status);
    }

    const permissionStatus: PermissionStatus =
      finalStatus === 'granted' ? 'Granted' :
      finalStatus === 'denied' ? 'Denied' : 'NotDetermined';

    if (finalStatus === 'granted') {
      try {
        const tokenData = await Notifications.getDevicePushTokenAsync();
        const token = tokenData.data;

        console.log('🔔 [PushService] Got device token type:', tokenData.type);
        console.log('🔔 [PushService] Token (first 20 chars):', token.substring(0, 20) + '...');

        AffinityNotificationService.registerDevice();
        AffinityNotificationService.updatePermission('granted');

        return { status: 'Granted', token };
      } catch (tokenError) {
        console.error('❌ [PushService] Error getting device token:', tokenError);
        return { status: 'Granted', token: null };
      }
    }

    return { status: permissionStatus, token: null };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('aps-environment')) {
      console.log('⚠️ [PushService] Push notifications require physical device or proper iOS configuration');
      return { status: 'NotDetermined', token: null };
    }

    console.error('❌ [PushService] Error requesting push permission:', error);
    return { status: 'NotDetermined', token: null };
  }
}

/**
 * Get current push notification permission status from the OS.
 */
export async function getPushPermissionStatus(): Promise<PermissionStatus> {
  if (Platform.OS === 'web') {
    return 'NotDetermined';
  }

  try {
    const { status } = await Notifications.getPermissionsAsync();

    if (status === 'granted') return 'Granted';
    if (status === 'denied') return 'Denied';
    return 'NotDetermined';
  } catch (error) {
    console.error('❌ [PushService] Error getting permission status:', error);
    return 'NotDetermined';
  }
}

/**
 * Sync push token on app launch if user already has notifications enabled.
 * Registers with AffinityNotificationService.
 */
export async function syncPushToken(): Promise<void> {
  if (Platform.OS === 'web') {
    console.log('🔔 [PushService] syncPushToken: Skipping on web');
    return;
  }

  if (!Device.isDevice) {
    console.log('🔔 [PushService] syncPushToken: Skipping on simulator');
    return;
  }

  try {
    const { status } = await Notifications.getPermissionsAsync();
    console.log('🔔 [PushService] syncPushToken: Permission status =', status);

    if (status === 'granted') {
      console.log('🔔 [PushService] syncPushToken: Getting device token...');
      const tokenData = await Notifications.getDevicePushTokenAsync();
      console.log('🔔 [PushService] syncPushToken: Token type =', tokenData.type);
      console.log('🔔 [PushService] syncPushToken: Token (first 30 chars) =', tokenData.data.substring(0, 30) + '...');

      AffinityNotificationService.registerDevice();
      AffinityNotificationService.updatePermission('granted');

      analyticsService.updatePushStatus(true, 'Granted');
      console.log('✅ [PushService] syncPushToken: Analytics updated');
    } else {
      console.log('🔔 [PushService] syncPushToken: Permission not granted, skipping');

      const permissionStatus = status === 'denied' ? 'Denied' : 'NotDetermined';
      AffinityNotificationService.updatePermission(status === 'denied' ? 'denied' : 'undetermined');
      analyticsService.updatePushStatus(false, permissionStatus);
    }
  } catch (error) {
    console.error('❌ [PushService] syncPushToken: Error:', error);
  }
}

export default {
  requestPushNotificationPermission,
  getPushPermissionStatus,
  syncPushToken,
};
