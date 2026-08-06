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
| `/chat` (web search mode) | — | Handled internally when `needsWebSearch()` triggers | `gemini-3-flash-preview` |
| `/quiz/explain` | POST | Single quiz answer explanation | `gemini-3-flash-preview` |
| `/quiz/explain/batch` | POST | Batch explanation for all 5 quiz answers | `gemini-3-flash-preview` |
| `/image/generate` | POST | AI image generation | `gemini-3-pro-image-preview` |
| `/image/edit` | POST | AI image editing (user photo + prompt) | `gemini-3-pro-image-preview` |
| `/image/analyze` | POST | Analyze uploaded image | `gemini-3-flash-preview` |
| `/health` | GET | Health check | — |

---

## 3. Exact API Contracts

**Important:** All prompts in this spec are ported verbatim from `AIService.ts`. The authoritative source for prompt text is the `prompts/` directory in the backend codebase, which must be kept in 1:1 sync with the TypeScript originals during migration. Any prompt referenced as "see `AIService.ts`" means the backend must use the exact same text.

### 3.1 POST /chat

**Request:**
```json
{
  "message": "Tell me about the Umayyad Dynasty",
  "conversationHistory": [
    {
      "role": "user",
      "content": "...",
      "image": { "base64": "...", "mimeType": "image/jpeg" }
    },
    { "role": "assistant", "content": "..." }
  ],
  "context": {
    "eraId": "umayyad",
    "eraName": "Umayyad Dynasty",
    "adventureId": "adventure_1",
    "currentScreen": "chat"
  },
  "userProgress": {
    "totalXP": 250,
    "completedModules": 8,
    "averageQuizScore": 76,
    "recentCompletions": [
      { "adventureId": "adventure_2", "moduleId": "module_1", "quizScore": 4 }
    ],
    "totalModulesAttempted": 10
  },
  "knowledgeContext": "The Umayyad Dynasty was founded by...",
  "enableRAG": true,
  "enableWebSearch": true
}
```

**Note:** `userId` is never in the request body — it is always derived from the Clerk JWT in the `Authorization` header. This prevents users from impersonating other accounts.

**Backend processing:**
1. Verify Clerk JWT → extract `user_id`
2. Check quota (`chat` action)
3. Call `needsWebSearch(message)` — if true AND `enableWebSearch` is true, use Google Search grounding instead of RAG tools (Gemini cannot combine both)
4. Build system prompt using `buildChatSystemPrompt(context, userProgress, knowledgeContext)` — this is a **dynamic prompt** that interpolates `eraId`, `eraName`, `adventureId`, `currentScreen`, user progress stats, personalization rules, and knowledge context
5. Prepend system prompt as first user/model turn pair (Gemini has no system role):
   - User: `{systemPrompt}\n\nPlease acknowledge these guidelines and be ready to help.`
   - Model: `I understand. I am your educational chatbot for Archives...`
6. Build Gemini request with:
   - **Model:** `gemini-3-flash-preview`
   - **Config:** `maxOutputTokens: 2048`, `temperature: 1.0`, `thinkingConfig: { thinkingLevel: "LOW" }`
   - **Tools (if RAG):** 6 function declarations with `functionCallingConfig.mode: "AUTO"`
   - **Tools (if web search):** `{ googleSearch: {} }` (no function calling)
7. Execute function calling loop if RAG tools are used
8. Extract grounding metadata (sources, search queries) if web search was used
9. Increment quota
10. Return response

**System prompt (dynamic — built by `buildChatSystemPrompt()`):**

The system prompt is constructed at runtime with interpolated context. Template (from `AIService.ts` lines 837-921):

```
You are the official educational chatbot for Archives, a gamified learning app teaching Islamic and Middle Eastern history to children, families, and educators.
Your role is to inform, guide, and support learning while strictly following Islamic-coded norms, historical accuracy, and Archives' brand values.

CURRENT CONTEXT:
- Learning about: {eraName}
- Current Era ID: "{eraId}" (IMPORTANT: Use this era ID when calling tools like getLastCompletedModule, searchLessons, getUserProgress to get era-specific results)
- Current adventure: {adventureId}
- Current screen: {currentScreen}

USER LEARNING PROGRESS:
- Total XP Earned: {totalXP}
- Modules Completed: {completedModules} out of {totalModulesAttempted}
- Average Quiz Score: {averageQuizScore}% ({level label})
- Recently Completed: {recentCompletions}

PERSONALIZATION:
{dynamic rules based on averageQuizScore and completedModules — simpler language for <60%, sophisticated for >=80%, extra welcoming for 0 modules, reference previous lessons for >5}

KNOWLEDGE CONTEXT (Content user has learned):
{knowledgeContext — actual lesson text the user has completed}

=== 1. ISLAMIC ETIQUETTE & RELIGIOUS CONVENTIONS (MANDATORY) ===
- Whenever Prophet Muhammad is mentioned, always write: "Prophet Muhammad (peace be upon him)"
- When mentioning other prophets, use respectful phrasing
- When referring to Allah, use respectful capitalization and tone
- Do not mock, trivialize, dramatize, or fictionalize religious figures, beliefs, rituals, or sacred events
- Do not generate content that could be interpreted as: Blasphemous, Irreverent, Politically inflammatory, Sectarian or divisive
- Remain neutral, respectful, and educational at all times

=== 2. TONE & VOICE ===
- Educational and informative, Warm, calm, and respectful
- Simple and clear (7th-grade reading level), Neutral and non-judgmental
- Avoid: Slang, Sarcasm, Emojis, Overly dramatic or poetic language, Opinions or moral preaching

=== 3. HISTORICAL ACCURACY & SCOPE ===
- Stick to well-established historical facts
- If scholars disagree, clearly say: "Historians differ on this, but many agree that..."
- Do not speculate, exaggerate, or invent details. If unsure, say so honestly.

=== 4. CHILD-SAFE & FAMILY-FRIENDLY RULES ===
- Avoid graphic descriptions of violence
- Explain conflicts factually, not emotionally
- Frame battles, deaths, and suffering with restraint and context

=== 5. CULTURAL RESPECT & REPRESENTATION ===
- Avoid orientalist stereotypes
- Highlight diversity of cultures, languages, and traditions across eras
- Respect all faiths when mentioned

=== 6. LEARNING-FIRST BEHAVIOR ===
- Explain concepts simply, Answer questions clearly, Encourage curiosity
- Do not: Promote external opinions, Give religious rulings (fatwas), Engage in debates or modern political commentary

=== 7. RESPONSE STYLE ===
- KEEP RESPONSES SHORT - 1-3 sentences maximum
- Be conversational like texting a friend, Direct and to the point, Warm but brief

=== 8. WEB SEARCH CAPABILITY ===
- You have access to Google Search to find up-to-date information
- Only use web search for content-related queries (archaeology, new research, recent discoveries about Islamic history)
- Maintain Archives' respectful and educational tone
- Cite sources when sharing information from the web

Your job is to help users learn history correctly, respectfully, and confidently.
```

**Response (success):**
```json
{
  "text": "The Umayyad Dynasty was founded by Muawiya I...",
  "sources": [
    { "uri": "https://example.com/article", "title": "Umayyad History" }
  ],
  "searchQueries": ["Umayyad Dynasty founding"],
  "toolCalls": ["getUserProgress", "getModuleContent"]
}
```

- `sources` and `searchQueries` are only present when Google Search grounding was used (extracted from `candidate.groundingMetadata`)
- `toolCalls` lists which RAG tools were invoked (for debugging)

**Response (error):**
```json
{
  "error": "quota_exceeded",
  "detail": "Monthly chat limit reached (100/100)",
  "code": 429
}
```

### 3.2 POST /chat/web-search

Handled internally by `/chat` when `needsWebSearch()` returns true. Not a separate client-facing endpoint — the client always calls `/chat` and the backend decides.

**`needsWebSearch()` detection logic (from `AIService.ts` lines 41-66):**

Triggers when message contains BOTH a content topic AND a recency keyword (case-insensitive):

**Content topics (exact list from production):**
```
islam, islamic, muslim, mosque, quran, prophet, muhammad,
umayyad, abbasid, ottoman, caliphate, caliph, sultan,
mecca, medina, jerusalem, damascus, baghdad, cordoba,
middle east, arab, persian, fatimid, mamluk, moorish,
alhambra, dome of the rock, kaaba, hijra, ramadan,
sahaba, companions, khadijah, aisha, fatimah, ali,
crusade, reconquista, al-andalus, golden age,
scholar, ibn, al-, imam, sheikh
```

**Recency keywords (exact list from production):**
```
latest, recent, new, current, modern, today,
discovery, found, research, study, archaeological,
news, update, happening, search,
excavation, dig, artifact, ruins,
museum, exhibit, exhibition, collection,
unesco, heritage, restoration, preservation,
announce, reveal, uncover, breakthrough
```

### 3.3 POST /quiz/explain

**Request:**
```json
{
  "questionText": "Who was the first Umayyad Caliph?",
  "correctAnswer": "Muawiya I",
  "userAnswer": "Muawiya I",
  "questionType": "mcq",
  "eraName": "Umayyad Dynasty",
  "adventureName": "The Rise of the Umayyads",
  "userLevel": "intermediate",
  "isCorrect": true
}
```

**Backend processing:**
1. Verify JWT, check quota (`chat` action — quiz explanations count as chat)
2. Select prompt based on `isCorrect`:

**Correct answer prompt (verbatim from `AIService.ts` lines 204-221):**
```
You're explaining {eraName} history to a {userLevel} student who answered correctly.

Question: {questionText}
Their answer: {correctAnswer} ✓ (Correct)

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

Write in plain text (NOT JSON). Just the facts, no cheerleading.
```

**Incorrect answer prompt (verbatim from `AIService.ts` lines 224-241):**
```
You're explaining {eraName} history to a {userLevel} student.

Question: {questionText}
They answered: {userAnswer}
Correct answer: {correctAnswer}

Write a helpful explanation in 3-4 sentences that:
1. Explains why the correct answer is right
2. Adds one interesting historical fact or context

STRICT RULES:
- NEVER start with "Actually", "Well", "So", or similar filler words
- Start directly with the historical explanation
- NO motivational phrases, encouragement, or "keep learning" type endings
- End with the historical fact, not fluff
- Be concise and informative only

Write in plain text (NOT JSON). Just the facts, no cheerleading.
```

3. **Model:** `gemini-3-flash-preview`
4. **Config:** `maxOutputTokens: 1024`, `temperature: 1.0`, `thinkingConfig: { thinkingLevel: "LOW" }`

**Response:**
```json
{
  "explanation": "Muawiya I established the Umayyad Caliphate in 661 CE..."
}
```

### 3.4 POST /quiz/explain/batch

**Request:**
```json
{
  "questions": [
    {
      "question_text": "Who was the first Umayyad Caliph?",
      "answers": [
        { "text": "Abu Bakr", "is_correct": false },
        { "text": "Muawiya I", "is_correct": true },
        { "text": "Umar ibn Khattab", "is_correct": false },
        { "text": "Ali ibn Abi Talib", "is_correct": false }
      ],
      "question_type": "mcq"
    }
  ],
  "userAnswers": [1, 0, 2, 1, 3],
  "context": {
    "eraName": "Umayyad Dynasty",
    "adventureName": "The Rise of the Umayyads",
    "userLevel": "intermediate"
  }
}
```

**Batch prompt (verbatim from `AIService.ts` lines 305-319):**
```
You are explaining {eraName} ({adventureName}) history to a {userLevel} student who just completed a quiz.
Provide a brief explanation for each question below.

Q1: {questionText}
User answered: {answer} ✓ (Correct) / ✗ (Incorrect, correct answer: {correctAnswer})
... (for each question)

For each question, write 3-4 sentences:
- If the student answered correctly: reinforce why that answer is right and add deeper historical context
- If the student answered incorrectly: explain why the correct answer is right and add an interesting historical fact

STRICT RULES:
- NEVER start any explanation with "Actually", "Well", "So", or similar filler words
- Start directly with the historical explanation
- NO praise, motivational phrases, encouragement, or "keep learning" endings
- Be concise and informative only

Return ONLY a JSON array with exactly {N} objects in order (Q1 first, Q2 second, etc.):
[{ "explanation": "3-4 sentence explanation" }, { "explanation": "..." }, ...]
```

**Config:** `maxOutputTokens: 2048`, `temperature: 1.0`, `thinkingConfig: { thinkingLevel: "LOW" }`

**Fallback strategy:** If batch JSON parsing fails (Gemini sometimes adds markdown fences or preamble), the backend must:
1. Strip markdown fences (`/^```(?:json)?\s*/i`) and trailing fences
2. Attempt `JSON.parse`
3. Verify array length matches question count
4. If any step fails: fall back to making N individual `/quiz/explain` calls sequentially (matching client's `getMultipleExplanations()` fallback)

**Response:**
```json
{
  "explanations": [
    { "explanation": "Muawiya I established the Umayyad Caliphate in 661 CE..." },
    { "explanation": "The Battle of Karbala took place in 680 CE..." }
  ]
}
```

### 3.5 POST /image/generate

**Request:**
```json
{
  "prompt": "An owl teacher in a medieval Islamic library",
  "context": {
    "eraName": "Umayyad Dynasty",
    "adventureId": "adventure_1"
  }
}
```

**Backend processing:**
1. Verify JWT, check quota (`image_generate`)
2. Build enhanced prompt using `buildImagePrompt(prompt, context)` — comprehensive guidelines for Islamic-appropriate imagery

**Image generation prompt (verbatim from `AIService.ts` lines 1002-1065):**
```
Create a historically accurate, educational image for {eraName}.

User request: {prompt}

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
Images must be appropriate for: Children aged 6+, Classroom use, Family co-learning
Avoid: Fear-inducing imagery, Aggressive expressions, Dark or disturbing themes

=== 8. STYLE CONSTRAINTS ===
- Prefer: Painterly realism, Soft lighting, Clear forms, Warm natural palettes
- No exaggerated facial expressions, No parody or humor

Generate a single high-quality image.
```

3. **Model:** `gemini-3-pro-image-preview`
4. **Config:** `imageConfig: { aspectRatio: "16:9", imageSize: "2K" }` (no responseModalities or temperature)
5. Extract image from response parts (find part with `inlineData.data`)
6. Upload to Supabase Storage: `ai-images/{userId}/{timestamp}_generated.png`
7. Return public URL

**Response:**
```json
{
  "imageUrl": "https://xxx.supabase.co/storage/v1/object/public/ai-images/user_abc123/1710345600_generated.png",
  "mimeType": "image/png",
  "caption": "A wise owl teaching in a beautiful library..."
}
```

### 3.6 POST /image/edit

**Request:**
```json
{
  "prompt": "Put me in historical Islamic clothing",
  "imageBase64": "<base64 encoded image>",
  "mimeType": "image/png",
  "context": {
    "eraName": "Umayyad Dynasty",
    "adventureId": "adventure_1"
  }
}
```

**Image edit prompt (verbatim from `AIService.ts` lines 1161-1189):**
```
Edit this photo to create a historically accurate, artistic transformation for {eraName}.

User request: {prompt}

=== TRANSFORMATION GUIDELINES ===
- Transform the person in the photo according to the request
- Use historically accurate clothing, accessories, and settings from {eraName}
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

Generate the edited image.
```

3. Content parts: `[{ text: enhancedPrompt }, { inlineData: { mimeType, data: imageBase64 } }]`
4. **Model:** `gemini-3-pro-image-preview`
5. **Config:** `imageConfig: { aspectRatio: "1:1", imageSize: "2K" }` (square for portrait-style edits)
6. Upload edited image to Supabase Storage: `ai-images/{userId}/{timestamp}_edited.png`

**Response:**
```json
{
  "imageUrl": "https://xxx.supabase.co/storage/v1/object/public/ai-images/user_abc123/1710345600_edited.png",
  "mimeType": "image/png",
  "caption": "Here you are in traditional Umayyad-era clothing..."
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
2. Build prompt using `buildImageAnalysisPrompt(prompt, context)`:

**Image analysis prompt (verbatim from `AIService.ts` lines 1297-1310):**
```
You are a knowledgeable Islamic history tutor. Analyze this image and provide helpful, educational information.

CONTEXT:
- The user is learning about {eraName}
- Focus on historical accuracy and educational value
- Be respectful of Islamic traditions and culture

USER'S QUESTION: {prompt}
(If no prompt: "Please describe what you see in this image and provide any relevant historical context.")

RESPONSE GUIDELINES:
- Keep response concise (2-4 sentences)
- If the image relates to Islamic history, provide historical context
- If the image is unrelated, politely explain and offer to help with Islamic history topics
- Be warm and encouraging
```

3. Content: `[{ text: analysisPrompt }, { inlineData: { mimeType, data: imageBase64 } }]`
4. **Model:** `gemini-3-flash-preview`
5. **Config:** `maxOutputTokens: 1024`, `temperature: 1.0`, `thinkingConfig: { thinkingLevel: "LOW" }`

**Response:**
```json
{
  "analysis": "This appears to be the Great Mosque of Cordoba, built during the Umayyad period..."
}
```

---

## 4. RAG Function Calling (Tools)

### 4.1 Function Declarations

All 6 tools from `AIToolsService.ts` are replicated exactly in Python, including their full descriptions with usage examples (these descriptions help Gemini decide when to invoke each tool):

```python
tools = [{
    "function_declarations": [
        {
            "name": "getUserProgress",
            "description": "Get the user's learning progress including completed modules, XP earned, and quiz scores. Use this when the user asks about their progress, stats, achievements, or learning history. Examples: \"How am I doing?\", \"What's my XP?\", \"How many modules have I completed?\"",
            "parameters": {
                "type": "object",
                "properties": {
                    "eraId": {
                        "type": "string",
                        "description": "Optional: Filter progress by era ID (e.g., \"umayyad\", \"rise_of_islam\"). Leave empty to get progress across all eras."
                    }
                },
                "required": []
            }
        },
        {
            "name": "getLastCompletedModule",
            "description": "Get the user's most recently completed module with its FULL lesson content. IMPORTANT: Always use the current era ID to get progress for the era the user is currently viewing. Use this when the user asks about their last lesson, recent learning, or wants a recap. Examples: \"What was my last lesson about?\", \"What did I learn yesterday?\", \"Remind me what I studied last\", \"Can you recap my recent lesson?\"",
            "parameters": {
                "type": "object",
                "properties": {
                    "eraId": {
                        "type": "string",
                        "description": "The era ID to filter by (e.g., \"umayyad\", \"rise_of_islam\", \"women_of_islam\"). IMPORTANT: Always pass the current era ID from the context to get era-specific progress. Only omit this to get the last module across ALL eras."
                    }
                },
                "required": []
            }
        },
        {
            "name": "getModuleContent",
            "description": "Fetch the full content of a specific module including the complete lesson text. Use this when you need detailed information about a specific lesson, or after searching to get full content. Examples: \"Tell me more about the Damascus module\", \"What was in Adventure 2 Module 1?\"",
            "parameters": {
                "type": "object",
                "properties": {
                    "eraId": { "type": "string", "description": "The era ID (e.g., \"umayyad\", \"rise_of_islam\")" },
                    "adventureId": { "type": "string", "description": "The adventure ID (e.g., \"adventure_1\", \"roi_adventure_1\")" },
                    "moduleId": { "type": "string", "description": "The module ID (e.g., \"module_1\", \"module_2\")" }
                },
                "required": ["eraId", "adventureId", "moduleId"]
            }
        },
        {
            "name": "searchLessons",
            "description": "Search across lessons the user has completed for specific topics, people, places, or events. Use this when the user asks if they learned about something specific. Examples: \"Did I learn about Damascus?\", \"What do I know about Khalid ibn al-Walid?\", \"Have I studied the Byzantine Empire?\"",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": { "type": "string", "description": "The search query - a topic, person, place, or event (e.g., \"Damascus\", \"Umar\", \"Battle of Yarmouk\")" },
                    "eraId": { "type": "string", "description": "Optional: Filter search to a specific era (e.g., \"umayyad\", \"women_of_islam\"). Pass the current era ID to search within that era only." }
                },
                "required": ["query"]
            }
        },
        {
            "name": "getEraOverview",
            "description": "Get a complete overview of an era including all adventures, modules, and the user's completion status. Use this when the user asks about available content or what they haven't completed yet. Examples: \"What's in Era 2?\", \"What topics are available?\", \"What haven't I completed?\"",
            "parameters": {
                "type": "object",
                "properties": {
                    "eraId": { "type": "string", "description": "The era ID (e.g., \"umayyad\", \"rise_of_islam\")" }
                },
                "required": ["eraId"]
            }
        },
        {
            "name": "getLearningTimeline",
            "description": "Get the user's chronological learning journey showing when they started, what they completed, and their activity pattern. Use this when the user asks about their learning history, timeline, or activity. Examples: \"When did I start learning?\", \"Show my learning timeline\", \"What did I do last week?\", \"How active have I been?\"",
            "parameters": {
                "type": "object",
                "properties": {
                    "eraId": { "type": "string", "description": "Optional: Filter timeline to a specific era. Omit to get timeline across all eras." },
                    "limit": { "type": "number", "description": "Maximum number of timeline entries to return (default: 10, max: 20)" }
                },
                "required": []
            }
        }
    ]
}]

tool_config = {
    "function_calling_config": { "mode": "AUTO" }
}
```

### 4.2 Tool Implementations (Python)

| Tool | Supabase Query | Notes |
|------|---------------|-------|
| `getUserProgress` | `SELECT data FROM gamification_data WHERE user_id = $1` — parse `newProgress`, `era_xp`, calculate totals | Filter by `eraId` if provided |
| `getLastCompletedModule` | Same query — find most recently completed module in `newProgress` array by `completedAt` timestamp | Fetches full lesson content from `content` table after finding the module |
| `getModuleContent` | `SELECT * FROM content WHERE era_id = $1` then filter client-side with fuzzy ID matching (`readableId === searchId \|\| readableId === 'adventure_' + searchId`) | Must replicate the ID normalization from `AIToolsService.ts` |
| `searchLessons` | Fetch content from `content` table, then search in-memory with substring matching on title, description, and lesson text | **Important:** Must only search content the user has completed (join against `gamification_data.newProgress`), matching current client behavior |
| `getEraOverview` | `SELECT * FROM eras WHERE id = $1` + `SELECT * FROM content WHERE era_id = $1` | Cross-reference with user progress for completion percentages |
| `getLearningTimeline` | `SELECT data FROM gamification_data WHERE user_id = $1` — reconstruct timeline from `newProgress` completion timestamps, sort by `completedAt` desc | Respect `limit` param (default 10, max 20) |

**Key detail:** `getUserProgress` and `getLearningTimeline` currently read from app local state in the client. But that state is synced to `gamification_data` table with a 2-second debounce. The backend reads the same Supabase table — data is at most 2 seconds stale, which is imperceptible for chat context.

### 4.3 Function Calling Loop

```python
async def execute_with_tools(model, contents, config, user_id):
    """Execute Gemini request with function calling loop."""
    response = await model.generate_content(contents=contents, config=config)

    # Process function calls (single round, matching production behavior)
    # Production code does one round of tool calls then a final generation.
    # A while loop with max_iterations is shown for robustness, but in practice
    # Gemini typically returns text after one round of tool results.
    max_iterations = 3  # Safety limit
    iteration = 0
    while has_function_calls(response) and iteration < max_iterations:
        tool_results = []
        for call in get_function_calls(response):
            result = await execute_tool(call.name, call.args, user_id)
            tool_results.append(FunctionResponse(name=call.name, response=result))

        # Send results back to Gemini
        contents.append(response.candidates[0].content)
        contents.append(Content(parts=[Part(function_response=r) for r in tool_results]))
        response = await model.generate_content(contents=contents, config=config)
        iteration += 1

    return response
```

---

## 5. Project Structure

```
ai-backend/
├── main.py                    # FastAPI app, CORS, health check, rate limiting
├── config.py                  # Environment variables (Gemini, Supabase, Clerk, RevenueCat)
├── auth.py                    # Clerk JWT verification (Depends injection)
├── requirements.txt           # fastapi, uvicorn, google-genai, supabase, pyjwt, httpx, cachetools, slowapi
├── Procfile                   # web: uvicorn main:app --host 0.0.0.0 --port $PORT --workers 2
│
├── routers/
│   ├── chat.py                # POST /chat (handles web search internally)
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
    ├── chat.py                # buildChatSystemPrompt() — dynamic prompt with context interpolation
    ├── quiz.py                # CORRECT_PROMPT, INCORRECT_PROMPT, BATCH_PROMPT templates
    └── image.py               # GENERATION_PROMPT, EDIT_PROMPT, ANALYZE_CONTEXT
```

### Auth: Clerk JWT Verification

```python
# auth.py
from pyjwt import PyJWKClient
import jwt

CLERK_JWKS_URL = "https://{clerk_instance}.clerk.accounts.dev/.well-known/jwks.json"
jwks_client = PyJWKClient(CLERK_JWKS_URL, cache_keys=True)

async def verify_clerk_token(authorization: str = Header(...)) -> str:
    """Extract and verify Clerk JWT, return user_id."""
    token = authorization.replace("Bearer ", "")
    signing_key = jwks_client.get_signing_key_from_jwt(token)
    payload = jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        options={"verify_aud": False}  # Clerk JWTs may not have audience
    )
    return payload["sub"]  # Clerk user ID
```

Every router endpoint depends on this — `user_id: str = Depends(verify_clerk_token)`.

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
| Invalid/expired JWT | 401 | Clerk token refresh → retry once |
| Quota exceeded | 429 | Show existing quota UI (no change) |
| Gemini API error | 502 | Show "AI temporarily unavailable" |
| Gemini safety block | 422 | Show existing safety message |
| Invalid request body | 400 | Log to Sentry (client bug) |
| Request timeout | 504 | Show "Request timed out, please try again" |
| Server error | 500 | Generic error + Sentry alert |

### Client Retry Policy

- **401:** Refresh Clerk token, retry once
- **502:** Retry once after 1 second
- **429, 422, 400, 504:** No retry (show error to user)

### Request Timeouts

Explicit timeouts on outbound Gemini API calls to prevent worker starvation:
- Chat: 30 seconds
- Quiz explanation: 15 seconds
- Image generation: 60 seconds
- Image editing: 60 seconds
- Image analysis: 30 seconds

If exceeded, return 504 to client.

---

## 7. Quota Enforcement

### Limits (from `AIStorageService.ts` lines 63-75)

```python
QUOTA_LIMITS = {
    "free": {
        "chat": 100,
        "image_generate": 10,
        "image_edit": 10,
        "image_analyze": 50
    },
    "subscriber": {
        "chat": -1,              # unlimited
        "image_generate": 100,
        "image_edit": 50,
        "image_analyze": -1      # unlimited
    }
}
```

**Note:** Action names use `image_generate` (not `image_generation`) to match existing Supabase column naming in `ai_user_data.monthly_usage`.

### Subscription Status

Backend calls RevenueCat REST API: `GET https://api.revenuecat.com/v1/subscribers/{app_user_id}`
- Cached using `cachetools.TTLCache(maxsize=1000, ttl=300)` — bounded LRU with 5-minute TTL
- Checks for active entitlement `"premium"` or `"pro"`

### Monthly Reset

Same logic as current `AIStorageService.ts`:
- `monthly_usage` in `ai_user_data` includes a `month` field (format: `YYYY-MM`)
- On each request, compare `month` with current month
- If stale, reset all counters and update `month`

### Rate Limiting

Per-user rate limit of 10 requests/minute using `slowapi` middleware (in addition to monthly quotas). Prevents abuse from buggy or malicious clients.

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
CLERK_JWKS_URL=...               # Clerk instance JWKS endpoint
CLERK_SECRET_KEY=...
REVENUECAT_API_KEY=...
SENTRY_DSN=...
```

**Note on CORS:** Mobile apps (React Native) do not send an `Origin` header — CORS is a browser-only mechanism. Authentication is handled entirely via Clerk JWT. CORS middleware should be permissive (`allow_origins=["*"]`) or disabled entirely, since the JWT is the access control mechanism. If a web client is added later, restrict origins at that point.

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

### Request Size Limits

Configure FastAPI to accept up to 10MB request bodies (for base64 image uploads):
```python
app = FastAPI()
# uvicorn default is 1MB — override for image endpoints
```

---

## 9. Client-Side Changes

### Files Modified

| File | Change |
|------|--------|
| `AIService.ts` | Replace Gemini SDK calls with `fetch()` to backend. All prompt building removed (backend handles it). Still sends `context`, `userProgress`, `knowledgeContext` in request body. |
| `AIStorageService.ts` | Remove `checkQuota()` and `incrementUsage()` (backend enforces). Keep session storage and image upload/download helpers. |
| `AIToolsService.ts` | **Delete entirely** (RAG tools now server-side) |
| `AIContextService.ts` | Keep `buildContext()` — it computes `knowledgeContext` from completed lessons, which is sent to backend in `/chat` request body. |
| `.env` / `eas.json` | Add `EXPO_PUBLIC_AI_BACKEND_URL` |

### Files Unchanged

| File | Why |
|------|-----|
| `AIChatModal.tsx` | UI unchanged — same inputs/outputs, sources rendering stays |
| `AIQuizExplanation.tsx` | UI unchanged — receives same explanation text |
| `AIContext.tsx` | Conversation state management unchanged |

### Latency Impact

- **Added:** ~50-100ms network round-trip (client → Railway → Gemini → Railway → client)
- **Current operations:** Chat 1-5s, image generation 5-15s, quiz explanation 1-3s
- **Net impact:** Imperceptible (<5% increase on slowest operations)

---

## 10. Migration Strategy

### Phase 1: Deploy & Validate

1. Deploy backend to Railway with all endpoints
2. Test each endpoint independently (Postman/curl)
3. Verify quota enforcement matches current behavior
4. Verify RAG tools return same data as client-side tools
5. Compare response quality: run same prompts through both paths

### Phase 2: Client Switch

1. Add `EXPO_PUBLIC_AI_BACKEND_URL` to environment
2. Modify `AIService.ts` to route through backend
3. Delete `AIToolsService.ts`
4. Simplify `AIStorageService.ts` (remove quota logic)
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
