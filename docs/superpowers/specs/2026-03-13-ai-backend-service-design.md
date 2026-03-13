# AI Backend Service — Design Spec

**Date:** 2026-03-13
**Branch:** `feature/ai-backend` (worktree at `.worktrees/ai-backend`)
**Base:** `4.0.0`
**Status:** Approved design, pending implementation plan

---

## 1. Motivation

Move all client-side AI features (Gemini API calls, RAG function calling, quota enforcement) to a dedicated Python backend service. Primary driver is **feature expansion** — a backend enables server-side AI pipelines, scheduled tasks, and new capabilities that are impractical from a mobile client. Secondary benefits include server-side quota enforcement (no client bypass) and centralized prompt management.

### Constraints

- **Low latency:** Net addition must be imperceptible (+50-100ms on operations that already take 1-5s)
- **Same feature experience:** No regressions — identical UX, same prompts, same outputs
- **Railway hosting:** Python service deployed on Railway
- **Clerk JWT auth:** Reuse existing app tokens, backend verifies them
- **Approach:** Thin Proxy + Server-Side Quota (Approach B from brainstorming)

---

## 2. Endpoints

| Endpoint | Method | Purpose | Gemini Model |
|----------|--------|---------|--------------|
| `/chat` | POST | AI chat with RAG function calling | `gemini-3-flash-preview` |
| `/chat/web-search` | POST | AI chat with Google Search grounding | `gemini-3-flash-preview` |
| `/quiz/explain` | POST | Single quiz answer explanation | `gemini-3-flash-preview` |
| `/quiz/explain/batch` | POST | Batch explanation for all 5 quiz answers | `gemini-3-flash-preview` |
| `/image/generate` | POST | AI image generation | `gemini-3-pro-image-preview` |
| `/image/edit` | POST | AI image editing (user photo + prompt) | `gemini-3-pro-image-preview` |
| `/image/analyze` | POST | Analyze uploaded image | `gemini-3-flash-preview` |
| `/health` | GET | Health check | — |

---

## 3. Exact API Contracts

### 3.1 POST /chat

**Request:**
```json
{
  "message": "Tell me about the Umayyad Dynasty",
  "conversationHistory": [
    { "role": "user", "parts": [{ "text": "..." }] },
    { "role": "model", "parts": [{ "text": "..." }] }
  ],
  "userId": "user_abc123"
}
```

**Backend processing:**
1. Verify Clerk JWT -> extract `user_id`
2. Check quota (`chat` action)
3. Call `needsWebSearch()` — if true, redirect to `/chat/web-search` logic internally
4. Build Gemini request with:
   - **System prompt:** Ibu learning buddy persona (verbatim from `AIService.ts` `SYSTEM_PROMPT`)
   - **Model:** `gemini-3-flash-preview`
   - **Config:** `maxOutputTokens: 2048`, `temperature: 1.0`, `thinkingConfig: { thinkingBudget: 0 }`
   - **Tools:** 6 RAG function declarations (AUTO mode)
5. Execute function calling loop (Gemini calls tools -> backend executes against Supabase -> return results -> Gemini generates final response)
6. Increment quota
7. Return response

**System prompt (verbatim):**
```
You are Ibu, a wise and playful owl who serves as a learning buddy in the Archives app — an educational app about Islamic history for Muslim kids. You combine deep knowledge of Islamic history with an encouraging, age-appropriate teaching style.

IMPORTANT GUIDELINES:
- You MUST stay focused on Islamic history topics only
- Keep your responses concise (2-3 short paragraphs maximum)
- Use simple, engaging language appropriate for young learners
- Be encouraging and celebrate curiosity
- You can use emojis occasionally to be friendly 🦉
- If asked about non-Islamic-history topics, gently redirect back to Islamic history
- Reference the user's learning progress when relevant using the available tools
- Format responses in plain text, avoid markdown headers or complex formatting
- Use bullet points sparingly and only when listing items
```

**Response (success):**
```json
{
  "response": "Great question! The Umayyad Dynasty was...",
  "toolCalls": ["getUserProgress", "getModuleContent"]
}
```

**Response (error):**
```json
{
  "error": "quota_exceeded",
  "detail": "Monthly chat limit reached (100/100)",
  "code": 429
}
```

### 3.2 POST /chat/web-search

Same request/response as `/chat`, but:
- **No function calling tools** (Gemini limitation: cannot combine `googleSearch` with function calling)
- **Tools:** `{ "googleSearch": {} }`
- **System prompt:** Same Ibu persona + additional instruction: `"Use web search to find current, accurate information about the topic."`

**`needsWebSearch()` triggers when message matches:**
- 41 content topics: `quran`, `prophet muhammad`, `hadith`, `sunnah`, `islamic golden age`, `umayyad`, `abbasid`, `ottoman`, `mughal`, `fatimid`, `ayyubid`, `mamluk`, `andalusia`, `al-andalus`, `cordoba`, `baghdad`, `damascus`, `medina`, `mecca`, `jerusalem`, `crusades`, `reconquista`, `silk road`, `ibn battuta`, `ibn khaldun`, `al-khwarizmi`, `avicenna`, `ibn sina`, `averroes`, `ibn rushd`, `saladin`, `imam`, `caliph`, `caliphate`, `sultan`, `mosque`, `madrasa`, `minaret`, `arabesque`, `islamic art`, `islamic architecture`
- 28 recency keywords: `latest`, `recent`, `current`, `today`, `now`, `2024`, `2025`, `2026`, `new`, `update`, `modern`, `contemporary`, `ongoing`, `breaking`, `this year`, `this month`, `this week`, `trending`, `popular`, `famous`, `well-known`, `notable`, `important`, `significant`, `major`, `key`, `top`, `best`

### 3.3 POST /quiz/explain

**Request:**
```json
{
  "question": "Who was the first Umayyad Caliph?",
  "selectedAnswer": "Muawiya I",
  "correctAnswer": "Muawiya I",
  "isCorrect": true,
  "allOptions": ["Abu Bakr", "Muawiya I", "Umar ibn Khattab", "Ali ibn Abi Talib"],
  "moduleTitle": "The Rise of the Umayyads"
}
```

**Backend processing:**
1. Verify JWT, check quota
2. Select prompt based on `isCorrect`:

**Correct answer prompt:**
```
The student answered correctly! Question: "{question}" - They chose: "{selectedAnswer}" which is correct.

Provide a brief, encouraging explanation (2-3 sentences) about why this answer is correct. Include an interesting historical fact. Keep it age-appropriate and engaging. Use simple language. You can use one emoji.
```

**Incorrect answer prompt:**
```
The student answered incorrectly. Question: "{question}" - They chose: "{selectedAnswer}" but the correct answer is: "{correctAnswer}".

Provide a brief, encouraging explanation (2-3 sentences) about why the correct answer is right. Be supportive and help them learn. Keep it age-appropriate. Use simple language. You can use one emoji. Don't make them feel bad about getting it wrong.
```

3. **Model:** `gemini-3-flash-preview`
4. **Config:** `maxOutputTokens: 1024`, `temperature: 1.0`, `thinkingConfig: { thinkingBudget: 0 }`

**Response:**
```json
{
  "explanation": "That's right! 🌟 Muawiya I founded the Umayyad Dynasty..."
}
```

### 3.4 POST /quiz/explain/batch

**Request:**
```json
{
  "questions": [
    {
      "question": "Who was the first Umayyad Caliph?",
      "selectedAnswer": "Muawiya I",
      "correctAnswer": "Muawiya I",
      "isCorrect": true,
      "allOptions": ["Abu Bakr", "Muawiya I", "Umar ibn Khattab", "Ali ibn Abi Talib"]
    }
    // ... up to 5 questions
  ],
  "moduleTitle": "The Rise of the Umayyads"
}
```

**Batch prompt:**
```
You are reviewing a quiz about "{moduleTitle}". The student answered {totalQuestions} questions. Provide a brief explanation for each answer.

For each question, respond with a JSON array where each element has:
- "questionIndex": number (0-based)
- "explanation": string (2-3 sentences, encouraging, age-appropriate)

Questions:
{formatted list of all questions with selected/correct answers and isCorrect status}

Respond ONLY with the JSON array, no other text.
```

**Config:** `maxOutputTokens: 2048`, `temperature: 1.0`, `thinkingConfig: { thinkingBudget: 0 }`

**Response:**
```json
{
  "explanations": [
    { "questionIndex": 0, "explanation": "That's right! 🌟 Muawiya I..." },
    { "questionIndex": 1, "explanation": "Good try! The correct answer..." }
  ]
}
```

### 3.5 POST /image/generate

**Request:**
```json
{
  "prompt": "An owl teacher in a medieval Islamic library",
  "userId": "user_abc123"
}
```

**Backend processing:**
1. Verify JWT, check quota (`image_generation`)
2. Wrap user prompt with generation system prompt:

```
Create a beautiful, educational illustration suitable for children learning about Islamic history. The image should be:
- Age-appropriate and culturally respectful
- Colorful and engaging
- In a cartoon/illustration style (not photorealistic)
- Safe for all audiences

User's request: "{prompt}"
```

3. **Model:** `gemini-3-pro-image-preview`
4. **Config:** `responseModalities: ["TEXT", "IMAGE"]`, `temperature: 1.0`
5. Extract image from response parts (find part with `inlineData.mimeType` starting with `image/`)
6. Upload to Supabase Storage: `ai-images/{userId}/{timestamp}_generated.png`
7. Return public URL

**Response:**
```json
{
  "imageUrl": "https://xxx.supabase.co/storage/v1/object/public/ai-images/user_abc123/1710345600_generated.png",
  "caption": "A wise owl teaching in a beautiful library..."
}
```

### 3.6 POST /image/edit

**Request:**
```json
{
  "prompt": "Add a turban to the owl",
  "imageBase64": "<base64 encoded image>",
  "mimeType": "image/png",
  "userId": "user_abc123"
}
```

**Backend processing:**
1. Verify JWT, check quota (`image_edit`)
2. Build multimodal content:

```
Edit this image according to the following instruction. Keep the edit appropriate for children and culturally respectful of Islamic history themes.

Instruction: "{prompt}"
```

3. Content parts: `[{ text: prompt }, { inlineData: { mimeType, data: imageBase64 } }]`
4. **Model:** `gemini-3-pro-image-preview`
5. **Config:** `responseModalities: ["TEXT", "IMAGE"]`, `temperature: 1.0`
6. Upload edited image to Supabase Storage: `ai-images/{userId}/{timestamp}_edited.png`

**Response:**
```json
{
  "imageUrl": "https://xxx.supabase.co/storage/v1/object/public/ai-images/user_abc123/1710345600_edited.png",
  "caption": "Here's the owl with a turban..."
}
```

### 3.7 POST /image/analyze

**Request:**
```json
{
  "imageBase64": "<base64 encoded image>",
  "mimeType": "image/jpeg",
  "prompt": "What can you tell me about this mosque?"
}
```

**Backend processing:**
1. Verify JWT, check quota (`image_analyze`)
2. System context: Ibu persona + `"The user has shared an image. Analyze it in the context of Islamic history education. Be informative and age-appropriate."`
3. Content: `[{ text: prompt }, { inlineData: { mimeType, data: imageBase64 } }]`
4. **Model:** `gemini-3-flash-preview`
5. **Config:** `maxOutputTokens: 2048`, `temperature: 1.0`

**Response:**
```json
{
  "analysis": "This looks like the Great Mosque of Cordoba! 🦉..."
}
```

---

## 4. RAG Function Calling (Tools)

### 4.1 Function Declarations

All 6 tools from `AIToolsService.ts` are replicated exactly in Python:

```python
tools = [{
    "function_declarations": [
        {
            "name": "getUserProgress",
            "description": "Get the user's current learning progress including XP, completed modules, and achievements across all eras",
            "parameters": { "type": "object", "properties": {} }
        },
        {
            "name": "getLastCompletedModule",
            "description": "Get details about the last module the user completed, including the era, adventure, and quiz score",
            "parameters": { "type": "object", "properties": {} }
        },
        {
            "name": "getModuleContent",
            "description": "Get the content of a specific module including lesson titles and descriptions",
            "parameters": {
                "type": "object",
                "properties": {
                    "eraId": { "type": "string", "description": "The era identifier" },
                    "adventureId": { "type": "string", "description": "The adventure identifier" },
                    "moduleId": { "type": "string", "description": "The module identifier" }
                },
                "required": ["eraId", "adventureId", "moduleId"]
            }
        },
        {
            "name": "searchLessons",
            "description": "Search for lessons by topic or keyword across all eras and adventures",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": { "type": "string", "description": "Search query for lesson content" }
                },
                "required": ["query"]
            }
        },
        {
            "name": "getEraOverview",
            "description": "Get an overview of a specific historical era including its adventures and total content",
            "parameters": {
                "type": "object",
                "properties": {
                    "eraId": { "type": "string", "description": "The era identifier" }
                },
                "required": ["eraId"]
            }
        },
        {
            "name": "getLearningTimeline",
            "description": "Get a chronological timeline of the user's learning activity and milestones",
            "parameters": { "type": "object", "properties": {} }
        }
    ]
}]

tool_config = {
    "function_calling_config": { "mode": "AUTO" }
}
```

### 4.2 Tool Implementations (Python)

| Tool | Supabase Query |
|------|---------------|
| `getUserProgress` | `SELECT data FROM gamification_data WHERE user_id = $1` — parse `newProgress`, `era_xp`, calculate totals |
| `getLastCompletedModule` | Same query — find most recently completed module in `newProgress` array |
| `getModuleContent` | `SELECT * FROM content WHERE era_id = $1 AND adventure_id = $2 AND module_id = $3` |
| `searchLessons` | `SELECT * FROM content WHERE title ILIKE '%query%' OR description ILIKE '%query%'` |
| `getEraOverview` | `SELECT * FROM eras WHERE id = $1` + `SELECT count(*) FROM content WHERE era_id = $1 GROUP BY adventure_id` |
| `getLearningTimeline` | `SELECT data FROM gamification_data WHERE user_id = $1` — reconstruct timeline from `newProgress` completion timestamps |

**Key detail:** `getUserProgress` and `getLearningTimeline` currently read from app local state in the client. But that state is synced to `gamification_data` table with a 2-second debounce. The backend reads the same Supabase table — data is at most 2 seconds stale, which is imperceptible for chat context.

### 4.3 Function Calling Loop

```python
async def execute_with_tools(model, contents, system_prompt, tools, tool_config, user_id):
    """Execute Gemini request with function calling loop."""
    response = await model.generate_content(
        contents=contents,
        config=GenerateContentConfig(
            system_instruction=system_prompt,
            tools=tools,
            tool_config=tool_config,
            max_output_tokens=2048,
            temperature=1.0,
        )
    )

    # Loop: process function calls until Gemini returns text
    while has_function_calls(response):
        tool_results = []
        for call in get_function_calls(response):
            result = await execute_tool(call.name, call.args, user_id)
            tool_results.append(FunctionResponse(name=call.name, response=result))

        # Send results back to Gemini
        contents.append(response.candidates[0].content)
        contents.append(Content(parts=[Part(function_response=r) for r in tool_results]))
        response = await model.generate_content(contents=contents, config=config)

    return response.text
```

---

## 5. Project Structure

```
ai-backend/
├── main.py                    # FastAPI app, CORS, health check
├── config.py                  # Environment variables (Gemini, Supabase, Clerk, RevenueCat)
├── auth.py                    # Clerk JWT verification (Depends injection)
├── requirements.txt           # fastapi, uvicorn, google-genai, supabase, pyjwt, httpx
├── Procfile                   # web: uvicorn main:app --host 0.0.0.0 --port $PORT --workers 2
│
├── routers/
│   ├── chat.py                # POST /chat, POST /chat/web-search
│   ├── quiz.py                # POST /quiz/explain, POST /quiz/explain/batch
│   └── image.py               # POST /image/generate, POST /image/edit, POST /image/analyze
│
├── services/
│   ├── gemini.py              # Gemini client init, model references, generation helpers
│   ├── quota.py               # Read/update ai_user_data.monthly_usage, RevenueCat subscription check
│   ├── storage.py             # Supabase Storage upload/download (ai-images bucket)
│   └── rag_tools.py           # 6 RAG function implementations (all Supabase queries)
│
└── prompts/
    ├── chat.py                # SYSTEM_PROMPT (Ibu persona), WEB_SEARCH_ADDENDUM
    ├── quiz.py                # CORRECT_PROMPT, INCORRECT_PROMPT, BATCH_PROMPT templates
    └── image.py               # GENERATION_PROMPT, EDIT_PROMPT, ANALYZE_CONTEXT
```

---

## 6. Error Handling & Retry

### Error Response Format

```json
{
  "error": "<error_type>",
  "detail": "<human-readable message>",
  "code": 429
}
```

### Error Matrix

| Error | HTTP Code | Client Behavior |
|-------|-----------|-----------------|
| Invalid/expired JWT | 401 | Clerk token refresh -> retry once |
| Quota exceeded | 429 | Show existing quota UI (no change) |
| Gemini API error | 502 | Show "AI temporarily unavailable" |
| Gemini safety block | 422 | Show existing safety message |
| Invalid request body | 400 | Log to Sentry (client bug) |
| Server error | 500 | Generic error + Sentry alert |

### Client Retry Policy

- **401:** Refresh Clerk token, retry once
- **502:** Retry once after 1 second
- **429, 422, 400:** No retry (show error to user)

---

## 7. Quota Enforcement

### Limits (from AIStorageService.ts)

```python
QUOTA_LIMITS = {
    "free": {
        "chat": 100,
        "image_generation": 10,
        "image_edit": 10,
        "image_analyze": 50
    },
    "subscriber": {
        "chat": None,          # unlimited
        "image_generation": 100,
        "image_edit": 50,
        "image_analyze": None  # unlimited
    }
}
```

### Subscription Status

Backend calls RevenueCat REST API: `GET https://api.revenuecat.com/v1/subscribers/{app_user_id}`
- Cached for 5 minutes per user (in-memory dict with TTL)
- Checks for active entitlement `"premium"` or `"pro"`

### Monthly Reset

Same logic as current `AIStorageService.ts`:
- `monthly_usage` in `ai_user_data` includes a `month` field (format: `YYYY-MM`)
- On each request, compare `month` with current month
- If stale, reset all counters and update `month`

---

## 8. Deployment (Railway)

### Configuration

```
# Procfile
web: uvicorn main:app --host 0.0.0.0 --port $PORT --workers 2

# Railway Environment Variables
GEMINI_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
REVENUECAT_API_KEY=...
ALLOWED_ORIGINS=https://archiveszone.app
SENTRY_DSN=...
```

### Health Check

```python
@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
```

### Scaling

- **2 workers** — sufficient for ~11K user base (not all concurrent)
- Railway paid plan keeps services warm (no cold start)
- Scale workers via `Procfile` change when needed

### Logging & Monitoring

- Python `logging` module for structured logs
- Sentry SDK for error tracking
- Railway log drain captures stdout/stderr
- Health check endpoint for uptime monitoring

---

## 9. Client-Side Changes

### Files Modified

| File | Change |
|------|--------|
| `AIService.ts` | Replace Gemini SDK calls with `fetch()` to backend |
| `AIStorageService.ts` | Remove client-side quota checks (backend enforces) |
| `AIToolsService.ts` | **Delete entirely** (RAG tools now server-side) |
| `.env` / `eas.json` | Add `EXPO_PUBLIC_AI_BACKEND_URL` |

### Files Unchanged

| File | Why |
|------|-----|
| `AIChatModal.tsx` | UI unchanged — same inputs/outputs |
| `AIQuizExplanation.tsx` | UI unchanged — receives same explanation text |
| `AIContext.tsx` | Conversation state management unchanged |
| `AIContextService.ts` | Session storage stays client-side |

### Latency Impact

- **Added:** ~50-100ms network round-trip (client -> Railway -> Gemini -> Railway -> client)
- **Current operations:** Chat 1-5s, image generation 5-15s, quiz explanation 1-3s
- **Net impact:** Imperceptible (<5% increase on slowest operations)

---

## 10. Migration Strategy

### Phase 1: Deploy & Validate

1. Deploy backend to Railway with all endpoints
2. Test each endpoint independently (Postman/curl)
3. Verify quota enforcement matches current behavior
4. Verify RAG tools return same data as client-side tools

### Phase 2: Client Switch

1. Add `EXPO_PUBLIC_AI_BACKEND_URL` to environment
2. Modify `AIService.ts` to route through backend
3. Delete `AIToolsService.ts`
4. Remove client-side quota from `AIStorageService.ts`
5. Test all AI features end-to-end on both iOS and Android

### Phase 3: Cleanup

1. Remove `@google/genai` dependency from mobile app (optional — can keep for fallback)
2. Remove `EXPO_PUBLIC_GEMINI_API_KEY` from client env
3. Monitor backend logs/Sentry for 1 week before removing fallback

### Rollback Plan

If backend issues arise post-deploy:
- Revert `AIService.ts` to direct Gemini calls (single file revert)
- Client still has all prompts and tools locally
- No data migration needed (same Supabase tables)
