// CustomerIOService.ts - Barrel export for TypeScript resolution
// Metro bundler resolves to .native.ts or .web.ts based on platform
// This file provides type definitions for TypeScript

export {
  initializeCustomerIO,
  identifyUser,
  clearIdentity,
  trackEvent,
  registerPushToken,
  setProfileAttributes,
  setDeviceAttributes,
  trackScreen,
  showPromptForPushNotifications,
  getPushPermissionStatus,
  getRegisteredDeviceToken,
} from './CustomerIOService.web';

export { default } from './CustomerIOService.web';
