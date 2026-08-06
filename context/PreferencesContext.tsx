// PreferencesContext.tsx - User preferences management
// Manages background music, sound effects, and haptics preferences with AsyncStorage persistence

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateHapticsEnabled } from '@/services/GlobalHapticsWrapper';

// Storage keys
const LEGACY_SOUND_KEY = 'user_sound_enabled';
const BACKGROUND_MUSIC_KEY = 'user_background_music_enabled';
const SOUND_EFFECTS_KEY = 'user_sound_effects_enabled';
const HAPTICS_KEY = 'user_haptics_enabled';

interface PreferencesContextType {
  backgroundMusicEnabled: boolean;
  soundEffectsEnabled: boolean;
  hapticsEnabled: boolean;
  setBackgroundMusicEnabled: (enabled: boolean) => Promise<void>;
  setSoundEffectsEnabled: (enabled: boolean) => Promise<void>;
  setHapticsEnabled: (enabled: boolean) => Promise<void>;
  isLoading: boolean;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [backgroundMusicState, setBackgroundMusicState] = useState(true);
  const [soundEffectsState, setSoundEffectsState] = useState(true);
  const [hapticsState, setHapticsState] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [legacySound, backgroundMusic, soundEffects, haptics] = await Promise.all([
          AsyncStorage.getItem(LEGACY_SOUND_KEY),
          AsyncStorage.getItem(BACKGROUND_MUSIC_KEY),
          AsyncStorage.getItem(SOUND_EFFECTS_KEY),
          AsyncStorage.getItem(HAPTICS_KEY),
        ]);

        // Migration logic: If legacy key exists and new keys don't, migrate
        if (legacySound !== null && backgroundMusic === null && soundEffects === null) {
          console.log('🔄 [Preferences] Migrating legacy sound preference...');
          const legacyValue = legacySound === 'true';
          setBackgroundMusicState(legacyValue);
          setSoundEffectsState(legacyValue);
          await Promise.all([
            AsyncStorage.setItem(BACKGROUND_MUSIC_KEY, String(legacyValue)),
            AsyncStorage.setItem(SOUND_EFFECTS_KEY, String(legacyValue)),
            AsyncStorage.removeItem(LEGACY_SOUND_KEY),
          ]);
          console.log('✅ [Preferences] Migration complete');
        } else {
          // Load individual preferences
          if (backgroundMusic !== null) {
            setBackgroundMusicState(backgroundMusic === 'true');
          }
          if (soundEffects !== null) {
            setSoundEffectsState(soundEffects === 'true');
          }
        }

        // Load haptics preference
        if (haptics !== null) {
          const hapticsValue = haptics === 'true';
          setHapticsState(hapticsValue);
          updateHapticsEnabled(hapticsValue);
        }

        console.log('✅ [Preferences] Loaded:', {
          backgroundMusic: backgroundMusicState,
          soundEffects: soundEffectsState,
          haptics: hapticsState,
        });
      } catch (error) {
        console.error('❌ [Preferences] Error loading preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const setBackgroundMusicEnabled = async (enabled: boolean) => {
    try {
      setBackgroundMusicState(enabled);
      await AsyncStorage.setItem(BACKGROUND_MUSIC_KEY, String(enabled));
      console.log('✅ [Preferences] Background music:', enabled);
    } catch (error) {
      console.error('❌ [Preferences] Error saving background music preference:', error);
    }
  };

  const setSoundEffectsEnabled = async (enabled: boolean) => {
    try {
      setSoundEffectsState(enabled);
      await AsyncStorage.setItem(SOUND_EFFECTS_KEY, String(enabled));
      console.log('✅ [Preferences] Sound effects:', enabled);
    } catch (error) {
      console.error('❌ [Preferences] Error saving sound effects preference:', error);
    }
  };

  const setHapticsEnabled = async (enabled: boolean) => {
    try {
      setHapticsState(enabled);
      updateHapticsEnabled(enabled);
      await AsyncStorage.setItem(HAPTICS_KEY, String(enabled));
      console.log('✅ [Preferences] Haptics:', enabled);
    } catch (error) {
      console.error('❌ [Preferences] Error saving haptics preference:', error);
    }
  };

  return (
    <PreferencesContext.Provider
      value={{
        backgroundMusicEnabled: backgroundMusicState,
        soundEffectsEnabled: soundEffectsState,
        hapticsEnabled: hapticsState,
        setBackgroundMusicEnabled,
        setSoundEffectsEnabled,
        setHapticsEnabled,
        isLoading,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return context;
}
