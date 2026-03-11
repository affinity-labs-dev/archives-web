# AFF-164: Fix AI Quiz Explanation Latency — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce quiz AI explanation latency from ~5s to ~1s by batching 5 sequential API calls into 1, and fetch only Q1 for free users.

**Architecture:** Replace `getMultipleExplanations()` (sequential for-loop with 5 `getQuizExplanation()` calls + 100ms delays) with a single `getBatchedExplanations()` method that sends all questions in one Gemini prompt and returns a JSON array. The `AIQuizExplanation` component becomes subscription-aware: premium users get the batch call, free users get a single Q1 call. A 15s timeout with retry CTA prevents infinite spinners. Paywall UI/logic is completely untouched.

**Tech Stack:** `@google/genai` (Gemini Flash), React Native, RevenueCat (`useRevenueCat`), PostHog analytics

**Design doc:** `docs/plans/2026-03-11-aff-164-quiz-latency-design.md`

---

### Task 1: Add `getBatchedExplanations()` to AIService

**Files:**
- Modify: `gamification/services/AIService.ts:275-320` (after `parseAIResponse`, before `getMultipleExplanations`)

**Step 1: Add `buildBatchExplanationPrompt()` private method**

Insert after `parseAIResponse()` (after line 275), before `getMultipleExplanations()` (line 277):

```typescript
  /**
   * Build a single prompt for batched quiz explanations (all questions at once)
   */
  private buildBatchExplanationPrompt(
    questions: Question[],
    userAnswers: number[],
    context: { eraName: string; userLevel?: string }
  ): string {
    const { eraName, userLevel = 'intermediate' } = context;

    let questionsBlock = '';
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const userAnswerIndex = userAnswers[i];
      const correctAnswerIndex = question.answers.findIndex((a) => a.is_correct);
      const correctAnswer = question.answers[correctAnswerIndex]?.text || 'Unknown';
      const userAnswer = question.answers[userAnswerIndex]?.text || 'No answer';
      const isCorrect = userAnswerIndex === correctAnswerIndex;

      questionsBlock += `\nQ${i + 1}: ${question.question_text}\n`;
      if (isCorrect) {
        questionsBlock += `User answered: ${correctAnswer} ✓ (Correct)\n`;
      } else {
        questionsBlock += `User answered: ${userAnswer} ✗ (Incorrect, correct answer: ${correctAnswer})\n`;
      }
    }

    return `You are explaining ${eraName} history to a ${userLevel} student who just completed a quiz.
Provide a brief explanation for each question below.
${questionsBlock}
For each question, write 3-4 sentences:
- If the student answered correctly: reinforce why that answer is right and add deeper historical context
- If the student answered incorrectly: explain why the correct answer is right and add an interesting historical fact

STRICT RULES:
- NEVER start any explanation with "Actually", "Well", "So", or similar filler words
- Start directly with the historical explanation
- NO praise, motivational phrases, encouragement, or "keep learning" endings
- Be concise and informative only

Return ONLY a JSON array with exactly ${questions.length} objects in order (Q1 first, Q2 second, etc.):
[{ "explanation": "3-4 sentence explanation" }, { "explanation": "..." }, ...]`;
  }
```

**Step 2: Add `getBatchedExplanations()` public method**

Insert right after `buildBatchExplanationPrompt()`, before the existing `getMultipleExplanations()`:

```typescript
  /**
   * Generate explanations for all questions in a single API call (batched).
   * Returns a JSON array of AIExplanationResponse. Falls back to sequential
   * calls via getMultipleExplanations() if batch parsing fails.
   */
  async getBatchedExplanations(
    questions: Question[],
    userAnswers: number[],
    context: {
      eraName: string;
      adventureName?: string;
      userLevel?: 'beginner' | 'intermediate' | 'advanced';
    }
  ): Promise<AIExplanationResponse[]> {
    if (!this.isAvailable() || !this.ai) {
      throw new Error('AI Service is not available. Please configure EXPO_PUBLIC_GEMINI_API_KEY.');
    }

    try {
      const prompt = this.buildBatchExplanationPrompt(questions, userAnswers, context);

      if (__DEV__) console.log('🤖 [AIService] Requesting batched explanations for', questions.length, 'questions');

      const response = await this.ai.models.generateContent({
        model: this.textModel,
        contents: [{ text: prompt }],
        config: {
          maxOutputTokens: 2048,
          temperature: 1.0,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });

      // Extract text from response
      let aiResponse = '';
      const candidate = response.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            aiResponse += part.text;
          }
        }
      }

      // Handle blocked responses
      const finishReason = candidate?.finishReason;
      if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
        console.warn(`⛔ [AIService] Batched response blocked: ${finishReason}`);
        // Fall back to sequential
        return this.getMultipleExplanations(questions, userAnswers, context);
      }

      if (__DEV__) console.log('✅ [AIService] Batched response received, parsing JSON array...');

      // Parse JSON array
      const parsed = this.parseBatchResponse(aiResponse, questions.length);
      if (parsed) {
        return parsed;
      }

      // JSON parsing failed — fall back to sequential calls
      console.warn('⚠️ [AIService] Batch JSON parse failed, falling back to sequential calls');
      return this.getMultipleExplanations(questions, userAnswers, context);
    } catch (error) {
      console.error('❌ [AIService] Batched explanation error, falling back to sequential:', error);
      // Fall back to sequential calls on any error
      return this.getMultipleExplanations(questions, userAnswers, context);
    }
  }

  /**
   * Parse a batched JSON array response from Gemini.
   * Returns null if parsing fails (caller should fall back).
   */
  private parseBatchResponse(aiResponse: string, expectedCount: number): AIExplanationResponse[] | null {
    try {
      let cleaned = aiResponse.trim();
      // Remove markdown code fences if present
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();

      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed) || parsed.length !== expectedCount) {
        console.warn(`⚠️ [AIService] Batch response: expected array of ${expectedCount}, got`, typeof parsed, Array.isArray(parsed) ? parsed.length : 'N/A');
        return null;
      }

      return parsed.map((item: any) => ({
        explanation: typeof item.explanation === 'string' ? item.explanation : String(item.explanation || ''),
      }));
    } catch {
      return null;
    }
  }
```

**Step 3: Verify it compiles**

Run: `npx expo start --clear` (or `npx tsc --noEmit` if available)
Expected: No TypeScript errors related to the new methods

**Step 4: Commit**

```bash
git add gamification/services/AIService.ts
git commit -m "feat(AFF-164): add getBatchedExplanations() for single-call quiz explanations"
```

---

### Task 2: Clean up AIService production logging

**Files:**
- Modify: `gamification/services/AIService.ts:144` and `gamification/services/AIService.ts:126-127`

**Step 1: Remove verbose production logging in `getQuizExplanation()`**

At line 144, replace:
```typescript
      console.log('📦 [AIService] Full response:', JSON.stringify(response, null, 2));
```
with:
```typescript
      if (__DEV__) console.log('📦 [AIService] Full response:', JSON.stringify(response, null, 2));
```

At lines 126-127, replace:
```typescript
      console.log('🤖 [AIService] Requesting explanation from Gemini...');
      console.log('📝 Question:', request.questionText);
```
with:
```typescript
      if (__DEV__) console.log('🤖 [AIService] Requesting explanation from Gemini...');
      if (__DEV__) console.log('📝 Question:', request.questionText);
```

At lines 180-181, replace:
```typescript
      console.log('📝 [AIService] Extracted text:', aiResponse);
      console.log('✅ [AIService] Received explanation from Gemini');
```
with:
```typescript
      if (__DEV__) console.log('📝 [AIService] Extracted text:', aiResponse);
      if (__DEV__) console.log('✅ [AIService] Received explanation from Gemini');
```

At line 264, replace:
```typescript
        console.log('✅ [AIService] Using plain text explanation format');
```
with:
```typescript
        if (__DEV__) console.log('✅ [AIService] Using plain text explanation format');
```

**Step 2: Commit**

```bash
git add gamification/services/AIService.ts
git commit -m "fix(AFF-164): guard verbose AI logging behind __DEV__"
```

---

### Task 3: Make AIQuizExplanation subscription-aware with timeout

**Files:**
- Modify: `components/quiz/AIQuizExplanation.tsx:107-308` (state + handleGetExplanations)

**Step 1: Add new state variables**

At line 110 (after `const [loadingAll, setLoadingAll] = useState(false);`), add:

```typescript
  const [timedOut, setTimedOut] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
```

**Step 2: Add a timeout helper**

After the `isPaywallPresentedRef` line (line 113), add:

```typescript
  const MAX_RETRIES = 2;
  const TIMEOUT_MS = 15_000;
```

**Step 3: Replace `handleGetExplanations` (lines 222-308)**

Replace the entire `handleGetExplanations` function with:

```typescript
  // Generate AI explanations (subscription-aware + timeout)
  const handleGetExplanations = async () => {
    if (!aiService.isAvailable()) {
      alert('AI explanations are not available. Please contact support.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowExplanations(true);
    setLoadingAll(true);
    setTimedOut(false);

    const fetchMode = isSubscribed ? 'batch' : 'single';

    // Track AI explanation request
    analyticsService.trackCustomEvent('ai_quiz_explanation_requested', {
      adventure_id: adventureId,
      module_id: moduleId,
      era_name: eraName,
      total_questions: questions.length,
      correct_questions: explanations.filter((e) => e.isCorrect).length,
      incorrect_questions: explanations.filter((e) => !e.isCorrect).length,
      is_subscriber: isSubscribed,
      fetch_mode: fetchMode,
    });

    AppLogger.info('ai', 'Requesting AI quiz explanations', {
      totalQuestions: questions.length,
      fetchMode,
    });

    // Animate in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Animate paywall in slightly after content fades in (free users only)
    if (!isSubscribed) {
      setTimeout(() => {
        Animated.spring(paywallAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 9,
        }).start();
      }, 400);
    }

    const startTime = Date.now();

    try {
      // Wrap API call with 15s timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), TIMEOUT_MS)
      );

      let aiExplanations: { explanation: string }[];

      if (isSubscribed) {
        // Premium: batch all questions in one call
        aiExplanations = await Promise.race([
          aiService.getBatchedExplanations(questions, userAnswers, {
            eraName,
            adventureName,
            userLevel: 'intermediate',
          }),
          timeoutPromise,
        ]);
      } else {
        // Free: only fetch Q1
        const q1 = questions[0];
        const q1UserAnswerIndex = userAnswers[0];
        const q1CorrectIndex = q1.answers.findIndex((a) => a.is_correct);
        const q1Explanation = await Promise.race([
          aiService.getQuizExplanation({
            questionText: q1.question_text,
            correctAnswer: q1.answers[q1CorrectIndex]?.text || 'Unknown',
            userAnswer: q1.answers[q1UserAnswerIndex]?.text || 'No answer',
            questionType: q1.question_type,
            eraName,
            adventureName,
            userLevel: 'intermediate',
            isCorrect: q1UserAnswerIndex === q1CorrectIndex,
          }),
          timeoutPromise,
        ]);
        // Wrap single response into array (only index 0 will be used)
        aiExplanations = [q1Explanation];
      }

      const generationTimeMs = Date.now() - startTime;

      // Update explanations with AI responses
      setExplanations((prev) =>
        prev.map((item, index) => ({
          ...item,
          aiExplanation: aiExplanations[index]?.explanation,
          loading: false,
        }))
      );

      // Track successful generation with timing
      analyticsService.trackCustomEvent('ai_quiz_explanation_generated', {
        adventure_id: adventureId,
        module_id: moduleId,
        era_name: eraName,
        explanations_count: aiExplanations.length,
        generation_time_ms: generationTimeMs,
        fetch_mode: fetchMode,
        is_subscriber: isSubscribed,
      });

      AppLogger.info('ai', 'AI explanations generated', {
        count: aiExplanations.length,
        timeMs: generationTimeMs,
        fetchMode,
      });
    } catch (error) {
      const isTimeout = error instanceof Error && error.message === 'TIMEOUT';

      if (isTimeout) {
        AppLogger.warn('ai', 'AI explanation request timed out', { retryCount });
        setTimedOut(true);

        analyticsService.trackCustomEvent('ai_quiz_explanation_error', {
          adventure_id: adventureId,
          module_id: moduleId,
          era_name: eraName,
          error: 'timeout',
          retry_count: retryCount,
        });
      } else {
        AppLogger.error('ai', 'Failed to generate AI explanations', {}, error);

        analyticsService.trackCustomEvent('ai_quiz_explanation_error', {
          adventure_id: adventureId,
          module_id: moduleId,
          era_name: eraName,
          error: String(error),
        });

        setExplanations((prev) =>
          prev.map((item) => ({
            ...item,
            loading: false,
            error: 'Could not generate explanation. Please try again.',
          }))
        );
      }
    } finally {
      setLoadingAll(false);
    }
  };

  // Retry handler for timeout
  const handleRetryExplanations = () => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount((prev) => prev + 1);
      handleGetExplanations();
    } else {
      // Max retries reached — show fallback
      setExplanations((prev) =>
        prev.map((item) => ({
          ...item,
          loading: false,
          error: 'Could not generate explanation. Please try again later.',
        }))
      );
      setTimedOut(false);
    }
  };
```

**Step 4: Verify it compiles**

Run: `npx expo start --clear`
Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add components/quiz/AIQuizExplanation.tsx
git commit -m "feat(AFF-164): subscription-aware fetching + 15s timeout with retry"
```

---

### Task 4: Add timeout/retry UI to AIQuizExplanation render

**Files:**
- Modify: `components/quiz/AIQuizExplanation.tsx:342-346` (loading state in render)

**Step 1: Replace the loading spinner block**

At lines 342-346, the current loading block is:
```tsx
          {loadingAll ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={ArchivesTheme.colors.persianOrange} />
              <Text style={styles.loadingText}>Generating explanations...</Text>
            </View>
```

Replace it with:
```tsx
          {loadingAll || timedOut ? (
            <View style={styles.loadingContainer}>
              {timedOut ? (
                <>
                  <Ionicons name="time-outline" size={40} color={ArchivesTheme.colors.shoeBrown} />
                  <Text style={styles.timeoutTitle}>Taking longer than expected</Text>
                  <Text style={styles.timeoutSubtitle}>
                    The AI is still working. You can try again{retryCount < MAX_RETRIES ? '' : ' later'}.
                  </Text>
                  {retryCount < MAX_RETRIES && (
                    <TouchableOpacity style={styles.retryButton} onPress={handleRetryExplanations}>
                      <Ionicons name="refresh" size={18} color="white" />
                      <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <>
                  <ActivityIndicator size="large" color={ArchivesTheme.colors.persianOrange} />
                  <Text style={styles.loadingText}>Generating explanations...</Text>
                </>
              )}
            </View>
```

**Step 2: Add timeout/retry styles**

Add these to the `StyleSheet.create({...})` block at the bottom of the file (after `errorText` style around line 713):

```typescript
  // Timeout state
  timeoutTitle: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
    marginTop: 12,
    textAlign: 'center',
  },
  timeoutSubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ArchivesTheme.colors.persianOrange,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    gap: 6,
  },
  retryButtonText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
```

**Step 3: Verify it compiles**

Run: `npx expo start --clear`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add components/quiz/AIQuizExplanation.tsx
git commit -m "feat(AFF-164): add timeout UI with retry CTA for quiz explanations"
```

---

### Task 5: Add re-fetch after subscribe (useEffect watcher)

**Files:**
- Modify: `components/quiz/AIQuizExplanation.tsx` (add useEffect after existing effects)

**Step 1: Add a ref to track previous subscription state**

After the `isPaywallPresentedRef` line (around line 113), add:

```typescript
  const prevSubscribedRef = useRef(isSubscribed);
```

**Step 2: Add useEffect to watch `isSubscribed` changes**

After the "Prepare explanation items on mount" useEffect (after line 153), add:

```typescript
  // Re-fetch all explanations when user subscribes mid-session
  useEffect(() => {
    // Only trigger when subscription state changes from false → true
    if (isSubscribed && !prevSubscribedRef.current && showExplanations && explanations.length > 0) {
      AppLogger.info('ai', 'User subscribed mid-session, fetching all explanations');
      // Re-run the full fetch (now as a subscriber, it will use batch)
      handleGetExplanations();
    }
    prevSubscribedRef.current = isSubscribed;
  }, [isSubscribed]);
```

**Step 3: Verify it compiles**

Run: `npx expo start --clear`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add components/quiz/AIQuizExplanation.tsx
git commit -m "feat(AFF-164): re-fetch all explanations after mid-session subscribe"
```

---

### Task 6: Manual testing on iOS and Android

**No files changed in this task — verification only.**

**Step 1: Test premium user flow (batch)**

1. Sign in as a subscribed user (or use sandbox account)
2. Complete a quiz (any era, any module)
3. On QuizResults screen, tap "Get AI-powered explanations"
4. **Verify:** Loading spinner shows for ~1s (not ~5s)
5. **Verify:** All 5 explanation cards appear with correct Q1-Q5 ordering
6. **Verify:** Explanations are contextually correct (right answers get "reinforcement", wrong answers get "correction")
7. **Verify:** Console shows `🤖 [AIService] Requesting batched explanations for 5 questions`
8. Test on BOTH iOS and Android simulators

**Step 2: Test free user flow (single Q1)**

1. Sign in as a free (non-subscribed) user
2. Complete a quiz
3. Tap "Get AI-powered explanations"
4. **Verify:** Loading spinner shows for ~0.5s
5. **Verify:** Q1 card appears partially, faded, with paywall overlay below
6. **Verify:** Paywall CTA "Upgrade to Premium" button works (opens RevenueCat paywall)
7. **Verify:** Console does NOT show "batched explanations" — shows single `getQuizExplanation` call
8. Test on BOTH iOS and Android

**Step 3: Test subscribe-then-refetch flow**

1. As a free user, tap "Get AI explanations" (Q1 loads, paywall shows)
2. Tap "Upgrade to Premium" → complete purchase in sandbox
3. **Verify:** All 5 explanation cards load automatically after purchase
4. **Verify:** Paywall overlay disappears, replaced by full explanation list

**Step 4: Test timeout (simulate slow network)**

1. In iOS Simulator: Device → Network Link Conditioner → select "Very Bad Network" (or throttle in Charles Proxy)
2. Tap "Get AI explanations"
3. **Verify:** After 15s, timeout UI appears with "Taking longer than expected" message
4. **Verify:** "Try Again" button is visible
5. Tap "Try Again"
6. **Verify:** Loading restarts
7. If it times out again, tap "Try Again" one more time
8. **Verify:** After 2 retries, error message shows "Please try again later" without retry button

**Step 5: Verify PostHog analytics**

1. Check PostHog for the `ai_quiz_explanation_generated` event
2. **Verify:** New properties are present:
   - `generation_time_ms` (number, should be ~500-1500)
   - `fetch_mode` (`"batch"` or `"single"`)
   - `is_subscriber` (boolean)
3. Check for `ai_quiz_explanation_error` with `error: "timeout"` if you tested timeout

**Step 6: Commit verification results**

No code commit needed — just confirm all checks pass.

---

### Task 7: Lint check and final commit

**Step 1: Run lint**

```bash
npm run lint
```

Expected: No new errors introduced by our changes. Report any errors to user.

**Step 2: Clean build artifacts**

```bash
rm -f *.ipa *.apk build-*.ipa
```

**Step 3: Final commit (if any lint fixes needed)**

```bash
git add -A
git commit -m "fix(AFF-164): lint fixes for quiz explanation latency"
```

---

## Summary of all commits

1. `feat(AFF-164): add getBatchedExplanations() for single-call quiz explanations`
2. `fix(AFF-164): guard verbose AI logging behind __DEV__`
3. `feat(AFF-164): subscription-aware fetching + 15s timeout with retry`
4. `feat(AFF-164): add timeout UI with retry CTA for quiz explanations`
5. `feat(AFF-164): re-fetch all explanations after mid-session subscribe`
6. `fix(AFF-164): lint fixes for quiz explanation latency` (if needed)

## Key verification points

- **Paywall untouched:** `handleShowPaywall()`, paywall card UI, paywall animations — zero changes
- **`QuizResults.tsx` untouched:** Same props, same render
- **Fallback safety:** If batch JSON parsing fails, silently falls back to sequential calls (current behavior)
- **No new dependencies:** Uses existing `@google/genai` SDK methods only
