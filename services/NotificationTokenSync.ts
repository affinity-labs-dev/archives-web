// Notification Token Sync Service
// Maps Expo push tokens from AsyncStorage to user_id in Supabase
// Called after user signs up or logs in

import { supabase } from "@/hooks/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

class NotificationTokenSyncService {
  /**
   * Save anonymous push token (before user creates account)
   * Allows sending notifications even without user_id
   */
  async saveAnonymousToken(pushToken: string, timezone: string = 'UTC'): Promise<boolean> {
    try {
      console.log('🔔 [NotificationSync] Saving anonymous token:', pushToken.substring(0, 30) + '...');
      console.log('🌍 [NotificationSync] Timezone:', timezone);

      // Validate token format
      if (!pushToken.startsWith('ExponentPushToken[') && !pushToken.startsWith('ExpoPushToken[')) {
        console.error('❌ [NotificationSync] Invalid token format');
        return false;
      }

      // Insert with user_id = NULL (anonymous device)
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          push_token: pushToken,
          user_id: null, // Anonymous device
          notifications_enabled: true,
          notification_time: '22:00:00', // 10PM default
          timezone: timezone, // Device timezone
          notification_frequency: 'daily',
        }, {
          onConflict: 'push_token' // Update if token already exists
        });

      if (error) {
        console.error('❌ [NotificationSync] Supabase error:', error.message);
        return false;
      }

      console.log('✅ [NotificationSync] Anonymous token saved to Supabase');
      return true;
    } catch (error) {
      console.error('❌ [NotificationSync] Error saving anonymous token:', error);
      return false;
    }
  }

  /**
   * Map current device's push token to user_id after login/register
   * The notification preference already exists (created in modal)
   * We just update user_id field
   */
  async syncPushTokenToSupabase(userId: string): Promise<boolean> {
    try {
      console.log('🔔 [NotificationSync] Mapping token to user:', userId);

      // Get current device's push token
      const Notifications = await import('expo-notifications');
      const Constants = await import('expo-constants');
      const Device = await import('expo-device');

      // Check if running on physical device
      if (!Device.isDevice) {
        console.log('⚠️ [NotificationSync] Simulator detected - skipping token sync');
        return false;
      }

      // Skip push token on Android until Firebase is configured
      if (Platform.OS === 'android') {
        console.log('⚠️ [NotificationSync] Push notifications disabled on Android (Firebase not configured)');
        return false;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      const pushToken = tokenData.data;

      console.log('🔔 [NotificationSync] Device token:', pushToken.substring(0, 30) + '...');

      // Update the existing record with user_id
      const { error } = await supabase
        .from('notification_preferences')
        .update({ user_id: userId })
        .eq('push_token', pushToken);

      if (error) {
        console.error('❌ [NotificationSync] Error mapping token:', error.message);
        return false;
      }

      console.log('✅ [NotificationSync] Token mapped to user_id successfully');
      return true;
    } catch (error: any) {
      // Handle specific APS entitlement error (iOS simulator or missing config)
      if (error?.message?.includes('aps-environment')) {
        console.log('⚠️ [NotificationSync] Push notifications require physical device or proper iOS configuration');
        return false;
      }

      // Safely log error message
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ [NotificationSync] Error syncing token:', errorMsg);
      return false;
    }
  }

  /**
   * Update push token if user changes devices or reinstalls app
   */
  async updatePushToken(userId: string, newToken: string): Promise<boolean> {
    try {
      console.log('🔔 [NotificationSync] Updating token for user:', userId);

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          push_token: newToken,
          notifications_enabled: true,
        }, {
          onConflict: 'push_token' // Conflict on push_token (device-specific)
        });

      if (error) {
        console.error('❌ [NotificationSync] Error updating token:', error.message);
        return false;
      }

      console.log('✅ [NotificationSync] Token updated successfully');
      return true;
    } catch (error) {
      console.error('❌ [NotificationSync] Error updating token:', error);
      return false;
    }
  }

  /**
   * Disable notifications for a user (called when user toggles off in settings)
   */
  async disableNotifications(userId: string): Promise<boolean> {
    try {
      console.log('🔕 [NotificationSync] Disabling notifications for user:', userId);

      const { error } = await supabase
        .from('notification_preferences')
        .update({
          notifications_enabled: false
        })
        .eq('user_id', userId);

      if (error) {
        console.error('❌ [NotificationSync] Error disabling:', error.message);
        return false;
      }

      console.log('✅ [NotificationSync] Notifications disabled');
      return true;
    } catch (error) {
      console.error('❌ [NotificationSync] Error disabling:', error);
      return false;
    }
  }

  /**
   * Enable notifications for a user (called when user toggles on in settings)
   */
  async enableNotifications(userId: string, pushToken: string): Promise<boolean> {
    try {
      console.log('🔔 [NotificationSync] Enabling notifications for user:', userId);

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          push_token: pushToken,
          notifications_enabled: true,
        }, {
          onConflict: 'push_token' // Conflict on push_token (device-specific)
        });

      if (error) {
        console.error('❌ [NotificationSync] Error enabling:', error.message);
        return false;
      }

      console.log('✅ [NotificationSync] Notifications enabled');
      return true;
    } catch (error) {
      console.error('❌ [NotificationSync] Error enabling:', error);
      return false;
    }
  }

  /**
   * Get notification preferences for a user
   */
  async getNotificationPreferences(userId: string) {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // User might not have preferences yet (hasn't granted permission)
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('❌ [NotificationSync] Error fetching preferences:', error.message);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ [NotificationSync] Error fetching preferences:', error);
      return null;
    }
  }
}

// Export singleton instance
export const notificationTokenSync = new NotificationTokenSyncService();
