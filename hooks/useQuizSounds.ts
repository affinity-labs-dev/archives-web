// useQuizSounds.ts - Hook for quiz sound effects
// Provides tap, correct, and incorrect sounds for quiz interactions
// Migrated from expo-av to expo-audio

import { useAudioPlayer } from 'expo-audio';
import { useCallback } from 'react';
import { usePreferences } from '@/context/PreferencesContext';

interface UseQuizSoundsReturn {
  playTap: () => void;
  playCorrect: () => void;
  playIncorrect: () => void;
  isLoaded: boolean;
}

export function useQuizSounds(): UseQuizSoundsReturn {
  const { soundEffectsEnabled } = usePreferences();

  // Create audio players - hooks manage lifecycle automatically
  const tapPlayer = useAudioPlayer(require('@/assets/audio/quiz/tap.wav'));
  const correctPlayer = useAudioPlayer(require('@/assets/audio/quiz/correct.wav'));
  const incorrectPlayer = useAudioPlayer(require('@/assets/audio/quiz/incorrect.wav'));

  // Set volumes (expo-audio uses property assignment)
  if (tapPlayer.isLoaded) tapPlayer.volume = 0.1;
  if (correctPlayer.isLoaded) correctPlayer.volume = 0.8;
  if (incorrectPlayer.isLoaded) incorrectPlayer.volume = 0.8;

  // Play tap sound (for option selection)
  const playTap = useCallback(() => {
    if (!soundEffectsEnabled) return;
    try {
      tapPlayer.seekTo(0); // expo-audio doesn't auto-reset position
      tapPlayer.play();
    } catch (error) {
      console.error('❌ Error playing tap sound:', error);
    }
  }, [soundEffectsEnabled, tapPlayer]);

  // Play correct sound (for correct answers)
  const playCorrect = useCallback(() => {
    if (!soundEffectsEnabled) return;
    try {
      correctPlayer.seekTo(0);
      correctPlayer.play();
    } catch (error) {
      console.error('❌ Error playing correct sound:', error);
    }
  }, [soundEffectsEnabled, correctPlayer]);

  // Play incorrect sound (for incorrect answers)
  const playIncorrect = useCallback(() => {
    if (!soundEffectsEnabled) return;
    try {
      incorrectPlayer.seekTo(0);
      incorrectPlayer.play();
    } catch (error) {
      console.error('❌ Error playing incorrect sound:', error);
    }
  }, [soundEffectsEnabled, incorrectPlayer]);

  return {
    playTap,
    playCorrect,
    playIncorrect,
    isLoaded: tapPlayer.isLoaded && correctPlayer.isLoaded && incorrectPlayer.isLoaded,
  };
}
