// useBackgroundMusic.tsx - Custom hook for background music management
// Handles audio lifecycle, looping, and cleanup for lesson experiences
// Uses useAudioPlayerStatus for reactive state updates (player.isLoaded is NOT reactive on its own)

import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync, AudioSource } from 'expo-audio';
import { useCallback, useEffect, useRef } from 'react';
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
  const player = useAudioPlayer(audioSource);

  // useAudioPlayerStatus subscribes to native status events via useEvent(),
  // so React re-renders whenever isLoaded/playing/buffering changes.
  const status = useAudioPlayerStatus(player);

  // Configure audio mode on first mount
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const configureAudio = async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
        });
      } catch (error) {
        console.error('🎵 Failed to configure audio mode:', error);
      }
    };

    configureAudio();
  }, []);

  // Configure loop and start playback when loaded
  useEffect(() => {
    if (!status.isLoaded) return;

    player.loop = shouldLoop;

    if (backgroundMusicEnabled) {
      player.volume = volume;
      if (!status.playing) {
        player.play();
      }
    } else {
      player.volume = 0;
      player.pause();
    }
  }, [status.isLoaded, backgroundMusicEnabled, shouldLoop, volume]);

  // Play function
  const play = useCallback(() => {
    if (!status.isLoaded || !backgroundMusicEnabled) return;
    player.play();
  }, [player, status.isLoaded, backgroundMusicEnabled]);

  // Stop function
  const stop = useCallback(() => {
    if (!status.isLoaded) return;
    player.pause();
  }, [player, status.isLoaded]);

  // Set volume function
  const setVolume = useCallback((newVolume: number) => {
    if (!status.isLoaded) return;
    player.volume = Math.max(0, Math.min(1, newVolume));
  }, [player, status.isLoaded]);

  return {
    isLoaded: status.isLoaded,
    isPlaying: status.playing,
    isLoading: status.isBuffering,
    play,
    stop,
    setVolume,
    loadAudio: () => {}, // No-op for backwards compatibility (loading is automatic)
  };
};
