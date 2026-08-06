# AI Backend Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all AI features (chat, quiz explanations, image gen/edit, game generation) behind a Node.js/Fastify backend, removing the Gemini API key from the app bundle and enforcing quotas server-side.

**Architecture:** Monorepo with `backend/` folder. The backend is a Fastify server that verifies Clerk JWTs, reads subscription status from Supabase (synced via RevenueCat webhooks), enforces quotas, calls Gemini, and returns responses. The client swaps direct Gemini SDK calls for `fetch()` calls to the backend.

**Tech Stack:** Node.js 20+, Fastify 5, TypeScript 5, `@google/genai`, `@clerk/backend`, `@supabase/supabase-js`, Railway deployment.

**Spec:** `docs/superpowers/specs/2026-04-13-ai-backend-separation-design.md`

---

## Task 1: Backend Project Scaffold

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/src/server.ts`
- Create: `backend/src/types.ts`
- Create: `backend/.env.example`

- [ ] **Step 1: Create `backend/package.json`**

```json
{
  "name": "archives-backend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@clerk/backend": "^1.25.0",
    "@google/genai": "^1.5.0",
    "@supabase/supabase-js": "^2.49.0",
    "fastify": "^5.3.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.8.0",
    "vitest": "^3.1.0"
  }
}
```

- [ ] **Step 2: Create `backend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `backend/.env.example`**

```env
# Gemini AI (secret - never expose to client)
GEMINI_API_KEY=

# Clerk (server-side JWT verification)
CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=

# RevenueCat (server API + webhook verification)
REVENUECAT_SECRET_KEY=
REVENUECAT_WEBHOOK_SECRET=

# Supabase (service role key - bypasses RLS)
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# Server
PORT=3000
```

- [ ] **Step 4: Create `backend/src/types.ts`**

These are the shared request/response types for all API endpoints.

```typescript
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
```

- [ ] **Step 5: Create `backend/src/server.ts`**

```typescript
// server.ts - Fastify setup, plugins, routes, start

import Fastify from 'fastify';
import { authHook } from './auth.js';
import { chatRoute } from './routes/chat.js';
import { explainRoute } from './routes/explain.js';
import { imageRoute } from './routes/image.js';
import { gameRoute } from './routes/game.js';
import { webhookRoute } from './routes/webhook.js';

const server = Fastify({ logger: true });

// CORS - allow mobile app requests
server.addHook('onRequest', async (request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (request.method === 'OPTIONS') {
    reply.status(204).send();
  }
});

// Auth hook for /ai/* routes
server.addHook('onRequest', async (request, reply) => {
  if (request.url.startsWith('/ai/')) {
    await authHook(request, reply);
  }
});

// Health check
server.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// AI routes (protected by auth hook)
server.post('/ai/chat', chatRoute);
server.post('/ai/explain', explainRoute);
server.post('/ai/image', imageRoute);
server.post('/ai/game', gameRoute);

// Webhook route (no auth - uses webhook secret)
server.post('/webhook/revenuecat', webhookRoute);

// Start
const port = parseInt(process.env.PORT || '3000', 10);
server.listen({ port, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
  server.log.info(`Server listening at ${address}`);
});

export { server };
```

- [ ] **Step 6: Install dependencies**

Run: `cd backend && npm install`
Expected: `node_modules/` created, `package-lock.json` generated.

- [ ] **Step 7: Verify TypeScript compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: Errors about missing route/auth files (expected — we create them next). No errors in `types.ts` or `server.ts` type definitions.

- [ ] **Step 8: Commit**

```bash
git add backend/package.json backend/tsconfig.json backend/.env.example backend/src/types.ts backend/src/server.ts backend/package-lock.json
git commit -m "feat: scaffold backend project with Fastify, types, and server entry"
```

---

## Task 2: Auth Middleware + Supabase Client

**Files:**
- Create: `backend/src/auth.ts`

- [ ] **Step 1: Create `backend/src/auth.ts`**

This module verifies Clerk JWTs and reads subscription status from Supabase.

```typescript
// auth.ts - Clerk JWT verification + subscription status from Supabase

import { verifyToken } from '@clerk/backend';
import { createClient } from '@supabase/supabase-js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthPayload } from './types.js';

// Supabase client (service role - bypasses RLS)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export { supabase };

/**
 * Fastify onRequest hook for /ai/* routes.
 * Verifies Clerk JWT, reads subscription status, attaches AuthPayload to request.
 */
export async function authHook(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    // Verify Clerk JWT
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });

    const userId = payload.sub;
    if (!userId) {
      reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Invalid token: no user ID' });
      return;
    }

    // Read subscription status from Supabase
    const isSubscriber = await getSubscriptionStatus(userId);

    // Attach auth payload to request for downstream use
    (request as any).auth = { userId, isSubscriber } satisfies AuthPayload;
  } catch (error) {
    request.log.error({ error }, 'Auth verification failed');
    reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Invalid or expired token' });
  }
}

/**
 * Read subscription status from the subscription_status table.
 * Falls back to RevenueCat API for first-time users, then caches in Supabase.
 */
async function getSubscriptionStatus(userId: string): Promise<boolean> {
  // Try Supabase first
  const { data } = await supabase
    .from('subscription_status')
    .select('is_subscriber, expires_at')
    .eq('user_id', userId)
    .single();

  if (data) {
    // Check if subscription has expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return false;
    }
    return data.is_subscriber;
  }

  // No row found — first-time user. Call RevenueCat API as fallback.
  const rcStatus = await fetchRevenueCatStatus(userId);

  // Cache the result in Supabase for future reads
  await supabase.from('subscription_status').upsert({
    user_id: userId,
    is_subscriber: rcStatus,
    updated_at: new Date().toISOString(),
  });

  return rcStatus;
}

/**
 * Fetch subscription status from RevenueCat server API.
 * Used as fallback when no row exists in subscription_status table.
 */
async function fetchRevenueCatStatus(userId: string): Promise<boolean> {
  const secretKey = process.env.REVENUECAT_SECRET_KEY;
  if (!secretKey) {
    console.warn('REVENUECAT_SECRET_KEY not set, defaulting to free tier');
    return false;
  }

  try {
    const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${userId}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    if (!res.ok) {
      console.warn(`RevenueCat API returned ${res.status} for user ${userId}`);
      return false;
    }

    const data = await res.json();
    const entitlements = data?.subscriber?.entitlements;
    if (!entitlements || Object.keys(entitlements).length === 0) {
      return false;
    }

    // Check if any entitlement is active
    return Object.values(entitlements).some(
      (e: any) => e.expires_date === null || new Date(e.expires_date) > new Date()
    );
  } catch (error) {
    console.error('RevenueCat API error:', error);
    return false;
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: May still error on missing route files — but `auth.ts` and `types.ts` should pass.

- [ ] **Step 3: Commit**

```bash
git add backend/src/auth.ts
git commit -m "feat: add auth middleware with Clerk JWT verification and subscription check"
```

---

## Task 3: Quota System

**Files:**
- Create: `backend/src/quota.ts`

- [ ] **Step 1: Create `backend/src/quota.ts`**

Port the quota logic from `gamification/services/AIStorageService.ts` (lines 71-210). The backend reads/writes the existing `ai_user_data` table.

```typescript
// quota.ts - Server-side quota enforcement (reads/writes ai_user_data table)

import { supabase } from './auth.js';
import type { QuotaInfo } from './types.js';

type RequestType = 'chat' | 'image_generate' | 'image_edit' | 'image_analyze';

interface MonthlyUsage {
  month: string;
  chat_count: number;
  image_generate_count: number;
  image_edit_count: number;
  image_analyze_count: number;
}

const QUOTA_LIMITS = {
  free: { chat: 100, image_generate: 10, image_edit: 10, image_analyze: 50 },
  subscriber: { chat: -1, image_generate: 100, image_edit: 50, image_analyze: -1 },
} as const;

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getResetDate(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0];
}

function emptyUsage(): MonthlyUsage {
  return {
    month: getCurrentMonth(),
    chat_count: 0,
    image_generate_count: 0,
    image_edit_count: 0,
    image_analyze_count: 0,
  };
}

/**
 * Check if a user can make a request. Returns remaining quota info.
 * Throws with status 429 data if quota exceeded.
 */
export async function checkQuota(
  userId: string,
  requestType: RequestType,
  isSubscriber: boolean
): Promise<void> {
  const limits = isSubscriber ? QUOTA_LIMITS.subscriber : QUOTA_LIMITS.free;
  const limit = limits[requestType];

  // Unlimited
  if (limit === -1) return;

  const usage = await getMonthlyUsage(userId);
  const countKey = `${requestType}_count` as keyof MonthlyUsage;
  const currentCount = (usage[countKey] as number) || 0;

  if (currentCount >= limit) {
    const error: any = new Error('Quota exceeded');
    error.statusCode = 429;
    error.body = {
      code: 'QUOTA_EXCEEDED',
      message: `Monthly ${requestType} limit reached (${limit})`,
      quotaRemaining: { [requestType]: 0 },
      resetDate: getResetDate(),
    };
    throw error;
  }
}

/**
 * Decrement quota after a successful Gemini call.
 * Returns updated remaining quota for the response.
 */
export async function decrementQuota(
  userId: string,
  requestType: RequestType,
  isSubscriber: boolean
): Promise<QuotaInfo> {
  const usage = await getMonthlyUsage(userId);
  const countKey = `${requestType}_count` as keyof MonthlyUsage;
  (usage[countKey] as number) += 1;
  usage.month = getCurrentMonth();

  // Write updated usage back to Supabase
  await supabase
    .from('ai_user_data')
    .upsert(
      { user_id: userId, monthly_usage: usage, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  // Calculate remaining for response
  const limits = isSubscriber ? QUOTA_LIMITS.subscriber : QUOTA_LIMITS.free;
  const remaining: QuotaInfo = {};
  for (const [type, limit] of Object.entries(limits)) {
    const key = `${type}_count` as keyof MonthlyUsage;
    const count = (usage[key] as number) || 0;
    remaining[type] = limit === -1 ? -1 : Math.max(0, limit - count);
  }

  return remaining;
}

async function getMonthlyUsage(userId: string): Promise<MonthlyUsage> {
  const { data } = await supabase
    .from('ai_user_data')
    .select('monthly_usage')
    .eq('user_id', userId)
    .single();

  let usage: MonthlyUsage = data?.monthly_usage || emptyUsage();

  // Reset if different month
  if (usage.month !== getCurrentMonth()) {
    usage = emptyUsage();
  }

  return usage;
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/quota.ts
git commit -m "feat: add server-side quota enforcement for AI features"
```

---

## Task 4: System Prompts + RAG Tool Definitions

**Files:**
- Create: `backend/src/prompts.ts`

Port all system prompts verbatim from `gamification/services/AIService.ts` and RAG tool declarations from `gamification/services/AIToolsService.ts`.

- [ ] **Step 1: Create `backend/src/prompts.ts`**

This is the largest file. It contains all prompts and RAG tool definitions, ported from the client.

```typescript
// prompts.ts - All system prompts and RAG tool definitions
// Ported verbatim from AIService.ts and AIToolsService.ts

import { FunctionDeclaration, Type } from '@google/genai';
import type { UserProgressSummary, ToolsContext } from './types.js';

// ─── Content topics for web search detection ───

const CONTENT_TOPICS = [
  'islam', 'islamic', 'muslim', 'mosque', 'quran', 'prophet', 'muhammad',
  'umayyad', 'abbasid', 'ottoman', 'caliphate', 'caliph', 'sultan',
  'mecca', 'medina', 'jerusalem', 'damascus', 'baghdad', 'cordoba',
  'middle east', 'arab', 'persian', 'fatimid', 'mamluk', 'moorish',
  'alhambra', 'dome of the rock', 'kaaba', 'hijra', 'ramadan',
  'sahaba', 'companions', 'khadijah', 'aisha', 'fatimah', 'ali',
  'crusade', 'reconquista', 'al-andalus', 'golden age',
  'scholar', 'ibn', 'al-', 'imam', 'sheikh',
];

const RECENCY_KEYWORDS = [
  'latest', 'recent', 'new', 'current', 'modern', 'today',
  'discovery', 'found', 'research', 'study', 'archaeological',
  'news', 'update', 'happening', 'search',
  'excavation', 'dig', 'artifact', 'ruins',
  'museum', 'exhibit', 'exhibition', 'collection',
  'unesco', 'heritage', 'restoration', 'preservation',
  'announce', 'reveal', 'uncover', 'breakthrough',
];

/**
 * Detect if a query needs web search for content-related current information.
 * Only triggers for queries about Islamic/Middle Eastern history that need recent info.
 */
export function needsWebSearch(query: string): boolean {
  const lower = query.toLowerCase();
  const isContentRelated = CONTENT_TOPICS.some(t => lower.includes(t));
  if (!isContentRelated) return false;
  return RECENCY_KEYWORDS.some(k => lower.includes(k));
}

// ─── Chat System Prompt ───

export function buildChatSystemPrompt(
  context: { eraId?: string; eraName?: string; adventureId?: string; currentScreen?: string },
  userProgress?: UserProgressSummary,
  knowledgeContext?: string
): string {
  const { eraId, eraName = 'Islamic History', adventureId, currentScreen } = context;

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

  const knowledgeSection = knowledgeContext
    ? `\nKNOWLEDGE CONTEXT (Content user has learned):\n${knowledgeContext}\n`
    : '';

  return `You are the official educational chatbot for Archives, a gamified learning app
teaching Islamic and Middle Eastern history to children, families, and educators.
Your job is to educate, be informative, and help users go deeper on a topic with
real historical content, strictly following Islamic norms, historical accuracy,
and Archives' brand values.

CURRENT CONTEXT:
- Learning about: ${eraName}
${eraId ? `- Current Era ID: "${eraId}" (IMPORTANT: Use this era ID when calling tools like getLastCompletedModule, searchLessons, getUserProgress to get era-specific results)` : ''}
${adventureId ? `- Current adventure: ${adventureId}` : ''}
${currentScreen ? `- Current screen: ${currentScreen}` : ''}
${progressSection}
${knowledgeSection}

=== 1. ISLAMIC ETIQUETTE & RELIGIOUS CONVENTIONS (MANDATORY) ===
- Whenever Prophet Muhammad is mentioned, always write: "Prophet Muhammad (peace be upon him)"
  - Do not shorten, omit, or replace this phrase.
- When mentioning other prophets, use respectful phrasing and honorifics (AS)
  (e.g., Prophet Musa, Prophet Isa, Prophet Ibrahim).
- When referring to Allah, use respectful capitalization and tone.
- Do not mock, trivialize, dramatize, or fictionalize religious figures,
  beliefs, rituals, or sacred events.
- Do not generate content that could be interpreted as:
  Blasphemous, Irreverent, Politically inflammatory, Sectarian or divisive

=== 2. OBJECTIVE: EDUCATE, NOT ENTERTAIN ===
Your primary goal is to teach. Every response must contain real historical content.
- Provide specific people, dates, places, and events. Vague summaries are not useful.
- Connect events to their causes and consequences. Help the user understand
  WHY things happened, not just WHAT happened.
- Provide interesting facts and lesser-known details in addition to base knowledge.
- Help users understand timelines, people, places, and ideas.

Do not:
- Start with "Great job!" or any form of praise or grading
- Use filler phrases like "That's a great question!" or "Glad you asked!"
- End with generic encouragement like "Keep learning!" or "You're doing amazing!"
- Pad responses with motivational fluff. End with the historical insight, not cheerleading.

You may:
- Ask follow-up questions only to support learning
- Suggest related topics within the era

Do not:
- Promote external opinions
- Give religious rulings (fatwas)
- Engage in debates or modern political commentary

=== 3. SOURCES & HISTORICAL ACCURACY ===
- All content must be grounded in authentic Islamic sources.
  Draw from classical scholars: Ibn Kathir, al-Tabari, Ibn Hisham, Imam al-Nawawi.
  Trusted modern institutions: Yaqeen Institute, SeekersGuidance.
- When searching the web for additional information, ONLY use Islamic scholarly sources.
  Never use orientalist, secular-critical, or non-Islamic interpretations of Islamic history.
- Never paint Islam, Prophet Muhammad (peace be upon him), the Sahaba, or any
  religious figure in a negative, dismissive, or reductive light. Present them with
  the honor and respect they hold in the Islamic tradition.
- When discussing historical conflicts between Muslims (e.g., the Fitna periods),
  present events factually with sensitivity. Do not frame any respected figure as a villain.
  Acknowledge scholarly differences and present the mainstream Sunni perspective respectfully.
- If scholars disagree, say: "Historians differ on this, but many agree that..."
- Do not speculate, exaggerate, or invent details.
- If you are unsure, say so honestly.
- Never prioritize excitement over accuracy.

=== 4. TONE & LANGUAGE ===
- 7th-grade reading level. Short sentences. Short paragraphs.
- Conversational like texting a friend, but always substantive.
- Direct and to the point. Lead with the facts.
- NEVER use em-dashes. Use commas, periods, or semicolons instead.
- No slang, sarcasm, or emojis.
- No overly dramatic or poetic language.
- No opinions or moral preaching.

=== 5. CHILD-SAFE & FAMILY-FRIENDLY ===
Archives is used by children and parents. You must:
- Avoid graphic descriptions of violence
- Explain conflicts factually, not emotionally
- Frame battles, deaths, and suffering with restraint and context
- Focus on lessons, outcomes, and historical significance

=== 6. CULTURAL RESPECT & REPRESENTATION ===
- Avoid orientalist stereotypes.
- Do not portray Muslims or Middle Eastern societies as monolithic.
- Highlight diversity of cultures, languages, and traditions across eras.
- Respect all faiths when mentioned (Judaism, Christianity, others).

=== 7. RESPONSE STRUCTURE ===
- Keep responses to 3-5 short paragraphs by default.
- Be direct. Lead with the answer, then add context.
- Cite specific people, dates, places, and events.

DEPTH ADJUSTMENT:
- If the user asks for more detail or says "go deeper," expand to 5-8 paragraphs
  with richer historical context, specific dates, names of key figures, and place names.
- Draw connections to broader historical patterns or other events in the era.
- Reference specific scholars or sources where relevant (e.g., "Ibn Kathir writes that...").
- Continue offering to go deeper on sub-topics that emerge.
- If the user asks shorter questions, give shorter answers. If they ask
  "tell me everything about...," go deep without needing to ask again.
- Let the user control the depth throughout the conversation.

=== 8. WEB SEARCH CAPABILITY ===
When users ask about Islamic History topics not covered in the context of the app:
- You have access to Google Search to find up-to-date information
- Only use web search for content-related queries
- Do NOT use web search for general news unrelated to our educational content
- ONLY use Islamic sources and scholars when getting research from the internet
- Never use orientalist, secular-critical, or non-Islamic interpretations

=== 9. CUSTOMER SUPPORT ===
Support email: contact@archiveszone.app

WHEN TO REDIRECT TO SUPPORT (always provide the email):
- Bug reports, crashes, or technical issues
- Account problems (login issues, account recovery, account deletion, data privacy requests)
- Billing, subscriptions, refunds, or cancellation requests
- Feature requests or app feedback
- Content accuracy concerns - answer the historical question first, then suggest they also email support

WHEN YOU CAN HELP DIRECTLY (do NOT redirect):
- App navigation questions
- Questions about learning progress, XP, or achievements
- Any educational or historical question

RULES:
- Do not attempt to troubleshoot technical issues, guess at fixes, or make up solutions.
- Do not provide instructions for account deletion, data export, or billing changes. Always redirect these to support.
- If a user is frustrated or upset, acknowledge their frustration first, then provide the support email.
- Always provide the support email in this format: contact@archiveszone.app
- If the user writes in a non-English language, still provide the support email and respond in their language.

Your job is to help users learn history correctly, respectfully, and with substance.`;
}

// ─── Quiz Explanation Prompts ───

export function buildBatchExplanationPrompt(
  questions: Array<{
    questionText: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }>,
  context: { eraName: string; adventureName?: string }
): string {
  const { eraName, adventureName } = context;

  let questionsBlock = '';
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    questionsBlock += `\nQ${i + 1}: ${q.questionText}\n`;
    if (q.isCorrect) {
      questionsBlock += `User answered: ${q.correctAnswer} \u2713 (Correct)\n`;
    } else {
      questionsBlock += `User answered: ${q.userAnswer} \u2717 (Incorrect, correct answer: ${q.correctAnswer})\n`;
    }
  }

  return `You are an educational history tutor explaining ${eraName}${adventureName ? ` (${adventureName})` : ''} history to a curious learner who just completed a quiz.
Provide a thorough, educational explanation for each question below.
${questionsBlock}
For each question, write 3-5 sentences:
- If the student answered correctly: reinforce why that answer is right with specific historical evidence, and add deeper historical context or connections
- If the student answered incorrectly: explain why the correct answer is right, briefly clarify why their chosen answer was wrong, and add an interesting historical fact that helps the concept stick

TONE: Educational and warm. Be encouraging through the richness of your explanations, but avoid generic praise or consolation.

STRICT RULES:
- NEVER start any explanation with "Actually", "Well", "So", or similar filler words
- Start each explanation directly with the historical content
- Do NOT say things like "Great job!", "Don't worry", or "Keep trying"
- End each explanation with a meaningful historical insight, not fluff
- Give enough depth that the learner genuinely understands each topic

Return ONLY a JSON array with exactly ${questions.length} objects in order (Q1 first, Q2 second, etc.):
[{ "explanation": "3-5 sentence explanation" }, { "explanation": "..." }, ...]`;
}

// ─── Image Generation Prompts ───

export function buildImagePrompt(userPrompt: string, context: { eraName?: string }): string {
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
- Always show prophets as cloaked figures from the back if needed
- Landscapes, Architecture
- Light, calligraphy, objects, or environment
- Empty spaces that imply presence without depiction

=== 2. PROPHET & SACRED FIGURE HANDLING ===
When a scene involves a prophet:
- Show environment only (e.g. cave interior, mosque courtyard, desert road)
- Always show prophets as cloaked figures from the back
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

export function buildImageEditPrompt(userPrompt: string, context: { eraName?: string }): string {
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

export function buildImageAnalysisPrompt(userMessage?: string, context?: { eraName?: string }): string {
  const { eraName = 'Islamic History' } = context || {};

  return `You are a knowledgeable Islamic history tutor. Analyze this image and provide helpful, educational information.

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
}

// ─── RAG Tool Declarations (for Gemini function calling) ───

export const RAG_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'getUserProgress',
    description: 'Get the user\'s learning progress including completed modules, XP earned, and quiz scores. Use this when the user asks about their progress, stats, achievements, or learning history.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        eraId: {
          type: Type.STRING,
          description: 'Optional: Filter progress by era ID (e.g., "umayyad", "rise_of_islam"). Leave empty to get progress across all eras.',
        },
      },
      required: [],
    },
  },
  {
    name: 'getLastCompletedModule',
    description: 'Get the user\'s most recently completed module with its FULL lesson content. IMPORTANT: Always use the current era ID to get progress for the era the user is currently viewing.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        eraId: {
          type: Type.STRING,
          description: 'The era ID to filter by. IMPORTANT: Always pass the current era ID from the context to get era-specific progress.',
        },
      },
      required: [],
    },
  },
  {
    name: 'getModuleContent',
    description: 'Fetch the full content of a specific module including the complete lesson text.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        eraId: { type: Type.STRING, description: 'The era ID (e.g., "umayyad", "rise_of_islam")' },
        adventureId: { type: Type.STRING, description: 'The adventure ID (e.g., "adventure_1")' },
        moduleId: { type: Type.STRING, description: 'The module ID (e.g., "module_1")' },
      },
      required: ['eraId', 'adventureId', 'moduleId'],
    },
  },
  {
    name: 'searchLessons',
    description: 'Search across lessons the user has completed for specific topics, people, places, or events.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'The search query - a topic, person, place, or event' },
        eraId: { type: Type.STRING, description: 'Optional: Filter search to a specific era.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'getEraOverview',
    description: 'Get a complete overview of an era including all adventures, modules, and the user\'s completion status.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        eraId: { type: Type.STRING, description: 'The era ID (e.g., "umayyad", "rise_of_islam")' },
      },
      required: ['eraId'],
    },
  },
  {
    name: 'getLearningTimeline',
    description: 'Get the user\'s chronological learning journey showing when they started, what they completed, and their activity pattern.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        eraId: { type: Type.STRING, description: 'Optional: Filter timeline to a specific era.' },
        limit: { type: Type.NUMBER, description: 'Maximum number of timeline entries to return (default: 10, max: 20)' },
      },
      required: [],
    },
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/prompts.ts
git commit -m "feat: port all system prompts and RAG tool declarations to backend"
```

---

## Task 5: Gemini Client + RAG Tool Execution

**Files:**
- Create: `backend/src/gemini.ts`

- [ ] **Step 1: Create `backend/src/gemini.ts`**

This wraps all Gemini API calls. It mirrors the logic from `AIService.ts` but runs server-side with the secret key.

```typescript
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
    context.knowledgeContext
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
```

- [ ] **Step 2: Create `backend/src/rag.ts`**

RAG tool execution — ported from `AIToolsService.ts`. Operates on the `ToolsContext` snapshot passed from the client.

```typescript
// rag.ts - RAG tool execution (ported from AIToolsService.ts)
// All tools are READ-ONLY — operate on context snapshot from client

import { supabase } from './auth.js';
import type { ToolsContext } from './types.js';

interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

export async function executeRAGTool(
  toolName: string,
  args: Record<string, any>,
  context: ToolsContext
): Promise<ToolResult> {
  try {
    switch (toolName) {
      case 'getUserProgress':
        return getUserProgress(context, args.eraId);
      case 'getLastCompletedModule':
        return getLastCompletedModule(context, args.eraId);
      case 'getModuleContent':
        return getModuleContent(args.eraId, args.adventureId, args.moduleId);
      case 'getEraOverview':
        return getEraOverview(context, args.eraId);
      case 'searchLessons':
        return searchLessons(context, args.query, args.eraId);
      case 'getLearningTimeline':
        return getLearningTimeline(context, args.eraId, args.limit);
      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

function getUserProgress(context: ToolsContext, eraId?: string): ToolResult {
  let progress = [...context.progress];
  if (eraId) progress = progress.filter(p => p.era_id === eraId);

  const completed = progress.filter(p => p.isCompleted && p.quizCompleted);
  const totalXP = progress.reduce((sum, p) => sum + (p.quizCorrectAnswers || 0) * 10, 0);
  const scores = completed.map(p => p.quizScore || 0).filter(s => s > 0);
  const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const eraBreakdown: Record<string, { completed: number; xp: number }> = {};
  progress.forEach(p => {
    if (!eraBreakdown[p.era_id]) eraBreakdown[p.era_id] = { completed: 0, xp: 0 };
    if (p.isCompleted && p.quizCompleted) {
      eraBreakdown[p.era_id].completed += 1;
      eraBreakdown[p.era_id].xp += (p.quizCorrectAnswers || 0) * 10;
    }
  });

  if (context.xpByEra) {
    Object.entries(context.xpByEra).forEach(([era, xp]) => {
      if (eraBreakdown[era]) eraBreakdown[era].xp = xp;
    });
  }

  const recent = completed
    .filter(p => p.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .slice(0, 5)
    .map(p => ({
      eraId: p.era_id,
      adventureId: String(p.adventureId),
      moduleId: String(p.moduleId),
      quizScore: p.quizScore,
      completedAt: p.completedAt,
      completedAgo: getRelativeTime(p.completedAt!),
    }));

  return {
    success: true,
    data: {
      totalModulesCompleted: completed.length,
      totalXP: context.totalXP || totalXP,
      averageQuizScore: Math.round(avg * 10) / 10,
      currentEra: context.selectedEra || 'Not selected',
      eraBreakdown,
      recentCompletions: recent,
      streak: context.streak ? {
        currentStreak: context.streak.currentStreak,
        longestStreak: context.streak.longestStreak,
        lastActiveAgo: getRelativeTime(context.streak.lastActiveDate),
      } : null,
      journeyDuration: context.firstActivityAt ? getRelativeTime(context.firstActivityAt) : null,
    },
  };
}

async function getLastCompletedModule(context: ToolsContext, eraId?: string): ToolResult {
  let progress = [...context.progress];
  if (eraId) progress = progress.filter(p => p.era_id === eraId);

  const completed = progress
    .filter(p => p.isCompleted && p.quizCompleted && p.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

  if (completed.length === 0) {
    return { success: true, data: { message: 'No completed modules found.' } };
  }

  const last = completed[0];

  // Fetch module content from Supabase
  const { data: content } = await supabase
    .from('content')
    .select('*')
    .eq('era_id', last.era_id)
    .eq('adventure_id', String(last.adventureId));

  const module = content?.find((c: any) =>
    c.content_list?.some((item: any) => item.module_id === String(last.moduleId))
  );

  return {
    success: true,
    data: {
      eraId: last.era_id,
      adventureId: String(last.adventureId),
      moduleId: String(last.moduleId),
      quizScore: last.quizScore,
      completedAt: last.completedAt,
      completedAgo: getRelativeTime(last.completedAt!),
      content: module || null,
    },
  };
}

async function getModuleContent(eraId: string, adventureId: string, moduleId: string): ToolResult {
  const { data: content } = await supabase
    .from('content')
    .select('*')
    .eq('era_id', eraId)
    .eq('adventure_id', adventureId);

  if (!content || content.length === 0) {
    return { success: false, error: `No content found for era ${eraId}, adventure ${adventureId}` };
  }

  const module = content[0]?.content_list?.find((item: any) => item.module_id === moduleId);
  if (!module) {
    return { success: false, error: `Module ${moduleId} not found` };
  }

  return { success: true, data: module };
}

async function getEraOverview(context: ToolsContext, eraId: string): ToolResult {
  const { data: content } = await supabase
    .from('content')
    .select('*')
    .eq('era_id', eraId);

  if (!content || content.length === 0) {
    return { success: false, error: `No content found for era ${eraId}` };
  }

  const progress = context.progress.filter(p => p.era_id === eraId);

  return {
    success: true,
    data: {
      eraId,
      adventures: content.map((adv: any) => ({
        adventureId: adv.adventure_id,
        title: adv.title,
        modules: adv.content_list?.map((m: any) => {
          const prog = progress.find(p => String(p.moduleId) === m.module_id && String(p.adventureId) === adv.adventure_id);
          return {
            moduleId: m.module_id,
            title: m.title,
            isCompleted: prog?.isCompleted && prog?.quizCompleted,
            quizScore: prog?.quizScore,
          };
        }) || [],
      })),
    },
  };
}

async function searchLessons(context: ToolsContext, query: string, eraId?: string): ToolResult {
  let progress = [...context.progress];
  if (eraId) progress = progress.filter(p => p.era_id === eraId);

  const completedModules = progress.filter(p => p.isCompleted && p.quizCompleted);
  if (completedModules.length === 0) {
    return { success: true, data: { results: [], message: 'No completed lessons to search.' } };
  }

  // Fetch content for completed modules
  const eraIds = [...new Set(completedModules.map(p => p.era_id))];
  const { data: content } = await supabase
    .from('content')
    .select('*')
    .in('era_id', eraIds);

  if (!content) {
    return { success: true, data: { results: [] } };
  }

  const lowerQuery = query.toLowerCase();
  const results: any[] = [];

  for (const adv of content) {
    for (const module of adv.content_list || []) {
      const text = JSON.stringify(module).toLowerCase();
      if (text.includes(lowerQuery)) {
        results.push({
          eraId: adv.era_id,
          adventureId: adv.adventure_id,
          moduleId: module.module_id,
          title: module.title,
          matchSnippet: text.substring(Math.max(0, text.indexOf(lowerQuery) - 50), text.indexOf(lowerQuery) + 100),
        });
      }
    }
  }

  return { success: true, data: { results: results.slice(0, 5), query } };
}

function getLearningTimeline(context: ToolsContext, eraId?: string, limit?: number): ToolResult {
  let progress = [...context.progress];
  if (eraId) progress = progress.filter(p => p.era_id === eraId);

  const maxEntries = Math.min(limit || 10, 20);

  const timeline = progress
    .filter(p => p.firstAttemptAt || p.completedAt)
    .sort((a, b) => {
      const dateA = new Date(a.completedAt || a.firstAttemptAt).getTime();
      const dateB = new Date(b.completedAt || b.firstAttemptAt).getTime();
      return dateB - dateA;
    })
    .slice(0, maxEntries)
    .map(p => ({
      eraId: p.era_id,
      adventureId: String(p.adventureId),
      moduleId: String(p.moduleId),
      status: p.isCompleted && p.quizCompleted ? 'completed' : 'in_progress',
      startedAt: p.firstAttemptAt,
      startedAgo: p.firstAttemptAt ? getRelativeTime(p.firstAttemptAt) : null,
      completedAt: p.completedAt,
      completedAgo: p.completedAt ? getRelativeTime(p.completedAt) : null,
      quizScore: p.quizScore,
    }));

  return { success: true, data: { timeline, totalEntries: progress.length } };
}
```

Note: This adds a new file `rag.ts` (12 files total, one more than the spec — acceptable since it keeps `gemini.ts` focused on Gemini API calls and `rag.ts` on tool execution).

- [ ] **Step 3: Commit**

```bash
git add backend/src/gemini.ts backend/src/rag.ts
git commit -m "feat: add Gemini client with chat, explain, image gen/edit, and RAG tool execution"
```

---

## Task 6: API Routes

**Files:**
- Create: `backend/src/routes/chat.ts`
- Create: `backend/src/routes/explain.ts`
- Create: `backend/src/routes/image.ts`
- Create: `backend/src/routes/game.ts`
- Create: `backend/src/routes/webhook.ts`

- [ ] **Step 1: Create `backend/src/routes/chat.ts`**

```typescript
// routes/chat.ts - POST /ai/chat

import type { FastifyRequest, FastifyReply } from 'fastify';
import { checkQuota, decrementQuota } from '../quota.js';
import { chat } from '../gemini.js';
import type { ChatRequest, AuthPayload } from '../types.js';

export async function chatRoute(request: FastifyRequest, reply: FastifyReply) {
  const { userId, isSubscriber } = (request as any).auth as AuthPayload;
  const body = request.body as ChatRequest;

  if (!body.message) {
    return reply.status(400).send({ code: 'BAD_REQUEST', message: 'message is required' });
  }

  try {
    // Check quota BEFORE calling Gemini (reject early if exceeded)
    await checkQuota(userId, 'chat', isSubscriber);

    // Call Gemini (quota not yet decremented — if this fails, no slot is lost)
    const result = await chat(body, {});

    // Decrement quota AFTER success and attach remaining to response
    const quotaRemaining = await decrementQuota(userId, 'chat', isSubscriber);
    result.quotaRemaining = quotaRemaining;

    return reply.send(result);
  } catch (error: any) {
    if (error.statusCode === 429) {
      return reply.status(429).send(error.body);
    }
    request.log.error({ error }, 'Chat route error');
    return reply.status(502).send({ code: 'AI_ERROR', message: 'Failed to generate response' });
  }
}
```

- [ ] **Step 2: Create `backend/src/routes/explain.ts`**

```typescript
// routes/explain.ts - POST /ai/explain

import type { FastifyRequest, FastifyReply } from 'fastify';
import { checkQuota, decrementQuota } from '../quota.js';
import { explain } from '../gemini.js';
import type { ExplainRequest, AuthPayload } from '../types.js';

export async function explainRoute(request: FastifyRequest, reply: FastifyReply) {
  const { userId, isSubscriber } = (request as any).auth as AuthPayload;
  const body = request.body as ExplainRequest;

  if (!body.questions?.length || !body.userAnswers?.length || !body.eraName) {
    return reply.status(400).send({ code: 'BAD_REQUEST', message: 'questions, userAnswers, and eraName are required' });
  }

  try {
    await checkQuota(userId, 'chat', isSubscriber);

    const result = await explain(body, {});

    const quotaRemaining = await decrementQuota(userId, 'chat', isSubscriber);
    result.quotaRemaining = quotaRemaining;

    return reply.send(result);
  } catch (error: any) {
    if (error.statusCode === 429) {
      return reply.status(429).send(error.body);
    }
    request.log.error({ error }, 'Explain route error');
    return reply.status(502).send({ code: 'AI_ERROR', message: 'Failed to generate explanations' });
  }
}
```

- [ ] **Step 3: Create `backend/src/routes/image.ts`**

```typescript
// routes/image.ts - POST /ai/image

import type { FastifyRequest, FastifyReply } from 'fastify';
import { checkQuota, decrementQuota } from '../quota.js';
import { image } from '../gemini.js';
import type { ImageRequest, AuthPayload } from '../types.js';

export async function imageRoute(request: FastifyRequest, reply: FastifyReply) {
  const { userId, isSubscriber } = (request as any).auth as AuthPayload;
  const body = request.body as ImageRequest;

  if (!body.action || !body.prompt) {
    return reply.status(400).send({ code: 'BAD_REQUEST', message: 'action and prompt are required' });
  }

  const quotaType = body.action === 'edit' ? 'image_edit' : 'image_generate';

  try {
    await checkQuota(userId, quotaType, isSubscriber);

    const result = await image(body, {});

    const quotaRemaining = await decrementQuota(userId, quotaType, isSubscriber);
    result.quotaRemaining = quotaRemaining;

    return reply.send(result);
  } catch (error: any) {
    if (error.statusCode === 429) {
      return reply.status(429).send(error.body);
    }
    request.log.error({ error }, 'Image route error');
    return reply.status(502).send({ code: 'AI_ERROR', message: 'Failed to generate image' });
  }
}
```

- [ ] **Step 4: Create `backend/src/routes/game.ts`**

```typescript
// routes/game.ts - POST /ai/game

import type { FastifyRequest, FastifyReply } from 'fastify';
import { checkQuota, decrementQuota } from '../quota.js';
import { image } from '../gemini.js';
import { supabase } from '../auth.js';
import type { GameRequest, AuthPayload } from '../types.js';

export async function gameRoute(request: FastifyRequest, reply: FastifyReply) {
  const { userId, isSubscriber } = (request as any).auth as AuthPayload;
  const body = request.body as GameRequest;

  if (!body.eraId || !body.gameType || !body.topic) {
    return reply.status(400).send({ code: 'BAD_REQUEST', message: 'eraId, gameType, and topic are required' });
  }

  try {
    await checkQuota(userId, 'image_generate', isSubscriber);

    // Fetch era data from Supabase for contextual prompt
    const { data: eraData } = await supabase
      .from('eras')
      .select('era_id, title, timeline, description')
      .eq('era_id', body.eraId)
      .single();

    const eraName = eraData ? `${eraData.title} (${eraData.timeline})` : body.topic;

    const quotaRemaining = await decrementQuota(userId, 'image_generate', isSubscriber);

    // Generate the game image using the image endpoint logic
    const result = await image(
      {
        action: 'generate',
        prompt: `A historically accurate scene depicting ${body.topic} from ${eraName}. Educational, detailed, suitable for a jigsaw puzzle game.`,
        eraContext: { eraName },
      },
      quotaRemaining
    );

    return reply.send({
      imageBase64: result.imageBase64,
      mimeType: result.mimeType,
      title: body.topic,
      description: eraData?.description || '',
      quotaRemaining,
    });
  } catch (error: any) {
    if (error.statusCode === 429) {
      return reply.status(429).send(error.body);
    }
    request.log.error({ error }, 'Game route error');

    // Fallback to placeholder image (same as current client behavior)
    return reply.send({
      imageBase64: null,
      fallbackUrl: `https://picsum.photos/seed/${encodeURIComponent(body.topic)}/400/400`,
      title: body.topic,
      description: '',
      quotaRemaining: {},
    });
  }
}
```

- [ ] **Step 5: Create `backend/src/routes/webhook.ts`**

```typescript
// routes/webhook.ts - POST /webhook/revenuecat

import type { FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../auth.js';

export async function webhookRoute(request: FastifyRequest, reply: FastifyReply) {
  // Verify webhook secret
  const authHeader = request.headers.authorization;
  const expectedSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    request.log.warn('Invalid webhook secret');
    return reply.status(401).send({ error: 'Invalid webhook secret' });
  }

  const body = request.body as any;
  const event = body?.event;

  if (!event) {
    return reply.status(400).send({ error: 'Missing event data' });
  }

  const appUserId = event.app_user_id;
  if (!appUserId) {
    return reply.status(400).send({ error: 'Missing app_user_id' });
  }

  request.log.info({ eventType: event.type, appUserId }, 'RevenueCat webhook received');

  try {
    // Call RevenueCat API to get definitive subscriber status
    const rcStatus = await fetchDefinitiveStatus(appUserId);

    // Upsert subscription_status table
    await supabase.from('subscription_status').upsert({
      user_id: appUserId,
      is_subscriber: rcStatus.isSubscriber,
      entitlements: rcStatus.entitlements,
      expires_at: rcStatus.expiresAt,
      updated_at: new Date().toISOString(),
    });

    request.log.info({ appUserId, isSubscriber: rcStatus.isSubscriber }, 'Subscription status updated');

    return reply.status(200).send({ success: true });
  } catch (error) {
    request.log.error({ error, appUserId }, 'Webhook processing error');
    // Return 200 anyway to prevent RevenueCat from retrying on our processing errors
    // (the data issue should be investigated, not retried)
    return reply.status(200).send({ success: false, error: 'Processing error' });
  }
}

async function fetchDefinitiveStatus(appUserId: string): Promise<{
  isSubscriber: boolean;
  entitlements: string[];
  expiresAt: string | null;
}> {
  const secretKey = process.env.REVENUECAT_SECRET_KEY;
  if (!secretKey) {
    return { isSubscriber: false, entitlements: [], expiresAt: null };
  }

  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${appUserId}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });

  if (!res.ok) {
    throw new Error(`RevenueCat API returned ${res.status}`);
  }

  const data = await res.json();
  const entitlements = data?.subscriber?.entitlements || {};
  const activeEntitlements: string[] = [];
  let latestExpiry: string | null = null;

  for (const [name, ent] of Object.entries(entitlements) as any[]) {
    const isActive = ent.expires_date === null || new Date(ent.expires_date) > new Date();
    if (isActive) {
      activeEntitlements.push(name);
      if (ent.expires_date && (!latestExpiry || ent.expires_date > latestExpiry)) {
        latestExpiry = ent.expires_date;
      }
    }
  }

  return {
    isSubscriber: activeEntitlements.length > 0,
    entitlements: activeEntitlements,
    expiresAt: latestExpiry,
  };
}
```

- [ ] **Step 6: Verify full backend compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors. All imports resolve.

- [ ] **Step 7: Commit**

```bash
git add backend/src/routes/
git commit -m "feat: add all API routes — chat, explain, image, game, webhook"
```

---

## Task 7: Supabase Table + Backend Local Testing

**Files:**
- None (SQL executed in Supabase dashboard)

- [ ] **Step 1: Create `subscription_status` table in Supabase**

Execute this SQL in the Supabase SQL editor:

```sql
CREATE TABLE IF NOT EXISTS subscription_status (
  user_id TEXT PRIMARY KEY,
  is_subscriber BOOLEAN NOT NULL DEFAULT false,
  entitlements JSONB DEFAULT '[]',
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow service role full access (backend uses service key)
ALTER TABLE subscription_status ENABLE ROW LEVEL SECURITY;

-- RLS policy: service role can do everything
CREATE POLICY "Service role full access" ON subscription_status
  FOR ALL USING (true) WITH CHECK (true);
```

- [ ] **Step 2: Create `.env` file for local development**

Create `backend/.env` with actual values (from existing `.env` and Supabase/Clerk dashboards):

```env
GEMINI_API_KEY=<copy from current EXPO_PUBLIC_GEMINI_API_KEY>
CLERK_SECRET_KEY=<from Clerk dashboard>
CLERK_PUBLISHABLE_KEY=<from Clerk dashboard>
REVENUECAT_SECRET_KEY=<from RevenueCat dashboard>
REVENUECAT_WEBHOOK_SECRET=<generate a random string>
SUPABASE_URL=<copy from current EXPO_PUBLIC_SUPABASE_URL>
SUPABASE_SERVICE_KEY=<from Supabase dashboard - Settings > API > service_role key>
PORT=3000
```

- [ ] **Step 3: Add `backend/.env` to `.gitignore`**

Ensure `backend/.env` is not committed. Check the root `.gitignore`:

```
# Add if not present
backend/.env
```

- [ ] **Step 4: Test the server starts**

Run: `cd backend && npm run dev`
Expected: `Server listening at http://0.0.0.0:3000`

- [ ] **Step 5: Test health endpoint**

Run: `curl http://localhost:3000/health`
Expected: `{"status":"ok","timestamp":"..."}`

- [ ] **Step 6: Test auth rejects unauthenticated requests**

Run: `curl -X POST http://localhost:3000/ai/chat -H "Content-Type: application/json" -d '{"message":"test"}'`
Expected: `{"code":"UNAUTHORIZED","message":"Missing or invalid Authorization header"}`

- [ ] **Step 7: Commit**

```bash
git add .gitignore
git commit -m "feat: add subscription_status table and local dev environment"
```

---

## Task 8: Client API Wrapper

**Files:**
- Create: `services/api.ts`

- [ ] **Step 1: Create `services/api.ts`**

```typescript
// api.ts - Thin fetch wrapper for backend AI calls

import { useAuth } from '@clerk/clerk-expo';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export class AIBackendError extends Error {
  code: string;
  quotaRemaining?: Record<string, number>;
  resetDate?: string;

  constructor(code: string, message: string, quotaRemaining?: Record<string, number>, resetDate?: string) {
    super(message);
    this.code = code;
    this.quotaRemaining = quotaRemaining;
    this.resetDate = resetDate;
  }
}

/**
 * Make an authenticated request to the AI backend.
 * Automatically attaches the Clerk JWT token.
 */
export async function aiRequest<T>(
  path: string,
  body: object,
  getToken: () => Promise<string | null>
): Promise<T> {
  const token = await getToken();
  if (!token) {
    throw new AIBackendError('UNAUTHORIZED', 'Not signed in');
  }

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errorData: any;
    try {
      errorData = await res.json();
    } catch {
      errorData = { code: 'UNKNOWN', message: `HTTP ${res.status}` };
    }

    throw new AIBackendError(
      errorData.code || 'UNKNOWN',
      errorData.message || `Request failed with status ${res.status}`,
      errorData.quotaRemaining,
      errorData.resetDate
    );
  }

  return res.json();
}
```

- [ ] **Step 2: Commit**

```bash
git add services/api.ts
git commit -m "feat: add client API wrapper for backend AI calls"
```

---

## Task 9: Migrate Client AIService.ts

**Files:**
- Modify: `gamification/services/AIService.ts`

Replace all Gemini SDK calls with backend API calls via `services/api.ts`. Keep the same public interface so `AIChatModal`, `AIQuizExplanation`, and other consumers don't need changes.

- [ ] **Step 1: Rewrite `AIService.ts` to use backend**

The key change: remove `@google/genai` import, remove the `GoogleGenAI` client, and replace each method body with a `fetch()` call to the backend. Keep the same method signatures and return types.

In `gamification/services/AIService.ts`, replace the entire file with:
- Remove: `import { GoogleGenAI, ... } from '@google/genai'`
- Remove: `import { aiToolsService, ... } from './AIToolsService'`
- Remove: private `ai` property, `constructor()`, `isAvailable()`
- Remove: all `buildXxxPrompt()` methods (moved to backend `prompts.ts`)
- Remove: all direct `this.ai.models.generateContent()` calls
- Keep: Type interfaces (`WebSearchSource`, `ChatResponseWithSources`, `QuizExplanationRequest`, etc.)
- Keep: `isImageRequest()`, `isImageEditRequest()` helper methods (UI logic, stays on client)
- Add: `import { aiRequest } from '@/services/api'`
- Change: each method to call the appropriate backend endpoint

The modified `AIService` class should have this structure:

```typescript
// AIService.ts - Now proxies through backend instead of calling Gemini directly

import { aiRequest, AIBackendError } from '@/services/api';
import type { Question } from '@/components/shared/types';
import AppLogger from '@/services/AppLogger';

// Keep existing type exports (unchanged)
export interface WebSearchSource { uri: string; title: string; }
export interface ChatResponseWithSources { text: string; sources?: WebSearchSource[]; searchQueries?: string[]; }

interface QuizExplanationRequest {
  questionText: string; correctAnswer: string; userAnswer: string;
  questionType: 'mcq' | 'trueFalse' | 'fillInBlank';
  eraName: string; adventureName?: string;
  userLevel?: 'beginner' | 'intermediate' | 'advanced';
  isCorrect?: boolean;
}

interface AIExplanationResponse { explanation: string; relatedTopic?: string; }

class AIService {
  private getToken: (() => Promise<string | null>) | null = null;

  /** Set the token getter (called from AIContext when Clerk is available) */
  setTokenGetter(getter: () => Promise<string | null>): void {
    this.getToken = getter;
  }

  isAvailable(): boolean {
    return this.getToken !== null;
  }

  private async request<T>(path: string, body: object): Promise<T> {
    if (!this.getToken) throw new Error('AI Service not initialized. Call setTokenGetter first.');
    return aiRequest<T>(path, body, this.getToken);
  }

  // ─── Quiz Explanations ───

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

  async getBatchedExplanations(
    questions: Question[], userAnswers: number[],
    context: { eraName: string; adventureName?: string; userLevel?: string }
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

  async getMultipleExplanations(
    questions: Question[], userAnswers: number[],
    context: { eraName: string; adventureName?: string; userLevel?: string }
  ): Promise<AIExplanationResponse[]> {
    // Backend handles batching — just call the same endpoint
    return this.getBatchedExplanations(questions, userAnswers, context);
  }

  // ─── Chat ───

  async getChatResponse(params: {
    userMessage: string;
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string; image?: { base64: string; mimeType: string } }>;
    context?: { eraId?: string; eraName?: string; adventureId?: string; currentScreen?: string };
    userProgress?: { totalXP: number; completedModules: number; averageQuizScore: number; recentCompletions: any[]; totalModulesAttempted: number };
    knowledgeContext?: string;
    enableRAG?: boolean;
    enableWebSearch?: boolean;
    toolsContext?: any;
  }): Promise<ChatResponseWithSources> {
    try {
      const result = await this.request<{
        content: string;
        sources?: WebSearchSource[];
        searchQueries?: string[];
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
      };
    } catch (error) {
      AppLogger.error('ai', 'Chat error', {}, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // ─── Image Generation ───

  async generateImage(params: {
    prompt: string;
    context?: { eraName?: string; adventureId?: string };
  }): Promise<{ imageBase64: string; mimeType: string; caption?: string } | null> {
    try {
      const result = await this.request<{
        imageBase64: string; mimeType: string; caption?: string;
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

  async editImage(params: {
    imageBase64: string; mimeType: string; editPrompt: string;
    context?: { eraName?: string; adventureId?: string };
  }): Promise<{ imageBase64: string; mimeType: string; caption?: string } | null> {
    try {
      const result = await this.request<{
        imageBase64: string; mimeType: string; caption?: string;
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

  async analyzeImage(params: {
    imageBase64: string; mimeType: string; userMessage?: string;
    context?: { eraName?: string; adventureId?: string };
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

  isImageRequest(message: string): boolean {
    const lower = message.toLowerCase();
    const actionWords = ['generate', 'create', 'make', 'draw', 'show', 'visualize', 'produce'];
    const imageWords = ['image', 'picture', 'illustration', 'visual', 'artwork', 'scene'];
    if (actionWords.some(w => lower.includes(w)) && imageWords.some(w => lower.includes(w))) return true;
    const directPhrases = ['picture of', 'illustration of', 'image of', 'draw me', 'show me what'];
    return directPhrases.some(p => lower.includes(p));
  }

  isImageEditRequest(message: string): boolean {
    const lower = message.toLowerCase();
    const editKeywords = [
      'put me in', 'dress me', 'make me', 'transform me', 'show me as',
      'imagine me', 'place me', 'edit', 'change my', 'add to my',
      'make this', 'turn this into', 'convert', 'style me',
      'historical clothes', 'old clothes', 'traditional', 'costume',
    ];
    return editKeywords.some(k => lower.includes(k));
  }
}

export const aiService = new AIService();
```

- [ ] **Step 2: Wire up `setTokenGetter` in AIContext**

In `gamification/engines/AIContext.tsx`, find where `aiService` is used and add the token getter setup. Look for the component that has access to `useAuth()` from Clerk:

```typescript
import { useAuth } from '@clerk/clerk-expo';

// Inside the AIProvider component:
const { getToken } = useAuth();

useEffect(() => {
  aiService.setTokenGetter(getToken);
}, [getToken]);
```

- [ ] **Step 3: Commit**

```bash
git add gamification/services/AIService.ts gamification/engines/AIContext.tsx
git commit -m "feat: migrate AIService to use backend API instead of direct Gemini calls"
```

---

## Task 10: Migrate GameGeneratorService + Clean Up

**Files:**
- Modify: `gamification/services/GameGeneratorService.ts`
- Modify: `gamification/services/AIStorageService.ts`
- Delete: `gamification/services/AIToolsService.ts`

- [ ] **Step 1: Update `GameGeneratorService.ts`**

The `findHistoricalImage` method currently calls `aiService.generateImage()` which now goes through the backend. The game generator also uses `aiService.getChatResponse()` for timeline/wordsearch games. Both now proxy through the backend automatically since `AIService` was migrated in Task 9.

The only change needed: remove the direct `supabase` import for `fetchEraData` — let the backend handle era context. Update `findHistoricalImage` to pass `eraId` to `aiService.generateImage()` instead of fetching era data locally.

In `gamification/services/GameGeneratorService.ts`, change the `findHistoricalImage` method:

```typescript
// Replace the fetchEraData + findHistoricalImage methods with:
private async findHistoricalImage(topic: string, eraId?: string): Promise<string> {
  const USE_AI_IMAGES = true;

  if (!USE_AI_IMAGES) {
    return 'https://picsum.photos/seed/' + encodeURIComponent(topic) + '/400/400';
  }

  try {
    const varietyModifiers = this.generateVarietyModifiers();
    const imagePrompt = this.buildEraContextualPrompt(topic, null, varietyModifiers);

    const imageResult = await aiService.generateImage({
      prompt: imagePrompt,
      context: { eraName: eraId || topic },
    });

    if (imageResult) {
      return `data:${imageResult.mimeType};base64,${imageResult.imageBase64}`;
    }

    return 'https://picsum.photos/seed/' + encodeURIComponent(topic) + '/400/400';
  } catch (error) {
    console.error('Game image generation error:', error);
    return 'https://picsum.photos/seed/' + encodeURIComponent(topic) + '/400/400';
  }
}
```

Also remove `import { supabase } from '@/hooks/lib/supabase'` if `fetchEraData` was the only use.

- [ ] **Step 2: Clean up `AIStorageService.ts`**

Remove `checkQuota()`, `getRemainingQuota()`, and `trackUsage()` methods — the backend handles these now. Keep: `loadUserData()`, `saveMessages()`, `clearMessages()`, `uploadImage()`, and `getPublicUrl()`.

Remove the `QUOTA_LIMITS` and `COST_ESTIMATES` constants.

Remove the `QuotaLimits`, `QuotaCheckResult` type exports (no longer needed on client).

Keep: `StoredMessage`, `UsageStats`, `MonthlyUsage`, `AIUserData` types (used by message persistence).

- [ ] **Step 3: Delete `AIToolsService.ts`**

Run: `rm gamification/services/AIToolsService.ts`

All RAG tool logic now lives in `backend/src/rag.ts` and `backend/src/prompts.ts`.

- [ ] **Step 4: Update `gamification/index.ts` exports**

Remove any re-exports of `AIToolsService` from the public API.

- [ ] **Step 5: Run lint**

Run: `npm run lint`
Expected: No errors related to the changes. Fix any import errors from the deleted `AIToolsService`.

- [ ] **Step 6: Commit**

```bash
git add gamification/services/GameGeneratorService.ts gamification/services/AIStorageService.ts gamification/index.ts
git rm gamification/services/AIToolsService.ts
git commit -m "feat: migrate GameGeneratorService to backend, clean up client quota code, delete AIToolsService"
```

---

## Task 11: Environment Variables + Final Integration

**Files:**
- Modify: `.env` (or `.env.example`)
- Modify: `eas.json` (add `EXPO_PUBLIC_BACKEND_URL`)

- [ ] **Step 1: Update `.env`**

Remove `EXPO_PUBLIC_GEMINI_API_KEY`. Add:

```
EXPO_PUBLIC_BACKEND_URL=http://localhost:3000
```

- [ ] **Step 2: Update `eas.json`**

Add `EXPO_PUBLIC_BACKEND_URL` to the `base.env` section for all build profiles. The production value will be the Railway deployment URL (e.g., `https://archives-backend-production.up.railway.app`).

```json
"EXPO_PUBLIC_BACKEND_URL": "https://your-railway-url.up.railway.app"
```

- [ ] **Step 3: Full lint check**

Run: `npm run lint`
Expected: All clean. No references to `EXPO_PUBLIC_GEMINI_API_KEY` or `AIToolsService`.

- [ ] **Step 4: Verify no Gemini SDK imports remain in app code**

Run: `grep -r "@google/genai" --include="*.ts" --include="*.tsx" --exclude-dir=backend --exclude-dir=node_modules .`
Expected: Zero results. The Gemini SDK is only used in `backend/`.

- [ ] **Step 5: Commit**

```bash
git add .env eas.json
git commit -m "feat: update environment variables — remove GEMINI_API_KEY, add BACKEND_URL"
```

---

## Task 12: End-to-End Testing

**Files:** None (manual testing)

- [ ] **Step 1: Start backend locally**

Run: `cd backend && npm run dev`
Expected: Server listening on port 3000.

- [ ] **Step 2: Start Expo app**

Run: `npx expo start --clear`
Expected: Metro bundler starts with no errors.

- [ ] **Step 3: Test AI Chat**

Open the app on iOS simulator. Tap the floating AI button. Send a message. Verify:
- Response comes back (the backend is proxying to Gemini)
- No errors in the backend terminal
- No errors in the Metro terminal

- [ ] **Step 4: Test Quiz Explanations**

Complete a quiz. Verify AI explanations load correctly on the results screen.

- [ ] **Step 5: Test Image Generation**

In the AI chat, request an image (e.g., "Generate an image of the Great Mosque of Damascus"). Verify the image loads.

- [ ] **Step 6: Test Quota Enforcement**

Check the backend logs for quota check/decrement messages. Verify the `ai_user_data` table in Supabase shows updated `monthly_usage`.

- [ ] **Step 7: Test on Android**

Repeat steps 3-5 on Android emulator to verify cross-platform compatibility.

- [ ] **Step 8: Final commit**

```bash
git commit --allow-empty -m "test: verify end-to-end AI backend integration on both platforms"
```
