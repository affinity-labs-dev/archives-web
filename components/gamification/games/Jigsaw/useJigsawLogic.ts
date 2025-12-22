// useJigsawLogic.ts - Core game logic for jigsaw puzzle
// Handles piece shuffling, placement, win condition

import { useState, useEffect, useCallback } from 'react';
import type { JigsawGameData, JigsawPieceData, JigsawPiecePosition } from '@/types/games';

interface UseJigsawLogicProps {
  gameData: JigsawGameData;
  cellSize: number; // Size of each grid cell in pixels
  onComplete?: () => void;
}

export function useJigsawLogic({ gameData, cellSize, onComplete }: UseJigsawLogicProps) {
  const [pieces, setPieces] = useState<JigsawPieceData[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [correctPlacements, setCorrectPlacements] = useState(0);

  // Initialize and shuffle pieces
  useEffect(() => {
    const shuffledPieces = shufflePieces(gameData.pieces);
    setPieces(shuffledPieces);

    // Count pre-placed correct pieces (the hint piece)
    const initialCorrectCount = shuffledPieces.filter((piece) => {
      if (!piece.currentPosition) return false;
      return (
        piece.currentPosition.row === piece.correctPosition.row &&
        piece.currentPosition.col === piece.correctPosition.col
      );
    }).length;
    setCorrectPlacements(initialCorrectCount);
    console.log(`🎯 Pre-placed ${initialCorrectCount} hint piece(s)`);
  }, [gameData]);

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

      // Place other pieces around the board (TOP and BOTTOM only)
      // Create random position outside the board area
      const side = Math.floor(Math.random() * 2); // 0=above, 1=below
      let x = 0;
      let y = 0;

      const margin = 30; // Minimum distance from board edge
      const spread = 80; // How far pieces can be from board

      if (side === 0) {
        // Above board
        x = Math.random() * (boardSize - pieceSize);
        y = -(pieceSize + margin + Math.random() * spread);
      } else {
        // Below board
        x = Math.random() * (boardSize - pieceSize);
        y = boardSize + margin + Math.random() * spread;
      }

      return {
        ...piece,
        currentPosition: null, // Not on grid yet
        initialPixelPosition: { x, y },
      };
    });
  };

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
          setCorrectPlacements((prev) => Math.max(0, prev - 1));
          console.log(`⬇️ Piece moved from correct position`);
        }

        return updatedPieces;
      });
    },
    [gameData.pieces.length, onComplete]
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
  };
}
