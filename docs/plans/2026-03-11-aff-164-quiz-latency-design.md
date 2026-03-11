# AFF-164: Fix AI Quiz Explanation Latency — Design

**Linear:** [AFF-164](https://linear.app/affinity-labs/issue/AFF-164/fix-ai-quiz-explanation-generation-latency-regression)
**Priority:** Urgent | **Assigned:** Sunny

## Problem

Quiz AI explanations take ~4-5 seconds because `getMultipleExplanations()` makes 5 sequential API calls to Gemini Flash with 100ms artificial delays between each. The chatbot (single API call) responds in ~0.7s. Users see a spinner for the full duration.

Additionally, free users (who only see Q1 behind a paywall) waste 4 API calls that are never displayed.

## Solution: Batch Prompt

Replace 5 sequential API calls with 1 batched prompt that returns all explanations as a JSON array. Expected latency: ~1s (down from ~5s).

### Approach chosen

- **Batch Prompt (Approach A)** — Single prompt, JSON array response
- **No streaming** (for now) — Batch already meets 2s TTFT target; streaming can be added later
- **Free users fetch Q1 only** — Saves 80% of API calls for non-subscribers
- **Re-fetch Q2-Q5 after subscribe** — If user subscribes via paywall CTA, fetch remaining explanations

## Architecture

### Data Flow (Before)

```
User taps "Get AI explanations"
  → getMultipleExplanations()
    → for (i = 0..4):
        getQuizExplanation(Q[i])  // API call #i
        wait 100ms
  → ~4-5 seconds later: all 5 arrive
  → UI: spinner → all cards at once
```

### Data Flow (After)

```
Premium user taps "Get AI explanations"
  → getBatchedExplanations(Q1..Q5)  // 1 API call
  → ~1 second later: JSON array of 5 explanations
  → UI: spinner → all cards at once

Free user taps "Get AI explanations"
  → getQuizExplanation(Q1)          // 1 API call
  → ~0.5 second later: Q1 explanation
  → UI: spinner → Q1 card + paywall overlay (unchanged)
```

## Files Changed

| File | Changes |
|------|---------|
| `gamification/services/AIService.ts` | New `getBatchedExplanations()` method, new `buildBatchExplanationPrompt()`, remove prod logging (line 144), remove 100ms delays |
| `components/quiz/AIQuizExplanation.tsx` | Subscription-aware fetching (Q1 only for free), 15s timeout + retry CTA, re-fetch Q2-Q5 after subscribe, generation time analytics |

### Files NOT changed (paywall preserved)

- `QuizResults.tsx` — renders `<AIQuizExplanation>` with same props
- `ExplanationCard` — pure render component
- All paywall UI/animations/CTA — completely untouched
- `handleShowPaywall()` — untouched

## Design Details

### 1. AIService: `getBatchedExplanations()`

New method that builds a single prompt with all questions and expects a JSON array response.

**Prompt structure:**
```
You are explaining {eraName} history to a {userLevel} student who just completed a quiz.
Provide a brief explanation for each question below.

Q1: {questionText}
User answered: {userAnswer} [✓ Correct / ✗ Incorrect, correct answer: {correctAnswer}]

Q2: ...

For each question, write 3-4 sentences that:
- If correct: reinforce why the answer is right and add historical context
- If incorrect: explain the correct answer and add an interesting fact

STRICT RULES:
- NEVER start with "Actually", "Well", "So", or filler words
- NO praise or motivational phrases
- Be concise and informative only

Return ONLY a JSON array with exactly {N} objects:
[{ "explanation": "..." }, { "explanation": "..." }, ...]
```

**Config:** Same as current — `textModel` (Flash), `maxOutputTokens: 2048` (increased from 1024 to fit 5 explanations), `thinkingLevel: LOW`, `temperature: 1.0`

**Fallback:** If JSON parsing fails → fall back to sequential `getQuizExplanation()` per question (current behavior as safety net)

### 2. AIQuizExplanation: Subscription-aware fetching

```typescript
// In handleGetExplanations():
if (isSubscribed) {
  // Premium: batch all questions in one call
  const explanations = await aiService.getBatchedExplanations(questions, userAnswers, context);
} else {
  // Free: only fetch Q1
  const q1 = await aiService.getQuizExplanation({ ...Q1 data });
  // Set only index 0
}
```

### 3. Timeout + Retry (AFF-164 requirement)

- Wrap API call in `Promise.race([apiCall, new Promise(reject after 15s)])`
- On timeout: Show "Taking longer than expected" + "Try Again" button
- Max 2 retry attempts, then show fallback text
- Tracks timeout in analytics

### 4. Re-fetch after subscribe

- Watch `isSubscribed` — when it flips `false → true` and Q1 is already loaded:
  - Call `getBatchedExplanations()` for all 5
  - Replace partial state with full explanations
  - Seamless transition from paywall → full content

### 5. Analytics additions

Add to existing `ai_quiz_explanation_generated` event:
- `generation_time_ms: number` — total time from request to response
- `fetch_mode: 'batch' | 'single'` — which path was used
- `is_subscriber: boolean` — for segment analysis

### 6. Cleanup

- Remove `console.log('📦 Full response:', JSON.stringify(response, null, 2))` from `AIService.ts:144`
- Remove 100ms artificial delays from `getMultipleExplanations()` (method kept for backward compat but no longer primary path)

## Acceptance Criteria Mapping

| AFF-164 Criteria | How we meet it |
|-----------------|----------------|
| TTFT < 2 seconds | Batch = single API call, ~0.5-1s TTFT |
| Progressive text streaming | Deferred to follow-up (batch already meets TTFT) |
| End-to-end faster than baseline | 5 calls → 1 call = ~80% reduction |
| Quality not degraded | Same model, same per-question prompt rules, spot-check 10 explanations |
| 15s timeout + retry | `Promise.race` with friendly error + CTA |
| Graceful slow network | Timeout catches it, retry available |
| Empty response handling | Existing fallback text preserved |

## Testing Plan

- [ ] Premium user: Tap "Get AI explanations" → all 5 cards appear in ~1s
- [ ] Free user: Tap → only Q1 loads, paywall visible, no extra API calls
- [ ] Free user subscribes via CTA → remaining Q2-Q5 load automatically
- [ ] Slow network (3G throttle) → timeout fires at 15s, retry works
- [ ] Malformed JSON from Gemini → falls back to sequential calls gracefully
- [ ] iOS and Android: identical behavior
- [ ] Spot-check 10 explanations for quality (correct vs incorrect answers)
- [ ] Verify `generation_time_ms` appears in PostHog events

## Out of Scope

- UI redesign of explanation sheet
- Streaming (generateContentStream) — follow-up ticket
- Paywall logic changes
- Quiz retake button changes (separate ticket AFF-322)
