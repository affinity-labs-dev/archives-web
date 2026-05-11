// AIService.ts - Now proxies through backend instead of calling Gemini directly
// All AI calls go through the authenticated backend API

import { aiRequest, AIBackendError } from '@/services/api';
import type { Question } from '@/components/shared/types';
import AppLogger from '@/services/AppLogger';

// Response type from backend
interface AIExplanationResponse {
  explanation: string;
  relatedTopic?: string;
}

// Web search source from Google Search grounding
export interface WebSearchSource {
  uri: string;
  title: string;
}

// Chat response with optional web search sources
export interface ChatResponseWithSources {
  text: string;
  sources?: WebSearchSource[];
  searchQueries?: string[];
  suggestedFollowUps?: string[];
}

// Request params for quiz explanation
interface QuizExplanationRequest {
  questionText: string;
  correctAnswer: string;
  userAnswer: string;
  questionType: 'mcq' | 'trueFalse' | 'fillInBlank';
  eraName: string;
  adventureName?: string;
  userLevel?: 'beginner' | 'intermediate' | 'advanced';
  isCorrect?: boolean;
}

class AIService {
  private getToken: (() => Promise<string | null>) | null = null;

  /** Set the token getter (called from AIContext when Clerk is available) */
  setTokenGetter(getter: () => Promise<string | null>): void {
    this.getToken = getter;
  }

  /**
   * Check if AI service is available
   */
  isAvailable(): boolean {
    return this.getToken !== null;
  }

  private async request<T>(path: string, body: object): Promise<T> {
    if (!this.getToken) throw new Error('AI Service not initialized. Call setTokenGetter first.');
    return aiRequest<T>(path, body, this.getToken);
  }

  // ─── Quiz Explanations ───

  /**
   * Generate personalized explanation for a quiz question
   */
  async getQuizExplanation(req: QuizExplanationRequest): Promise<AIExplanationResponse> {
    // Single explanation — wrap in batch format for backend
    try {
      const result = await this.request<{ explanations: AIExplanationResponse[] }>('/ai/explain', {
        questions: [{
          question_text: req.questionText,
          question_type: req.questionType,
          answers: [
            { text: req.correctAnswer, is_correct: true },
            { text: req.userAnswer, is_correct: false },
          ],
        }],
        userAnswers: [req.isCorrect ? 0 : 1],
        eraName: req.eraName,
        adventureName: req.adventureName,
      });
      return result.explanations[0] || { explanation: 'Unable to generate explanation.' };
    } catch (error) {
      AppLogger.error('ai', 'Quiz explanation error', {}, error instanceof Error ? error : new Error(String(error)));
      return { explanation: `The correct answer is "${req.correctAnswer}". Review the lesson for more details.` };
    }
  }

  /**
   * Generate explanations for all questions in a single API call (batched).
   */
  async getBatchedExplanations(
    questions: Question[],
    userAnswers: number[],
    context: {
      eraName: string;
      adventureName?: string;
      userLevel?: string;
    }
  ): Promise<AIExplanationResponse[]> {
    try {
      const result = await this.request<{ explanations: AIExplanationResponse[] }>('/ai/explain', {
        questions: questions.map(q => ({
          question_text: q.question_text,
          question_type: q.question_type,
          answers: q.answers,
        })),
        userAnswers,
        eraName: context.eraName,
        adventureName: context.adventureName,
      });
      return result.explanations;
    } catch (error) {
      AppLogger.error('ai', 'Batched explanation error', {}, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Generate explanations for multiple questions sequentially (one API call per question).
   * Primarily used as a fallback when getBatchedExplanations() fails.
   * Backend handles batching — just call the same endpoint.
   */
  async getMultipleExplanations(
    questions: Question[],
    userAnswers: number[],
    context: {
      eraName: string;
      adventureName?: string;
      userLevel?: string;
    }
  ): Promise<AIExplanationResponse[]> {
    return this.getBatchedExplanations(questions, userAnswers, context);
  }

  // ─── Chat ───

  /**
   * Get chat response for general conversation
   * Now proxied through backend which handles RAG, web search, and function calling
   */
  async getChatResponse(params: {
    userMessage: string;
    conversationHistory: Array<{
      role: 'user' | 'assistant';
      content: string;
      image?: { base64: string; mimeType: string };
    }>;
    context?: {
      eraId?: string;
      eraName?: string;
      adventureId?: string;
      currentScreen?: string;
    };
    userProgress?: {
      totalXP: number;
      completedModules: number;
      averageQuizScore: number;
      recentCompletions: Array<{
        adventureId: string;
        moduleId: string;
        quizScore?: number;
      }>;
      totalModulesAttempted: number;
    };
    // Knowledge context - actual lesson content the user has learned
    knowledgeContext?: string;
    // Enable RAG tools for dynamic content retrieval
    enableRAG?: boolean;
    // Enable Google Search grounding for real-time web information
    enableWebSearch?: boolean;
    // RAG tools context (user progress data for function calling)
    toolsContext?: any;
  }): Promise<ChatResponseWithSources> {
    try {
      const result = await this.request<{
        content: string;
        sources?: WebSearchSource[];
        searchQueries?: string[];
        suggestedFollowUps?: string[];
      }>('/ai/chat', {
        message: params.userMessage,
        conversationHistory: params.conversationHistory,
        sessionId: Date.now().toString(),
        context: {
          ...params.context,
          userProgress: params.userProgress,
          knowledgeContext: params.knowledgeContext,
          toolsContext: params.toolsContext,
        },
      });

      return {
        text: result.content,
        sources: result.sources,
        searchQueries: result.searchQueries,
        suggestedFollowUps: result.suggestedFollowUps,
      };
    } catch (error) {
      AppLogger.error('ai', 'Chat error', {}, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // ─── Image Generation ───

  /**
   * Generate a historical image based on user prompt
   * Proxied through backend which handles Gemini image model
   */
  async generateImage(params: {
    prompt: string;
    context?: {
      eraName?: string;
      adventureId?: string;
    };
  }): Promise<{ imageBase64: string; mimeType: string; caption?: string } | null> {
    try {
      const result = await this.request<{
        imageBase64: string;
        mimeType: string;
        caption?: string;
      }>('/ai/image', {
        action: 'generate',
        prompt: params.prompt,
        eraContext: params.context,
      });
      return result;
    } catch (error) {
      AppLogger.error('ai', 'Image generation error', {}, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // ─── Image Editing ───

  /**
   * Edit/transform an uploaded image based on user prompt
   * Example: "Put me in historical Islamic clothing"
   */
  async editImage(params: {
    imageBase64: string;
    mimeType: string;
    editPrompt: string;
    context?: {
      eraName?: string;
      adventureId?: string;
    };
  }): Promise<{ imageBase64: string; mimeType: string; caption?: string } | null> {
    try {
      const result = await this.request<{
        imageBase64: string;
        mimeType: string;
        caption?: string;
      }>('/ai/image', {
        action: 'edit',
        prompt: params.editPrompt,
        imageBase64: params.imageBase64,
        imageMimeType: params.mimeType,
        eraContext: params.context,
      });
      return result;
    } catch (error) {
      AppLogger.error('ai', 'Image edit error', {}, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // ─── Image Analysis (via chat endpoint with image) ───

  /**
   * Analyze an uploaded image with optional text prompt
   * Uses the chat endpoint with inline image data
   */
  async analyzeImage(params: {
    imageBase64: string;
    mimeType: string;
    userMessage?: string;
    context?: {
      eraName?: string;
      adventureId?: string;
    };
  }): Promise<string> {
    try {
      const result = await this.request<{ content: string }>('/ai/chat', {
        message: params.userMessage || 'Please analyze this image and provide historical context.',
        conversationHistory: [],
        imageBase64: params.imageBase64,
        imageMimeType: params.mimeType,
        sessionId: Date.now().toString(),
        context: { eraName: params.context?.eraName },
      });
      return result.content;
    } catch (error) {
      AppLogger.error('ai', 'Image analysis error', {}, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // ─── Detection helpers (stay on client — UI logic) ───

  /**
   * Check if a message is requesting image generation
   * More flexible matching to handle variations like "generate an image", "create the picture", etc.
   */
  isImageRequest(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Check for action + image combinations
    const actionWords = ['generate', 'create', 'make', 'draw', 'show', 'visualize', 'produce'];
    const imageWords = ['image', 'picture', 'illustration', 'visual', 'artwork', 'scene'];

    const hasAction = actionWords.some(word => lowerMessage.includes(word));
    const hasImageWord = imageWords.some(word => lowerMessage.includes(word));

    if (hasAction && hasImageWord) {
      console.log('🎨 [AIService] Image request detected via action+image pattern');
      return true;
    }

    // Also check for direct phrases
    const directPhrases = [
      'picture of',
      'illustration of',
      'image of',
      'draw me',
      'show me what',
    ];

    const hasDirectPhrase = directPhrases.some(phrase => lowerMessage.includes(phrase));
    if (hasDirectPhrase) {
      console.log('🎨 [AIService] Image request detected via direct phrase');
      return true;
    }

    return false;
  }

  /**
   * Check if a message is requesting image editing (vs just analysis)
   */
  isImageEditRequest(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    const editKeywords = [
      'put me in', 'dress me', 'make me', 'transform me', 'show me as',
      'imagine me', 'place me', 'edit', 'change my', 'add to my',
      'make this', 'turn this into', 'convert', 'style me',
      'historical clothes', 'old clothes', 'traditional', 'costume',
    ];

    return editKeywords.some(keyword => lowerMessage.includes(keyword));
  }
}

// Export singleton instance
export const aiService = new AIService();
