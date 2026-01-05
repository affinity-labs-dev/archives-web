// useSnapToGrid.ts - Calculate nearest grid position for drag-drop games
// Reusable across Jigsaw, Pattern, and other grid-based games

export interface GridPosition {
  row: number;
  col: number;
}

export interface SnapToGridOptions {
  gridSize: number; // Number of rows/columns (3 for 3x3, 4 for 4x4, etc.)
  cellSize: number; // Size of each cell in pixels
  snapThreshold?: number; // Distance threshold for snapping (default: cellSize / 3)
  boardOffset?: { x: number; y: number }; // Board position on screen (for coordinate conversion)
}

export function useSnapToGrid(options: SnapToGridOptions) {
  // Use entire cell size as threshold - makes snapping much easier
  const { gridSize, cellSize, snapThreshold = cellSize, boardOffset = { x: 0, y: 0 } } = options;

  /**
   * Convert screen coordinates to board-local coordinates
   */
  const screenToLocal = (screenX: number, screenY: number): { x: number; y: number } => {
    return {
      x: screenX - boardOffset.x,
      y: screenY - boardOffset.y,
    };
  };

  /**
   * Convert pixel position to grid position
   */
  const pixelToGrid = (x: number, y: number): GridPosition | null => {
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);

    // Check if within bounds
    if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) {
      return null;
    }

    return { row, col };
  };

  /**
   * Convert grid position to pixel position (top-left of cell)
   */
  const gridToPixel = (position: GridPosition): { x: number; y: number } => {
    return {
      x: position.col * cellSize,
      y: position.row * cellSize,
    };
  };

  /**
   * Calculate snap position for a dragged piece (LOCAL coordinates)
   * Returns snapped pixel coordinates if within threshold, otherwise null
   */
  const calculateSnapPositionLocal = (
    x: number,
    y: number
  ): { x: number; y: number; gridPosition: GridPosition } | null => {
    // Find nearest cell center
    const nearestCol = Math.round(x / cellSize);
    const nearestRow = Math.round(y / cellSize);

    console.log(`🔍 Snap check: local=(${x.toFixed(1)}, ${y.toFixed(1)}) -> cell=(${nearestRow}, ${nearestCol})`);

    // Check if within bounds
    if (
      nearestRow < 0 ||
      nearestRow >= gridSize ||
      nearestCol < 0 ||
      nearestCol >= gridSize
    ) {
      console.log(`⚠️ Out of bounds: row=${nearestRow}, col=${nearestCol}, gridSize=${gridSize}`);
      return null;
    }

    // Calculate distance to cell center
    const cellCenterX = nearestCol * cellSize + cellSize / 2;
    const cellCenterY = nearestRow * cellSize + cellSize / 2;
    const dragCenterX = x + cellSize / 2;
    const dragCenterY = y + cellSize / 2;

    const distance = Math.sqrt(
      Math.pow(cellCenterX - dragCenterX, 2) +
      Math.pow(cellCenterY - dragCenterY, 2)
    );

    console.log(`📊 Distance to cell center: ${distance.toFixed(1)}px (threshold: ${snapThreshold}px)`);

    // Snap if within threshold
    if (distance <= snapThreshold) {
      console.log(`✅ SNAP SUCCESS to (${nearestRow}, ${nearestCol})`);
      return {
        x: nearestCol * cellSize,
        y: nearestRow * cellSize,
        gridPosition: { row: nearestRow, col: nearestCol },
      };
    }

    console.log(`❌ Distance too far - not snapping`);
    return null;
  };

  /**
   * Calculate snap position using SCREEN coordinates
   * Converts to local coordinates and calculates snap
   */
  const calculateSnapPosition = (
    screenX: number,
    screenY: number
  ): { x: number; y: number; gridPosition: GridPosition } | null => {
    const local = screenToLocal(screenX, screenY);
    console.log(`📏 Screen (${screenX.toFixed(1)}, ${screenY.toFixed(1)}) - Board offset (${boardOffset.x}, ${boardOffset.y}) = Local (${local.x.toFixed(1)}, ${local.y.toFixed(1)})`);
    return calculateSnapPositionLocal(local.x, local.y);
  };

  /**
   * Check if two grid positions are equal
   */
  const positionsEqual = (pos1: GridPosition | null, pos2: GridPosition | null): boolean => {
    if (!pos1 || !pos2) return false;
    return pos1.row === pos2.row && pos1.col === pos2.col;
  };

  /**
   * Get all grid positions as array
   */
  const getAllGridPositions = (): GridPosition[] => {
    const positions: GridPosition[] = [];
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        positions.push({ row, col });
      }
    }
    return positions;
  };

  /**
   * Check if a grid position is occupied (helper for game logic)
   */
  const isPositionOccupied = (
    position: GridPosition,
    occupiedPositions: GridPosition[]
  ): boolean => {
    return occupiedPositions.some((pos) => positionsEqual(pos, position));
  };

  return {
    pixelToGrid,
    gridToPixel,
    calculateSnapPosition,
    positionsEqual,
    getAllGridPositions,
    isPositionOccupied,
  };
}
