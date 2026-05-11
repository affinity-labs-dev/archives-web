# Archives Expo — Engineer Handover Documentation

> **Last updated:** February 2026
> **Production branch:** `3.5.0`
> **App version:** 3.5.5 | iOS buildNumber: 169 | Android versionCode: 51
> **Both iOS and Android are LIVE in production with real users.**

---

## Table of Contents

1. [Local Dev Setup & First Run](#1-local-dev-setup--first-run)
2. [Architecture Mental Model](#2-architecture-mental-model)
3. [The "Never Do This" List](#3-the-never-do-this-list)
4. [Content System](#4-content-system)
5. [Build & Release Process](#5-build--release-process)
6. [Third-Party Services Map](#6-third-party-services-map)
7. [Testing Expectations](#7-testing-expectations)
8. [Key Code Paths to Study First](#8-key-code-paths-to-study-first)
9. [Known Gotchas](#9-known-gotchas)
10. [MCP Servers (Claude Code Tooling)](#10-mcp-servers-claude-code-tooling)

---

## 1. Local Dev Setup & First Run

### Prerequisites

- **Node 20.19.4** (exact version — locked in `eas.json`, use `nvm` to manage)
- **npm 10.x**
- **EAS CLI** — `npm install -g eas-cli` (version >= 0.34.0)
- **Xcode** (for iOS simulator) + **Android Studio** (for Android emulator)
- Apple Developer account access (Team ID: `LQ9LP2WW94`)
- Google Play Console access

### Steps

1. Clone the repo, checkout branch `3.5.0` (production branch)
2. `npm install`
3. Create `.env` file in root with the required keys (**shared separately** — do NOT commit this file)
4. `npx expo start` — press `i` for iOS, `a` for Android
5. For native builds: `eas build --platform ios --profile development`

### Required env vars (values provided separately)

- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_POSTHOG_API_KEY`
- `EXPO_PUBLIC_POSTHOG_HOST`
- `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
- `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`
- `EXPO_PUBLIC_GEMINI_API_KEY`
- `EXPO_PUBLIC_AFFINITY_API_URL`
- `EXPO_PUBLIC_AFFINITY_API_KEY`
- `EXPO_PUBLIC_AFFINITY_APP_ID`
- `SENTRY_AUTH_TOKEN`

### What requires a physical device (won't work on simulator)

- Push notifications
- Apple Sign-In
- Subscription flows (RevenueCat)
- Haptic feedback
- Background audio (limited on simulator)

---

## 2. Architecture Mental Model

### Provider Hierarchy

The app is built around a deeply nested provider hierarchy in `app/_layout.tsx`. **The order matters** — each layer depends on the one above it.

```
Sentry.wrap(RootLayout)
  └── SafeAreaProvider + GestureHandlerRootView
      └── PostHogProvider (analytics — must init before user actions)
          └── ClerkProvider (authentication — user identity)
              └── AnalyticsWrapper (ties PostHog + Clerk together, also inits RevenueCat, Sentry user, Affinity, push tokens)
                  └── GamificationWrapper (empty — reserved for future)
                      └── AdventuresContentProvider (fetches eras + content from Supabase)
                          └── RewardsProvider (badges + avatars)
                              └── GamifiedProgressProvider (progress + cloud sync)
                                  └── PreferencesProvider (user prefs)
                                      └── GamificationOrchestratorProvider (celebrations, achievements, streaks)
                                          └── AIProvider (Gemini AI chat)
                                              └── ThemeProvider + Stack Navigation + AIAssistant
```

### Why this order is critical

1. **PostHog before Clerk** — analytics must be ready to track auth events
2. **Clerk before AnalyticsWrapper** — AnalyticsWrapper needs `useUser()` to identify across PostHog, RevenueCat, Sentry, and Affinity
3. **AdventuresContent before GamifiedProgress** — progress depends on knowing what content exists
4. **Rewards before GamifiedProgress** — badge/avatar unlocks are triggered from progress updates
5. **GamifiedProgress before Orchestrator** — orchestrator reads progress data to detect milestones

### Core data flow — "Local-First with Transparent Sync"

```
User Action → Update local state (instant) → Show UI → Sync to Supabase (async, debounced 2s)
```

The app always feels instant because it never waits for network. Cloud sync is a background operation.

### Two progress systems coexist

- **Legacy Era 1** (`moduleProgress` array) — original Umayyad Dynasty data, maintained for backward compatibility
- **New Era 2+** (`newProgress` array) — all new eras use this, stores `era_id`, `adventureId`, `moduleId`
- Both feed into the same cloud sync table (`gamification_data` in Supabase)

### Key architectural pattern — "Components report, Orchestrator decides"

- Quiz components call `reportQuizComplete()` with raw data
- GamificationOrchestrator handles ALL celebration logic: XP milestones, adventure completion, streak milestones, achievement unlocks
- Components never decide when to show celebrations

---

## 3. The "Never Do This" List

These are landmines that will cause real bugs or broken builds.

### Code

- **Never use `AsyncStorage` directly for progress** — always go through `atomicProgressUpdate()` or `saveNewProgressData()` from `@/gamification`. Direct AsyncStorage writes bypass cloud sync and cause data loss on account switch.
- **Never hardcode colors** — always use `ArchivesTheme.colors.xxx`. Hardcoded hex values make the app inconsistent and impossible to theme.
- **Never use straight quotes in JSX text** — `'` or `"` triggers `react/no-unescaped-entities` lint errors. Use curly quotes or escape them.
- **Never use `expo-av` for video** — use `expo-video` (modern API). `expo-av` is only used for background music because `expo-audio` has CloudFront compatibility issues.
- **Never add new providers without understanding the hierarchy** — wrong ordering causes hooks to fail silently or crash.

### Git

- **Never force push to `3.5.0`** — this is the production branch with live users on both platforms.
- **Never commit `.env`, credentials, or API keys** — keys are in `eas.json` for builds but `.env` is local only.
- **Never commit build artifacts** — run `rm -f *.ipa *.apk build-*.ipa` before committing.
- **Never skip lint** — `npm run lint` is mandatory before every commit.

### Testing

- **Never ship without testing both iOS AND Android** — both platforms are live in production. UI that works on iOS can break on Android (and vice versa).
- **Never test push notifications on simulator** — physical device required.
- **Never assume a Supabase column is used just because it exists** — always trace the full data path: Supabase → Hook → Component → Render.

---

## 4. Content System

All content is **Supabase-driven** — nothing is hardcoded in the app.

### Supabase tables

| Table | Purpose |
|-------|---------|
| `eras` | Era definitions (e.g., "Umayyad Dynasty", "Rise of Islam") |
| `content` | Adventures, modules, lessons — fetched via `AdventuresContentProvider` |
| `daily_content` | Today tab daily stories (1 per day, with WATCH/EXPLORE/QUESTIONS cards) |
| `user_daily_quest_progress` | Per-user completion tracking for daily stories |
| `gamification_data` | All user progress, streaks, XP — single JSONB column per user |

### Content hierarchy

```
Era (e.g., "Umayyad Dynasty")
  └── Adventure (e.g., "The Golden Age") — has card_content for display
      └── Module (= ContentItem in content_list array)
          ├── Lessons (1 or more, count = media_url.length)
          └── Quiz (5 questions, built into questions array)
```

### Key type: ContentItem (`components/shared/types.ts`)

- `content_type` determines which lesson component renders it
- `media_url` is always an array (even for single videos)
- `bottom_content.reading_text` is HTML (supports h1-h6, p, strong, em, etc.)
- `questions` array holds the quiz for that module

### 4 lesson types

| Type | Component | When to use |
|------|-----------|-------------|
| `reel` | `ReelLesson.tsx` | Single video + reading card (most common) |
| `video_carousel` | `VideoCarouselLesson.tsx` | Multiple videos with captions |
| `image_carousel` | `ImageCarouselLesson.tsx` | Swipeable image gallery with background music |
| `scrollable_media_view` | `ScrollableMediaViewLesson.tsx` | Mixed media (text, images, videos interleaved via `content_blocks`) |

**Best reference file:** `components/lessons/ReelLesson.tsx` — it has everything: video player, expandable reading card, gesture handling, progress tracking, walkthrough hints.

### Module completion logic

- Complete ALL lessons (number of lessons = `media_url.length`) + pass the quiz (>= 2/5 correct)
- Star ratings: 1-2 correct = 1 star, 3-4 = 2 stars, 5 = 3 stars
- XP: each correct answer = 10 XP

### Unlock chain

- Adventure 1 is unlocked by default
- Complete all modules in Adventure 1 → Adventure 2 unlocks automatically
- Same pattern continues for all adventures in an era

### Today tab (Daily Story)

- Separate system from eras — content comes from `daily_content` table
- 3 sequential cards: WATCH (video) → EXPLORE (scrollable reading) → QUESTIONS (quiz)
- Each must be completed in order (sequential unlock)
- Progress saved to `user_daily_quest_progress` in Supabase
- Supports historical viewing (past dates) — gated behind subscription for non-subscribers

### Content caching

- `AdventuresContentProvider` uses cache-first pattern (AsyncStorage → Supabase fallback)
- Real-time Supabase subscription auto-refreshes when content is updated in the database
- `daily_content` table also has real-time subscription for live content updates

---

## 5. Build & Release Process

### Build profiles (defined in `eas.json`)

| Profile | Purpose | iOS Output | Android Output | Distribution |
|---------|---------|------------|----------------|-------------|
| `development` | Dev client with debug menu | Simulator build | APK | Internal |
| `development-device` | Dev client for physical iOS | Device build | — | Internal |
| `preview` | Internal testing | Simulator build | APK | Internal |
| `production` | App Store / Play Store | IPA (store) | AAB (app-bundle) | Store |

All profiles extend `base` which contains all env vars and locks Node to `20.19.4`.

### Common build commands

```bash
# Dev build (simulator)
eas build --platform ios --profile development
eas build --platform android --profile development

# Dev build for physical iOS device (push notifs, Sign-In, etc.)
eas build --platform ios --profile development-device

# Preview build (internal testing)
eas build --platform ios --profile preview
eas build --platform android --profile preview

# Production build (auto-increments buildNumber / versionCode)
eas build --platform ios --profile production
eas build --platform android --profile production

# Submit to App Store
eas submit --platform ios

# Check build status
eas build:list --limit 10
```

### OTA updates (no native rebuild needed)

The app uses `expo-updates` with `appVersion` runtime policy — OTA updates are delivered to builds matching the same `expo.version` in `app.json`. The `useOTAUpdates` hook in `hooks/useOTAUpdates.ts` handles auto-checking on foreground, downloading, and prompting users to restart via a native Alert.

**Important:** Do NOT use `--platform all` — web export fails due to native-only imports. Always publish iOS and Android separately.

```bash
# Publish to production (both platforms)
eas update --branch production --platform ios --message "Description of changes"
eas update --branch production --platform android --message "Description of changes"

# Publish to preview first (internal testing only)
eas update --branch preview --platform ios --message "Testing: description"
eas update --branch preview --platform android --message "Testing: description"

# Staged rollout to 10% of production users
eas update --branch production --platform ios --rollout-percentage 10 --message "Staged: description"
eas update --branch production --platform android --rollout-percentage 10 --message "Staged: description"

# Increase rollout percentage
eas update:edit --rollout-percentage 50
eas update:edit --rollout-percentage 100

# Rollback — republish previous known-good update
eas update:republish --branch production

# List recent updates
eas update:list
```

**Recommended workflow:** Push to `preview` first → test on preview builds → push to `production` with staged rollout → monitor Sentry + PostHog → expand to 100%.

OTA works for JS/asset changes only. If you change `app.json`, native modules, or add/remove dependencies, you need a full native build.

### Version management

- `app.json` → `version` (user-facing, e.g., "3.5.5")
- `app.json` → `ios.buildNumber` (currently "169") — auto-incremented on production builds
- `app.json` → `android.versionCode` (currently 51) — auto-incremented on production builds
- When bumping version manually, update all three

### App Store submission details

- Apple ID: `sunnypanchal99@icloud.com`
- ASC App ID: `6751173663`
- Apple Team ID: `LQ9LP2WW94`
- SKU: `ARCHIVES-EXPO-2025`

### Important notes

- Production branch is `3.5.0` — all releases go from here
- Always clean build artifacts before committing: `rm -f *.ipa *.apk build-*.ipa`
- Each build profile has its own update channel (`development`, `preview`, `production`) — OTA updates only reach devices on the matching channel

---

## 6. Third-Party Services Map

| Service | Purpose | Dashboard | Key Files |
|---------|---------|-----------|-----------|
| **Clerk** | Authentication (Apple Sign-In, email) | [clerk.com](https://clerk.com) | `app/_layout.tsx`, `app/(auth)/` |
| **Supabase** | Database, cloud sync, real-time subscriptions | [supabase.com](https://supabase.com) | `hooks/lib/supabase.ts`, `gamification/engines/GamifiedProgress.tsx` |
| **RevenueCat** | Subscriptions & paywall | [app.revenuecat.com](https://app.revenuecat.com) | `hooks/useRevenueCat.ts`, `components/SubscribeContent.native.tsx` |
| **PostHog** | Analytics, session replay, person properties | [eu.posthog.com](https://eu.posthog.com) | `services/AnalyticsService.ts`, `hooks/useDailyStoryTracking.ts` |
| **Affinity Notifications** | Push notification delivery | Self-hosted | `services/AffinityNotificationService.ts`, `services/PushNotificationService.ts` |
| **Sentry** | Error tracking, performance tracing, session replay | [sentry.io](https://sentry.io) (org: affinity-labs-0i) | `app/_layout.tsx` (init at top) |
| **Gemini (Google AI)** | AI chat, image generation | [Google AI Studio](https://aistudio.google.com) | `gamification/services/AIService.ts`, `gamification/ui/ai/AIChatModal.tsx` |
| **ImageKit** | Media CDN for lesson images/videos | [imagekit.io](https://imagekit.io) | URLs stored in Supabase, no client-side SDK |
| **EAS (Expo)** | Builds, OTA updates, submissions | [expo.dev](https://expo.dev) | `eas.json`, `app.json` |

### How they connect in the app lifecycle

1. App launches → **Sentry** init (global scope, before anything renders)
2. Fonts load → **PostHog** provider wraps everything (conditional on iOS ATT permission)
3. **Clerk** authenticates → triggers identify calls to PostHog, RevenueCat, Sentry, and Affinity
4. **Supabase** fetches content + syncs progress
5. **Affinity** registers devices and handles push delivery via Expo gateway
6. **RevenueCat** checks subscription status (gates historical daily stories + future premium features)
7. **Gemini** powers AI chat when user opens the assistant

### Key gotchas per service

- **PostHog**: EU region (`eu.posthog.com`), conditional init on iOS (ATT permission required first)
- **Affinity Notifications**: Self-hosted, push tokens registered via `AffinityNotificationService.registerDevice()` on sign-in
- **RevenueCat**: Paywall is remote — design lives on RevenueCat dashboard, not in code. Uses `<RevenueCatUI.Paywall />` which auto-fetches
- **Supabase**: Single table `gamification_data` with one JSONB column holds ALL user progress. Not normalized — intentional design for simple sync

---

## 7. Testing Expectations

**Golden rule: Test on BOTH iOS AND Android before every commit.**

### Pre-commit checklist

```bash
npm run lint                    # Mandatory — fix errors before committing
npx expo start --clear          # If you see phantom Metro errors
rm -f *.ipa *.apk build-*.ipa  # Clean artifacts
```

### What you can test on simulator/emulator

- All lesson types (video, carousel, reading)
- Navigation flow (onboarding → tabs → adventures → lessons → quiz)
- Progress tracking and cloud sync
- Content loading from Supabase
- UI layout, animations, gestures
- Pull-to-refresh
- AI chat (Gemini)
- RevenueCat paywall display (but not actual purchases)

### What REQUIRES a physical device

| Feature | Why |
|---------|-----|
| Push notifications | APNs/FCM don't work on simulators |
| Apple Sign-In | Requires Face ID / Touch ID biometrics |
| Subscription purchases | RevenueCat sandbox needs real device |
| Haptic feedback | No haptic motor on simulator |
| Background audio | Simulator has limitations with audio sessions |
| Universal Links / App Links | Full deep link flow requires installed app on device |

### How to get a physical device build

```bash
# iOS physical device
eas build --platform ios --profile development-device

# Android physical device (APK sideload)
eas build --platform android --profile development
```

### Common testing scenarios to verify

- Fresh install flow: onboarding → sign up → first lesson → quiz → progress saves
- Account switching: sign out → sign in different account → progress resets cleanly
- Offline behavior: complete a lesson with airplane mode → reconnect → progress syncs
- Daily story flow: WATCH → EXPLORE → QUESTIONS → completion celebration
- Historical daily stories: tap past date → paywall (non-subscriber) or content loads (subscriber)

### When Metro gives you trouble

```bash
npx expo start --clear              # First try
rm -rf node_modules/.cache          # If that fails
rm -rf node_modules && npm install  # Nuclear option
```

---

## 8. Key Code Paths to Study First

Read these files in this order. Each one builds on the previous.

### Reading order

1. **`app/_layout.tsx`** — The entry point. Provider hierarchy, initialization sequence, font loading. Understand how Clerk, PostHog, RevenueCat, Sentry, and Affinity all wire together. This is the file you'll touch least but need to understand most.

2. **`constants/ArchivesTheme.ts`** — Design system. Every color, spacing, button style, card style used across the app. Read this early so you use `ArchivesTheme.colors.persianOrange` instead of `#C99151`.

3. **`components/shared/types.ts`** — Core data types. `Adventure`, `ContentItem`, `Question`, `ContentBlock`. These types flow through the entire app — from Supabase to UI.

4. **`gamification/engines/GamifiedProgress.tsx`** — Progress engine. Largest and most critical file — handles ALL progress tracking + cloud sync. `atomicProgressUpdate()` for Era 1, `saveNewProgressData()` for Era 2+. Streak tracking, XP calculation, Supabase sync (debounced 2s).

5. **`gamification/engines/GamificationOrchestrator.tsx`** — Celebrations engine. Manages achievements (21 total), XP milestones, streak milestones. `reportQuizComplete()` — the main function components call after quiz completion. Celebration queue system — shows one celebration at a time.

6. **`components/lessons/ReelLesson.tsx`** — Best lesson reference. Video player with `expo-video`, expandable reading card, progress animations, gesture handling, walkthrough hints, cross-platform gesture management. If you need to build a new lesson type, start here.

7. **`app/(tabs)/today.tsx`** — Most complex screen. Daily story flow with 3 sequential cards. Calendar week view with swipe gestures (Reanimated). Historical content viewing with subscription gating. Modal management for WATCH → EXPLORE → QUIZ transitions.

8. **`context/AdventuresContentProvider.tsx`** — Content pipeline. How content flows from Supabase → cache → React context. Real-time subscription for live content updates.

9. **`gamification/index.ts`** — Public API. Clean exports for everything in the gamification module. When importing gamification features, always use `@/gamification` not deep paths.

### Quick reference for common tasks

| I need to... | Look at... |
|--------------|-----------|
| Add a new lesson type | `components/lessons/ReelLesson.tsx` (copy and adapt) |
| Track a new analytics event | `services/AnalyticsService.ts` + create a hook like `useDailyStoryTracking.ts` |
| Add a new achievement | `gamification/engines/GamificationOrchestrator.tsx` → `ACHIEVEMENTS` array |
| Modify the quiz system | `components/quiz/Quiz.tsx` + `QuizResults.tsx` |
| Change subscription paywall | RevenueCat dashboard (remote), not in code |
| Add a new Supabase table | `hooks/lib/supabase.ts` for the client, then create a hook |
| Send push notifications | Affinity dashboard for campaigns, `AffinityNotificationService.ts` for device registration |

---

## 9. Known Gotchas

These are the things that will waste hours if you don't know about them upfront.

### Platform-specific

- **Stack navigation gestures are disabled globally** (`gestureEnabled: false` in `_layout.tsx`). This prevents users from swiping back to onboarding. Don't re-enable it.
- **Android back button is blocked in tabs** — intentional to match iOS behavior.
- **Android background color** — set explicitly to `#F4EBDB` in multiple places (`GestureHandlerRootView`, `CustomTheme`, `SystemUI.setBackgroundColorAsync`). If you see a white flash on Android, one of these is missing.
- **Android OOM crashes** — `largeHeap: true` is enabled in `app.json` for a reason. Video-heavy lessons were crashing Android devices without it.
- **iOS ATT (App Tracking Transparency)** — PostHog only initializes if user grants tracking permission on iOS. If you're debugging analytics on iOS and nothing fires, check ATT status first.

### Progress system

- **Two progress arrays** — `moduleProgress` (legacy Era 1) and `newProgress` (Era 2+) coexist in the same state. Don't try to merge them or migrate one to the other — backward compatibility is intentional.
- **Cloud sync is debounced 2 seconds** — if you save progress and immediately check Supabase, the data won't be there yet. Local state is always ahead of cloud.
- **`gamification_data` table has a single JSONB column** — ALL progress data is one big JSON blob per user. This is intentional for simple sync, not a mistake.
- **Migration from `user_data` to `gamification_data`** — happens automatically on first sign-in. A `migration_completed` flag prevents it from running twice. Don't delete this flag.

### Content

- **`media_url` is always an array** in `ContentItem`, even for single videos. Lesson components handle both cases but if you access `media_url` directly, remember it's an array.
- **Number of lessons per module = `media_url.length`**, NOT a separate count field. If a module has 3 URLs, it has 3 lessons.
- **Supabase real-time subscriptions** — both `content` and `daily_content` tables have live subscriptions. Content updates in Supabase show instantly in the app without a redeploy.

### Third-party services

- **RevenueCat paywall is remote** — the paywall design lives on RevenueCat dashboard, not in code. If the paywall looks wrong, check the dashboard, not the codebase. The app just renders `<RevenueCatUI.Paywall />`.
- **Affinity push tokens are manually registered** — the app calls `AffinityNotificationService.registerDevice()` on sign-in to register the Expo push token with the backend.
- **PostHog is EU region** — host is `eu.i.posthog.com`. API calls to `app.posthog.com` (US) will silently fail.

### Development

- **Metro cache causes phantom errors** — if you see module resolution errors or stale code, `npx expo start --clear` is always the first fix.
- **Font loading is on the critical path** — `DM Sans` + `Cormorant` must load before splash screen hides. If you add a new font, add it to the `useFonts` call in `_layout.tsx`.
- **`expo-video` for video, `expo-av` for audio only** — these are two different libraries used for different purposes. Don't use `expo-av` for video playback.
- **Walkthrough hints are global, not per-era** — there are only two flags: `REEL` and `CAROUSEL`. Once a user sees the reel hint in any lesson, it never shows again across the entire app.

### Git workflow

- **Production branch is `3.5.0`** — not `main`, not `master`. All work happens here or in feature branches off it.
- **Build numbers auto-increment on production builds** — don't manually bump `buildNumber` or `versionCode` unless you specifically need to (the `autoIncrement` setting in `eas.json` handles it).

---

## 10. MCP Servers (Claude Code Tooling)

If the new engineer uses **Claude Code** (CLI) for development, the following MCP servers are configured for this project and provide direct access to external services without leaving the terminal.

### Available MCP Servers

| MCP Server | What it does | Example uses |
|------------|-------------|-------------|
| **PostHog** | Query analytics, manage dashboards, feature flags, experiments, surveys, error tracking | Run HogQL queries (`daily_story_completed` counts), check dashboards, create insights, search for events |
| **Affinity Notifications** | Manage push notifications, users, devices | Send notifications, view delivery stats, manage scheduled sends |
| **RevenueCat** | Manage projects, offerings, products, entitlements, paywalls | Check current offerings, list products, create paywalls, view app config |
| **Figma** | Read designs, extract design context, screenshots, Code Connect mappings | Implement UI from Figma URLs, get design tokens, extract SVG assets |
| **Slack** | Send messages, search channels, read threads | Send updates to team channels, search for context |
| **Claude in Chrome** | Browser automation — navigate, click, fill forms, take screenshots, record GIFs | Test web dashboards, automate repetitive browser tasks, capture visual documentation |
| **Context7** | Fetch up-to-date library documentation | Look up latest Expo, React Native, or any library docs |

### PostHog MCP — Most used

The PostHog MCP is the most frequently used server for this project. Key capabilities:

```
# Query analytics with HogQL
query-run → Run SQL-like queries against PostHog data

# Natural language queries
query-generate-hogql-from-question → "How many users completed daily story last week?"

# Dashboard management
dashboards-get-all → List all dashboards
dashboard-get → Get specific dashboard with insights

# Error tracking
list-errors → View recent errors
error-details → Drill into specific errors

# Feature flags
feature-flag-get-all → List all flags
create-feature-flag → Create new flags

# Entity search
entity-search → Search across insights, dashboards, experiments, etc.
```

**Important:** PostHog is EU region. The MCP connects to `eu.posthog.com`. Some endpoints require specific API key permissions — if you get 403 errors, check your PostHog personal API key permissions.

### Affinity Notifications

Push notifications are managed via the self-hosted Affinity Notification Service dashboard. The mobile app communicates directly with the Affinity API for device registration and permission syncing.
- **Can create/edit templates and components** — useful for email/notification design
- **Workspace:** "Affinity Labs LTD" (ID: 204719) — make sure you're connected to the right workspace, not "IDC"

### RevenueCat MCP

- Can list apps, products, offerings, entitlements, and packages
- Can create new paywalls and offerings
- **Cannot read existing published paywalls** — use the RevenueCat dashboard to inspect current paywall designs
- Project: "Archives" (`proj023a9d22`)
- Current offering: "Default offering" (`ofrngf29bdba058`)

### Figma MCP

Used for design-to-code workflow:
1. Share a Figma URL → MCP extracts `fileKey` and `nodeId`
2. `get_design_context` returns structured layout data + code hints
3. `get_screenshot` provides visual reference
4. Adapt output to project conventions (ArchivesTheme, existing components)

**Note:** The output is React + Tailwind by default — always adapt to this project's React Native + StyleSheet + ArchivesTheme patterns.

### Setting up MCP servers

MCP servers are configured per-user in Claude Code settings. If the new engineer uses Claude Code, they'll need to:
1. Install Claude Code CLI
2. Configure their own MCP server connections (PostHog API key, RevenueCat API key, Figma access)
3. Each MCP server has its own authentication — credentials are not shared via the repo

---

## Additional Resources

- **`CLAUDE.md`** — AI-optimized project instructions (comprehensive, rule-based). Read this alongside this handover doc.
- **`eas.json`** — Build configuration and env vars
- **`app.json`** — App configuration, plugin settings, version numbers
- **`gamification/index.ts`** — Public API for all gamification imports

---

*This document covers the essential knowledge for working on the Archives Expo codebase. When in doubt, read the actual code — start with the files listed in Section 8.*
