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
    module.CustomerIO.identify(userId, traits);
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

export default {
  initialize: initializeCustomerIO,
  identify: identifyUser,
  clearIdentify: clearIdentity,
  track: trackEvent,
  registerPushToken,
};
