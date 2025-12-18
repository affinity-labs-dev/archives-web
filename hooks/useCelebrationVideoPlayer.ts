// useCelebrationVideoPlayer.ts - Celebration video player with sound effects control
// Wrapper around useVideoPlayer that respects Sound Effects preference
// Used for: Adventure Complete, XP Milestone, Quiz Reward videos

import { useVideoPlayer, VideoSource } from 'expo-video';
import { useEffect } from 'react';
import { usePreferences } from '@/context/PreferencesContext';

type VideoPlayerCallback = (player: ReturnType<typeof useVideoPlayer>) => void;

export function useCelebrationVideoPlayer(
  source: VideoSource,
  callback?: VideoPlayerCallback
) {
  const { soundEffectsEnabled } = usePreferences();
  const player = useVideoPlayer(source, callback);

  // Update volume based on Sound Effects preference
  useEffect(() => {
    if (!player) return;

    try {
      if (soundEffectsEnabled) {
        player.volume = 1.0;
        console.log('🔊 [CelebrationVideo] Sound enabled');
      } else {
        player.volume = 0;
        console.log('🔇 [CelebrationVideo] Sound muted');
      }
    } catch (error) {
      console.error('❌ [CelebrationVideo] Error setting volume:', error);
    }
  }, [player, soundEffectsEnabled]);

  return player;
}
