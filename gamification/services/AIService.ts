// AIService.ts - Google Gemini API integration for AI-powered quiz explanations
// Provides contextual, personalized learning assistance with RAG (Retrieval Augmented Generation)

import { GoogleGenAI, FunctionCallingConfigMode, Type, FunctionDeclaration, ThinkingLevel } from '@google/genai';
import { Question } from '@/components/shared/types';
import AppLogger from '@/services/AppLogger';
import { aiToolsService, type AIToolsContext } from './AIToolsService';

// Response type from Gemini API
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

// Content-related topics that may benefit from web search (Islamic/Middle Eastern history)
const CONTENT_TOPICS = [
  'islam', 'islamic', 'muslim', 'mosque', 'quran', 'prophet', 'muhammad',
  'umayyad', 'abbasid', 'ottoman', 'caliphate', 'caliph', 'sultan',
  'mecca', 'medina', 'jerusalem', 'damascus', 'baghdad', 'cordoba',
  'middle east', 'arab', 'persian', 'fatimid', 'mamluk', 'moorish',
  'alhambra', 'dome of the rock', 'kaaba', 'hijra', 'ramadan',
  'sahaba', 'companions', 'khadijah', 'aisha', 'fatimah', 'ali',
  'crusade', 'reconquista', 'al-andalus', 'golden age',
  'scholar', 'ibn', 'al-', 'imam', 'sheikh'
];

// Keywords that indicate user wants current/recent information (combined with content topics)
const RECENCY_KEYWORDS = [
  // General recency
  'latest', 'recent', 'new', 'current', 'modern', 'today',
  'discovery', 'found', 'research', 'study', 'archaeological',
  'news', 'update', 'happening', 'search',
  // Archaeology
  'excavation', 'dig', 'artifact', 'ruins',
  // Museum/exhibits
  'museum', 'exhibit', 'exhibition', 'collection',
  // Preservation/heritage
  'unesco', 'heritage', 'restoration', 'preservation',
  // News verbs
  'announce', 'reveal', 'uncover', 'breakthrough'
];

/**
 * Detect if a query needs web search for content-related current information
 * Only triggers for queries about Islamic/Middle Eastern history that need recent info
 * NOT for general news or unrelated topics
 */
function needsWebSearch(query: string): boolean {
  const lowerQuery = query.toLowerCase();

  // First check: Must be related to our content (Islamic/Middle Eastern history)
  const isContentRelated = CONTENT_TOPICS.some(topic => lowerQuery.includes(topic));

  if (!isContentRelated) {
    // Not related to our content - don't use web search
    return false;
  }

  // Second check: User wants recent/current information about the content
  const wantsRecentInfo = RECENCY_KEYWORDS.some(keyword => lowerQuery.includes(keyword));

  return wantsRecentInfo;
}

class AIService {
  private ai: GoogleGenAI | null = null;
  // Flash model for all text operations (chat, quiz, RAG, image analysis)
  private textModel = 'gemini-3-flash-preview';
  // Image model for generating historical images
  private imageModel = 'gemini-3-pro-image-preview';

  constructor() {
    // Get Gemini API key from environment
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

    if (!apiKey) {
      console.warn('⚠️ [AIService] Gemini API key not found. AI features will be disabled.');
    } else {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  /**
   * Check if AI service is available
   */
  isAvailable(): boolean {
    return this.ai !== null;
  }

  /**
   * Generate personalized explanation for a quiz question
   */
  async getQuizExplanation(request: QuizExplanationRequest): Promise<AIExplanationResponse> {
    if (!this.isAvailable() || !this.ai) {
      throw new Error('AI Service is not available. Please configure EXPO_PUBLIC_GEMINI_API_KEY.');
    }

    try {
      // Build the prompt for Gemini
      const prompt = this.buildQuizExplanationPrompt(request);

      if (__DEV__) console.log('🤖 [AIService] Requesting explanation from Gemini...');
      if (__DEV__) console.log('📝 Question:', request.questionText);

      // Call Gemini API using SDK (Flash model for explanations)
      // Note: Gemini 3 uses dynamic thinking by default (high), which consumes tokens
      // Setting thinkingLevel to "low" ensures tokens are used for output, not internal reasoning
      const response = await this.ai.models.generateContent({
        model: this.textModel,
        contents: [{ text: prompt }],
        config: {
          maxOutputTokens: 1024,
          temperature: 1.0, // Gemini 3 recommends keeping temperature at 1.0
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW, // Minimize internal reasoning to preserve output tokens
          },
        }
      });

      if (__DEV__) console.log('📦 [AIService] Full response:', JSON.stringify(response, null, 2));

      // Extract text from response (with safety handling)
      let aiResponse = '';
      const candidate = response.candidates?.[0];
      const finishReason = candidate?.finishReason;

      // 1. Capture whatever text was generated (even if incomplete)
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            aiResponse += part.text;
          }
        }
      }

      // 2. Handle the Finish Reason smartly
      if (finishReason && finishReason !== 'STOP') {
        if (finishReason === 'MAX_TOKENS') {
          // MAX_TOKENS is just truncation - we still accept the partial response
          console.warn('⚠️ [AIService] Response truncated (MAX_TOKENS). Using partial text.');
        } else {
          // This is a REAL block (Safety, Recitation, etc.) where we likely have no text
          console.warn(`⛔ [AIService] Response blocked. Reason: ${finishReason}`);
          if (!aiResponse) {
            if (finishReason === 'SAFETY') {
              aiResponse = '{"explanation": "I cannot answer that due to safety guidelines."}';
            } else if (finishReason === 'RECITATION') {
              aiResponse = '{"explanation": "I cannot reproduce that specific content directly."}';
            } else {
              aiResponse = '{"explanation": "I\'m having trouble generating a response right now."}';
            }
          }
        }
      }

      if (__DEV__) console.log('📝 [AIService] Extracted text:', aiResponse);
      if (__DEV__) console.log('✅ [AIService] Received explanation from Gemini');

      // Parse the response (expecting JSON format)
      return this.parseAIResponse(aiResponse);
    } catch (error) {
      console.error('❌ [AIService] Error getting quiz explanation:', error);

      // Return fallback explanation
      return {
        explanation: `The correct answer is "${request.correctAnswer}". This is an important concept in ${request.eraName} history. Review the lesson content for more details.`,
      };
    }
  }

  /**
   * Build the prompt for Gemini
   */
  private buildQuizExplanationPrompt(request: QuizExplanationRequest): string {
    const { questionText, correctAnswer, userAnswer, questionType, eraName, userLevel = 'intermediate', isCorrect } = request;

    if (isCorrect) {
      // Prompt for correct answers - reinforce and deepen understanding
      return `You're explaining ${eraName} history to a ${userLevel} student who answered correctly.

Question: ${questionText}
Their answer: ${correctAnswer} ✓ (Correct)

Write a helpful explanation in 3-4 sentences that:
1. Reinforces why this answer is correct
2. Provides deeper historical context or an interesting related fact
3. Helps them understand the significance of this concept

STRICT RULES:
- NEVER start with "Actually", "Well", "So", or similar filler words
- Start directly with the historical explanation
- NO praise like "Great job!" or "You got it right!" - they already know it's correct
- End with the historical insight, not fluff
- Be concise and informative only

Write in plain text (NOT JSON). Just the facts, no cheerleading.`;
    } else {
      // Prompt for incorrect answers - explain the mistake
      return `You're explaining ${eraName} history to a ${userLevel} student.

Question: ${questionText}
They answered: ${userAnswer}
Correct answer: ${correctAnswer}

Write a helpful explanation in 3-4 sentences that:
1. Explains why the correct answer is right
2. Adds one interesting historical fact or context

STRICT RULES:
- NEVER start with "Actually", "Well", "So", or similar filler words
- Start directly with the historical explanation
- NO motivational phrases, encouragement, or "keep learning" type endings
- End with the historical fact, not fluff
- Be concise and informative only

Write in plain text (NOT JSON). Just the facts, no cheerleading.`;
    }
  }

  /**
   * Parse AI response from Gemini (handles plain text format)
   */
  private parseAIResponse(aiResponse: string): AIExplanationResponse {
    try {
      // Clean the response - remove markdown code fences and trim
      let cleanedResponse = aiResponse.trim();

      // Remove markdown code fences if present (```json ... ``` or ``` ... ```)
      cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();

      // Try to parse as JSON (for backward compatibility with old responses)
      try {
        const parsed = JSON.parse(cleanedResponse);
        return {
          explanation: parsed.explanation || '',
          relatedTopic: parsed.relatedTopic,
        };
      } catch {
        // Not JSON - treat as plain text (expected format now)
        if (__DEV__) console.log('✅ [AIService] Using plain text explanation format');
        return {
          explanation: cleanedResponse,
        };
      }
    } catch (error) {
      console.warn('⚠️ [AIService] Error parsing AI response:', error);
      return {
        explanation: aiResponse,
      };
    }
  }

  /**
   * Build a single prompt for batched quiz explanations (all questions at once)
   */
  private buildBatchExplanationPrompt(
    questions: Question[],
    userAnswers: number[],
    context: { eraName: string; adventureName?: string; userLevel?: string }
  ): string {
    const { eraName, adventureName, userLevel = 'intermediate' } = context;

    let questionsBlock = '';
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const userAnswerIndex = userAnswers[i];
      const correctAnswerIndex = question.answers.findIndex((a) => a.is_correct);
      const correctAnswer = question.answers[correctAnswerIndex]?.text || 'Unknown';
      const userAnswer = question.answers[userAnswerIndex]?.text || 'No answer';
      const isCorrect = userAnswerIndex === correctAnswerIndex;

      questionsBlock += `\nQ${i + 1}: ${question.question_text}\n`;
      if (isCorrect) {
        questionsBlock += `User answered: ${correctAnswer} ✓ (Correct)\n`;
      } else {
        questionsBlock += `User answered: ${userAnswer} ✗ (Incorrect, correct answer: ${correctAnswer})\n`;
      }
    }

    return `You are explaining ${eraName}${adventureName ? ` (${adventureName})` : ''} history to a ${userLevel} student who just completed a quiz.
Provide a brief explanation for each question below.
${questionsBlock}
For each question, write 3-4 sentences:
- If the student answered correctly: reinforce why that answer is right and add deeper historical context
- If the student answered incorrectly: explain why the correct answer is right and add an interesting historical fact

STRICT RULES:
- NEVER start any explanation with "Actually", "Well", "So", or similar filler words
- Start directly with the historical explanation
- NO praise, motivational phrases, encouragement, or "keep learning" endings
- Be concise and informative only

Return ONLY a JSON array with exactly ${questions.length} objects in order (Q1 first, Q2 second, etc.):
[{ "explanation": "3-4 sentence explanation" }, { "explanation": "..." }, ...]`;
  }

  /**
   * Generate explanations for all questions in a single API call (batched).
   * Falls back to sequential calls via getMultipleExplanations() if:
   * - the response is blocked by content safety filters,
   * - JSON parsing of the batch response fails, or
   * - a non-network error occurs during the API call.
   * Network/auth/rate-limit errors are re-thrown for the caller to handle.
   */
  async getBatchedExplanations(
    questions: Question[],
    userAnswers: number[],
    context: {
      eraName: string;
      adventureName?: string;
      userLevel?: 'beginner' | 'intermediate' | 'advanced';
    }
  ): Promise<AIExplanationResponse[]> {
    if (!this.isAvailable() || !this.ai) {
      throw new Error('AI Service is not available. Please configure EXPO_PUBLIC_GEMINI_API_KEY.');
    }

    try {
      const prompt = this.buildBatchExplanationPrompt(questions, userAnswers, context);

      if (__DEV__) console.log('🤖 [AIService] Requesting batched explanations for', questions.length, 'questions');

      const response = await this.ai.models.generateContent({
        model: this.textModel,
        contents: [{ text: prompt }],
        config: {
          maxOutputTokens: 2048,
          temperature: 1.0,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });

      // Extract text from response
      let aiResponse = '';
      const candidate = response.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            aiResponse += part.text;
          }
        }
      }

      // Handle blocked responses — allow MAX_TOKENS (truncated but parseable)
      // through to the JSON parser; fall back on safety/recitation blocks
      const finishReason = candidate?.finishReason;
      if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
        AppLogger.warn('ai', 'Batched response blocked by safety filter', { finishReason });
        return this.getMultipleExplanations(questions, userAnswers, context);
      }

      if (__DEV__) console.log('✅ [AIService] Batched response received, parsing JSON array...');

      // Parse JSON array
      const parsed = this.parseBatchResponse(aiResponse, questions.length);
      if (parsed) {
        return parsed;
      }

      // JSON parsing failed — fall back to sequential calls
      AppLogger.warn('ai', 'Batch JSON parse failed, falling back to sequential calls');
      return this.getMultipleExplanations(questions, userAnswers, context);
    } catch (error) {
      // Network/auth/rate-limit errors will also fail sequentially — propagate them
      if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('network') || msg.includes('fetch') || msg.includes('401') ||
            msg.includes('403') || msg.includes('429') || msg.includes('quota')) {
          AppLogger.error('ai', 'Batched explanation network/auth error', {}, error);
          throw error;
        }
      }
      AppLogger.warn('ai', 'Batched explanation error, falling back to sequential', {
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      return this.getMultipleExplanations(questions, userAnswers, context);
    }
  }

  /**
   * Parse a batched JSON array response from Gemini.
   * Returns null if JSON parsing fails or the array length does not match
   * expectedCount (caller should fall back to sequential calls).
   */
  private parseBatchResponse(aiResponse: string, expectedCount: number): AIExplanationResponse[] | null {
    try {
      let cleaned = aiResponse.trim();
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();

      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed) || parsed.length !== expectedCount) {
        AppLogger.warn('ai', 'Batch response shape mismatch', {
          expectedCount,
          actualType: typeof parsed,
          actualLength: Array.isArray(parsed) ? parsed.length : -1,
        });
        return null;
      }

      return parsed.map((item: any) => ({
        explanation: typeof item.explanation === 'string' ? item.explanation : String(item.explanation || ''),
      }));
    } catch {
      AppLogger.warn('ai', 'Batch response JSON parse failed', {
        responsePreview: aiResponse?.substring(0, 200) ?? '(empty)',
        expectedCount,
      });
      return null;
    }
  }

  /**
   * Generate explanations for multiple questions sequentially (one API call per question).
   * Primarily used as a fallback when getBatchedExplanations() fails.
   */
  async getMultipleExplanations(
    questions: Question[],
    userAnswers: number[],
    context: {
      eraName: string;
      adventureName?: string;
      userLevel?: 'beginner' | 'intermediate' | 'advanced';
    }
  ): Promise<AIExplanationResponse[]> {
    const explanations: AIExplanationResponse[] = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const userAnswerIndex = userAnswers[i];

      // Find correct answer
      const correctAnswerIndex = question.answers.findIndex((a) => a.is_correct);
      const correctAnswer = question.answers[correctAnswerIndex]?.text || 'Unknown';
      const userAnswer = question.answers[userAnswerIndex]?.text || 'No answer';
      const isCorrect = userAnswerIndex === correctAnswerIndex;

      // Get AI explanation for ALL answers (both correct and incorrect)
      const explanation = await this.getQuizExplanation({
        questionText: question.question_text,
        correctAnswer,
        userAnswer,
        questionType: question.question_type,
        eraName: context.eraName,
        adventureName: context.adventureName,
        userLevel: context.userLevel,
        isCorrect, // Pass whether answer was correct
      });

      explanations.push(explanation);

      // Add small delay to avoid rate limiting (100ms between requests)
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return explanations;
  }

  /**
   * Get chat response for general conversation
   * Uses RAG (Retrieval Augmented Generation) with function calling to dynamically
   * fetch user progress and lesson content when needed.
   * Now includes Google Search grounding for real-time web information.
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
  }): Promise<ChatResponseWithSources> {
    if (!this.isAvailable()) {
      throw new Error('AI Service is not available. Please configure EXPO_PUBLIC_GEMINI_API_KEY.');
    }

    const { userMessage, conversationHistory = [], context = {}, userProgress, knowledgeContext, enableRAG = true, enableWebSearch = true } = params;

    try {
      console.log('🤖 [AIService] Getting chat response...');
      console.log('💬 User message:', userMessage);
      console.log('🔧 [AIService] RAG enabled:', enableRAG);
      if (knowledgeContext) {
        console.log('📚 [AIService] Knowledge context provided, length:', knowledgeContext.length);
      }

      // Build system prompt with context, user progress, and knowledge context
      const systemPrompt = this.buildChatSystemPrompt(context, userProgress, knowledgeContext);

      // Build conversation history for multi-turn chat
      // Parts can be text or inline image data (for multimodal conversations)
      type ContentPart = { text: string } | { inlineData: { mimeType: string; data: string } };
      const conversationContents: Array<{ role: 'user' | 'model'; parts: ContentPart[] }> = [];

      // Add system prompt as first user message (Gemini doesn't have system role)
      conversationContents.push({
        role: 'user',
        parts: [{ text: systemPrompt + '\n\nPlease acknowledge these guidelines and be ready to help.' }]
      });
      conversationContents.push({
        role: 'model',
        parts: [{ text: 'I understand. I am your educational chatbot for Archives, here to help you learn about Islamic and Middle Eastern history. I will follow all the guidelines provided, including proper Islamic etiquette, historical accuracy, and a warm educational tone. How can I help you today?' }]
      });

      // Add conversation history (including images if present)
      for (const msg of conversationHistory) {
        const parts: ContentPart[] = [{ text: msg.content }];

        // If message has an image, include it as inline data for multimodal context
        if (msg.image?.base64) {
          parts.push({
            inlineData: {
              mimeType: msg.image.mimeType,
              data: msg.image.base64,
            }
          });
        }

        conversationContents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts,
        });
      }

      // Add current user message
      conversationContents.push({
        role: 'user',
        parts: [{ text: userMessage }]
      });

      // Detect if this query needs web search (news, current events, real-time data)
      // NOTE: Gemini API doesn't support combining Google Search with function calling
      // So we need to choose ONE based on query intent
      const queryNeedsSearch = enableWebSearch && needsWebSearch(userMessage);

      // Get tool declarations if RAG is enabled AND we're not doing web search
      const functionTools = (enableRAG && !queryNeedsSearch) ? aiToolsService.getToolDeclarations() : [];

      // Build tools array - either function calling (RAG) OR Google Search (not both)
      const toolsConfig: any[] = [];

      if (queryNeedsSearch) {
        // Use Google Search for real-time/current event queries
        console.log('🔍 [AIService] Query needs web search, using Google Search grounding');
        toolsConfig.push({ googleSearch: {} });
      } else if (functionTools.length > 0) {
        // Use RAG function calling for app knowledge base queries
        console.log('📚 [AIService] Using RAG function calling for knowledge base');
        toolsConfig.push({ functionDeclarations: functionTools });
      }

      // Call Gemini API with either RAG (function calling) or Google Search
      console.log(`🔧 [AIService] Calling Gemini - RAG tools: ${functionTools.length}, Web search: ${queryNeedsSearch}`);

      const response = await this.ai!.models.generateContent({
        model: this.textModel,
        contents: conversationContents,
        config: {
          maxOutputTokens: 2048,
          temperature: 1.0,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
          // Add tools (function calling + Google Search)
          ...(toolsConfig.length > 0 && {
            tools: toolsConfig,
            ...(functionTools.length > 0 && {
              toolConfig: {
                functionCallingConfig: {
                  mode: FunctionCallingConfigMode.AUTO, // Let AI decide when to use tools
                },
              },
            }),
          }),
        }
      });

      // Check if AI wants to call a function
      const candidate = response.candidates?.[0];
      const functionCalls = candidate?.content?.parts?.filter(
        (part: any) => part.functionCall
      );

      if (functionCalls && functionCalls.length > 0 && enableRAG) {
        console.log(`🔧 [AIService] AI requested ${functionCalls.length} function call(s)`);

        // Execute each function call and collect results
        const functionResults: Array<{ functionName: string; response: any }> = [];

        for (const part of functionCalls) {
          const fc = (part as any).functionCall;
          const toolName = fc.name;
          const toolArgs = fc.args || {};

          console.log(`🔧 [AIService] Executing tool: ${toolName}`);

          // Execute the tool
          const result = await aiToolsService.executeTool(toolName, toolArgs);

          functionResults.push({
            functionName: toolName,
            response: result,
          });
        }

        // Add function responses to conversation and get final answer
        const functionResponseParts = functionResults.map(fr => ({
          functionResponse: {
            name: fr.functionName,
            response: fr.response,
          },
        }));

        // Make follow-up call with function results
        console.log('🔧 [AIService] Sending function results back to Gemini...');

        const followUpContents = [
          ...conversationContents,
          {
            role: 'model' as const,
            parts: functionCalls,
          },
          {
            role: 'user' as const,
            parts: functionResponseParts,
          },
        ];

        const followUpResponse = await this.ai!.models.generateContent({
          model: this.textModel,
          contents: followUpContents,
          config: {
            maxOutputTokens: 2048,
            temperature: 1.0,
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.LOW,
            },
          }
        });

        // Extract final text response
        let aiResponse = '';
        const followUpCandidate = followUpResponse.candidates?.[0];

        if (followUpCandidate?.content?.parts) {
          for (const part of followUpCandidate.content.parts) {
            if ((part as any).text) {
              aiResponse += (part as any).text;
            }
          }
        }

        // Handle empty response
        if (!aiResponse) {
          aiResponse = 'I found some information about that. Let me summarize what I know from your learning history.';
        }

        console.log('✅ [AIService] RAG response received, length:', aiResponse.length);
        return { text: aiResponse };
      }

      // No function calls - extract text directly
      let aiResponse = '';
      const finishReason = candidate?.finishReason;

      // Debug: Log raw candidate structure for chat responses
      console.log('🔍 [AIService] RAW CHAT CANDIDATE:', JSON.stringify(candidate, null, 2));

      // 1. Capture whatever text was generated (even if incomplete)
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if ((part as any).text) {
            aiResponse += (part as any).text;
          }
        }
      }

      // 2. Handle the Finish Reason smartly
      if (finishReason && finishReason !== 'STOP') {
        if (finishReason === 'MAX_TOKENS') {
          // MAX_TOKENS is just truncation - we still accept the partial response
          console.warn('⚠️ [AIService] Chat response truncated (MAX_TOKENS). Using partial text.');
        } else {
          // This is a REAL block (Safety, Recitation, etc.) where we likely have no text
          console.warn(`⛔ [AIService] Chat response blocked. Reason: ${finishReason}`);
          if (!aiResponse) {
            if (finishReason === 'SAFETY') {
              aiResponse = 'I cannot answer that due to safety guidelines. Please try a different question.';
            } else if (finishReason === 'RECITATION') {
              aiResponse = 'I cannot reproduce that specific content directly. Could you ask in a different way?';
            } else {
              aiResponse = 'I\'m having trouble generating a response right now. Please try again.';
            }
          }
        }
      }

      // 3. Extract Google Search grounding metadata if available
      const groundingMetadata = (candidate as any)?.groundingMetadata;
      let sources: WebSearchSource[] | undefined;
      let searchQueries: string[] | undefined;

      if (groundingMetadata) {
        console.log('🔍 [AIService] Grounding metadata found');

        // Extract search queries used
        if (groundingMetadata.webSearchQueries) {
          searchQueries = groundingMetadata.webSearchQueries;
          console.log('🔍 [AIService] Search queries:', searchQueries);
        }

        // Extract grounding chunks (sources)
        if (groundingMetadata.groundingChunks) {
          sources = groundingMetadata.groundingChunks
            .filter((chunk: any) => chunk.web?.uri && chunk.web?.title)
            .map((chunk: any) => ({
              uri: chunk.web.uri,
              title: chunk.web.title,
            }));
          console.log('🔍 [AIService] Sources found:', sources?.length || 0);
        }
      }

      console.log('✅ [AIService] Chat response received, length:', aiResponse.length);

      return {
        text: aiResponse,
        sources,
        searchQueries,
      };
    } catch (error) {
      console.error('❌ [AIService] Error getting chat response:', error);
      throw error;
    }
  }

  /**
   * Build system prompt for general chat
   * Comprehensive guidelines for Islamic history education
   */
  private buildChatSystemPrompt(
    context: {
      eraId?: string;
      eraName?: string;
      adventureId?: string;
      currentScreen?: string;
    },
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
    },
    knowledgeContext?: string
  ): string {
    const { eraId, eraName = 'Islamic History', adventureId, currentScreen } = context;

    // Build user progress section
    let progressSection = '';
    if (userProgress) {
      progressSection = `
USER LEARNING PROGRESS:
- Total XP Earned: ${userProgress.totalXP}
- Modules Completed: ${userProgress.completedModules} out of ${userProgress.totalModulesAttempted}
- Average Quiz Score: ${userProgress.averageQuizScore}% (${userProgress.averageQuizScore >= 80 ? 'Excellent!' : userProgress.averageQuizScore >= 60 ? 'Good progress' : 'Needs improvement'})
${userProgress.recentCompletions.length > 0 ? `- Recently Completed: ${userProgress.recentCompletions.map(c => c.adventureId).join(', ')}` : '- Just getting started'}

PERSONALIZATION:
${userProgress.averageQuizScore < 60 ? '- Use simpler language and more detailed explanations\n- Provide encouragement and study tips' : ''}
${userProgress.averageQuizScore >= 80 ? '- User is advanced - can use more sophisticated language\n- Provide deeper historical analysis' : ''}
${userProgress.completedModules === 0 ? '- This user is brand new - be extra welcoming and patient' : ''}
${userProgress.completedModules > 5 ? '- Experienced learner - reference their previous lessons' : ''}
`;
    }

    // Build knowledge context section (actual lesson content user has learned)
    const knowledgeSection = knowledgeContext ? `
KNOWLEDGE CONTEXT (Content user has learned):
${knowledgeContext}
` : '';

    return `You are the official educational chatbot for Archives, a gamified learning app teaching Islamic and Middle Eastern history to children, families, and educators.
Your role is to inform, guide, and support learning while strictly following Islamic-coded norms, historical accuracy, and Archives' brand values.

CURRENT CONTEXT:
- Learning about: ${eraName}
${eraId ? `- Current Era ID: "${eraId}" (IMPORTANT: Use this era ID when calling tools like getLastCompletedModule, searchLessons, getUserProgress to get era-specific results)` : ''}
${adventureId ? `- Current adventure: ${adventureId}` : ''}
${currentScreen ? `- Current screen: ${currentScreen}` : ''}
${progressSection}
${knowledgeSection}

=== 1. ISLAMIC ETIQUETTE & RELIGIOUS CONVENTIONS (MANDATORY) ===
You must always follow these rules:
- Whenever Prophet Muhammad is mentioned, always write: "Prophet Muhammad (peace be upon him)" - Do not shorten, omit, or replace this phrase.
- When mentioning other prophets, use respectful phrasing (e.g., Prophet Musa, Prophet Isa, Prophet Ibrahim).
- When referring to Allah, use respectful capitalization and tone. Avoid casual or flippant language.
- Do not mock, trivialize, dramatize, or fictionalize religious figures, beliefs, rituals, or sacred events.
- Do not generate content that could be interpreted as: Blasphemous, Irreverent, Politically inflammatory, Sectarian or divisive
- Remain neutral, respectful, and educational at all times.

=== 2. TONE & VOICE ===
Your tone must be:
- Educational and informative
- Warm, calm, and respectful
- Simple and clear (7th-grade reading level)
- Neutral and non-judgmental

Avoid:
- Slang, Sarcasm, Emojis
- Overly dramatic or poetic language
- Opinions or moral preaching

You are a trusted guide, not a preacher or entertainer.

=== 3. HISTORICAL ACCURACY & SCOPE ===
- Stick to well-established historical facts.
- If scholars disagree, clearly say: "Historians differ on this, but many agree that..."
- Do not speculate, exaggerate, or invent details.
- If you are unsure, say so honestly.
- Never prioritize excitement over accuracy.

=== 4. CHILD-SAFE & FAMILY-FRIENDLY RULES ===
Archives is used by children and parents. You must:
- Avoid graphic descriptions of violence
- Explain conflicts factually, not emotionally
- Frame battles, deaths, and suffering with restraint and context
- Focus on lessons, outcomes, and historical significance

=== 5. CULTURAL RESPECT & REPRESENTATION ===
- Avoid orientalist stereotypes.
- Do not portray Muslims or Middle Eastern societies as monolithic.
- Highlight diversity of cultures, languages, and traditions across eras.
- Respect all faiths when mentioned (Judaism, Christianity, others).

=== 6. LEARNING-FIRST BEHAVIOR ===
Your default behavior is to:
- Explain concepts simply
- Answer questions clearly
- Encourage curiosity and learning
- Help users understand timelines, people, places, and ideas

You may:
- Ask gentle follow-up questions only to support learning
- Suggest related topics already inside Archives

Do not:
- Promote external opinions
- Give religious rulings (fatwas)
- Engage in debates or modern political commentary

=== 7. RESPONSE STYLE ===
- KEEP RESPONSES SHORT - 1-3 sentences maximum
- Be conversational like texting a friend
- Direct and to the point
- Warm but brief

=== 8. WEB SEARCH CAPABILITY ===
When users ask about RECENT discoveries, research, or news related to Islamic and Middle Eastern history:
- You have access to Google Search to find up-to-date information
- Only use web search for content-related queries (archaeology, new research, recent discoveries about Islamic history)
- Do NOT use web search for general news unrelated to our educational content
- Maintain Archives' respectful and educational tone
- Cite sources when sharing information from the web

Your job is to help users learn history correctly, respectfully, and confidently.`;
  }

  /**
   * Generate a historical image based on user prompt
   * Uses Gemini 3 Pro Image model (Nano Banana Pro)
   */
  async generateImage(params: {
    prompt: string;
    context?: {
      eraName?: string;
      adventureId?: string;
    };
  }): Promise<{ imageBase64: string; mimeType: string; caption?: string } | null> {
    if (!this.isAvailable() || !this.ai) {
      throw new Error('AI Service is not available. Please configure EXPO_PUBLIC_GEMINI_API_KEY.');
    }

    const { prompt, context = {} } = params;

    try {
      console.log('🎨 [AIService] Generating image with Gemini...');
      console.log('📝 Prompt:', prompt);

      // Build enhanced prompt for historical imagery
      const enhancedPrompt = this.buildImagePrompt(prompt, context);

      // Call Gemini Image API (per official Gemini 3 docs)
      const response = await this.ai.models.generateContent({
        model: this.imageModel,
        contents: [{ text: enhancedPrompt }],
        config: {
          // Image generation config per official docs
          imageConfig: {
            aspectRatio: '16:9',
            imageSize: '2K', // Options: 2K, 4K
          },
        }
      });

      console.log('📦 [AIService] Image response received');

      // Extract image from response (with safety handling)
      const candidate = response.candidates?.[0];
      const content = candidate?.content;

      // Handle cases where response is blocked
      if (!content?.parts && candidate?.finishReason) {
        console.warn(`⚠️ [AIService] Image generation blocked. Reason: ${candidate.finishReason}`);
        throw new Error(`Image generation blocked: ${candidate.finishReason}`);
      }

      // Check if we have valid content parts to iterate over
      if (content?.parts) {
        for (const part of content.parts) {
          if (part.inlineData && part.inlineData.data) {
            console.log('✅ [AIService] Image generated successfully');
            return {
              imageBase64: part.inlineData.data,
              mimeType: part.inlineData.mimeType || 'image/png',
              caption: content.parts.find((p: any) => p.text)?.text,
            };
          }
        }
      }

      console.warn('⚠️ [AIService] No image in response');
      return null;
    } catch (error) {
      console.error('❌ [AIService] Error generating image:', error);
      throw error;
    }
  }

  /**
   * Build enhanced prompt for historical image generation
   * Comprehensive guidelines for Islamic-appropriate imagery
   */
  private buildImagePrompt(userPrompt: string, context: { eraName?: string; adventureId?: string }): string {
    const { eraName = 'Islamic History' } = context;

    return `Create a historically accurate, educational image for ${eraName}.

User request: ${userPrompt}

=== 1. ABSOLUTE RELIGIOUS & ISLAMIC VISUAL RULES (MANDATORY) ===
You must NEVER visually depict:
- Prophet Muhammad (peace be upon him) in any form
- Any prophet's face, body, or identifiable physical features
- Allah, angels in anthropomorphic form, or divine presence
- Sacred moments shown directly (e.g. revelation, Miraj)

If a prophet or sacred event is referenced, use symbolic or indirect representation only:
- Landscapes, Architecture
- Light, calligraphy, objects, or environment
- Empty spaces that imply presence without depiction

=== 2. PROPHET & SACRED FIGURE HANDLING ===
When a scene involves a prophet:
- Show environment only (e.g. cave interior, mosque courtyard, desert road)
- If a human figure is required: show from behind, silhouette, or partial framing
- No facial detail, no identifying traits
- Never label or imply a visible figure is the Prophet

=== 3. VISUAL TONE & STYLE ===
All images must feel:
- Educational, Respectful, Calm and dignified
- Historically grounded, Suitable for children

Avoid:
- Fantasy aesthetics, Hyper-dramatic lighting
- Mythical or exaggerated visuals
- Cinematic action poses, Violence-focused framing

=== 4. HISTORICAL ACCURACY & MATERIAL CULTURE ===
Images must reflect:
- Correct architecture, clothing, tools, and environments for the era
- Real geographic landscapes (Arabia, Levant, North Africa, al-Andalus, etc.)
- Period-appropriate materials (stone, stucco, wood, parchment, mosaic)
- If unsure, default to simpler, neutral accuracy rather than embellishment

=== 5. CULTURAL RESPECT & REPRESENTATION ===
- Avoid orientalist tropes (exoticism, sensualism, caricature)
- Depict everyday life with dignity and realism
- Show diversity in age, roles, and settings
- Avoid modern objects, symbols, or anachronisms

=== 6. VIOLENCE & CONFLICT GUIDELINES ===
- Do not show gore, blood, or graphic injury
- Battles, if shown, must be: Distant, Symbolic, Non-graphic
- Focus on movement, banners, landscape, not harm

=== 7. CHILDREN & FAMILY SAFETY ===
Images must be appropriate for:
- Children aged 6+, Classroom use, Family co-learning

Avoid:
- Fear-inducing imagery, Aggressive expressions, Dark or disturbing themes

=== 8. STYLE CONSTRAINTS ===
- Prefer: Painterly realism, Soft lighting, Clear forms, Warm natural palettes
- No exaggerated facial expressions
- No parody or humor

Generate a single high-quality image.`;
  }

  /**
   * Edit/transform an uploaded image based on user prompt
   * Uses Gemini's image model with input image for editing
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
    if (!this.isAvailable() || !this.ai) {
      throw new Error('AI Service is not available. Please configure EXPO_PUBLIC_GEMINI_API_KEY.');
    }

    const { imageBase64, mimeType, editPrompt, context = {} } = params;

    try {
      console.log('✏️ [AIService] Editing image with Gemini...');
      console.log('📝 Edit prompt:', editPrompt);

      // Build enhanced prompt for historical image editing
      const enhancedPrompt = this.buildImageEditPrompt(editPrompt, context);

      // Call Gemini Image API with input image for editing
      const response = await this.ai.models.generateContent({
        model: this.imageModel,
        contents: [
          {
            parts: [
              { text: enhancedPrompt },
              {
                inlineData: {
                  data: imageBase64,
                  mimeType: mimeType,
                },
              },
            ],
          },
        ],
        config: {
          imageConfig: {
            aspectRatio: '1:1', // Square for portrait-style edits
            imageSize: '2K',
          },
        },
      });

      console.log('📦 [AIService] Image edit response received');

      // Extract edited image from response
      const candidate = response.candidates?.[0];
      const content = candidate?.content;

      if (!content?.parts && candidate?.finishReason) {
        console.warn(`⚠️ [AIService] Image edit blocked. Reason: ${candidate.finishReason}`);
        throw new Error(`Image editing blocked: ${candidate.finishReason}`);
      }

      if (content?.parts) {
        for (const part of content.parts) {
          if (part.inlineData && part.inlineData.data) {
            console.log('✅ [AIService] Image edited successfully');
            return {
              imageBase64: part.inlineData.data,
              mimeType: part.inlineData.mimeType || 'image/png',
              caption: content.parts.find((p: any) => p.text)?.text,
            };
          }
        }
      }

      console.warn('⚠️ [AIService] No edited image in response');
      return null;
    } catch (error) {
      console.error('❌ [AIService] Error editing image:', error);
      throw error;
    }
  }

  /**
   * Build prompt for historical image editing
   * Comprehensive guidelines for Islamic-appropriate image transformation
   */
  private buildImageEditPrompt(
    userPrompt: string,
    context: { eraName?: string; adventureId?: string }
  ): string {
    const { eraName = 'Islamic History' } = context;

    return `Edit this photo to create a historically accurate, artistic transformation for ${eraName}.

User request: ${userPrompt}

=== TRANSFORMATION GUIDELINES ===
- Transform the person in the photo according to the request
- Use historically accurate clothing, accessories, and settings from ${eraName}
- Maintain the person's likeness and features
- Period-appropriate materials and designs

=== VISUAL STYLE ===
- Painterly realism with soft lighting
- Warm, natural color palettes
- Clear forms and dignified presentation
- No exaggerated expressions or parody

=== HISTORICAL ACCURACY ===
- Correct architecture, clothing, tools for the era
- Real geographic landscapes (Arabia, Levant, North Africa, al-Andalus)
- Period-appropriate materials (fabric, jewelry, headwear)
- Avoid modern objects or anachronisms

=== SAFETY & RESPECT ===
- Family-friendly (appropriate for children aged 6+)
- Culturally respectful representation
- No orientalist tropes or stereotypes
- Dignified, educational presentation

Generate the edited image.`;
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

  /**
   * Analyze an uploaded image with optional text prompt
   * Uses Gemini's multimodal capabilities
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
    if (!this.isAvailable() || !this.ai) {
      throw new Error('AI Service is not available. Please configure EXPO_PUBLIC_GEMINI_API_KEY.');
    }

    const { imageBase64, mimeType, userMessage, context = {} } = params;

    try {
      console.log('🔍 [AIService] Analyzing image with Gemini...');
      console.log('💬 User message:', userMessage || '(no message)');

      // Build prompt for image analysis
      const analysisPrompt = this.buildImageAnalysisPrompt(userMessage, context);

      // Call Gemini API with multimodal input (text + image)
      const response = await this.ai.models.generateContent({
        model: this.textModel, // Supports vision
        contents: [
          {
            parts: [
              { text: analysisPrompt },
              {
                inlineData: {
                  data: imageBase64,
                  mimeType: mimeType,
                },
              },
            ],
          },
        ],
        config: {
          maxOutputTokens: 1024,
          temperature: 1.0,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });

      // Extract text from response
      let aiResponse = '';
      const candidate = response.candidates?.[0];
      const finishReason = candidate?.finishReason;

      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            aiResponse += part.text;
          }
        }
      }

      // Handle blocked responses
      if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
        console.warn(`⛔ [AIService] Image analysis blocked. Reason: ${finishReason}`);
        if (!aiResponse) {
          aiResponse = 'I cannot analyze this image due to content restrictions. Please try a different image.';
        }
      }

      console.log('✅ [AIService] Image analysis complete, length:', aiResponse.length);
      return aiResponse;
    } catch (error) {
      console.error('❌ [AIService] Error analyzing image:', error);
      throw error;
    }
  }

  /**
   * Build prompt for image analysis
   */
  private buildImageAnalysisPrompt(
    userMessage?: string,
    context?: { eraName?: string; adventureId?: string }
  ): string {
    const { eraName = 'Islamic History' } = context || {};

    const basePrompt = `You are a knowledgeable Islamic history tutor. Analyze this image and provide helpful, educational information.

CONTEXT:
- The user is learning about ${eraName}
- Focus on historical accuracy and educational value
- Be respectful of Islamic traditions and culture

${userMessage ? `USER'S QUESTION: ${userMessage}` : 'Please describe what you see in this image and provide any relevant historical context.'}

RESPONSE GUIDELINES:
- Keep response concise (2-4 sentences)
- If the image relates to Islamic history, provide historical context
- If the image is unrelated, politely explain and offer to help with Islamic history topics
- Be warm and encouraging`;

    return basePrompt;
  }

  /**
   * Check if a message is requesting image generation
   * More flexible matching to handle variations like "generate an image", "create the image", etc.
   */
  isImageRequest(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Check for action + image combinations (handles "generate an image", "create the picture", etc.)
    const actionWords = ['generate', 'create', 'make', 'draw', 'show', 'visualize', 'produce'];
    const imageWords = ['image', 'picture', 'illustration', 'visual', 'artwork', 'scene'];

    // If message contains both an action word AND an image word, it's likely an image request
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
}

// Export singleton instance
export const aiService = new AIService();
