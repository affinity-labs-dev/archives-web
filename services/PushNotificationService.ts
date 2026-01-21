// PushNotificationService.ts - Proper iOS/Android push notification registration
// This uses expo-notifications to register with iOS/Android and passes the token to Customer.io

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import CustomerIOService from './CustomerIOService';
import { analyticsService } from './AnalyticsService';

type PermissionStatus = 'Granted' | 'Denied' | 'NotDetermined';

interface PushRegistrationResult {
  status: PermissionStatus;
  token: string | null;
}

/**
 * Request push notification permission and register device token with Customer.io
 *
 * This is the CORRECT way to handle push notifications when using Customer.io:
 * 1. Use expo-notifications to request permission (this registers with iOS/makes toggle appear in Settings)
 * 2. Get the device token (APNs for iOS, FCM for Android)
 * 3. Register the token with Customer.io via registerDeviceToken()
 *
 * IMPORTANT: This must be used instead of just calling CustomerIOService.showPromptForPushNotifications()
 * when disableNotificationRegistration is true in app.json
 */
export async function requestPushNotificationPermission(): Promise<PushRegistrationResult> {
  // Web doesn't support push notifications
  if (Platform.OS === 'web') {
    console.log('🔔 [PushService] Web platform, skipping');
    return { status: 'NotDetermined', token: null };
  }

  // Simulator doesn't support push notifications
  if (!Device.isDevice) {
    console.log('🔔 [PushService] Not a physical device, skipping push registration');
    return { status: 'NotDetermined', token: null };
  }

  try {
    // Step 1: Check current permission status
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('🔔 [PushService] Existing permission status:', existingStatus);

    let finalStatus = existingStatus;

    // Step 2: Request permission if not already granted
    if (existingStatus !== 'granted') {
      console.log('🔔 [PushService] Requesting permission...');
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
      console.log('🔔 [PushService] Permission request result:', status);
    }

    // Map expo-notifications status to our format
    const permissionStatus: PermissionStatus =
      finalStatus === 'granted' ? 'Granted' :
      finalStatus === 'denied' ? 'Denied' : 'NotDetermined';

    // Step 3: If permission granted, get the device token
    if (finalStatus === 'granted') {
      try {
        // Get the native device push token (APNs for iOS, FCM for Android)
        const tokenData = await Notifications.getDevicePushTokenAsync();
        const token = tokenData.data;

        console.log('🔔 [PushService] Got device token type:', tokenData.type);
        console.log('🔔 [PushService] Token (first 20 chars):', token.substring(0, 20) + '...');

        // Step 4: Register token with Customer.io
        CustomerIOService.registerPushToken(token);
        console.log('✅ [PushService] Token registered with Customer.io');

        return { status: 'Granted', token };
      } catch (tokenError) {
        console.error('❌ [PushService] Error getting device token:', tokenError);
        // Permission was granted but couldn't get token - still return granted status
        return { status: 'Granted', token: null };
      }
    }

    return { status: permissionStatus, token: null };
  } catch (error: unknown) {
    // Handle specific APS entitlement error (iOS simulator or missing config)
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
 * Get current push notification permission status
 * This checks the actual iOS/Android permission status, not Customer.io's cached status
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
 * Register existing push token with Customer.io
 * Call this on app launch if user already has notifications enabled
 * This ensures Customer.io always has the latest token
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

      CustomerIOService.registerPushToken(tokenData.data);
      console.log('✅ [PushService] syncPushToken: Token registered with Customer.io');

      // CRITICAL: Also update analytics when syncing token
      // This ensures PostHog and Customer.io stay in sync
      // Also save token as profile attribute for easy segmentation
      CustomerIOService.setProfileAttributes({
        push_notifications_enabled: true,
        push_permission_status: 'Granted',
        push_permission_updated_at: Math.floor(Date.now() / 1000),
        cio_push_token: tokenData.data,
      });
      analyticsService.updatePushStatus(true, 'Granted');
      console.log('✅ [PushService] syncPushToken: Analytics updated');
    } else {
      console.log('🔔 [PushService] syncPushToken: Permission not granted, skipping');

      // Also track denied/undetermined status
      const permissionStatus = status === 'denied' ? 'Denied' : 'NotDetermined';
      CustomerIOService.setProfileAttributes({
        push_notifications_enabled: false,
        push_permission_status: permissionStatus,
        push_permission_updated_at: Math.floor(Date.now() / 1000),
        cio_push_token: null,  // Clear token when not granted
      });
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
