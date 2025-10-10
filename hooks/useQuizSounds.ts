// useQuizSounds.ts - Hook for quiz sound effects
// Provides tap, correct, and incorrect sounds for quiz interactions

import { Audio } from 'expo-av';
import { useEffect, useRef } from 'react';

interface UseQuizSoundsReturn {
  playTap: () => Promise<void>;
  playCorrect: () => Promise<void>;
  playIncorrect: () => Promise<void>;
  isLoaded: boolean;
}

export function useQuizSounds(): UseQuizSoundsReturn {
  const tapSoundRef = useRef<Audio.Sound | null>(null);
  const correctSoundRef = useRef<Audio.Sound | null>(null);
  const incorrectSoundRef = useRef<Audio.Sound | null>(null);
  const isLoadedRef = useRef(false);

  // Load all quiz sounds on mount
  useEffect(() => {
    let isMounted = true;

    const loadSounds = async () => {
      try {
        console.log('🔊 Loading quiz sounds...');

        // Load tap sound
        const { sound: tapSound } = await Audio.Sound.createAsync(
          require('@/assets/audio/quiz/tap.wav'),
          { shouldPlay: false, volume: 0.1 }
        );
        if (!isMounted) {
          await tapSound.unloadAsync();
          return;
        }
        tapSoundRef.current = tapSound;

        // Load correct sound
        const { sound: correctSound } = await Audio.Sound.createAsync(
          require('@/assets/audio/quiz/correct.wav'),
          { shouldPlay: false, volume: 0.8 }
        );
        if (!isMounted) {
          await correctSound.unloadAsync();
          return;
        }
        correctSoundRef.current = correctSound;

        // Load incorrect sound
        const { sound: incorrectSound } = await Audio.Sound.createAsync(
          require('@/assets/audio/quiz/incorrect.wav'),
          { shouldPlay: false, volume: 0.8 }
        );
        if (!isMounted) {
          await incorrectSound.unloadAsync();
          return;
        }
        incorrectSoundRef.current = incorrectSound;

        isLoadedRef.current = true;
        console.log('✅ Quiz sounds loaded successfully');
      } catch (error) {
        console.error('❌ Failed to load quiz sounds:', error);
      }
    };

    loadSounds();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      console.log('🔊 Cleaning up quiz sounds...');

      if (tapSoundRef.current) {
        tapSoundRef.current.unloadAsync().catch(console.error);
        tapSoundRef.current = null;
      }
      if (correctSoundRef.current) {
        correctSoundRef.current.unloadAsync().catch(console.error);
        correctSoundRef.current = null;
      }
      if (incorrectSoundRef.current) {
        incorrectSoundRef.current.unloadAsync().catch(console.error);
        incorrectSoundRef.current = null;
      }
      isLoadedRef.current = false;
    };
  }, []);

  // Play tap sound (for option selection)
  const playTap = async () => {
    try {
      if (tapSoundRef.current) {
        await tapSoundRef.current.replayAsync();
      }
    } catch (error) {
      console.error('❌ Error playing tap sound:', error);
    }
  };

  // Play correct sound (for correct answers)
  const playCorrect = async () => {
    try {
      if (correctSoundRef.current) {
        await correctSoundRef.current.replayAsync();
      }
    } catch (error) {
      console.error('❌ Error playing correct sound:', error);
    }
  };

  // Play incorrect sound (for incorrect answers)
  const playIncorrect = async () => {
    try {
      if (incorrectSoundRef.current) {
        await incorrectSoundRef.current.replayAsync();
      }
    } catch (error) {
      console.error('❌ Error playing incorrect sound:', error);
    }
  };

  return {
    playTap,
    playCorrect,
    playIncorrect,
    isLoaded: isLoadedRef.current,
  };
}
