# PostHog Analytics Integration Guide

## Overview

This guide explains how to integrate comprehensive analytics tracking into lesson and quiz components using the custom hooks provided.

## ✅ Completed Integrations

### 1. Authentication Tracking
- **Location**: `components/AppleSignInButton.tsx`, `components/GoogleSignInButton.tsx`, `app/(auth)/email-details.tsx`
- **Events**: `user_signed_up`, `user_session_in`
- **Status**: ✅ Fully Integrated

### 2. Onboarding Tracking
- **Location**: `app/onboarding-video.tsx`, `app/onboarding-results.tsx`
- **Events**: `onboarding_completed` (with all 4 question answers and time tracking)
- **Status**: ✅ Fully Integrated

### 3. Page View Tracking
- **Location**: All tab screens (`index.tsx`, `profile.tsx`, `eras.tsx`, `SubscribeContent.native.tsx`)
- **Events**: `page_view` (with time spent and click tracking)
- **Status**: ✅ Fully Integrated

### 4. App Lifecycle Tracking
- **Location**: `app/_layout.tsx`
- **Events**: `app_opened`, `app_backgrounded`, `app_foregrounded`, `app_closed`
- **Status**: ✅ Fully Integrated

### 5. Notification Tracking
- **Location**: `app/_layout.tsx`
- **Events**: `notification_received`, `notification_clicked`
- **Status**: ✅ Fully Integrated

## 🎓 Lesson Tracking Integration

### Step 1: Import the Hook

```typescript
import { useLessonTracking } from '@/hooks/useLessonTracking';
```

### Step 2: Initialize in Component

```typescript
export default function Adventure1_Module1_Lesson1({
  onContinue,
  onDismiss,
}: Adventure1_Module1_Lesson1Props) {
  // Initialize lesson tracking
  const {
    trackVideoPlay,
    trackVideoPause,
    trackVideoComplete,
    trackCardExpanded,
    trackLessonComplete,
  } = useLessonTracking({
    adventureId: 1,
    moduleId: 1,
    lessonId: 'lesson1',
    lessonType: 'video_reading', // or 'image_carousel', 'video_carousel', etc.
  });

  // ... rest of component
}
```

### Step 3: Track Video Events

```typescript
// Handle video playback status
const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
  if (status.isLoaded) {
    // Track video play event (call once when video starts)
    if (status.isPlaying && !hasPlayedRef.current) {
      trackVideoPlay();
      hasPlayedRef.current = true;
    }

    // Track video pause event
    if (!status.isPlaying && status.positionMillis > 0) {
      trackVideoPause(status.positionMillis, status.durationMillis || 0);
    }

    // Track video completion (95% threshold)
    if (status.durationMillis && status.positionMillis) {
      const progress = status.positionMillis / status.durationMillis;
      if (progress >= 0.95 && !hasVideoCompletedRef.current) {
        trackVideoComplete();
        hasVideoCompletedRef.current = true;
      }
    }
  }
};
```

### Step 4: Track Reading Card Expansion

```typescript
// When user expands reading card
const expandCard = () => {
  setIsCardExpanded(true);
  trackCardExpanded(); // Track analytics event
  // ... rest of expand logic
};
```

### Step 5: Track Lesson Completion

```typescript
const handleContinue = () => {
  // Complete lesson in progress system
  completeLesson(1, 1, "lesson1");

  // Track analytics
  trackLessonComplete();

  // Navigate to next lesson
  onContinue();
};
```

## 🎯 Quiz Tracking Integration

### Step 1: Import the Hook

```typescript
import { useQuizTracking } from '@/hooks/useQuizTracking';
```

### Step 2: Initialize in Component

```typescript
export default function Adventure1_Module1_Quiz({
  onComplete,
  onDismiss,
}: Adventure1_Module1_QuizProps) {
  // Initialize quiz tracking
  const {
    trackQuestionAnswered,
    trackQuizComplete,
    trackQuizRetake,
  } = useQuizTracking({
    adventureId: 1,
    moduleId: 1,
    totalQuestions: 5,
  });

  // Track question start time for time_taken calculation
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  // ... rest of component
}
```

### Step 3: Track Question Answers

```typescript
const handleSubmitAnswer = () => {
  const selectedAnswer = // ... get selected answer
  const isCorrect = selectedAnswer === questions[currentQuestion].correctAnswer;

  // Calculate time taken for this question
  const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000);

  // Track the answer
  trackQuestionAnswered(
    currentQuestion + 1, // Question number (1-indexed)
    isCorrect,
    timeTaken
  );

  // Reset timer for next question
  setQuestionStartTime(Date.now());

  // ... rest of submit logic
};
```

### Step 4: Track Quiz Completion

```typescript
const handleQuizComplete = () => {
  // Calculate final score
  const correctCount = // ... count correct answers
  const score = (correctCount / totalQuestions) * 100;

  // Track completion
  trackQuizComplete(
    score,
    correctCount,
    false // isRetake
  );

  // Update progress system
  completeModule(adventureId, moduleId, score, correctCount);

  // Navigate to next screen
  onComplete();
};
```

### Step 5: Track Quiz Retakes

```typescript
const handleRetake = () => {
  // Track retake event
  trackQuizRetake(previousScore);

  // Reset quiz state
  setCurrentQuestion(0);
  setCorrectAnswers(0);
  // ... rest of reset logic
};
```

## 📊 Events Tracked

### Lesson Events
- `lesson_started` - Tracks when user opens a lesson (automatic on component mount)
- `video_played` - Tracks when video starts playing
- `video_paused` - Tracks when video is paused (includes progress and position)
- `video_completed` - Tracks when video reaches 95%+
- `reading_card_expanded` - Tracks when user expands the reading card
- `lesson_completed` - Tracks when user completes the lesson and continues

### Quiz Events
- `quiz_started` - Tracks when user opens a quiz (automatic on component mount)
- `quiz_question_answered` - Tracks each question answer with correctness and time
- `quiz_completed` - Tracks quiz completion with score and timing
- `quiz_retake` - Tracks when user retakes a quiz

### App Lifecycle Events
- `app_opened` - Tracks when app is launched
- `app_backgrounded` - Tracks when app goes to background
- `app_foregrounded` - Tracks when app returns to foreground
- `app_closed` - Tracks when app is terminated

### Notification Events
- `notification_received` - Tracks when notification is received (foreground)
- `notification_clicked` - Tracks when user taps a notification

## 🔧 Example: Full Lesson Integration

Here's a complete example integrating all lesson tracking:

```typescript
// Adventure1_Module1_Lesson1.tsx
import { useLessonTracking } from '@/hooks/useLessonTracking';

export default function Adventure1_Module1_Lesson1({ onContinue, onDismiss }) {
  const {
    trackVideoPlay,
    trackVideoPause,
    trackVideoComplete,
    trackCardExpanded,
    trackLessonComplete,
  } = useLessonTracking({
    adventureId: 1,
    moduleId: 1,
    lessonId: 'lesson1',
    lessonType: 'video_reading',
  });

  const hasPlayedRef = useRef(false);
  const hasCompletedRef = useRef(false);
  const [isCardExpanded, setIsCardExpanded] = useState(false);

  const handlePlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      // Track first play
      if (status.isPlaying && !hasPlayedRef.current) {
        trackVideoPlay();
        hasPlayedRef.current = true;
      }

      // Track pause (with position)
      if (!status.isPlaying && status.positionMillis > 0) {
        trackVideoPause(status.positionMillis, status.durationMillis || 0);
      }

      // Track completion at 95%
      if (status.durationMillis && status.positionMillis) {
        const progress = status.positionMillis / status.durationMillis;
        if (progress >= 0.95 && !hasCompletedRef.current) {
          trackVideoComplete();
          hasCompletedRef.current = true;
        }
      }
    }
  };

  const expandCard = () => {
    setIsCardExpanded(true);
    trackCardExpanded();
    // ... animation logic
  };

  const handleContinue = () => {
    completeLesson(1, 1, 'lesson1');
    trackLessonComplete();
    onContinue();
  };

  return (
    <View>
      <LessonPlayer
        videoSource={{ uri: "..." }}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
      />
      {/* ... rest of lesson UI */}
    </View>
  );
}
```

## 🎯 Example: Full Quiz Integration

Here's a complete example integrating all quiz tracking:

```typescript
// Adventure1_Module1_Quiz.tsx
import { useQuizTracking } from '@/hooks/useQuizTracking';

export default function Adventure1_Module1_Quiz({ onComplete, onDismiss }) {
  const {
    trackQuestionAnswered,
    trackQuizComplete,
    trackQuizRetake,
  } = useQuizTracking({
    adventureId: 1,
    moduleId: 1,
    totalQuestions: 5,
  });

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  const handleSubmitAnswer = () => {
    const isCorrect = selectedAnswer === questions[currentQuestion].correctAnswer;
    const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000);

    // Track this answer
    trackQuestionAnswered(
      currentQuestion + 1,
      isCorrect,
      timeTaken
    );

    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
    }

    // Move to next question or complete
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setQuestionStartTime(Date.now());
    } else {
      handleQuizComplete();
    }
  };

  const handleQuizComplete = () => {
    const score = (correctAnswers / questions.length) * 100;

    // Track completion
    trackQuizComplete(
      score,
      correctAnswers,
      false
    );

    // Update progress
    completeModule(1, 1, score, correctAnswers);

    onComplete();
  };

  const handleRetake = () => {
    trackQuizRetake(previousScore);

    // Reset state
    setCurrentQuestion(0);
    setCorrectAnswers(0);
    setQuestionStartTime(Date.now());
  };

  return (
    <QuizQuestion
      questionNumber={currentQuestion + 1}
      totalQuestions={questions.length}
      // ... quiz UI
    />
  );
}
```

## 📝 Integration Checklist

Use this checklist when integrating analytics into new components:

### Lesson Components
- [ ] Import `useLessonTracking` hook
- [ ] Initialize with correct `adventureId`, `moduleId`, `lessonId`, and `lessonType`
- [ ] Track video play event (first play only)
- [ ] Track video pause events with position
- [ ] Track video completion at 95%
- [ ] Track reading card expansion
- [ ] Track lesson completion on continue
- [ ] Test all events in console logs

### Quiz Components
- [ ] Import `useQuizTracking` hook
- [ ] Initialize with correct `adventureId`, `moduleId`, and `totalQuestions`
- [ ] Track each question answered with correctness and time
- [ ] Track quiz completion with score
- [ ] Track quiz retakes if applicable
- [ ] Test all events in console logs

## 🧪 Testing Analytics

### How to Verify Tracking

1. **Check Console Logs**: All analytics events log to console with 📊 emoji
   ```
   📊 [LessonTracking] Lesson started: 1-1-lesson1
   📊 [Analytics] Lesson Started: { adventure_id: 1, ... }
   ```

2. **Check PostHog Dashboard**:
   - Navigate to PostHog Events
   - Filter by event name (e.g., `lesson_started`, `quiz_completed`)
   - Verify properties are being sent correctly

3. **Test Anonymous Tracking**:
   - Clear app data
   - Use app without signing up
   - Check that `anonymous_id` is present in all events
   - Sign up and verify `alias` call connects anonymous to user ID

4. **Test User Tracking**:
   - Sign in
   - Verify `user_id` is present in all events
   - Verify `anonymous_id` is still present

## 🚨 Common Issues

### Issue: Events Not Showing in PostHog
**Solution**: Check that PostHog is initialized in `app/_layout.tsx` and ATT permissions are granted (iOS only)

### Issue: Anonymous ID Not Persisting
**Solution**: Check AsyncStorage is working correctly. The ID is stored in `analytics_anonymous_id` key

### Issue: Video Events Not Tracking
**Solution**: Make sure `handlePlaybackStatusUpdate` is passed to LessonPlayer and status checks are working

### Issue: Quiz Time Tracking Incorrect
**Solution**: Ensure `questionStartTime` is reset after each question

## 📚 Additional Resources

- [PostHog React Native Docs](https://posthog.com/docs/libraries/react-native)
- [AnalyticsService Source](../services/AnalyticsService.ts)
- [Lesson Tracking Hook](../hooks/useLessonTracking.ts)
- [Quiz Tracking Hook](../hooks/useQuizTracking.ts)
