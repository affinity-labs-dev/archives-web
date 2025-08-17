// useBackgroundMusic.tsx - Custom hook for background music management
// Handles audio lifecycle, looping, and cleanup for lesson experiences

import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import { useEffect, useRef, useState } from "react";

interface UseBackgroundMusicOptions {
  volume?: number; // 0.0 to 1.0
  shouldLoop?: boolean;
  fadeInDuration?: number; // milliseconds
  fadeOutDuration?: number; // milliseconds
}

export const useBackgroundMusic = (
  audioSource: any, // require() audio source
  options: UseBackgroundMusicOptions = {}
) => {
  const {
    volume = 0.3,
    shouldLoop = true,
    fadeInDuration = 2000,
    fadeOutDuration = 1000,
  } = options;

  const soundRef = useRef<Audio.Sound | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Configure audio session for background music
  useEffect(() => {
    const configureAudioSession = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false, // Don't play when app is backgrounded
          interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
          playsInSilentModeIOS: false, // Respect silent mode
          shouldDuckAndroid: true, // Lower volume when other apps play audio
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          playThroughEarpieceAndroid: false,
        });
        console.log("🎵 Audio session configured for background music");
      } catch (error) {
        console.error("🎵 Failed to configure audio session:", error);
      }
    };

    configureAudioSession();
  }, []);

  // Load and prepare audio
  const loadAudio = async () => {
    if (isLoading || isLoaded || !audioSource) return;

    setIsLoading(true);
    console.log("🎵 Loading background music...");

    try {
      const { sound } = await Audio.Sound.createAsync(audioSource, {
        shouldPlay: false,
        isLooping: shouldLoop,
        volume: 0, // Start at 0 for fade-in effect
      });

      soundRef.current = sound;
      setIsLoaded(true);
      setIsLoading(false);
      console.log("🎵 Background music loaded successfully");
    } catch (error) {
      console.error("🎵 Failed to load background music:", error);
      setIsLoading(false);
    }
  };

  // Start playing with fade-in
  const play = async () => {
    if (!soundRef.current || isPlaying) return;

    try {
      console.log("🎵 Starting background music with fade-in");
      await soundRef.current.setVolumeAsync(0);
      await soundRef.current.playAsync();
      setIsPlaying(true);

      // Fade in
      const fadeSteps = 50;
      const stepDuration = fadeInDuration / fadeSteps;
      const volumeIncrement = volume / fadeSteps;

      for (let i = 0; i <= fadeSteps; i++) {
        await new Promise((resolve) => {
          fadeTimeoutRef.current = setTimeout(resolve, stepDuration);
        });

        if (soundRef.current && isPlaying) {
          await soundRef.current.setVolumeAsync(i * volumeIncrement);
        }
      }
    } catch (error) {
      console.error("🎵 Failed to start background music:", error);
      setIsPlaying(false);
    }
  };

  // Stop playing with fade-out
  const stop = async () => {
    if (!soundRef.current || !isPlaying) return;

    try {
      console.log("🎵 Stopping background music with fade-out");

      // Clear any existing fade timeout
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }

      // Fade out
      const fadeSteps = 20;
      const stepDuration = fadeOutDuration / fadeSteps;
      const currentVolume = volume;
      const volumeDecrement = currentVolume / fadeSteps;

      for (let i = fadeSteps; i >= 0; i--) {
        if (soundRef.current) {
          await soundRef.current.setVolumeAsync(i * volumeDecrement);
        }

        if (i > 0) {
          await new Promise((resolve) => {
            fadeTimeoutRef.current = setTimeout(resolve, stepDuration);
          });
        }
      }

      if (soundRef.current) {
        await soundRef.current.stopAsync();
      }
      setIsPlaying(false);
    } catch (error) {
      console.error("🎵 Failed to stop background music:", error);
    }
  };

  // Set volume
  const setVolume = async (newVolume: number) => {
    if (!soundRef.current) return;

    try {
      await soundRef.current.setVolumeAsync(
        Math.max(0, Math.min(1, newVolume))
      );
    } catch (error) {
      console.error("🎵 Failed to set volume:", error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("🎵 Cleaning up background music");

      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }

      if (soundRef.current) {
        soundRef.current
          .stopAsync()
          .then(() => {
            soundRef.current?.unloadAsync();
            soundRef.current = null;
          })
          .catch((error) => {
            console.error("🎵 Error during cleanup:", error);
          });
      }
    };
  }, []);

  // Auto-load audio when hook is used
  useEffect(() => {
    if (audioSource) {
      loadAudio();
    } else {
      console.log("🎵 No audio source provided - background music disabled");
    }
  }, [audioSource]);

  return {
    isLoaded,
    isPlaying,
    isLoading,
    play,
    stop,
    setVolume,
    loadAudio,
  };
};
