// GameContainer.tsx - Universal wrapper for all game types
// Handles timer, results, and game flow orchestration

import React, { useState, ReactNode } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import GameTimer from './GameTimer';
import GameResults from './GameResults';
import { useGameTimer } from '@/hooks/useGameTimer';
import type { GameMode, GameResult } from '@/types/games';
import { GAME_XP_REWARDS } from '@/types/games';
import ArchivesTheme from '@/constants/ArchivesTheme';

interface GameContainerProps {
  mode: GameMode;
  children: ReactNode;
  onComplete: (result: GameResult) => void;
  onExit: () => void;
  difficulty: 'easy' | 'medium' | 'hard';
}

export default function GameContainer({
  mode,
  children,
  onComplete,
  onExit,
  difficulty,
}: GameContainerProps) {
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
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

    setGameResult(result);
    onComplete(result);
  };

  // Play again
  const handlePlayAgain = () => {
    setGameResult(null);
    setIsGameStarted(false);
    timer.reset();
    // Child game component should reset itself via key or internal state
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
        isGameStarted,
      } as any);
    }
    return child;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Close Button */}
        {!gameResult && (
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleClose();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={28} color={ArchivesTheme.colors.persianOrange} />
          </TouchableOpacity>
        )}

        {/* Timer (Challenge mode only) */}
        {mode === 'challenge' && isGameStarted && !gameResult && (
          <GameTimer
            formattedTime={timer.formattedTime}
            isRunning={timer.isRunning}
            isPaused={timer.isPaused}
          />
        )}

        {/* Game Content */}
        <View style={styles.gameArea}>
          {childrenWithProps}
        </View>

        {/* Results Modal */}
        {gameResult && (
          <GameResults
            result={gameResult}
            onPlayAgain={handlePlayAgain}
            onClose={handleClose}
          />
        )}
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
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  gameArea: {
    flex: 1,
  },
});
