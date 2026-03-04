# Switch AI Chat Operations to Gemini Flash Model

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split the single `textModel` in AIService into two separate models — keep `gemini-3-pro-preview` for quiz explanations, switch all chat-based operations to `gemini-3-flash-preview` for faster responses and lower cost.

**Architecture:** AIService currently uses one shared `textModel` for 4 different operations (quiz explanations, chat with RAG, image analysis, follow-up RAG calls). We add a dedicated `chatModel` property and route each call site to the appropriate model. Quiz explanations stay on Pro for quality; chat, image analysis, and RAG use Flash for speed.

**Tech Stack:** Google Gemini SDK (`@google/genai`), React Native / Expo

---

### Task 1: Add `chatModel` property to AIService

**Files:**
- Modify: `gamification/services/AIService.ts:89-94`

**Step 1: Add the new chatModel property**

Change the model declarations at the top of the `AIService` class from:

```typescript
class AIService {
  private ai: GoogleGenAI | null = null;
  // Text model for chat and quiz explanations
  private textModel = 'gemini-3-pro-preview';
  // Image model for generating historical images
  private imageModel = 'gemini-3-pro-image-preview';
```

To:

```typescript
class AIService {
  private ai: GoogleGenAI | null = null;
  // Pro model for quiz explanations (higher reasoning quality)
  private quizModel = 'gemini-3-pro-preview';
  // Flash model for chat, RAG, and image analysis (faster, cheaper)
  private chatModel = 'gemini-3-flash-preview';
  // Image model for generating historical images
  private imageModel = 'gemini-3-pro-image-preview';
```

**Step 2: Verify no lint errors**

Run: `npm run lint`
Expected: No new errors from the property rename (existing unused import warnings are pre-existing)

---

### Task 2: Route quiz explanations to `quizModel`

**Files:**
- Modify: `gamification/services/AIService.ts:132-133`

**Step 1: Update `getQuizExplanation` to use `quizModel`**

In the `getQuizExplanation` method (~line 132), change:

```typescript
      const response = await this.ai.models.generateContent({
        model: this.textModel,
```

To:

```typescript
      const response = await this.ai.models.generateContent({
        model: this.quizModel,
```

This is the only call site that stays on Pro. Quiz explanations benefit from deeper reasoning for nuanced historical context.

---

### Task 3: Route chat RAG calls to `chatModel`

**Files:**
- Modify: `gamification/services/AIService.ts:441-442` (initial chat call)
- Modify: `gamification/services/AIService.ts:515-516` (follow-up RAG call)

**Step 1: Update the initial `getChatResponse` API call**

In the `getChatResponse` method (~line 441), change:

```typescript
      const response = await this.ai!.models.generateContent({
        model: this.textModel,
```

To:

```typescript
      const response = await this.ai!.models.generateContent({
        model: this.chatModel,
```

**Step 2: Update the follow-up RAG response call**

In the same method, the follow-up call after function tool execution (~line 515), change:

```typescript
        const followUpResponse = await this.ai!.models.generateContent({
          model: this.textModel,
```

To:

```typescript
        const followUpResponse = await this.ai!.models.generateContent({
          model: this.chatModel,
```

Both calls are part of the same chat flow — the initial call may trigger RAG tool calls, and the follow-up sends tool results back. Both should use the same model for consistency.

---

### Task 4: Route image analysis to `chatModel`

**Files:**
- Modify: `gamification/services/AIService.ts:1071-1072`

**Step 1: Update `analyzeImage` to use `chatModel`**

In the `analyzeImage` method (~line 1071), change:

```typescript
      const response = await this.ai.models.generateContent({
        model: this.textModel, // Text model supports vision
```

To:

```typescript
      const response = await this.ai.models.generateContent({
        model: this.chatModel, // Flash model supports vision
```

Image analysis is low-complexity (2-4 sentence responses) and doesn't need Pro-level reasoning.

---

### Task 5: Verify no remaining references to `textModel`

**Step 1: Search for any remaining `textModel` references**

Run: `grep -n "textModel" gamification/services/AIService.ts`
Expected: Zero results. All 4 call sites should now reference either `quizModel` or `chatModel`.

**Step 2: Run lint**

Run: `npm run lint`
Expected: No new errors.

**Step 3: Commit**

```bash
git add gamification/services/AIService.ts
git commit -m "feat: split AI models - Pro for quiz explanations, Flash for chat operations

- Add separate quizModel (gemini-3-pro-preview) and chatModel (gemini-3-flash-preview)
- Quiz explanations stay on Pro for deeper historical reasoning
- Chat, RAG, and image analysis use Flash for faster responses and lower cost
- All 4 textModel call sites updated to appropriate model"
```

---

### Task 6: Manual QA testing on device

**No code changes — manual testing only.**

Test each of the 4 operations to verify Flash works correctly:

**Test 1: Quiz Explanation (Pro model)**
1. Complete a quiz in any era
2. Get an answer wrong intentionally
3. Tap "AI Explain" on the result
4. Verify: Explanation is coherent, historically accurate, 3-4 sentences

**Test 2: AI Chat with RAG (Flash model)**
1. Open AI chat modal
2. Ask: "What's my XP?" — triggers `getUserProgress` tool
3. Ask: "What was my last lesson about?" — triggers `getLastCompletedModule` tool
4. Ask: "Did I learn about Damascus?" — triggers `searchLessons` tool
5. Verify: All tool calls work, responses are coherent

**Test 3: AI Chat with Web Search (Flash model)**
1. Open AI chat modal
2. Ask: "What's the latest archaeological discovery about the Umayyad mosque?"
3. Verify: Response includes web search sources, content is relevant

**Test 4: Image Analysis (Flash model)**
1. Open AI chat modal
2. Upload an image (photo of a mosque, historical artwork, etc.)
3. Verify: AI describes the image with historical context

**Test 5: Image Generation (unchanged — uses imageModel)**
1. Open AI chat modal
2. Ask: "Generate an image of the Umayyad mosque in Damascus"
3. Verify: Image is generated (confirms imageModel is unaffected)

---

## Rollback Plan

If Flash quality is noticeably worse for chat, revert to a single model by changing `chatModel` back to `gemini-3-pro-preview`. The architecture with two separate model properties makes this a one-line change.

```typescript
// Revert: change Flash back to Pro if quality is insufficient
private chatModel = 'gemini-3-pro-preview';  // was 'gemini-3-flash-preview'
```
