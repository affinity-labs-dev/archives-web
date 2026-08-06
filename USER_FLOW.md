# Archives Expo - Complete User Journey

This document maps the complete user flow through the Archives Expo app, covering all screens, navigation paths, and decision points.

---

## App Launch

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              APP LAUNCH                                      │
│                            app/index.tsx                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │   Check Clerk Auth + AsyncStorage  │
                    └─────────────────┬─────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
    │   NEW USER      │    │ INCOMPLETE      │    │ RETURNING USER  │
    │ (not signed in) │    │ ONBOARDING      │    │ (signed in +    │
    │                 │    │ (signed in, no  │    │  era selected)  │
    │                 │    │  era selected)  │    │                 │
    └────────┬────────┘    └────────┬────────┘    └────────┬────────┘
             │                      │                      │
             └──────────┬───────────┘                      │
                        ▼                                  │
              ONBOARDING FLOW                              │
                        │                                  │
                        ▼                                  ▼
                   AUTH FLOW                          MAIN APP
                        │                            (Tabs)
                        ▼
                  ERA SELECTION
                        │
                        ▼
                    MAIN APP
```

---

## Onboarding Flow (8 Screens)

**Location:** `app/(onboarding)/`

| Screen | File | Description |
|--------|------|-------------|
| 1 | `onboarding-video.tsx` | Intro video (35s auto-continue) |
| 2 | `onboarding-video-2.tsx` | Second intro video |
| 3 | `onboarding-welcome.tsx` | "Just 4 quick questions" + camel mascot |
| 4 | `onboarding-question-1.tsx` | Knowledge level (5 options) |
| 5 | `onboarding-question-2.tsx` | How did you hear about us? |
| 6 | `onboarding-question-3.tsx` | Daily learning goal |
| 7 | `onboarding-question-4.tsx` | Why are you learning? (multi-select) |
| 8 | `onboarding-results.tsx` | Era recommendation + ATT permission + CREATE ACCOUNT |

```
┌────────┐   ┌────────┐   ┌─────────┐   ┌────┐   ┌────┐   ┌────┐   ┌────┐   ┌─────────┐
│Video 1 │──▶│Video 2 │──▶│ Welcome │──▶│ Q1 │──▶│ Q2 │──▶│ Q3 │──▶│ Q4 │──▶│ Results │
│  35s   │   │        │   │         │   │    │   │    │   │    │   │    │   │  + ATT  │
└────────┘   └────────┘   └─────────┘   └────┘   └────┘   └────┘   └────┘   └────┬────┘
                                                                                  │
                                                                    [CREATE ACCOUNT]
                                                                                  │
                                                                                  ▼
                                                                            AUTH FLOW
```

### Data Saved During Onboarding
- `onboarding_q1_answer` - Knowledge level
- `onboarding_q2_answer` - Awareness channel
- `onboarding_q3_answer` - Daily goal
- `onboarding_q4_answers` - Motivations (array)

### PostHog Person Properties Updated
- `knowledge_level`
- `awareness_channel`
- `daily_learning_goal`
- `learning_motivation`
- `onboarding_result`

---

## Authentication Flow

**Location:** `app/(auth)/`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AUTHENTICATION                                     │
│                     app/(auth)/archives-auth.tsx                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐     │
│  │   Apple         │  │    Google       │  │   Email/Password        │     │
│  │   Sign-In       │  │    Sign-In      │  │                         │     │
│  └────────┬────────┘  └────────┬────────┘  └───────────┬─────────────┘     │
│           │                    │                       │                    │
│           │                    │             ┌─────────┴─────────┐          │
│           │                    │             │  email-details.tsx │          │
│           │                    │             │                    │          │
│           │                    │             │  Sign Up: Name,    │          │
│           │                    │             │  Email, Password   │          │
│           │                    │             │                    │          │
│           │                    │             │  Sign In: Email,   │          │
│           │                    │             │  Password only     │          │
│           │                    │             └─────────┬──────────┘          │
│           │                    │                       │                    │
│           └────────────────────┴───────────────────────┘                    │
│                                      │                                      │
│                           [Auth Success]                                    │
│                                      │                                      │
│                                      ▼                                      │
│                          /(tabs)/eras?mode=onboarding                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Password Recovery
- `forgot-password.tsx` - Email-based reset request
- `reset-password.tsx` - New password confirmation

---

## Era Selection

**Location:** `app/(tabs)/eras.tsx`

### Two Modes

| Mode | Trigger | Behavior |
|------|---------|----------|
| **Onboarding** | `?mode=onboarding` | First-time selection, stores `selected_era` |
| **Switcher** | Normal tab access | Switch between unlocked eras |

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ERA SELECTION                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │  Rise of Islam   │  │ Umayyad Dynasty  │  │   Coming Soon    │          │
│  │     (FREE)       │  │     (FREE)       │  │    (LOCKED)      │          │
│  │                  │  │                  │  │                  │          │
│  │   [SELECT]       │  │   [SELECT]       │  │   [LOCKED]       │          │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────────────┘          │
│           │                     │                                           │
│           └──────────┬──────────┘                                           │
│                      │                                                      │
│                      ▼                                                      │
│               /(tabs) (Home)                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Era Status Types
- `active` - Free/default access
- `premium` - Requires subscription
- `founding` - Early-access for founding members
- `coming_soon` - Locked (grayed out)

---

## Main App (Tab Navigation)

**Location:** `app/(tabs)/_layout.tsx`

```
═══════════════════════════════════════════════════════════════════════════════
                              MAIN APP (Tabs)
                           Native iOS Bottom Tabs
═══════════════════════════════════════════════════════════════════════════════
                                    │
    ┌───────────────┬───────────────┼───────────────┬───────────────┐
    │               │               │               │               │
    ▼               ▼               ▼               ▼               ▼
┌────────┐   ┌──────────┐   ┌────────────┐   ┌──────────┐   ┌────────────┐
│  HOME  │   │   ERAS   │   │ SUBSCRIBE  │   │ PROFILE  │   │ ERA-VIEW   │
│ index  │   │  eras    │   │ subscribe  │   │ profile  │   │ (hidden)   │
└────────┘   └──────────┘   └────────────┘   └──────────┘   └────────────┘
```

### Tab Details

| Tab | File | Purpose |
|-----|------|---------|
| **Home** | `index.tsx` | Currently imports `AdventuresScreen` |
| **Eras** | `eras.tsx` | Era browser/switcher |
| **Subscribe** | `subscribe.tsx` | Subscription management (RevenueCat) |
| **Profile** | `profile.tsx` | User stats, achievements, settings |
| **era-view** | `era-view.tsx` | Hidden tab - actual adventure display |

### Native Tab Bar Features
- iOS: `@bottom-tabs/react-navigation` (native floating tabs, iOS 18+ behavior)
- Android/Web: Expo Router tabs fallback
- Haptic feedback enabled
- Dynamic safe area handling

---

## Home Tab - Adventure Grid

**Component:** `components/adventure/types/bento-grid/BentoGridScreen.tsx`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ADVENTURES SCREEN                                    │
│                    BentoGridScreen.tsx (bento layout)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────┐  ┌───────────────────────────┐              │
│  │      ADVENTURE 1          │  │      ADVENTURE 2          │              │
│  │    "The Beginning"        │  │    "The Spread"           │              │
│  │    ████████░░ 80%         │  │    LOCKED                 │              │
│  │    3 modules              │  │    (complete Adv 1)       │              │
│  └─────────────┬─────────────┘  └───────────────────────────┘              │
│                │                                                            │
│                │ [TAP]                                                      │
│                ▼                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │              ADVENTURE SUMMARY (Modal)                               │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  Adventure Title + Description                                      │   │
│  │  Total XP: 150 | Stars: 9/9                                        │   │
│  │                                                                     │   │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐                         │   │
│  │  │ MODULE 1  │ │ MODULE 2  │ │ MODULE 3  │                         │   │
│  │  │  Done     │ │  Done     │ │  Active   │                         │   │
│  │  │  3 stars  │ │  2 stars  │ │ [START]   │                         │   │
│  │  └─────┬─────┘ └───────────┘ └─────┬─────┘                         │   │
│  │        │                           │                                │   │
│  └────────┼───────────────────────────┼────────────────────────────────┘   │
│           │                           │                                    │
│           │ [TAP MODULE]              │                                    │
│           ▼                           ▼                                    │
│                         LESSON PLAYER                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Lesson Flow (4 Content Types)

**Orchestrator:** `components/lessons/LessonPlayer.tsx`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LESSON PLAYER                                      │
│                   components/lessons/LessonPlayer.tsx                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    content_type?                                                            │
│         │                                                                   │
│    ┌────┴────┬──────────────┬──────────────┬──────────────────┐            │
│    │         │              │              │                   │            │
│    ▼         ▼              ▼              ▼                   │            │
│ ┌──────┐ ┌────────────┐ ┌────────────┐ ┌──────────────────┐   │            │
│ │ REEL │ │   VIDEO    │ │   IMAGE    │ │   SCROLLABLE     │   │            │
│ │      │ │  CAROUSEL  │ │  CAROUSEL  │ │   MEDIA VIEW     │   │            │
│ └──────┘ └────────────┘ └────────────┘ └──────────────────┘   │            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Content Type Details

| Type | Component | Features |
|------|-----------|----------|
| **reel** | `ReelLesson.tsx` | Full-screen video, expandable reading card, swipe gestures |
| **video_carousel** | `VideoCarouselLesson.tsx` | Swipeable video gallery, auto-play on visible |
| **image_carousel** | `ImageCarouselLesson.tsx` | Swipeable images, background music, caption overlays |
| **scrollable_media_view** | `ScrollableMediaViewLesson.tsx` | Mixed content blocks, vertical scrolling |

### Walkthrough Hints (First-Time Only)
- **Location:** `constants/WalkthroughKeys.ts`
- **Assets:** `/assets/images/walkthrough/` (read.svg, continue.svg, abovedots.svg)
- **Persistence:** AsyncStorage flags (`REEL`, `CAROUSEL`)
- **Behavior:** Shows once per content type, disappears when reading card expands

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LESSON COMPLETION                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │   Video/Content Complete                                            │   │
│  │           │                                                          │   │
│  │           ▼                                                          │   │
│  │   ┌───────────────────────────────────┐                             │   │
│  │   │       QUIZ UNLOCKED               │                             │   │
│  │   │   [START QUIZ] button appears     │                             │   │
│  │   └───────────────────────────────────┘                             │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Quiz Flow

**Component:** `components/modules/QuizSystem.tsx`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             QUIZ SYSTEM                                      │
│                    components/modules/QuizSystem.tsx                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     QUESTION 1 of 5                                  │   │
│  │                                                                      │   │
│  │   "What year did the Umayyad Dynasty begin?"                        │   │
│  │                                                                      │   │
│  │   ┌────────────────────────────────────────────┐                    │   │
│  │   │  A) 632 CE                                 │                    │   │
│  │   ├────────────────────────────────────────────┤                    │   │
│  │   │  B) 661 CE  [CORRECT]                      │                    │   │
│  │   ├────────────────────────────────────────────┤                    │   │
│  │   │  C) 750 CE                                 │                    │   │
│  │   ├────────────────────────────────────────────┤                    │   │
│  │   │  D) 800 CE                                 │                    │   │
│  │   └────────────────────────────────────────────┘                    │   │
│  │                                                                      │   │
│  │                    [NEXT QUESTION]                                   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                         After 5 questions...                                │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       QUIZ COMPLETE!                                 │   │
│  │                                                                      │   │
│  │                    Score: 4/5 correct                               │   │
│  │                    Stars: 2 (3-4 = 2 stars)                         │   │
│  │                    XP Earned: +40 XP                                │   │
│  │                                                                      │   │
│  │                 [Celebration Video Plays]                           │   │
│  │                                                                      │   │
│  │                      [CONTINUE]                                     │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Star Rating Logic

| Correct Answers | Stars |
|-----------------|-------|
| 1-2 | 1 star |
| 3-4 | 2 stars |
| 5 | 3 stars |

### XP Calculation
```
XP = correctAnswers × 10
(e.g., 4 correct = 40 XP)
```

---

## Unlock Chain

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         UNLOCK PROGRESSION                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ADVENTURE 1 (Default Unlocked)                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                                                                    │    │
│  │  Module 1      Module 2      Module 3                             │    │
│  │  [ACTIVE]  ->  [LOCKED]  ->  [LOCKED]                             │    │
│  │      │                                                            │    │
│  │      │ Complete lessons + Pass quiz (2/5 minimum)                 │    │
│  │      ▼                                                            │    │
│  │  Module 1      Module 2      Module 3                             │    │
│  │  [DONE]    ->  [ACTIVE]  ->  [LOCKED]                             │    │
│  │                    │                                              │    │
│  │                    │ Complete lessons + Pass quiz                 │    │
│  │                    ▼                                              │    │
│  │  Module 1      Module 2      Module 3                             │    │
│  │  [DONE]    ->  [DONE]    ->  [ACTIVE]                             │    │
│  │                                  │                                │    │
│  │                                  │ Complete lessons + Pass quiz   │    │
│  │                                  ▼                                │    │
│  │  ADVENTURE 1 COMPLETE! -> Unlocks Adventure 2                     │    │
│  │                                                                    │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  ADVENTURE 2 (Now Unlocked)                                                │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Module 1      Module 2      Module 3                             │    │
│  │  [ACTIVE]  ->  [LOCKED]  ->  [LOCKED]                             │    │
│  │                                                                    │    │
│  │  ... (repeat pattern) ...                                         │    │
│  │                                                                    │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Unlock Rules
- **Module unlock:** Complete lessons + Pass quiz (minimum 2/5 correct)
- **Adventure unlock:** Complete all modules in previous adventure
- **Adventure 1:** Always unlocked by default

---

## Subscribe Tab

**Location:** `app/(tabs)/subscribe.tsx` + `components/SubscribeContent.native.tsx`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SUBSCRIPTION SCREEN                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │                     1 MONTH FREE                                     │   │
│  │              (shown if intro eligible - iOS only)                   │   │
│  │                                                                      │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │   ┌──────────────────┐    ┌──────────────────┐                      │   │
│  │   │   MONTHLY        │    │    YEARLY        │                      │   │
│  │   │   $9.99/mo       │    │   $59.99/yr      │                      │   │
│  │   │                  │    │   (Save 50%)     │                      │   │
│  │   └──────────────────┘    └──────────────────┘                      │   │
│  │                                                                      │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │   - Access all eras & adventures                                    │   │
│  │   - Unlimited AI chat                                               │   │
│  │   - No ads                                                          │   │
│  │   - Offline downloads                                               │   │
│  │                                                                      │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │               [SUBSCRIBE NOW]                                       │   │
│  │                                                                      │   │
│  │            [Restore Purchases]                                      │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Integration
- **SDK:** RevenueCat (`react-native-purchases`)
- **Hook:** `hooks/useRevenueCat.ts`
- **Methods:** `purchasePackage()`, `restorePurchases()`

---

## Profile Tab

**Location:** `app/(tabs)/profile.tsx`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PROFILE SCREEN                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  [Avatar]                                                            │   │
│  │  "John Doe"                                                         │   │
│  │                                                                      │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                          │   │
│  │  │  LEVEL   │  │   XP     │  │  STREAK  │                          │   │
│  │  │    5     │  │   450    │  │   12     │                          │   │
│  │  └──────────┘  └──────────┘  └──────────┘                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │               HISTORICAL AVATARS                                     │   │
│  │                                                                      │   │
│  │  [Done] [Done] [Lock] [Lock] [Lock] [Lock] [Lock] [Lock] [Lock]    │   │
│  │                                                                      │   │
│  │  (Unlock by completing modules)                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │               BADGES                                                 │   │
│  │                                                                      │   │
│  │  [50 XP] [100 XP] [500 XP] [Monthly Active]                        │   │
│  │   Done    Done     Lock      Lock                                   │   │
│  │                                                                      │   │
│  │  (Earn by accumulating XP)                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │               SETTINGS                                               │   │
│  │                                                                      │   │
│  │  Notifications              [Toggle ON/OFF]                         │   │
│  │  Privacy Policy             [View]                                  │   │
│  │  Terms of Service           [View]                                  │   │
│  │  Sign Out                   [Tap]                                   │   │
│  │  Delete Account             [Tap]                                   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Celebration Modals
- **XPMilestoneScreen** - Triggered at 50 XP intervals
- **AdventureCompleteScreen** - When entire adventure finished
- **AchievementUnlockAnimation** - Full-screen celebration

---

## AI Chat (Floating Button)

**Component:** `components/AI/AIChatModal.tsx`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            AI CHAT MODAL                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────┐         │
│  │   Archives AI Assistant                           [X Close]   │         │
│  ├───────────────────────────────────────────────────────────────┤         │
│  │                                                               │         │
│  │  User: "Tell me about the Umayyad Dynasty"                   │         │
│  │                                                               │         │
│  │  AI: "The Umayyad Dynasty (661-750 CE) was the second        │         │
│  │  of the four major caliphates established after the          │         │
│  │  death of Prophet Muhammad. It was founded by..."            │         │
│  │                                                               │         │
│  ├───────────────────────────────────────────────────────────────┤         │
│  │  [Type your question...]                          [Send]      │         │
│  └───────────────────────────────────────────────────────────────┘         │
│                                                                             │
│  Features:                                                                  │
│  - Gemini AI powered (Google)                                              │
│  - Context-aware (knows user's progress)                                   │
│  - Monthly quota (unlimited for premium)                                   │
│  - Markdown rendering for responses                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Sync Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       LOCAL-FIRST DATA SYNC                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  USER ACTION (e.g., complete quiz)                                          │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────┐                           │
│  │    atomicProgressUpdate()                    │                           │
│  │    context/ProgressContext.tsx               │                           │
│  └─────────────────────┬───────────────────────┘                           │
│                        │                                                    │
│         ┌──────────────┼──────────────┐                                     │
│         │              │              │                                     │
│         ▼              ▼              ▼                                     │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                              │
│  │  Update    │ │   Write    │ │  Trigger   │                              │
│  │  React     │ │  Async     │ │  Cloud     │                              │
│  │  State     │ │  Storage   │ │  Sync      │                              │
│  │  (instant) │ │  (<50ms)   │ │  (2s dbnc) │                              │
│  └────────────┘ └────────────┘ └─────┬──────┘                              │
│                                      │                                      │
│                                      ▼                                      │
│                        ┌─────────────────────────┐                          │
│                        │  SimplifiedSyncService   │                          │
│                        │  -> Supabase (JSONB)     │                          │
│                        └─────────────────────────┘                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### App Launch Sync Sequence
1. Clerk authenticates (waits for token)
2. BackgroundSyncProvider starts (waits for Clerk)
3. Check cloud data via SimplifiedSyncService
   - Cloud exists -> Restore to AsyncStorage (priority)
   - Cloud empty -> Upload local progress
4. ProgressContext loads AsyncStorage (now has latest)

---

## Analytics Events

### Key Events Tracked

| Category | Events |
|----------|--------|
| **Onboarding** | `onboarding_started`, `onboarding_screen_exited`, `onboarding_completed`, `era_selected` |
| **Content** | `lesson_started`, `lesson_completed`, `quiz_started`, `quiz_completed`, `quiz_answer_selected` |
| **Progression** | `module_completed`, `adventure_unlocked`, `50_xp_milestone`, `badge_unlocked`, `avatar_unlocked` |
| **Engagement** | `app_opened`, `app_foregrounded`, `app_backgrounded`, `ai_chat_opened`, `notification_clicked` |
| **Subscription** | `subscription_started`, `subscription_completed`, `subscription_failed`, `subscription_restored` |

### Session Replay
- **Provider:** PostHog
- **Feature:** Full session recording
- **Privacy:** Text inputs masked
- **Trigger:** Enabled after ATT consent (iOS)

---

## Key File References

### Navigation
- `app/_layout.tsx` - Provider hierarchy
- `app/index.tsx` - Entry point routing
- `app/(tabs)/_layout.tsx` - Tab navigation

### Onboarding
- `app/(onboarding)/_layout.tsx` - Stack navigator
- `app/(onboarding)/onboarding-*.tsx` - Individual screens

### Authentication
- `app/(auth)/archives-auth.tsx` - Main auth screen
- `app/(auth)/email-details.tsx` - Email/password form

### Main App
- `app/(tabs)/index.tsx` - Home tab
- `app/(tabs)/era-view.tsx` - Adventures list
- `app/(tabs)/eras.tsx` - Era selection
- `app/(tabs)/subscribe.tsx` - Subscriptions
- `app/(tabs)/profile.tsx` - Profile & settings

### Lessons & Content
- `components/adventure/types/bento-grid/BentoGridScreen.tsx` - Adventure grid
- `components/lessons/LessonPlayer.tsx` - Lesson orchestrator
- `components/lessons/ReelLesson.tsx` - Video + reading
- `components/lessons/VideoCarouselLesson.tsx` - Video gallery
- `components/lessons/ImageCarouselLesson.tsx` - Image gallery
- `components/modules/QuizSystem.tsx` - Quiz engine

### State Management
- `context/ProgressContext.tsx` - Progress + XP + unlocking
- `context/RewardsContext.tsx` - Badges + avatars
- `context/AdventuresContentProvider.tsx` - Supabase content
- `context/BackgroundSyncProvider.tsx` - Cloud sync

---

*Last updated: December 2024*
