// PuzzleEdgeMap.ts - Generates coordinated edge types for interlocking puzzle pieces
// Ensures adjacent pieces have complementary edges (tab-out matches tab-in)

import type { EdgeType } from './PuzzlePieceShape';

export interface PuzzleEdges {
  top: EdgeType;
  right: EdgeType;
  bottom: EdgeType;
  left: EdgeType;
}

/**
 * Generates a coordinated edge map for all pieces in a puzzle
 * Ensures adjacent pieces have matching/complementary edges
 */
export class PuzzleEdgeMap {
  private horizontalEdges: EdgeType[][]; // Edges between columns (vertical boundaries)
  private verticalEdges: EdgeType[][]; // Edges between rows (horizontal boundaries)
  private gridSize: number;

  constructor(gridSize: number, seed: number = 42) {
    this.gridSize = gridSize;

    // Initialize edge grids
    // Horizontal edges: (gridSize-1) boundaries × gridSize rows
    this.horizontalEdges = Array(gridSize)
      .fill(null)
      .map(() => Array(gridSize - 1).fill('flat' as EdgeType));

    // Vertical edges: gridSize columns × (gridSize-1) boundaries
    this.verticalEdges = Array(gridSize - 1)
      .fill(null)
      .map(() => Array(gridSize).fill('flat' as EdgeType));

    // Generate coordinated edge types
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
        // Randomly decide if left piece has tab-out or tab-in
        const leftIsOut = this.random(seed, edgeIndex++) > 0.5;
        this.horizontalEdges[row][col] = leftIsOut ? 'tab-out' : 'tab-in';
      }
    }

    // Generate vertical edges (horizontal boundaries between rows)
    for (let row = 0; row < this.gridSize - 1; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        // Randomly decide if top piece has tab-out or tab-in
        const topIsOut = this.random(seed, edgeIndex++) > 0.5;
        this.verticalEdges[row][col] = topIsOut ? 'tab-out' : 'tab-in';
      }
    }
  }

  /**
   * Get the complementary edge type
   * tab-out → tab-in, tab-in → tab-out, flat → flat
   */
  private complement(edge: EdgeType): EdgeType {
    if (edge === 'tab-out') return 'tab-in';
    if (edge === 'tab-in') return 'tab-out';
    return 'flat';
  }

  /**
   * Get edges for a specific piece
   * Ensures edges match with adjacent pieces
   */
  getPieceEdges(row: number, col: number): PuzzleEdges {
    return {
      // Top edge
      top:
        row === 0
          ? 'flat'
          : this.complement(this.verticalEdges[row - 1][col]),

      // Right edge
      right:
        col === this.gridSize - 1
          ? 'flat'
          : this.horizontalEdges[row][col],

      // Bottom edge
      bottom:
        row === this.gridSize - 1
          ? 'flat'
          : this.verticalEdges[row][col],

      // Left edge
      left:
        col === 0
          ? 'flat'
          : this.complement(this.horizontalEdges[row][col - 1]),
    };
  }

  /**
   * Verify that all edges match correctly (for debugging)
   */
  verify(): boolean {
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const edges = this.getPieceEdges(row, col);

        // Check right edge matches with right neighbor's left edge
        if (col < this.gridSize - 1) {
          const rightNeighbor = this.getPieceEdges(row, col + 1);
          if (edges.right !== this.complement(rightNeighbor.left)) {
            console.error(
              `❌ Edge mismatch at (${row},${col}): right=${edges.right}, neighbor left=${rightNeighbor.left}`
            );
            return false;
          }
        }

        // Check bottom edge matches with bottom neighbor's top edge
        if (row < this.gridSize - 1) {
          const bottomNeighbor = this.getPieceEdges(row + 1, col);
          if (edges.bottom !== this.complement(bottomNeighbor.top)) {
            console.error(
              `❌ Edge mismatch at (${row},${col}): bottom=${edges.bottom}, neighbor top=${bottomNeighbor.top}`
            );
            return false;
          }
        }
      }
    }

    console.log('✅ All edges verified - perfect interlocking!');
    return true;
  }
}
