// CustomerIOService.ts - Customer.io SDK initialization and management
import { CustomerIO, CioLogLevel, CioRegion } from 'customerio-reactnative';

const CDP_API_KEY = process.env.EXPO_PUBLIC_CUSTOMERIO_CDP_API_KEY || '';
const SITE_ID = process.env.EXPO_PUBLIC_CUSTOMERIO_SITE_ID || '';

let isInitialized = false;

/**
 * Initialize Customer.io SDK
 * Should be called early in app lifecycle (e.g., in _layout.tsx)
 */
export const initializeCustomerIO = () => {
  if (isInitialized) {
    console.log('📧 [CustomerIO] Already initialized');
    return;
  }

  if (!CDP_API_KEY) {
    console.warn('⚠️ [CustomerIO] CDP API Key not configured');
    return;
  }

  try {
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
  if (!isInitialized) {
    console.warn('⚠️ [CustomerIO] SDK not initialized, cannot identify user');
    return;
  }

  try {
    CustomerIO.identify(userId, traits);
    console.log('✅ [CustomerIO] User identified:', userId);
  } catch (error) {
    console.error('❌ [CustomerIO] Failed to identify user:', error);
  }
};

/**
 * Clear user identity (on sign out)
 */
export const clearIdentity = () => {
  if (!isInitialized) return;

  try {
    CustomerIO.clearIdentify();
    console.log('✅ [CustomerIO] Identity cleared');
  } catch (error) {
    console.error('❌ [CustomerIO] Failed to clear identity:', error);
  }
};

/**
 * Track a custom event
 */
export const trackEvent = (name: string, properties?: Record<string, unknown>) => {
  if (!isInitialized) return;

  try {
    CustomerIO.track(name, properties);
    console.log('📊 [CustomerIO] Event tracked:', name);
  } catch (error) {
    console.error('❌ [CustomerIO] Failed to track event:', error);
  }
};

/**
 * Register device token for push notifications
 */
export const registerPushToken = (token: string) => {
  if (!isInitialized) return;

  try {
    CustomerIO.registerDeviceToken(token);
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
