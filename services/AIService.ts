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
  private model = 'gemini-3-pro-image-preview';

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

      // Call Gemini API using SDK
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: [{ text: prompt }],
        config: {
          maxOutputTokens: 150,
          temperature: 0.7,
        }
      });

      console.log('📦 [AIService] Full response:', JSON.stringify(response, null, 2));

      // Extract text from response
      let aiResponse = '';
      if (response.candidates && response.candidates[0] && response.candidates[0].content) {
        for (const part of response.candidates[0].content.parts) {
          if (part.text) {
            aiResponse += part.text;
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

      // Call Gemini API using SDK
      const response = await this.ai!.models.generateContent({
        model: this.model,
        contents: [{ text: conversationText }],
        config: {
          maxOutputTokens: 200,
          temperature: 0.8,
        }
      });

      // Extract text from response
      let aiResponse = '';
      if (response.candidates && response.candidates[0] && response.candidates[0].content) {
        for (const part of response.candidates[0].content.parts) {
          if (part.text) {
            aiResponse += part.text;
          }
        }
      }

      console.log('✅ [AIService] Chat response received');

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
}

// Export singleton instance
export const aiService = new AIService();
