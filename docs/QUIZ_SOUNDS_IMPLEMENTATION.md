# Quiz Sound Effects - Implementation Instructions

**Feature:** Audio feedback for quiz interactions
**Status:** ✅ Hook created | 🔄 Rollout in progress (1/17 quizzes)
**Last Updated:** October 10, 2025

---

## 📋 Quick Summary

This guide provides step-by-step instructions for adding audio feedback to quiz components. Sounds play alongside existing haptic feedback to enhance user experience with multi-sensory confirmation.

**Implementation Time:** ~5 minutes per quiz file

---

## 🎯 Prerequisites

Before implementing, ensure:
- ✅ Sound files exist in `assets/audio/quiz/` (tap.wav, correct.wav, incorrect.wav)
- ✅ `useQuizSounds` hook exists in `hooks/useQuizSounds.ts`
- ✅ `expo-av` is installed (already in package.json)

---

## 📂 Sound Files Reference

| File | Location | Size | Purpose |
|------|----------|------|---------|
| `tap.wav` | `assets/audio/quiz/` | 208KB | Plays when user selects an option |
| `correct.wav` | `assets/audio/quiz/` | 398KB | Plays when answer is correct |
| `incorrect.wav` | `assets/audio/quiz/` | 446KB | Plays when answer is incorrect |

---

## 🔧 Step-by-Step Implementation

Follow these steps to add quiz sounds to any quiz component:

### Step 1: Import the Hook

Add this import at the top of your quiz file (after other imports):

```typescript
import { useQuizSounds } from '@/hooks/useQuizSounds'
```

**Example location:** After `import { useProgress } from '@/context/ProgressContext'`

---

### Step 2: Initialize the Hook

Inside your quiz component function, add this line with other hooks:

```typescript
const { playTap, playCorrect, playIncorrect } = useQuizSounds()
```

**Example location:** After `const { atomicProgressUpdate, canRetakeModule } = useProgress()`

---

### Step 3: Add Tap Sound to Option Selection

Find the option press handler (MCQ, True/False, or Fill-in-blank) and add `playTap()`:

**For MCQ options:**
```typescript
onPress={() => {
  Haptics.selectionAsync()      // Existing haptic
  playTap()                      // ← ADD THIS LINE
  setSelectedMCQOption(index)    // Existing state update
}}
```

**For True/False options:**
```typescript
onPress={() => {
  Haptics.selectionAsync()      // Existing haptic
  playTap()                      // ← ADD THIS LINE
  setSelectedTrueFalse(isTrue ? 1 : 0)  // Existing state update
}}
```

**For Fill-in-blank options:**
```typescript
onPress={() => {
  Haptics.selectionAsync()      // Existing haptic
  playTap()                      // ← ADD THIS LINE
  handleFillBlankSelection(text) // Existing handler
}}
```

---

### Step 4: Add Correct/Incorrect Sounds to Submit Handler

Find the `handleSubmit` function and locate the answer checking logic. Add sounds after checking if answer is correct:

```typescript
const handleSubmit = () => {
  // ... existing code ...

  const isCorrect = checkAnswer(currentQuestionIndex, newUserAnswers[currentQuestionIndex])

  if (isCorrect) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)  // Existing
    playCorrect()  // ← ADD THIS LINE
    setCorrectAnswers(prev => prev + 1)
    setTotalPoints(prev => prev + quizQuestions[currentQuestionIndex].points)
  } else {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)  // Existing
    playIncorrect()  // ← ADD THIS LINE
  }

  // ... rest of code ...
}
```

---

## ✅ Implementation Checklist

For each quiz file, check off:

- [ ] Step 1: Added `useQuizSounds` import
- [ ] Step 2: Initialized hook with destructured functions
- [ ] Step 3: Added `playTap()` to option selection handler(s)
- [ ] Step 4: Added `playCorrect()` to correct answer branch
- [ ] Step 5: Added `playIncorrect()` to incorrect answer branch
- [ ] Tested: Tap sound plays when selecting options
- [ ] Tested: Correct sound plays on correct submission
- [ ] Tested: Incorrect sound plays on incorrect submission
- [ ] Verified: No console errors related to audio

---

## 📝 Example Implementation

**Reference File:** `components/modules/adventure1/Adventure1_Module1_Quiz.tsx`

### Complete Example

```typescript
// 1. Import (line ~23)
import { useQuizSounds } from '@/hooks/useQuizSounds'

export default function Adventure1_Module1_Quiz({ onDismiss, onBack }: Props) {
  // ... other state ...

  // 2. Initialize hook (line ~113)
  const { playTap, playCorrect, playIncorrect } = useQuizSounds()

  // 3. In handleSubmit (line ~133, ~138)
  const handleSubmit = () => {
    // ... code ...
    const isCorrect = checkAnswer(currentQuestionIndex, newUserAnswers[currentQuestionIndex])
    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      playCorrect()  // ✅ Added
      setCorrectAnswers(prev => prev + 1)
      // ...
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      playIncorrect()  // ✅ Added
    }
  }

  // 4. In option press handler (line ~283)
  <MCQOptionButton
    onPress={() => {
      Haptics.selectionAsync()
      playTap()  // ✅ Added
      setSelectedMCQOption(index)
    }}
  />
}
```

---

## 📊 Rollout Progress

Track implementation across all quiz files:

### ✅ Completed (1/17)
- [x] Adventure 1 Module 1 Quiz

### 🔄 Pending (16/17)

**Adventure 1:**
- [ ] Adventure1_Module2_Quiz.tsx
- [ ] Adventure1_Module3_Quiz.tsx

**Adventure 2:**
- [ ] Adventure2_Module1_Quiz.tsx
- [ ] Adventure2_Module2_Quiz.tsx
- [ ] Adventure2_Module3_Quiz.tsx

**Adventure 3:**
- [ ] Adventure3_Module1_Quiz.tsx
- [ ] Adventure3_Module2_Quiz.tsx
- [ ] Adventure3_Module3_Quiz.tsx

**Adventure 4:**
- [ ] Adventure4_Module1_Quiz.tsx
- [ ] Adventure4_Module2_Quiz.tsx
- [ ] Adventure4_Module3_Quiz.tsx

**Adventure 5:**
- [ ] Adventure5_Module1_Quiz.tsx
- [ ] Adventure5_Module2_Quiz.tsx
- [ ] Adventure5_Module3_Quiz.tsx

**Rise of Islam (ROI):**
- [ ] ROIERA2Adv1_Module1_Quiz.tsx
- [ ] ROIERA2Adv1_Module2_Quiz.tsx

---

## 🎨 User Experience Flow

Understanding the complete audio-haptic feedback flow:

1. **User opens quiz** → Sounds preload silently in background (~200ms)
2. **User taps option B** → `tap.wav` + selection haptic (instant feedback)
3. **User taps SUBMIT** → Medium impact haptic
4. **Answer validation:**
   - ✅ **Correct** → `correct.wav` + Success haptic → Green checkmark + explanation
   - ❌ **Incorrect** → `incorrect.wav` + Error haptic → Red X + explanation
5. **User taps CONTINUE** → Light impact haptic → Next question
6. **Repeat** → Same flow for questions 2-5

---

## 🧪 Testing Instructions

### After Implementation - Test Each Quiz

**Quick Test (2 minutes):**
1. ✅ Open quiz → Check console for `🔊 Quiz sounds loaded successfully`
2. ✅ Tap option → Hear tap sound + feel haptic
3. ✅ Submit correct answer → Hear correct sound + feel success haptic
4. ✅ Submit incorrect answer (retake) → Hear incorrect sound + feel error haptic
5. ✅ Exit quiz → Check console for `🔊 Cleaning up quiz sounds...`

**Comprehensive Test (5 minutes):**
- [ ] Test on iOS physical device (primary platform)
- [ ] Test on Android physical device
- [ ] Test rapid option selection (sounds should queue properly)
- [ ] Test quiz completion flow (all 5 questions)
- [ ] Test quiz retake flow (sounds work on second attempt)
- [ ] Test with device on silent mode (sounds should still play)
- [ ] Exit and re-enter quiz (sounds reload properly)
- [ ] Check for console errors (no audio failures)

**Device-Specific Notes:**
- iOS Simulator: Audio may be delayed (~50-100ms)
- Android Emulator: Audio may be choppy
- Web: Audio requires user interaction first (tap option before sounds work)

---

## 🐛 Troubleshooting

### Issue: Sounds Don't Play

**Check 1: Console Logs**
```bash
# Look for these logs:
🔊 Loading quiz sounds...
✅ Quiz sounds loaded successfully
```
If missing, sound files may not be loading.

**Check 2: File Paths**
Verify sound files exist:
```bash
ls assets/audio/quiz/
# Should show: tap.wav, correct.wav, incorrect.wav
```

**Check 3: Import Hook**
Ensure hook is imported and initialized:
```typescript
import { useQuizSounds } from '@/hooks/useQuizSounds'  // Import
const { playTap, playCorrect, playIncorrect } = useQuizSounds()  // Initialize
```

**Check 4: Function Calls**
Verify functions are called (not just referenced):
```typescript
playTap()  // ✅ Correct (with parentheses)
playTap    // ❌ Wrong (missing parentheses)
```

### Issue: Sounds are Delayed

**Solution:** Test on physical device, not simulator
- Simulators have audio latency issues
- Physical devices have <10ms playback latency

### Issue: Memory Leak Warning

**Cause:** Quiz unmounted before sounds unloaded
**Solution:** Hook already handles cleanup automatically via `useEffect` return

### Issue: Sounds Play But Haptics Don't

**Cause:** Haptics require physical device
**Solution:** Test on real iOS/Android device, not simulator

---

## 📚 Technical Reference

### Hook API

```typescript
interface UseQuizSoundsReturn {
  playTap: () => Promise<void>;       // Play tap sound
  playCorrect: () => Promise<void>;   // Play correct sound
  playIncorrect: () => Promise<void>; // Play incorrect sound
  isLoaded: boolean;                  // Sound loading status
}
```

### Audio Settings
- **Tap volume:** 70% (0.7)
- **Correct volume:** 80% (0.8)
- **Incorrect volume:** 80% (0.8)
- **Format:** WAV (uncompressed, cross-platform)
- **Total memory:** ~1MB (all 3 sounds)

### Dependencies
- `expo-av`: Already in package.json
- React hooks: `useEffect`, `useRef` (built-in)

---

## 🔮 Future Enhancements

Ideas for extending quiz sound system:

- [ ] Add sound toggle in Settings screen
- [ ] Add celebration sound for perfect score (5/5)
- [ ] Add different tap sounds per question type (MCQ vs True/False)
- [ ] Add whoosh sound for quiz page transitions
- [ ] Add volume control slider in Settings
- [ ] Add sound for "Next Question" button
- [ ] Add sound for quiz results screen appearance

---

## 🔗 Related Documentation

- **Quiz System:** `docs/lesson-types/quiz-system.md`
- **Haptic Feedback:** See recent ProgressContext.tsx changes (Light impact)
- **Audio Hook:** `hooks/useQuizSounds.ts` (source code)
- **Background Music:** `hooks/useBackgroundMusic.ts` (similar pattern)

---

## 💡 Tips & Best Practices

1. **Always test on physical device** - Simulators have audio issues
2. **Check console logs** - Look for 🔊 emoji for audio debugging
3. **Don't skip the hook initialization** - Sounds won't work without it
4. **Keep sound calls simple** - Just `playTap()`, no async/await needed
5. **Trust the cleanup** - Hook handles unmount automatically
6. **Follow the pattern** - Use Adventure1_Module1_Quiz as reference

---

## ✍️ Quick Reference Card

**Copy-paste this for each new quiz file:**

```typescript
// 1. Import
import { useQuizSounds } from '@/hooks/useQuizSounds'

// 2. Initialize (with other hooks)
const { playTap, playCorrect, playIncorrect } = useQuizSounds()

// 3. Option selection (in onPress)
Haptics.selectionAsync()
playTap()

// 4. Correct answer (in handleSubmit)
if (isCorrect) {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  playCorrect()
}

// 5. Incorrect answer (in handleSubmit)
else {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
  playIncorrect()
}
```

---

**Last Updated:** October 10, 2025
**Maintainer:** Archives Expo Team
**Questions?** Check troubleshooting section or reference Adventure1_Module1_Quiz.tsx
