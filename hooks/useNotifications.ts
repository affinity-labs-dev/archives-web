import { useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export function useNotifications() {
  const [devicePushToken, setDevicePushToken] = useState<string>('');
  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');

  useEffect(() => {
    registerForPushNotifications();
  }, []);

  const registerForPushNotifications = async () => {
    try {
      // Set up Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#C99151',
        });
      }

      // Check current permission status only (don't auto-request)
      // Permission request is handled in onboarding flow
      const { status: existingStatus } = await Notifications.getPermissionsAsync();

      setPermissionStatus(existingStatus);
      console.log('✅ Notification permission status:', existingStatus);

      // Get native device push token if permission already granted
      if (existingStatus === 'granted' && Device.isDevice) {
        const token = await getPushToken();
        if (token) {
          setDevicePushToken(token);
          console.log('📱 Native Device Push Token:', token);
        }
      } else if (!Device.isDevice) {
        console.warn('⚠️ Must use physical device for push notifications');
      }
    } catch (error) {
      console.error('❌ Error setting up notifications:', error);
    }
  };

  const getPushToken = async (): Promise<string> => {
    try {
      // Get native device token (APNs for iOS, FCM for Android)
      // This is required for Customer.io - Expo push tokens won't work
      const token = await Notifications.getDevicePushTokenAsync();
      return token.data;
    } catch (error: any) {
      // Handle specific APS entitlement error (iOS simulator or missing config)
      if (error?.message?.includes('aps-environment')) {
        console.log('⚠️ [Notifications] Push notifications require physical device or proper iOS configuration');
        return '';
      }
      // Safely log error message
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ [Notifications] Error getting push token:', errorMsg);
      return '';
    }
  };

  return {
    devicePushToken,
    permissionStatus,
  };
}
