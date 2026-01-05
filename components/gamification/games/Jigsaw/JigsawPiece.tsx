// JigsawPiece.tsx - Draggable jigsaw piece with authentic puzzle shape
// Uses SVG clipping for realistic puzzle piece appearance

import React, { useRef, useMemo } from 'react';
import { StyleSheet, PanResponder, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Image as SvgImage, Defs, ClipPath, Path } from 'react-native-svg';
import type { JigsawPieceData, JigsawPiecePosition } from '@/types/games';
import type { PuzzleEdgeMap } from './PuzzleEdgeMap';

interface JigsawPieceProps {
  piece: JigsawPieceData;
  cellSize: number;
  isCorrect: boolean;
  onDrop: (pieceId: string, position: JigsawPiecePosition) => void;
  disabled?: boolean;
  gridSize: number;
  edgeMap: PuzzleEdgeMap;
  isPuzzleComplete?: boolean; // NEW: Hide borders when puzzle is complete
}

export default function JigsawPiece({
  piece,
  cellSize,
  isCorrect,
  onDrop,
  disabled = false,
  gridSize,
  edgeMap,
  isPuzzleComplete = false,
}: JigsawPieceProps) {
  // Piece size is larger than cell size to accommodate tabs
  const tabExtension = cellSize * 0.2; // Increased for better overlap (was 0.15)
  const pieceSize = cellSize + tabExtension * 2; // Extra space on all sides
  const centerOffset = tabExtension; // Offset to center the cell within the piece

  // Flash effect when piece locks in place
  const flashOpacity = useRef(new Animated.Value(0)).current;

  // Trigger flash when piece becomes correct
  React.useEffect(() => {
    if (isCorrect && !isPuzzleComplete) {
      // Flash white briefly to show locking
      Animated.sequence([
        Animated.timing(flashOpacity, {
          toValue: 0.3,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(flashOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isCorrect, isPuzzleComplete, flashOpacity]);

  // Get coordinated edges from edge map (ensures perfect interlocking)
  const edges = useMemo(() => {
    const { row, col } = piece.correctPosition;
    return edgeMap.getPieceEdges(row, col);
  }, [piece.correctPosition, edgeMap]);

  // Generate SVG path for puzzle piece shape with proper rounded interlocking tabs
  const generatePuzzlePath = (): string => {
    const size = cellSize;
    const tabWidth = size * 0.3; // Width of tab base
    const tabHeight = tabExtension; // How far tab extends
    const neckWidth = size * 0.2; // Narrow neck at base
    const bulbRadius = tabHeight * 0.85; // Rounded bulb at end
    const offset = centerOffset;

    let path = `M ${offset},${offset}`;

    // Helper function to create rounded tab with neck and bulb
    const createTab = (
      startPos: number,
      edgePos: number,
      direction: number,
      isHorizontal: boolean
    ) => {
      const mid = offset + size / 2;
      const neckStart = mid - neckWidth / 2;
      const neckEnd = mid + neckWidth / 2;
      const tabStart = mid - tabWidth / 2;
      const tabEnd = mid + tabWidth / 2;
      const extension = direction * tabHeight;
      const bulbCenter = direction * (tabHeight * 0.7);

      if (isHorizontal) {
        // Horizontal edge (top/bottom)
        path += ` L ${tabStart},${edgePos}`;
        // Curve into neck
        path += ` C ${tabStart},${edgePos + extension * 0.15} ${neckStart},${edgePos + extension * 0.3} ${neckStart},${edgePos + extension * 0.4}`;
        // Neck to bulb
        path += ` C ${neckStart},${edgePos + bulbCenter - bulbRadius} ${mid - bulbRadius},${edgePos + bulbCenter} ${mid},${edgePos + bulbCenter}`;
        // Bulb arc
        path += ` C ${mid + bulbRadius},${edgePos + bulbCenter} ${neckEnd},${edgePos + bulbCenter - bulbRadius} ${neckEnd},${edgePos + extension * 0.4}`;
        // Back to edge
        path += ` C ${neckEnd},${edgePos + extension * 0.3} ${tabEnd},${edgePos + extension * 0.15} ${tabEnd},${edgePos}`;
      } else {
        // Vertical edge (left/right)
        path += ` L ${edgePos},${tabStart}`;
        // Curve into neck
        path += ` C ${edgePos + extension * 0.15},${tabStart} ${edgePos + extension * 0.3},${neckStart} ${edgePos + extension * 0.4},${neckStart}`;
        // Neck to bulb
        path += ` C ${edgePos + bulbCenter - bulbRadius},${neckStart} ${edgePos + bulbCenter},${mid - bulbRadius} ${edgePos + bulbCenter},${mid}`;
        // Bulb arc
        path += ` C ${edgePos + bulbCenter},${mid + bulbRadius} ${edgePos + bulbCenter - bulbRadius},${neckEnd} ${edgePos + extension * 0.4},${neckEnd}`;
        // Back to edge
        path += ` C ${edgePos + extension * 0.3},${neckEnd} ${edgePos + extension * 0.15},${tabEnd} ${edgePos},${tabEnd}`;
      }
    };

    // TOP EDGE
    if (edges.top === 'flat') {
      path += ` L ${offset + size},${offset}`;
    } else {
      const dir = edges.top === 'tab-out' ? -1 : 1;
      createTab(offset, offset, dir, true);
      path += ` L ${offset + size},${offset}`;
    }

    // RIGHT EDGE
    if (edges.right === 'flat') {
      path += ` L ${offset + size},${offset + size}`;
    } else {
      const dir = edges.right === 'tab-out' ? 1 : -1;
      createTab(offset + size, offset + size, dir, false);
      path += ` L ${offset + size},${offset + size}`;
    }

    // BOTTOM EDGE
    if (edges.bottom === 'flat') {
      path += ` L ${offset},${offset + size}`;
    } else {
      const dir = edges.bottom === 'tab-out' ? 1 : -1;
      createTab(offset + size, offset + size, dir, true);
      path += ` L ${offset},${offset + size}`;
    }

    // LEFT EDGE
    if (edges.left === 'flat') {
      path += ` L ${offset},${offset}`;
    } else {
      const dir = edges.left === 'tab-out' ? -1 : 1;
      createTab(offset, offset, dir, false);
      path += ` L ${offset},${offset}`;
    }

    return path + ' Z';
  };

  const puzzlePath = useMemo(() => generatePuzzlePath(), [cellSize, edges]);
  const clipPathId = `clip-${piece.id}`;

  // Calculate initial position (accounting for the piece being larger than the cell)
  const getInitialPosition = () => {
    if (piece.currentPosition) {
      // On grid - use grid position minus offset to account for larger piece
      return {
        x: piece.currentPosition.col * cellSize - centerOffset,
        y: piece.currentPosition.row * cellSize - centerOffset,
      };
    }
    // Around board - use pixel position
    return piece.initialPixelPosition || { x: 0, y: 0 };
  };

  const initialPos = getInitialPosition();
  const pan = useRef(new Animated.ValueXY(initialPos)).current;
  const currentPosition = useRef(initialPos);

  // Simple pan responder - LOCK piece when correctly placed
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled && !isCorrect, // Can't drag if correct
      onMoveShouldSetPanResponder: () => !disabled && !isCorrect, // Can't drag if correct

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
          // Success - snap to grid (account for offset)
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

          const snappedX = snapResult.col * cellSize - centerOffset;
          const snappedY = snapResult.row * cellSize - centerOffset;

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

  // Simple snap to grid function (account for offset)
  const snapToGrid = (
    x: number,
    y: number
  ): JigsawPiecePosition | null => {
    // Calculate which cell this position is in (add offset to get cell center)
    const col = Math.round((x + centerOffset) / cellSize);
    const row = Math.round((y + centerOffset) / cellSize);

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

  // Calculate image offset for this piece (account for centerOffset)
  const { row, col } = piece.correctPosition;
  const imageOffset = {
    left: -(col * cellSize) + centerOffset,
    top: -(row * cellSize) + centerOffset,
  };

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          width: pieceSize,
          height: pieceSize,
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
          opacity: isCorrect ? 1 : 0.98, // Full opacity when correct
          zIndex: isCorrect ? 1 : 10,
        },
      ]}
      pointerEvents={isCorrect ? 'none' : 'auto'} // LOCK when correct!
      {...panResponder.panHandlers}
    >
      <Svg height={pieceSize} width={pieceSize} style={styles.svgContainer}>
        <Defs>
          <ClipPath id={clipPathId}>
            <Path d={puzzlePath} fill="white" />
          </ClipPath>
        </Defs>

        {/* Clipped image - puzzle piece shape */}
        <SvgImage
          href={{ uri: piece.imageUri }}
          x={imageOffset.left}
          y={imageOffset.top}
          width={cellSize * gridSize}
          height={cellSize * gridSize}
          clipPath={`url(#${clipPathId})`}
          preserveAspectRatio="xMidYMid slice"
        />

        {/* Puzzle piece outline - very subtle for incorrect pieces */}
        {!isPuzzleComplete && !isCorrect && (
          <Path
            d={puzzlePath}
            fill="none"
            stroke="rgba(0,0,0,0.08)"
            strokeWidth={0.5}
          />
        )}
      </Svg>

      {/* Flash overlay when piece locks in place */}
      {isCorrect && !isPuzzleComplete && (
        <Animated.View
          style={[
            styles.flashOverlay,
            {
              width: pieceSize,
              height: pieceSize,
              opacity: flashOpacity,
            },
          ]}
        />
      )}

      {/* No checkmark - pieces merge seamlessly */}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    backgroundColor: 'transparent', // No white background!
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, // Softer shadow
    shadowRadius: 6, // More blur
    elevation: 3, // Reduced elevation for Android
  },
  svgContainer: {
    position: 'absolute',
    backgroundColor: 'transparent', // No white background!
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'white',
    borderRadius: 4,
  },
});
