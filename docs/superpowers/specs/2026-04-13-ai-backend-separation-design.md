# AI Backend Separation — Design Spec

**Date:** 2026-04-13
**Branch:** `4.0.0`
**Status:** Approved design, pending implementation plan
**Supersedes:** `2026-03-13-ai-backend-service-design.md` (Python approach, never implemented)

---

## 1. Motivation

Move all AI features behind a dedicated backend server. The app currently calls the Gemini API directly from the React Native client using a public API key (`EXPO_PUBLIC_GEMINI_API_KEY`), with quota enforcement on the client side (bypassable).

### Goals

1. **Security** — Hide the Gemini API key behind the server. Remove it from the app bundle entirely.
2. **Cost control** — Server-side quota enforcement that cannot be bypassed by a modified client.
3. **Observability** — Centralized logging of all AI usage, costs, and errors in one place.
4. **Feature expansion** — Server-side prompt management enables A/B testing prompts, changing models, and adding guardrails without app updates.

### Scope

**In scope:** AI Chat, Quiz Explanations, Image Generation, Image Editing, Game Generation, Quota Enforcement, RevenueCat webhook for subscription status.

**Out of scope:** Supabase operations, Clerk auth, RevenueCat SDK, PostHog, Sentry, Affinity Notification Service, push notifications. These stay client-direct.

### Constraints

- Net latency addition must be imperceptible (+50-100ms on operations that already take 1-5s)
- Identical UX — no regressions, same outputs
- Railway hosting
- Monorepo — `backend/` folder inside existing Archives_Expo repo

---

## 2. Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Runtime | Node.js | Shared TypeScript with the app — shared types, one language |
| Framework | Fastify | ~3x faster than Express, built-in JSON schema validation, first-class TypeScript |
| Language | TypeScript | Shared types between app and backend, catches contract mismatches at compile time |
| Hosting | Railway | PaaS with auto-deploy from GitHub, env var management, subdirectory support |
| Auth | Clerk JWT verification | Reuses existing app tokens, `@clerk/fastify` plugin |
| Subscription | RevenueCat webhooks → Supabase | 0% error — webhook guaranteed delivery, DB is source of truth |
| Database | Supabase (existing) | New `subscription_status` table for webhook-synced subscription data |
| AI | Google Gemini (`@google/genai`) | Same SDK as current client-side, same models |

---

## 3. File Structure

```
backend/
├── package.json
├── tsconfig.json
├── src/
│   ├── server.ts           # Fastify setup, plugins, start
│   ├── auth.ts             # Clerk JWT verify + subscription status read from Supabase
│   ├── quota.ts            # Usage tracking + quota enforcement (read/write Supabase)
│   ├── gemini.ts           # Single Gemini client — chat, explain, image gen, image edit
│   ├── prompts.ts          # All system prompts + RAG tool definitions
│   ├── routes/
│   │   ├── chat.ts         # POST /ai/chat
│   │   ├── explain.ts      # POST /ai/explain
│   │   ├── image.ts        # POST /ai/image
│   │   ├── game.ts         # POST /ai/game
│   │   └── webhook.ts      # POST /webhook/revenuecat
│   └── types.ts            # Shared request/response types
└── 11 files total
```

### File Responsibilities

- **server.ts** — Fastify instance, register plugins (CORS, auth hook), register routes, start listener. ~60 lines.
- **auth.ts** — Exports a Fastify `onRequest` hook. Verifies Clerk JWT, extracts `userId`. Reads subscription status from `subscription_status` table in Supabase. Attaches `{ userId, isSubscriber }` to request. ~50 lines.
- **quota.ts** — Exports `checkQuota(userId, requestType, isSubscriber)` and `decrementQuota(userId, requestType)`. Reads/writes the existing `ai_user_data` table (monthly_usage field). ~80 lines.
- **gemini.ts** — Initializes `GoogleGenAI` with the secret key. Exports `chat()`, `explain()`, `generateImage()`, `editImage()`. Each function takes typed params, calls Gemini, returns typed response. ~200 lines.
- **prompts.ts** — All system prompts (Islamic history education context, safety guidelines), RAG tool definitions (getUserProgress, getModuleContent, etc.), and prompt construction helpers. Ported verbatim from current `AIService.ts` and `AIToolsService.ts`. ~300 lines.
- **types.ts** — Request/response types shared with the app. ~60 lines.
- **routes/*.ts** — Thin route handlers. Validate input, call quota check, call gemini function, decrement quota, return response. Each ~40-60 lines.

---

## 4. API Endpoints

All `/ai/*` endpoints require `Authorization: Bearer <clerk_jwt>` header.

### 4.1 POST /ai/chat

AI chat with RAG function calling and optional web search.

**Request:**
```json
{
  "message": "Tell me about the Umayyad Dynasty",
  "conversationHistory": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "imageBase64": null,
  "sessionId": "uuid",
  "context": {
    "eraId": "era-1",
    "adventureId": "adv-1",
    "userProgress": { "completedModules": [], "eraXP": 150 }
  }
}
```

**Response:**
```json
{
  "content": "The Umayyad Dynasty was...",
  "sources": [{ "title": "...", "url": "..." }],
  "toolsUsed": ["getUserProgress"],
  "quotaRemaining": { "chat": 95 }
}
```

### 4.2 POST /ai/explain

Quiz explanations (batched — all questions in one request).

**Request:**
```json
{
  "questions": [
    {
      "question": "Who founded the Umayyad Dynasty?",
      "options": ["Muawiya I", "Abu Bakr", "Umar", "Ali"],
      "correctAnswer": 0,
      "userAnswer": 1,
      "isCorrect": false
    }
  ],
  "eraId": "era-1",
  "adventureId": "adv-1"
}
```

**Response:**
```json
{
  "explanations": ["Muawiya I founded the Umayyad Dynasty in 661 CE..."],
  "quotaRemaining": { "chat": 94 }
}
```

### 4.3 POST /ai/image

Image generation and editing.

**Request (generate):**
```json
{
  "action": "generate",
  "prompt": "A bustling Umayyad marketplace in Damascus",
  "eraContext": { "title": "Umayyad Dynasty", "timeline": "661-750 CE" }
}
```

**Request (edit):**
```json
{
  "action": "edit",
  "prompt": "Make it a winter scene",
  "imageBase64": "<base64 of original image>"
}
```

**Response:**
```json
{
  "imageBase64": "<base64 of generated/edited image>",
  "quotaRemaining": { "imageGenerate": 9 }
}
```

Note: Image upload to Supabase Storage stays on the client (`AIStorageService`). The backend only generates/edits — the client handles persistence.

### 4.4 POST /ai/game

Game content generation (jigsaw puzzle images).

**Request:**
```json
{
  "eraId": "era-1",
  "gameType": "jigsaw"
}
```

**Response:**
```json
{
  "imageBase64": "<base64 of historical scene>",
  "title": "The Great Mosque of Damascus",
  "description": "Built during the Umayyad period..."
}
```

### 4.5 POST /webhook/revenuecat

RevenueCat subscription webhook. No Clerk auth — uses RevenueCat webhook secret for verification.

**Behavior:**
1. Verify webhook signature using `REVENUECAT_WEBHOOK_SECRET`
2. Extract `app_user_id` and event type
3. Call RevenueCat `GET /v1/subscribers/{app_user_id}` with secret key to get definitive status
4. Upsert `subscription_status` table in Supabase:
   ```json
   {
     "user_id": "clerk_user_id",
     "is_subscriber": true,
     "entitlements": ["premium"],
     "expires_at": "2026-05-13T00:00:00Z",
     "updated_at": "2026-04-13T12:00:00Z"
   }
   ```

---

## 5. Request Flow

Every `/ai/*` request follows the same pipeline:

```
1. Request arrives at Fastify
2. auth.ts hook:
   a. Verify Clerk JWT → extract userId (reject 401 if invalid)
   b. Read subscription_status from Supabase → isSubscriber
   c. Attach { userId, isSubscriber } to request
3. Route handler:
   a. Validate request body (Fastify JSON schema)
   b. quota.ts — checkQuota(userId, requestType, isSubscriber) → reject 429 if exceeded
   c. prompts.ts — build system prompt + RAG tools for this request type
   d. gemini.ts — call Gemini API with constructed prompt
   e. quota.ts — decrementQuota(userId, requestType) (only on success)
   f. Return response with quotaRemaining
```

Quota is decremented AFTER the Gemini call succeeds. If Gemini fails or times out, the user does not lose a quota slot.

---

## 6. Subscription Status via RevenueCat Webhooks

### Why Webhooks + DB (not API-per-request)

- RevenueCat webhooks fire within seconds of subscription changes
- RevenueCat retries failed webhooks with exponential backoff until acknowledged
- On webhook receipt, backend calls `GET /v1/subscribers/{id}` to confirm definitive status
- Writes to Supabase `subscription_status` table
- AI requests read from this table (~2ms) — no external call, no rate limit, no runtime dependency on RevenueCat
- If RevenueCat is down during an AI request, it doesn't matter — the DB has the status

### New Supabase Table

```sql
CREATE TABLE subscription_status (
  user_id TEXT PRIMARY KEY,
  is_subscriber BOOLEAN NOT NULL DEFAULT false,
  entitlements JSONB DEFAULT '[]',
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### First-Time User Handling

If a user makes an AI request but has no row in `subscription_status` (new user, webhook hasn't fired yet):
- Default to `is_subscriber = false` (free tier quotas)
- Backend calls RevenueCat API as a one-time fallback to populate the row
- Subsequent requests read from DB

---

## 7. Quota System

Quotas move from client-side (`AIStorageService.checkQuota`) to server-side (`quota.ts`). Same limits, enforced where they can't be bypassed.

| Feature | Free (Monthly) | Subscriber (Monthly) |
|---------|----------------|----------------------|
| Chat | 100 | Unlimited |
| Image Generate | 10 | 100 |
| Image Edit | 10 | 50 |
| Quiz Explain | 100 | Unlimited |

Quota data continues to live in the existing `ai_user_data` Supabase table (`monthly_usage` field). The backend reads/writes this table directly using the Supabase service role key.

---

## 8. Client-Side Changes

### Files That Change

| File | Change |
|------|--------|
| `gamification/services/AIService.ts` | Replace all Gemini SDK calls with `fetch()` to backend endpoints |
| `gamification/services/GameGeneratorService.ts` | Replace Gemini image gen with `POST /ai/game` |
| `gamification/services/AIStorageService.ts` | Remove `checkQuota()` and `trackUsage()` — backend handles it. Keep message persistence and image upload. |
| `gamification/services/AIToolsService.ts` | Delete entirely — RAG tools move to `backend/src/prompts.ts` |
| `.env` | Remove `EXPO_PUBLIC_GEMINI_API_KEY`. Add `EXPO_PUBLIC_BACKEND_URL` |
| *(new)* `services/api.ts` | Thin fetch wrapper (~30 lines) — adds Clerk JWT header, handles errors |

### Files That Don't Change

- `gamification/engines/AIContext.tsx` — UI state management, untouched
- `components/quiz/AIChatModal.tsx` — renders chat, untouched
- `components/quiz/AIQuizExplanation.tsx` — renders explanations, untouched
- `components/ai/AIAssistant.tsx` — untouched
- `components/ai/FloatingAIButton.tsx` — untouched
- `gamification/services/AIContextService.ts` — stays on client, builds user context from local progress

### New Client File: services/api.ts

```typescript
// ~30 lines — thin wrapper for backend calls
async function aiRequest<T>(path: string, body: object): Promise<T> {
  const token = await getClerkToken();
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new AIBackendError(error.code, error.message);
  }
  return res.json();
}
```

---

## 9. Railway Deployment

```
Railway Project
├── Service: "archives-backend"
│   ├── Root directory: backend/
│   ├── Build command: npm run build
│   ├── Start command: npm start
│   ├── Environment variables:
│   │   ├── GEMINI_API_KEY              (secret)
│   │   ├── CLERK_SECRET_KEY            (verify JWTs)
│   │   ├── CLERK_PUBLISHABLE_KEY       (Clerk SDK init)
│   │   ├── REVENUECAT_SECRET_KEY       (server API calls)
│   │   ├── REVENUECAT_WEBHOOK_SECRET   (webhook signature verification)
│   │   ├── SUPABASE_URL
│   │   ├── SUPABASE_SERVICE_KEY        (service role — bypasses RLS)
│   │   └── PORT                        (set by Railway)
│   └── Deploy trigger: push to main with changes in backend/**
```

Railway auto-detects the `backend/` subdirectory. Only rebuilds when backend files change.

---

## 10. Error Handling

| Error | HTTP Status | Client behavior |
|-------|-------------|-----------------|
| Invalid/expired Clerk JWT | 401 | Redirect to sign-in |
| Quota exceeded | 429 + `{ quotaRemaining, resetDate }` | Show quota limit UI (existing) |
| Gemini API error | 502 | Show retry button |
| Gemini timeout (>30s) | 504 | Show retry button |
| Invalid request body | 400 | Log to Sentry (client bug) |
| RevenueCat webhook invalid signature | 401 | Ignore (logged server-side) |

---

## 11. Security Improvements

| Before (client-direct) | After (backend) |
|------------------------|-----------------|
| `EXPO_PUBLIC_GEMINI_API_KEY` in app bundle | Gemini key only on Railway server |
| Client-side quota checks (bypassable) | Server-side enforcement (auth + quota before Gemini call) |
| System prompts visible in app bundle | Prompts live on server, invisible to users |
| No per-user API usage tracking | Server logs every AI call with userId, cost, latency |
| No rate limiting | Fastify rate-limit plugin per userId |
