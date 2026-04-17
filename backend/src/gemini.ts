// gemini.ts - Gemini API client (chat, explain, image gen/edit, RAG)

import { GoogleGenAI, FunctionCallingConfigMode, ThinkingLevel } from '@google/genai';
import {
  buildChatSystemPrompt,
  buildBatchExplanationPrompt,
  buildImagePrompt,
  buildImageEditPrompt,
  buildImageAnalysisPrompt,
  needsWebSearch,
  RAG_TOOL_DECLARATIONS,
} from './prompts.js';
import { executeRAGTool } from './rag.js';
import type {
  ChatRequest,
  ChatResponse,
  ExplainRequest,
  ExplainResponse,
  ImageRequest,
  ImageResponse,
  ConversationMessage,
  QuotaInfo,
} from './types.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const TEXT_MODEL = 'gemini-3-flash-preview';
const IMAGE_MODEL = 'gemini-3-pro-image-preview';

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// ─── Chat ───

export async function chat(req: ChatRequest, quotaRemaining: QuotaInfo): Promise<ChatResponse> {
  const { message, conversationHistory = [], context = {} } = req;

  const systemPrompt = buildChatSystemPrompt(
    context,
    context.userProgress,
    context.knowledgeContext,
    conversationHistory.length
  );

  // Build conversation contents
  type ContentPart = { text: string } | { inlineData: { mimeType: string; data: string } };
  const contents: Array<{ role: 'user' | 'model'; parts: ContentPart[] }> = [];

  // System prompt as first exchange
  contents.push(
    { role: 'user', parts: [{ text: systemPrompt + '\n\nPlease acknowledge these guidelines and be ready to help.' }] },
    { role: 'model', parts: [{ text: 'I understand. I am your educational chatbot for Archives, here to help you learn about Islamic and Middle Eastern history. I will follow all the guidelines provided, including proper Islamic etiquette, historical accuracy, and a warm educational tone. How can I help you today?' }] }
  );

  // Conversation history
  for (const msg of conversationHistory) {
    const parts: ContentPart[] = [{ text: msg.content }];
    if (msg.image?.base64) {
      parts.push({ inlineData: { mimeType: msg.image.mimeType, data: msg.image.base64 } });
    }
    contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts });
  }

  // Current message (with optional image)
  const currentParts: ContentPart[] = [{ text: message }];
  if (req.imageBase64 && req.imageMimeType) {
    currentParts.push({ inlineData: { mimeType: req.imageMimeType, data: req.imageBase64 } });
  }
  contents.push({ role: 'user', parts: currentParts });

  // Decide: web search OR RAG tools (mutually exclusive in Gemini)
  const queryNeedsSearch = needsWebSearch(message);
  const toolsConfig: any[] = [];
  const toolsUsed: string[] = [];

  if (queryNeedsSearch) {
    toolsConfig.push({ googleSearch: {} });
  } else if (context.toolsContext) {
    toolsConfig.push({ functionDeclarations: RAG_TOOL_DECLARATIONS });
  }

  // First Gemini call
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents,
    config: {
      maxOutputTokens: 2048,
      temperature: 1.0,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      ...(toolsConfig.length > 0 && {
        tools: toolsConfig,
        ...(!queryNeedsSearch && context.toolsContext && {
          toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } },
        }),
      }),
    },
  });

  const candidate = response.candidates?.[0];
  const functionCalls = candidate?.content?.parts?.filter((p: any) => p.functionCall);

  // Handle RAG function calls
  if (functionCalls && functionCalls.length > 0 && context.toolsContext) {
    const functionResults: Array<{ functionName: string; response: any }> = [];

    for (const part of functionCalls) {
      const fc = (part as any).functionCall;
      const result = await executeRAGTool(fc.name, fc.args || {}, context.toolsContext);
      functionResults.push({ functionName: fc.name, response: result });
      toolsUsed.push(fc.name);
    }

    // Follow-up call with function results
    const followUpContents = [
      ...contents,
      { role: 'model' as const, parts: functionCalls },
      {
        role: 'user' as const,
        parts: functionResults.map(fr => ({
          functionResponse: { name: fr.functionName, response: fr.response },
        })),
      },
    ];

    let aiResponse = '';

    try {
      const followUp = await withTimeout(
        ai.models.generateContent({
          model: TEXT_MODEL,
          contents: followUpContents,
          config: { maxOutputTokens: 2048, temperature: 1.0 },
        }),
        30000,
        'RAG follow-up'
      );

      const followUpCandidate = followUp.candidates?.[0];
      if (followUpCandidate?.content?.parts) {
        for (const part of followUpCandidate.content.parts) {
          if ((part as any).text && !(part as any).thought) {
            aiResponse += (part as any).text;
          }
        }
      }
    } catch { /* fall through to retry */ }

    // Retry with inline context if empty
    if (!aiResponse) {
      const MAX_FIELD_LENGTH = 500;
      const toolSummary = functionResults
        .map(fr => {
          const data = fr.response?.data;
          if (!data) return `${fr.functionName}: No data returned`;
          const summary: Record<string, any> = {};
          for (const [key, value] of Object.entries(data)) {
            summary[key] = typeof value === 'string' && value.length > MAX_FIELD_LENGTH
              ? value.substring(0, MAX_FIELD_LENGTH) + '... [truncated]'
              : value;
          }
          return `${fr.functionName} result: ${JSON.stringify(summary)}`;
        })
        .join('\n\n');

      try {
        const retry = await withTimeout(
          ai.models.generateContent({
            model: TEXT_MODEL,
            contents: [
              ...contents,
              { role: 'model' as const, parts: [{ text: `I retrieved the following information:\n\n${toolSummary}` }] },
              { role: 'user' as const, parts: [{ text: 'Now please answer my original question using that information. Be specific and educational.' }] },
            ],
            config: { maxOutputTokens: 2048, temperature: 1.0 },
          }),
          30000,
          'RAG inline retry'
        );

        const retryCandidate = retry.candidates?.[0];
        if (retryCandidate?.content?.parts) {
          for (const part of retryCandidate.content.parts) {
            if ((part as any).text && !(part as any).thought) {
              aiResponse += (part as any).text;
            }
          }
        }
      } catch { /* use fallback below */ }
    }

    if (!aiResponse) {
      aiResponse = 'I had trouble generating a detailed response. Please try asking your question again, or rephrase it slightly.';
    }

    return { content: aiResponse, toolsUsed, quotaRemaining };
  }

  // No function calls — extract text directly
  let aiResponse = '';
  if (candidate?.content?.parts) {
    for (const part of candidate.content.parts) {
      if ((part as any).text) aiResponse += (part as any).text;
    }
  }

  // Handle blocked responses
  const finishReason = candidate?.finishReason;
  if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS' && !aiResponse) {
    aiResponse = finishReason === 'SAFETY'
      ? 'I cannot answer that due to safety guidelines. Please try a different question.'
      : 'I\'m having trouble generating a response right now. Please try again.';
  }

  // Extract grounding sources
  const groundingMetadata = (candidate as any)?.groundingMetadata;
  let sources: Array<{ uri: string; title: string }> | undefined;
  let searchQueries: string[] | undefined;

  if (groundingMetadata) {
    searchQueries = groundingMetadata.webSearchQueries;
    sources = groundingMetadata.groundingChunks
      ?.filter((c: any) => c.web?.uri && c.web?.title)
      .map((c: any) => ({ uri: c.web.uri, title: c.web.title }));
  }

  return { content: aiResponse, sources, searchQueries, toolsUsed, quotaRemaining };
}

// ─── Quiz Explanations ───

export async function explain(req: ExplainRequest, quotaRemaining: QuotaInfo): Promise<ExplainResponse> {
  const { questions, userAnswers, eraName, adventureName } = req;

  // Build question data for prompt
  const questionData = questions.map((q, i) => {
    const correctIdx = q.answers.findIndex(a => a.is_correct);
    const correctAnswer = q.answers[correctIdx]?.text || 'Unknown';
    const userAnswer = q.answers[userAnswers[i]]?.text || 'No answer';
    const isCorrect = userAnswers[i] === correctIdx;
    return { questionText: q.question_text, userAnswer, correctAnswer, isCorrect };
  });

  const prompt = buildBatchExplanationPrompt(questionData, { eraName, adventureName });

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: [{ text: prompt }],
    config: {
      maxOutputTokens: 3072,
      temperature: 1.0,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });

  let aiResponse = '';
  const candidate = response.candidates?.[0];
  if (candidate?.content?.parts) {
    for (const part of candidate.content.parts) {
      if (part.text) aiResponse += part.text;
    }
  }

  // Handle blocked responses
  const finishReason = candidate?.finishReason;
  if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
    // Fall back to generic explanations
    return {
      explanations: questions.map((q, i) => {
        const correctIdx = q.answers.findIndex(a => a.is_correct);
        return { explanation: `The correct answer is "${q.answers[correctIdx]?.text}". Review the lesson for more details about ${eraName}.` };
      }),
      quotaRemaining,
    };
  }

  // Parse JSON array
  try {
    let cleaned = aiResponse.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length === questions.length) {
      return {
        explanations: parsed.map((item: any) => ({
          explanation: typeof item.explanation === 'string' ? item.explanation : String(item.explanation || ''),
        })),
        quotaRemaining,
      };
    }
  } catch { /* fall through to fallback */ }

  // Fallback: treat entire response as single explanation
  return {
    explanations: [{ explanation: aiResponse }],
    quotaRemaining,
  };
}

// ─── Image Generation / Editing ───

export async function image(req: ImageRequest, quotaRemaining: QuotaInfo): Promise<ImageResponse> {
  if (req.action === 'edit') {
    return editImage(req, quotaRemaining);
  }
  return generateImage(req, quotaRemaining);
}

async function generateImage(req: ImageRequest, quotaRemaining: QuotaInfo): Promise<ImageResponse> {
  const prompt = buildImagePrompt(req.prompt, { eraName: req.eraContext?.eraName });

  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: [{ text: prompt }],
    config: {
      imageConfig: { aspectRatio: '16:9', imageSize: '2K' },
    },
  });

  const candidate = response.candidates?.[0];
  if (candidate?.content?.parts) {
    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        return {
          imageBase64: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/png',
          caption: candidate.content.parts.find((p: any) => p.text)?.text,
          quotaRemaining,
        };
      }
    }
  }

  throw new Error('No image generated');
}

async function editImage(req: ImageRequest, quotaRemaining: QuotaInfo): Promise<ImageResponse> {
  if (!req.imageBase64 || !req.imageMimeType) {
    throw new Error('Image data required for edit action');
  }

  const prompt = buildImageEditPrompt(req.prompt, { eraName: req.eraContext?.eraName });

  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: [
      {
        parts: [
          { text: prompt },
          { inlineData: { data: req.imageBase64, mimeType: req.imageMimeType } },
        ],
      },
    ],
    config: {
      imageConfig: { aspectRatio: '1:1', imageSize: '2K' },
    },
  });

  const candidate = response.candidates?.[0];
  if (candidate?.content?.parts) {
    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        return {
          imageBase64: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/png',
          caption: candidate.content.parts.find((p: any) => p.text)?.text,
          quotaRemaining,
        };
      }
    }
  }

  throw new Error('No edited image generated');
}
