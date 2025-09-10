# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

Essential commands for immediate development:
```bash
npm install                           # Install dependencies
npx expo start                        # Start development server (choose platform)
npm run lint                         # Run linting before commits
eas build --platform ios --profile development  # Create development build
```

**Key files to understand first:**
- `app/_layout.tsx` - Root layout with all providers
- `context/ProgressContext.tsx` - Progress tracking system
- `constants/ArchivesTheme.ts` - Design system
- `components/modules/` - Educational content components

## Commands

### Development Commands
- `npm install` - Install dependencies
- `npx expo start` - Start the development server with platform options (QR code, Android, iOS, web)
- `npx expo start --dev-client` - Start development server for custom development client
- `npx expo start --clear` - Start with Metro cache cleared
- `npm run android` or `expo run:android` - Start on Android emulator/device
- `npm run ios` or `expo run:ios` - Start on iOS simulator/device
- `npm run web` or `expo start --web` - Start web version
- `npm run lint` - Run ESLint for code quality checks (uses expo flat config)
- `npm run reset-project` - Reset to blank template (moves current code to app-example)

### Core Development Workflow
- Always run `npm run lint` before committing changes
- Test on both iOS and Android platforms before major releases
- Use EAS development client workflow for testing device-specific features (Apple Sign-In, audio, haptics)

#### EAS Development Commands
- `eas init` - Initialize EAS in your project
- `eas build:configure` - Configure build profiles
- `eas update` - Publish over-the-air update
- `eas update --branch preview` - Publish update to specific branch
- `eas metadata:push` - Update app store metadata

#### Expo Updates Commands
- `expo updates:configure` - Configure expo-updates in your project
- `expo updates:codesign` - Configure code signing for updates
- `npx expo export` - Export app for hosting static files

### Build Commands

#### Local Development Builds
- `npx expo run:ios` - Local iOS development builds
- `npx expo run:android` - Local Android development builds
- `npx expo start --clear` - Start with cache cleared (troubleshooting)

#### EAS Build Service Commands
- `eas build --platform ios` - Build iOS app using EAS
- `eas build --platform android` - Build Android app using EAS
- `eas build --platform all` - Build for both platforms
- `eas build --profile development` - Create development client build
- `eas build --profile preview` - Create preview build for internal testing
- `eas build --profile production` - Create production build for app stores

#### EAS Submission Commands
- `eas submit --platform ios` - Submit iOS build to App Store
- `eas submit --platform android` - Submit Android build to Google Play

#### Build Profiles (from eas.json)
- **development**: Development client builds with simulator support
- **preview**: Internal testing builds with store distribution
- **production**: Production builds for app store submission with auto-increment

### Quality Assurance
- No testing framework configured - implement tests if needed

#### EAS Development Client Workflow
- Use `eas build --profile development` to create development client
- Install development client on physical device for testing
- Use `npx expo start --dev-client` to connect to development build
- Test with real device hardware (camera, audio, haptics, etc.)
- Validate authentication flows with actual Apple Sign-In
- Test background sync functionality with real network conditions

## Project Architecture

### Core Framework Stack
- **Expo 53** (latest) with React Native 0.79.5 and TypeScript
- **Expo Router 5.1** - File-based routing with typed routes enabled
- **Clerk 2.14** - Authentication with Apple Sign-In and token caching
- **AsyncStorage** - Local data persistence replacing SwiftUI UserDefaults
- **New Architecture enabled** - React Native's new architecture for better performance

### Media Architecture
- **expo-video** - All video playbook functionality (see EXPO_VIDEO_DOCUMENTATION.md)
- **expo-av** - Background audio/music (fallback due to expo-audio AWS CloudFront compatibility issues)
- **AWS CloudFront** - Media asset delivery for videos and audio files

### Application Structure
```
app/
├── (auth)/           # Authentication route group (sign-in, sign-up, archives-auth)
├── (tabs)/           # Main tab navigation (index, eras, subscribe, profile)
├── _layout.tsx       # Root layout with providers (Clerk, Progress, Theme)
├── landing.tsx       # Onboarding/welcome screen
└── era-selection.tsx # Era selection interface

components/
├── modules/          # Lesson/quiz content (adventure1/, adventure2/, adventure3/)
│   ├── QuizSystem.tsx       # Shared quiz component (MCQ, True/False)
│   ├── LessonPlayer.tsx     # Video player component
│   └── ModuleModal.tsx      # Modal wrapper for lessons
├── eras/            # Era-specific UI (UmmayadDynastyEra.tsx, ComingSoonView.tsx)
├── adventures/      # Adventure detail components (AdventureDetailModal.tsx)
├── icons/           # Custom icon components for navigation (Adventure1Icon, HomeIcon, etc.)
├── ui/              # Reusable UI components (IconSymbol, TabBarBackground)
└── SyncDebugPanel.tsx # Debug panel for sync status monitoring

constants/
├── ArchivesTheme.ts    # Complete design system (colors, typography, spacing)
├── AdventureData.ts    # Adventure content data structures
└── Colors.ts           # Legacy color constants

context/
├── ProgressContext.tsx        # Global state management for progress tracking
└── BackgroundSyncProvider.tsx # Background sync context provider

hooks/
├── useAnalytics.ts                  # PostHog analytics integration with educational events
├── useBackgroundMusic.tsx           # Audio system for immersive experience
├── useColorScheme.ts                # Theme color scheme handling
├── useThemeColor.ts                 # Color theme utilities
├── useSyncIntegration.ts            # Sync integration hooks with debouncing
└── useAppTrackingTransparency.ts    # iOS App Tracking Transparency hook for privacy compliance

services/
├── ProgressService.ts         # Progress data management service
├── BackgroundSyncService.ts   # Original multi-table sync service
└── SimplifiedSyncService.ts   # New single-table JSONB sync service

lib/
└── supabase.ts           # Supabase client configuration
```

### Core Architecture Patterns

#### Authentication Architecture
- **Clerk Provider** wraps entire app in root layout
- Apple Sign-In configured (`usesAppleSignIn: true` in app.json)
- Token caching enabled via `@clerk/clerk-expo/token-cache`
- Authentication screens in `(auth)` route group with stack navigation
- Environment variable required: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`

#### Navigation & Routing
- **File-based routing** with Expo Router (typed routes enabled)
- **Tab navigation** for main app sections (Home, Eras, Subscribe, Profile)
- **Stack navigation** for authentication flows and modal presentations
- **Route groups**: `(auth)` and `(tabs)` for organizational structure

#### State Management (Progress System)
The app uses a comprehensive progress tracking system that replicates SwiftUI UserDefaults behavior:

```typescript
// Core data structures
interface ModuleProgress {
  adventureId: number
  moduleId: number
  isCompleted: boolean
  lessonsCompleted: string[]  // ["lesson1", "lesson2"]
  quizCompleted: boolean
  quizScore?: number
  unlockedAt?: string
}

interface AdventureProgress {
  adventureId: number
  isUnlocked: boolean
  modulesCompleted: number
  totalModules: number
  unlockedAt?: string
}
```

**Progress Logic**:
- Adventure 1 unlocked by default
- Sequential unlocking: Adventure 1 → Adventure 2 → Adventure 3
- Module completion requires: both lessons completed + quiz passed (40% minimum)
- AsyncStorage persistence with keys: `selected_era`, `adventure_progress`, `module_progress`

#### Design System (ArchivesTheme.ts)
**Color Palette**:
- `shoeBrown` (#4D392E) - Primary brand color
- `persianOrange` (#C99151) - Accent color
- `creamWhite` (#F4EBDB) - Background color
- `mutedNavy` (#41425E) - Text/secondary color
- `mossGreen` (#959C00) - Success/accent color

**Typography**: DM Sans font family with consistent weight/size system
**Pre-defined Components**: Cards, buttons, inputs with shadow systems

### Content Architecture

#### Educational Content Structure
- **Focus**: Islamic history (Umayyad Dynasty era)
- **Structure**: 5 adventures per era, 3 modules per adventure
- **Module Format**: 2 lessons + 1 quiz per module
- **Migration**: Direct SwiftUI-to-React Native port with identical UX patterns

#### Media Asset Organization
```
assets/
├── fonts/                    # SpaceMono, DM Sans, Cormorant (pre-loaded in root layout)
├── videos/adventures/        # Lesson video content (.mp4 files)
├── images/
│   ├── adventure-backgrounds/ # Era/adventure background images
│   ├── avatars/              # Historical figure portraits
│   ├── badges/               # XP rewards and achievement badges
│   ├── icons/                # UI icons and adventure icons
│   ├── lesson-content/       # Inline lesson illustrations
│   └── quiz-images/          # Quiz question images
└── audio/                    # Audio content (placeholder structure)
```

#### Component Architecture Patterns
- **LessonPlayer.tsx**: Full-screen video player with exact SwiftUI control replication
- **QuizSystem.tsx**: Comprehensive quiz engine supporting MCQ, True/False, drag-and-drop
- **Adventure Components**: Individual lesson/quiz components per adventure (adventure1/, adventure2/, adventure3/)
- **Progress Integration**: All components automatically update AsyncStorage via ProgressContext

### Development Conventions

#### File Naming & Organization
- **Screens**: PascalCase (e.g., `UmmayadDynastyEra.tsx`)
- **Components**: PascalCase with descriptive names
- **Adventure Content**: Structured as `Adventure{N}_Module{N}_Lesson{N}.tsx`
- **Assets**: Descriptive names matching SwiftUI asset catalog

#### Code Patterns
- **Haptic Feedback**: `expo-haptics` integration for user interactions
- **Video Playback**: `expo-video` (modern API) with auto-play and loop capabilities
- **State Updates**: Always persist to AsyncStorage through ProgressContext
- **Styling**: Use ArchivesTheme constants, avoid inline styles
- **Font Loading**: Pre-loaded in root layout (SpaceMono, DM Sans, Cormorant)
- **Privacy Compliance**: App Tracking Transparency handled via `useAppTrackingTransparency` hook with platform-specific implementations (.native.ts, .web.ts)
- **Analytics**: PostHog integration respects ATT permissions with conditional initialization
- **Payment Processing**: Platform-specific Stripe integration (native vs web implementations)

#### Key Dependencies Understanding
- **@clerk/clerk-expo**: Authentication with token persistence
- **posthog-react-native**: User analytics and event tracking
- **expo-video**: Modern video playback for educational content (migrated from expo-av)
- **expo-audio**: Modern audio playback for background music and effects
- **expo-av**: Still used for background music (expo-audio has AWS CloudFront compatibility issues)
- **expo-haptics**: Tactile feedback for interactions
- **@react-native-async-storage/async-storage**: Progress data persistence
- **expo-router**: File-based navigation with type safety
- **react-native-gesture-handler**: Touch interactions and swipe gestures
- **react-native-reanimated**: Smooth animations matching SwiftUI feel
- **@react-native-community/netinfo**: Network connectivity monitoring for sync system
- **expo-tracking-transparency**: App Tracking Transparency for iOS compliance with educational analytics tracking
- **@stripe/stripe-react-native**: Payment processing for subscription system (native platforms)
- **@stripe/stripe-js**: Web-based payment processing (web platform)

### Environment & Configuration

#### Required Environment Variables
Environment variables are configured in `eas.json` for EAS builds and should be set in your local `.env` file for development:

```bash
# Clerk Authentication (Required)
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_d2VsY29tZWQtZmxlYS05OS5jbGVyay5hY2NvdW50cy5kZXYk

# Supabase Database (Required for sync functionality)
EXPO_PUBLIC_SUPABASE_URL=https://kcgihainlnntshupiztu.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# PostHog Analytics (Required)
EXPO_PUBLIC_POSTHOG_API_KEY=phc_7tSzdXUrEZ1OEEsgeJcpvQHdgt3XT6AdXnmvmpUbCMI
EXPO_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com

# Stripe Payment Processing (Required for subscription features)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51RYXaRP4ORdFWUKehx2oAmyOUS2h8FbZZEIu8I8F3wzY74iya6MDkCQedtIGdNGdYHDdJ9UG3WUWylNOeMNVOusl00sEjEVr7G

# EAS Build Configuration
EXPO_NO_CAPABILITY_SYNC=1 # Disables automatic capability sync for iOS builds
```

**Note**: Environment variables are automatically injected during EAS builds from the `eas.json` configuration. For local development, create a `.env` file in the project root with these values.

#### Platform Configuration
- **iOS**: Apple Sign-In enabled, New Architecture enabled, App Tracking Transparency configured
- **Android**: Edge-to-edge enabled, adaptive icon configured, audio permissions for immersive experience
- **Web**: Static output with Metro bundler, session replay disabled for compatibility
- **TypeScript**: Strict mode enabled with path aliases (`@/*` → project root)

#### Build Configuration
- **Expo SDK**: 53.0.20 (latest stable)
- **React Native**: 0.79.5 with new architecture enabled
- **React**: 19.0.0 (latest major version)
- **Plugins**: expo-router, expo-splash-screen, expo-video, expo-audio, expo-localization, expo-tracking-transparency
- **Asset Bundling**: All assets included (`"assetBundlePatterns": ["**/*"]`)
- **Updates**: Expo Updates configured with runtime version 1.0.0
- **EAS Project ID**: 4f1f4bc4-0ced-48f3-b712-178b54175088

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
- **Media Handling**: Video files in `assets/videos/adventures/`, images organized by type
- **Styling Consistency**: Use ArchivesTheme constants for colors, typography, spacing
- **Component Reusability**: Leverage shared components (QuizSystem, LessonPlayer)
- **Performance**: Optimize video loading and implement proper memory management

#### Background Sync Architecture
The app implements a dual sync system with local-first architecture:

```
User Action (complete lesson) 
    ↓
ProgressContext.completeLesson() 
    ↓
1. Update AsyncStorage (instant)
2. Update React state (instant UI update)
3. Trigger background sync to Supabase (when online, debounced)
    ↓
User sees immediate progress update
Background sync happens transparently
```

**Sync System Evolution:**
- **BackgroundSyncService**: Original multi-table sync (3 tables: user_preferences, adventure_progress, user_progress)
- **SimplifiedSyncService**: New single-table JSONB approach (1 table: user_data with JSONB column)
- **BackgroundSyncProvider**: React context managing sync state and user authentication
- **useSyncIntegration**: Debounced hooks for automatic sync triggers (2-second debounce per operation)

**Current Implementation:**
- Uses `SimplifiedSyncService` for cleaner single-table JSONB storage
- Network connectivity monitoring with NetInfo
- Queue-based sync for offline scenarios
- Debounced sync triggers to prevent excessive API calls
- Silent error handling to avoid disrupting user experience

### Current Content Status
- **Adventure 1**: Complete - 3 modules, 6 lessons, 3 quizzes (Umayyad Dynasty foundation and early expansion)
- **Adventure 2**: Complete - 3 modules, 6 lessons, 3 quizzes (Damascus capital and administrative developments) 
- **Adventure 3**: Complete - 3 modules, 6 lessons, 3 quizzes (North African expansion, Kairouan, Iberian conquest, Battle of Tours)
- **Adventures 4-5**: Planned future content (content structure ready, implementation pending)

### Critical Implementation Details
- **Progress System**: Local-first with AsyncStorage as primary data store, automatic cloud sync via ProgressContext
- **Module Unlocking Logic**: Adventure 1 unlocked by default, subsequent adventures unlock when previous adventure completed (all 3 modules)
- **Module Completion**: Requires both lessons completed AND quiz passed (minimum 40% score)
- **Asset Organization**: Videos in `assets/videos/adventures/`, images categorized by type in `assets/images/`
- **Component Architecture**: Adventure components follow `Adventure{N}_Module{N}_Lesson{N}.tsx` naming pattern

### Analytics & Data Integration
- **PostHog Analytics**: Complete user tracking and educational event analytics (implemented)
  - User identification via Clerk integration
  - Educational progress tracking (lessons, quizzes, modules)
  - Video/audio engagement metrics
  - Screen navigation and app lifecycle events
  - Error tracking and debugging
  - Session replay for user experience insights
- **Background Sync System**: Local-first architecture with cloud backup (implemented)
  - AsyncStorage remains primary data source for instant performance
  - Automatic background sync to Supabase when online
  - Cross-device progress synchronization
  - Offline-first design with queue-based sync when connectivity restored
  - Zero impact on app performance or user experience
- **Supabase Database**: Simplified single-table structure for progress sync
  - `user_data`: Single table with JSONB column containing all user data (selectedEra, adventures, modules)
  - Legacy three-table structure available in BackgroundSyncService for reference
- **Background Music**: Audio system for immersive experience (partially implemented via `useBackgroundMusic` hook)
- **Subscription System**: Platform-aware payment processing
  - Native platforms: Stripe React Native with Apple Pay support
  - Web platform: Stripe Checkout Sessions (implementation in progress)
  - Platform-specific components: `SubscribeContent.web.tsx` for web-specific UI

### Future Enhancement Plans
- **Push Notifications**: Course reminders and achievement notifications
- **Advanced Analytics**: Custom PostHog dashboards for educational insights
- **A/B Testing**: PostHog feature flags for content optimization

## Deployment Workflow

### Pre-Deployment Checklist
1. **Code Quality**
   - Run `npm run lint` and fix all issues
   - Test on both iOS and Android platforms
   - Verify all environment variables are correctly configured in `eas.json`

2. **Build Configuration**
   - Update `app.json` version and build numbers as needed
   - Ensure iOS `buildNumber` and Android `versionCode` are incremented
   - Verify app icons and splash screens are properly configured

3. **Content Verification**
   - Test all educational content (lessons, quizzes, videos)
   - Verify AWS CloudFront assets are accessible
   - Test authentication flows with Apple Sign-In
   - Validate background sync functionality

### Production Deployment Process

#### 1. Create Production Build
```bash
# Build for both platforms
eas build --platform all --profile production

# Or build individually
eas build --platform ios --profile production
eas build --platform android --profile production
```

#### 2. App Store Submission (iOS)
```bash
# Submit to App Store Connect
eas submit --platform ios

# Or manually upload .ipa file to App Store Connect
# https://appstoreconnect.apple.com/
```

**iOS App Store Configuration:**
- **Apple ID**: sunnypanchal99@icloud.com
- **App Store Connect App ID**: 6751173663
- **Apple Team ID**: L33CVM28SL
- **SKU**: ARCHIVES-EXPO-2025
- **Bundle Identifier**: ai.affinitylabs.archivesexpo

#### 3. Google Play Submission (Android)
```bash
# Submit to Google Play Console
eas submit --platform android
```

#### 4. Over-the-Air Updates
For non-native code changes (JavaScript, assets):
```bash
# Publish update to production channel
eas update --branch production --message "Update description"

# Publish update to preview for testing
eas update --branch preview --message "Preview update"
```

### Development Deployment (Internal Testing)

#### 1. Development Client Builds
```bash
# Create development client
eas build --platform ios --profile development
eas build --platform android --profile development
```

#### 2. Preview Builds (Internal Distribution)
```bash
# Create preview build for internal testing
eas build --platform all --profile preview
```

### Version Management
- **Production builds**: Use auto-increment for iOS `buildNumber`
- **Runtime version**: Set to `1.0.0` in `app.json` for expo-updates compatibility
- **Update branches**: Use `production` for live app, `preview` for testing

### Additional Tools & Configuration
- **stagewise.json**: Development tool configuration (port: 3100, appPort: 8081)
- **ESLint**: Flat config format using `eslint-config-expo` with dist directory ignored
- **EAS CLI**: Required for all build and submission operations (`npm install -g @expo/eas-cli`)

#### Development & Debugging Tools
- **SyncDebugPanel**: Built-in component for monitoring background sync status (import from `components/SyncDebugPanel`)
- **PostHog Dashboard**: Analytics tracking for user behavior and educational engagement
- **Flipper Integration**: Can be enabled for React Native debugging (network requests, AsyncStorage)
- **React Native Debugger**: Useful for state management and component inspection
- **Expo Dev Tools**: Access via `npx expo start` - provides logs, performance metrics

### Troubleshooting

#### Common Development Issues
- **iOS Simulator Issues**: Use `npx expo run:ios --device` for device testing
- **Metro Cache Issues**: Run `npx expo start --clear` to clear cache
- **Authentication Flow**: Ensure proper Clerk provider wrapping in root layout
- **Video Playback**: Check asset paths and ensure videos are properly bundled

#### Progress System Issues
- **Progress not syncing**: Check network connectivity and Supabase configuration
- **AsyncStorage errors**: Clear app data or use `expo r --clear` for fresh start
- **Quiz/lesson completion not persisting**: Verify ProgressContext is properly wrapped in root layout

#### Build Issues
- **EAS build failures**: Check environment variables in `eas.json` and ensure Clerk/Supabase keys are valid
- **iOS build issues**: Verify Apple Sign-In configuration and team ID
- **Asset bundling errors**: Ensure all referenced assets exist in `assets/` directory