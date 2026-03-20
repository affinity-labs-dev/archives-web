/**
 * NotificationBadgeService
 *
 * Manages the iOS app icon badge (the red dot on the home screen).
 *
 * Strategy:
 *   - Push payload sets badge count → iOS shows the badge automatically
 *   - This service clears it to 0 when the user opens the app
 *
 * The badge count can be any number:
 *   - 0 = no badge
 *   - 1 = shows "1" (acts like a red dot indicator)
 *   - 2+ = shows exact count
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Clear the app icon badge.
 * Call this on every app launch / foreground event.
 */
export const clearBadge = async (): Promise<void> => {
  if (Platform.OS !== 'ios') return; // Badge is iOS-only
  try {
    await Notifications.setBadgeCountAsync(0);
    console.log('🔴 [Badge] Cleared app icon badge');
  } catch (error) {
    console.error('❌ [Badge] Failed to clear badge:', error);
  }
};

/**
 * Set the badge to a specific count.
 * Normally the push payload does this automatically,
 * but call this if you need to set it manually in-app
 * (e.g. for local notifications).
 *
 * @param count - Badge count to display (default: 1 for "red dot" indicator)
 */
export const showBadge = async (count: number = 1): Promise<void> => {
  if (Platform.OS !== 'ios') return;
  try {
    await Notifications.setBadgeCountAsync(count);
    console.log(`🔴 [Badge] Set app icon badge to ${count}`);
  } catch (error) {
    console.error('❌ [Badge] Failed to set badge:', error);
  }
};

/**
 * Get current badge count.
 * Returns 0 if no badge, 1+ if badge is showing.
 */
export const getBadgeCount = async (): Promise<number> => {
  if (Platform.OS !== 'ios') return 0;
  try {
    return await Notifications.getBadgeCountAsync();
  } catch (error) {
    console.error('❌ [Badge] Failed to get badge count:', error);
    return 0;
  }
};

export default {
  clearBadge,
  showBadge,
  getBadgeCount,
};
