// GameHub.tsx - Main entry point for all puzzle games
// Shows available games, mode selection, and game flow

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ArchivesTheme from '@/constants/ArchivesTheme';
import GameModeSelector from './shared/GameModeSelector';
import GameContainer from './shared/GameContainer';
import JigsawGame from './games/Jigsaw/JigsawGame';
import type { GameMode, GameType, JigsawGameData, GameResult } from '@/types/games';
import { analyticsService } from '@/services/AnalyticsService';
import { useProgress } from '@/context/ProgressContext';
import { gameGeneratorService } from '@/services/GameGeneratorService';

interface GameHubProps {
  visible: boolean;
  onClose: () => void;
  initialGameType?: GameType;
  initialTopic?: string;
}

export default function GameHub({
  visible,
  onClose,
  initialGameType = 'jigsaw',
  initialTopic = 'Islamic History',
}: GameHubProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [gameData, setGameData] = useState<JigsawGameData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { atomicProgressUpdate } = useProgress();

  // Handle mode selection
  const handleModeSelected = async (mode: GameMode) => {
    setSelectedMode(mode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Track analytics
    analyticsService.trackCustomEvent('game_mode_selected', {
      game_type: initialGameType,
      mode,
      topic: initialTopic,
    });

    // Generate game data
    await generateGameData(mode);
  };

  // Generate game data using AI service
  const generateGameData = async (mode: GameMode) => {
    setIsGenerating(true);
    setError(null);

    try {
      console.log('🎮 [GameHub] Generating game with AI...');

      // Call AI game generator service
      const generatedGame = await gameGeneratorService.generateGame({
        type: initialGameType,
        difficulty: 'easy', // Start with easy for MVP
        topic: initialTopic,
      });

      // Type guard to ensure it's jigsaw data
      if (generatedGame.type === 'jigsaw') {
        setGameData(generatedGame as JigsawGameData);
        console.log('✅ [GameHub] Game generated successfully');

        // Track game started
        analyticsService.trackCustomEvent('game_started', {
          game_type: initialGameType,
          mode,
          difficulty: generatedGame.difficulty,
        });
      } else {
        throw new Error('Unexpected game type received');
      }
    } catch (err) {
      console.error('❌ [GameHub] Error generating game:', err);
      setError('Failed to generate game. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle game completion
  const handleGameComplete = async (result: GameResult) => {
    // Award XP via progress system
    // For now, we'll use a generic adventure/module
    // In production, this would be linked to specific content
    const totalXP = result.xpEarned + (result.bonusXP || 0);

    // TODO: Integrate with actual adventure/module system
    // For now, just log the XP earned
    console.log(`🎮 Game completed! Earned ${totalXP} XP`);

    // Track analytics
    analyticsService.trackCustomEvent('game_completed', {
      game_type: initialGameType,
      mode: result.mode,
      difficulty: result.difficulty,
      time_elapsed: result.timeElapsed,
      xp_earned: totalXP,
      perfect_completion: result.perfectCompletion,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Handle exit
  const handleExit = () => {
    setSelectedMode(null);
    setGameData(null);
    setError(null);
    onClose();
  };

  // Render mode selector
  if (!selectedMode && visible) {
    return (
      <Modal visible={visible} animationType="slide" transparent={true}>
        <GameModeSelector onSelectMode={handleModeSelected} onClose={onClose} />
      </Modal>
    );
  }

  // Render loading state
  if (isGenerating) {
    return (
      <Modal visible={visible} animationType="fade">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ArchivesTheme.colors.persianOrange} />
          <Text style={styles.loadingText}>Generating puzzle...</Text>
        </View>
      </Modal>
    );
  }

  // Render error state
  if (error) {
    return (
      <Modal visible={visible} animationType="fade">
        <SafeAreaView style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#E74C3C" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleExit}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    );
  }

  // Render game
  if (gameData && selectedMode) {
    return (
      <Modal visible={visible} animationType="slide">
        <GameContainer
          mode={selectedMode}
          onComplete={handleGameComplete}
          onExit={handleExit}
          difficulty={gameData.difficulty}
        >
          {gameData.type === 'jigsaw' && <JigsawGame gameData={gameData} />}
          {/* Add other game types here as they're built */}
        </GameContainer>
      </Modal>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  loadingText: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    color: ArchivesTheme.colors.shoeBrown,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: ArchivesTheme.colors.creamWhite,
    padding: 20,
  },
  errorText: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    color: ArchivesTheme.colors.shoeBrown,
    textAlign: 'center',
    marginVertical: 24,
  },
  retryButton: {
    backgroundColor: ArchivesTheme.colors.persianOrange,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  retryText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});
