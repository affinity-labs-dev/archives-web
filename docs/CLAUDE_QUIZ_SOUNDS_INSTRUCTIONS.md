# Claude Code Agent Instructions: Quiz Sound Implementation

**Task:** Add audio feedback to quiz components
**Target Files:** 16 remaining quiz files (1/17 complete)
**Estimated Time:** 5 minutes per file
**Reference Implementation:** `components/modules/adventure1/Adventure1_Module1_Quiz.tsx`

---

## Task Overview

Implement the `useQuizSounds` hook in all remaining quiz files to provide audio feedback (tap, correct, incorrect sounds) alongside existing haptic feedback.

---

## File Identification

### Quiz File Pattern
```
components/modules/adventure{N}/Adventure{N}_Module{N}_Quiz.tsx
components/modules/roiera2/ROIERA2Adv1_Module{N}_Quiz.tsx
```

### Files to Update (16 remaining)

```
components/modules/adventure1/Adventure1_Module2_Quiz.tsx
components/modules/adventure1/Adventure1_Module3_Quiz.tsx
components/modules/adventure2/Adventure2_Module1_Quiz.tsx
components/modules/adventure2/Adventure2_Module2_Quiz.tsx
components/modules/adventure2/Adventure2_Module3_Quiz.tsx
components/modules/adventure3/Adventure3_Module1_Quiz.tsx
components/modules/adventure3/Adventure3_Module2_Quiz.tsx
components/modules/adventure3/Adventure3_Module3_Quiz.tsx
components/modules/adventure4/Adventure4_Module1_Quiz.tsx
components/modules/adventure4/Adventure4_Module2_Quiz.tsx
components/modules/adventure4/Adventure4_Module3_Quiz.tsx
components/modules/adventure5/Adventure5_Module1_Quiz.tsx
components/modules/adventure5/Adventure5_Module2_Quiz.tsx
components/modules/adventure5/Adventure5_Module3_Quiz.tsx
components/modules/roiera2/ROIERA2Adv1_Module1_Quiz.tsx
components/modules/roiera2/ROIERA2Adv1_Module2_Quiz.tsx
```

---

## Implementation Steps

### Step 1: Add Import Statement

**Location:** After existing imports, typically after line with `import { useProgress }`

**Code to Add:**
```typescript
import { useQuizSounds } from '@/hooks/useQuizSounds'
```

**Search Pattern:** Look for:
```typescript
import { useProgress } from '@/context/ProgressContext'
```

**Action:** Add the useQuizSounds import immediately after this line.

---

### Step 2: Initialize Hook

**Location:** Inside the quiz component function, after other hook initializations

**Code to Add:**
```typescript
const { playTap, playCorrect, playIncorrect } = useQuizSounds()
```

**Search Pattern:** Look for:
```typescript
const { atomicProgressUpdate, canRetakeModule } = useProgress()
```
OR
```typescript
const { roiAtomicProgressUpdate, canRetakeRoiModule } = useProgress()
```

**Action:** Add the hook initialization 1-2 lines after the useProgress hook.

---

### Step 3: Add Tap Sound to Option Selection

**Location:** Inside option press handlers (MCQ, True/False, or Fill-in-blank)

**Existing Code Pattern:**
```typescript
onPress={() => {
  Haptics.selectionAsync()
  setSelected[Something](...)
}}
```

**Updated Code:**
```typescript
onPress={() => {
  Haptics.selectionAsync()
  playTap()  // ← ADD THIS LINE
  setSelected[Something](...)
}}
```

**Multiple Locations to Update:**
- MCQ option buttons
- True/False option buttons
- Fill-in-blank option buttons

**Search Patterns:**
1. `Haptics.selectionAsync()` (look for all occurrences)
2. `setSelectedMCQOption`
3. `setSelectedTrueFalse`
4. `handleFillBlankSelection`

**Action:** Add `playTap()` immediately after `Haptics.selectionAsync()` in ALL option press handlers.

---

### Step 4: Add Correct/Incorrect Sounds to Submit Handler

**Location:** Inside the `handleSubmit` function, after answer checking

**Existing Code Pattern:**
```typescript
const isCorrect = checkAnswer(...)
if (isCorrect) {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  setCorrectAnswers(prev => prev + 1)
  setTotalPoints(...)
} else {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
}
```

**Updated Code:**
```typescript
const isCorrect = checkAnswer(...)
if (isCorrect) {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  playCorrect()  // ← ADD THIS LINE
  setCorrectAnswers(prev => prev + 1)
  setTotalPoints(...)
} else {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
  playIncorrect()  // ← ADD THIS LINE
}
```

**Search Pattern:** Look for the `handleSubmit` function, then find:
```typescript
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
```
AND
```typescript
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
```

**Action:**
- Add `playCorrect()` immediately after the Success notification
- Add `playIncorrect()` immediately after the Error notification

---

## Verification Checklist

After implementing in each file, verify:

1. ✅ Import added: `import { useQuizSounds } from '@/hooks/useQuizSounds'`
2. ✅ Hook initialized: `const { playTap, playCorrect, playIncorrect } = useQuizSounds()`
3. ✅ `playTap()` added to ALL option selection handlers
4. ✅ `playCorrect()` added after Success haptic
5. ✅ `playIncorrect()` added after Error haptic
6. ✅ No syntax errors (check for missing commas, parentheses)
7. ✅ File compiles without TypeScript errors

---

## Common Patterns by Quiz Type

### MCQ Quizzes (Most Common)
```typescript
// Option selection (typically in renderQuestionContent)
<MCQOptionButton
  onPress={() => {
    Haptics.selectionAsync()
    playTap()  // ← ADD
    setSelectedMCQOption(index)
  }}
/>
```

### True/False Quizzes
```typescript
// Option selection
<TrueFalseOptionButton
  onPress={() => {
    Haptics.selectionAsync()
    playTap()  // ← ADD
    setSelectedTrueFalse(isTrue ? 1 : 0)
  }}
/>
```

### Fill-in-Blank Quizzes
```typescript
// Option selection
<FillBlankOption
  onPress={() => {
    Haptics.selectionAsync()
    playTap()  // ← ADD
    handleFillBlankSelection(text)
  }}
/>
```

---

## Edge Cases & Special Handling

### ROI Quizzes
- Pattern is the same as regular quizzes
- May use `roiAtomicProgressUpdate` instead of `atomicProgressUpdate`
- Sound implementation is identical

### Quizzes with Multiple Question Types
- Some quizzes have MCQ, True/False, AND Fill-in-blank
- Must add `playTap()` to ALL question type handlers
- Search for ALL occurrences of `Haptics.selectionAsync()`

### Quiz Retakes
- No special handling needed
- Hook automatically reloads sounds on component mount

---

## Code Location Hints

### Typical Line Numbers (Approximate)
- Import section: Lines 1-30
- Hook initialization: Lines 100-120
- Option handlers: Lines 250-300
- handleSubmit function: Lines 120-160

### Function Names to Search
- `handleSubmit()` - Always contains correct/incorrect logic
- `renderQuestionContent()` - Often contains option handlers
- `checkAnswer()` - Validates answers
- `resetCurrentQuestion()` - Resets state between questions

---

## Testing After Implementation

### Console Logs to Verify
Look for these logs after implementation:
```
🔊 Loading quiz sounds...
✅ Quiz sounds loaded successfully
🔊 Cleaning up quiz sounds...
```

### Quick Test Flow
1. Open quiz
2. Tap option → Should hear tap sound
3. Submit correct answer → Should hear correct sound
4. Submit incorrect answer (if retake) → Should hear incorrect sound

---

## Error Prevention

### Common Mistakes to Avoid

❌ **Missing parentheses:**
```typescript
playTap  // Wrong - function not called
```
✅ **Correct:**
```typescript
playTap()  // Correct - function called
```

❌ **Wrong placement:**
```typescript
if (isCorrect) {
  playCorrect()  // Wrong - before haptic
  Haptics.notificationAsync(...)
}
```
✅ **Correct:**
```typescript
if (isCorrect) {
  Haptics.notificationAsync(...)  // Haptic first
  playCorrect()  // Sound after
}
```

❌ **Missing in some handlers:**
```typescript
// Only added to MCQ, forgot True/False handlers
```
✅ **Correct:**
```typescript
// Added to ALL option handlers in the file
```

---

## Rollout Strategy

### Approach 1: Sequential (Recommended)
Implement one file at a time, test, then move to next:
1. Adventure1_Module2_Quiz.tsx
2. Adventure1_Module3_Quiz.tsx
3. Adventure2_Module1_Quiz.tsx
... (continue sequentially)

### Approach 2: Batch by Adventure
Implement all modules in one adventure, then test:
1. All Adventure 2 quizzes (3 files)
2. All Adventure 3 quizzes (3 files)
... (continue by adventure)

### Approach 3: Parallel (For Multiple Agents)
Split files across multiple agents:
- Agent 1: Adventure 1-2 quizzes
- Agent 2: Adventure 3-4 quizzes
- Agent 3: Adventure 5 + ROI quizzes

---

## Success Criteria

Implementation is complete when:
- ✅ All 16 remaining quiz files updated
- ✅ All files compile without errors
- ✅ Console shows sound loading logs
- ✅ Tap sounds play on option selection
- ✅ Correct/incorrect sounds play on submission
- ✅ No memory leaks (sounds cleanup on unmount)

---

## Reference Implementation

**File:** `components/modules/adventure1/Adventure1_Module1_Quiz.tsx`

**Key Changes Made:**
- Line 23: Added import
- Line 113: Initialized hook
- Line 133: Added `playCorrect()`
- Line 138: Added `playIncorrect()`
- Line 283: Added `playTap()`

**Use this file as the gold standard for all other implementations.**

---

## Completion Tracking

### Update Progress in Documentation
After completing each file, update the checkbox in:
`docs/QUIZ_SOUNDS_IMPLEMENTATION.md` (section: Rollout Progress)

### Commit Strategy
**Option 1: Per-file commits**
```bash
git add components/modules/adventure1/Adventure1_Module2_Quiz.tsx
git commit -m "Add quiz sounds to Adventure 1 Module 2 Quiz"
```

**Option 2: Batch commits**
```bash
git add components/modules/adventure{1,2}/*Quiz.tsx
git commit -m "Add quiz sounds to Adventures 1-2 quizzes"
```

**Option 3: Single commit (All 16 files)**
```bash
git add components/modules/**/*Quiz.tsx
git commit -m "Add quiz sounds to all remaining quizzes (16 files)"
```

---

## Additional Resources

- **Hook Source:** `hooks/useQuizSounds.ts`
- **Sound Files:** `assets/audio/quiz/*.wav`
- **Human Instructions:** `docs/QUIZ_SOUNDS_IMPLEMENTATION.md`
- **Quiz System Docs:** `docs/lesson-types/quiz-system.md`

---

**Last Updated:** October 10, 2025
**For:** Claude Code Agents
**Version:** 1.0
