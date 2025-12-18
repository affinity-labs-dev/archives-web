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
      // Clean the response - remove markdown code fences and trim
      let cleanedResponse = aiResponse.trim();

      // Remove markdown code fences if present (```json ... ``` or ``` ... ```)
      cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();

      // Try to parse as JSON
      const parsed = JSON.parse(cleanedResponse);
      return {
        explanation: parsed.explanation || '',
        encouragement: parsed.encouragement || 'Great effort! Keep learning.',
        relatedTopic: parsed.relatedTopic,
      };
    } catch (error) {
      // If JSON parsing fails, treat the whole response as explanation
      console.warn('⚠️ [AIService] Could not parse AI response as JSON, using raw text');
      console.warn('Raw response:', aiResponse);
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
    // Knowledge context - actual lesson content the user has learned
    knowledgeContext?: string;
  }): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('AI Service is not available. Please configure EXPO_PUBLIC_GEMINI_API_KEY.');
    }

    const { userMessage, conversationHistory = [], context = {}, userProgress, knowledgeContext } = params;

    try {
      console.log('🤖 [AIService] Getting chat response...');
      console.log('💬 User message:', userMessage);
      if (knowledgeContext) {
        console.log('📚 [AIService] Knowledge context provided, length:', knowledgeContext.length);
      }

      // Build system prompt with context, user progress, and knowledge context
      const systemPrompt = this.buildChatSystemPrompt(context, userProgress, knowledgeContext);

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
   * Comprehensive guidelines for Islamic history education
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
    },
    knowledgeContext?: string
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
          if (part.inlineData) {
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
        model: this.textModel, // Text model supports vision
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
            thinkingLevel: 'low',
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
