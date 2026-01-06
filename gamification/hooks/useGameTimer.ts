// useGameTimer.ts - Universal timer hook for all games
// Supports both practice (no timer) and challenge (timed) modes

import { useState, useEffect, useRef } from 'react';
import type { GameMode } from '@/gamification/types/games';

interface UseGameTimerOptions {
  mode: GameMode;
  onTimeUpdate?: (elapsedSeconds: number) => void;
  countdownSeconds?: number; // For countdown timer (optional)
}

export function useGameTimer(options: UseGameTimerOptions) {
  const { mode, onTimeUpdate, countdownSeconds } = options;

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);

  // Start timer
  const start = () => {
    if (mode === 'practice') return; // No timer in practice mode

    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }
    setIsRunning(true);
    setIsPaused(false);
  };

  // Pause timer
  const pause = () => {
    if (mode === 'practice') return;

    setIsPaused(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Resume timer
  const resume = () => {
    if (mode === 'practice') return;

    setIsPaused(false);
  };

  // Stop timer
  const stop = () => {
    setIsRunning(false);
    setIsPaused(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Reset timer
  const reset = () => {
    stop();
    setElapsedSeconds(0);
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
  };

  // Timer tick effect
  useEffect(() => {
    if (mode === 'practice' || !isRunning || isPaused) {
      return;
    }

    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const now = Date.now();
        const elapsed = Math.floor((now - startTimeRef.current - pausedTimeRef.current) / 1000);
        setElapsedSeconds(elapsed);

        if (onTimeUpdate) {
          onTimeUpdate(elapsed);
        }

        // Handle countdown mode
        if (countdownSeconds && elapsed >= countdownSeconds) {
          stop();
        }
      }
    }, 100); // Update every 100ms for smooth display

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused, mode, countdownSeconds, onTimeUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Format time as MM:SS
  const formattedTime = (() => {
    const displaySeconds = countdownSeconds
      ? Math.max(0, countdownSeconds - elapsedSeconds)
      : elapsedSeconds;

    const minutes = Math.floor(displaySeconds / 60);
    const seconds = displaySeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  })();

  // Get time bonus XP based on completion time (challenge mode only)
  const getTimeBonus = (): number => {
    if (mode === 'practice') return 0;

    if (elapsedSeconds <= 30) return 50; // Legendary
    if (elapsedSeconds <= 45) return 30; // Excellent
    if (elapsedSeconds <= 60) return 20; // Good
    return 0; // No bonus
  };

  return {
    elapsedSeconds,
    formattedTime,
    isRunning,
    isPaused,
    start,
    pause,
    resume,
    stop,
    reset,
    getTimeBonus,
  };
}
