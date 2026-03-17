# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

**Essential commands:**
```bash
npm install                           # Install dependencies (requires Node 20.19.4)
npx expo start                        # Dev server (i=iOS, a=Android, w=web)
npm run lint                          # REQUIRED before commits (expo lint)
npx expo start --clear                # Clear Metro cache
npx expo run:ios                      # Run on iOS (native build)
npx expo run:android                  # Run on Android (native build)
eas build --platform ios --profile development  # Dev build
eas update --branch production        # Push OTA update
```

**Architecture entry points:**
- `app/_layout.tsx` - Provider hierarchy, initialization order critical
- `gamification/engines/GamifiedProgress.tsx` - Unified progress, XP calculation, cloud sync (NEVER use AsyncStorage directly)
- `gamification/engines/GamificationOrchestrator.tsx` - Achievements, celebrations, milestone tracking
- `gamification/index.ts` - Public API exports for all gamification features
- `constants/ArchivesTheme.ts` - Design system colors/spacing (ALWAYS use)
- `components/lessons/ReelLesson.tsx` - Reusable video + reading lesson component (best reference)

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
await AsyncStorage.setItem(...)  // ❌ Use GamifiedProgress
color: '#C99151'                 // ❌ Use ArchivesTheme
```

## Critical Rules

**MUST follow these rules - no exceptions:**
1. **🚀 PRODUCTION APP - iOS & Android LIVE** - Both platforms are in production with real users. ALL code changes MUST work perfectly on BOTH iOS and Android. Test on both platforms before committing. Cross-platform compatibility is MANDATORY.
2. **Check for syntax errors before commit** - Run `npm run lint` to check for errors. If errors found, REPORT them to user and ASK for permission before fixing. DO NOT automatically fix code - only inform user of issues.
3. **Git commit attribution** - NEVER include Claude attribution in commits. User wants commits to show only their GitHub account. Remove "Co-Authored-By: Claude" and "Generated with Claude Code" lines from ALL commit messages.
4. **NEVER access AsyncStorage directly** - Use `atomicProgressUpdate()` from GamifiedProgress (`@/gamification`)
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
SafeAreaProvider + GestureHandlerRootView
└── PostHogProvider (analytics from app launch)
    └── ClerkProvider (authentication)
        └── AnalyticsWrapper (PostHog init + RevenueCat + Sentry + Affinity + session tracking)
            └── GamificationWrapper (empty, reserved for future use)
                └── AdventuresContentProvider (Supabase content fetching)
                    └── RewardsProvider (badges + avatars system)
                        └── GamifiedProgressProvider (unified progress + cloud sync)
                            └── PreferencesProvider (user preferences)
                                └── GamificationOrchestratorProvider (achievements, celebrations, milestones)
                                    └── AIProvider (Gemini AI features)
                                        └── ThemeProvider + Stack Navigation + AIAssistant
```

**Critical initialization sequence:**
1. PostHog initializes (conditional on iOS ATT permission)
2. Clerk authenticates user
3. AnalyticsWrapper handles session tracking (sign-in/sign-out, last active)
4. GamifiedProgressProvider handles cloud sync internally (migration from legacy `user_data` to `gamification_data` table)
5. This order ensures cloud data is properly restored before local state initializes

**Key architectural patterns:**
- **Web-compatible storage wrapper** in GamifiedProgress prevents SSR issues on web platform
- **Centralized XP calculation** in GamifiedProgress (`calculateXPForEra`, `calculateTotalXP`) with era-specific rules
- **Unified cloud sync** - GamifiedProgress handles both local state and Supabase sync (debounced 2s)
- **Font loading critical path**: DM Sans + Cormorant must load before splash screen hides (prevents flash)
- **Metro config**: Uses Sentry integration (`getSentryExpoConfig`) and adds `.riv` to asset extensions for Rive animations
- **Babel**: `babel-preset-expo` + `react-native-reanimated/plugin` (reanimated plugin must be last)

### Progress System Architecture

**Atomic updates prevent race conditions** (see Quick Start for code examples).

**Data flow:**
1. User action → `atomicProgressUpdate()`
2. Update React state (instant UI)
3. Write AsyncStorage (local-first, <50ms)
4. Trigger cloud sync (debounced, async)

**Unified Supabase-driven era system:**
- **ALL eras come from Supabase** - `eras` table for era definitions, `content` table for adventures/modules/lessons
- **Progress storage**: `newProgress` array in GamifiedProgress stores all module progress with `era_id`, `adventureId`, `moduleId`
- **Legacy compatibility**: Old `moduleProgress` array maintained for existing Era 1 user data (backward compat only)
- **XP calculation**: `quizCorrectAnswers * 10` per module, tracked per-era via `era_xp` property
- Both `atomicProgressUpdate()` (Era 1) and `saveNewProgressData()` (Era 2+) feed into same analytics
- **Cloud table**: `gamification_data` (migrated from legacy `user_data` table)

### Module Completion Logic
- **Unlock chain**: Adventure 1 unlocked by default → Complete all modules → Unlock Adventure 2
- **Module completion**: All lessons completed + Quiz passed (≥2/5 correct)
  - **Variable lesson count**: Number of lessons per module = `media_url.length` in ContentItem
  - Each ContentItem in `content_list` represents one module with 1+ lessons + 1 quiz
- **Star ratings**: 1-2 correct = 1★, 3-4 = 2★, 5 = 3★

### Gamification Orchestrator Pattern

**Centralized celebration system** in `GamificationOrchestrator.tsx`:

```typescript
import { useGamificationOrchestrator } from '@/gamification';

// In Quiz component
const { reportQuizComplete, checkTimeBasedAchievement } = useGamificationOrchestrator();

// After quiz completion
await reportQuizComplete({
  eraId,
  adventureId,
  oldEraXP,
  newEraXP,
  adventureModulesCompleted,
  adventureTotalModules,
  adventureData,
});
```

**Orchestrator automatically handles:**
- XP milestone checks (50, 100, 200, 500, 1000 XP)
- Adventure complete celebrations
- Streak milestone checks (3, 7, 30, 100 days)
- Achievement unlocks (17 total achievements)
- Celebration queuing (shows one at a time, preserves order)

**Key principle:** Components just report events, orchestrator handles all celebration logic.

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
| `AffinityNotificationService` | Push notifications | Affinity notification service for targeted campaigns |
| `@google/genai` | AI features | Gemini API for AI chat and image generation |
| `rive-react-native` | Animated illustrations | Used for Start Here speech bubble animation |
| `react-native-bottom-tabs` | Native tab bar | Custom iOS-style tabs (not React Navigation tabs) |
| `expo-tracking-transparency` | iOS ATT | Required before PostHog initialization on iOS |
| `imagekit-javascript` | ROI media CDN | URLs stored in Supabase, no client-side init needed |

## File Structure

```
app/
├── _layout.tsx                    # Root providers (Sentry.wrap)
├── index.tsx                      # Smart routing (onboarding vs main app)
├── sso-callback.tsx               # Clerk SSO callback handler
├── (auth)/                        # Auth screens
├── (onboarding)/                  # 8-screen onboarding flow (welcome, videos, questions, results)
└── (tabs)/                        # Main app (5 tabs: today, eras, era-view, subscribe, profile)

gamification/                      # Unified gamification module
├── engines/                       # Core contexts and logic
│   ├── GamifiedProgress.tsx       # Progress tracking + cloud sync
│   ├── GamificationOrchestrator.tsx  # Achievements + celebrations
│   ├── AIContext.tsx              # AI chat context
│   ├── RewardsContext.tsx         # Badges + avatars
│   └── useDailyStreak.ts          # Streak tracking
├── services/                      # Services
│   ├── AIService.ts               # Gemini AI integration
│   ├── GameGeneratorService.ts    # AI puzzle generation
│   └── AIContextService.ts        # AI context management
├── ui/                            # UI components
│   ├── achievement/               # Achievement grids
│   ├── ai/                        # AI chat modals
│   ├── celebrations/              # XP milestones, adventure complete
│   └── games/                     # Jigsaw puzzles
├── hooks/                         # Reusable hooks
│   ├── useGameTimer.ts
│   └── useJigsawLogic.ts
├── types/                         # Type definitions
│   ├── gamification.ts
│   └── games.ts
└── index.ts                       # Public API exports

components/
├── modules/
│   └── QuizSystem.tsx             # Legacy quiz engine
├── lessons/                       # Reusable lesson components (all eras)
│   ├── LessonPlayer.tsx           # Unified lesson orchestrator
│   ├── ReelLesson.tsx             # Video + reading
│   ├── ImageCarouselLesson.tsx    # Image galleries
│   ├── VideoCarouselLesson.tsx    # Video series
│   ├── ScrollableMediaViewLesson.tsx
│   ├── VideoPlayer.tsx            # Shared video player
│   ├── LessonConstants.ts        # Lesson configuration
│   └── renderers/                 # Lesson content renderers
├── quiz/                          # Modern quiz system
│   ├── Quiz.tsx                   # Universal quiz component
│   ├── QuizResults.tsx            # Results screen
│   └── AIQuizExplanation.tsx      # AI-powered quiz explanations
├── adventure/                     # Adventure components
│   ├── shared/                    # AdventureComponent, AdventureSummary
│   └── types/bento-grid/          # AdventureCard, BentoGridScreen
└── eras/                          # Era selection screens

context/                              # React contexts
├── AdventuresContentProvider.tsx  # Supabase content fetching
└── PreferencesContext.tsx          # User preferences

hooks/                                # Reusable hooks
├── useLessonBase.ts               # Shared lesson logic
├── useAdventures.ts               # Adventure data hooks
├── useEras.ts                     # Era data hooks
├── useRevenueCat.ts               # Subscription hooks
├── useBackgroundMusic.tsx         # Background audio control
└── ...                            # Various feature hooks

services/                             # External service integrations
├── AnalyticsService.ts            # PostHog wrapper
├── AffinityNotificationService.ts  # Push notifications (Affinity backend)
└── ...
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
  - `EXPO_PUBLIC_AFFINITY_API_URL` - Affinity notification service URL
  - `EXPO_PUBLIC_AFFINITY_API_KEY` - Affinity notification service API key
  - `EXPO_PUBLIC_AFFINITY_APP_ID` - Affinity notification service app ID
  - `SENTRY_AUTH_TOKEN` - Sentry source map uploads (build-time only)

## Common Development Tasks

### Fix Metro bundler issues
```bash
npx expo start --clear              # First try this
rm -rf node_modules/.cache          # If that fails
rm -rf node_modules && npm install  # Nuclear option
```

### Build for testing
```bash
# Development build (with dev menu) - add --platform android for Android
eas build --platform ios --profile development

# Development build for physical iOS device
eas build --platform ios --profile development-device

# Preview build (internal testing)
eas build --platform ios --profile preview
eas build --platform android --profile preview  # Android APK

# Production build
eas build --platform ios --profile production
eas build --platform android --profile production  # Android AAB
eas submit --platform ios  # Submit to App Store

# Check build status
eas build:list --limit 10

# Push OTA updates (for changes that don't require native rebuild)
eas update --branch production --message "Your update message"
```

**Build profiles (eas.json):**
- `development` - Dev client, internal distribution, simulator support, APK for Android
- `development-device` - Dev client for physical iOS devices (no simulator)
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
import { useGamifiedProgress } from '@/gamification';

// In component
const {
  atomicProgressUpdate,     // Update progress
  getModuleProgress,        // Read progress
  isAdventureUnlocked,      // Check unlock status
  calculateTotalXP,         // Calculate total XP across all eras
  saveNewProgressData,      // Save new era progress (Era 2+)
} = useGamifiedProgress();

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
| **Video + Reading** | `components/lessons/ReelLesson.tsx` | expo-video player, expandable card, progress animations |
| **Image Carousel** | `components/lessons/ImageCarouselLesson.tsx` | Swipeable gallery, background music, caption overlays |
| **Video Carousel** | `components/lessons/VideoCarouselLesson.tsx` | Multiple videos, modern useVideoPlayer hooks |
| **Static Image Reading** | See lesson docs | Hero image + scrollable text |
| **Scrollable Media View** | See lesson docs | Mixed media storytelling |
| **Quiz System** | `QuizSystem.tsx` | MCQ/True-False/Drag-drop, sound effects, star ratings |

**Best reference lesson:** `components/lessons/ReelLesson.tsx` — reusable across all eras with animation system, cross-platform gestures, video completion detection, and progress tracking.

**Reusable lesson hooks and components:**
- `hooks/useLessonBase.ts` - Shared lesson logic (video state, progress tracking, navigation)
- `components/lessons/LessonPlayer.tsx` - Unified orchestrator for all lesson types
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
- `components/lessons/ReelLesson.tsx` (video + reading with percentage timing)
- `components/lessons/ImageCarouselLesson.tsx` (image carousel)
- `components/lessons/VideoCarouselLesson.tsx` (video carousel)

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

// Components (pre-styled buttons, cards, inputs)
ArchivesTheme.components.card              // Pre-styled card
ArchivesTheme.components.primaryButton     // Orange gradient button
ArchivesTheme.components.secondaryButton   // White button with border
ArchivesTheme.components.input             // Input field styling

ArchivesTheme.common.whiteCard            // White card with shadow
ArchivesTheme.common.modalTitle           // Modal header text style
ArchivesTheme.common.bodyText             // Standard body text
ArchivesTheme.common.rowBetween           // Flex row space-between
ArchivesTheme.common.circularIcon         // Circular icon container
// See ArchivesTheme.ts for full list of common styles
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
CREATE TABLE gamification_data (
  user_id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',  -- All progress data
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Sync behavior (handled by GamifiedProgress):**
1. Sign-in → Check `gamification_data` for cloud data
2. If not migrated → Migrate from legacy `user_data` table
3. Cloud exists → Restore from cloud (priority)
4. No cloud → Upload local progress
5. Ongoing → Debounced sync (2s) on changes

**Migration from legacy system:**
- GamifiedProgress checks `migration_completed` flag
- If false, reads from legacy `user_data` table and transforms data
- Writes to new `gamification_data` table with migration flag set

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
| Progress not saving | Check GamifiedProgressProvider wrapping, network status |
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
- Build number auto-increments on production builds (check `app.json` for current)
- Universal Links via `link.archiveszone.app`

**Android (Play Store):**
- Package: `ai.affinitylabs.archivesexpo`
- Version code auto-increments on production builds (check `app.json` for current)
- Edge-to-edge disabled, largeHeap enabled (Android OOM fixes)
- App Links SHA-256: Must match console fingerprint

**Shared:**
- EAS Project: `4f1f4bc4-0ced-48f3-b712-178b54175088`
- App version: `3.5.0` | Runtime: `1.0.0` | Expo SDK: 54
- iOS buildNumber: `150` | Android versionCode: `45` (auto-incremented on production builds)
- New Architecture: Enabled (React Native 0.81.5, React 19.1.0)

## Important Patterns & Development Context

**Current status:** Branch `3.5.0` | Both platforms LIVE in production
(Check `git log --oneline -10` for recent work and current development focus)

### Recent Development Focus
- **Achievement system enhancements** - Fixed TypeScript errors, improved popup UX (5s display time, dynamic sizing, better image quality)
- **CelebrationManager component** - New centralized UI manager for all celebration types (XP milestones, adventure complete, achievements)
- **iOS/Android gesture management** - Stack navigation gestures disabled globally to prevent swipe back to onboarding, Android back button blocked in tabs
- **Session-based AI chat** - AI conversations now stored in Supabase with session history for follow-up questions
- **Women of Islam era** - Onboarding now routes to new era (Era 2)
- **Account switching fixes** - Progress and achievements properly reset when switching Clerk accounts
- **Gamification folder restructure** - Reorganized into feature-based architecture:
  - `gamification/engines/` - Core contexts (GamifiedProgress, GamificationOrchestrator, AIContext, RewardsContext)
  - `gamification/services/` - AI and game generation services
  - `gamification/ui/` - UI components organized by feature (achievement, ai, celebrations, games)
  - `gamification/index.ts` - Clean public API exports
  - Removed: PuzzleEngagementContext, AIRecommendationCard, PuzzlePromptWrapper, useLevel, useGameDragDrop, useSnapToGrid
- **Unified GamifiedProgress engine** - Consolidated `ProgressContext` + `SimplifiedSyncService` into single `GamifiedProgress.tsx`. All progress and cloud sync through `@/gamification` module.
- **GamificationOrchestrator** - Centralized achievement and celebration system with automatic XP/adventure/streak milestone detection
- **Cloud sync migration** - Migrated from `user_data` table to `gamification_data` table with automatic legacy data migration
- **Unified Supabase-driven era system** - ALL eras come from Supabase (`eras` table + `content` table). Legacy Era 1 initialization removed. System is fully dynamic for future eras.
- **Current content** - Era 1 (Umayyad Dynasty) and Era 2 (Rise of Islam) with 5 adventures each, all content in Supabase
- **PostHog person properties** - User progress tracking via person properties for analytics
- **AI chat improvements** - Correctly shows XP and progress from all eras, monthly quota enforcement
- **Affinity Notification Service** - Push notification delivery via Expo push gateway with per-device permission tracking
- **Gemini AI features** - AI chat modal (`AIChatModal.tsx`), image generation, markdown rendering
- **Generic era architecture** - Reusable lesson components (`ReelLesson`, `ImageCarouselLesson`, etc.) work for all eras
- **Sentry integration** - Error tracking and performance tracing enabled (tracesSampleRate: 1.0)
- **Android OOM fixes** - largeHeap enabled, video source simplified for HLS compatibility

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
- [ ] AsyncStorage only via GamifiedProgress (never direct)
- [ ] Remove build artifacts (`rm -f *.ipa *.apk`)
- [ ] No Claude attribution in commit messages

## Types System

Progress types are available from `@/gamification` (defined in `gamification/types/gamification.ts`):
- `EraType` - LEGACY (Era 1) vs NEW (Era 2+)
- `ModuleState` - LOCKED, LESSON1_AVAILABLE, LESSON1_COMPLETED, etc.
- `ProgressUpdateAction` - LESSON_COMPLETED, QUIZ_COMPLETED, QUIZ_RETAKEN, MODULE_RESET
- `ModuleProgress`, `AdventureProgress` - Core data structures

**Import pattern:**
```typescript
import { EraType, ModuleState, type ModuleProgress } from '@/gamification';
```