import { useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string>('');
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

      // Check current permission status
      const { status: existingStatus, canAskAgain } = await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;

      // Only ask if we haven't asked before (canAskAgain will be false if already asked)
      if (existingStatus === 'undetermined') {
        console.log('📱 First app launch - requesting notification permission');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      setPermissionStatus(finalStatus);
      console.log('✅ Notification permission status:', finalStatus);

      // Get push token if permission granted
      if (finalStatus === 'granted' && Device.isDevice) {
        const token = await getPushToken();
        if (token) {
          setExpoPushToken(token);
          console.log('📱 Expo Push Token:', token);
          console.log('💡 Send this token to your backend to test notifications');
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
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      return token.data;
    } catch (error) {
      console.error('❌ Error getting push token:', error);
      return '';
    }
  };

  return {
    expoPushToken,
    permissionStatus,
  };
}
