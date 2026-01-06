// JigsawGame.tsx - Main jigsaw puzzle game component
// Orchestrates board, pieces, and game logic

import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import JigsawBoard from './JigsawBoard';
import JigsawPiece from './JigsawPiece';
import { useJigsawLogic } from '@/gamification/hooks/useJigsawLogic';
import { PuzzleEdgeMap } from './PuzzleEdgeMap';
import ArchivesTheme from '@/constants/ArchivesTheme';
import type { JigsawGameData } from '@/gamification/types/games';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface JigsawGameProps {
  gameData: JigsawGameData;
  onGameStart?: () => void;
  onGameComplete?: () => void;
  onNearCompletion?: () => void;
  onClose?: () => void;
  onNextPuzzle?: () => void;
  isGameStarted?: boolean;
  mode?: 'practice' | 'challenge';
  formattedTime?: string;
}

export default function JigsawGame({
  gameData,
  onGameStart,
  onGameComplete,
  onNearCompletion,
  onClose,
  onNextPuzzle,
  isGameStarted,
  mode,
  formattedTime,
}: JigsawGameProps) {
  // Calculate cell size based on screen width (leave margins)
  const BOARD_MARGIN = 40;
  const boardWidth = Math.min(SCREEN_WIDTH - BOARD_MARGIN * 2, 400);
  const cellSize = Math.floor(boardWidth / gameData.gridSize);
  const actualBoardSize = cellSize * gameData.gridSize;

  const jigsawLogic = useJigsawLogic({
    gameData,
    cellSize,
    onComplete: onGameComplete,
    onNearCompletion,
  });

  // Generate coordinated edge map for perfect interlocking
  // Use gameData.id as seed for consistency across restarts
  const edgeMap = useMemo(() => {
    const seed = gameData.id ? parseInt(gameData.id.replace(/\D/g, '')) || 42 : 42;
    const map = new PuzzleEdgeMap(gameData.gridSize, seed);
    map.verify(); // Verify edges match correctly
    console.log('🧩 [JigsawGame] Edge map generated for perfect interlocking');
    return map;
  }, [gameData.gridSize, gameData.id]);

  // Hint modal state
  const [showHint, setShowHint] = useState(false);

  // Auto-start game on mount
  useEffect(() => {
    if (onGameStart && !isGameStarted) {
      onGameStart();
    }
  }, [onGameStart, isGameStarted]);

  // No tray - all pieces on board!

  return (
    <View style={styles.container}>
      {/* Header: Close + Timer + Progress + Hint all in one row */}
      <View style={styles.headerContainer}>
        {/* Close Button */}
        {onClose && (
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color={ArchivesTheme.colors.shoeBrown} />
          </TouchableOpacity>
        )}

        {/* Timer (Challenge mode only) */}
        {mode === 'challenge' && formattedTime && (
          <View style={styles.timerContainer}>
            <Ionicons name="time-outline" size={16} color={ArchivesTheme.colors.persianOrange} />
            <Text style={styles.timerText}>{formattedTime}</Text>
          </View>
        )}

        {/* Progress Section */}
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${jigsawLogic.progressPercentage}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {jigsawLogic.correctPlacements}/{gameData.pieces.length}
          </Text>
        </View>

        {/* Hint Button */}
        <TouchableOpacity
          style={styles.hintButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowHint(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="help-circle" size={20} color={ArchivesTheme.colors.persianOrange} />
        </TouchableOpacity>
      </View>

      {/* Game Board */}
      <View style={styles.boardContainer}>
        <View style={[styles.boardWrapper, { width: actualBoardSize, height: actualBoardSize }]}>
          <JigsawBoard gameData={gameData} cellSize={cellSize} />

          {/* ALL pieces - positioned absolutely within this container */}
          {jigsawLogic.pieces.map((piece) => (
            <JigsawPiece
              key={piece.id}
              piece={piece}
              cellSize={cellSize}
              gridSize={gameData.gridSize}
              isCorrect={jigsawLogic.isPieceCorrect(piece.id)}
              onDrop={jigsawLogic.placePiece}
              edgeMap={edgeMap}
              isPuzzleComplete={jigsawLogic.isComplete}
            />
          ))}
        </View>
      </View>

      {/* Instructions or Action Button */}
      {jigsawLogic && (
        <View style={styles.footerContainer}>
          {!jigsawLogic.isComplete ? (
            <Text style={styles.instructionsText}>
              Drag pieces around the board to arrange them correctly!
            </Text>
          ) : (
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                if (onNextPuzzle) {
                  onNextPuzzle();
                } else {
                  onClose?.();
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>
                {onNextPuzzle ? 'Next Puzzle' : 'Continue'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Hint Modal */}
      <Modal visible={showHint} transparent={true} animationType="fade">
        <TouchableOpacity
          style={styles.hintModalOverlay}
          activeOpacity={1}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowHint(false);
          }}
        >
          <View style={styles.hintModalContent}>
            <Text style={styles.hintModalTitle}>Completed Puzzle</Text>
            <Image
              source={{ uri: gameData.imageUrl }}
              style={styles.hintImage}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.closeHintButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowHint(false);
              }}
            >
              <Text style={styles.closeHintText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    gap: 10,
    zIndex: 100, // Keep header above puzzle pieces
  },
  closeButton: {
    padding: 4,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFF8DC',
    borderRadius: 6,
  },
  timerText: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    color: ArchivesTheme.colors.persianOrange,
    fontWeight: '600',
  },
  progressSection: {
    flex: 1,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: ArchivesTheme.colors.persianOrange,
    borderRadius: 3,
  },
  progressText: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: '#7F8C8D',
    fontWeight: '600',
  },
  hintButton: {
    padding: 6,
    backgroundColor: ArchivesTheme.colors.creamWhite,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: ArchivesTheme.colors.persianOrange,
  },
  boardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  boardWrapper: {
    position: 'relative',
  },
  footerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    zIndex: 100, // Keep footer above puzzle pieces
    alignItems: 'center',
  },
  instructionsText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    fontWeight: '500',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ArchivesTheme.colors.persianOrange,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  continueButtonText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  hintModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hintModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: SCREEN_WIDTH - 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  hintModalTitle: {
    fontFamily: 'DM Sans',
    fontSize: 20,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.shoeBrown,
    marginBottom: 16,
  },
  hintImage: {
    width: 300,
    height: 300,
    borderRadius: 12,
    marginBottom: 20,
  },
  closeHintButton: {
    backgroundColor: ArchivesTheme.colors.persianOrange,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  closeHintText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});
