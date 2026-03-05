// useBackgroundMusicV2.tsx - Background music hook using react-native-sound
// Uses Android MediaPlayer instead of ExoPlayer to fix OnePlus audio issues
// Drop-in replacement for useBackgroundMusic with the same interface

import { useCallback, useEffect, useRef, useState } from 'react';
import Sound from 'react-native-sound';
import { usePreferences } from '@/context/PreferencesContext';

// Enable playback in silence mode (iOS)
Sound.setCategory('Playback');

interface UseBackgroundMusicOptions {
  volume?: number; // 0.0 to 1.0
  shouldLoop?: boolean;
}

export const useBackgroundMusicV2 = (
  audioSource: { uri: string } | null,
  options: UseBackgroundMusicOptions = {}
) => {
  const { backgroundMusicEnabled } = usePreferences();
  const { volume = 0.5, shouldLoop = true } = options;

  const soundRef = useRef<Sound | null>(null);
  const isPlayingRef = useRef(false);
  const volumeRef = useRef(volume);
  const shouldLoopRef = useRef(shouldLoop);
  const backgroundMusicEnabledRef = useRef(backgroundMusicEnabled);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Keep refs in sync
  volumeRef.current = volume;
  shouldLoopRef.current = shouldLoop;
  backgroundMusicEnabledRef.current = backgroundMusicEnabled;

  // Helper to start playback
  const startPlayback = useCallback((sound: Sound) => {
    if (isPlayingRef.current) return;
    sound.setNumberOfLoops(shouldLoopRef.current ? -1 : 0);
    sound.play((success) => {
      // With loops=-1, this callback only fires on error or manual stop
      if (!success) {
        console.error('🎵 Playback failed due to audio decoding errors');
      }
      if (!isPlayingRef.current) return;
      isPlayingRef.current = false;
      setIsPlaying(false);
    });
    isPlayingRef.current = true;
    setIsPlaying(true);
  }, []);

  // Load audio when source changes
  useEffect(() => {
    if (!audioSource?.uri) {
      setIsLoaded(false);
      setIsPlaying(false);
      setIsLoading(false);
      isPlayingRef.current = false;
      return;
    }

    setIsLoading(true);

    const sound = new Sound(audioSource.uri, undefined, (error) => {
      if (error) {
        console.error('🎵 Failed to load sound:', error);
        setIsLoading(false);
        return;
      }

      soundRef.current = sound;
      sound.setVolume(volumeRef.current);
      setIsLoaded(true);
      setIsLoading(false);

      if (backgroundMusicEnabledRef.current) {
        startPlayback(sound);
      }
    });

    return () => {
      isPlayingRef.current = false;
      sound.stop();
      sound.release();
      soundRef.current = null;
      setIsLoaded(false);
      setIsPlaying(false);
    };
  }, [audioSource?.uri, startPlayback]);

  // React to backgroundMusicEnabled preference changes
  useEffect(() => {
    const sound = soundRef.current;
    if (!sound || !isLoaded) return;

    if (backgroundMusicEnabled) {
      sound.setVolume(volumeRef.current);
      startPlayback(sound);
    } else {
      isPlayingRef.current = false;
      sound.pause();
      setIsPlaying(false);
    }
  }, [backgroundMusicEnabled, isLoaded, startPlayback]);

  // React to volume changes
  useEffect(() => {
    if (soundRef.current && isLoaded) {
      soundRef.current.setVolume(backgroundMusicEnabled ? volume : 0);
    }
  }, [volume, backgroundMusicEnabled, isLoaded]);

  const play = useCallback(() => {
    const sound = soundRef.current;
    if (!sound || !isLoaded || !backgroundMusicEnabled) return;
    startPlayback(sound);
  }, [isLoaded, backgroundMusicEnabled, startPlayback]);

  const stop = useCallback(() => {
    const sound = soundRef.current;
    if (!sound || !isLoaded) return;
    isPlayingRef.current = false;
    sound.pause();
    setIsPlaying(false);
  }, [isLoaded]);

  const setVolume = useCallback((newVolume: number) => {
    const sound = soundRef.current;
    if (!sound || !isLoaded) return;
    sound.setVolume(Math.max(0, Math.min(1, newVolume)));
  }, [isLoaded]);

  return {
    isLoaded,
    isPlaying,
    isLoading,
    play,
    stop,
    setVolume,
    loadAudio: () => {}, // No-op for backwards compatibility
  };
};
