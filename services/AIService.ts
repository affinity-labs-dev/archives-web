// AIService.ts - Google Gemini API integration for AI-powered quiz explanations
// Provides contextual, personalized learning assistance

import { GoogleGenAI } from '@google/genai';
import { Question } from '@/components/shared/types';

// Response type from Gemini API
interface AIExplanationResponse {
  explanation: string;
  encouragement: string;
  relatedTopic?: string;
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
}

class AIService {
  private ai: GoogleGenAI | null = null;
  // Text model for chat and quiz explanations
  private textModel = 'gemini-3-pro-preview';
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

      console.log('🤖 [AIService] Requesting explanation from Gemini...');
      console.log('📝 Question:', request.questionText);

      // Call Gemini API using SDK (text model for explanations)
      // Note: Gemini 3 uses dynamic thinking by default (high), which consumes tokens
      // Setting thinkingLevel to "low" ensures tokens are used for output, not internal reasoning
      const response = await this.ai.models.generateContent({
        model: this.textModel,
        contents: [{ text: prompt }],
        config: {
          maxOutputTokens: 1024,
          temperature: 1.0, // Gemini 3 recommends keeping temperature at 1.0
          thinkingConfig: {
            thinkingLevel: 'low', // Minimize internal reasoning to preserve output tokens
          },
        }
      });

      console.log('📦 [AIService] Full response:', JSON.stringify(response, null, 2));

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
              aiResponse = '{"explanation": "I cannot answer that due to safety guidelines.", "encouragement": "Try a different question!"}';
            } else if (finishReason === 'RECITATION') {
              aiResponse = '{"explanation": "I cannot reproduce that specific content directly.", "encouragement": "Ask in a different way!"}';
            } else {
              aiResponse = '{"explanation": "I\'m having trouble generating a response right now.", "encouragement": "Please try again!"}';
            }
          }
        }
      }

      console.log('📝 [AIService] Extracted text:', aiResponse);
      console.log('✅ [AIService] Received explanation from Gemini');

      // Parse the response (expecting JSON format)
      return this.parseAIResponse(aiResponse);
    } catch (error) {
      console.error('❌ [AIService] Error getting quiz explanation:', error);

      // Return fallback explanation
      return {
        explanation: `The correct answer is "${request.correctAnswer}". This is an important concept in ${request.eraName} history. Review the lesson content for more details.`,
        encouragement: 'Keep learning! Every mistake is a step toward mastery.',
      };
    }
  }

  /**
   * Build the prompt for Gemini
   */
  private buildQuizExplanationPrompt(request: QuizExplanationRequest): string {
    const { questionText, correctAnswer, userAnswer, questionType, eraName, userLevel = 'intermediate' } = request;

    return `You're explaining ${eraName} history to a ${userLevel} student.

Question: ${questionText}
They answered: ${userAnswer}
Correct answer: ${correctAnswer}

Write ONE SHORT SENTENCE (max 15 words) explaining why the correct answer is right + one interesting fact.

Then ONE SHORT encouraging phrase (5 words max).

Keep it conversational, not textbook-y. Make it memorable.

Respond as JSON:
{
  "explanation": "One sentence max 15 words",
  "encouragement": "5 words max",
  "relatedTopic": "Optional"
}`;
  }

  /**
   * Parse AI response from Gemini (expects JSON format)
   */
  private parseAIResponse(aiResponse: string): AIExplanationResponse {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(aiResponse);
      return {
        explanation: parsed.explanation || '',
        encouragement: parsed.encouragement || 'Great effort! Keep learning.',
        relatedTopic: parsed.relatedTopic,
      };
    } catch (error) {
      // If JSON parsing fails, treat the whole response as explanation
      console.warn('⚠️ [AIService] Could not parse AI response as JSON, using raw text');
      return {
        explanation: aiResponse,
        encouragement: 'Keep up the great work!',
      };
    }
  }

  /**
   * Generate explanations for multiple questions (batch)
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

      // Skip if user answered correctly
      if (userAnswerIndex === correctAnswerIndex) {
        explanations.push({
          explanation: '✅ You got this right!',
          encouragement: 'Great job!',
        });
        continue;
      }

      // Get AI explanation for wrong answer
      const explanation = await this.getQuizExplanation({
        questionText: question.question_text,
        correctAnswer,
        userAnswer,
        questionType: question.question_type,
        eraName: context.eraName,
        adventureName: context.adventureName,
        userLevel: context.userLevel,
      });

      explanations.push(explanation);

      // Add small delay to avoid rate limiting (100ms between requests)
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return explanations;
  }

  /**
   * Get chat response for general conversation
   */
  async getChatResponse(params: {
    userMessage: string;
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
    context?: {
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
  }): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('AI Service is not available. Please configure EXPO_PUBLIC_GEMINI_API_KEY.');
    }

    const { userMessage, conversationHistory = [], context = {}, userProgress } = params;

    try {
      console.log('🤖 [AIService] Getting chat response...');
      console.log('💬 User message:', userMessage);

      // Build system prompt with context and user progress
      const systemPrompt = this.buildChatSystemPrompt(context, userProgress);

      // Build conversation for Gemini (system prompt + history + user message)
      const conversationText = [
        systemPrompt,
        '',
        '=== CONVERSATION ===',
        ...conversationHistory.map((msg) =>
          `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        ),
        `User: ${userMessage}`,
        '',
        'Assistant:'
      ].join('\n');

      // Call Gemini API using SDK (text model for chat)
      // Note: Gemini 3 uses dynamic thinking by default (high), which consumes tokens
      // Setting thinkingLevel to "low" ensures tokens are used for output, not internal reasoning
      const response = await this.ai!.models.generateContent({
        model: this.textModel,
        contents: [{ text: conversationText }],
        config: {
          maxOutputTokens: 2048,
          temperature: 1.0, // Gemini 3 recommends keeping temperature at 1.0
          thinkingConfig: {
            thinkingLevel: 'low', // Minimize internal reasoning to preserve output tokens
          },
        }
      });

      // Extract text from response (with safety handling)
      let aiResponse = '';
      const candidate = response.candidates?.[0];
      const finishReason = candidate?.finishReason;

      // Debug: Log raw candidate structure for chat responses
      console.log('🔍 [AIService] RAW CHAT CANDIDATE:', JSON.stringify(candidate, null, 2));

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

      console.log('✅ [AIService] Chat response received, length:', aiResponse.length);

      return aiResponse;
    } catch (error) {
      console.error('❌ [AIService] Error getting chat response:', error);
      throw error;
    }
  }

  /**
   * Build system prompt for general chat
   */
  private buildChatSystemPrompt(
    context: {
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
    }
  ): string {
    const { eraName = 'Islamic History', adventureId, currentScreen } = context;

    // Build user progress section
    let progressSection = '';
    if (userProgress) {
      progressSection = `
USER LEARNING PROGRESS:
- Total XP Earned: ${userProgress.totalXP}
- Modules Completed: ${userProgress.completedModules} out of ${userProgress.totalModulesAttempted}
- Average Quiz Score: ${userProgress.averageQuizScore}% (${userProgress.averageQuizScore >= 80 ? 'Excellent!' : userProgress.averageQuizScore >= 60 ? 'Good progress' : 'Needs improvement'})
${userProgress.recentCompletions.length > 0 ? `- Recently Completed: ${userProgress.recentCompletions.map(c => c.adventureId).join(', ')}` : '- Just getting started'}

PERSONALIZATION INSTRUCTIONS:
${userProgress.averageQuizScore < 60 ? '- Use simpler language and more detailed explanations\n- Provide encouragement and study tips\n- Break down complex concepts into smaller parts' : ''}
${userProgress.averageQuizScore >= 80 ? '- User is advanced - can use more sophisticated language\n- Provide deeper historical analysis\n- Make connections to broader themes' : ''}
${userProgress.completedModules === 0 ? '- This user is brand new - be extra welcoming and patient\n- Explain basics clearly\n- Encourage exploration of the app' : ''}
${userProgress.completedModules > 5 ? '- Experienced learner - reference their previous lessons\n- Build on knowledge from completed modules\n- Suggest advanced topics' : ''}
`;
    }

    return `You are a knowledgeable and patient Islamic history tutor and learning companion for the Archives app.

CURRENT CONTEXT:
- Learning about: ${eraName}
${adventureId ? `- Current adventure: ${adventureId}` : ''}
${currentScreen ? `- Current screen: ${currentScreen}` : ''}
${progressSection}

YOUR ROLE:
- Answer questions about Islamic history clearly and accurately
- Provide historical context and explanations
- Help students understand complex concepts
- Recommend related topics to explore based on their progress
- Be encouraging and supportive
- Maintain a scholarly, respectful tone
- Celebrate their achievements and progress

IMPORTANT GUIDELINES:
1. Focus on historical facts, not theological interpretations
2. Be culturally sensitive and respectful of Islamic traditions
3. Cite specific events, dates, and figures when relevant
4. Keep responses concise (2-4 paragraphs max)
5. Adjust language complexity based on user's quiz performance
6. If asked about topics outside Islamic history, politely redirect to the subject
7. Never make up facts - if unsure, say "I'm not certain about that detail"
8. Recommend adventures/modules they haven't completed yet
9. If user completed modules recently, you can reference those lessons
10. If user is struggling (low quiz scores), offer study strategies and encouragement

RESPONSE STYLE:
- Clear and educational
- Warm and encouraging
- Factual and scholarly
- Concise but thorough`;
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
          if (part.inlineData) {
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
   */
  private buildImagePrompt(userPrompt: string, context: { eraName?: string; adventureId?: string }): string {
    const { eraName = 'Islamic History' } = context;

    return `Create a historically accurate, educational illustration for ${eraName}.

User request: ${userPrompt}

Style guidelines:
- Artistic, educational illustration style (not photorealistic)
- Historically accurate clothing, architecture, and setting
- Respectful representation of Islamic history and culture
- No faces of prophets or religious figures (show from behind or symbolic)
- Rich colors and detailed backgrounds
- Suitable for educational app (family-friendly)

Generate a single high-quality image.`;
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
