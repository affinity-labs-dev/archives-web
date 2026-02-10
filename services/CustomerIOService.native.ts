// CustomerIOService.native.ts - Customer.io SDK for iOS and Android
// Note: Customer.io requires native modules - only works in dev builds, not Expo Go
// Uses top-level import to avoid duplicate native view registration errors
// that occur with lazy require() when SDK is auto-initialized from app.json

import Constants from 'expo-constants';
import { CustomerIO, CioPushPermissionStatus } from 'customerio-reactnative';

let isInitialized = false;

// Check if running in Expo Go (no native modules available)
const isExpoGo = Constants.appOwnership === 'expo';

/**
 * Get Customer.io SDK instance
 */
const getCustomerIO = () => {
  if (isExpoGo) {
    return null;
  }
  return { CustomerIO };
};

/**
 * Mark Customer.io SDK as ready
 * Auto-init from app.json handles actual initialization at native layer
 * This just sets isInitialized flag so other methods can run
 */
export const initializeCustomerIO = () => {
  if (isExpoGo) {
    return;
  }

  if (isInitialized) {
    return;
  }

  const module = getCustomerIO();
  if (module) {
    isInitialized = true;
    console.log('✅ [CustomerIO] SDK ready (auto-initialized from app.json)');
  }
};

/**
 * Identify a user to Customer.io
 * Call this after user signs in
 */
export const identifyUser = (userId: string, traits?: Record<string, unknown>) => {
  if (isExpoGo) {
    console.log('📧 [CustomerIO] identifyUser: Skipping in Expo Go');
    return;
  }

  if (!isInitialized) {
    console.warn('⚠️ [CustomerIO] identifyUser: SDK not initialized!');
    return;
  }

  const module = getCustomerIO();
  if (!module) {
    console.warn('⚠️ [CustomerIO] identifyUser: Module not available');
    return;
  }

  try {
    console.log('🔍 [CustomerIO] identifyUser: Identifying user:', userId);
    module.CustomerIO.identify({ userId, traits });
    console.log('✅ [CustomerIO] identifyUser: User identified successfully:', userId);
  } catch (error) {
    console.error('❌ [CustomerIO] identifyUser: Failed:', error);
  }
};

/**
 * Clear user identity (on sign out)
 */
export const clearIdentity = () => {
  if (isExpoGo || !isInitialized) return;

  const module = getCustomerIO();
  if (!module) return;

  try {
    module.CustomerIO.clearIdentify();
    console.log('✅ [CustomerIO] Identity cleared');
  } catch (error) {
    console.error('❌ [CustomerIO] Failed to clear identity:', error);
  }
};

/**
 * Track a custom event
 */
export const trackEvent = (name: string, properties?: Record<string, unknown>) => {
  if (isExpoGo || !isInitialized) {
    return;
  }

  const module = getCustomerIO();
  if (!module) {
    return;
  }

  try {
    module.CustomerIO.track(name, properties);
    console.log('📊 [CustomerIO] Event tracked:', name);
  } catch (error) {
    console.error('❌ [CustomerIO] Failed to track event:', error);
  }
};

/**
 * Register device token for push notifications
 */
export const registerPushToken = (token: string) => {
  if (isExpoGo) {
    console.log('🔔 [CustomerIO] registerPushToken: Skipping in Expo Go');
    return;
  }

  if (!isInitialized) {
    console.warn('⚠️ [CustomerIO] registerPushToken: SDK not initialized! Token will be lost.');
    return;
  }

  const module = getCustomerIO();
  if (!module) {
    console.warn('⚠️ [CustomerIO] registerPushToken: Module not available');
    return;
  }

  try {
    console.log('🔔 [CustomerIO] registerPushToken: Registering token (first 30 chars):', token.substring(0, 30) + '...');
    module.CustomerIO.registerDeviceToken(token);
    console.log('✅ [CustomerIO] registerPushToken: Token registered successfully');
  } catch (error) {
    console.error('❌ [CustomerIO] registerPushToken: Failed:', error);
  }
};

/**
 * Update profile attributes without re-identifying
 * Use this when a user updates their preferences or profile info
 */
export const setProfileAttributes = (attributes: Record<string, unknown>) => {
  if (isExpoGo || !isInitialized) return;

  const module = getCustomerIO();
  if (!module) return;

  try {
    module.CustomerIO.setProfileAttributes(attributes);
    console.log('✅ [CustomerIO] Profile attributes updated');
  } catch (error) {
    console.error('❌ [CustomerIO] Failed to set profile attributes:', error);
  }
};

/**
 * Set custom device attributes
 * Use for device-specific preferences (e.g., app preferences, timezone)
 */
export const setDeviceAttributes = (attributes: Record<string, unknown>) => {
  if (isExpoGo || !isInitialized) return;

  const module = getCustomerIO();
  if (!module) return;

  try {
    module.CustomerIO.setDeviceAttributes(attributes);
    console.log('✅ [CustomerIO] Device attributes updated');
  } catch (error) {
    console.error('❌ [CustomerIO] Failed to set device attributes:', error);
  }
};

/**
 * Track screen view
 * Use to trigger in-app messages associated with specific screens
 */
export const trackScreen = (screenName: string) => {
  if (isExpoGo || !isInitialized) {
    if (__DEV__) {
      console.log(`📧 [CustomerIO] Skipping screen "${screenName}" - not available`);
    }
    return;
  }

  const module = getCustomerIO();
  if (!module) return;

  try {
    module.CustomerIO.screen(screenName);
    console.log('📱 [CustomerIO] Screen tracked:', screenName);
  } catch (error) {
    console.error('❌ [CustomerIO] Failed to track screen:', error);
  }
};

/**
 * Show push notification permission prompt (Customer.io recommended method)
 * This handles the native prompt AND automatically registers the device token
 * Returns: 'Granted' | 'Denied' | 'NotDetermined'
 */
export const showPromptForPushNotifications = async (options?: {
  ios?: { sound: boolean; badge: boolean };
}): Promise<'Granted' | 'Denied' | 'NotDetermined' | null> => {
  if (isExpoGo || !isInitialized) {
    if (__DEV__) {
      console.log('📧 [CustomerIO] Skipping push prompt - not available');
    }
    return null;
  }

  const module = getCustomerIO();
  if (!module) return null;

  try {
    // Default options: enable sound and badge on iOS
    const promptOptions = options || { ios: { sound: true, badge: true } };

    const status = await module.CustomerIO.pushMessaging.showPromptForPushNotifications(promptOptions);
    console.log('🔔 [CustomerIO] Push permission status:', status);
    if (status === CioPushPermissionStatus.Granted) return 'Granted';
    if (status === CioPushPermissionStatus.Denied) return 'Denied';
    return 'NotDetermined';
  } catch (error) {
    console.error('❌ [CustomerIO] Failed to show push prompt:', error);
    return null;
  }
};

/**
 * Get current push notification permission status
 * Returns: 'Granted' | 'Denied' | 'NotDetermined'
 */
export const getPushPermissionStatus = async (): Promise<'Granted' | 'Denied' | 'NotDetermined' | null> => {
  if (isExpoGo || !isInitialized) {
    if (__DEV__) {
      console.log('📧 [CustomerIO] Skipping getPushPermissionStatus - not available');
    }
    return null;
  }

  const module = getCustomerIO();
  if (!module) return null;

  try {
    const status = await module.CustomerIO.pushMessaging.getPushPermissionStatus();
    console.log('🔔 [CustomerIO] Current push permission status:', status);
    if (status === CioPushPermissionStatus.Granted) return 'Granted';
    if (status === CioPushPermissionStatus.Denied) return 'Denied';
    return 'NotDetermined';
  } catch (error) {
    console.error('❌ [CustomerIO] Failed to get push permission status:', error);
    return null;
  }
};

/**
 * Get the currently registered device token (APNs/FCM)
 * Returns the token string or null if not available
 */
export const getRegisteredDeviceToken = async (): Promise<string | null> => {
  if (isExpoGo || !isInitialized) {
    if (__DEV__) {
      console.log('📧 [CustomerIO] Skipping getRegisteredDeviceToken - not available');
    }
    return null;
  }

  const module = getCustomerIO();
  if (!module) return null;

  try {
    const token = await module.CustomerIO.pushMessaging.getRegisteredDeviceToken();
    if (token) {
      console.log('🔔 [CustomerIO] Retrieved device token');
      return token;
    }
    return null;
  } catch (error) {
    console.error('❌ [CustomerIO] Failed to get device token:', error);
    return null;
  }
};

export default {
  initialize: initializeCustomerIO,
  identify: identifyUser,
  clearIdentify: clearIdentity,
  track: trackEvent,
  registerPushToken,
  setProfileAttributes,
  setDeviceAttributes,
  screen: trackScreen,
  showPromptForPushNotifications,
  getPushPermissionStatus,
  getRegisteredDeviceToken,
};
