// JigsawGame.tsx - Complete jigsaw puzzle game
// Consolidates: JigsawBoard + JigsawPiece + PuzzlePrompt + PuzzleEdgeMap + game orchestration

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Modal, Image, PanResponder, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Image as SvgImage, Defs, ClipPath, Path } from 'react-native-svg';
import { useJigsawLogic } from '@/gamification/hooks/useJigsawLogic';
import ArchivesTheme from '@/constants/ArchivesTheme';
import type { JigsawGameData, JigsawPieceData, JigsawPiecePosition } from '@/gamification/types/games';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ========== PUZZLE EDGE MAP ==========
// Generates coordinated edge map for puzzle pieces with perfect interlocking

type EdgeType = 'flat' | 'tab-out' | 'tab-in';

interface PuzzleEdges {
  top: EdgeType;
  right: EdgeType;
  bottom: EdgeType;
  left: EdgeType;
}

class PuzzleEdgeMap {
  private horizontalEdges: EdgeType[][]; // Edges between columns (vertical boundaries)
  private verticalEdges: EdgeType[][]; // Edges between rows (horizontal boundaries)
  private gridSize: number;

  constructor(gridSize: number, seed: number = 42) {
    this.gridSize = gridSize;

    // Initialize edge grids
    this.horizontalEdges = Array(gridSize)
      .fill(null)
      .map(() => Array(gridSize - 1).fill('flat' as EdgeType));

    this.verticalEdges = Array(gridSize - 1)
      .fill(null)
      .map(() => Array(gridSize).fill('flat' as EdgeType));

    this.generateEdges(seed);
  }

  private random(seed: number, index: number): number {
    const x = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  private generateEdges(seed: number): void {
    let edgeIndex = 0;

    // Generate horizontal edges (vertical boundaries between columns)
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize - 1; col++) {
        const leftIsOut = this.random(seed, edgeIndex++) > 0.5;
        this.horizontalEdges[row][col] = leftIsOut ? 'tab-out' : 'tab-in';
      }
    }

    // Generate vertical edges (horizontal boundaries between rows)
    for (let row = 0; row < this.gridSize - 1; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const topIsOut = this.random(seed, edgeIndex++) > 0.5;
        this.verticalEdges[row][col] = topIsOut ? 'tab-out' : 'tab-in';
      }
    }
  }

  private complement(edge: EdgeType): EdgeType {
    if (edge === 'tab-out') return 'tab-in';
    if (edge === 'tab-in') return 'tab-out';
    return 'flat';
  }

  getPieceEdges(row: number, col: number): PuzzleEdges {
    return {
      top: row === 0 ? 'flat' : this.complement(this.verticalEdges[row - 1][col]),
      right: col === this.gridSize - 1 ? 'flat' : this.horizontalEdges[row][col],
      bottom: row === this.gridSize - 1 ? 'flat' : this.verticalEdges[row][col],
      left: col === 0 ? 'flat' : this.complement(this.horizontalEdges[row][col - 1]),
    };
  }

  verify(): boolean {
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const edges = this.getPieceEdges(row, col);

        if (col < this.gridSize - 1) {
          const rightNeighbor = this.getPieceEdges(row, col + 1);
          if (edges.right !== this.complement(rightNeighbor.left)) {
            console.error(`❌ Edge mismatch at (${row},${col})`);
            return false;
          }
        }

        if (row < this.gridSize - 1) {
          const bottomNeighbor = this.getPieceEdges(row + 1, col);
          if (edges.bottom !== this.complement(bottomNeighbor.top)) {
            console.error(`❌ Edge mismatch at (${row},${col})`);
            return false;
          }
        }
      }
    }

    console.log('✅ All edges verified - perfect interlocking!');
    return true;
  }
}

// ========== INTERNAL COMPONENT: JigsawBoard ==========
// Grid board with ghost outline and drop zones

interface JigsawBoardProps {
  gameData: JigsawGameData;
  cellSize: number;
}

function JigsawBoard({ gameData, cellSize }: JigsawBoardProps) {
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
              jigsawBoardStyles.cell,
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
    <View style={[jigsawBoardStyles.board, { width: boardSize, height: boardSize }]}>
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

const jigsawBoardStyles = StyleSheet.create({
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

// ========== INTERNAL COMPONENT: JigsawPiece ==========
// Draggable jigsaw piece with authentic puzzle shape (SVG clipping)

interface JigsawPieceProps {
  piece: JigsawPieceData;
  cellSize: number;
  isCorrect: boolean;
  onDrop: (pieceId: string, position: JigsawPiecePosition) => void;
  disabled?: boolean;
  gridSize: number;
  edgeMap: PuzzleEdgeMap;
  isPuzzleComplete?: boolean;
}

function JigsawPiece({
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
  const tabExtension = cellSize * 0.2;
  const pieceSize = cellSize + tabExtension * 2;
  const centerOffset = tabExtension;

  // Flash effect when piece locks in place
  const flashOpacity = useRef(new Animated.Value(0)).current;

  // Trigger flash when piece becomes correct
  useEffect(() => {
    if (isCorrect && !isPuzzleComplete) {
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

  // Get coordinated edges from edge map
  const edges = useMemo(() => {
    const { row, col } = piece.correctPosition;
    return edgeMap.getPieceEdges(row, col);
  }, [piece.correctPosition, edgeMap]);

  // Generate SVG path for puzzle piece shape
  const generatePuzzlePath = (): string => {
    const size = cellSize;
    const tabWidth = size * 0.3;
    const tabHeight = tabExtension;
    const neckWidth = size * 0.2;
    const bulbRadius = tabHeight * 0.85;
    const offset = centerOffset;

    let path = `M ${offset},${offset}`;

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
        path += ` L ${tabStart},${edgePos}`;
        path += ` C ${tabStart},${edgePos + extension * 0.15} ${neckStart},${edgePos + extension * 0.3} ${neckStart},${edgePos + extension * 0.4}`;
        path += ` C ${neckStart},${edgePos + bulbCenter - bulbRadius} ${mid - bulbRadius},${edgePos + bulbCenter} ${mid},${edgePos + bulbCenter}`;
        path += ` C ${mid + bulbRadius},${edgePos + bulbCenter} ${neckEnd},${edgePos + bulbCenter - bulbRadius} ${neckEnd},${edgePos + extension * 0.4}`;
        path += ` C ${neckEnd},${edgePos + extension * 0.3} ${tabEnd},${edgePos + extension * 0.15} ${tabEnd},${edgePos}`;
      } else {
        path += ` L ${edgePos},${tabStart}`;
        path += ` C ${edgePos + extension * 0.15},${tabStart} ${edgePos + extension * 0.3},${neckStart} ${edgePos + extension * 0.4},${neckStart}`;
        path += ` C ${edgePos + bulbCenter - bulbRadius},${neckStart} ${edgePos + bulbCenter},${mid - bulbRadius} ${edgePos + bulbCenter},${mid}`;
        path += ` C ${edgePos + bulbCenter},${mid + bulbRadius} ${edgePos + bulbCenter - bulbRadius},${neckEnd} ${edgePos + extension * 0.4},${neckEnd}`;
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

  // Calculate initial position
  const getInitialPosition = () => {
    if (piece.currentPosition) {
      return {
        x: piece.currentPosition.col * cellSize - centerOffset,
        y: piece.currentPosition.row * cellSize - centerOffset,
      };
    }
    return piece.initialPixelPosition || { x: 0, y: 0 };
  };

  const initialPos = getInitialPosition();
  const pan = useRef(new Animated.ValueXY(initialPos)).current;
  const currentPosition = useRef(initialPos);

  // Pan responder - LOCK piece when correctly placed
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

        const finalX = currentPosition.current.x + gesture.dx;
        const finalY = currentPosition.current.y + gesture.dy;

        const snapResult = snapToGrid(finalX, finalY);

        if (snapResult) {
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

  // Snap to grid function
  const snapToGrid = (
    x: number,
    y: number
  ): JigsawPiecePosition | null => {
    const col = Math.round((x + centerOffset) / cellSize);
    const row = Math.round((y + centerOffset) / cellSize);

    if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) {
      return null;
    }

    const cellCenterX = col * cellSize + cellSize / 2;
    const cellCenterY = row * cellSize + cellSize / 2;
    const pieceCenterX = x + cellSize / 2;
    const pieceCenterY = y + cellSize / 2;

    const distance = Math.sqrt(
      Math.pow(cellCenterX - pieceCenterX, 2) +
      Math.pow(cellCenterY - pieceCenterY, 2)
    );

    const threshold = cellSize;

    if (distance <= threshold) {
      return { row, col };
    }

    return null;
  };

  // Calculate image offset for this piece
  const { row, col } = piece.correctPosition;
  const imageOffset = {
    left: -(col * cellSize) + centerOffset,
    top: -(row * cellSize) + centerOffset,
  };

  return (
    <Animated.View
      style={[
        jigsawPieceStyles.piece,
        {
          width: pieceSize,
          height: pieceSize,
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
          opacity: isCorrect ? 1 : 0.98,
          zIndex: isCorrect ? 1 : 10,
        },
      ]}
      pointerEvents={isCorrect ? 'none' : 'auto'}
      {...panResponder.panHandlers}
    >
      <Svg height={pieceSize} width={pieceSize} style={jigsawPieceStyles.svgContainer}>
        <Defs>
          <ClipPath id={clipPathId}>
            <Path d={puzzlePath} fill="white" />
          </ClipPath>
        </Defs>

        <SvgImage
          href={{ uri: piece.imageUri }}
          x={imageOffset.left}
          y={imageOffset.top}
          width={cellSize * gridSize}
          height={cellSize * gridSize}
          clipPath={`url(#${clipPathId})`}
          preserveAspectRatio="xMidYMid slice"
        />

        {!isPuzzleComplete && !isCorrect && (
          <Path
            d={puzzlePath}
            fill="none"
            stroke="rgba(0,0,0,0.08)"
            strokeWidth={0.5}
          />
        )}
      </Svg>

      {isCorrect && !isPuzzleComplete && (
        <Animated.View
          style={[
            jigsawPieceStyles.flashOverlay,
            {
              width: pieceSize,
              height: pieceSize,
              opacity: flashOpacity,
            },
          ]}
        />
      )}
    </Animated.View>
  );
}

const jigsawPieceStyles = StyleSheet.create({
  piece: {
    position: 'absolute',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  svgContainer: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'white',
    borderRadius: 4,
  },
});

// ========== INTERNAL COMPONENT: PuzzlePrompt ==========
// Non-intrusive toast prompt (currently unused but available for future use)

interface PuzzlePromptProps {
  visible: boolean;
  reason: 'celebration' | 'idle' | null;
  onAccept: () => void;
  onDismiss: () => void;
}

function PuzzlePrompt({ visible, reason, onAccept, onDismiss }: PuzzlePromptProps) {
  const slideAnim = useRef(new Animated.Value(200)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 200,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, scaleAnim]);

  if (!visible) return null;

  const getMessage = () => {
    if (reason === 'celebration') {
      return {
        emoji: '🎉',
        title: 'Adventure Complete!',
        subtitle: 'Try a puzzle challenge?',
        color: ArchivesTheme.colors.persianOrange,
      };
    } else {
      return {
        emoji: '🧩',
        title: 'Take a Break',
        subtitle: 'Play a quick puzzle?',
        color: ArchivesTheme.colors.shoeBrown,
      };
    }
  };

  const { emoji, title, subtitle, color } = getMessage();

  const handleAccept = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAccept();
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  };

  return (
    <Animated.View
      style={[
        puzzlePromptStyles.container,
        {
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <View style={[puzzlePromptStyles.card, { borderLeftColor: color }]}>
        <View style={[puzzlePromptStyles.iconContainer, { backgroundColor: color + '20' }]}>
          <Text style={puzzlePromptStyles.emoji}>{emoji}</Text>
        </View>

        <View style={puzzlePromptStyles.content}>
          <Text style={puzzlePromptStyles.title}>{title}</Text>
          <Text style={puzzlePromptStyles.subtitle}>{subtitle}</Text>
        </View>

        <View style={puzzlePromptStyles.actions}>
          <TouchableOpacity
            style={[puzzlePromptStyles.button, puzzlePromptStyles.dismissButton]}
            onPress={handleDismiss}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color={ArchivesTheme.colors.shoeBrown} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[puzzlePromptStyles.button, puzzlePromptStyles.acceptButton, { backgroundColor: color }]}
            onPress={handleAccept}
            activeOpacity={0.8}
          >
            <Text style={puzzlePromptStyles.acceptText}>Play</Text>
            <Ionicons name="arrow-forward" size={18} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const puzzlePromptStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emoji: {
    fontSize: 28,
  },
  content: {
    flex: 1,
  },
  title: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.shoeBrown,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: '#7F8C8D',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  button: {
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  dismissButton: {
    backgroundColor: '#F0F0F0',
  },
  acceptButton: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
  },
  acceptText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
});

// ========== MAIN COMPONENT: JigsawGame ==========

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
                {onNextPuzzle ? (gameData.gridSize >= 5 ? 'Finish' : 'Next Puzzle') : 'Continue'}
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
