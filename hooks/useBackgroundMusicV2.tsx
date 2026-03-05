// useBackgroundMusicV2.tsx - Background music hook using react-native-sound
// Uses Android MediaPlayer instead of ExoPlayer to fix OnePlus audio issues
// Drop-in replacement for useBackgroundMusic with the same interface

import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
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
  const generationRef = useRef(0); // Increments on each new sound to invalidate stale callbacks
  const backgroundMusicEnabledRef = useRef(backgroundMusicEnabled);
  const shouldLoopRef = useRef(shouldLoop);
  const volumeRef = useRef(volume);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Keep refs in sync
  backgroundMusicEnabledRef.current = backgroundMusicEnabled;
  shouldLoopRef.current = shouldLoop;
  volumeRef.current = volume;

  // Play sound with manual looping for Android remote URL reliability
  const playSoundLoop = useCallback((sound: Sound, gen: number) => {
    sound.play((success) => {
      // Stale callback from a previous sound instance — ignore
      if (gen !== generationRef.current) return;

      if (!success) {
        console.error('🎵 Playback finished with error, attempting restart');
      }

      // If still supposed to loop, seek to start and play again
      if (shouldLoopRef.current && backgroundMusicEnabledRef.current) {
        sound.setCurrentTime(0);
        // Small delay to let Android MediaPlayer reset after completion
        setTimeout(() => {
          if (gen !== generationRef.current) return;
          playSoundLoop(sound, gen);
        }, Platform.OS === 'android' ? 50 : 0);
        return;
      }

      setIsPlaying(false);
    });
  }, []);

  // Load audio when source changes
  useEffect(() => {
    if (!audioSource?.uri) {
      setIsLoaded(false);
      setIsPlaying(false);
      setIsLoading(false);
      return;
    }

    // Increment generation to invalidate any callbacks from previous sound
    const gen = ++generationRef.current;
    setIsLoading(true);

    const sound = new Sound(audioSource.uri, undefined, (error) => {
      // Stale load callback
      if (gen !== generationRef.current) return;

      if (error) {
        console.error('🎵 Failed to load sound:', error);
        setIsLoading(false);
        return;
      }

      soundRef.current = sound;
      sound.setVolume(volumeRef.current);
      // Use native looping on iOS (reliable), manual looping on Android
      if (Platform.OS === 'ios') {
        sound.setNumberOfLoops(shouldLoopRef.current ? -1 : 0);
      }
      setIsLoaded(true);
      setIsLoading(false);

      if (backgroundMusicEnabledRef.current) {
        playSoundLoop(sound, gen);
        setIsPlaying(true);
      }
    });

    return () => {
      // Set generation past this effect's gen so stale callbacks are ignored
      generationRef.current = gen + 1;
      sound.stop();
      sound.release();
      soundRef.current = null;
      setIsLoaded(false);
      setIsPlaying(false);
    };
  }, [audioSource?.uri, playSoundLoop]);

  // React to backgroundMusicEnabled preference changes
  useEffect(() => {
    const sound = soundRef.current;
    if (!sound || !isLoaded) return;

    if (backgroundMusicEnabled) {
      sound.setVolume(volumeRef.current);
      if (!isPlaying) {
        playSoundLoop(sound, generationRef.current);
        setIsPlaying(true);
      }
    } else {
      sound.pause();
      setIsPlaying(false);
    }
  }, [backgroundMusicEnabled, isLoaded, isPlaying, playSoundLoop]);

  // React to volume changes
  useEffect(() => {
    if (soundRef.current && isLoaded) {
      soundRef.current.setVolume(backgroundMusicEnabled ? volume : 0);
    }
  }, [volume, backgroundMusicEnabled, isLoaded]);

  const play = useCallback(() => {
    const sound = soundRef.current;
    if (!sound || !isLoaded || !backgroundMusicEnabled || isPlaying) return;
    playSoundLoop(sound, generationRef.current);
    setIsPlaying(true);
  }, [isLoaded, backgroundMusicEnabled, isPlaying, playSoundLoop]);

  const stop = useCallback(() => {
    const sound = soundRef.current;
    if (!sound || !isLoaded) return;
    // Increment generation to stop any pending restart loops
    generationRef.current++;
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
