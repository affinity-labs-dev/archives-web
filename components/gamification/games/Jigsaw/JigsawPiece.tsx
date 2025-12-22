// JigsawPiece.tsx - Simple draggable jigsaw piece
// Uses simple absolute positioning - no complex coordinate conversion

import React, { useRef } from 'react';
import { View, Image, StyleSheet, PanResponder, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { JigsawPieceData, JigsawPiecePosition } from '@/types/games';

interface JigsawPieceProps {
  piece: JigsawPieceData;
  cellSize: number;
  isCorrect: boolean;
  onDrop: (pieceId: string, position: JigsawPiecePosition) => void;
  disabled?: boolean;
  gridSize: number;
}

export default function JigsawPiece({
  piece,
  cellSize,
  isCorrect,
  onDrop,
  disabled = false,
  gridSize,
}: JigsawPieceProps) {
  // Calculate initial position
  const getInitialPosition = () => {
    if (piece.currentPosition) {
      // On grid - use grid position
      return {
        x: piece.currentPosition.col * cellSize,
        y: piece.currentPosition.row * cellSize,
      };
    }
    // Around board - use pixel position
    return piece.initialPixelPosition || { x: 0, y: 0 };
  };

  const initialPos = getInitialPosition();
  const pan = useRef(new Animated.ValueXY(initialPos)).current;
  const currentPosition = useRef(initialPos);

  // Simple pan responder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled && !isCorrect,
      onMoveShouldSetPanResponder: () => !disabled && !isCorrect,

      onPanResponderGrant: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        pan.setOffset({
          x: currentPosition.current.x,
          y: currentPosition.current.y,
        });
        pan.setValue({ x: 0, y: 0 });
      },

      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),

      onPanResponderRelease: (_, gesture) => {
        pan.flattenOffset();

        // Calculate final position
        const finalX = currentPosition.current.x + gesture.dx;
        const finalY = currentPosition.current.y + gesture.dy;

        // Try to snap to grid
        const snapResult = snapToGrid(finalX, finalY);

        if (snapResult) {
          // Success - snap to grid
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

          const snappedX = snapResult.col * cellSize;
          const snappedY = snapResult.row * cellSize;

          Animated.spring(pan, {
            toValue: { x: snappedX, y: snappedY },
            useNativeDriver: false,
            tension: 100,
            friction: 10,
          }).start();

          currentPosition.current = { x: snappedX, y: snappedY };
          onDrop(piece.id, snapResult);
        } else {
          // Failed - return to start
          Animated.spring(pan, {
            toValue: initialPos,
            useNativeDriver: false,
            tension: 100,
            friction: 10,
          }).start();

          currentPosition.current = initialPos;
        }
      },
    })
  ).current;

  // Simple snap to grid function
  const snapToGrid = (
    x: number,
    y: number
  ): JigsawPiecePosition | null => {
    // Calculate which cell this position is in
    const col = Math.round(x / cellSize);
    const row = Math.round(y / cellSize);

    console.log(`🎯 Snap check: pos=(${x.toFixed(0)}, ${y.toFixed(0)}) -> grid=(${row}, ${col})`);

    // Check if within bounds
    if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) {
      console.log(`❌ Out of bounds`);
      return null;
    }

    // Calculate distance to cell center
    const cellCenterX = col * cellSize + cellSize / 2;
    const cellCenterY = row * cellSize + cellSize / 2;
    const pieceCenterX = x + cellSize / 2;
    const pieceCenterY = y + cellSize / 2;

    const distance = Math.sqrt(
      Math.pow(cellCenterX - pieceCenterX, 2) +
      Math.pow(cellCenterY - pieceCenterY, 2)
    );

    // Snap threshold - entire cell
    const threshold = cellSize;

    console.log(`📏 Distance: ${distance.toFixed(0)}px (threshold: ${threshold}px)`);

    if (distance <= threshold) {
      console.log(`✅ Snap to (${row}, ${col})`);
      return { row, col };
    }

    console.log(`❌ Too far from center`);
    return null;
  };

  // Calculate image offset for this piece
  const { row, col } = piece.correctPosition;
  const imageOffset = {
    left: -(col * cellSize),
    top: -(row * cellSize),
  };

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          width: cellSize,
          height: cellSize,
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
          opacity: isCorrect ? 0.95 : 1,
          zIndex: isCorrect ? 1 : 10,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: piece.imageUri }}
          style={[
            styles.image,
            {
              position: 'absolute',
              left: imageOffset.left,
              top: imageOffset.top,
              width: cellSize * gridSize,
              height: cellSize * gridSize,
            },
            isCorrect && styles.correctPiece,
          ]}
          resizeMode="cover"
        />
      </View>
      {isCorrect && <View style={styles.checkmark} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  image: {},
  correctPiece: {
    opacity: 0.95,
  },
  checkmark: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#27AE60',
    borderWidth: 2,
    borderColor: 'white',
  },
});
