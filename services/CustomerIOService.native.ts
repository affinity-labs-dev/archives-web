// CustomerIOService.native.ts - Customer.io SDK for iOS and Android
// Note: Customer.io requires native modules - only works in dev builds, not Expo Go

import Constants from 'expo-constants';

const CDP_API_KEY = process.env.EXPO_PUBLIC_CUSTOMERIO_CDP_API_KEY || '';
const SITE_ID = process.env.EXPO_PUBLIC_CUSTOMERIO_SITE_ID || '';

let CustomerIOModule: any = null;
let isInitialized = false;

// Check if running in Expo Go (no native modules available)
const isExpoGo = Constants.appOwnership === 'expo';

/**
 * Get Customer.io module lazily (only when needed)
 */
const getCustomerIO = () => {
  if (isExpoGo) {
    return null;
  }

  if (!CustomerIOModule) {
    try {
      CustomerIOModule = require('customerio-reactnative');
    } catch (error) {
      console.log('📧 [CustomerIO] Native module not available');
      return null;
    }
  }

  return CustomerIOModule;
};

/**
 * Initialize Customer.io SDK
 * Should be called early in app lifecycle (e.g., in _layout.tsx)
 */
export const initializeCustomerIO = () => {
  if (isExpoGo) {
    console.log('📧 [CustomerIO] Skipping init - running in Expo Go');
    return;
  }

  if (isInitialized) {
    console.log('📧 [CustomerIO] Already initialized');
    return;
  }

  if (!CDP_API_KEY) {
    console.warn('⚠️ [CustomerIO] CDP API Key not configured');
    return;
  }

  const module = getCustomerIO();
  if (!module) return;

  try {
    const { CustomerIO, CioLogLevel, CioRegion } = module;

    const config = {
      cdpApiKey: CDP_API_KEY,
      region: CioRegion.EU,
      logLevel: __DEV__ ? CioLogLevel.Debug : CioLogLevel.Error,
      inApp: {
        siteId: SITE_ID,
      },
    };

    CustomerIO.initialize(config);
    isInitialized = true;
    console.log('✅ [CustomerIO] SDK initialized successfully');
  } catch (error) {
    console.error('❌ [CustomerIO] Initialization failed:', error);
  }
};

/**
 * Identify a user to Customer.io
 * Call this after user signs in
 */
export const identifyUser = (userId: string, traits?: Record<string, unknown>) => {
  if (isExpoGo || !isInitialized) {
    if (__DEV__) {
      console.log('📧 [CustomerIO] Skipping identify - not available');
    }
    return;
  }

  const module = getCustomerIO();
  if (!module) return;

  try {
    // Customer.io SDK expects a single object with userId and traits
    module.CustomerIO.identify({ userId, traits });
    console.log('✅ [CustomerIO] User identified:', userId);
  } catch (error) {
    console.error('❌ [CustomerIO] Failed to identify user:', error);
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
    if (__DEV__) {
      console.log(`📧 [CustomerIO] Skipping track "${name}" - not available`);
    }
    return;
  }

  const module = getCustomerIO();
  if (!module) return;

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
  if (isExpoGo || !isInitialized) return;

  const module = getCustomerIO();
  if (!module) return;

  try {
    module.CustomerIO.registerDeviceToken(token);
    console.log('🔔 [CustomerIO] Push token registered');
  } catch (error) {
    console.error('❌ [CustomerIO] Failed to register push token:', error);
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
  ios?: { sound?: boolean; badge?: boolean };
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

    const status = await module.CustomerIO.showPromptForPushNotifications(promptOptions);
    console.log('🔔 [CustomerIO] Push permission status:', status);
    return status;
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
    const status = await module.CustomerIO.getPushPermissionStatus();
    console.log('🔔 [CustomerIO] Current push permission status:', status);
    return status;
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
