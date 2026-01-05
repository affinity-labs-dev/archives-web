// JigsawBoard.tsx - Grid board for jigsaw puzzle
// Shows ghost outline and drop zones

import React from 'react';
import { View, StyleSheet, Dimensions, Image } from 'react-native';
import type { JigsawGameData } from '@/types/games';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface JigsawBoardProps {
  gameData: JigsawGameData;
  cellSize: number;
}

export default function JigsawBoard({ gameData, cellSize }: JigsawBoardProps) {
  const boardSize = gameData.gridSize * cellSize;

  // Render grid lines
  const renderGrid = () => {
    const cells = [];
    for (let row = 0; row < gameData.gridSize; row++) {
      for (let col = 0; col < gameData.gridSize; col++) {
        cells.push(
          <View
            key={`cell-${row}-${col}`}
            style={[
              styles.cell,
              {
                width: cellSize,
                height: cellSize,
                left: col * cellSize,
                top: row * cellSize,
              },
            ]}
          />
        );
      }
    }
    return cells;
  };

  return (
    <View style={[styles.board, { width: boardSize, height: boardSize }]}>
      {/* Faded background image - fills gaps visible through puzzle pieces */}
      <Image
        source={{ uri: gameData.imageUrl }}
        style={[
          StyleSheet.absoluteFillObject,
          {
            width: boardSize,
            height: boardSize,
            opacity: 0.12,
            borderRadius: 6, // Match board border radius
          },
        ]}
        resizeMode="cover"
      />

      {/* Grid lines */}
      {renderGrid()}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cell: {
    position: 'absolute',
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
  },
});
