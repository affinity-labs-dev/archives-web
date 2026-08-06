// useCelebrationVideoPlayer.ts - Celebration video player with sound effects control
// Wrapper around useVideoPlayer that respects Sound Effects preference
// Used for: Adventure Complete, XP Milestone, Quiz Reward videos
//
// iOS FIX: Auto-plays via statusChange event listener instead of initialization callback.
// Calling play() in the useVideoPlayer callback is unreliable on iOS after expo-av Audio
// has modified the AVAudioSession (e.g., StreakCelebrationScreen sounds).

import { useVideoPlayer, VideoSource } from 'expo-video';
import { useEffect, useRef } from 'react';
import { usePreferences } from '@/context/PreferencesContext';

type VideoPlayerCallback = (player: ReturnType<typeof useVideoPlayer>) => void;

export function useCelebrationVideoPlayer(
  source: VideoSource,
  callback?: VideoPlayerCallback
) {
  const { soundEffectsEnabled } = usePreferences();
  const hasStartedRef = useRef(false);
  const player = useVideoPlayer(source, callback);

  // Auto-play when player is ready (deferred from callback for iOS reliability)
  useEffect(() => {
    if (!player) return;
    hasStartedRef.current = false;
    let released = false;

    // Check if already ready (fast local assets may resolve before effect runs)
    if (player.status === 'readyToPlay' && !hasStartedRef.current) {
      hasStartedRef.current = true;
      player.play();
      console.log('▶️ [CelebrationVideo] Auto-play: already ready on mount');
    }

    // Listen for status changes (primary auto-play mechanism)
    const subscription = player.addListener('statusChange', ({ status }: { status: string }) => {
      if (released) return;
      try {
        if (status === 'readyToPlay' && !hasStartedRef.current) {
          hasStartedRef.current = true;
          player.play();
          console.log('▶️ [CelebrationVideo] Auto-play: readyToPlay event fired');
        }
      } catch (err) {
        console.warn('🎬 [CelebrationVideo] statusChange error (player released):', err);
      }
    });

    return () => {
      released = true;
      subscription?.remove();
    };
  }, [player]);

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
