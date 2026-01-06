// useJigsawLogic.ts - Core game logic for jigsaw puzzle
// Handles piece shuffling, placement, win condition

import { useState, useEffect, useCallback } from 'react';
import type { JigsawGameData, JigsawPieceData, JigsawPiecePosition } from '@/gamification/types/games';

interface UseJigsawLogicProps {
  gameData: JigsawGameData;
  cellSize: number; // Size of each grid cell in pixels
  onComplete?: () => void;
  onNearCompletion?: () => void;
}

export function useJigsawLogic({ gameData, cellSize, onComplete, onNearCompletion }: UseJigsawLogicProps) {
  const [pieces, setPieces] = useState<JigsawPieceData[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [correctPlacements, setCorrectPlacements] = useState(0);
  const [hasTriggeredPreload, setHasTriggeredPreload] = useState(false);

  // Piece grouping system - track which pieces are connected
  const [pieceGroups, setPieceGroups] = useState<Map<string, Set<string>>>(new Map()); // groupId -> Set of pieceIds
  const [pieceToGroup, setPieceToGroup] = useState<Map<string, string>>(new Map()); // pieceId -> groupId

  // Initialize and shuffle pieces
  useEffect(() => {
    console.log('🔄 [useJigsawLogic] Initializing puzzle with', gameData.pieces.length, 'pieces');
    const shuffledPieces = shufflePieces(gameData.pieces);
    setPieces(shuffledPieces);
    setIsComplete(false);
    setHasTriggeredPreload(false); // Reset preload trigger for new puzzle

    // Count pre-placed correct pieces (the hint piece)
    const initialCorrectCount = shuffledPieces.filter((piece) => {
      if (!piece.currentPosition) return false;
      return (
        piece.currentPosition.row === piece.correctPosition.row &&
        piece.currentPosition.col === piece.correctPosition.col
      );
    }).length;
    setCorrectPlacements(initialCorrectCount);
    console.log(`🎯 [useJigsawLogic] Shuffled pieces - Pre-placed ${initialCorrectCount} hint piece(s)`);
  }, [gameData]);

  // Trigger preload at halfway point for maximum prep time
  useEffect(() => {
    const totalPieces = gameData.pieces.length;
    const threshold = Math.ceil(totalPieces / 2); // Trigger at 50% completion

    if (!hasTriggeredPreload && correctPlacements >= threshold && correctPlacements < totalPieces) {
      console.log(`🔔 [useJigsawLogic] Halfway done! (${correctPlacements}/${totalPieces}) - Triggering preload`);
      console.log(`🔔 [useJigsawLogic] onNearCompletion callback exists:`, !!onNearCompletion);
      setHasTriggeredPreload(true);
      if (onNearCompletion) {
        console.log(`🚀 [useJigsawLogic] Calling onNearCompletion NOW!`);
        onNearCompletion();
      } else {
        console.warn(`⚠️ [useJigsawLogic] onNearCompletion is undefined!`);
      }
    }
  }, [correctPlacements, gameData.pieces.length, hasTriggeredPreload, onNearCompletion]);

  // Shuffle pieces - place them AROUND the board (not on it)
  // Pre-place one piece correctly as a hint
  const shufflePieces = (originalPieces: JigsawPieceData[]): JigsawPieceData[] => {
    const boardSize = gameData.gridSize * cellSize;
    const pieceSize = cellSize;

    // Randomly select one piece to pre-place as hint (not the first or last piece)
    const hintPieceIndex = Math.floor(Math.random() * (originalPieces.length - 2)) + 1;

    return originalPieces.map((piece, index) => {
      // Pre-place hint piece in correct position
      if (index === hintPieceIndex) {
        return {
          ...piece,
          currentPosition: piece.correctPosition,
          initialPixelPosition: undefined,
        };
      }

      // Place pieces on top and bottom with better distribution
      // 30% on top, 70% on bottom (to avoid crowding header)
      const placeOnTop = Math.random() < 0.3; // 30% chance for top
      let x = 0;
      let y = 0;

      const margin = 20; // Minimum distance from board edge
      const topSpread = 40; // Smaller spread for top (limited space)
      const bottomSpread = 80; // Larger spread for bottom (more space)

      // Horizontal position (same for both top and bottom)
      x = Math.random() * (boardSize - pieceSize);

      if (placeOnTop) {
        // Top side (with margin to avoid header)
        y = -(pieceSize + margin + Math.random() * topSpread);
      } else {
        // Bottom side (with margin to avoid instructions)
        y = boardSize + margin + Math.random() * bottomSpread;
      }

      return {
        ...piece,
        currentPosition: null, // Not on grid yet
        initialPixelPosition: { x, y },
      };
    });
  };

  // Helper: Get adjacent positions (up, down, left, right)
  const getAdjacentPositions = useCallback((position: JigsawPiecePosition): JigsawPiecePosition[] => {
    const adjacent: JigsawPiecePosition[] = [];
    const { row, col } = position;
    const gridSize = gameData.gridSize;

    // Up
    if (row > 0) adjacent.push({ row: row - 1, col });
    // Down
    if (row < gridSize - 1) adjacent.push({ row: row + 1, col });
    // Left
    if (col > 0) adjacent.push({ row, col: col - 1 });
    // Right
    if (col < gridSize - 1) adjacent.push({ row, col: col + 1 });

    return adjacent;
  }, [gameData.gridSize]);

  // Helper: Find piece at position
  const findPieceAtPosition = useCallback((position: JigsawPiecePosition, pieceList: JigsawPieceData[]): JigsawPieceData | undefined => {
    return pieceList.find(
      (p) =>
        p.currentPosition &&
        p.currentPosition.row === position.row &&
        p.currentPosition.col === position.col
    );
  }, []);

  // Helper: Check if piece is correctly placed
  const isPieceCorrectAtPosition = useCallback((piece: JigsawPieceData): boolean => {
    if (!piece.currentPosition) return false;
    return (
      piece.currentPosition.row === piece.correctPosition.row &&
      piece.currentPosition.col === piece.correctPosition.col
    );
  }, []);

  // Helper: Merge two groups
  const mergeGroups = useCallback((groupId1: string, groupId2: string) => {
    setPieceGroups((prevGroups) => {
      const newGroups = new Map(prevGroups);
      const group1 = newGroups.get(groupId1);
      const group2 = newGroups.get(groupId2);

      if (!group1 || !group2) return prevGroups;

      // Merge group2 into group1
      group2.forEach((pieceId) => group1.add(pieceId));

      // Remove group2
      newGroups.delete(groupId2);
      newGroups.set(groupId1, group1);

      return newGroups;
    });

    // Update piece-to-group mapping
    setPieceToGroup((prevMap) => {
      const newMap = new Map(prevMap);
      const group2Pieces = pieceGroups.get(groupId2);

      if (group2Pieces) {
        group2Pieces.forEach((pieceId) => {
          newMap.set(pieceId, groupId1);
        });
      }

      return newMap;
    });

    console.log(`🔗 [useJigsawLogic] Merged groups: ${groupId2} -> ${groupId1}`);
  }, [pieceGroups]);

  // Handle piece placement
  const placePiece = useCallback(
    (pieceId: string, position: JigsawPiecePosition) => {
      setPieces((prevPieces) => {
        const piece = prevPieces.find((p) => p.id === pieceId);
        if (!piece) return prevPieces;

        // Check if piece was already correct before this move
        const wasCorrect =
          piece.currentPosition &&
          piece.currentPosition.row === piece.correctPosition.row &&
          piece.currentPosition.col === piece.correctPosition.col;

        // Check if new placement is correct
        const isNowCorrect =
          position.row === piece.correctPosition.row &&
          position.col === piece.correctPosition.col;

        // Update pieces
        const updatedPieces = prevPieces.map((p) => {
          if (p.id === pieceId) {
            return {
              ...p,
              currentPosition: position,
            };
          }
          return p;
        });

        // Update correct placements count
        if (isNowCorrect && !wasCorrect) {
          // Piece became correct
          setCorrectPlacements((prev) => {
            const newCount = prev + 1;
            console.log(`✅ Correct placement! ${newCount}/${gameData.pieces.length}`);

            // Check for adjacent correct pieces to merge groups
            const adjacentPositions = getAdjacentPositions(position);
            const adjacentCorrectPieces = adjacentPositions
              .map((pos) => findPieceAtPosition(pos, updatedPieces))
              .filter((p) => p && isPieceCorrectAtPosition(p));

            if (adjacentCorrectPieces.length > 0) {
              // Create or merge groups
              const currentGroup = pieceToGroup.get(pieceId);
              const groupsToMerge = new Set<string>();

              // Find all groups from adjacent pieces
              adjacentCorrectPieces.forEach((adjPiece) => {
                if (adjPiece) {
                  const adjGroup = pieceToGroup.get(adjPiece.id);
                  if (adjGroup) {
                    groupsToMerge.add(adjGroup);
                  }
                }
              });

              if (groupsToMerge.size > 0) {
                // Merge all groups together
                const groupIds = Array.from(groupsToMerge);
                const mainGroupId = currentGroup || groupIds[0];

                // Add current piece to main group if not already in a group
                if (!currentGroup) {
                  setPieceGroups((prev) => {
                    const newGroups = new Map(prev);
                    if (!newGroups.has(mainGroupId)) {
                      newGroups.set(mainGroupId, new Set([pieceId]));
                    } else {
                      newGroups.get(mainGroupId)!.add(pieceId);
                    }
                    return newGroups;
                  });

                  setPieceToGroup((prev) => {
                    const newMap = new Map(prev);
                    newMap.set(pieceId, mainGroupId);
                    return newMap;
                  });
                }

                // Merge all other groups into main group
                groupIds.forEach((gId) => {
                  if (gId !== mainGroupId) {
                    mergeGroups(mainGroupId, gId);
                  }
                });

                console.log(`🔗 [useJigsawLogic] Piece ${pieceId} merged into group ${mainGroupId}`);
              } else {
                // No adjacent groups - create new group for this piece
                const newGroupId = pieceId; // Use piece ID as group ID
                setPieceGroups((prev) => {
                  const newGroups = new Map(prev);
                  newGroups.set(newGroupId, new Set([pieceId]));
                  return newGroups;
                });

                setPieceToGroup((prev) => {
                  const newMap = new Map(prev);
                  newMap.set(pieceId, newGroupId);
                  return newMap;
                });

                console.log(`🆕 [useJigsawLogic] Created new group ${newGroupId} for piece ${pieceId}`);
              }
            } else {
              // No adjacent correct pieces - create single-piece group
              const newGroupId = pieceId;
              setPieceGroups((prev) => {
                const newGroups = new Map(prev);
                newGroups.set(newGroupId, new Set([pieceId]));
                return newGroups;
              });

              setPieceToGroup((prev) => {
                const newMap = new Map(prev);
                newMap.set(pieceId, newGroupId);
                return newMap;
              });
            }

            // Check win condition
            if (newCount === gameData.pieces.length) {
              setIsComplete(true);
              if (onComplete) {
                setTimeout(() => {
                  onComplete();
                }, 300);
              }
            }
            return newCount;
          });
        } else if (wasCorrect && !isNowCorrect) {
          // Piece became incorrect (user moved it away)
          // Remove from group
          const currentGroup = pieceToGroup.get(pieceId);
          if (currentGroup) {
            setPieceGroups((prev) => {
              const newGroups = new Map(prev);
              const group = newGroups.get(currentGroup);
              if (group) {
                group.delete(pieceId);
                if (group.size === 0) {
                  newGroups.delete(currentGroup);
                }
              }
              return newGroups;
            });

            setPieceToGroup((prev) => {
              const newMap = new Map(prev);
              newMap.delete(pieceId);
              return newMap;
            });
          }

          setCorrectPlacements((prev) => Math.max(0, prev - 1));
          console.log(`⬇️ Piece moved from correct position`);
        }

        return updatedPieces;
      });
    },
    [gameData.pieces.length, onComplete, getAdjacentPositions, findPieceAtPosition, isPieceCorrectAtPosition, pieceToGroup, mergeGroups]
  );

  // Check if a position is occupied
  const isPositionOccupied = useCallback(
    (position: JigsawPiecePosition): boolean => {
      return pieces.some(
        (piece) =>
          piece.currentPosition &&
          piece.currentPosition.row === position.row &&
          piece.currentPosition.col === position.col
      );
    },
    [pieces]
  );

  // Check if a piece is correctly placed
  const isPieceCorrect = useCallback(
    (pieceId: string): boolean => {
      const piece = pieces.find((p) => p.id === pieceId);
      if (!piece || !piece.currentPosition) return false;

      return (
        piece.currentPosition.row === piece.correctPosition.row &&
        piece.currentPosition.col === piece.correctPosition.col
      );
    },
    [pieces]
  );

  // Get piece by ID
  const getPiece = useCallback(
    (pieceId: string): JigsawPieceData | undefined => {
      return pieces.find((p) => p.id === pieceId);
    },
    [pieces]
  );

  // Get all unplaced pieces (for the piece tray)
  const getUnplacedPieces = useCallback((): JigsawPieceData[] => {
    return pieces.filter((p) => !p.currentPosition);
  }, [pieces]);

  // Get all placed pieces
  const getPlacedPieces = useCallback((): JigsawPieceData[] => {
    return pieces.filter((p) => p.currentPosition !== null);
  }, [pieces]);

  // Reset game
  const reset = useCallback(() => {
    const shuffledPieces = shufflePieces(gameData.pieces);
    setPieces(shuffledPieces);
    setIsComplete(false);
    setCorrectPlacements(0);
  }, [gameData.pieces]);

  // Calculate progress percentage
  const progressPercentage = Math.round((correctPlacements / gameData.pieces.length) * 100);

  // Get pieces in the same group as given piece
  const getPieceGroup = useCallback((pieceId: string): string[] => {
    const groupId = pieceToGroup.get(pieceId);
    if (!groupId) return [pieceId]; // Solo piece

    const group = pieceGroups.get(groupId);
    return group ? Array.from(group) : [pieceId];
  }, [pieceToGroup, pieceGroups]);

  return {
    pieces,
    isComplete,
    correctPlacements,
    progressPercentage,
    placePiece,
    isPositionOccupied,
    isPieceCorrect,
    getPiece,
    getUnplacedPieces,
    getPlacedPieces,
    reset,
    getPieceGroup, // NEW: Get all pieces in a group
    pieceToGroup, // NEW: Map of piece to group ID
  };
}
