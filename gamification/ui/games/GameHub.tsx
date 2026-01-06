// GameHub.tsx - Main entry point for all puzzle games
// Shows available games, mode selection, and game flow

import React, { useState, useRef } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import ArchivesTheme from '@/constants/ArchivesTheme';
import GameModeSelector from './GameModeSelector';
import GameContainer from './GameContainer';
import JigsawGame from './JigsawGame';
import type { GameMode, GameType, GameDifficulty, JigsawGameData, GameResult } from '@/gamification/types/games';
import { analyticsService } from '@/services/AnalyticsService';
import { useGamifiedProgress } from '@/gamification';
import { gameGeneratorService } from '@/gamification/services/GameGeneratorService';

interface GameHubProps {
  visible: boolean;
  onClose: () => void;
  initialGameType?: GameType;
  initialTopic?: string;
  currentEraId?: string; // Current era being viewed (from Supabase)
}

export default function GameHub({
  visible,
  onClose,
  initialGameType = 'jigsaw',
  initialTopic = 'Islamic History',
  currentEraId,
}: GameHubProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [gameData, setGameData] = useState<JigsawGameData | null>(null);
  const [nextPuzzleData, setNextPuzzleData] = useState<JigsawGameData | null>(null);
  const [preloadStatus, setPreloadStatus] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const [isWaitingForPreload, setIsWaitingForPreload] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentGridSize, setCurrentGridSize] = useState<number>(3); // Start at 3×3
  const [puzzlesCompleted, setPuzzlesCompleted] = useState(0);
  const [solveTimes, setSolveTimes] = useState<number[]>([]); // Track recent solve times
  const [puzzleStartTime, setPuzzleStartTime] = useState<number | null>(null);

  // Ref to store the preload promise so we can await it when needed
  const preloadPromiseRef = useRef<Promise<JigsawGameData | null> | null>(null);

  const { moduleProgress } = useGamifiedProgress();

  // Determine which eras to use for puzzle themes
  const getUserCompletedEras = async (): Promise<string[] | undefined> => {
    // PRIORITY 1: If user is viewing a specific era, use ONLY that era for puzzles
    if (currentEraId) {
      console.log(`🎯 [GameHub] Using current era for puzzles: ${currentEraId}`);
      return [currentEraId];
    }

    // PRIORITY 2: Use all completed eras (for when opened from profile or other non-era screens)
    const completedEras: string[] = [];

    // Check legacy Era 1 (Umayyad Dynasty) - no era_id in old system
    if (moduleProgress && moduleProgress.length > 0) {
      completedEras.push('era_1'); // Legacy era uses 'era_1' key for themes
    }

    // Check new eras - use Supabase era_id directly (no mapping!)
    try {
      const newProgressData = await AsyncStorage.getItem('new_user_progress');
      if (newProgressData) {
        const newProgress: { era_id: string }[] = JSON.parse(newProgressData);
        const uniqueEras = [...new Set(newProgress.map(p => p.era_id))];

        // Add all unique era_ids from Supabase directly
        completedEras.push(...uniqueEras);
      }
    } catch (error) {
      console.error('❌ [GameHub] Error reading new progress:', error);
    }

    console.log(`📚 [GameHub] Using completed eras for puzzles:`, completedEras);
    return completedEras.length > 0 ? completedEras : undefined;
  };

  // Theme selection is now handled by GameGeneratorService based on user's completed eras
  // No need for static theme pool - AI selects contextual themes automatically

  // Handle mode selection
  const handleModeSelected = async (mode: GameMode) => {
    setSelectedMode(mode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Reset game state - fresh start every time
    setCurrentGridSize(3); // Always start at 3×3
    setNextPuzzleData(null); // Clear any preloaded puzzle
    setPreloadStatus('idle'); // Reset preload state
    setIsWaitingForPreload(false); // Clear waiting state
    preloadPromiseRef.current = null; // Clear preload promise
    setSolveTimes([]); // Clear performance history
    setPuzzlesCompleted(0); // Reset counter
    console.log('🔄 [GameHub] Reset to fresh 3×3 start for new game session');

    // Track analytics
    analyticsService.trackCustomEvent('game_mode_selected', {
      game_type: initialGameType,
      mode,
      topic: initialTopic,
    });

    // Generate game data
    await generateGameData(mode);
  };

  // Calculate next grid size based on user performance
  const getNextGridSize = (currentSize: number, avgSolveTime: number): number => {
    const totalPieces = currentSize * currentSize;

    // Target solve time per piece (faster = user is skilled)
    const timePerPiece = avgSolveTime / totalPieces;

    console.log(`📊 Performance: ${avgSolveTime.toFixed(1)}s avg, ${timePerPiece.toFixed(1)}s per piece`);

    // Intelligent scaling:
    // - Very fast (< 3s per piece): Increase by 2 (3×3 → 5×5)
    // - Fast (< 5s per piece): Increase by 1 (3×3 → 4×4)
    // - Normal (< 8s per piece): Stay same or increase by 1 occasionally
    // - Slow (>= 8s per piece): Stay same

    if (timePerPiece < 3) {
      return Math.min(currentSize + 2, 12); // Cap at 12×12 (144 pieces!)
    } else if (timePerPiece < 5) {
      return Math.min(currentSize + 1, 12);
    } else if (timePerPiece < 8 && puzzlesCompleted % 2 === 0) {
      return Math.min(currentSize + 1, 12); // Gradual increase
    } else {
      return currentSize; // Keep same size
    }
  };

  // Map grid size to difficulty label
  const getGridSizeDifficulty = (gridSize: number): GameDifficulty => {
    if (gridSize <= 3) return 'easy';
    if (gridSize <= 5) return 'medium';
    return 'hard';
  };

  // Handle near completion - start preloading next puzzle (triggers at 50% completion)
  const handleNearCompletion = () => {
    console.log('🔔 [GameHub] handleNearCompletion called - halfway done!');
    console.log(`📊 [GameHub] Current preload status: ${preloadStatus}`);

    // Only preload if we haven't already started
    if (preloadStatus !== 'idle') {
      console.log(`⏭️ [GameHub] Preload already ${preloadStatus} - skipping`);
      return;
    }

    console.log('🚀 [GameHub] Starting background preload NOW!');
    // Store the promise so we can await it later if needed
    preloadPromiseRef.current = preloadNextPuzzle();
  };

  // Preload next puzzle in background (called when user is halfway done)
  // Returns the preloaded puzzle data for direct use
  const preloadNextPuzzle = async (): Promise<JigsawGameData | null> => {
    try {
      // Set status to loading
      setPreloadStatus('loading');
      console.log('⚡ [GameHub] Preload status: idle → loading');
      console.log('⚡ [GameHub] Starting AI generation in background...');

      // Calculate next grid size based on performance
      const avgTime = solveTimes.length > 0
        ? solveTimes.reduce((a, b) => a + b, 0) / solveTimes.length
        : 60; // Default if no history

      const nextSize = getNextGridSize(currentGridSize, avgTime);
      const nextDiff = getGridSizeDifficulty(nextSize);
      const nextPieceCount = nextSize * nextSize;
      const userEras = await getUserCompletedEras();

      console.log(`🎯 [GameHub] Preloading ${nextPieceCount}-piece puzzle (${nextSize}×${nextSize})`);
      console.log(`🤖 [GameHub] Calling AI API for next puzzle...`);

      // Generate next puzzle in background
      const nextGame = await gameGeneratorService.generateGame({
        type: initialGameType,
        difficulty: nextDiff,
        topic: 'Islamic History',
        gridSize: nextSize,
        userCompletedEras: userEras,
      });

      if (nextGame.type === 'jigsaw') {
        const puzzleData = nextGame as JigsawGameData;
        setNextPuzzleData(puzzleData);
        setPreloadStatus('ready');
        console.log(`✅ [GameHub] Preload status: loading → ready`);
        console.log(`✅ [GameHub] Next puzzle ready for instant display!`);
        return puzzleData; // Return the puzzle data
      } else {
        throw new Error('Unexpected game type received');
      }
    } catch (error) {
      console.error('❌ [GameHub] Preload failed:', error);
      setPreloadStatus('failed');
      console.log(`❌ [GameHub] Preload status: loading → failed`);
      return null;
    }
  };

  // Generate game data using AI service (used for initial puzzle and fallback only)
  const generateGameData = async (mode: GameMode, gridSize?: number) => {
    const sizeToUse = gridSize || currentGridSize;
    const difficulty = getGridSizeDifficulty(sizeToUse);
    const userEras = await getUserCompletedEras();

    setIsGenerating(true);
    setError(null);

    try {
      const pieceCount = sizeToUse * sizeToUse;
      console.log(`🎮 [GameHub] generateGameData() called`);
      console.log(`🎮 [GameHub] Generating ${pieceCount}-piece puzzle (${sizeToUse}×${sizeToUse})`);
      console.log(`📚 [GameHub] User completed eras:`, userEras || 'None');
      console.log(`🤖 [GameHub] Calling AI API for initial/fallback puzzle...`);

      // Call AI game generator service
      const generatedGame = await gameGeneratorService.generateGame({
        type: initialGameType,
        difficulty,
        topic: 'Islamic History',
        gridSize: sizeToUse,
        userCompletedEras: userEras,
      });

      // Type guard to ensure it's jigsaw data
      if (generatedGame.type === 'jigsaw') {
        setGameData(generatedGame as JigsawGameData);
        setPuzzleStartTime(Date.now());
        console.log('✅ [GameHub] Initial/fallback puzzle generated successfully');

        // Track game started
        analyticsService.trackCustomEvent('game_started', {
          game_type: initialGameType,
          mode,
          difficulty: generatedGame.difficulty,
          grid_size: sizeToUse,
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

    // Calculate solve time
    const solveTime = puzzleStartTime ? (Date.now() - puzzleStartTime) / 1000 : 60; // in seconds
    console.log(`⏱️ [GameHub] Puzzle solved in ${solveTime.toFixed(1)} seconds`);

    // Update solve times (keep last 5 for performance average)
    setSolveTimes(prev => {
      const updated = [...prev, solveTime];
      return updated.slice(-5); // Keep last 5
    });

    // Increment completed count
    setPuzzlesCompleted(prev => prev + 1);

    console.log(`🎮 Game completed! Earned ${totalXP} XP (Total puzzles: ${puzzlesCompleted + 1})`);

    // Track analytics
    analyticsService.trackCustomEvent('game_completed', {
      game_type: initialGameType,
      mode: result.mode,
      difficulty: result.difficulty,
      grid_size: currentGridSize,
      time_elapsed: result.timeElapsed,
      solve_time: solveTime,
      xp_earned: totalXP,
      perfect_completion: result.perfectCompletion,
      puzzles_completed: puzzlesCompleted + 1,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Handle next puzzle - STRICT RULE: NEVER call AI on button click
  const handleNextPuzzle = async () => {
    if (!selectedMode) return;

    console.log('🎮 [GameHub] "Next Puzzle" button clicked');
    console.log(`📊 [GameHub] Preload status: ${preloadStatus}`);
    console.log(`📊 [GameHub] Has preloaded data: ${!!nextPuzzleData}`);

    // RULE 1: If preload is ready, use it immediately (INSTANT - no AI call)
    if (preloadStatus === 'ready' && nextPuzzleData) {
      const nextSize = nextPuzzleData.gridSize;
      const currentPieceCount = currentGridSize * currentGridSize;
      const nextPieceCount = nextSize * nextSize;
      const isAdvancing = nextSize > currentGridSize;

      console.log('⚡ [GameHub] INSTANT TRANSITION - Using preloaded puzzle (NO AI CALL)');

      if (isAdvancing) {
        console.log(`📈 [GameHub] Advancing! ${currentPieceCount} → ${nextPieceCount} pieces`);
        setCurrentGridSize(nextSize);
      } else {
        console.log(`➡️ [GameHub] Same difficulty: ${nextPieceCount} pieces`);
      }

      // Display preloaded puzzle immediately
      setGameData(nextPuzzleData);
      setNextPuzzleData(null);
      setPreloadStatus('idle'); // Reset for next preload
      setIsWaitingForPreload(false); // Clear any waiting state
      setPuzzleStartTime(Date.now());

      console.log(`✅ [GameHub] Puzzle ${puzzlesCompleted + 1} displayed instantly`);
      return;
    }

    // RULE 2: If preload is still loading, wait for it to complete (DON'T generate again)
    if (preloadStatus === 'loading' && preloadPromiseRef.current) {
      console.log('⏳ [GameHub] Preload in progress - waiting for it to complete...');
      console.log('⏳ [GameHub] NOT calling AI again - awaiting background preload');

      setIsWaitingForPreload(true); // Show loading UI

      try {
        // Wait for the background preload to finish and get the puzzle data directly
        const preloadedPuzzle = await preloadPromiseRef.current;

        // Use the returned puzzle data (no state check needed!)
        if (preloadedPuzzle) {
          const nextSize = preloadedPuzzle.gridSize;
          const currentPieceCount = currentGridSize * currentGridSize;
          const nextPieceCount = nextSize * nextSize;
          const isAdvancing = nextSize > currentGridSize;

          console.log('⚡ [GameHub] Preload completed - displaying puzzle now (NO AI CALL)!');

          if (isAdvancing) {
            console.log(`📈 [GameHub] Advancing! ${currentPieceCount} → ${nextPieceCount} pieces`);
            setCurrentGridSize(nextSize);
          }

          // Display the preloaded puzzle
          setGameData(preloadedPuzzle);
          setNextPuzzleData(null);
          setPreloadStatus('idle');
          setPuzzleStartTime(Date.now());
          setIsWaitingForPreload(false);
          preloadPromiseRef.current = null;

          console.log(`✅ [GameHub] Puzzle displayed after waiting for preload`);
          return; // IMPORTANT: Exit here - don't fall through!
        } else {
          console.log('⚠️ [GameHub] Preload returned null - falling back to generate');
        }
      } catch (error) {
        console.error('❌ [GameHub] Error while waiting for preload:', error);
      } finally {
        setIsWaitingForPreload(false);
        preloadPromiseRef.current = null;
      }
      // If preload failed (returned null), fall through to RULE 3
    }

    // RULE 3: If preload failed or is idle, generate puzzle as fallback
    console.log('🔄 [GameHub] No preload available - generating puzzle now (FALLBACK)');
    console.log(`🤖 [GameHub] Reason: preloadStatus=${preloadStatus}`);

    const avgTime = solveTimes.length > 0
      ? solveTimes.reduce((a, b) => a + b, 0) / solveTimes.length
      : 60;

    const nextSize = getNextGridSize(currentGridSize, avgTime);
    console.log(`🎲 [GameHub] Calculated next size: ${nextSize}×${nextSize}`);
    console.log(`🤖 [GameHub] Calling AI API for puzzle generation...`);

    setCurrentGridSize(nextSize);
    setPreloadStatus('idle'); // Reset status
    await generateGameData(selectedMode, nextSize);
  };

  // Handle exit
  const handleExit = () => {
    setSelectedMode(null);
    setGameData(null);
    setNextPuzzleData(null);
    setPreloadStatus('idle'); // Reset preload state
    setIsWaitingForPreload(false); // Clear waiting state
    preloadPromiseRef.current = null; // Clear preload promise
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

  // Render loading state (generating new puzzle OR waiting for preload)
  if (isGenerating || isWaitingForPreload) {
    return (
      <Modal visible={visible} animationType="fade">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ArchivesTheme.colors.persianOrange} />
          <Text style={styles.loadingText}>
            {isWaitingForPreload ? 'Preparing next puzzle...' : 'Generating puzzle...'}
          </Text>
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
          onNextPuzzle={handleNextPuzzle}
          onNearCompletion={handleNearCompletion}
          difficulty={gameData.difficulty}
        >
          {gameData.type === 'jigsaw' && (
            <JigsawGame
              key={gameData.id || `puzzle-${Date.now()}`}
              gameData={gameData}
            />
          )}
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
