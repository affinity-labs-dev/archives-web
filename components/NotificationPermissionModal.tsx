// NotificationPermissionModal - Simple modal to request notification permission
// Shows after onboarding question 4
// Stores token temporarily in AsyncStorage until user logs in

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import ArchivesTheme from '@/constants/ArchivesTheme';
import { Ionicons } from '@expo/vector-icons';
import { notificationTokenSync } from '@/services/NotificationTokenSync';

interface NotificationPermissionModalProps {
  visible: boolean;
  onComplete: () => void; // Called after user accepts/skips
}

export default function NotificationPermissionModal({
  visible,
  onComplete,
}: NotificationPermissionModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleEnable = async () => {
    if (isLoading) return;

    setIsLoading(true);
    await Haptics.impactAsync();

    try {
      // Check if physical device
      if (!Device.isDevice) {
        console.warn('⚠️ Push notifications require physical device');
        await AsyncStorage.setItem('notifications_permission_granted', 'false');
        onComplete();
        return;
      }

      // Request permission
      const { status } = await Notifications.requestPermissionsAsync();
      console.log('🔔 Permission status:', status);

      if (status === 'granted') {
        // Get Expo push token
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        const pushToken = tokenData.data;

        console.log('🔔 Expo push token:', pushToken);

        // Get device timezone (IANA identifier like 'America/New_York')
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        console.log('🌍 Device timezone:', timezone);

        // Save to Supabase immediately as anonymous device (user_id = NULL)
        // This allows sending notifications even before user creates account
        const saved = await notificationTokenSync.saveAnonymousToken(pushToken, timezone);

        if (saved) {
          console.log('✅ Token saved to Supabase as anonymous device');
        } else {
          // Fallback: store locally if Supabase fails
          console.log('⚠️ Supabase save failed, storing locally');
          await AsyncStorage.setItem('pending_push_token', pushToken);
          await AsyncStorage.setItem('pending_timezone', timezone);
        }

        await AsyncStorage.setItem('notifications_permission_granted', 'true');
        await AsyncStorage.setItem('notification_permission_asked', 'true'); // Never ask again
      } else {
        await AsyncStorage.setItem('notifications_permission_granted', 'false');
        await AsyncStorage.setItem('notification_permission_asked', 'true'); // Never ask again
      }

      onComplete();
    } catch (error) {
      console.error('❌ Error requesting notifications:', error);
      await AsyncStorage.setItem('notifications_permission_granted', 'false');
      onComplete();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.setItem('notifications_permission_granted', 'false');
    await AsyncStorage.setItem('notification_permission_asked', 'true'); // Mark as asked
    onComplete();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Bell Icon */}
          <View style={styles.iconContainer}>
            <Ionicons
              name="notifications"
              size={48}
              color={ArchivesTheme.colors.persianOrange}
            />
          </View>

          {/* Message */}
          <Text style={styles.message} selectable={false}>
            Can we send you gentle reminders to keep learning? You can turn them off anytime.
          </Text>

          {/* Buttons */}
          <TouchableOpacity
            style={styles.enableButton}
            onPress={handleEnable}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.enableButtonText} selectable={false}>
                Yes, remind me
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText} selectable={false}>
              Not now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  modalContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: 'black',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },

  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(201, 145, 81, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },

  message: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: '500',
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
  },

  enableButton: {
    width: '100%',
    height: 52,
    backgroundColor: ArchivesTheme.colors.mossGreen,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: 'black',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  enableButtonText: {
    fontFamily: 'DM Sans',
    fontSize: 17,
    fontWeight: 'bold',
    color: 'white',
  },

  skipButton: {
    width: '100%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '500',
    color: ArchivesTheme.colors.shoeBrown,
    opacity: 0.6,
  },
});
