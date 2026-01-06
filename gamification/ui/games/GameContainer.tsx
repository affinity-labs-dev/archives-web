// GameContainer.tsx - Universal wrapper for all game types
// Handles timer and game flow orchestration

import React, { useState, ReactNode } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useGameTimer } from '@/gamification/hooks/useGameTimer';
import type { GameMode, GameResult } from '@/gamification/types/games';
import { GAME_XP_REWARDS } from '@/gamification/types/games';

interface GameContainerProps {
  mode: GameMode;
  children: ReactNode;
  onComplete: (result: GameResult) => void;
  onExit: () => void;
  onNextPuzzle?: () => void;
  onNearCompletion?: () => void;
  difficulty: 'easy' | 'medium' | 'hard';
}

export default function GameContainer({
  mode,
  children,
  onComplete,
  onExit,
  onNextPuzzle,
  onNearCompletion,
  difficulty,
}: GameContainerProps) {
  const [isGameStarted, setIsGameStarted] = useState(false);

  const timer = useGameTimer({
    mode,
    onTimeUpdate: (elapsed) => {
      // Could add countdown logic here if needed
    },
  });

  // Start game (called by child game component)
  const startGame = () => {
    setIsGameStarted(true);
    if (mode === 'challenge') {
      timer.start();
    }
  };

  // Complete game (called by child when puzzle is solved)
  const completeGame = (additionalData?: Partial<GameResult>) => {
    if (mode === 'challenge') {
      timer.stop();
    }

    // Calculate XP
    const baseXP = mode === 'practice'
      ? GAME_XP_REWARDS.practice.base
      : GAME_XP_REWARDS.challenge.base;

    const timeBonus = mode === 'challenge' ? timer.getTimeBonus() : 0;
    const totalXP = baseXP + timeBonus;

    const result: GameResult = {
      completed: true,
      mode,
      difficulty,
      timeElapsed: mode === 'challenge' ? timer.elapsedSeconds : undefined,
      score: 100, // Default perfect score (can be overridden)
      xpEarned: baseXP,
      bonusXP: timeBonus,
      perfectCompletion: true,
      ...additionalData,
    };

    console.log('🎮 [GameContainer] Game completed with result:', result);

    // No modal - game handles its own continue button
    onComplete(result);
  };

  // Next puzzle (generate new puzzle with increased difficulty)
  const handleNextPuzzle = async () => {
    setIsGameStarted(false);
    timer.reset();

    if (onNextPuzzle) {
      await onNextPuzzle();
    }
  };

  // Close
  const handleClose = () => {
    onExit();
  };

  // Expose functions to children via context or props
  // For simplicity, we'll use React.cloneElement to pass functions
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        // @ts-ignore - Dynamic props injection
        onGameStart: startGame,
        onGameComplete: completeGame,
        onNearCompletion: onNearCompletion,
        onClose: handleClose,
        onNextPuzzle: onNextPuzzle,
        isGameStarted,
        mode,
        formattedTime: timer.formattedTime,
      } as any);
    }
    return child;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Game Content - close button and timer now handled by game component */}
        <View style={styles.gameArea}>
          {childrenWithProps}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
  },
  gameArea: {
    flex: 1,
  },
});
