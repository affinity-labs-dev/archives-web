# AFF-383: Live Activity Implementation Plan

**Author:** Huy Pham (Engineering)
**Date:** April 9, 2026
**Ticket:** [AFF-383 — Scope out Live Activities, Home Screen Widgets & Android Live Updates](https://linear.app/affinity-labs/issue/AFF-383/scope-out-live-activities-home-screen-widgets-and-android-live-updates)
**Supersedes:** [AFF-383-live-activity-feasibility-review.md](AFF-383-live-activity-feasibility-review.md) (original recommendation to drop Live Activities entirely)

---

## Executive Summary

After the original feasibility review recommended dropping Live Activities due to Apple HIG violations, the requirements have been **refined** to two HIG-compatible use cases:

1. **Daily Story Exit** — when a user starts a daily story and exits the app without finishing, a Live Activity shows progress and a "tap to resume" CTA
2. **Streak Reminder at 10 PM** — when a user opens the app after 22:00 without completing the day's story, a Live Activity automatically starts and counts down to midnight. A backend push notification at 22:00 (Option B) nudges users who would not otherwise open the app. Push-to-start (Option C) will be tested empirically in Phase 6 before deciding whether to productionize.

**The new requirements pass Apple's HIG criteria** because they represent *bounded, user-initiated tasks that are actively tracked* — exactly what ActivityKit was designed for. This plan uses the **Voltra** library (JSX → SwiftUI codegen) for Expo integration, with `expo-live-activity` as fallback.

**Implementation strategy: sequential build with empirical validation.** Build core Live Activity infrastructure first with a manual test button to prove the feature works end-to-end. Then wire automatic triggers. Then layer on the notification-based reach extension. Then test push-to-start on real devices and decide whether to ship it. Each phase de-risks the next.

**Widgets and Android support are deferred** and not in scope for this plan.

| Item | Decision | Rationale |
|------|----------|-----------|
| **Library (primary)** | [`@bacons/apple-targets`](https://github.com/EvanBacon/expo-apple-targets) | **Already installed** in this repo (line 177 `app.json`); proven pattern via existing `targets/notification-service/` shipping in production; first-party Expo ecosystem (Evan Bacon, Expo core); supports Live Activities via `type: 'widget'` + `frameworks: ['SwiftUI', 'ActivityKit']`; no new dependency to maintain |
| **Library (fallback)** | Voltra or `expo-live-activity` | Only if apple-targets fails POC (unlikely given it's already validated for notification-service) |
| **Activity 1 (P1)** | `DailyStoryActivity` — resume CTA on exit mid-story | HIG-safe: user-initiated, bounded, actively tracked |
| **Activity 2 (P2)** | `StreakGuardActivity` — foreground-check countdown after 22:00 | HIG-acceptable: "opening the app after 22:00" is the user-initiated trigger |
| **Option A (local trigger)** | Build first with test button — Phase 1 | Validates display end-to-end before committing to auto-trigger wiring |
| **Option B (push + fallback)** | Layer on Option A — Phase 5 | Trivial extension: deep link handler checks notification type, calls same Phase 4 foreground logic |
| **Option C (push-to-start)** | Research phase with test harness — Phase 6 | Register tokens, build backend test harness, empirically validate reliability. Decision to productionize based on test data |
| **iOS minimum** | 16.1+ for Options A/B, 17.2+ for Option C | Already met by current app; see §8.4.1 for version distribution |
| **Android** | Not supported | iOS-only feature — widgets + push deferred to separate ticket |

### Phase roadmap at a glance

| Phase | Deliverable | Validates |
|---|---|---|
| Phase 0 | POC scaffold `targets/live-activity/` + prebuild | `@bacons/apple-targets` (already installed) supports Live Activities without breaking existing notification-service target |
| **Phase 1** | **Core infrastructure + manual test button** | **Live Activities display correctly in Archives Expo** |
| Phase 2 | Daily story resume infrastructure | Resumable stories (prerequisite for Phase 3) |
| Phase 3 | DailyStoryActivity auto-trigger (exit mid-story) | Hooks into existing `useDailyStoryTracking` |
| Phase 4 | StreakGuardActivity auto-trigger (Option A) | Foreground-check pattern at 22:00 |
| Phase 5 | Option B: notification type check + fallback | Trivial extension of Phase 4 via deep link handler |
| **Phase 6** | **Option C: push-to-start research + user testing** | **Empirical data on token reliability → decision to ship or defer** |
| Phase 7 | Robustness, edge cases, `dismissal-date` | Production-ready polish |
| Phase 8 | App Store submission | HIG compliance and reviewer notes |

---

## 1. Why the New Requirements Are HIG-Compatible

The original feasibility review identified three HIG violations with the old design. The new requirements address each:

### 1.1 Old requirement (rejected)

> "Streak countdown Live Activity visible all day until the user completes a lesson"

| HIG Rule | Pass? | Reason |
|---|---|---|
| User-initiated trigger | Fail | Appears automatically, no user action |
| Bounded task | Fail | "Do any lesson" is not a specific task |
| Actively tracked | Fail | User is not actively doing anything — passive reminder |
| Under 8h duration | Fail | Morning to midnight can exceed 24h |

### 1.2 New requirement A — Daily Story Exit

**User story:** User taps into today tab, starts card 1 of the daily story, then backgrounds the app before finishing card 3. A Live Activity appears on the lock screen showing a progress bar and "Tap to resume your story".

| HIG Rule | Pass? | Reason |
|---|---|---|
| User-initiated trigger | Pass | User explicitly started the story — clear entry action |
| Bounded task | Pass | 3 cards with a defined end (completion) |
| Actively tracked | Pass | Progress advances as user completes cards |
| Under 8h duration | Pass | Users typically return the same day; midnight auto-resets |

This is a **textbook ActivityKit use case** — directly comparable to Uber Eats order tracking, Apple Maps navigation, or Clock timer. Zero rejection risk if implemented cleanly.

### 1.3 New requirement B — Streak Reminder at 10 PM

**User story:** User opens the app after 22:00 local time, has not yet completed today's daily story, and still has an active streak. The app detects these conditions on foreground and automatically starts a Live Activity counting down to midnight. No modal, no prompt — opening the app at this moment is the user-initiated action. If the user does not open the app on their own, Option B's backend push notification at 22:00 deep-links back into the same flow.

| HIG Rule | Pass? | Reason |
|---|---|---|
| User-initiated trigger | Pass (foreground-based) | Activity starts on app open — Apple accepts "opening the app in a relevant state" as a valid user-initiated signal, similar to how iOS Weather auto-updates on open and Clock's Timer shows an active activity when the app is opened |
| Bounded task | Pass | "Complete daily story before midnight" — clear end state |
| Actively tracked | Borderline | User is passive after foregrounding; iOS-rendered countdown is the "tracking" |
| Under 8h duration | Pass | 22:00 → 00:00 = 2 hours max |

**Critical design constraint:** Only start the activity once per day per user. Re-triggering on every foreground would feel spammy and could be flagged by reviewers.

### 1.4 Duolingo precedent

Duolingo uses the same opt-in-after-interaction pattern successfully since iOS 16.1 ([Duolingo blog](https://blog.duolingo.com/widget-feature/), [retention.blog](https://www.retention.blog/p/widgets-and-live-activities)):

- Streak Live Activities only start **after** a user interacts with the app (e.g., completes a lesson)
- Live Activities are a **companion** to action, not a **replacement** for push notifications
- Duolingo uses push notifications (not Live Activities) to nudge inactive users — Live Activities reinforce active sessions

Our plan mirrors this pattern exactly.

---

## 2. Library Choice

### 2.1 Candidates

| Library | Pros | Cons | Recommend |
|---|---|---|---|
| **[`@bacons/apple-targets`](https://github.com/EvanBacon/expo-apple-targets)** (Evan Bacon, Expo core) | **Already installed in this repo** (`app.json` line 177); proven via `targets/notification-service/` shipping in production; handles Xcode target wiring via config plugin; first-party Expo ecosystem; supports 40+ target types including widgets/Live Activities via `type: 'widget'` + `frameworks: ['SwiftUI', 'ActivityKit']` | Requires Swift (but team already has Swift experience from NotificationService.swift); no JS/JSX abstraction — native code only | **Primary (already in use)** |
| **[Voltra](https://github.com/callstackincubator/voltra)** (Callstack) | JSX → SwiftUI codegen, hot reload, Dynamic Island, config plugin auto-wires targets | New library (early 2026), fewer production deployments; adds a new plugin system parallel to apple-targets; learning curve for new abstraction | **Fallback only** |
| **[expo-widgets](https://docs.expo.dev/versions/latest/sdk/widgets/)** (Expo official, first-party) | First-party from Expo team, zero native setup, uses Expo UI (SwiftUI bridge) | Newer API surface, evaluate maturity during POC; would also parallel apple-targets | **Fallback only** |
| **[expo-live-activity](https://github.com/software-mansion-labs/expo-live-activity)** (Software Mansion) | Stable, reputable maintainer, push support, `enablePushNotifications` flag | Pre-defined layouts only, less flexible customization; another parallel plugin | **Fallback only** |

### 2.2 Why `@bacons/apple-targets`

The library is **already installed and shipping in production** in this repo. The existing `targets/notification-service/` directory demonstrates the convention:

```javascript
// targets/notification-service/expo-target.config.js (existing, in production)
module.exports = config => ({
  type: "notification-service",
  deploymentTarget: "15.1",
  entitlements: {},
});
```

For Live Activities, the analogous config is:

```javascript
// targets/live-activity/expo-target.config.js (to be created)
module.exports = config => ({
  type: 'widget',                              // Live Activities bundled with widget type
  frameworks: ['SwiftUI', 'ActivityKit'],      // Required for Live Activities
  deploymentTarget: '16.2',                    // ActivityKit requires iOS 16.1+
  entitlements: {},
});
```

Then Swift files live in the same directory:
- `Attributes.swift` — `ActivityAttributes` type definitions (DailyStory, StreakGuard)
- `LiveActivity.swift` — `ActivityConfiguration` widgets (lock screen + Dynamic Island)
- `Info.plist` — widget extension plist
- `generated.entitlements` — auto-generated by the config plugin

**Workflow:** Edit files in `targets/live-activity/` → run `npx expo prebuild -p ios --clean` → the config plugin regenerates `ios/` directory with the new Xcode target wired in → commit regenerated `ios/`. This is the same pattern already in use for `targets/notification-service/` (see git commit `ea39ee2 chore: update iOS native files after prebuild`).

**Swift requirement:** The team has already written Swift for `NotificationService.swift` (78 lines of production code). Swift knowledge is a minimum, not a blocker. The Live Activity layouts use SwiftUI, which is declarative and close in spirit to React.

**Library not required to install:** Because `@bacons/apple-targets` is already in `app.json` plugins (line 177), Phase 0 POC does not need `npm install` at all — only file creation in `targets/live-activity/` and a prebuild.

---

## 3. Architecture Design

### 3.1 Activity definitions

#### DailyStoryActivity (Priority 1)

```typescript
type DailyStoryAttributes = {
  storyId: string;        // YYYY-MM-DD
  storyTitle: string;
  totalCards: number;     // usually 3 (WATCH / EXPLORE / QUESTIONS)
};

type DailyStoryContentState = {
  currentCard: number;                                       // 1, 2, or 3
  completedCards: ('WATCH' | 'EXPLORE' | 'QUESTIONS')[];
  progressPercent: number;
  lastUpdated: number;                                       // timestamp
};
```

**Lifecycle:**

| Event | Source | Action |
|---|---|---|
| User starts card 1 | `useDailyStoryTracking.trackCardViewed()` | Do not start yet — wait for exit |
| App backgrounds mid-story | `AppState` listener in [app/_layout.tsx](app/_layout.tsx) | **START** activity with current progress |
| User returns and advances card | `useDailyStoryTracking.trackCardViewed()` | **UPDATE** activity content state |
| User completes all cards | `reportTodayComplete()` in [gamification/engines/GamificationOrchestrator.tsx](gamification/engines/GamificationOrchestrator.tsx) | **END** activity with success state |
| Midnight reached | Background check or 8h auto-end | **END** activity |

#### StreakGuardActivity (Priority 2)

```typescript
type StreakGuardAttributes = {
  currentStreak: number;
  streakStartDate: string;
};

type StreakGuardContentState = {
  minutesUntilMidnight: number;
  dailyGoalCompleted: boolean;
};
```

**Lifecycle:**

| Event | Condition | Action |
|---|---|---|
| App foregrounds | `now >= 22:00 local` AND `streak > 0` AND `reportTodayComplete` not yet called today AND `!hasActiveActivity` | **START** activity directly — opening the app is the user-initiated trigger |
| Push notification tapped (Option B only) | Deep link `source=streak_reminder` | App opens, runs same foreground check → **START** activity |
| Daily story completed | `reportTodayComplete()` | **END** activity with success state |
| Midnight reached | — | **END** activity |

### 3.2 Integration points in the codebase

```
┌─────────────────────────────────────────────────────────┐
│ app/_layout.tsx (AppState listener — extend existing)   │
│   └─> handleAppStateChange                              │
│        ├─> 'background' → check DailyStoryInProgress    │
│        │    └─> LiveActivityService.startDailyStory()   │
│        └─> 'active' → check StreakGuardConditions       │
│             └─> LiveActivityService.startStreakGuard()  │
│                 directly (no modal, no prompt)          │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ hooks/useDailyStoryTracking.ts (extend)                 │
│   ├─> trackCardViewed → LiveActivityService.update()    │
│   └─> cleanup on unmount → LiveActivityService.start()  │
│       if not completed                                   │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ GamificationOrchestrator.tsx (reportTodayComplete)      │
│   └─> LiveActivityService.endAll() on success           │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ NEW: services/LiveActivityService.ts                    │
│   ├─> startDailyStory(attrs, state)                     │
│   ├─> updateDailyStory(id, state)                       │
│   ├─> endDailyStory(id)                                 │
│   ├─> startStreakGuard(attrs, state)                    │
│   ├─> endStreakGuard(id)                                │
│   └─> endAll()  // safety net on app launch             │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ NEW: gamification/liveActivities/                       │
│   ├─> DailyStoryActivity.tsx  (Voltra JSX component)    │
│   ├─> StreakGuardActivity.tsx (Voltra JSX component)    │
│   └─> index.ts                                          │
└─────────────────────────────────────────────────────────┘
```

### 3.3 Critical codebase observations

From the codebase exploration, three observations shape the design:

1. **Daily story does not persist mid-session progress.** If a user exits after card 2, the next open starts fresh from card 1. Before Live Activity can work, we must add resume logic to `useDailyStoryTracking`, or the activity will "lie" (show "2/3 done" while the app actually resets).

2. **AppState listener only handles 'active' transitions** in [app/_layout.tsx](app/_layout.tsx). It must be extended to handle `'background'` and `'inactive'` for the Live Activity trigger.

3. **Streak increment is guarded by `@last_streak_completion_date` in AsyncStorage.** The Live Activity must check the same guard, otherwise it will show "streak at risk" when the streak has already been extended.

---

## 4. Phased Implementation Plan

**Sequential build philosophy:** Build Live Activity infrastructure first with a manual test button to validate display end-to-end. Then wire automatic triggers (DailyStory exit, StreakGuard foreground). Then layer on Option B as a notification-type-aware fallback into the existing Option A flow. Then treat Option C as a research phase — register push-to-start tokens, build a test harness, and empirically validate reliability before committing to productionize. Each phase de-risks the next.

### Phase 0 — Proof of Concept (mandatory gate)

**Goal:** Verify that a Live Activity target can be scaffolded with `@bacons/apple-targets`, prebuild regenerates `ios/` without corrupting existing `notification-service` target, and a minimal "Hello World" Live Activity displays on a physical device.

**Library decision is already resolved:** `@bacons/apple-targets` is the primary library (already installed, proven via `targets/notification-service/`). Phase 0 is about validating that it works for Live Activities specifically, not about picking a library.

- [ ] Create feature branch `AFF-383` from `4.0.0`
- [ ] Create `targets/live-activity/` directory with 4 files:
  - `expo-target.config.js` — `type: 'widget'` + `frameworks: ['SwiftUI', 'ActivityKit']`
  - `Attributes.swift` — `DailyStoryAttributes` and `StreakGuardAttributes` ActivityAttributes types
  - `LiveActivity.swift` — `ActivityConfiguration` for both activities with lock screen + Dynamic Island variants
  - `Info.plist` — widget extension plist
- [ ] Run `npx expo prebuild -p ios --clean` and diff the regenerated `ios/` directory
- [ ] Verify `targets/notification-service/` is still wired correctly in Xcode project
- [ ] Verify `Podfile` and `Podfile.lock` are in expected state
- [ ] Build to physical device with `npx expo run:ios` (Live Activities don't work on simulator)
- [ ] Smoke-test: manually trigger the Live Activity from Swift to verify display on lock screen and Dynamic Island
- [ ] Commit `targets/live-activity/` and regenerated `ios/` as a POC checkpoint
- [ ] **Go/No-go decision:** If the Live Activity displays correctly, proceed to Phase 1. If `prebuild --clean` breaks the existing `notification-service` target, investigate and fix before proceeding.

**Primary risk:** `prebuild --clean` regenerates `ios/` and there is a known pattern where DEVELOPMENT_TEAM sometimes needs to be restored (per git commit `5610e36 fix: restore DEVELOPMENT_TEAM for NotificationService target`). Review the prebuild diff carefully and restore any manual fixes that got lost.

---

### Phase 1 — Core Live Activity Infrastructure + Test Button (foundation)

**Goal:** Build the complete Live Activity infrastructure and validate display end-to-end via a manual test button. At the end of this phase, we should be able to press a button and see each activity type on the lock screen and Dynamic Island. This proves the whole feature works before we wire in automatic triggers.

**Deliverables:**

- [ ] Create `services/LiveActivityService.ts` with full lifecycle API:
  - `startDailyStory(attrs, state)` / `updateDailyStory(id, state)` / `endDailyStory(id)`
  - `startStreakGuard(attrs, state)` / `updateStreakGuard(id, state)` / `endStreakGuard(id)`
  - `endAll()` — safety net for orphan activities
- [ ] Create `gamification/liveActivities/DailyStoryActivity.tsx` — Voltra JSX component with lock screen layout + Dynamic Island variants (compact, minimal, expanded)
- [ ] Create `gamification/liveActivities/StreakGuardActivity.tsx` — same structure
- [ ] Create `gamification/liveActivities/types.ts` — `Attributes` and `ContentState` type definitions for both activities
- [ ] Create `gamification/liveActivities/index.ts` — public exports

**Test button (the critical deliverable for this phase):**

- [ ] Add a developer-only debug panel in profile tab (gated behind `__DEV__` or a feature flag) with buttons to manually trigger each activity type:
  - `[ Start DailyStoryActivity ]` → creates activity with sample data
  - `[ Update DailyStoryActivity ]` → advances progress
  - `[ End DailyStoryActivity ]` → ends activity with `dismissal-date` in past
  - `[ Start StreakGuardActivity ]` → creates streak countdown activity
  - `[ Update StreakGuardActivity ]` → updates streak state
  - `[ End StreakGuardActivity ]` → ends activity
  - `[ End All Activities ]` → safety reset

**Validation criteria (must pass before Phase 2):**

- [ ] Test button → DailyStoryActivity appears on lock screen within 1 second
- [ ] Test button → StreakGuardActivity appears on lock screen within 1 second
- [ ] Both activities render correctly in Dynamic Island (compact, minimal, expanded variants)
- [ ] Update buttons correctly change displayed content
- [ ] End buttons remove activities immediately (not 4 hours later — validates `dismissal-date` handling)
- [ ] iOS countdown (`Text(timerInterval:)`) renders correctly without manual updates
- [ ] Test across: iPhone with notch, iPhone with Dynamic Island, iPad, different iOS versions (16.1+, 17.0, 17.2+, 18+)
- [ ] No console errors, no crashes, no memory leaks after repeated start/end cycles

**Milestone:** At the end of Phase 1, the infrastructure for Options A, B, and C is all built and validated. The test button proves Live Activities work end-to-end in Archives Expo. Everything from here is wiring triggers to existing flows.

---

### Phase 2 — Daily Story Resume Infrastructure (prerequisite for Phase 3)

**Goal:** Enable resumable daily stories, otherwise DailyStoryActivity would mislead users ("2/3 done" but app restarts from card 1).

- [ ] Extend `hooks/useDailyStoryTracking.ts` to persist current card index to `AsyncStorage` under key `@daily_story_progress_${date}`
- [ ] Modify `app/(tabs)/today.tsx` to read saved progress on mount and resume from the correct card
- [ ] Clear saved progress on `reportTodayComplete()` or when the date rolls over
- [ ] Test: start story → close app → reopen → verify resume at correct card

---

### Phase 3 — DailyStoryActivity Auto-Trigger (daily story exit)

**Goal:** Wire DailyStoryActivity to fire automatically when a user exits mid-story. This uses the infrastructure from Phase 1 — no new components, just new trigger wiring.

- [ ] Extend `AppState` listener in `app/_layout.tsx` to handle `'background'` transitions
- [ ] Hook into `useDailyStoryTracking` cleanup: on unmount without completion, call `LiveActivityService.startDailyStory()`
- [ ] Hook into `reportTodayComplete()` in `gamification/engines/GamificationOrchestrator.tsx` to call `LiveActivityService.endDailyStory()`
- [ ] Deep link handler: when user taps activity → open today tab and resume
- [ ] Test: start story → exit mid-story → verify activity appears on lock screen
- [ ] Test: tap activity → deep link into today tab → resume story at correct card
- [ ] Test: complete story after resume → activity disappears
- [ ] Test: 8h timeout → activity auto-ends gracefully

---

### Phase 4 — StreakGuardActivity Auto-Trigger (Option A: pure local)

**Goal:** Wire StreakGuardActivity to fire automatically on app foreground when streak is at risk. Opening the app is the user-initiated trigger. Uses Phase 1 infrastructure — just a new trigger wired to existing foreground lifecycle.

- [ ] Logic in `app/_layout.tsx` AppState `'active'` handler: if `now >= 22:00 local && streak > 0 && !completedToday && !hasActiveActivity` → `LiveActivityService.startStreakGuard()`
- [ ] Enforce once-per-day trigger (use `@streak_guard_shown_date` AsyncStorage guard)
- [ ] Hook `reportTodayComplete()` to call `LiveActivityService.endStreakGuard()` with success state
- [ ] Handle conflict: if DailyStoryActivity is already running, skip StreakGuard
- [ ] Verify HIG framing: document "app open at 22:00 with active streak" as user-initiated trigger for App Store reviewer notes
- [ ] Test: simulate time > 22:00 → open app → verify activity appears
- [ ] Test: completing story while activity is live → activity ends with success state
- [ ] Test: reaching midnight → activity auto-ends

---

### Phase 5 — Option B: Notification Type Check + Fallback to Option A

**Goal:** Extend reach to users who don't open the app on their own. **This is a simple layer on top of Phase 4** — the deep link handler just checks notification type and calls the same Option A foreground-check logic. Minimal new code on the client side.

**Backend work (Supabase + Affinity Notification Service):**

- [ ] Supabase `pg_cron` job running at 22:00 local time per user timezone bucket
- [ ] SQL function for eligible-users query: `streak > 0 AND last_completed_at < today AND push_token IS NOT NULL AND notification_opt_in = true`
- [ ] New push notification template `streak_reminder_evening` via Affinity Notification Service
  - Title: "Your {streak} day streak ends tonight"
  - Body: "{minutes} minutes to keep the flame alive"
  - Deep link: `archives://today?source=streak_reminder`
- [ ] Test cron manually via SQL → verify push arrives within 5 minutes of 22:00

**Client work (trivial — just a type check):**

- [ ] Deep link handler in `app/_layout.tsx` or equivalent: detect `source=streak_reminder` in URL params
- [ ] On detection: run the same Phase 4 foreground-check logic (`if conditions met → startStreakGuard()`)
- [ ] No new trigger path — just an upstream mechanism that leads to the Phase 4 check

**PostHog events:**

- [ ] `streak_reminder_push_sent` (backend-fired)
- [ ] `streak_reminder_push_tapped` (client-fired on deep link)
- [ ] `streak_reminder_activity_started` (when Phase 4 check passes after push tap)

**Validation:**

- [ ] Trigger cron manually → verify push arrives
- [ ] Tap push → verify app opens and StreakGuardActivity appears within 1 second
- [ ] Verify graceful degradation: if push fails, Phase 4 foreground check still catches users who open the app on their own

---

### Phase 6 — Option C: Push-to-Start Research & Testing (empirical validation)

**Goal:** Register push-to-start tokens, build a backend test harness for sending push-to-start APNs pushes, and **empirically test reliability on real devices before committing to productionize**. This is a research phase, not a feature ship. Based on test results, we'll decide whether to move Option C to production.

**Client work — token registration:**

- [ ] Implement `Activity<StreakGuardAttributes>.pushToStartTokenUpdates` async sequence listener at app launch (in `app/_layout.tsx` or a dedicated service)
- [ ] On token update: POST to backend endpoint to store/update the token
- [ ] Implement `Activity<DailyStoryAttributes>.pushToStartTokenUpdates` similarly
- [ ] Log all token events to PostHog with device info for later analysis

**Backend work — token storage and test harness:**

- [ ] Create new Supabase table `live_activity_push_tokens(user_id, device_id, attribute_type, token, created_at, updated_at)`
- [ ] Create backend endpoint `POST /api/live-activity-tokens` for token registration
- [ ] Set up Apple Developer `.p8` provider key (if not already present)
- [ ] Build ES256 JWT signing helper
- [ ] Build test harness script (manual CLI or admin panel button) that sends a Live Activity push with correct headers and payload:
  - `POST /3/device/<push_to_start_token>`
  - `authorization: bearer <ES256 JWT>`
  - `apns-push-type: liveactivity`
  - `apns-topic: ai.affinitylabs.archivesexpo.push-type.liveactivity`
  - `apns-priority: 10`
  - Payload: `{ "aps": { "timestamp", "event": "start", "attributes-type": "StreakGuardAttributes", "attributes": {...}, "content-state": {...}, "alert": {...}, "dismissal-date": <past timestamp> } }`
- [ ] See §8.4.2 APNs components table for the full reference

**User-driven test plan:**

The user (Huy) will personally test the following scenarios on real devices and log results:

- [ ] Fresh install → token generated? How soon?
- [ ] Existing install (upgrade) → token generated? Reliability?
- [ ] Device restart → does token regenerate?
- [ ] App force-closed → push still starts activity?
- [ ] App terminated for hours → push still starts activity?
- [ ] Cross-device: iPhone 13 (no Dynamic Island), iPhone 15 Pro (Dynamic Island), iPad
- [ ] Cross-iOS: 17.2, 17.5, 18.0, 18.1+
- [ ] Measure: what percentage of existing users will have valid tokens within 24 hours of deploy?
- [ ] Document any silent failures, token rotation events, race conditions

**Decision point at end of Phase 6:**

Based on empirical reliability data, decide:
- **Green light**: If tokens generate reliably for >80% of test devices, productionize Option C as a reach expansion
- **Yellow light**: If tokens generate for 40–80%, ship as supplement to Option B (not replacement)
- **Red light**: If tokens generate for <40%, defer Option C and stick with A + B

This is the key difference from the original plan: **we decide based on data, not forum anecdotes**. See §8.4.2 for documented constraints and reliability concerns to watch for during testing.

---

### Phase 7 — Robustness and Edge Cases

- [ ] Handle user revoking Live Activity permission (Settings → Face ID & Passcode → Allow on lock screen)
- [ ] Enforce maximum of one activity per type simultaneously
- [ ] Handle orphan activities on app launch: `endAll()` any activity where date mismatches or streak was already completed
- [ ] Add PostHog events: `live_activity_started`, `live_activity_updated`, `live_activity_ended`, `live_activity_tapped`
- [ ] Handle localization — DM Sans does not render in Live Activities, must use SF Pro (accept brand trade-off)
- [ ] Handle timezone changes mid-day
- [ ] **Set `dismissal-date` to a past timestamp when ending activities** — without this, iOS keeps the activity on the lock screen for up to 4 hours after end. For StreakGuardActivity ending at midnight, lingering until 04:00 would confuse users whose streak has already reset. See §8.4.2 Constraint 6
- [ ] Handle `frequentPushesEnabled` permission toggle (force-ends all activities when toggled off — see §8.4.2 Constraint 7)

---

### Phase 8 — App Store Submission and Monitoring

- [ ] Verify HIG compliance checklist: user-initiated (app foreground action), bounded (midnight end), actively tracked (countdown), under 8h (midnight is ≤2h from 22:00)
- [ ] Prepare App Store reviewer notes explaining both activities:
  - DailyStoryActivity: *"Starts when a user begins a daily story and backgrounds the app before completing it. Tracks their progress through the 3-card story and ends on completion, similar to Uber Eats tracking an active order."*
  - StreakGuardActivity: *"Starts when a user opens the app after 22:00 with an at-risk streak. The app-open action while in this state is the user-initiated signal to track end-of-day progress on the lock screen, similar to how iOS Weather and Clock's Timer auto-update on foreground."*
- [ ] Submit build with detailed screenshots of the flow
- [ ] Add feature flag `enableLiveActivities` via PostHog so we can disable remotely if reviewer feedback requires
- [ ] Monitor rejection feedback and have a Plan B ready

---

## 5. Out of Scope (Deferred)

Per the current ticket scope, the following are explicitly not part of this plan:

- **Home Screen Widgets** (iOS + Android) — deferred to separate ticket
- **Push-based Live Activity updates** (server-driven from backend) — Phases 1–3 use local updates only; add later if real-time sync is needed
- **Android equivalent** (Live Updates on Android 14+) — iOS-only for now
- **Apple Watch Smart Stack integration** — future feature
- **Broadcast push** (iOS 18+) — only needed if concurrent activities exceed ~10,000

---

## 6. Risks and Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Voltra not mature enough for production | Medium | Phase 0 POC gate; `expo-live-activity` as fallback |
| App Store rejects `StreakGuardActivity` | Medium | Phase 4 auto-trigger after Phase 1 foundation is validated; document "opening the app after 22:00 with an at-risk streak" as the user-initiated framing in reviewer notes; feature flag ready for remote disable |
| Daily story resume logic conflicts with existing tracking | Medium | Phase 2 before Phase 3; thorough regression tests |
| New Architecture (React 19 / RN 0.81) incompatibility | Low–Medium | Verify during Phase 0 POC; check Voltra release notes |
| 8h max duration cuts activity short | Low | Graceful end state; PostHog tracks abandonment |
| DM Sans does not render in Live Activities | Low | Accept SF Pro; preserve branding via color palette |
| Users disable lock-screen notifications | Low | Track opt-out rate; push notifications remain as fallback |
| Midnight timezone edge cases | Medium | Reuse existing date utilities in codebase; verify UTC vs local handling |

---

## 7. Success Metrics

Post-launch measurement via PostHog events (infrastructure in `services/AnalyticsService.ts` already exists):

- **Daily Story Completion Rate** (primary) — expect +15–25% lift for users exposed to Live Activity
- **Return Rate after Exit Mid-Story** — percent of users who return within the same day after backgrounding mid-story
- **Live Activity Tap-Through Rate** — percent of activities that get tapped
- **Streak Retention** — percent of users maintaining a streak ≥ 7 days
- **App Store Rating Impact** — monitor 7 / 14 / 30 days post-launch

---

## 8. Backend Architecture — Trigger Mechanisms

A common misconception when implementing Live Activities in React Native is to assume all triggers require a backend cronjob + APNs infrastructure. This is **not the case** for most use cases. ActivityKit provides four distinct mechanisms, and the right choice depends on the activity type.

### 8.1 The four mechanisms

| Mechanism | Triggered by | Backend required? | iOS version | HIG risk |
|---|---|---|---|---|
| **Local start** (`Activity.request()`) | App code while app is alive | No | 16.1+ | Safe |
| **Local update** (`activity.update()`) | App code while app is alive | No | 16.1+ | Safe |
| **Remote update** (APNs push, `event: "update"`) | Backend, app can be killed | Yes | 16.1+ | Safe |
| **Push-to-start** (APNs push, `event: "start"`) | Backend, app need not be open | Yes | 17.2+ | Risky |

### 8.2 Critical insight: OS-driven countdown vs. app-driven countdown

ActivityKit supports two fundamentally different ways to render a countdown:

1. **App-driven countdown** — the app sends an `update` with `minutesRemaining: 42`, then `41`, etc. Requires either a local timer while foregrounded or remote pushes at regular intervals.

2. **OS-driven countdown** — the app sets `endDate: midnight` **once** when starting the activity, and the Live Activity's SwiftUI view uses `Text(timerInterval: startDate...endDate, countsDown: true)`. iOS renders the countdown natively on the lock screen with zero additional updates.

**Both `DailyStoryActivity` and `StreakGuardActivity` should use OS-driven countdown.** This eliminates the need for periodic updates and dramatically simplifies the backend requirements. Updates are only sent when state changes meaningfully (e.g., user completes a story card, streak is extended).

### 8.3 DailyStoryActivity flow — pure local, zero backend

Because the daily story exit scenario requires the app to already be alive (the user started a story), the entire lifecycle runs locally:

1. User starts a story → `useDailyStoryTracking.trackCardViewed()` — **no activity yet**
2. User backgrounds the app mid-story → `AppState` transition → `LiveActivityService.startDailyStory()` — **local start**
3. iOS renders the progress + time-remaining natively using `endDate = min(midnight, now + 8h)`
4. User taps the activity → deep link back to today tab → completes the story
5. `reportTodayComplete()` → `LiveActivityService.endDailyStory()` — **local end**

**Backend infrastructure required:** none.

### 8.4 StreakGuardActivity flow — three architecture options

The streak reminder at 22:00 is where the backend question becomes real. There are three viable architectures, each with different trade-offs between user reach, HIG risk, infrastructure complexity, and engineering effort. This section presents all three in detail so that stakeholders (COO, CTO, Engineering) can make an informed decision.

#### Side-by-side comparison

| Criterion | Option A — Pure Local | Option B — Option A + Push Notification | Option C — Push-to-Start |
|---|---|---|---|
| **How it starts** | User opens app after 22:00 → foreground check → activity starts directly | Push notification at 22:00 → user taps → app opens → same foreground check as A → activity starts | Backend sends a Live Activity push — activity appears on lock screen without user action |
| **Relationship** | Standalone | Extends Option A — reuses 100% of client-side code, adds backend push | Parallel architecture — no client-side reuse |
| **Backend required** | None | `pg_cron` + existing Affinity Notification Service | Full APNs Live Activity infra (ES256 JWT, token storage, payload signing) |
| **HIG compliance** | Low-to-moderate (opening the app is the user action) | Same as Option A (B just adds an upstream push tap that leads to app open) | High risk (auto-triggered) |
| **iOS minimum** | 16.1+ (reaches 99.1% of iOS users) | 16.1+ (reaches 99.1% of iOS users) | 17.2+ (reaches 96.9%; only 2.2% marginal gap vs B — see §8.4.1) |
| **User reach** | Only users who open app after 22:00 | All users with notifications enabled, plus Option A's organic opens | All iOS 17.2+ users with push-to-start tokens |
| **Infra complexity** | Zero | Low (reuses existing infra + Option A's client code) | High (new infra + maintenance) |
| **Engineering effort** | Small (days) | Small + backend (days + ~1 week backend) | Large (a week or more + ongoing maintenance) |
| **App Store rejection risk** | Low-to-moderate | Same as A | Significant |
| **Build phase** | Phase 1 (infrastructure) + Phase 4 (auto-trigger) | Phase 5 (trivial extension over Phase 4) | Phase 6 (research + user testing; decision after) |

---

#### §8.4.1 iOS version distribution (real data)

An earlier draft of this plan estimated that iOS 17.2+ gating would exclude roughly 15% of the iOS user base — a rough industry-wide number. The actual PostHog-measured distribution for Archives Expo is significantly different and materially sharpens the Option C analysis.

**Data source:** PostHog queries against the Archives Expo production project, run April 2026.

##### Full three-tier breakdown

| Tier | iOS range | Users | Percentage | What can they use? |
|---|---|---|---|---|
| Excluded | iOS < 16.1 | 237 | 0.9% | Nothing — ActivityKit was introduced in iOS 16.1 |
| Live Activities only | iOS 16.1 to < 17.2 | 590 | 2.2% | Can use local-start Live Activities (Options A and B), but NOT push-to-start (Option C) |
| Full capability | iOS 17.2+ | 25,559 | 96.9% | Can use everything, including push-to-start (Option C) |
| **Total** | | **26,386** | **100%** | |

##### Reach implications per option

| Option | Theoretical reach ceiling | Notes |
|---|---|---|
| A — Pure Local | 99.1% (26,149 users) | Limited by iOS 16.1+ floor; further limited in practice to users who open the app after 22:00 |
| B — Push + Deep Link | 99.1% (26,149 users) | Same ceiling as A; further limited in practice by notification permission rate and push tap rate |
| C — Push-to-Start | 96.9% (25,559 users) | iOS 17.2+ ceiling; further limited in practice by push-to-start token validity (iOS revokes tokens for lapsed users) |

##### The marginal reach gap between B and C

The difference between Option B's ceiling and Option C's ceiling is only **590 users (2.2%)** — the cohort on iOS 16.1 to < 17.2 who can receive push notifications (via Option B) but cannot receive push-to-start payloads (via Option C).

Because Option C requires building a full APNs Live Activity infrastructure from scratch and carries significant HIG rejection risk, **the cost-per-user-reached for Option C is extremely unfavorable**. We would be investing meaningful backend engineering effort, accepting App Store review risk, and taking on ongoing maintenance burden — all to potentially reach an additional 2.2% of users. And in practice Option C's reach is likely *lower* than Option B's, because push-to-start tokens expire for the lapsed-user population that is precisely the audience a streak reminder is meant to reach.

**This reframes the Option C question as arithmetic, not judgment:** "Is it worth building full APNs Live Activity infrastructure to reach an additional ~2.2% of users, knowing the effective reach is likely even lower?" For almost any reasonable answer, the cost is not justified.

##### What this data does NOT change

- HIG compliance risk remains high (auto-triggered Live Activities without user action)
- Infrastructure complexity (ES256 JWT signing, token rotation, APNs payload management) remains unchanged
- Push-to-start token expiration for lapsed users remains a problem
- Ongoing maintenance burden remains unchanged
- Duolingo's precedent remains unchanged — they still don't use push-to-start

##### What this data does change

- The "iOS version gate excludes ~15% of users" argument used in the original draft no longer holds — the real gate is only 2.2% between B and C, and only 0.9% for Options A and B against a total floor
- Options A and B effectively cover our entire addressable iOS user base (99.1%), which is a very strong reach guarantee for both
- Option C's marginal reach benefit over Option B is only 2.2% in the best case, and likely negative in practice due to token expiration for lapsed users
- Broader implication: the Archives Expo user base updates iOS aggressively, which means iOS 18+ features (broadcast push, enhanced Dynamic Island variants, Smart Stack on watchOS 11) are available to ~90%+ of users for future phases

##### Bottom-line on the recommendation

Build Option A as the foundation (Phase 4), layer Option B on top as a notification-aware reach extension (Phase 5), and treat Option C as a research phase to be tested empirically (Phase 6). The granular data in §8.4.1 shows that Options A and B together cover 99.1% of iOS users in theory; Option C's marginal reach ceiling is +2.2% (590 users), but reliability testing in Phase 6 will determine whether that marginal gain is worth productionizing.

---

#### §8.4.2 Technical reference for Option C (push-to-start) — constraints to test in Phase 6

> **Note on framing:** An earlier draft of this section argued that Option C "cannot ship immediately" based on forum reports of token generation failures. That was overstated — production apps (District iOS, Reeder, Sparkle-like apps using Braze/OneSignal SDKs) ship push-to-start successfully, and Apple actively promotes the feature. The honest position is that push-to-start is **feasible but has reliability quirks that must be tested empirically on our specific app and user base**. This subsection now documents each constraint as a **test scenario for Phase 6**, not as a reason to defer the feature. The user will personally test these scenarios and the team will decide whether to productionize based on the data.

##### Constraint 1 — Push-to-start token generation is reliable in some cases, flaky in others (TEST IN PHASE 6)

Apple's [`pushToStartTokenUpdates`](https://developer.apple.com/documentation/activitykit/activity/pushtostarttokenupdates) is an async sequence that fires tokens when they become available. Community reports and production deployments paint a mixed picture:

**What we know works:**
- Major SDKs (Braze, OneSignal, Firebase FCM, Pushwoosh) all support push-to-start in production
- Apps like District iOS ship push-to-start successfully at scale
- Apple actively promotes the feature in marketing and WWDC sessions
- Token registration in `didFinishLaunchingWithOptions` is the documented best practice

**What we know is flaky (from developer forums):**
- Some developers report: *"Getting a push-to-start token works when running from source; however, if you force close the test app then open it again, the push-to-start token is not given."* ([Apple Developer Forums](https://developer.apple.com/forums/thread/805324))
- Some devices reportedly refuse to issue push-to-start tokens entirely, with silent failures and no error logs
- Tokens are issued **once** per app install lifecycle, then rotated via `pushToStartTokenUpdates` after use
- An earlier forum quote — *"The iOS operating system only generates push-to-start tokens during the first app install after a device is restarted"* — was interpreted in an earlier draft of this plan as an Apple canonical rule. It appears to be a specific reliability workaround rather than the general rule.

**Phase 6 test scenarios:**

The user (Huy) will personally test on real devices to gather empirical data:

- [ ] Fresh install → token generated? Within seconds, minutes, or not at all?
- [ ] App upgrade (not uninstall/reinstall) → token generated? Does iOS treat upgrade as fresh install?
- [ ] Force-close the test app, reopen → token still received?
- [ ] Device restart → does token regenerate automatically?
- [ ] Cross-device matrix: iPhone 13, iPhone 15 Pro, iPad, iOS 17.2 / 17.5 / 18.x
- [ ] Measure: among a test cohort of devices, what percentage receive a valid token within 24 hours of app install/update?

**Decision after Phase 6:**

- If token generation works reliably (>80% of devices) → Option C is viable; productionize
- If token generation is mixed (40–80%) → Option C ships as a supplement to Option B, not a replacement
- If token generation is unreliable (<40%) → Option C deferred; stick with A + B

This constraint is **not a blocker** — it is a **measurement question** that Phase 6 is specifically designed to answer.

##### Constraint 2 — Live Activities must represent user-initiated tasks (HIG policy)

Apple's [Human Interface Guidelines for Live Activities](https://developer.apple.com/design/human-interface-guidelines/live-activities/) state that a Live Activity must track "an individual ongoing task or live event" that the person is "actively aware of and interested in tracking in real time." The original feasibility review ([AFF-383-live-activity-feasibility-review.md](AFF-383-live-activity-feasibility-review.md)) quoted these rules and was the basis for rejecting the first iteration of the design.

For push-to-start specifically, the concern is that a Live Activity appearing on the lock screen without any prior user action within the app is on a collision course with the "user-initiated task" rule. Apple's ActivityKit team has reiterated this expectation publicly in [10 Questions with the Live Activities Team](https://developer.apple.com/news/?id=qpqf1gru), where they describe Live Activities as tracking tasks with "a definite beginning and end" — implying the beginning must come from the user.

This does not strictly prohibit push-to-start, but it means Apple reviewers apply extra scrutiny to apps that use it. A habit-tracking / learning app like Archives Expo is precisely the category Apple has historically flagged for "notification replacement" behavior, and push-to-start streak reminders would sit squarely in that flagging zone.

##### Constraint 3 — Live Activity update tokens expire after eight hours

Apple's [Starting and updating Live Activities with ActivityKit push notifications](https://developer.apple.com/documentation/activitykit/starting-and-updating-live-activities-with-activitykit-push-notifications) documentation establishes that Live Activity duration is bounded. Braze SDK's Live Activities guide summarizes:

> "Live Activity update tokens expire after eight hours, which affects long-running activities requiring continuous updates."

Combined with the activity's 8-hour active duration cap (also documented in the original feasibility review), this means any Option C implementation must be prepared to handle token expiration mid-activity. While our planned activities (streak countdown from 22:00 to midnight = 2 hours) fit comfortably within 8 hours, this constraint adds operational complexity that Options A and B avoid entirely (they use local `Activity.request()` which does not depend on push tokens).

##### Constraint 4 — Push tokens can change during a Live Activity's lifetime

Per the same Apple documentation (via [APNsPush integration guide](https://apnspush.com/how-to-start-and-update-live-activities-with-push-notifications)):

> "The push token for a Live Activity may change throughout its duration, requiring servers to invalidate outdated tokens."

This means the backend must listen for token update events and propagate them to its token storage, handle race conditions between token rotation and in-flight push deliveries, and implement retry logic for pushes that fail because of stale tokens. This is standard APNs infrastructure work, but it is meaningful engineering overhead that Options A and B do not incur.

##### Constraint 5 — Certificate-based authentication is not supported

Per Apple's [Starting and updating Live Activities with ActivityKit push notifications](https://developer.apple.com/documentation/activitykit/starting-and-updating-live-activities-with-activitykit-push-notifications) documentation:

> "Certificate-based authentication is not supported for these APNs pushes. You should use token-based authentication instead."

This means Option C requires an Apple Developer `.p8` provider key and an ES256-signed JWT for every APNs request. Existing .p12 certificate-based push infrastructure (if any) cannot be reused. The backend must implement JWT signing, rotation, and secret management from scratch.

##### Constraint 6 — Activity duration and dismissal timing

Per Apple's documentation:

> "Once started, a live activity is alive for 8 hours unless the app or user ends it."

> "When you end a Live Activity, by default the Live Activity appears on the Lock Screen for up to four hours after it ends to allow people to glance at their phone to see the latest information."

The `dismissal-date` field controls the post-end lock screen lifetime:
- Omitted or > 4h in the future → Apple clamps to a maximum of 4 hours
- In the past → immediate removal
- Within 4 hours → honored exactly

**Implication for StreakGuardActivity:** if we end the activity at midnight without setting `dismissal-date` to a past timestamp, the activity will linger on the lock screen until ~04:00 the next day, which could confuse users whose streak has already reset. **The implementation must explicitly set `dismissal-date` to a past timestamp when ending the activity.** This applies to all three options, not just Option C — it is a general ActivityKit behavior we need to handle.

##### Constraint 7 — Frequent updates budget can end all activities

Per Apple's documentation, apps that request frequent push updates must respect the user's permission state:

> "Your server should adjust its update frequency according to the frequent updates value, checking it once after an activity starts. If this value changes, the system will end all ongoing activities."

If the user toggles the "Frequent Updates" permission off mid-activity, **iOS force-ends every active Live Activity from our app** — not just the one affected. The backend must check `ActivityAuthorizationInfo.frequentPushesEnabled` after each activity start and handle the force-end case gracefully.

##### Constraint 8 — Content state encoding must match exactly

> "Always use default encoding strategies to encode your data, or the system can't decode the JSON payload which results in update failures."

The backend must encode `content-state` JSON using the exact field names and types declared in the Swift `ActivityAttributes.ContentState` struct. Any divergence (custom encoders, snake_case vs camelCase, missing optional fields) causes silent update failures. This adds schema versioning complexity — if the struct changes, backend serialization must update in lockstep.

##### Full list of required APNs components for Option C

For completeness, a working Option C implementation would require the backend to handle:

| Component | Required value / behavior | Source |
|---|---|---|
| HTTP method and path | `POST /3/device/<push_to_start_token>` | [APNsPush](https://apnspush.com/how-to-start-and-update-live-activities-with-push-notifications) |
| `authorization` header | `bearer <provider_token>` (ES256-signed JWT with .p8 key) | [Apple ActivityKit push docs](https://developer.apple.com/documentation/activitykit/starting-and-updating-live-activities-with-activitykit-push-notifications) (Constraint 5) |
| `apns-push-type` header | `liveactivity` | Apple ActivityKit push docs |
| `apns-topic` header | `ai.affinitylabs.archivesexpo.push-type.liveactivity` | Apple ActivityKit push docs |
| `apns-priority` header | `5` (low) or `10` (immediate delivery) | Apple ActivityKit push docs |
| `timestamp` payload field | UNIX epoch seconds, **must change with each notification** | Apple ActivityKit push docs |
| `event` payload field | `start` / `update` / `end` | Apple ActivityKit push docs |
| `content-state` payload field | Matches `Activity.ContentState` type exactly (Constraint 8) | Apple ActivityKit push docs |
| `attributes-type` payload field | Names the `ActivityAttributes` type (start events only) | Apple ActivityKit push docs |
| `attributes` payload field | Static data (start events only) | Apple ActivityKit push docs |
| `stale-date` payload field | UNIX epoch — when activity content becomes "stale" | Apple ActivityKit push docs |
| `relevance-score` payload field | Number — priority for Dynamic Island stacking | Apple ActivityKit push docs |
| `dismissal-date` payload field | UNIX epoch — when to remove from lock screen after end (max 4h cap, Constraint 6) | Apple ActivityKit push docs |
| JWT signing | ES256 algorithm with Apple Developer `.p8` provider key | Apple ActivityKit push docs (Constraint 5) |
| Token management | Store, rotate, invalidate push-to-start tokens AND per-activity update tokens | Apple ActivityKit push docs (Constraints 1, 4) |
| Frequent updates handling | Check `ActivityAuthorizationInfo.frequentPushesEnabled` and handle force-end events | Apple ActivityKit push docs (Constraint 7) |
| Rate / error handling | Handle APNs 4xx/5xx errors, backoff, dead-letter queue | APNsPush / Apple docs |

These are all sourced from Apple's official documentation (access in a JavaScript-enabled browser at [developer.apple.com/documentation/activitykit/starting-and-updating-live-activities-with-activitykit-push-notifications](https://developer.apple.com/documentation/activitykit/starting-and-updating-live-activities-with-activitykit-push-notifications)) and the verbatim third-party references listed in Appendix B ([APNsPush reference](https://apnspush.com/how-to-start-and-update-live-activities-with-push-notifications) and [Braze ActivityKit guide](https://www.braze.com/docs/developer_guide/live_notifications/live_activities)).

##### Phase 6 test matrix — all Option C constraints to validate empirically

| # | Constraint | What to test in Phase 6 | Apple source |
|---|---|---|---|
| 1 | Push-to-start token generation reliability | Fresh install, app upgrade, force-close, device restart — measure success rate on real devices | `pushToStartTokenUpdates` docs |
| 2 | HIG "user-initiated" requirement | Submit to App Store review with reviewer notes; track rejection outcome | Live Activities HIG |
| 3 | Update tokens expire at 8h | Verify token lifecycle handling in test harness | ActivityKit push docs |
| 4 | Push tokens rotate mid-activity | Test concurrent push delivery + token rotation; measure race condition rate | `pushToken` docs |
| 5 | Certificate-based auth not supported | Build ES256 JWT signing helper with `.p8` key; verify valid APNs auth | ActivityKit push docs |
| 6 | `dismissal-date` max 4h clamp | Verify activity disappears immediately when `dismissal-date` is set to a past timestamp | ActivityKit push docs |
| 7 | Frequent updates toggle force-ends all activities | Toggle permission mid-test, verify backend handles force-end gracefully | ActivityKit push docs |
| 8 | Content state encoding must match Swift struct exactly | Verify payload encoding matches `ActivityAttributes.ContentState` definition exactly | ActivityKit push docs |
| — | Marginal reach vs Option B | Compare reach data post-launch: Option B reach vs Option C incremental reach | PostHog production data (post-Phase 5) |

**Decision after Phase 6:** If the test matrix shows reliable behavior (token generation >80%, no silent failures, graceful handling of edge cases), Option C is viable and should be productionized. If results are mixed or unreliable, defer and rely on Options A + B.

**Important:** Constraint 6 (`dismissal-date` 4h clamp) applies to *all three options*, not just Option C. Even local-start Live Activities need to set `dismissal-date` to a past timestamp when ending, or they linger on the lock screen for up to 4 hours after the activity ends. This is covered in Phase 7 (Robustness) and applies to `LiveActivityService.endStreakGuard()` and `LiveActivityService.endDailyStory()`, not just push-based flows.

---

#### Option A — Pure Local (recommended)

**Elevator pitch:** The simplest possible implementation. When a user opens the app in the evening and hasn't completed today's story, the app automatically starts a Live Activity that runs until midnight or until they complete the story. Opening the app is the user-initiated trigger — no modal, no prompt, no additional UI. Fully local, zero backend.

**Flow diagram:**

```
┌─────────────────────────────────────────────────────────┐
│ User opens app after 22:00 local time                   │
│ (opening the app is the user-initiated action)          │
│ AppState 'background' → 'active' transition             │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ App code checks conditions (all in JS):                 │
│   • now >= 22:00 local time                             │
│   • streak > 0                                          │
│   • !completedToday                                     │
│   • !hasActiveActivity                                  │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼ (conditions met)
┌─────────────────────────────────────────────────────────┐
│ LiveActivityService.startStreakGuard() — LOCAL START    │
│ endDate = midnight (iOS renders countdown natively)     │
│ No modal, no additional confirmation step               │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ End conditions:                                         │
│ • User completes story → reportTodayComplete()          │
│   → LiveActivityService.endStreakGuard() LOCAL          │
│ • Midnight reached → iOS auto-ends (endDate passed)     │
└─────────────────────────────────────────────────────────┘
```

**Pros:**
- Zero backend infrastructure — nothing new to build, deploy, or maintain
- Low HIG risk — opening the app is an accepted "user-initiated" trigger pattern (same as iOS Weather auto-updating on open, Clock Timer showing on foreground)
- No new UI components required — no modals, no prompts, nothing new to design
- Smallest engineering effort — can be built end-to-end during Phase 4
- Works on iOS 16.1+, widest reach among the three options
- No server-side state to manage or debug

**Cons:**
- Users who forget to open the app entirely will never see the reminder — coverage gap
- Only a subset of daily-active users get the Live Activity experience
- Cannot reach "lapsed" users who are at highest streak-break risk
- Slightly weaker HIG defense than a button-tap pattern — relies on "opening the app" as the user action rather than an explicit in-app tap. Still defensible but not as airtight as Apple's own Timer pattern

**Backend requirements:** None.

**Engineering effort:** Small — a few days of work within Phase 4 of the implementation plan (once the Phase 1 infrastructure is in place).

**HIG risk analysis:** Low-to-moderate. Apple's HIG accepts "app launch while in a specific state" as a valid user-initiated trigger — this is how many Live Activities in the App Store actually ship. The closest precedent is an app auto-starting a Live Activity when the user opens it while a relevant task is active. The argument to App Store reviewers: "The user opened the app at 22:00 while their streak was at risk. That open action, combined with the at-risk state, is the user-initiated signal to start tracking their end-of-day progress on the lock screen." This is weaker than a button tap but still well within HIG norms.

**User reach analysis:** Limited to users who open the app after 22:00 local time. Based on typical learning-app patterns, this is often 40–70% of daily active users. Users who are "at risk" of losing their streak are often precisely the ones who *don't* open the app — meaning this option may miss the highest-value audience. **This is the core reason Option B exists** — to reach the users who would not otherwise open the app.

**Failure mode:** If Apple rejects the foreground-check pattern, the fallback is to require an explicit user tap (e.g., adding a streak reminder button on the today tab, leveraging existing UI rather than introducing a new modal). The more likely failure mode is low reach: if metrics show most at-risk users never open the app on their own, Option B becomes necessary to close the gap.

**What "done" looks like:**
- User opens app after 22:00 without completing today's story
- App detects conditions within 1 second of foregrounding
- Activity appears on lock screen next time user locks their phone
- Activity disappears on completion or at midnight

---

#### Option B — Cronjob + Standard Push Notification + Deep Link (optional extension)

**Elevator pitch:** This is what Duolingo actually does. At 22:00 local time per user, a backend cron queries Supabase for users whose streak is at risk and sends a regular push notification (not a Live Activity push). When the user taps the push, the app opens via deep link. The deep-link handler runs the **exact same foreground check as Option A**, and if conditions are met, the Live Activity starts. Option B is essentially "Option A + a backend push to get users to open the app".

**Key clarification 1 — "Standard push, not Live Activity push":** The push notification is a **standard alert-style push**, the same kind Duolingo sends for "You haven't practiced today!" reminders. It is NOT an ActivityKit push. The Live Activity itself is still started locally from within the app — we just use the push as a mechanism to get the user to open the app.

**Key clarification 2 — "Option B extends Option A":** Option B reuses 100% of Option A's client-side code. There is no separate activation path, no modal, no additional UI. The push tap triggers the app to open, and from there the same Option A foreground-check logic runs. This means the incremental engineering cost of building Option B on top of Option A is just the backend work (cron + push template + deep link handler).

**Flow diagram:**

```
┌─────────────────────────────────────────────────────────┐
│ Supabase pg_cron runs at 22:00 local time per user      │
│ Query:                                                  │
│   SELECT user_id, push_token FROM users                 │
│   WHERE last_completed_at < today                       │
│     AND streak > 0                                      │
│     AND push_token IS NOT NULL                          │
│     AND notification_opt_in = true                      │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ Backend sends STANDARD push notification                │
│ (not a Live Activity push — just a normal alert)        │
│ Via existing Affinity Notification Service              │
│                                                          │
│ Title: "Your 12-day streak ends tonight"                │
│ Body: "2 minutes to keep the flame alive"               │
│ Deep link: archives://today?source=streak_reminder      │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ User taps push → iOS opens app via deep link            │
│ App deep-link handler detects source=streak_reminder    │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼ (push tap is the user-initiated trigger)
┌─────────────────────────────────────────────────────────┐
│ LiveActivityService.startStreakGuard() — LOCAL START    │
│ No separate modal step — the push tap itself satisfies  │
│ the HIG "user-initiated" requirement                    │
└─────────────────────────────────────────────────────────┘
```

**Pros:**
- Reaches users who wouldn't otherwise open the app — solves Option A's coverage gap
- Still fully HIG compliant — the Live Activity is user-initiated via the push tap
- Reuses the existing `Affinity Notification Service` infrastructure — no new system to build
- Mirrors Duolingo's proven pattern exactly
- `pg_cron` is a standard Supabase feature, low maintenance
- Easy to A/B test (send push to 50%, compare streak retention)

**Cons:**
- Requires a backend cronjob to build, test, and maintain
- Requires timezone-aware scheduling (harder than it sounds — see §6 risk table)
- Depends on push notification permissions — users who disabled notifications are unreachable
- Adds a new Supabase query pattern that needs to scale with user growth
- Still inherits Option A's HIG risk profile — the activity starts automatically on app foreground after the push tap, so the "user-initiated" defense is the same as Option A (opening the app is the action)

**Backend requirements:**
- Supabase `pg_cron` extension enabled
- New SQL function for the eligible-users query (streak at risk, not yet completed, push token present)
- Timezone-aware scheduling — run the job for each timezone bucket at its local 22:00
- New push notification template: "streak_reminder_evening"
- Deep link handler in app to detect `source=streak_reminder` and immediately run the Option A foreground check
- PostHog events: `streak_reminder_push_sent`, `streak_reminder_push_tapped`, `streak_reminder_activity_started`

**Engineering effort:** Medium. Since Option B reuses 100% of Option A's client-side code, the incremental work is backend-only: a few days to a week for the cron + push template + deep link handler + timezone edge case testing.

**HIG risk analysis:** Same profile as Option A. The Live Activity is started by the Option A foreground-check logic after the user opens the app (whether via push tap or direct launch). The push notification itself is a standard alert-style push, which Apple has allowed for years. The "user-initiated" signal is the app-open action; Option B just adds an upstream mechanism (push tap) that leads to that action.

**User reach analysis:** High — reaches all users who have push notifications enabled. Typical push opt-in rates are 60–80% of installs. Conversion through the funnel (push → tap → app open → conditions met → activity start) is typically 10–25% of those who receive the push, based on industry benchmarks for retention pushes.

**Failure mode:**
- If push notifications are disabled at the OS level, user is unreachable (same as today's reminder system) — but Option A still works for them if they open the app on their own
- If the deep link fails (rare), user lands on today tab and Option A's foreground check still runs — graceful degradation
- If the cron job fails silently, users miss their push reminder — Option A still works as the fallback, since the same foreground-check logic runs whenever the user opens the app
- **Because Option B layers on top of Option A, most failure modes degrade gracefully to Option A behavior rather than breaking the feature entirely**

**What "done" looks like:**
- Push notification arrives within 5 minutes of 22:00 local time
- Push tap rate ≥ 15% of pushes sent
- Activity start rate ≥ 80% of push taps (conditions usually met when user taps at 22:00)
- No duplicate pushes (idempotency guaranteed by `pg_cron` job design)
- When the cron fails or the push fails to deliver, Option A still catches users who open the app on their own

---

#### Option C — Push-to-Start (NOT recommended)

**Elevator pitch:** The "science fiction" version. Backend sends a Live Activity push directly to APNs, and the Live Activity appears on the user's lock screen without any user action at all. The user doesn't need to open the app, tap anything, or even unlock their phone. This is the most ambitious mechanism ActivityKit provides — but it's also the riskiest for App Store review and the most expensive to build.

**Flow diagram:**

```
┌─────────────────────────────────────────────────────────┐
│ PREREQUISITE: App requests push-to-start token at       │
│ launch (iOS 17.2+ only):                                │
│                                                          │
│ for await data in Activity<Attrs>                       │
│   .pushToStartTokenUpdates {                            │
│   // Send token to backend                              │
│ }                                                        │
│                                                          │
│ Store in new Supabase table:                            │
│ live_activity_push_tokens(user_id, token, attr_type)    │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ Backend cron at 22:00 queries:                          │
│   SELECT u.user_id, t.token                             │
│   FROM users u                                          │
│   JOIN live_activity_push_tokens t ON ...               │
│   WHERE u.streak > 0                                    │
│     AND u.last_completed_at < today                     │
│     AND t.attr_type = 'StreakGuardAttributes'           │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ Backend signs APNs JWT (ES256 with p8 key)              │
│ Sends Live Activity push:                               │
│                                                          │
│ Headers:                                                │
│   apns-push-type: liveactivity                          │
│   apns-topic:                                           │
│     ai.affinitylabs.archivesexpo.push-type.liveactivity │
│   apns-priority: 10                                     │
│                                                          │
│ Payload:                                                │
│ {                                                       │
│   "aps": {                                              │
│     "timestamp": 1712692800,                            │
│     "event": "start",                                   │
│     "attributes-type": "StreakGuardAttributes",         │
│     "attributes": { "currentStreak": 12, ... },         │
│     "content-state": {                                  │
│       "minutesUntilMidnight": 120, ...                  │
│     },                                                  │
│     "alert": { ... }                                    │
│   }                                                     │
│ }                                                        │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ iOS receives push → Live Activity APPEARS directly      │
│ on lock screen without user opening the app             │
│ ⚠️  WARNING: This is what Apple reviewers flag as       │
│    "not user-initiated" — high rejection risk            │
└─────────────────────────────────────────────────────────┘
```

**Pros:**
- Maximum possible reach — appears on lock screen without requiring any user action
- Most "magical" user experience when it works
- Full automation — no user friction whatsoever

**Cons:**
- **Push-to-start tokens are only generated on fresh install after a device restart.** Per Apple's documented behavior, none of our 26,386 existing iOS users would have valid tokens at launch — Option C effectively reaches 0% of the existing user base on day one. See §8.4.2 for the full analysis.
- **App Store rejection risk is significant.** Apple's HIG explicitly states Live Activities must represent user-initiated tasks. Push-to-start without user action is on a collision course with that rule.
- iOS 17.2+ only — reaches 96.9% of our user base (25,559 of 26,386 users, per PostHog data in §8.4.1). The *marginal* gap versus Option B is only 2.2% (590 users) — this is the true reach cost of choosing B over C.
- Requires building a full APNs Live Activity infrastructure: provider key management, JWT signing with ES256, token rotation, payload construction, retry/backoff on APNs errors, activity ID state tracking, content-state synchronization
- Needs a new Supabase table (`live_activity_push_tokens`) with its own lifecycle: token refresh handling, user sign-out cleanup, device change handling
- iOS revokes push-to-start tokens for users who do not engage with the activities — so for the very users we most want to reach (lapsed users), the tokens will be stale or missing, defeating the purpose
- Adds a new failure surface: APNs errors, certificate expiration, payload validation bugs
- Significant ongoing maintenance burden — someone needs to own this system
- Harder to debug: when something goes wrong, the problem is distributed across backend, APNs, and iOS, with limited visibility
- Hard to A/B test or roll back — the feature is essentially on or off

**Backend requirements:**
- New Supabase table `live_activity_push_tokens(user_id, device_id, token, attribute_type, created_at, updated_at)`
- Token registration endpoint
- Token refresh handler (iOS rotates tokens periodically)
- APNs provider credentials (p8 key, team ID, key ID, bundle ID)
- ES256 JWT signing library
- Live Activity payload builder with correct schema versioning
- Retry logic for APNs transient errors
- Dead letter queue for failed deliveries
- Monitoring, alerting, and dashboards
- iOS-version detection on the client to only register tokens on 17.2+

**Engineering effort:** Large — a week or more for initial build, plus ongoing maintenance. This is a meaningful chunk of backend engineering time.

**HIG risk analysis:** **Significant.** Apple's review team explicitly looks for "user-initiated" triggers. A Live Activity that appears without any user action is very likely to be flagged — especially for a habit-tracking / learning app (the exact category that tends to get scrutinized for "notification replacement" behavior, which is what the original feasibility review flagged). Duolingo does not use push-to-start for their streak Live Activities. The safer-but-still-effective Option B pattern is what habit apps actually ship.

**User reach analysis:** In theory, 96.9% of the current iOS user base (25,559 of 26,386 users, per §8.4.1). The *marginal* reach gain over Option B is only 2.2% (590 users on iOS 16.1–17.2 who can receive a push notification but cannot receive a push-to-start payload). In practice, Option C's effective reach is likely *lower* than Option B's, because push-to-start tokens expire on the lapsed-user population — precisely the audience a streak reminder is meant to reach. iOS revokes tokens for users who do not interact with Live Activities regularly, so the effective reach for *at-risk* users is significantly below 96.9%.

**Failure mode:**
- **App Store rejection** — delays the entire release, requires rework
- **APNs delivery failure** — activity silently never appears; requires monitoring
- **Token expiration** — for lapsed users, the feature silently stops working
- **Certificate expiration** — all pushes fail at once if not rotated
- **Bundle ID mismatch** — silent failure, hard to debug

**What "done" looks like:** The Live Activity appears on the lock screen at 22:00 local time for all eligible users, without them opening the app. Monitoring shows >95% delivery rate.

---

#### Decision framework

The three options are not mutually exclusive. Because each option builds on shared infrastructure, the decision is about **sequence and empirical validation**, not about picking one to the exclusion of others.

**Build order:**
1. **Foundation** — core Live Activity infrastructure with a manual test button (Phase 1). Validates display end-to-end.
2. **Option A auto-trigger** — wire app foreground check (Phase 4). Proves the feature works with real user flows.
3. **Option B** — layer notification type check on top of Option A (Phase 5). Trivial client extension + backend cron.
4. **Option C** — register push-to-start tokens, build test harness, empirically validate reliability (Phase 6). Decision to productionize depends on test results.

**At each phase, decide whether to proceed:**

- **After Phase 1**, if Live Activities don't render reliably on real devices → fall back to widgets (covered in original feasibility review) and abandon Live Activities entirely.
- **After Phase 4**, if HIG framing is rejected by App Store → add an explicit user tap to preserve the feature (streak reminder button on today tab).
- **After Phase 5**, if reach is already sufficient → deprioritize Phase 6 research.
- **After Phase 6 testing**, review push-to-start reliability data → ship if green, supplement if yellow, defer if red.

#### Engineering recommendation

**Build sequentially: Phase 1 (foundation with test button) → Phase 3 (DailyStory auto-trigger) → Phase 4 (StreakGuard Option A) → Phase 5 (Option B layer) → Phase 6 (Option C research). Decide at each phase whether to continue based on empirical results from the previous phase.**

This recommendation is based on:

1. **Test button in Phase 1 de-risks everything.** Before wiring any trigger, prove that Live Activities CAN display correctly in Archives Expo. This catches library bugs, config plugin issues, and `dismissal-date` edge cases early, when they're cheap to fix.

2. **Options A, B, C all share infrastructure.** The `LiveActivityService`, activity JSX components, and Voltra config are all built in Phase 1. Option A adds a foreground trigger; Option B adds a notification type check that calls the same foreground logic; Option C adds push-to-start token registration and a backend test harness. No work is wasted between phases.

3. **Option B is ~1 week of backend work on top of Option A.** Since B reuses 100% of A's client-side code, the only marginal cost is backend (`pg_cron` + push template + deep link handler). Graceful degradation: if B fails, A still catches users who open the app organically.

4. **Option C is a research phase, not a commitment.** Forum reports of push-to-start reliability are mixed — production apps (District iOS, Reeder, others) ship it successfully, while other developers report silent failures on some devices. The only way to know if it works for Archives Expo is to test it on real devices with the actual user base. Phase 6 is about gathering that empirical data, not about committing to ship.

5. **Decision points are sharp.** After Phase 6 testing, we have concrete reliability numbers to decide: ship Option C if tokens generate reliably, defer if they don't. This is better than pre-judging based on forum anecdotes (as an earlier draft of this plan did).

**Why this approach is better than a parallel build:**

Sequentially building A → B → C means: if we hit a blocker at Phase 4 (HIG rejection, library incompatibility, etc.), we haven't wasted time on backend infrastructure for Options B and C. And when we do reach Phase 6, we have a stable foundation to test against, not a moving target. The tradeoff is that total time to ship all three is longer than a parallel build — but the risk-adjusted expected time is lower, because each phase has a clear go/no-go gate.

---

## 9. Next Steps

1. **Team review** of this plan — alignment on the sequential build philosophy and phase roadmap
2. **Approve Phase 0** — create branch `AFF-383-live-activity-poc` and set up proof-of-concept for library evaluation
3. **Approve Phase 1** — build core infrastructure + test button. This is the foundation for everything else and validates that the feature works end-to-end before wiring any automatic triggers
4. **StreakGuard framing decision** — confirm that "opening the app after 22:00" is an acceptable HIG trigger for Phase 4, or fall back to an explicit button on today tab
5. **Phase 6 testing ownership** — confirm that the user (Huy) will personally test push-to-start reliability on real devices, and align on what "pass/fail" thresholds determine whether Option C productionizes

---

## Appendix A — Codebase Touch Points

Key files that will be modified or created during implementation. Line numbers current as of April 9, 2026.

### Existing files (to be modified)

| File | Purpose | Change |
|---|---|---|
| [app/_layout.tsx](app/_layout.tsx) | Root layout, AppState listener | Extend listener to handle `'background'` / `'inactive'` transitions |
| [hooks/useDailyStoryTracking.ts](hooks/useDailyStoryTracking.ts) | Daily story lifecycle tracking | Add resume logic, trigger Live Activity on unmount |
| [app/(tabs)/today.tsx](app/(tabs)/today.tsx) | Today tab, daily story entry | Read persisted progress on mount |
| [gamification/engines/GamificationOrchestrator.tsx](gamification/engines/GamificationOrchestrator.tsx) | `reportTodayComplete()` | Call `LiveActivityService.endAll()` on completion |
| [gamification/engines/GamifiedProgress.tsx](gamification/engines/GamifiedProgress.tsx) | Streak data source | Read-only — used by StreakGuard conditions |
| [app.json](app.json) | Expo config | Add Voltra plugin |
| [services/AnalyticsService.ts](services/AnalyticsService.ts) | PostHog wrapper | Add `live_activity_*` event definitions |

### New files (to be created)

Phase 0 — POC scaffold (`@bacons/apple-targets` convention):

| File | Purpose |
|---|---|
| `targets/live-activity/expo-target.config.js` | `apple-targets` plugin config: `type: 'widget'` + `frameworks: ['SwiftUI', 'ActivityKit']` |
| `targets/live-activity/Attributes.swift` | `ActivityAttributes` type definitions for DailyStory and StreakGuard |
| `targets/live-activity/LiveActivity.swift` | `ActivityConfiguration` widgets with lock screen + Dynamic Island layouts |
| `targets/live-activity/Info.plist` | Widget extension plist |
| `targets/live-activity/generated.entitlements` | Auto-generated by plugin on prebuild |

Phase 1 — Client-side infrastructure (JS side):

| File | Purpose |
|---|---|
| `services/LiveActivityService.ts` | JS → Native bridge wrapping the ActivityKit API via Expo Module or direct native module |
| `modules/LiveActivityModule` (native) | Expo Module exposing `startActivity` / `updateActivity` / `endActivity` to JS, wrapping the Swift ActivityKit API |
| `gamification/liveActivities/types.ts` | TypeScript types mirroring `Attributes.swift` and content state shapes |
| `gamification/liveActivities/index.ts` | Public exports |
| `components/debug/LiveActivityTestPanel.tsx` | Developer-only debug panel with manual trigger buttons for Phase 1 validation (gated behind `__DEV__` or feature flag) |

Phase 6 — Option C research & testing:

| File | Purpose |
|---|---|
| `services/PushToStartTokenService.ts` | Listens to `pushToStartTokenUpdates` async sequence and posts tokens to backend |
| Backend: `live_activity_push_tokens` Supabase table | Stores `user_id`, `device_id`, `attribute_type`, `token`, `created_at`, `updated_at` |
| Backend: `POST /api/live-activity-tokens` endpoint | Token registration endpoint called from client |
| Backend: `scripts/send-live-activity-push.ts` (or similar) | Test harness CLI for sending Live Activity push with ES256 JWT signing, proper APNs headers, and payload structure (see §8.4.2 APNs components table) |
| Backend: ES256 JWT signing helper | Reusable module for Apple `.p8` provider key → JWT token |

---

## Appendix B — Reference Links

> **Note on Apple documentation:** All links to `developer.apple.com` below are valid destination URLs and render correctly in any web browser. However, Apple's developer documentation is JavaScript-gated — automated tools (curl, WebFetch, scrapers) will only see a "JavaScript required" shell. For verbatim quotes and programmatic verification, we also list third-party references (Braze SDK, APNsPush, Expo Blog) that reproduce Apple's documented behavior and can be fetched by standard tools.

### Apple Official Documentation (browser-rendered)

| Document | Link | What's on the page |
|----------|------|---|
| Live Activities — Human Interface Guidelines | https://developer.apple.com/design/human-interface-guidelines/live-activities/ | Design rules: "ongoing task or live event", "actively aware and interested in tracking", prohibitions against static info and advertising |
| ActivityKit Framework Documentation | https://developer.apple.com/documentation/activitykit/ | API reference root, entry point for Activity, ActivityAttributes, ActivityContent, PushType |
| Displaying live data with Live Activities | https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities | Implementation guide: how to start, update, and end activities locally |
| Starting and updating Live Activities with ActivityKit push notifications | https://developer.apple.com/documentation/activitykit/starting-and-updating-live-activities-with-activitykit-push-notifications | Remote updates: APNs headers (`apns-push-type: liveactivity`, `apns-topic: <bundleID>.push-type.liveactivity`), payload format, token management |
| `Activity.pushToStartTokenUpdates` | https://developer.apple.com/documentation/activitykit/activity/pushtostarttokenupdates | iOS 17.2+ API for push-to-start tokens; documents the "fresh install + device restart" token generation constraint cited in §8.4.2 |
| `Activity.pushToStartToken` | https://developer.apple.com/documentation/activitykit/activity/pushtostarttoken | Property that returns the current push-to-start token |
| `Activity.pushToken` | https://developer.apple.com/documentation/activitykit/activity/pushtoken | Per-activity update token — documented to change during the activity's lifetime, requiring servers to invalidate outdated tokens |
| `PushType` | https://developer.apple.com/documentation/activitykit/pushtype | Configures an activity to receive remote updates |
| `ActivityAuthorizationInfo` | https://developer.apple.com/documentation/activitykit/activityauthorizationinfo | User permission state for Live Activities and frequent updates |
| 10 Questions with the Live Activities Team (Apple news article) | https://developer.apple.com/news/?id=qpqf1gru | ActivityKit team on intended use — tasks with "a definite beginning and end", 8-hour active time limit enforcement |

### Third-party references (fetchable, quote Apple verbatim)

These references are cited in §8.4.2 for technical constraints where verbatim Apple text was needed. Each can be verified by any automated tool or human reader.

| Reference | Link | Use in this plan |
|-----------|------|---|
| Braze SDK — Live Activities integration guide | https://www.braze.com/docs/developer_guide/live_notifications/live_activities | Quotes Apple on the "fresh install after device restart" constraint for push-to-start tokens (§8.4.2 Constraint 1); also quotes "update tokens expire after eight hours" (§8.4.2 Constraint 3) |
| APNsPush — How to Start and Update Live Activities with Push Notifications | https://apnspush.com/how-to-start-and-update-live-activities-with-push-notifications | Full APNs header reference, payload JSON structures for start/update events, token lifecycle notes (§8.4.2 Constraint 4 and APNs components table) |
| OneSignal — New ActivityKit notifications push the boundaries of current iOS Live Activities | https://onesignal.com/blog/new-activitykit-notifications-push-the-boundaries-of-current-ios-live-activities/ | Third-party explanation of iOS 17.2 push-to-start, confirms "app does not have to be open for a Live Activity to be started" |
| Apple Developer Forums — Live Activities Push-to-Start flows | https://developer.apple.com/forums/thread/805324 | Community thread on push-to-start implementation pain points |
| Apple Developer Forums — Issue starting Live Activities with ActivityKit push notifications | https://developer.apple.com/forums/thread/741939 | Community thread on APNs integration issues |

### WWDC Sessions

| Session | Link |
|---------|------|
| Meet ActivityKit (WWDC23) | https://developer.apple.com/videos/play/wwdc2023/10184/ |
| Update Live Activities with push notifications (WWDC23) | https://developer.apple.com/videos/play/wwdc2023/10185/ |
| Design dynamic Live Activities (WWDC23) | https://developer.apple.com/videos/play/wwdc2023/10194/ |
| Broadcast updates to your Live Activities (WWDC24) | https://developer.apple.com/videos/play/wwdc2024/10069/ |

### Duolingo Research

| Resource | Link |
|----------|------|
| Duolingo Streak System Breakdown (Medium) | https://medium.com/@salamprem49/duolingo-streak-system-detailed-breakdown-design-flow-886f591c953f |
| Duolingo's Gamification Secrets (Orizon) | https://www.orizon.co/blog/duolingos-gamification-secrets |
| Duolingo Widget Feature (Official Blog) | https://blog.duolingo.com/widget-feature/ |
| Widgets and Live Activities (Retention Blog) | https://www.retention.blog/p/widgets-and-live-activities |

### Expo / React Native Libraries

| Library | Link | Role in this plan |
|---------|------|---|
| **`@bacons/apple-targets`** (Evan Bacon, Expo core) | https://github.com/EvanBacon/expo-apple-targets | **Primary** — already installed in Archives Expo, used for `targets/notification-service/` and will be used for `targets/live-activity/` |
| Voltra (Callstack Incubator) | https://github.com/callstackincubator/voltra | Fallback only if apple-targets fails |
| expo-widgets (Expo official, first-party) | https://docs.expo.dev/versions/latest/sdk/widgets/ | Fallback only |
| expo-live-activity (Software Mansion Labs) | https://github.com/software-mansion-labs/expo-live-activity | Fallback only |
| react-native-widget-extension (bndkt) | https://github.com/bndkt/react-native-widget-extension | Not recommended |

### Articles & Technical Writeups

| Resource | Link | Key takeaway |
|----------|------|--------------|
| Live Activities in React Native, Expo Widgets, and Why Brownies Are Best Shared With Friends (The React Native Rewind, ITNEXT) | https://itnext.io/live-activities-in-react-native-expo-widgets-and-why-brownies-are-best-shared-with-friends-b9bba8a06ddc | Introduces `expo-widgets` (first-party Expo) and Brownie (JSI-based native↔JS state sharing). Relevant for Phase 0 library evaluation and for solving the state-sync pain point between Live Activity (native) and app state (JS) |
| Home screen widgets and Live Activities in Expo (Expo Blog) | https://expo.dev/blog/home-screen-widgets-and-live-activities-in-expo | Official announcement of `expo-widgets` library |
| iOS Live Activities with Expo & React Native (Kutay blog) | https://kutay.boo/blog/expo-live-activity/ | Walkthrough using `expo-live-activity` |
| Implementing Live Activities in React-Native with Expo (Fizl) | https://fizl.io/blog/posts/live-activities | Practical implementation notes |
| How to build a live activity with Expo, SwiftUI and React Native (Christopher N. Katoyi Kaba) | https://christopher.engineering/en/blog/live-activity-with-react-native/ | Bare-metal approach with manual SwiftUI |
