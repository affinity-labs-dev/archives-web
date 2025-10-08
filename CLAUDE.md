# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

Essential commands for immediate development:
```bash
npm install                           # Install dependencies
npx expo start                        # Start development server (choose platform)
npm run lint                         # Run linting before commits
npx expo start --clear               # Clear Metro cache (use when facing bundling issues)
eas build --platform ios --profile development  # Create development build
```

**Key files to understand first:**
- `app/_layout.tsx` - Root layout with provider hierarchy (PostHog → Clerk → BackgroundSync → Progress)
- `context/ProgressContext.tsx` - Atomic progress tracking with dual-era support
- `constants/ArchivesTheme.ts` - Design system with color palette and component styles
- `components/modules/` - Educational content organized by adventure

## Critical Implementation Rules

**ALWAYS follow these rules:**
- **Run `npm run lint` before every commit** - Uses ESLint flat config (`eslint.config.js`)
- **Never access AsyncStorage directly** - Use ProgressContext methods exclusively
- **Use atomic progress updates** - Call `atomicProgressUpdate()` for all progress changes
- **Follow component naming** - `Adventure{N}_Module{N}_Lesson{N}.tsx` pattern
- **Respect design system** - Use ArchivesTheme constants, never hardcode colors/spacing
- **Platform-specific implementations** - Some components have `.native.tsx` and `.web.tsx` variants

## Commands

### Development Commands
- `npm install` - Install dependencies
- `npx expo start` - Start development server with interactive menu (i=iOS, a=Android, w=web)
- `npx expo start --dev-client` - Start server for custom development client
- `npx expo start --clear` - Clear Metro cache and start (use for bundling/module issues)
- `npm run lint` - Run ESLint code quality checks (expo flat config)
- `npx expo-doctor` - Validate project configuration and dependencies
- `npx react-native log-ios` - View iOS device logs for debugging

### Build Commands
- `eas build --platform ios --profile development` - Create development client build
- `eas build --platform ios --profile preview` - Create preview build for internal testing
- `eas build --platform ios --profile production` - Create production build for App Store
- `eas submit --platform ios` - Submit iOS build to App Store
- `eas update --branch production` - Publish over-the-air update

### EAS Development Client Workflow
1. Build development client: `eas build --profile development --platform ios/android`
2. Install development client on physical device or simulator
3. Start dev server: `npx expo start --dev-client`
4. Test device-specific features: Apple Sign-In, background audio, haptics, video playback

## Project Architecture

### Core Framework Stack
- **Expo SDK 54.0.0** with React Native 0.81.4 and React 19.1.0
- **TypeScript** - Strict mode enabled with path aliases (`@/*` → project root)
- **Expo Router 6.0** - File-based routing with typed routes enabled
- **Clerk 2.14** - Authentication with Apple Sign-In and token caching
- **AsyncStorage** - Local data persistence replacing SwiftUI UserDefaults
- **New Architecture** - React Native's new architecture enabled
- **ESLint** - Flat config (`eslint.config.js`) with expo preset

### Main App Structure
- **Root Layout** (`app/_layout.tsx`) - Provider hierarchy: Clerk → PostHog → Progress → BackgroundSync
- **Tab Navigation** (`app/(tabs)/`) - Main app interface with 5 tabs:
  - `index.tsx` - Home/Dashboard
  - `eras.tsx` - Era selection and navigation
  - `subscribe.tsx` - Subscription/paywall screen
  - `profile.tsx` - User profile and settings
  - `_layout.tsx` - Tab bar configuration with bottom tabs

### Key Architecture Decisions

#### Media Architecture
- **expo-video 3.0** - Modern video playback API for all lesson videos
- **expo-av 16.0** - Background music/audio (used instead of expo-audio due to AWS CloudFront compatibility issues)
- **AWS CloudFront** - CDN for serving video and audio assets

#### Subscription System
- **RevenueCat (react-native-purchases)** - Primary subscription implementation
- **expo-iap** - Installed but not used (RevenueCat is the chosen solution)
- RevenueCat chosen for comprehensive features, analytics, and robust subscription management

### Authentication Architecture
- **Clerk Provider** wraps entire app in root layout
- Apple Sign-In configured (`usesAppleSignIn: true` in app.json)
- Token caching enabled via `@clerk/clerk-expo/token-cache`
- Environment variable required: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- **Auth screens** located in `app/(auth)/` directory:
  - `archives-auth.tsx` - Main authentication screen with sign-in options
  - `email-details.tsx` - Email sign-in flow
  - `forgot-password.tsx` - Password recovery flow
  - `reset-password.tsx` - Password reset completion
  - Authentication UI components: `AppleSignInButton.tsx`, `GoogleSignInButton.tsx`, `AuthToggle.tsx`

### Onboarding System (8-Screen Flow)
The app includes a comprehensive onboarding flow with personalization:

1. **onboarding-video.tsx** - Introduction video
2. **onboarding-video-2.tsx** - Second educational video
3. **onboarding-welcome.tsx** - Welcome screen with feature highlights
4. **onboarding-question-1.tsx** - Learning goals assessment
5. **onboarding-question-2.tsx** - Interest areas selection
6. **onboarding-question-3.tsx** - Learning style preferences
7. **onboarding-question-4.tsx** - Time commitment preferences
8. **onboarding-results.tsx** - Personalized results with era recommendations

**Smart Entry Point Routing (app/index.tsx):**
- **New Users**: Automatically routed to `/onboarding-video` to begin 8-screen journey
- **Returning Users**: Signed in + completed onboarding → Direct to `/(tabs)` main app
- **State Persistence**: Uses AsyncStorage keys `onboarding_completed` and `selected_era`

### State Management (Progress System)

The app uses an atomic progress tracking system that prevents race conditions and ensures data integrity:

```typescript
// Core data structures
interface ModuleProgress {
  adventureId: number
  moduleId: number
  isCompleted: boolean
  lessonsCompleted: string[]  // ["lesson1", "lesson2"]
  quizCompleted: boolean
  quizScore?: number          // 0-5 correct answers
  unlockedAt?: string
}

// Progress update actions (atomic operations)
type ProgressUpdateAction =
  | { type: 'LESSON_COMPLETED'; lessonId: string }
  | { type: 'QUIZ_COMPLETED'; quizScore: number; quizCorrectAnswers: number }
  | { type: 'QUIZ_RETAKEN'; quizScore: number; quizCorrectAnswers: number }
  | { type: 'MODULE_RESET' }
```

**Progress Rules:**
- **Dual-era system**: Umayyad (Adventures 1-5) and Rise of Islam (ROI Adventures 1-5) are independent
- **Sequential unlocking**: Adventure 1 unlocked by default, others unlock when previous adventure completed
- **Module completion**: Requires both lessons completed AND quiz passed (≥2/5 correct, or ≥1 for legacy)
- **Star ratings**: 1-2 correct = 1★, 3-4 = 2★, 5 = 3★
- **Storage keys**: `selected_era`, `adventure_progress`, `module_progress`

**Critical Progress Update Pattern:**
```typescript
// CORRECT: Use atomic update
await atomicProgressUpdate(adventureId, moduleId, {
  type: 'LESSON_COMPLETED',
  lessonId: 'lesson1'
})

// WRONG: Never access AsyncStorage directly
await AsyncStorage.setItem(...)  // ❌ NEVER DO THIS
```

### Background Sync Architecture

Local-first architecture with automatic cloud backup:

```
User Action → atomicProgressUpdate()
    ↓
1. Update AsyncStorage (instant, <50ms)
2. Update React state (instant UI refresh)
3. Trigger background sync (debounced, when online)
    ↓
User sees immediate feedback
Cloud sync happens transparently
```

**Implementation Details:**
- **Service**: `SimplifiedSyncService` with single-table JSONB storage
- **Network monitoring**: `@react-native-community/netinfo` for connectivity detection
- **Offline handling**: Queue-based sync with automatic retry when connection restored
- **Debouncing**: 2-second debounce per operation to prevent excessive syncs
- **Error handling**: Silent failures to avoid disrupting user experience
- **Database**: Supabase with `user_data` table containing JSONB column

### Design System (ArchivesTheme.ts)
**Color Palette:**
- `shoeBrown` (#4D392E) - Primary brand color
- `persianOrange` (#C99151) - Accent color
- `creamWhite` (#F4EBDB) - Background color
- `mutedNavy` (#41425E) - Text/secondary color
- `mossGreen` (#959C00) - Success/accent color

**Typography:** DM Sans font family with consistent weight/size system
**Pre-defined Components:** Cards, buttons, inputs with shadow systems

Always use `ArchivesTheme` constants instead of hardcoded colors/spacing.

### Content Architecture

#### Educational Content Structure
- **Focus**: Islamic history (Umayyad Dynasty era)
- **Structure**: 5 adventures per era, 3 modules per adventure
- **Module Format**: 2 lessons + 1 quiz per module
- **Migration**: Direct SwiftUI-to-React Native port with identical UX patterns

#### Component Architecture Patterns
- **LessonPlayer.tsx**: Full-screen video player with exact SwiftUI control replication
- **QuizSystem.tsx**: Comprehensive quiz engine supporting MCQ, True/False, drag-and-drop
- **ModuleModal.tsx**: Unified modal wrapper for Umayyad Dynasty lesson/quiz content
- **ROIModuleModal.tsx**: Unified modal wrapper for Rise of Islam era content
- **Adventure Components**: Individual lesson/quiz components per adventure (located in `components/modules/adventure{N}/`)
- **Progress Integration**: All components automatically update AsyncStorage via ProgressContext

### Development Conventions

#### File Naming & Organization
- **Screens**: PascalCase (e.g., `UmmayadDynastyEra.tsx`)
- **Components**: PascalCase with descriptive names
- **Adventure Content**: Structured as `Adventure{N}_Module{N}_Lesson{N}.tsx`

#### Code Patterns
- **Haptic Feedback**: `expo-haptics` integration for user interactions
- **Video Playback**: `expo-video` (modern API) with auto-play and loop capabilities
- **Carousel Gesture Handling**: Universal PanGestureHandler with immediate re-enable after card gestures to prevent swipe conflicts
- **State Updates**: Always persist to AsyncStorage through ProgressContext
- **Styling**: Use ArchivesTheme constants, avoid inline styles
- **Font Loading**: Pre-loaded in root layout (SpaceMono, DM Sans, Cormorant)

#### Privacy Compliance
Advanced App Tracking Transparency implementation:
- **useAppTrackingTransparency**: Unified hook handling both iOS and non-iOS platforms
- **Platform-Specific Logic**: iOS requires permission request, other platforms default to granted
- **ConditionalPostHogProvider**: Wrapper component that respects ATT permissions before initialization
- **Privacy-First Approach**: All tracking disabled until explicit user consent on iOS

```typescript
// ConditionalPostHogProvider in app/_layout.tsx
// Only initializes PostHog if user granted tracking permission on iOS
if (Platform.OS === 'ios' && !canTrack) {
  console.log('ATT: Tracking not authorized, PostHog disabled');
  return <>{children}</>;
}
```

#### Key Dependencies Understanding
- **@clerk/clerk-expo**: Authentication with token persistence
- **posthog-react-native**: User analytics and event tracking
- **expo-video**: Modern video playback for educational content
- **expo-av**: Background music (expo-audio has AWS CloudFront compatibility issues)
- **@react-native-async-storage/async-storage**: Progress data persistence
- **react-native-purchases**: RevenueCat subscription management (primary implementation)
- **expo-tracking-transparency**: App Tracking Transparency for iOS compliance

### Environment & Configuration

#### Required Environment Variables

All environment variables configured in `eas.json` for builds. For local development:

1. Copy `.env.example` to `.env`
2. Fill in your actual values (get from service dashboards)
3. Never commit `.env` file (already in `.gitignore`)

**Required variables:**
```bash
# Authentication
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

# Database
EXPO_PUBLIC_SUPABASE_URL=https://...supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Server-side only

# Analytics
EXPO_PUBLIC_POSTHOG_API_KEY=phc_...
EXPO_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com

# Subscriptions
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_...
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=...

# Build configuration
EXPO_NO_CAPABILITY_SYNC=1  # Prevent EAS capability sync issues
```

**Key points:**
- All `EXPO_PUBLIC_*` variables are accessible in client-side code
- `eas.json` contains actual build-time keys (some not in `.env.example`)
- Service role key is for server-side operations only

#### Platform Configuration
- **iOS**: Apple Sign-In enabled, New Architecture enabled, App Tracking Transparency configured, background audio modes
- **Android**: Edge-to-edge enabled, adaptive icon configured, audio permissions
- **TypeScript**: Strict mode enabled with path aliases (`@/*` → project root)

#### Build Configuration
- **App Version**: 2.2.1 (current production version)
- **iOS Build Number**: 49 (auto-increment enabled for production builds)
- **Android Version Code**: 3 (auto-increment enabled for production builds)
- **Expo SDK**: 54.0.0 with React Native 0.81.4
- **Node Version**: 18.18.0 (locked for EAS builds)

### Development Workflow

#### Content Migration Pattern
All educational content follows a strict SwiftUI-to-React Native migration pattern:
1. **Exact Layout Replication**: iOS measurements preserved in constants
2. **Identical User Experience**: Animations, transitions, and interactions match SwiftUI
3. **Progress System Parity**: AsyncStorage replaces UserDefaults with identical data structures
4. **Asset Management**: Direct asset path mapping from SwiftUI asset catalog

#### Best Practices
- **Progress Updates**: Always use ProgressContext methods, never direct AsyncStorage
- **Background Sync**: Automatic sync triggers built into ProgressContext - no manual intervention needed
- **Styling Consistency**: Use ArchivesTheme constants for colors, typography, spacing
- **Component Reusability**: Leverage shared components (QuizSystem, LessonPlayer)

#### Critical Implementation Details
- **Progress System**: Local-first with AsyncStorage as primary data store, automatic cloud sync via ProgressContext
- **Module Unlocking Logic**: Adventure 1 unlocked by default, subsequent adventures unlock when previous adventure completed (all 3 modules)
- **Module Completion**: Requires both lessons completed AND quiz passed (minimum 40% score)
- **Component Architecture**: Adventure components follow `Adventure{N}_Module{N}_Lesson{N}.tsx` naming pattern
- **Era System**: Multi-era support with Rise of Islam era alongside Umayyad Dynasty

### Analytics & Data Integration
- **PostHog Analytics**: Complete user tracking with privacy compliance
  - Platform-specific configuration (iOS: session replay + network telemetry, Android: log capture, Web: basic only)
  - Conditional initialization based on App Tracking Transparency permissions
  - Educational progress tracking: lessons, quizzes, modules completion

- **Background Sync System**: Local-first architecture with cloud backup
  - AsyncStorage remains primary data source for instant performance
  - Automatic background sync to Supabase when online
  - Offline-first design with queue-based sync

- **Supabase Database**: Simplified single-table structure for progress sync
  - `user_data`: Single table with JSONB column containing all user data

### Content Development Guidelines

#### Lesson Implementation Priority
When developing new educational content, follow this priority order:
1. **Video + Reading Lessons** - Core educational format (reference: `Adventure1_Module1_Lesson1.tsx`)
2. **Image Carousel Lessons** - Visual exploration content (reference: `Adventure1_Module2_Lesson1.tsx`)
3. **Scrollable Media View** - Complex storytelling (reference: `Adventure3_Module1_Lesson1.tsx`)
4. **Quiz Implementation** - Always complete after lessons (reference: `Adventure1_Module1_Quiz.tsx`)

#### Specialized Claude Code Agents

The codebase has built-in support for specialized educational content agents:

**Content Creation Agents:**
- **quiz-designer** - Creating quiz components and content validation
- **video-reading-lesson-designer** - Video + Reading lessons (primary lesson type)
- **image-carousel-lesson-designer** - Swipeable image galleries with captions
- **video-carousel-lesson-designer** - Video series with navigation
- **content-orchestrator** - Multi-adventure content creation and coordination
- **task-queue-coordinator** - Complex task dependencies and parallel execution

**When to use these agents:**
- Module/lesson creation requests → Use appropriate lesson designer
- Quiz development → Use quiz-designer
- Multi-adventure content → Use content-orchestrator
- Complex workflows with dependencies → Use task-queue-coordinator

#### Content Architecture Patterns
- **Adventure Structure**: 5 adventures per era, 3 modules per adventure
- **Module Completion**: Both lessons + quiz passed (40% minimum score)
- **Sequential Unlocking**: Adventure 1 → 2 → 3 → 4 → 5
- **Asset Organization**: AWS CloudFront URLs with structured naming patterns

#### Educational Content Development Reference
- **Lesson Types Documentation**: Comprehensive guides in `docs/lesson-types/` (6 files, 5,500+ lines)
- **Best Implementation Examples**: Each lesson type has a reference implementation
- **Content Structure Report**: Complete overview in `docs/LESSON_TYPES_REPORT.md`
- **Component Naming**: Follow `Adventure{N}_Module{N}_Lesson{N}.tsx` pattern

### Current Content Status
- **Umayyad Dynasty Era**: Complete (5 adventures, 15 modules, 29+ lessons, 15+ quizzes)
- **Rise of Islam Era**: In development (Adventure 1 Module 1 implemented)
- All content follows SwiftUI-to-React Native migration pattern
- Components organized in `components/modules/adventure{N}/` directories
- Era-specific screens in `components/eras/` directory

### Common Issues

#### Progress System Issues
- **Progress not syncing**: Check network connectivity and Supabase configuration
- **Quiz/lesson completion not persisting**: Verify ProgressContext is properly wrapped in root layout
- **AsyncStorage errors**: Clear app data or use `npx expo start --clear` for fresh start

#### Build Issues
- **EAS build failures**: Check environment variables in `eas.json` and ensure all API keys are valid
- **iOS build issues**: Verify Apple Sign-In configuration and team ID (L33CVM28SL)
- **Android build issues**: Check package name matches `ai.affinitylabs.archivesexpo`
- **Leftover build artifacts**: Remove any `.ipa` or `.apk` files from project root before committing

### Development Best Practices

#### Code Quality
- **Always run `npm run lint` before commits** - Project uses ESLint flat config (`eslint.config.js`)
- **TypeScript strict mode** - Fix all type errors before committing
- **Component organization** - Keep adventure-specific components in `components/modules/adventure{N}/`
- **Asset management** - Use AWS CloudFront URLs for video/audio, local assets only for icons/images

#### Git Workflow
- **Clean working directory** - Remove build artifacts (`.ipa`, `.apk`, `build-*.ipa`) before commits
- **Meaningful commits** - Follow pattern: `feat:`, `fix:`, `refactor:`, `docs:`
- **Branch strategy** - Main branch is `master` (current branch)
- **Testing before push** - Test on both iOS simulator and physical device when possible

#### Performance Considerations
- **Video preloading** - Use `expo-video` hooks for smooth playback transitions
- **AsyncStorage optimization** - Batch reads/writes when possible, use ProgressContext methods
- **Image optimization** - Use AWS CloudFront for large media assets
- **Bundle size** - Monitor with `npx expo-doctor` to catch dependency bloat

### Lesson Types & Documentation

The codebase includes comprehensive lesson type documentation in `docs/lesson-types/`:

**Available Lesson Types:**
1. **Video + Reading Lesson** (`VideoReadingLesson.md`) - Primary educational format with video and expandable reading cards
2. **Image Carousel Lesson** (`ImageCarouselLesson.md`) - Swipeable image galleries with contextual captions
3. **Video Carousel Lesson** (`VideoCarouselLesson.md`) - Swipeable video series with navigation
4. **Static Image Reading Lesson** (`StaticImageReadingLesson.md`) - Single static image with reading content
5. **Scrollable Media View** (`ScrollableMediaViewLesson.md`) - Complex storytelling with mixed media
6. **Quiz System** (`QuizSystem.md`) - Comprehensive quiz engine (MCQ, True/False, drag-and-drop)

**Documentation Stats:**
- 6 comprehensive guides
- 5,500+ lines of implementation details
- Complete code examples for each lesson type
- Best practice patterns and common pitfalls

**Reference Implementations:**
- Video + Reading: `components/modules/adventure1/Adventure1_Module1_Lesson1.tsx`
- Image Carousel: `components/modules/adventure1/Adventure1_Module2_Lesson1.tsx`
- Quiz: `components/modules/adventure1/Adventure1_Module1_Quiz.tsx`

See `docs/LESSON_TYPES_REPORT.md` for complete overview.

### Custom Hooks

The app includes several custom hooks for common functionality:

#### Core Hooks
- **useProgress** (`context/ProgressContext.tsx`) - Primary hook for all progress tracking operations
- **useSyncIntegration** (`hooks/useSyncIntegration.ts`) - Background sync management with Supabase
- **useAppTrackingTransparency** (`hooks/useAppTrackingTransparency.ts`) - ATT permission handling
- **useRevenueCat** (`hooks/useRevenueCat.ts`) - Subscription state and purchase management

#### Media & Analytics Hooks
- **useBackgroundMusic** (`hooks/useBackgroundMusic.tsx`) - Background audio playback control
- **useAnalytics** (`hooks/useAnalytics.ts`) - PostHog event tracking wrapper
- **useColorScheme** (`hooks/useColorScheme.ts`) - Platform-aware color scheme detection

**Usage Pattern:**
```typescript
import { useProgress } from '@/context/ProgressContext';

function MyComponent() {
  const { atomicProgressUpdate, getModuleProgress } = useProgress();
  // Use progress methods...
}
```

### Debugging & Development Tools

#### Metro Bundler Issues
```bash
npx expo start --clear              # Clear cache for module resolution issues
rm -rf node_modules/.cache          # Nuclear option for severe bundler problems
npx expo start --max-workers 1      # Single worker for easier debugging
```

#### Device Debugging
- **iOS Simulator**: Xcode Console or `npx react-native log-ios`
- **Physical Device**: Shake to access Dev Menu
- **Network Inspection**: Use Flipper or React Native Debugger
- **AsyncStorage**: Install `react-native-async-storage-flipper` for Flipper integration

#### Console Logging Patterns

Codebase uses emoji-prefixed logging for easy filtering:

| Emoji | Meaning | Example |
|-------|---------|---------|
| 🔄 | Progress updates | `console.log('🔄 Syncing progress...')` |
| ✅ | Success | `console.log('✅ Data saved')` |
| ❌ | Errors | `console.error('❌ Save failed:', error)` |
| 🔓 | Unlocking | `console.log('🔓 Adventure unlocked')` |
| 🎉 | Completions | `console.log('🎉 Module completed')` |
| ⚠️ | Warnings | `console.warn('⚠️ Deprecated method')` |

#### Common Issues & Solutions

| Problem | Diagnosis | Solution |
|---------|-----------|----------|
| Progress not persisting | AsyncStorage issue | Check with `await AsyncStorage.getAllKeys()` |
| Video won't play | CloudFront URL issue | Verify URL accessibility in browser |
| Auth broken | Clerk config issue | Check dashboard + verify publishable key |
| Subscription issues | RevenueCat config | Verify API key + check sandbox mode |
| Build artifacts in git | Leftover .ipa files | Remove `build-*.ipa` before commit |
