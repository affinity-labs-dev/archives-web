// JigsawGame.tsx - Main jigsaw puzzle game component
// Orchestrates board, pieces, and game logic

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import JigsawBoard from './JigsawBoard';
import JigsawPiece from './JigsawPiece';
import { useJigsawLogic } from './useJigsawLogic';
import ArchivesTheme from '@/constants/ArchivesTheme';
import type { JigsawGameData } from '@/types/games';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface JigsawGameProps {
  gameData: JigsawGameData;
  onGameStart?: () => void;
  onGameComplete?: () => void;
  isGameStarted?: boolean;
}

export default function JigsawGame({
  gameData,
  onGameStart,
  onGameComplete,
  isGameStarted,
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
  });

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
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${jigsawLogic.progressPercentage}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {jigsawLogic.correctPlacements}/{gameData.pieces.length} pieces placed
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
        <Ionicons name="help-circle" size={24} color={ArchivesTheme.colors.persianOrange} />
        <Text style={styles.hintButtonText}>Show Hint</Text>
      </TouchableOpacity>

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
            />
          ))}
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          Drag pieces around the board to arrange them correctly!
        </Text>
      </View>

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
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: ArchivesTheme.colors.persianOrange,
    borderRadius: 4,
  },
  progressText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    fontWeight: '600',
  },
  hintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    gap: 8,
  },
  hintButtonText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: ArchivesTheme.colors.persianOrange,
    fontWeight: '600',
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
  instructionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  instructionsText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    fontWeight: '500',
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
