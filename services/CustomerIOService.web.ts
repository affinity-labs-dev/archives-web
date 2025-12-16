// CustomerIOService.web.ts - Web stub (Customer.io is native-only)
// This file is used on web platform to prevent bundling native modules

/**
 * Initialize Customer.io SDK - no-op on web
 */
export const initializeCustomerIO = () => {
  // Customer.io is not available on web
};

/**
 * Identify a user - no-op on web
 */
export const identifyUser = (_userId: string, _traits?: Record<string, unknown>) => {
  // Customer.io is not available on web
};

/**
 * Clear user identity - no-op on web
 */
export const clearIdentity = () => {
  // Customer.io is not available on web
};

/**
 * Track a custom event - no-op on web
 */
export const trackEvent = (_name: string, _properties?: Record<string, unknown>) => {
  // Customer.io is not available on web
};

/**
 * Register device token for push notifications - no-op on web
 */
export const registerPushToken = (_token: string) => {
  // Customer.io is not available on web
};

export default {
  initialize: initializeCustomerIO,
  identify: identifyUser,
  clearIdentify: clearIdentity,
  track: trackEvent,
  registerPushToken,
};
