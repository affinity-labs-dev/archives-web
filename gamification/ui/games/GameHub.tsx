// GameHub.tsx - Main entry point for all puzzle games
// Shows available games, mode selection, and game flow

import ArchivesTheme from '@/constants/ArchivesTheme';
import { useGamifiedProgress } from '@/gamification';
import { gameGeneratorService } from '@/gamification/services/GameGeneratorService';
import type { GameDifficulty, GameMode, GameResult, GameType, JigsawGameData } from '@/gamification/types/games';
import { analyticsService } from '@/services/AnalyticsService';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useGameTimer } from '@/gamification/hooks/useGameTimer';
import JigsawGame from './JigsawGame';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ========== INTERNAL COMPONENT: GameModeSelector ==========
// Choose Practice vs Challenge mode (inline component, no separate file)

interface GameModeSelectorProps {
  onSelectMode: (mode: GameMode) => void;
  onClose?: () => void;
}

function GameModeSelector({ onSelectMode, onClose }: GameModeSelectorProps) {
  const handleSelectMode = (mode: GameMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectMode(mode);
  };

  return (
    <View style={modeSelectorStyles.container}>
      <View style={modeSelectorStyles.modal}>
        {/* Header */}
        <View style={modeSelectorStyles.header}>
          <Text style={modeSelectorStyles.title}>Choose Your Mode</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={modeSelectorStyles.closeButton}>
              <Ionicons name="close" size={24} color={ArchivesTheme.colors.mutedNavy} />
            </TouchableOpacity>
          )}
        </View>

        {/* Practice Mode - Commented out for release */}
        {/* <TouchableOpacity
          style={[modeSelectorStyles.modeCard, modeSelectorStyles.practiceCard]}
          onPress={() => handleSelectMode('practice')}
          activeOpacity={0.8}
        >
          <View style={modeSelectorStyles.modeIcon}>
            <Ionicons name="book-outline" size={32} color="#3498DB" />
          </View>
          <View style={modeSelectorStyles.modeContent}>
            <Text style={modeSelectorStyles.modeTitle}>📚 Practice Mode</Text>
            <Text style={modeSelectorStyles.modeDescription}>
              • No timer - take your time{'\n'}
              • Relaxed gameplay{'\n'}
              • Earn 25 XP on completion
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#95A5A6" />
        </TouchableOpacity> */}

        {/* Challenge Mode */}
        <TouchableOpacity
          style={[modeSelectorStyles.modeCard, modeSelectorStyles.challengeCard]}
          onPress={() => handleSelectMode('challenge')}
          activeOpacity={0.8}
        >
          <View style={[modeSelectorStyles.modeIcon, modeSelectorStyles.challengeIcon]}>
            <Ionicons name="flash-outline" size={32} color="#E74C3C" />
          </View>
          <View style={modeSelectorStyles.modeContent}>
            <Text style={modeSelectorStyles.modeTitle}>⚡ Challenge Mode</Text>
            <Text style={modeSelectorStyles.modeDescription}>
              • Timed race against the clock{'\n'}
              • Compete for best time{'\n'}
              • Test your puzzle-solving skills
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#95A5A6" />
        </TouchableOpacity>

        {/* Tip */}
        <View style={modeSelectorStyles.tip}>
          <Ionicons name="information-circle-outline" size={16} color="#7F8C8D" />
          <Text style={modeSelectorStyles.tipText}>
            Tip: Complete puzzles quickly to test your skills!
          </Text>
        </View>
      </View>
    </View>
  );
}

const modeSelectorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: ArchivesTheme.colors.creamWhite,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: 'DM Sans',
    fontSize: 24,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.shoeBrown,
  },
  closeButton: {
    padding: 4,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  practiceCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3498DB',
  },
  challengeCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#E74C3C',
  },
  modeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EBF5FB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  challengeIcon: {
    backgroundColor: '#FADBD8',
  },
  modeContent: {
    flex: 1,
  },
  modeTitle: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.shoeBrown,
    marginBottom: 8,
  },
  modeDescription: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  tipText: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    color: '#7F8C8D',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
});

// ========== MAIN COMPONENT: GameHub ==========

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
  const [isGameStarted, setIsGameStarted] = useState(false);

  // Ref to store the preload promise so we can await it when needed
  const preloadPromiseRef = useRef<Promise<JigsawGameData | null> | null>(null);

  const { moduleProgress } = useGamifiedProgress();

  // Timer for challenge mode (merged from GameContainer)
  const timer = useGameTimer({
    mode: selectedMode || 'challenge',
    // No countdown - let timer run indefinitely until puzzle is solved
  });

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
      return Math.min(currentSize + 2, 5); // Cap at 5×5 (25 pieces max)
    } else if (timePerPiece < 5) {
      return Math.min(currentSize + 1, 5);
    } else if (timePerPiece < 8 && puzzlesCompleted % 2 === 0) {
      return Math.min(currentSize + 1, 5); // Gradual increase
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

    // Don't preload if we're at max difficulty (5×5)
    if (currentGridSize >= 5) {
      console.log('🏁 [GameHub] Already at max difficulty (5×5) - no preload needed');
      return;
    }

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

  // Game flow functions (merged from GameContainer)
  const handleGameStart = () => {
    setIsGameStarted(true);
    if (selectedMode === 'challenge') {
      timer.start();
    }
  };

  const handleGameComplete = (additionalData?: Partial<GameResult>) => {
    if (selectedMode === 'challenge') {
      timer.stop();
    }

    // Build result object
    const result: GameResult = {
      completed: true,
      mode: selectedMode || 'challenge',
      difficulty: gameData?.difficulty || 'medium',
      timeElapsed: selectedMode === 'challenge' ? timer.elapsedSeconds : undefined,
      score: 100,
      xpEarned: 0, // XP disabled
      bonusXP: 0, // XP disabled
      perfectCompletion: true,
      ...additionalData,
    };

    console.log('🎮 [GameHub] Game completed with result:', result);

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

    console.log(`🎮 Game completed! (Total puzzles: ${puzzlesCompleted + 1})`);

    // Track analytics
    analyticsService.trackCustomEvent('game_completed', {
      game_type: initialGameType,
      mode: result.mode,
      difficulty: result.difficulty,
      grid_size: currentGridSize,
      time_elapsed: result.timeElapsed,
      solve_time: solveTime,
      perfect_completion: result.perfectCompletion,
      puzzles_completed: puzzlesCompleted + 1,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Handle next puzzle - STRICT RULE: NEVER call AI on button click
  const handleNextPuzzle = async () => {
    if (!selectedMode) return;

    // Check if we've reached the maximum difficulty (5×5)
    if (currentGridSize >= 5) {
      console.log('🏆 [GameHub] Maximum difficulty reached (5×5) - ending game session');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Track final completion
      analyticsService.trackCustomEvent('game_session_completed', {
        game_type: initialGameType,
        mode: selectedMode,
        max_grid_size: currentGridSize,
        total_puzzles: puzzlesCompleted,
        final_achievement: 'completed_5x5',
      });

      // Exit game
      handleExit();
      return;
    }

    // Reset game state for next puzzle
    setIsGameStarted(false);
    timer.reset();

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
        <SafeAreaView style={styles.gameContainer}>
          <View style={styles.gameContent}>
            {gameData.type === 'jigsaw' && (
              <JigsawGame
                key={gameData.id || `puzzle-${Date.now()}`}
                gameData={gameData}
                onGameStart={handleGameStart}
                onGameComplete={handleGameComplete}
                onNearCompletion={handleNearCompletion}
                onClose={handleExit}
                onNextPuzzle={handleNextPuzzle}
                isGameStarted={isGameStarted}
                mode={selectedMode}
                formattedTime={timer.formattedTime}
              />
            )}
            {/* Add other game types here as they're built */}
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  gameContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  gameContent: {
    flex: 1,
  },
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
