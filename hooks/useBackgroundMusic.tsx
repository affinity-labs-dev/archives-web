// useBackgroundMusic.tsx - Background music hook using react-native-sound
// Uses Android MediaPlayer instead of ExoPlayer to fix OnePlus audio issues
// Drop-in replacement for useBackgroundMusic with the same interface

import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Sound from 'react-native-sound';
import { usePreferences } from '@/context/PreferencesContext';

interface UseBackgroundMusicOptions {
  volume?: number; // 0.0 to 1.0
  shouldLoop?: boolean;
}

export const useBackgroundMusic = (
  audioSource: { uri: string } | null,
  options: UseBackgroundMusicOptions = {}
) => {
  const { backgroundMusicEnabled } = usePreferences();
  const { volume = 0.5, shouldLoop = true } = options;

  const soundRef = useRef<Sound | null>(null);
  const uriRef = useRef<string | null>(null);
  const generationRef = useRef(0);
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

  // Recreate sound from scratch (used when MediaPlayer enters error state)
  const recreateAndPlay = useCallback((uri: string, gen: number) => {
    console.log('🎵 [BGMusic] Recreating sound from scratch...', { gen });
    const newSound = new Sound(uri, undefined, (error) => {
      if (gen !== generationRef.current) {
        console.log('🎵 [BGMusic] Stale recreate callback, ignoring', { gen, current: generationRef.current });
        newSound.release();
        return;
      }
      if (error) {
        console.error('🎵 [BGMusic] Failed to recreate sound:', error);
        setIsPlaying(false);
        return;
      }
      // Replace old sound ref
      const oldSound = soundRef.current;
      if (oldSound) {
        try { oldSound.stop(); oldSound.release(); } catch (_e) { /* already released */ }
      }
      soundRef.current = newSound;
      newSound.setVolume(volumeRef.current);
      if (Platform.OS === 'ios') {
        newSound.setNumberOfLoops(shouldLoopRef.current ? -1 : 0);
      }
      console.log('🎵 [BGMusic] Sound recreated successfully, starting playback');
      startPlayLoop(newSound, gen);
    });
  }, []);

  // Core play loop - handles manual looping on Android
  const startPlayLoop = useCallback((sound: Sound, gen: number) => {
    console.log('🎵 [BGMusic] startPlayLoop called', { gen, current: generationRef.current });
    sound.play((success) => {
      if (gen !== generationRef.current) {
        console.log('🎵 [BGMusic] Stale play callback, ignoring', { gen, current: generationRef.current });
        return;
      }

      console.log('🎵 [BGMusic] Play callback fired', {
        success,
        shouldLoop: shouldLoopRef.current,
        musicEnabled: backgroundMusicEnabledRef.current,
        gen,
      });

      if (!shouldLoopRef.current || !backgroundMusicEnabledRef.current) {
        console.log('🎵 [BGMusic] Not looping or music disabled, stopping');
        setIsPlaying(false);
        return;
      }

      // Need to loop - try restart
      if (success) {
        // Normal completion, just seek and replay
        console.log('🎵 [BGMusic] Normal loop completion, restarting...');
        sound.setCurrentTime(0);
        startPlayLoop(sound, gen);
      } else {
        // Playback failed (audio focus loss, decoder error, etc.)
        console.log('🎵 [BGMusic] Playback failed, attempting simple restart...');
        sound.setCurrentTime(0);
        sound.play((retrySuccess) => {
          if (gen !== generationRef.current) return;

          if (retrySuccess) {
            console.log('🎵 [BGMusic] Simple restart succeeded');
            startPlayLoop(sound, gen);
          } else {
            // MediaPlayer is broken — recreate from scratch
            const uri = uriRef.current;
            if (uri) {
              console.log('🎵 [BGMusic] Simple restart failed, MediaPlayer broken. Recreating...');
              recreateAndPlay(uri, gen);
            } else {
              console.log('🎵 [BGMusic] No URI available, giving up');
              setIsPlaying(false);
            }
          }
        });
      }
    });
  }, [recreateAndPlay]);

  // Load audio when source changes
  useEffect(() => {
    if (!audioSource?.uri) {
      console.log('🎵 [BGMusic] No audio source, skipping');
      setIsLoaded(false);
      setIsPlaying(false);
      setIsLoading(false);
      return;
    }

    // Set audio category only when actually loading audio (iOS only, no-op on Android)
    Sound.setCategory('Playback');

    const gen = ++generationRef.current;
    uriRef.current = audioSource.uri;
    setIsLoading(true);
    console.log('🎵 [BGMusic] Loading sound...', { uri: audioSource.uri.substring(audioSource.uri.lastIndexOf('/') + 1), gen });

    const sound = new Sound(audioSource.uri, undefined, (error) => {
      if (gen !== generationRef.current) {
        console.log('🎵 [BGMusic] Stale load callback, ignoring', { gen, current: generationRef.current });
        return;
      }

      if (error) {
        console.error('🎵 [BGMusic] Failed to load sound:', error);
        setIsLoading(false);
        return;
      }

      console.log('🎵 [BGMusic] Sound loaded successfully', {
        duration: sound.getDuration(),
        musicEnabled: backgroundMusicEnabledRef.current,
        gen,
      });

      soundRef.current = sound;
      sound.setVolume(volumeRef.current);
      if (Platform.OS === 'ios') {
        sound.setNumberOfLoops(shouldLoopRef.current ? -1 : 0);
      }
      setIsLoaded(true);
      setIsLoading(false);

      if (backgroundMusicEnabledRef.current) {
        console.log('🎵 [BGMusic] Starting initial playback');
        startPlayLoop(sound, gen);
        setIsPlaying(true);
      } else {
        console.log('🎵 [BGMusic] Music disabled, not starting playback');
      }
    });

    return () => {
      console.log('🎵 [BGMusic] Cleanup: stopping and releasing sound', { gen });
      generationRef.current = gen + 1;
      uriRef.current = null;
      sound.stop();
      sound.release();
      soundRef.current = null;
      setIsLoaded(false);
      setIsPlaying(false);
    };
  }, [audioSource?.uri, startPlayLoop]);

  // React to backgroundMusicEnabled preference changes
  useEffect(() => {
    const sound = soundRef.current;
    if (!sound || !isLoaded) return;

    if (backgroundMusicEnabled) {
      console.log('🎵 [BGMusic] Music preference enabled, resuming');
      sound.setVolume(volumeRef.current);
      if (!isPlaying) {
        startPlayLoop(sound, generationRef.current);
        setIsPlaying(true);
      }
    } else {
      console.log('🎵 [BGMusic] Music preference disabled, pausing');
      sound.pause();
      setIsPlaying(false);
    }
  }, [backgroundMusicEnabled, isLoaded, isPlaying, startPlayLoop]);

  // React to volume changes
  useEffect(() => {
    if (soundRef.current && isLoaded) {
      soundRef.current.setVolume(backgroundMusicEnabled ? volume : 0);
    }
  }, [volume, backgroundMusicEnabled, isLoaded]);

  const play = useCallback(() => {
    const sound = soundRef.current;
    if (!sound || !isLoaded || !backgroundMusicEnabled || isPlaying) return;
    console.log('🎵 [BGMusic] Manual play() called');
    startPlayLoop(sound, generationRef.current);
    setIsPlaying(true);
  }, [isLoaded, backgroundMusicEnabled, isPlaying, startPlayLoop]);

  const stop = useCallback(() => {
    const sound = soundRef.current;
    if (!sound || !isLoaded) return;
    console.log('🎵 [BGMusic] Manual stop() called');
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
    loadAudio: () => {},
  };
};
