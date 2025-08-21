// useBackgroundMusic.tsx - Custom hook for background music management
// Handles audio lifecycle, looping, and cleanup for lesson experiences
// Migrated to expo-audio (modern API)

import { useAudioPlayer, AudioSource } from "expo-audio";
import { useEffect, useRef, useState } from "react";

interface UseBackgroundMusicOptions {
  volume?: number; // 0.0 to 1.0
  shouldLoop?: boolean;
  fadeInDuration?: number; // milliseconds
  fadeOutDuration?: number; // milliseconds
}

export const useBackgroundMusic = (
  audioSource: AudioSource, // Audio source for expo-audio
  options: UseBackgroundMusicOptions = {}
) => {
  const {
    volume = 0.3,
    shouldLoop = true,
    fadeInDuration = 2000,
    fadeOutDuration = 1000,
  } = options;

  // Create audio player with expo-audio
  const player = useAudioPlayer(audioSource, {
    loop: shouldLoop,
    volume: 0, // Start at 0 for fade-in effect
  });

  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for player status changes
  useEffect(() => {
    const subscription = player.addListener('statusChange', (status) => {
      console.log("🎵 Player status changed:", status);
      if (status === 'readyToPlay' && !isLoaded) {
        setIsLoaded(true);
        setIsLoading(false);
        console.log("🎵 Background music loaded successfully");
      } else if (status === 'error') {
        setIsLoading(false);
        console.error("🎵 Background music failed to load");
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [player, isLoaded]);

  // Load audio (handled automatically by expo-audio)
  const loadAudio = async () => {
    if (isLoading || isLoaded || !audioSource) return;
    setIsLoading(true);
    console.log("🎵 Loading background music...");
    // expo-audio handles loading automatically
  };

  // Start playing with fade-in
  const play = async () => {
    if (!player || isPlaying) return;

    try {
      console.log("🎵 Starting background music with fade-in");
      player.volume = 0;
      player.play();
      setIsPlaying(true);

      // Fade in
      const fadeSteps = 50;
      const stepDuration = fadeInDuration / fadeSteps;
      const volumeIncrement = volume / fadeSteps;

      for (let i = 0; i <= fadeSteps; i++) {
        await new Promise((resolve) => {
          fadeTimeoutRef.current = setTimeout(resolve, stepDuration);
        });

        if (player && isPlaying) {
          player.volume = i * volumeIncrement;
        }
      }
    } catch (error) {
      console.error("🎵 Failed to start background music:", error);
      setIsPlaying(false);
    }
  };

  // Stop playing with fade-out
  const stop = async () => {
    if (!player || !isPlaying) return;

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
        if (player) {
          player.volume = i * volumeDecrement;
        }

        if (i > 0) {
          await new Promise((resolve) => {
            fadeTimeoutRef.current = setTimeout(resolve, stepDuration);
          });
        }
      }

      if (player) {
        player.pause();
      }
      setIsPlaying(false);
    } catch (error) {
      console.error("🎵 Failed to stop background music:", error);
    }
  };

  // Set volume
  const setVolume = async (newVolume: number) => {
    if (!player) return;

    try {
      player.volume = Math.max(0, Math.min(1, newVolume));
    } catch (error) {
      console.error("🎵 Failed to set volume:", error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }

      try {
        if (player && typeof player.pause === 'function') {
          player.pause();
        }
      } catch (error) {
        // Silently handle audio cleanup errors - expected during component unmount
      }
    };
  }, [player]);

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
