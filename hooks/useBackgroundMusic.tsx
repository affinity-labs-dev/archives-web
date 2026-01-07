// useBackgroundMusic.tsx - Custom hook for background music management
// Handles audio lifecycle, looping, and cleanup for lesson experiences
// Migrated from expo-av to expo-audio

import { useAudioPlayer, setAudioModeAsync, AudioSource } from 'expo-audio';
import { useEffect, useRef } from 'react';
import { usePreferences } from '@/context/PreferencesContext';

interface UseBackgroundMusicOptions {
  volume?: number; // 0.0 to 1.0
  shouldLoop?: boolean;
}

export const useBackgroundMusic = (
  audioSource: AudioSource | null, // Audio source (require() or URL string)
  options: UseBackgroundMusicOptions = {}
) => {
  const { backgroundMusicEnabled } = usePreferences();
  const { volume = 0.5, shouldLoop = true } = options;
  const isInitializedRef = useRef(false);

  // Create audio player - hook manages lifecycle automatically
  // Pass null if no source to avoid loading
  const player = useAudioPlayer(audioSource);

  // Configure audio mode on first mount
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const configureAudio = async () => {
      try {
        console.log('🎵 Configuring audio mode...');
        await setAudioModeAsync({
          playsInSilentMode: true,
          // Note: shouldDuckAndroid was removed in newer expo-av versions
          // Audio ducking is now handled automatically by the platform
        });
        console.log('🎵 Audio mode configured successfully');
      } catch (error) {
        console.error('🎵 Failed to configure audio mode:', error);
      }
    };

    configureAudio();
  }, []);

  // Configure loop setting
  useEffect(() => {
    if (player.isLoaded) {
      player.loop = shouldLoop;
    }
  }, [player, player.isLoaded, shouldLoop]);

  // Handle volume and playback based on user preference
  useEffect(() => {
    if (!player.isLoaded) return;

    if (backgroundMusicEnabled) {
      player.volume = volume;
      if (!player.playing) {
        console.log('🎵 Starting background music');
        player.play();
      }
    } else {
      console.log('🎵 Background music disabled - pausing');
      player.volume = 0;
      player.pause();
    }
  }, [player, player.isLoaded, backgroundMusicEnabled, volume]);

  // Log when audio loads
  useEffect(() => {
    if (player.isLoaded) {
      console.log(`🎵 Background music loaded ${backgroundMusicEnabled ? 'and playing' : 'but muted'} at ${volume * 100}% volume`);
    }
  }, [player.isLoaded]);

  // Play function
  const play = () => {
    if (!player.isLoaded || !backgroundMusicEnabled) return;
    console.log('🎵 Starting background music');
    player.play();
  };

  // Stop function
  const stop = () => {
    if (!player.isLoaded) return;
    console.log('🎵 Stopping background music');
    player.pause();
  };

  // Set volume function
  const setVolume = (newVolume: number) => {
    if (!player.isLoaded) return;
    player.volume = Math.max(0, Math.min(1, newVolume));
  };

  return {
    isLoaded: player.isLoaded,
    isPlaying: player.playing,
    isLoading: player.isBuffering,
    play,
    stop,
    setVolume,
    loadAudio: () => {}, // No-op for backwards compatibility (loading is automatic)
  };
};
