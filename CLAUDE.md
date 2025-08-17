# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development Commands
- `npm install` - Install dependencies
- `npx expo start` - Start the development server with platform options (QR code, Android, iOS, web)
- `npm run android` or `expo run:android` - Start on Android emulator/device
- `npm run ios` or `expo run:ios` - Start on iOS simulator/device
- `npm run web` or `expo start --web` - Start web version
- `npm run lint` - Run ESLint for code quality checks (uses expo flat config)
- `npm run reset-project` - Reset to blank template (moves current code to app-example)

### Build Commands
- Use Expo CLI commands for building:
  - `npx expo build:ios` - Build for iOS
  - `npx expo build:android` - Build for Android
  - `npx expo run:ios` - Local iOS development builds
  - `npx expo run:android` - Local Android development builds

### Quality Assurance
- Always run `npm run lint` before committing changes
- No testing framework configured - implement tests if needed
- Test on both iOS and Android platforms before major releases

## Project Architecture

### Core Framework Stack
- **Expo 53** (latest) with React Native 0.79.5 and TypeScript
- **Expo Router 5.1** - File-based routing with typed routes enabled
- **Clerk 2.14** - Authentication with Apple Sign-In and token caching
- **AsyncStorage** - Local data persistence replacing SwiftUI UserDefaults
- **New Architecture enabled** - React Native's new architecture for better performance

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
└── ui/              # Reusable UI components (IconSymbol, TabBarBackground)

constants/
├── ArchivesTheme.ts    # Complete design system (colors, typography, spacing)
├── AdventureData.ts    # Adventure content data structures
└── Colors.ts           # Legacy color constants

context/
└── ProgressContext.tsx # Global state management for progress tracking

hooks/
├── useAnalytics.ts        # PostHog analytics integration with educational events
├── useBackgroundMusic.tsx # Audio system for immersive experience
├── useColorScheme.ts      # Theme color scheme handling
└── useThemeColor.ts       # Color theme utilities

services/
└── ProgressService.ts     # Progress data management service

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
- **Video Playback**: `expo-av` with auto-play and loop capabilities
- **State Updates**: Always persist to AsyncStorage through ProgressContext
- **Styling**: Use ArchivesTheme constants, avoid inline styles
- **Font Loading**: Pre-loaded in root layout (SpaceMono, DM Sans, Cormorant)

#### Key Dependencies Understanding
- **@clerk/clerk-expo**: Authentication with token persistence
- **posthog-react-native**: User analytics and event tracking
- **expo-av**: Video/audio playback for educational content
- **expo-haptics**: Tactile feedback for interactions
- **@react-native-async-storage/async-storage**: Progress data persistence
- **expo-router**: File-based navigation with type safety
- **react-native-gesture-handler**: Touch interactions and swipe gestures
- **react-native-reanimated**: Smooth animations matching SwiftUI feel

### Environment & Configuration

#### Required Environment Variables
```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... # Clerk authentication key

# Optional Supabase variables (for future database integration)
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# PostHog Analytics Configuration
EXPO_PUBLIC_POSTHOG_API_KEY=phc_your_api_key_here # PostHog analytics key
EXPO_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com # PostHog host (EU or US)
```

#### Platform Configuration
- **iOS**: Apple Sign-In enabled, New Architecture enabled
- **Android**: Edge-to-edge enabled, adaptive icon configured
- **Web**: Static output with Metro bundler
- **TypeScript**: Strict mode enabled with path aliases (`@/*` → project root)

#### Build Configuration
- **Expo SDK**: 53.0.20 (latest stable)
- **React Native**: 0.79.5 with new architecture
- **Plugins**: expo-router, expo-splash-screen, expo-video
- **Asset Bundling**: All assets included (`"assetBundlePatterns": ["**/*"]`)

### Development Workflow

#### Content Migration Pattern
All educational content follows a strict SwiftUI-to-React Native migration pattern:
1. **Exact Layout Replication**: iOS measurements preserved in constants
2. **Identical User Experience**: Animations, transitions, and interactions match SwiftUI
3. **Progress System Parity**: AsyncStorage replaces UserDefaults with identical data structures
4. **Asset Management**: Direct asset path mapping from SwiftUI asset catalog

#### Best Practices
- **Progress Updates**: Always use ProgressContext methods, never direct AsyncStorage
- **Media Handling**: Video files in `assets/videos/adventures/`, images organized by type
- **Styling Consistency**: Use ArchivesTheme constants for colors, typography, spacing
- **Component Reusability**: Leverage shared components (QuizSystem, LessonPlayer)
- **Performance**: Optimize video loading and implement proper memory management

### Current Content Status
- **Adventure 1**: Complete (Umayyad Dynasty foundation and early expansion)
- **Adventure 2**: Complete (Damascus capital and administrative developments)
- **Adventure 3**: Complete (North African expansion, Kairouan, Iberian conquest, Battle of Tours)
- **Adventures 4-5**: Planned future content (content structure ready, implementation pending)

### Analytics & Data Integration
- **PostHog Analytics**: Complete user tracking and educational event analytics (implemented)
  - User identification via Clerk integration
  - Educational progress tracking (lessons, quizzes, modules)
  - Video/audio engagement metrics
  - Screen navigation and app lifecycle events
  - Error tracking and debugging
- **Supabase Database**: Cross-device progress synchronization (setup guide in `supabase-setup.md`)
- **Background Music**: Audio system for immersive experience (partially implemented via `useBackgroundMusic` hook)

### Future Enhancement Plans
- **Push Notifications**: Course reminders and achievement notifications
- **Advanced Analytics**: Custom PostHog dashboards for educational insights
- **A/B Testing**: PostHog feature flags for content optimization

### Additional Tools & Configuration
- **stagewise.json**: Development tool configuration (port: 3100, appPort: 8081)
- **ESLint**: Flat config format using `eslint-config-expo` with dist directory ignored

### Troubleshooting
- **iOS Simulator Issues**: Use `npx expo run:ios --device` for device testing
- **Metro Cache Issues**: Run `npx expo start --clear` to clear cache
- **Authentication Flow**: Ensure proper Clerk provider wrapping in root layout
- **Video Playback**: Check asset paths and ensure videos are properly bundled