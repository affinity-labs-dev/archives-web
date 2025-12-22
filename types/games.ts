// Game Type Definitions
// Modular data contracts for AI-generated mini-games

// ============================================
// GAME MODES
// ============================================

export type GameMode = 'practice' | 'challenge';

export type GameDifficulty = 'easy' | 'medium' | 'hard';

export type GameType = 'jigsaw' | 'timeline' | 'wordsearch' | 'pattern';

// ============================================
// JIGSAW PUZZLE
// ============================================

export interface JigsawPiecePosition {
  row: number;
  col: number;
}

export interface JigsawPieceData {
  id: string;
  correctPosition: JigsawPiecePosition;
  currentPosition: JigsawPiecePosition | null; // null = not placed on grid
  imageUri: string; // Cropped piece image
  initialPixelPosition?: { x: number; y: number }; // Initial position around board (for pieces not on grid)
}

export interface JigsawGameData {
  type: 'jigsaw';
  difficulty: GameDifficulty;
  imageUrl: string; // Full image URL
  gridSize: 3 | 4 | 5 | 6; // 3x3=9 pieces, 4x4=16, 5x5=25, 6x6=36
  pieces: JigsawPieceData[];
  topic: string; // "Abbasid Architecture", etc.
}

// ============================================
// TIMELINE PUZZLE
// ============================================

export interface TimelineEvent {
  id: string;
  title: string;
  date: string; // "750 CE" or "820-833 CE"
  timestamp: number; // For sorting (year as number)
  description: string;
  imageUrl?: string;
}

export interface TimelineGameData {
  type: 'timeline';
  difficulty: GameDifficulty;
  events: TimelineEvent[];
  topic: string;
}

// ============================================
// WORD SEARCH PUZZLE
// ============================================

export interface WordSearchWord {
  word: string;
  found: boolean;
  startPosition?: { row: number; col: number };
  endPosition?: { row: number; col: number };
  direction?: 'horizontal' | 'vertical' | 'diagonal';
}

export interface WordSearchGameData {
  type: 'wordsearch';
  difficulty: GameDifficulty;
  grid: string[][]; // 2D array of letters
  words: WordSearchWord[];
  topic: string;
}

// ============================================
// PATTERN MATCHING PUZZLE
// ============================================

export interface PatternTile {
  id: string;
  patternId: string; // Group ID for matching tiles
  imageUrl: string;
  rotation: 0 | 90 | 180 | 270;
  position: { row: number; col: number } | null;
}

export interface PatternGameData {
  type: 'pattern';
  difficulty: GameDifficulty;
  gridSize: number; // 4x4, 6x6, 8x8
  tiles: PatternTile[];
  completedPattern: string; // Reference image of completed pattern
  topic: string; // "Islamic Geometric Art"
}

// ============================================
// UNIVERSAL GAME DATA
// ============================================

export type GameData =
  | JigsawGameData
  | TimelineGameData
  | WordSearchGameData
  | PatternGameData;

// ============================================
// GAME RESULT
// ============================================

export interface GameResult {
  completed: boolean;
  mode: GameMode;
  difficulty: GameDifficulty;
  timeElapsed?: number; // Seconds (only for challenge mode)
  score: number; // 0-100
  xpEarned: number;
  bonusXP?: number; // Time bonus for challenge mode
  perfectCompletion?: boolean; // Completed without hints
}

// ============================================
// GAME STATE (for hooks)
// ============================================

export interface GameState {
  isPlaying: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  startTime: number | null;
  endTime: number | null;
  hintsUsed: number;
  movesCount: number;
}

// ============================================
// AI GENERATOR REQUEST
// ============================================

export interface GameGenerationRequest {
  type: GameType;
  topic: string; // "Abbasid Golden Age", "Umayyad Architecture"
  difficulty: GameDifficulty;
  eraId?: string; // Optional: Filter to specific era
  adventureId?: string; // Optional: Filter to specific adventure
}

// ============================================
// XP CALCULATION CONSTANTS
// ============================================

export const GAME_XP_REWARDS = {
  practice: {
    base: 25,
  },
  challenge: {
    base: 50,
    timeBonuses: {
      legendary: 50, // Under 30s
      excellent: 30, // Under 45s
      good: 20, // Under 60s
    },
  },
};

// ============================================
// DIFFICULTY SETTINGS
// ============================================

export const DIFFICULTY_SETTINGS = {
  jigsaw: {
    easy: { gridSize: 3 as const }, // 3x3 = 9 pieces
    medium: { gridSize: 4 as const }, // 4x4 = 16 pieces
    hard: { gridSize: 5 as const }, // 5x5 = 25 pieces
  },
  timeline: {
    easy: { eventCount: 4 },
    medium: { eventCount: 6 },
    hard: { eventCount: 8 },
  },
  wordsearch: {
    easy: { gridSize: 10, wordCount: 5 },
    medium: { gridSize: 15, wordCount: 8 },
    hard: { gridSize: 20, wordCount: 12 },
  },
  pattern: {
    easy: { gridSize: 4 },
    medium: { gridSize: 6 },
    hard: { gridSize: 8 },
  },
};
