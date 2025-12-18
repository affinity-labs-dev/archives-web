// CustomerIOService.web.ts - Web stub (Customer.io is native-only)
// This file is used on web platform to prevent bundling native modules

// DEBUG: Log which file is loaded
console.log('🔍 [CustomerIO DEBUG] ========================================');
console.log('🔍 [CustomerIO DEBUG] WEB STUB LOADED (.web.ts) - THIS IS WRONG ON NATIVE!');
console.log('🔍 [CustomerIO DEBUG] ========================================');

/**
 * Initialize Customer.io SDK - no-op on web
 */
export const initializeCustomerIO = () => {
  console.log('🔍 [CustomerIO DEBUG] web stub initializeCustomerIO() called - no-op');
  // Customer.io is not available on web
};

/**
 * Identify a user - no-op on web
 */
export const identifyUser = (_userId: string, _traits?: Record<string, unknown>) => {
  console.log('🔍 [CustomerIO DEBUG] web stub identifyUser() called - no-op');
  // Customer.io is not available on web
};

/**
 * Clear user identity - no-op on web
 */
export const clearIdentity = () => {
  console.log('🔍 [CustomerIO DEBUG] web stub clearIdentity() called - no-op');
  // Customer.io is not available on web
};

/**
 * Track a custom event - no-op on web
 */
export const trackEvent = (_name: string, _properties?: Record<string, unknown>) => {
  console.log('🔍 [CustomerIO DEBUG] web stub trackEvent() called - no-op, event:', _name);
  // Customer.io is not available on web
};

/**
 * Register device token for push notifications - no-op on web
 */
export const registerPushToken = (_token: string) => {
  // Customer.io is not available on web
};

/**
 * Update profile attributes - no-op on web
 */
export const setProfileAttributes = (_attributes: Record<string, unknown>) => {
  // Customer.io is not available on web
};

/**
 * Set custom device attributes - no-op on web
 */
export const setDeviceAttributes = (_attributes: Record<string, unknown>) => {
  // Customer.io is not available on web
};

/**
 * Track screen view - no-op on web
 */
export const trackScreen = (_screenName: string) => {
  // Customer.io is not available on web
};

/**
 * Show push notification permission prompt - no-op on web
 */
export const showPromptForPushNotifications = async (_options?: {
  ios?: { sound?: boolean; badge?: boolean };
}): Promise<'Granted' | 'Denied' | 'NotDetermined' | null> => {
  // Customer.io is not available on web
  return null;
};

/**
 * Get push notification permission status - no-op on web
 */
export const getPushPermissionStatus = async (): Promise<'Granted' | 'Denied' | 'NotDetermined' | null> => {
  // Customer.io is not available on web
  return null;
};

/**
 * Get registered device token - no-op on web
 */
export const getRegisteredDeviceToken = async (): Promise<string | null> => {
  // Customer.io is not available on web
  return null;
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
