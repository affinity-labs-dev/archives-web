# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

**Essential commands:**
```bash
npm install                           # Install dependencies (requires Node 20.19.4)
npx expo start                        # Dev server (i=iOS, a=Android, w=web)
npm run lint                          # REQUIRED before commits
npx expo start --clear                # Clear Metro cache
eas build --platform ios --profile development  # Dev build
eas update --branch production        # Push OTA update
```

**Architecture entry points:**
- `app/_layout.tsx` - Provider hierarchy, initialization order critical
- `context/ProgressContext.tsx` - Atomic progress updates, XP calculation (NEVER use AsyncStorage directly)
- `constants/ArchivesTheme.ts` - Design system colors/spacing (ALWAYS use)
- `services/SimplifiedSyncService.ts` - Cloud sync with Supabase JSONB
- `Adventure1_Module1_Lesson1.tsx` - Best lesson implementation reference

**Common code patterns:**
```typescript
// Progress updates (CORRECT)
await atomicProgressUpdate(adventureId, moduleId, {
  type: 'LESSON_COMPLETED',
  lessonId: 'lesson1'
})

// Design system (CORRECT)
import ArchivesTheme from '@/constants/ArchivesTheme';
color: ArchivesTheme.colors.persianOrange

// WRONG - Never do these
await AsyncStorage.setItem(...)  // ❌ Use ProgressContext
color: '#C99151'                 // ❌ Use ArchivesTheme
```

## Critical Rules

**MUST follow these rules - no exceptions:**
1. **🚀 PRODUCTION APP - iOS & Android LIVE** - Both platforms are in production with real users. ALL code changes MUST work perfectly on BOTH iOS and Android. Test on both platforms before committing. Cross-platform compatibility is MANDATORY.
2. **Check for syntax errors before commit** - Run `npm run lint` to check for errors. If errors found, REPORT them to user and ASK for permission before fixing. DO NOT automatically fix code - only inform user of issues.
3. **Git commit attribution** - NEVER include Claude attribution in commits. User wants commits to show only their GitHub account. Remove "Co-Authored-By: Claude" and "Generated with Claude Code" lines from ALL commit messages.
4. **NEVER access AsyncStorage directly** - Use `atomicProgressUpdate()` from ProgressContext
5. **ALWAYS use ArchivesTheme constants** - Never hardcode colors/spacing
6. **Component naming**: `Adventure{N}_Module{N}_Lesson{N}.tsx` pattern
7. **Clean commits**: Run `rm -f *.ipa *.apk build-*.ipa` before committing
8. **Cross-platform impact analysis** - Before answering ANY questions about layout, styling, positioning, or UI changes, ALWAYS analyze how the change will affect BOTH iOS and Android. Check platform-specific component behavior (SafeAreaView, StatusBar, etc.), different layout structures, and margin/padding/positioning differences. Include both iOS and Android impact analysis in your response.
9. **JSX text content** - ALWAYS use curly quotes or escape apostrophes in JSX text. Use `'` or `'` for apostrophes, `"` and `"` for quotes. Never use straight quotes (`'` or `"`) in user-facing text as they trigger `react/no-unescaped-entities` lint errors.
10. **NEVER ASSUME - ALWAYS VERIFY** - Do NOT make assumptions about how code works based on naming conventions, column names, or logical guesses. ALWAYS:
    - **Read the actual code** before answering questions about data flow, component behavior, or architecture
    - **Run grep/search** to verify if a variable/column/prop is actually used in code (e.g., `grep -r "era.timeline" --include="*.tsx"`)
    - **Query Supabase directly** to verify actual data structure and values - use the PostHog MCP or Supabase dashboard to check what data exists
    - **Trace the full data path**: Supabase Table → Hook/Query → Component Props → Render function
    - **If uncertain, ASK** the user for clarification instead of guessing
    - **Column exists ≠ Column is used** - Always verify usage in consuming components AND check actual data in Supabase
    - Example: Before saying "timeline column shows X", BOTH run `grep -r "timeline" components/` to confirm it's rendered AND check Supabase to see actual column values

## Architecture Overview

### Provider Hierarchy (app/_layout.tsx)
```
PostHogProvider (analytics from app launch)
└── AnalyticsWrapper (PostHog initialization + app lifecycle tracking)
    └── ClerkProvider (authentication)
        └── BackgroundSyncProvider (cloud sync)
            └── RewardsProvider (badges + avatars system)
                └── ProgressProvider (state management)
                    └── PreferencesProvider (user settings)
                        └── AvatarAnimationWrapper (unlock animations)
                            └── Stack Navigation (routing)
```

**Critical initialization sequence:**
1. PostHog initializes (conditional on iOS ATT permission)
2. Clerk authenticates user
3. BackgroundSync fetches cloud data (waits for Clerk)
4. ProgressContext loads local AsyncStorage AFTER cloud sync completes
5. This order prevents cloud data from being overwritten by stale local data

**Key architectural patterns:**
- **Web-compatible storage wrapper** in ProgressContext prevents SSR issues on web platform
- **Centralized XP calculation** in ProgressContext (`calculateXPForEra`, `calculateTotalXP`) with era-specific rules
- **Dual era system**: Legacy (Umayyad) vs New (ROI) with separate contexts but shared provider hierarchy
- **Font loading critical path**: DM Sans + Cormorant must load before splash screen hides (prevents flash)

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

**Dual-era system (unified ProgressContext):**
- **Umayyad Dynasty (Era 1)**: Adventures 1-5 - uses `atomicProgressUpdate()`
- **Rise of Islam (Era 2)**: Adventures 1-5 - uses same `atomicProgressUpdate()`, stats via `getROIAdventureStats()`
- Both eras share the same `ProgressContext` with era-specific XP calculation and progress tracking

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
| `react-native-purchases` | Subscriptions | RevenueCat with intro offer eligibility checking (expo-iap installed but unused) |
| `@supabase/supabase-js` | Cloud sync | Single table with JSONB column |
| `posthog-react-native` | Analytics | Conditional init based on iOS ATT, session replay enabled |
| `@sentry/react-native` | Error tracking | Performance tracing enabled (tracesSampleRate: 1.0) |
| `expo-notifications` | Push notifications | Physical device required |
| `customerio-reactnative` | Push notifications | Customer.io SDK for targeted campaigns |
| `@google/genai` | AI features | Gemini API for AI chat and image generation |
| `rive-react-native` | Animated illustrations | Used for Start Here speech bubble animation |
| `react-native-bottom-tabs` | Native tab bar | Custom iOS-style tabs (not React Navigation tabs) |
| `expo-tracking-transparency` | iOS ATT | Required before PostHog initialization on iOS |
| `imagekit-javascript` | ROI media CDN | URLs stored in Supabase, no client-side init needed |

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
│   ├── adventure1/                # Umayyad Dynasty Adventure 1
│   ├── adventure2/                # Umayyad Dynasty Adventure 2
│   ├── adventure3/                # Umayyad Dynasty Adventure 3
│   ├── adventure4/                # Umayyad Dynasty Adventure 4
│   ├── adventure5/                # Umayyad Dynasty Adventure 5
│   ├── ModuleModal.tsx            # Umayyad wrapper
│   ├── LessonPlayer.tsx           # Video player
│   └── QuizSystem.tsx             # Quiz engine
├── ROI/                           # Rise of Islam era components
│   └── ROIModuleModal.tsx         # ROI wrapper
├── adventures/                    # Adventure-specific components
└── eras/                          # Era selection screens
```

## Environment Configuration

**Development setup:**
- Local dev: Create `.env` file with required keys (not in repo)
- EAS builds: All env vars configured in `eas.json` under `build.base.env`
- Required variables for all environments:
  - `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` - Authentication
  - `EXPO_PUBLIC_SUPABASE_URL` - Database
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Database (public)
  - `EXPO_PUBLIC_POSTHOG_API_KEY` - Analytics
  - `EXPO_PUBLIC_POSTHOG_HOST` - Analytics host
  - `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` - iOS subscriptions
  - `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` - Android subscriptions
  - `EXPO_PUBLIC_GEMINI_API_KEY` - Gemini AI features
  - `EXPO_PUBLIC_CUSTOMERIO_CDP_API_KEY` - Customer.io analytics
  - `EXPO_PUBLIC_CUSTOMERIO_SITE_ID` - Customer.io site identifier

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

# Preview build (internal testing)
eas build --platform ios --profile preview

# Production build
eas build --platform ios --profile production
eas submit --platform ios  # Submit to App Store

# Check build status
eas build:list --limit 10

# Push OTA updates (for changes that don't require native rebuild)
eas update --branch production --message "Your update message"
```

**Build profiles (eas.json):**
- `development` - Dev client, internal distribution, simulator support, APK for Android
- `preview` - Internal testing build, APK for Android, simulator support
- `production` - Store distribution, auto-increments buildNumber (iOS) and versionCode (Android)
- All profiles inherit from `base` (includes all env vars)
- Each profile has its own update channel for OTA updates

### Testing requirements
**Always test on both iOS AND Android** - This is a production app with real users on both platforms.

**Simulator/Emulator testing:**
- Most features work on simulators
- Quick iteration during development

**Physical device required for:**
- Push notifications (cannot test on simulator)
- Apple Sign-In (requires device with Face ID/Touch ID)
- Background audio (simulator has limitations)
- Haptic feedback (no haptics on simulator)
- Subscription flows (RevenueCat requires real device)
- Full Universal Links / App Links testing

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

**6 lesson types:**

| Type | Best Reference | Key Features |
|------|---------------|-------------|
| **Video + Reading** | `Adventure1_Module1_Lesson1.tsx` | expo-video player, expandable card, ultra-smooth progress animations |
| **Image Carousel** | `Adventure1_Module2_Lesson1.tsx` | Swipeable gallery, background music, caption overlays |
| **Video Carousel** | `components/ROI/ROIVideoCarouselLesson.tsx` | Multiple videos, modern useVideoPlayer hooks |
| **Static Image Reading** | See lesson docs | Hero image + scrollable text |
| **Scrollable Media View** | See lesson docs | Mixed media storytelling |
| **Quiz System** | `QuizSystem.tsx` | MCQ/True-False/Drag-drop, sound effects, star ratings |

**Best reference lesson:** `Adventure1_Module1_Lesson1.tsx` has complete animation system, cross-platform gestures, video completion detection, progress tracking integration.

**Reusable lesson hooks and components:**
- `hooks/useLessonBase.ts` - Shared lesson logic (video state, progress tracking, navigation)
- `components/LessonPlayer.tsx` - Unified orchestrator for all lesson types
- `components/eras/` - Generic era components (can be reused for new eras)

**Content status:**
- **Umayyad Dynasty (Era 1)**: Complete (5 adventures, 15 modules, 30 lessons, 15 quizzes)
- **Rise of Islam (Era 2)**: Adventure 1 Module 1 complete, reusable components created

## Walkthrough Hints System

**First-time-only hints** with AsyncStorage persistence (flags in `constants/WalkthroughKeys.ts`)

**Behavior:**
- Two global flags: `REEL` and `CAROUSEL` (shared across all eras)
- Shows once per lesson type across entire app lifetime
- **Reel lessons:** Percentage-based hints at 20-30%, 50-60%, 95%+ (read) and 30-40%, 60-70%, 100%+ (continue)
- **Carousel lessons:** "abovedots" hint always visible, "continue" appears on last slide
- Hints disappear instantly if user expands reading card

**Key implementation details:**
- Assets: `/assets/images/walkthrough/` (read.svg, continue.svg, abovedots.svg)
- Styling: `pointerEvents: 'none'`, `zIndex: 15-25`, responsive positioning via `SCREEN_HEIGHT` percentages
- SVG aspect ratios: read (180×73), continue (150×60), abovedots (180×81)
- Save flag on lesson completion via `AsyncStorage.setItem(WALKTHROUGH_KEYS.REEL/CAROUSEL, 'true')`

**Reference implementations:**
- `components/modules/adventure1/Adventure1_Module1_Lesson1.tsx` (reel with percentage timing)
- `components/modules/adventure1/Adventure1_Module2_Lesson1.tsx` (image carousel)
- `components/ROI/ROIReelLesson.tsx`, `ROIImageCarouselLesson.tsx`, `ROIVideoCarouselLesson.tsx` (reusable)

### Specialized Claude Code Agents

When users request content creation, these agents are available:
- `quiz-designer` - Quiz components
- `video-reading-lesson-designer` - Video + Reading lessons
- `image-carousel-lesson-designer` - Image galleries
- `video-carousel-lesson-designer` - Video series lessons
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
- App lifecycle: `app_opened`, `app_foregrounded`, `app_backgrounded`, `app_closed`
- Lesson: `lesson_started`, `lesson_completed`
- Quiz: `quiz_started`, `quiz_completed`, `quiz_answer_selected`
- Module: `module_completed`, `adventure_unlocked`
- Notifications: `notification_received`, `notification_clicked`
- Session replay: Automatically captures all sessions (text inputs masked for privacy)

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

**🚀 PRODUCTION STATUS: Both iOS and Android are LIVE**
- Test ALL changes on both platforms before committing
- Physical device required for: notifications, Apple Sign-In, background audio, haptics, subscriptions

**iOS (App Store):**
- Bundle: `ai.affinitylabs.archivesexpo` | Team: `LQ9LP2WW94` | App ID: `6751173663`
- Build number: `105` (auto-increments on production builds)
- Universal Links via `link.archiveszone.app`

**Android (Play Store):**
- Package: `ai.affinitylabs.archivesexpo`
- Version code: `27` (auto-increments on production builds)
- Edge-to-edge disabled, largeHeap enabled (Android OOM fixes)
- App Links SHA-256: Must match console fingerprint

**Shared:**
- EAS Project: `4f1f4bc4-0ced-48f3-b712-178b54175088`
- App version: `3.1.0` | Runtime: `1.0.0` | Expo SDK: 54
- New Architecture: Enabled (React Native 0.81.5)

## Important Patterns & Development Context

**Current status:** Branch `merge-eras` | Both platforms LIVE in production
(Check `git log --oneline -10` for recent work and current development focus)

### Recent Development Focus
- **Customer.io integration** - Push notification campaigns with unified analytics tracking via `CustomerIOService.ts`
- **Gemini AI features** - AI chat modal (`AIChatModal.tsx`), image generation and viewing capabilities
- **Unified Supabase-driven era selection** - Eras loaded from Supabase `eras` table, content from `content` table with string `era_id`
- **Generic era architecture** - ROI components renamed to reusable era structure (`useLessonBase` hook, unified `LessonPlayer` orchestrator)
- **TWO ERAS system** - Umayyad Dynasty (Era 1) and Rise of Islam (Era 2) with separate content
- **Sentry integration** - Error tracking and performance tracing enabled (tracesSampleRate: 1.0)
- **Android OOM fixes** - largeHeap enabled, video source simplified for HLS compatibility
- **Gamified components** - Milestone system, era progress headers moved to era-level

### Local-First with Transparent Sync
```
User Action → Update local → Show instant UI → Sync to cloud (async)
```
Result: App feels native/offline-first but data is backed up.

### Atomic State Machine
All module state transitions handled in single transaction to prevent race conditions.

### Auto-Unlocking Chain
Complete module → Auto-unlock next → Complete adventure → Auto-unlock next adventure

### Rewards System
- **Badges**: Automatically checked and awarded after quiz completion based on XP thresholds
- **Avatars**: Historical figures unlocked via module completion (animation system in place)
- Integration: `RewardsContext` → `checkAndUnlockItems()` called from `atomicProgressUpdate()`
- XP Calculation: Each correct quiz answer = 10 XP

### Conditional Provider Pattern
iOS requires ATT permission before analytics initialization - PostHog wrapped conditionally.

### Notification Token Sync
Push notification tokens automatically synced to Supabase on registration and app launch.

### Universal Links & App Links (Deep Linking)
**Domain:** `link.archiveszone.app` - OS intercepts HTTPS links before browser, app opens directly

**Configuration:**
- iOS: `public/.well-known/apple-app-site-association` + `associatedDomains` in app.json (20min verification)
- Android: `public/.well-known/assetlinks.json` + `intentFilters` with `autoVerify: true` + SHA-256 fingerprint
- Expo Router handles routing automatically

**Testing:**
```bash
# Verify files accessible
curl https://link.archiveszone.app/.well-known/apple-app-site-association
# Test: Send link via Messages, click should open app (not browser)
```

**Troubleshooting:** Wait 20min post-install | Some apps block links | Check SHA-256 in Play Console

### Subscription Intro Offers
RevenueCat integration checks intro offer eligibility (iOS only) and displays "1 MONTH FREE" banner for eligible users dynamically.

## Testing Checklist

Before committing:
- [ ] `npm run lint` - Report errors (don't auto-fix)
- [ ] Test on iOS AND Android simulators
- [ ] Physical device testing if using: notifications, auth, audio, haptics, subscriptions
- [ ] Verify progress persists after restart
- [ ] AsyncStorage only via ProgressContext (never direct)
- [ ] Remove build artifacts (`rm -f *.ipa *.apk`)
- [ ] No Claude attribution in commit messages

## Types System

Progress types are centralized in `/types/progress.ts`:
- `EraType` - LEGACY (Era 1) vs NEW (Era 2+)
- `ModuleState` - LOCKED, LESSON1_AVAILABLE, LESSON1_COMPLETED, etc.
- `ProgressUpdateAction` - LESSON_COMPLETED, QUIZ_COMPLETED, QUIZ_RETAKEN, MODULE_RESET
- `ModuleProgress`, `AdventureProgress` - Core data structures