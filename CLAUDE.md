# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

**Essential commands for immediate development:**
```bash
npm install                           # Install dependencies
npx expo start                        # Start dev server (i=iOS, a=Android, w=web)
npm run start                         # Alternative: start dev server
npm run lint                          # Run linting (REQUIRED before commits)
npx expo start --clear                # Clear Metro cache (fixes module resolution)
npm run android                       # Run on Android device/emulator
npm run ios                           # Run on iOS simulator/device
npm run web                           # Run on web browser
eas build --platform ios --profile development  # Create development build
eas update --branch [channel]         # Push OTA update to specified channel
```

**First files to understand:**
- `app/_layout.tsx` - Provider hierarchy (PostHog → Clerk → BackgroundSync → Progress)
- `context/ProgressContext.tsx` - Atomic progress tracking (NEVER access AsyncStorage directly)
- `constants/ArchivesTheme.ts` - Design system (ALWAYS use these constants)
- `services/SimplifiedSyncService.ts` - Cloud sync with Supabase JSONB

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
- **Umayyad Dynasty**: Adventures 1-5 (use `atomicProgressUpdate()` in `ProgressContext`)
- **Rise of Islam**: Separate Adventures 1-5 (use `roiAtomicProgressUpdate()` in `ROIProgressContext`)
- Each era has its own progress tracking, unlock logic, and context

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
| `expo-notifications` | Push notifications | Physical device required |
| `rive-react-native` | Animated illustrations | Used for Start Here speech bubble animation |
| `react-native-bottom-tabs` | Native tab bar | Custom iOS-style tabs (not React Navigation tabs) |
| `expo-tracking-transparency` | iOS ATT | Required before PostHog initialization on iOS |

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
6. **Quiz System** - MCQ, True/False, drag-and-drop with sound effects (correct/incorrect/reward)

**Content status:**
- **Umayyad Dynasty**: Complete (5 adventures, 15 modules, 30 lessons, 15 quizzes)
- **Rise of Islam**: Adventure 1 Module 1 complete (rest in development)

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

**🚀 PRODUCTION STATUS: Both iOS and Android are LIVE in production**
- **CRITICAL**: All features, UI changes, and functionality MUST work on BOTH platforms
- Test on both iOS and Android before committing any changes
- Cross-platform compatibility is mandatory - no platform-specific bugs allowed

**iOS:**
- Bundle ID: `ai.affinitylabs.archivesexpo`
- Team ID: `LQ9LP2WW94`
- App Store ID: `6751173663`
- Build number: Auto-increments via EAS (currently 77)
- Status: **LIVE on App Store**
- Requires physical device for: notifications, Apple Sign-In
- Background modes: remote-notification
- Universal Links: Configured via `link.archiveszone.app` (deep linking support)

**Android:**
- Package: `ai.affinitylabs.archivesexpo`
- Version code auto-increments (currently 17)
- Status: **LIVE on Google Play Store**
- Edge-to-edge: Disabled
- App Links: SHA-256 fingerprint in `assetlinks.json` must match Google Play Console

**Cross-platform:**
- EAS Project ID: `4f1f4bc4-0ced-48f3-b712-178b54175088`
- App version: `2.2.7` (from app.json)
- Runtime version: `1.0.0`
- New Architecture: Enabled
- Fonts: DM Sans, Cormorant (loaded in _layout.tsx - MUST load before splash screen hides)
- **Development requirement**: ALL code must be tested on both iOS and Android simulators/devices before deployment

## Current Development Status

**Git branch:** master
**Production Status:** 🚀 **LIVE on App Store and Google Play Store**
**Recent focus:** Universal Links/deep linking, RevenueCat intro offers, quiz sound effects, era selection UI, cross-platform compatibility

**Known limitations:**
- Push notifications require physical device
- Video preloading can be slow initially
- Background sync may delay in poor network

**Development priorities:**
- Maintain cross-platform compatibility (iOS and Android)
- Ensure all features work identically on both platforms
- Test thoroughly on both iOS and Android before deployment

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
**Domain:** `link.archiveszone.app` configured for both iOS and Android

**How it works:**
- User clicks `https://link.archiveszone.app/anything`
- iOS/Android OS intercepts HTTPS link (before browser opens)
- App opens directly with seamless UX (Duolingo-style)
- Expo Router automatically handles routing to correct screen

**iOS Universal Links (Configured):**
- Verification file: `public/.well-known/apple-app-site-association`
- App config: `associatedDomains` in app.json
- Works automatically after app install (~20 min verification)

**Android App Links (Configured):**
- Verification file: `public/.well-known/assetlinks.json`
- App config: `intentFilters` in app.json with `autoVerify: true`
- Native manifest: HTTPS intent filter with `android:autoVerify="true"`
- SHA-256 fingerprint: `DB:00:7D:4D:EB:F5:75:79:D9:73:AD:F7:C1:0E:63:65:BC:B9:3F:72:D2:A2:33:DF:2B:FA:8A:C6:FC:89:29:B3`

**Testing deep links:**
```bash
# Verify files are accessible
curl https://link.archiveszone.app/.well-known/apple-app-site-association
curl https://link.archiveszone.app/.well-known/assetlinks.json

# Check Android verification status
adb shell dumpsys package domain-preferred-apps | grep -A 5 archivesexpo

# Real test: Send link via Messages/WhatsApp/Email and click it
# Expected: App opens directly (no browser)
```

**Troubleshooting:**
- Wait ~20 minutes after app install for verification
- Some apps (Facebook, WhatsApp) block Universal Links for security
- If app not installed → Interstitial page shows with download button
- Android verification issues → Check SHA-256 matches in Google Play Console

### Subscription Intro Offers
RevenueCat integration checks intro offer eligibility (iOS only) and displays "1 MONTH FREE" banner for eligible users dynamically.

## Testing Checklist

Before submitting code:
- [ ] Run `npm run lint` and report any errors to user (don't auto-fix)
- [ ] **CRITICAL: Test on BOTH iOS and Android simulators** (production requirement)
- [ ] **Verify feature works identically on both platforms**
- [ ] Test critical features on physical device (if applicable)
- [ ] Remove build artifacts (`rm -f *.ipa *.apk`)
- [ ] Verify progress persists after app restart
- [ ] Check AsyncStorage usage (must use ProgressContext)
- [ ] Ensure commit messages don't include Claude attribution
- [ ] Verify cross-platform UI consistency (layout, spacing, colors)
- [ ] Test on different screen sizes (iOS and Android)