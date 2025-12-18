// useBackgroundMusic.tsx - Custom hook for background music management
// Handles audio lifecycle, looping, and cleanup for lesson experiences
// Using expo-av due to AWS CloudFront compatibility issues with expo-audio

import { Audio, AVPlaybackSource, AVPlaybackStatus } from "expo-av";
import { useEffect, useRef, useState } from "react";
import { usePreferences } from '@/context/PreferencesContext';

interface UseBackgroundMusicOptions {
  volume?: number; // 0.0 to 1.0
  shouldLoop?: boolean;
}

export const useBackgroundMusic = (
  audioSource: AVPlaybackSource | null, // Audio source for expo-av
  options: UseBackgroundMusicOptions = {}
) => {
  const { backgroundMusicEnabled } = usePreferences();
  const {
    volume = 0.5,
    shouldLoop = true,
  } = options;

  const soundRef = useRef<Audio.Sound | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isInitializedRef = useRef(false);

  // Load audio
  const loadAudio = async () => {
    if (isLoading || isLoaded || !audioSource) return;
    setIsLoading(true);
    console.log("🎵 Loading background music from AVPlaybackSource:", audioSource);

    try {
      // Configure audio mode for proper Android playback
      console.log("🎵 Configuring audio mode for Android...");
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      console.log("🎵 Audio mode configured successfully");

      const { sound } = await Audio.Sound.createAsync(audioSource, {
        shouldPlay: backgroundMusicEnabled, // Auto-play only if background music is enabled
        isLooping: shouldLoop,
        volume: backgroundMusicEnabled ? volume : 0, // Set volume to 0 if disabled
      });

      soundRef.current = sound;
      setIsLoaded(true);
      setIsPlaying(backgroundMusicEnabled); // Set playing state based on preference
      setIsLoading(false);
      console.log(`🎵 Background music loaded ${backgroundMusicEnabled ? 'and playing' : 'but muted'} at ${volume * 100}% volume`);
    } catch (error) {
      console.error("🎵 Failed to load background music:", error);
      setIsLoading(false);
    }
  };

  // Simple play function - just start playing immediately
  const play = async () => {
    if (!soundRef.current || !backgroundMusicEnabled) return; // Check user preference

    try {
      console.log("🎵 Starting background music immediately");
      await soundRef.current.playAsync();
      setIsPlaying(true);
      console.log("🎵 Background music started successfully");
    } catch (error) {
      console.error("🎵 Failed to start background music:", error);
      setIsPlaying(false);
    }
  };

  // Simple stop function - just pause immediately
  const stop = async () => {
    if (!soundRef.current) return;

    try {
      console.log("🎵 Stopping background music");
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
      console.log("🎵 Background music stopped");
    } catch (error) {
      console.error("🎵 Failed to stop background music:", error);
    }
  };

  // Set volume
  const setVolume = async (newVolume: number) => {
    if (!soundRef.current) return;

    try {
      await soundRef.current.setVolumeAsync(Math.max(0, Math.min(1, newVolume)));
    } catch (error) {
      console.error("🎵 Failed to set volume:", error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        console.log("🎵 Unloading background music on cleanup");
        soundRef.current.unloadAsync().catch((error) => {
          // Silently handle cleanup errors
        });
        soundRef.current = null;
      }
    };
  }, []);

  // Auto-load audio when hook is used (prevent multiple initializations)
  useEffect(() => {
    if (audioSource && !isInitializedRef.current) {
      console.log("🎵 AVPlaybackSource provided (first time):", audioSource);
      isInitializedRef.current = true;
      loadAudio();
    } else if (!audioSource) {
      console.log("🎵 No valid audio source provided - background music disabled", audioSource);
    } else if (isInitializedRef.current) {
      console.log("🎵 Audio already initialized, skipping duplicate load");
    }
  }, [audioSource]);

  // React to backgroundMusicEnabled changes
  useEffect(() => {
    if (!soundRef.current) return;

    const updatePlayback = async () => {
      try {
        if (backgroundMusicEnabled) {
          console.log("🎵 Background music enabled - starting playback");
          await soundRef.current?.setVolumeAsync(volume);
          if (!isPlaying) {
            await soundRef.current?.playAsync();
            setIsPlaying(true);
          }
        } else {
          console.log("🎵 Background music disabled - muting playback");
          await soundRef.current?.setVolumeAsync(0);
          await soundRef.current?.pauseAsync();
          setIsPlaying(false);
        }
      } catch (error) {
        console.error("🎵 Error updating playback based on preference:", error);
      }
    };

    updatePlayback();
  }, [backgroundMusicEnabled]);

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