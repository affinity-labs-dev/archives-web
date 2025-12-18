// GlobalHapticsWrapper.ts - Global haptics control via monkey-patching
// Single-import solution that patches expo-haptics functions globally
// Import this file once in _layout.tsx to enable user preference control

import * as Haptics from 'expo-haptics';

// Internal state (managed by PreferencesContext)
let hapticsEnabled = true;
let isInitialized = false;

// Store original functions before patching
const originalImpact = Haptics.impactAsync.bind(Haptics);
const originalNotification = Haptics.notificationAsync.bind(Haptics);
const originalSelection = Haptics.selectionAsync.bind(Haptics);

// Load haptics preference from AsyncStorage
async function loadHapticsPreference() {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const value = await AsyncStorage.getItem('user_haptics_enabled');
    hapticsEnabled = value === null ? true : value === 'true';
    isInitialized = true;
    console.log('✅ [GlobalHaptics] Initialized:', hapticsEnabled);
  } catch (error) {
    console.error('❌ [GlobalHaptics] Failed to load preference:', error);
    hapticsEnabled = true;
    isInitialized = true;
  }
}

// Patch impactAsync
Haptics.impactAsync = async (style: Haptics.ImpactFeedbackStyle) => {
  if (!isInitialized) {
    await loadHapticsPreference();
  }
  if (hapticsEnabled) {
    return originalImpact(style);
  }
  return Promise.resolve();
};

// Patch notificationAsync
Haptics.notificationAsync = async (type: Haptics.NotificationFeedbackType) => {
  if (!isInitialized) {
    await loadHapticsPreference();
  }
  if (hapticsEnabled) {
    return originalNotification(type);
  }
  return Promise.resolve();
};

// Patch selectionAsync
Haptics.selectionAsync = async () => {
  if (!isInitialized) {
    await loadHapticsPreference();
  }
  if (hapticsEnabled) {
    return originalSelection();
  }
  return Promise.resolve();
};

// Export function to update preference (called by PreferencesContext)
export const updateHapticsEnabled = (enabled: boolean) => {
  hapticsEnabled = enabled;
  console.log('🔄 [GlobalHaptics] Updated:', enabled);
};

// Initialize on import
loadHapticsPreference();

console.log('✅ [GlobalHaptics] Monkey-patching applied');
