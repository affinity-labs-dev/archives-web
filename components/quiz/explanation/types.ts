// Shared types for the AIQuizExplanation bottom sheet.

export interface ExplanationItem {
  questionNumber: number;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  aiExplanation?: string;
  loading: boolean;
  error?: string;
}
