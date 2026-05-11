// useOnboardingTapSound.ts - Simple tap sound hook for onboarding screens
// Uses expo-audio to play tap sound on option selection

import { useAudioPlayer } from 'expo-audio';
import { useCallback } from 'react';

interface UseOnboardingTapSoundReturn {
  playTap: () => void;
  isLoaded: boolean;
}

export function useOnboardingTapSound(): UseOnboardingTapSoundReturn {
  // Create audio player - hook manages lifecycle automatically
  const tapPlayer = useAudioPlayer(require('@/assets/audio/quiz/tap.wav'));

  // Set volume
  if (tapPlayer.isLoaded) tapPlayer.volume = 0.1;

  // Play tap sound
  const playTap = useCallback(() => {
    try {
      tapPlayer.seekTo(0); // expo-audio doesn't auto-reset position
      tapPlayer.play();
    } catch (error) {
      console.error('❌ Error playing tap sound:', error);
    }
  }, [tapPlayer]);

  return {
    playTap,
    isLoaded: tapPlayer.isLoaded,
  };
}
