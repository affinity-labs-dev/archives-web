# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

**Essential commands for immediate development:**
```bash
npm install                           # Install dependencies
npx expo start                        # Start dev server (i=iOS, a=Android, w=web)
npm run lint                          # Run linting (REQUIRED before commits)
npx expo start --clear                # Clear Metro cache (fixes module resolution)
eas build --platform ios --profile development  # Create development build
```

**First files to understand:**
- `app/_layout.tsx` - Provider hierarchy (PostHog → Clerk → BackgroundSync → Progress)
- `context/ProgressContext.tsx` - Atomic progress tracking (NEVER access AsyncStorage directly)
- `constants/ArchivesTheme.ts` - Design system (ALWAYS use these constants)
- `services/SimplifiedSyncService.ts` - Cloud sync with Supabase JSONB

## Critical Rules

**MUST follow these rules - no exceptions:**
1. **Check for syntax errors before commit** - Run `npm run lint` to check for errors. If errors found, REPORT them to user and ASK for permission before fixing. DO NOT automatically fix code - only inform user of issues.
2. **Git commit attribution** - NEVER include Claude attribution in commits. User wants commits to show only their GitHub account. Remove "Co-Authored-By: Claude" and "Generated with Claude Code" lines from ALL commit messages.
3. **NEVER access AsyncStorage directly** - Use `atomicProgressUpdate()` from ProgressContext
4. **ALWAYS use ArchivesTheme constants** - Never hardcode colors/spacing
5. **Component naming**: `Adventure{N}_Module{N}_Lesson{N}.tsx` pattern
6. **Clean commits**: Run `rm -f *.ipa *.apk build-*.ipa` before committing

## Architecture Overview

### Provider Hierarchy (app/_layout.tsx)
```
PostHogProvider (analytics from app launch)
└── ClerkProvider (authentication)
    └── BackgroundSyncProvider (cloud sync)
        └── ProgressProvider (state management)
            └── Stack Navigation (routing)
```

**Critical flow:** BackgroundSync waits for Clerk auth, then syncs cloud data BEFORE ProgressContext loads AsyncStorage (prevents data overwrite).

### Progress System Architecture

**Atomic updates prevent race conditions:**
```typescript
// CORRECT - Use atomic update
await atomicProgressUpdate(adventureId, moduleId, {
  type: 'LESSON_COMPLETED',
  lessonId: 'lesson1'
})

// WRONG - Never do this
await AsyncStorage.setItem(...)  // ❌ NEVER
```

**Data flow:**
1. User action → `atomicProgressUpdate()`
2. Update React state (instant UI)
3. Write AsyncStorage (local-first, <50ms)
4. Trigger cloud sync (debounced, async)

**Dual-era system:**
- **Umayyad Dynasty**: Adventures 1-5
- **Rise of Islam**: Separate Adventures 1-5 (new `roiAtomicProgressUpdate()`)

### Module Completion Logic
- **Unlock chain**: Adventure 1 unlocked by default → Complete all 3 modules → Unlock Adventure 2
- **Module completion**: Both lessons completed + Quiz passed (≥2/5 correct)
- **Star ratings**: 1-2 correct = 1★, 3-4 = 2★, 5 = 3★

## Key Dependencies & Their Purpose

| Dependency | Purpose | Critical Notes |
|------------|---------|----------------|
| `@clerk/clerk-expo` | Authentication | Apple Sign-In, token caching |
| `expo-video` | Lesson videos | Modern API (NOT expo-av for video) |
| `expo-av` | Background music | CloudFront compatible (expo-audio isn't) |
| `react-native-purchases` | Subscriptions | RevenueCat (expo-iap installed but unused) |
| `@supabase/supabase-js` | Cloud sync | Single table with JSONB column |
| `posthog-react-native` | Analytics | Conditional init based on iOS ATT |
| `expo-notifications` | Push notifications | Physical device required |

## File Structure

```
app/
├── _layout.tsx                    # Root providers
├── index.tsx                      # Smart routing (onboarding vs main app)
├── (auth)/                        # Auth screens
├── (tabs)/                        # Main app (5 tabs)
├── onboarding-*.tsx               # 8-screen onboarding flow
└── era-selection.tsx

components/
├── modules/
│   ├── adventure1-5/              # Umayyad Dynasty (complete)
│   ├── roiera2/                   # Rise of Islam (in development)
│   ├── ModuleModal.tsx            # Umayyad wrapper
│   ├── ROIModuleModal.tsx         # ROI wrapper
│   ├── LessonPlayer.tsx           # Video player
│   └── QuizSystem.tsx             # Quiz engine
└── eras/                          # Era selection screens
```

## Environment Configuration

**Required in `eas.json` for builds (local dev uses `.env`):**
```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY      # Authentication
EXPO_PUBLIC_SUPABASE_URL                # Database
EXPO_PUBLIC_SUPABASE_ANON_KEY          # Database (public)
EXPO_PUBLIC_POSTHOG_API_KEY            # Analytics
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY     # Subscriptions
```

## Common Development Tasks

### Fix Metro bundler issues
```bash
npx expo start --clear              # First try this
rm -rf node_modules/.cache          # If that fails
rm -rf node_modules && npm install  # Nuclear option
```

### Build for testing
```bash
# Development build (with dev menu)
eas build --platform ios --profile development

# Production build
eas build --platform ios --profile production
eas submit --platform ios  # Submit to App Store
```

### Debug device-specific features
**Physical device required for:**
- Push notifications
- Apple Sign-In
- Background audio
- Haptic feedback
- Subscription flows

### Working with Progress System

```typescript
import { useProgress } from '@/context/ProgressContext';

// In component
const {
  atomicProgressUpdate,     // Update progress
  getModuleProgress,        // Read progress
  isAdventureUnlocked      // Check unlock status
} = useProgress();

// Complete a lesson
await atomicProgressUpdate(adventureId, moduleId, {
  type: 'LESSON_COMPLETED',
  lessonId: 'lesson1'
});

// Complete a quiz
await atomicProgressUpdate(adventureId, moduleId, {
  type: 'QUIZ_COMPLETED',
  quizScore: 4,
  quizCorrectAnswers: 4
});
```

## Lesson Types & Content Development

**6 lesson types with comprehensive docs in `/docs/lesson-types/`:**
1. **Video + Reading** - Primary format (see `Adventure1_Module1_Lesson1.tsx`)
2. **Image Carousel** - Swipeable galleries (see `Adventure1_Module2_Lesson1.tsx`)
3. **Video Carousel** - Video series
4. **Static Image Reading** - Hero image + text
5. **Scrollable Media View** - Mixed media storytelling
6. **Quiz System** - MCQ, True/False, drag-and-drop

**Content status:**
- **Umayyad Dynasty**: Complete (5 adventures, 15 modules, 30 lessons, 15 quizzes)
- **Rise of Islam**: Adventure 1 Module 1 complete (rest in development)

### Specialized Claude Code Agents

When users request content creation, these agents are available:
- `quiz-designer` - Quiz components
- `video-reading-lesson-designer` - Video + Reading lessons
- `image-carousel-lesson-designer` - Image galleries
- `content-orchestrator` - Multi-adventure workflows
- `task-queue-coordinator` - Complex dependencies

## Design System (ArchivesTheme)

**ALWAYS use these constants:**
```typescript
import ArchivesTheme from '@/constants/ArchivesTheme';

// Colors
ArchivesTheme.colors.shoeBrown      // #4D392E (primary)
ArchivesTheme.colors.persianOrange  // #C99151 (accent)
ArchivesTheme.colors.creamWhite     // #F4EBDB (background)

// Components
ArchivesTheme.components.card       // Pre-styled card
ArchivesTheme.components.primaryButton  // Orange gradient
```

## Analytics & Privacy

**iOS App Tracking Transparency:**
```typescript
// PostHog only initializes if tracking permitted
if (Platform.OS === 'ios' && !canTrack) {
  return <>{children}</>;  // No analytics
}
```

**Event tracking patterns:**
- Lesson: `lesson_started`, `lesson_completed`
- Quiz: `quiz_started`, `quiz_completed`, `quiz_answer_selected`
- Module: `module_completed`, `adventure_unlocked`

## Cloud Sync Architecture

**Supabase single-table JSONB design:**
```sql
CREATE TABLE user_data (
  user_id TEXT PRIMARY KEY,
  data JSONB,  -- All progress data
  updated_at TIMESTAMPTZ
);
```

**Sync behavior:**
1. Sign-in → Check cloud data
2. Cloud exists → Restore from cloud (priority)
3. No cloud → Upload local progress
4. Ongoing → Debounced sync (2s) on changes

## Console Logging Convention

**Use emoji prefixes for filtering:**
```typescript
console.log('🔄 Syncing...')      // Progress updates
console.log('✅ Success')         // Completions
console.error('❌ Error:', err)   // Errors
console.log('🔓 Unlocked')        // Unlocking
console.log('🎉 Completed')       // Achievements
console.log('🔔 Notification')    // Push notifications
```

## Troubleshooting Guide

| Issue | Solution |
|-------|----------|
| Progress not saving | Check ProgressContext wrapping, network status |
| Video won't play | Verify CloudFront URL in browser |
| Build fails | Check API keys in `eas.json` |
| Module resolution error | `npx expo start --clear` |
| Gesture conflicts | Ensure immediate swipe re-enable after card gesture |
| Push notifications fail | Test on physical device only |

## Platform-Specific Notes

**iOS:**
- Bundle ID: `ai.affinitylabs.archivesexpo`
- Team ID: `L33CVM28SL`
- Requires physical device for: notifications, Apple Sign-In

**Android:**
- Package: `ai.affinitylabs.archivesexpo`
- Version code auto-increments

## Current Development Status

**Git branch:** master
**Recent focus:** PostHog analytics, push notifications, progress persistence fixes

**Known limitations:**
- Push notifications require physical device
- Video preloading can be slow initially
- Background sync may delay in poor network

## Important Patterns

### Local-First with Transparent Sync
```
User Action → Update local → Show instant UI → Sync to cloud (async)
```
Result: App feels native/offline-first but data is backed up.

### Atomic State Machine
All module state transitions handled in single transaction to prevent race conditions.

### Auto-Unlocking Chain
Complete module → Auto-unlock next → Complete adventure → Auto-unlock next adventure

### Conditional Provider Pattern
iOS requires ATT permission before analytics initialization - PostHog wrapped conditionally.

## Testing Checklist

Before submitting code:
- [ ] Run `npm run lint` and report any errors to user (don't auto-fix)
- [ ] Test on iOS simulator
- [ ] Test critical features on physical device (if applicable)
- [ ] Remove build artifacts (`rm -f *.ipa *.apk`)
- [ ] Verify progress persists after app restart
- [ ] Check AsyncStorage usage (must use ProgressContext)
- [ ] Ensure commit messages don't include Claude attribution