// types.ts - Shared request/response types for the AI backend API

// ─── Chat ───

export interface ChatRequest {
  message: string;
  conversationHistory: ConversationMessage[];
  imageBase64?: string | null;
  imageMimeType?: string;
  sessionId: string;
  context: ChatContext;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  image?: { base64: string; mimeType: string };
}

export interface ChatContext {
  eraId?: string;
  eraName?: string;
  adventureId?: string;
  currentScreen?: string;
  userProgress?: UserProgressSummary;
  knowledgeContext?: string;
  toolsContext?: ToolsContext;
}

export interface UserProgressSummary {
  totalXP: number;
  completedModules: number;
  averageQuizScore: number;
  recentCompletions: Array<{
    adventureId: string;
    moduleId: string;
    quizScore?: number;
  }>;
  totalModulesAttempted: number;
}

export interface ToolsContext {
  progress: Array<{
    era_id: string;
    adventureId: string | number;
    moduleId: string | number;
    lessonsCompleted: string[];
    quizScore: number;
    quizCorrectAnswers: number;
    isCompleted: boolean;
    quizCompleted: boolean;
    firstAttemptAt: string;
    completedAt?: string;
  }>;
  selectedEra?: string;
  totalXP: number;
  xpByEra?: Record<string, number>;
  streak?: {
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: string;
  };
  firstActivityAt?: string;
  lastActiveAt?: string;
}

export interface ChatResponse {
  content: string;
  sources?: Array<{ uri: string; title: string }>;
  searchQueries?: string[];
  toolsUsed?: string[];
  quotaRemaining: QuotaInfo;
}

// ─── Quiz Explain ───

export interface ExplainRequest {
  questions: QuizQuestion[];
  userAnswers: number[];
  eraName: string;
  adventureName?: string;
}

export interface QuizQuestion {
  question_text: string;
  question_type: 'mcq' | 'trueFalse' | 'fillInBlank';
  answers: Array<{ text: string; is_correct: boolean }>;
}

export interface ExplainResponse {
  explanations: Array<{ explanation: string }>;
  quotaRemaining: QuotaInfo;
}

// ─── Image ───

export interface ImageRequest {
  action: 'generate' | 'edit';
  prompt: string;
  imageBase64?: string;
  imageMimeType?: string;
  eraContext?: { eraName?: string; adventureId?: string };
}

export interface ImageResponse {
  imageBase64: string;
  mimeType: string;
  caption?: string;
  quotaRemaining: QuotaInfo;
}

// ─── Game ───

export interface GameRequest {
  eraId: string;
  gameType: 'jigsaw' | 'timeline' | 'wordsearch' | 'pattern';
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  gridSize?: number;
}

export interface GameResponse {
  imageBase64?: string;
  mimeType?: string;
  title?: string;
  description?: string;
  gameData?: unknown;
  quotaRemaining: QuotaInfo;
}

// ─── Quota ───

export interface QuotaInfo {
  [key: string]: number; // e.g. { chat: 95, image_generate: 9 }
}

// ─── Auth (attached to request by auth hook) ───

export interface AuthPayload {
  userId: string;
  isSubscriber: boolean;
}

// ─── Error ───

export interface ErrorResponse {
  code: string;
  message: string;
  quotaRemaining?: QuotaInfo;
  resetDate?: string;
}
