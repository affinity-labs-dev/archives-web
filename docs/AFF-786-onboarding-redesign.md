# AFF-786: Onboarding Redesign — Technical Handover

**Branch:** `AFF-786`
**Base:** `3.5.0`
**Status:** Feature-complete, app-version bumped to iOS `5.0.0 (198)` / Android `5.0.0 (60)`
**Scope:** Full redesign of the onboarding flow (13 screens), remembered-account re-auth, unified auth screen, onboarding cloud sync, plus a new design-system layer (`components/ui/*`) that the rest of the app can adopt.

This document is written as **context for other branches** that will merge on top of `AFF-786` or cherry-pick pieces of it. It does **not** re-explain the pre-existing codebase — only what this branch introduces, why, and the contracts downstream code should rely on.

---

## 1. High-Level Summary

| Area | Before AFF-786 | After AFF-786 |
|---|---|---|
| Onboarding flow | 4 question screens + results → `/(auth)` email/signup | 13-step flow (welcome → questions → auth → celebration → personalize → paywall) |
| Auth UI | `app/(auth)/archives-auth.tsx` + `email-details.tsx` | `app/(onboarding)/onboarding-auth.tsx` (single merged screen, mode-switchable) |
| Returning users | Always re-ran auth screen | `/welcome-back` with avatar + one-tap re-auth |
| Entry routing | Simple signed-in? check | 8-branch decision tree with resume support |
| Data collection storage | Ephemeral — lost on kill | Persisted Zustand store + Supabase `onboarding_answers` JSONB sync |
| Design system | `ArchivesTheme` only | `ArchivesTheme` **plus** new `components/ui/theme/*` tokens + primitive library |

Both auth flows (`app/(auth)/*` screens) are still in-repo for legacy deep-link compatibility and password reset, but the primary entry point is the onboarding flow.

---

## 2. File Map (What's New)

### App screens
```
app/
├── index.tsx                              # Rewritten — 8-branch routing decision tree
├── welcome-back.tsx                       # NEW — returning-user re-auth screen
├── ui-playground.tsx                      # NEW — dev-only component showcase (not shipped to prod UX)
├── live-activity-test.tsx                 # NEW — Live Activity dev tool (tangential to AFF-786)
└── (onboarding)/
    ├── onboarding-step-1.tsx              # NEW — welcome
    ├── onboarding-step-2.tsx              # NEW — value prop
    ├── onboarding-step-3.tsx              # NEW — "what's your name"
    ├── onboarding-step-4.tsx              # NEW — transition
    ├── onboarding-step-5.tsx              # NEW — interests (multi-select)
    ├── onboarding-step-6.tsx              # NEW — testimonials
    ├── onboarding-step-7.tsx              # NEW — create-account split (OAuth + email)
    ├── onboarding-step-8.tsx              # NEW — post-signup celebration
    ├── onboarding-step-9.tsx              # NEW — personalize intro (age group)
    ├── onboarding-step-10.tsx             # NEW — daily goal
    ├── onboarding-step-11.tsx             # NEW — loading / curating screen
    ├── onboarding-step-12.tsx             # NEW — personalized learning path (GET STARTED → markCompleted)
    ├── onboarding-step-13.tsx             # NEW — free-trial soft paywall
    └── onboarding-auth.tsx                # NEW — merged login+signup (routed from step-7)
```

### State + routing
```
stores/
└── onboardingStore.ts                     # NEW — Zustand + persist; single source of truth for answers/progress

constants/
└── OnboardingRoutes.ts                    # NEW — STEP_ROUTE_MAP, POST_SIGNUP_STEPS, COMPLETION_STEP, toDisplayStep()

hooks/
├── useOnboardingSync.ts                   # NEW — bridges Zustand store → GamifiedProgress cloud sync
└── useRememberedOAuth.ts                  # NEW — one-tap OAuth from welcome-back screen

services/
└── RememberedAccountService.ts            # NEW — AsyncStorage cache of last-signed-in identity (display metadata only)
```

### Design system + components
```
components/
├── ui/                                    # NEW — primitive library (see §6)
│   ├── theme/                             # colors, typography, spacing, radius, shadows, motion
│   ├── Typography/                        # text primitive w/ variants
│   ├── DepthButton/                       # 3D-shadow button used for primary CTAs
│   ├── AuthButton/                        # OAuth button base
│   ├── OptionCard/                        # multi-select / single-select option tile + OptionList
│   ├── SpeechBubble/                      # animated bubble with path drawing
│   ├── Typewriter/                        # character-by-character reveal (useTypewriter hook)
│   ├── ProgressBar/                       # onboarding progress bar
│   ├── ReviewCard/                        # testimonial card (step-6)
│   ├── StatsBadge/                        # small rounded badge
│   └── animations/                        # AnimatedEntrance, StaggerGroup, presets, useEntrance
└── onboarding/                            # NEW — onboarding-specific composites
    ├── OnboardingHeader.tsx               # back + progress + skip row (shared across steps)
    ├── OnboardingQuestionLayout.tsx       # question-screen scaffold (header + content + CTA)
    ├── WelcomeStackedText/                # step-1 stacked headline
    ├── Mascot/                            # Ibu mascot image presets
    ├── personalize/                       # AgeGroupPhase, DailyGoalPhase
    ├── auth/                              # AuthInput, AuthOutlineButton, AppleOutlineButton, GoogleOutlineButton, AccountAvatar
    └── icons/                             # inline SVGs (backArrow, person, pill, line, stars)
```

### Gamification / cloud
```
gamification/engines/
├── GamifiedProgress.tsx                   # EXTENDED — OnboardingAnswers type + write/flush APIs
└── NotificationPromptProvider.tsx         # NEW — centralized notification-prompt scheduler (gated by isSignUpMode)
```

### Docs (reference)
```
docs/
├── plans/ ...                             # design notes (AI backend, etc. — not AFF-786)
└── (no AFF-786 plan file; this handover replaces it)
```

---

## 3. Onboarding Flow — Screen Inventory

Each row is a step the user sees. Steps that don't show a progress bar (auth, celebration, loading, paywall) are marked. `toDisplayStep()` in `constants/OnboardingRoutes.ts` maps internal step numbers to the bar's display number so the bar doesn't visually jump over step 7/8.

| # | File | Purpose | Progress bar? | CTA → next |
|---|---|---|---|---|
| 1 | `onboarding-step-1.tsx` | Welcome / hero | ✅ | step-2 |
| 2 | `onboarding-step-2.tsx` | Value proposition | ✅ | step-3 |
| 3 | `onboarding-step-3.tsx` | Name input → `setName()` | ✅ | step-4 |
| 4 | `onboarding-step-4.tsx` | Transition | ✅ | step-5 |
| 5 | `onboarding-step-5.tsx` | Interests multi-select → `toggleInterest()` | ✅ | step-6 |
| 6 | `onboarding-step-6.tsx` | Testimonials (`ReviewCard`) | ✅ | step-7 |
| 7 | `onboarding-step-7.tsx` | "Create account" split — OAuth buttons + "Continue with email" → onboarding-auth | ❌ | onboarding-auth |
| — | `onboarding-auth.tsx` | Merged sign-in / sign-up; mode param `?mode=signin\|signup` | ❌ | step-8 (on signup) / tabs (on existing sign-in) |
| 8 | `onboarding-step-8.tsx` | Post-signup celebration (Ibu + typewriter) | ❌ | step-9 |
| 9 | `onboarding-step-9.tsx` | Age group → `setAgeGroup()` | ✅ | step-10 |
| 10 | `onboarding-step-10.tsx` | Daily goal → `setDailyGoal()` (Skip → `markSkipped()`) | ✅ | step-11 |
| 11 | `onboarding-step-11.tsx` | Loading / "curating your plan" — timed delay | ❌ | step-12 (auto) |
| 12 | `onboarding-step-12.tsx` | Personalized learning path + GET STARTED → `markCompleted()` | ✅ | step-13 |
| 13 | `onboarding-step-13.tsx` | Free-trial paywall | ❌ | `(tabs)/today` |

**Step 8 is a known intentional gap:** `TOTAL_ONBOARDING_STEPS = 12` in `onboardingStore.ts`, and `toDisplayStep(step)` subtracts 1 for step > 7 so the bar reads "7 of 12" on step-9 rather than "8 of 13". When a future design fills the step-8 slot with a progress-bar screen, bump `TOTAL_ONBOARDING_STEPS` to 13 and remove the `toDisplayStep` shift.

---

## 4. Routing Decision Tree — `app/index.tsx`

This is the single smart-router for the app. Every cold start and navigation to `/` hits this file. The decision tree is fully documented in the file's header comment, but the high-level contract for other branches is:

```
1. Wait for Clerk (isLoaded) + Zustand rehydration (_hasHydrated) + remembered-account probe
2. Signed-in + Clerk user.id ≠ userIdAtStart       → reset() + step-1 (account switch)
3. Signed-in + status ∈ {completed, skipped}       → /(tabs)/today
4. Signed-in + in_progress + POST_SIGNUP_STEPS     → resume at STEP_ROUTE_MAP[currentStep]
5. Signed-in otherwise                              → /(tabs)/today
6. Not signed-in + in_progress + currentStep ≥ 8   → resume at STEP_ROUTE_MAP[currentStep]
7. Not signed-in + hasRememberedAccount()          → /welcome-back
8. Fresh install                                    → /onboarding-step-1
```

`POST_SIGNUP_STEPS = [8, 9, 10, 11, 12]` — explicitly excludes pre-auth steps and the paywall (13). Rationale is in the comment above the constant.

**When to change this file:** only if you add a new routing source (another persisted flag) or a new terminal state. Adding a screen does NOT require changing this file — only `STEP_ROUTE_MAP`.

---

## 5. State Layer

### 5.1 `stores/onboardingStore.ts` — Zustand + `persist`

**Shape:** answers (`name`, `interests[]`, `dailyGoalMinutes`, `ageGroup`, `isSignUpMode`) + progress (`currentStep`, `lastStepVisited`, `totalSteps`) + lifecycle (`status`, `startedAt`, `onboardingCompletedAt`, `onboardingSkippedAt`, `userIdAtStart`) + transient flag (`_hasHydrated`, excluded via `partialize`).

**Status machine:**
```
not_started ──setStep()──▶ in_progress ──markCompleted()──▶ completed  (terminal)
                                     │
                                     └──markSkipped()─────▶ skipped    (terminal)
```
`setStep()` auto-flips `not_started → in_progress` and stamps `startedAt` once. `reset()` restores to `INITIAL_STATE` and is only called from the account-switch branch in `app/index.tsx`.

**Hydration gate:** `_hasHydrated` is set by `onRehydrateStorage` after AsyncStorage reads the persisted slice. The router in `app/index.tsx` blocks on this flag to avoid making routing decisions from the default `not_started` state before storage is loaded.

**Why Zustand (not Context):**
- `persist` middleware gives AsyncStorage + rehydration for free.
- `useOnboardingStore.getState()` lets `useOnboardingSync`'s subscription callback access the latest slice without capturing stale closures.
- Selector subscriptions (`useOnboardingStore((s) => s.status)`) keep step screens from re-rendering on unrelated field updates.

### 5.2 `hooks/useOnboardingSync.ts` — bridge to cloud

Call **once** at the top of the provider tree (wired in `AnalyticsWrapper` inside `app/_layout.tsx`). Three concerns:

1. **Hydrate** — on first mount after GamifiedProgress finishes loading, if `gamifiedState.onboarding_answers` exists **and** local `status === 'not_started'`, restore into the Zustand store. Guarded to never clobber local in-flight edits.
2. **Initial flush** — once Clerk `userId` is bound AND GamifiedProgress initialized, upload the current payload (so the server row exists from auth time). Per-`userId` ref avoids repeats.
3. **Incremental sync** — subscribe to store changes. Intermediate edits → debounced `writeOnboardingAnswers` (2 s). Terminal `completed`/`skipped` → `flushOnboardingAnswers` (bypasses debounce).

### 5.3 `GamifiedProgress.tsx` extensions

New public types + API:

```ts
export interface OnboardingAnswers {
  version: 2;
  name: string | null;
  interests: string[];
  daily_goal_minutes: 5 | 10 | 15 | 20 | null;
  age_group: '13-17' | '18-24' | '25-34' | '35-44' | '45+' | null;
  status: 'in_progress' | 'completed' | 'skipped';
  started_at: string;
  completed_at: string | null;
  skipped_at: string | null;
}

// On the context:
writeOnboardingAnswers(answers): Promise<void>   // debounced 2s cloud upsert
flushOnboardingAnswers(answers): Promise<void>   // immediate write (awaits ACK)
```

Stored at `gamification_data.data.onboarding_answers`. Consumers that need to read onboarding data should pull it from `state.onboarding_answers` on the `useGamifiedProgress()` hook — do NOT re-read the Zustand store from non-onboarding code paths, because the Zustand store is per-device and may be stale on a fresh install pre-sync.

**Version field:** schema is at `version: 2`. Bump and add a migration branch (in `GamifiedProgress.tsx` + `stores/onboardingStore.ts#hydrateFromCloud`) when the shape changes.

---

## 6. Design System — `components/ui/*`

New primitive layer that lives alongside (not replacing) `constants/ArchivesTheme.ts`. **ArchivesTheme is still the source of truth for the rest of the app.** The new tokens are specific to onboarding's tighter Figma spec and will be adopted by other features only after an explicit migration plan.

### 6.1 Theme tokens — `components/ui/theme/`
- `colors.ts` — 51-line palette (backgrounds, primaries, accents, text, outlines) — **different naming than `ArchivesTheme.colors`** (e.g. `acaiPrimary`, `aspenGold`); do not cross-import.
- `typography.ts` — font registration + text style presets (display, title, body, caption).
- `spacing.ts`, `radius.ts`, `shadows.ts`, `motion.ts` — tokenized constants.
- `index.ts` re-exports everything; consumers use: `import { colors, spacing, easings } from '@/components/ui';`.

### 6.2 Primitives (reusable across any future flow)
- **`Typography`** — text with variant system (title/subtitle/body/caption); replaces ad-hoc `<Text style={{…}}>`.
- **`DepthButton`** — 3D-shadow primary button; `DepthButton.config.ts` defines variants. **Preferred CTA for onboarding.**
- **`AuthButton`** — base for OAuth buttons (outline variant, icon slot, full-width).
- **`OptionCard` + `OptionList`** — used by step-5 (interests multi-select) and step-9 (age single-select); built-in selection animation + stagger.
- **`SpeechBubble`** — SVG path-drawn bubble with configurable tail direction/offset; supports `autoPlay` for path stroke animation. Used on step-8 celebration and others.
- **`Typewriter`** + **`useTypewriter`** hook — character-by-character reveal; emits `onDone` for chaining CTAs.
- **`ProgressBar`** — the onboarding progress bar (animated fill on step change).
- **`ReviewCard`** — testimonial card (step-6).
- **`StatsBadge`** — small rounded metric badge.

### 6.3 Animation system — `components/ui/animations/`
- **`AnimatedEntrance`** — wraps a child with a configurable `preset` (scale / opacity / translate / rotate) and a `delay`. Primary tool for per-element choreography.
- **`StaggerGroup`** — applies staggered `AnimatedEntrance` across children.
- **`presets.ts`** — reusable entrance configs (`fadeUp`, `scaleIn`, etc.); use these first before custom configs to keep motion consistent across screens.
- **`useEntrance`** — hook variant when the consumer needs manual control over the driver value.

**Convention:** every onboarding screen's "entrance timeline" is documented in a comment block at the top of the file (see `onboarding-step-8.tsx` header for the canonical shape). Keep this pattern when adding screens — designers reference these delays when reviewing motion.

---

## 7. Auth — Merged Screen (`onboarding-auth.tsx`)

Single screen backs both sign-in and sign-up:

- Route param `?mode=signin|signup` sets the initial mode.
- In-screen toggle flips between modes without navigation (`setIsSignInMode`).
- Sign-in: email + password only.
- Sign-up: first/last name + email + password + confirm.
- Clerk `useSignIn` / `useSignUp` hooks + validation + error mapping were cloned verbatim from the legacy `(auth)/email-details.tsx` to preserve behavior.

**On success:**
- `setIsSignUpMode(true|false)` on the Zustand store (drives post-signup gating — see §9).
- Sign-up → `setStep(8)` → `/onboarding-step-8` (celebration).
- Sign-in → routes back through `app/index.tsx` which picks the right destination based on status.

**Email prefill:** welcome-back screen passes `?mode=signin&email=…` to save a tap for returning email users. See `app/welcome-back.tsx` for the routing call.

---

## 8. Welcome-Back Flow

### 8.1 `services/RememberedAccountService.ts`
Persisted at `remembered_accounts_v1` (AsyncStorage). Stores **display-only** metadata:
```ts
interface RememberedAccount {
  userId: string;
  firstName: string | null;
  email: string;
  avatarUrl: string | null;
  lastAuthMethod: 'oauth_apple' | 'oauth_google' | 'email';
  lastSignedInAt: number;
  rememberedSince: number;
  expiresAt?: number | null;  // reserved, not enforced today
}
```
**Important:** no credentials, no tokens. Clerk's own token cache remains the source of truth for session state; this is purely a UI hint layer.

Schema is **array-shaped** from day one (even though UI surfaces one active account) — ready for a future "switch account" bottom sheet without a migration. `CURRENT_VERSION = 1`; bump + add a migration branch in `readCache()` when the shape changes.

Public API:
```
upsertRememberedAccount(account)        // call on successful sign-in
getActiveAccount(): RememberedAccount
getRememberedAccounts(): RememberedAccount[]
setActiveAccount(userId)
removeRememberedAccount(userId)
clearAllRememberedAccounts()            // "delete account" flow
hasRememberedAccount(): boolean         // used by app/index.tsx router
```

### 8.2 `app/welcome-back.tsx`
Shown only when: signed-out AND `hasRememberedAccount() === true`. Layout is a vertical linear stack (not bottom-anchored) with exact gaps from Figma 3812:5396.

Flow:
- "Continue as {firstName}" → dispatches by `lastAuthMethod`:
  - `oauth_apple` / `oauth_google` → `useRememberedOAuth` hook runs Clerk OAuth.
  - `email` → `router.push('/onboarding-auth?mode=signin&email=…')`.
- "Not you? Sign out" → `removeRememberedAccount` + `reset()` onboarding store → back to `/onboarding-step-1`.

### 8.3 `hooks/useRememberedOAuth.ts`
Wraps Clerk's OAuth strategy machinery so the welcome-back screen can kick off sign-in without re-rendering auth state. Mirror the existing `app/(auth)/archives-auth.tsx` flow but without the account-creation branches.

---

## 9. Notification Prompt Gating

New `gamification/engines/NotificationPromptProvider.tsx` centralizes notification-permission prompting. It reads `isSignUpMode` from the onboarding store and **suppresses prompts while the user is mid-signup**:

```ts
const isSignUpMode = useOnboardingStore((s) => s.isSignUpMode);
...
if (isSignUpMode) return;   // gate in the prompt scheduler
```

**Why:** the onboarding flow has its own "enable notifications" moment (handled by the paywall/post-signup path). Letting the generic prompt fire during onboarding would double-prompt and hurt opt-in rates.

**Contract:** any new feature that wants to open the OS permission sheet during onboarding must respect this flag — either wait for `!isSignUpMode` or use the orchestrator variant system in `NotificationPromptProvider` (`VARIANT_PRIORITY` constant).

There is a leftover `console.log` at line 191 that will be cleaned up pre-release; safe to ignore in merges.

---

## 10. Integration Notes for Other Branches

### Things you can safely assume exist on `AFF-786`
- `useOnboardingStore` — importable from anywhere; reads are cheap (Zustand).
- `OnboardingAnswers` type — exported from `gamification/engines/GamifiedProgress.tsx`.
- `components/ui` primitives — stable API, ready to use.
- `hasRememberedAccount()` — safe to call from any screen.
- `PaywallGateService` — per-Clerk-user_id gate for `/onboarding-step-13`. Any post-sign-in flow that needs to make the same `isSubscribed ? today : paywall` decision MUST call `resolvePostSignInRoute(userId, isSubscribed)` (see `services/PaywallGateService.ts`). The gate is marked on mount of step-13 and survives sign-out via snapshot/restore in `profile.tsx#handleSignOut`.

### Things you should NOT change without coordination
- `STEP_ROUTE_MAP`, `POST_SIGNUP_STEPS`, `COMPLETION_STEP` — the routing contract in `app/index.tsx` depends on these exactly.
- `OnboardingAnswers.version` — bumping requires a migration branch in `GamifiedProgress.tsx` AND `onboardingStore.hydrateFromCloud`.
- `remembered_accounts_v1` storage key / `CURRENT_VERSION` — same migration concern.
- `onboarding_paywall_seen_v1` storage key / `CURRENT_VERSION` in `PaywallGateService` — same migration concern. The list is snapshotted in `handleSignOut` (profile.tsx) so that sign-out → sign-in of the same user_id skips the paywall. Any new sign-out code path MUST snapshot + restore, matching the existing `rememberedSnapshot` pattern, or the gate will leak.
- `isSignUpMode` reads inside `NotificationPromptProvider` — any new prompt must respect this flag.

### Things to watch for during merge conflicts
- `app/_layout.tsx` — provider tree was reshuffled to add `useOnboardingSync()` inside `AnalyticsWrapper`. If another branch touches provider order, re-verify that GamifiedProgress is initialized before `useOnboardingSync` runs.
- `app/index.tsx` — rewritten from scratch; conflicts will be easier to resolve manually than auto-merging.
- `components/quiz/QuizResults.tsx`, `components/quiz/Quiz.tsx` — touched as part of the celebration refresh; small surface but non-trivial style changes.
- `services/AnalyticsService.ts` — expanded significantly (~540 lines diff); re-review any event name changes.
- `gamification/services/AIService.ts` — heavily simplified (1.2k lines removed with `AIToolsService.ts` deletion). Non-onboarding change but bundled here; coordinate with the AI backend separation spec under `docs/superpowers/specs/2026-04-13-ai-backend-separation-design.md`.

### Known TODOs left in branch
1. `onboarding-step-13.tsx` — paywall CTA currently routes straight to `/(tabs)/today`. Wire up RevenueCat offering presentation before release.
2. `NotificationPromptProvider.tsx:191` — leftover `console.log` in the signup-mode branch.
3. Step-8 slot in `STEP_ROUTE_MAP` is reserved but the flow uses it as a transition; when the dedicated screen design lands, bump `TOTAL_ONBOARDING_STEPS` to 13 and drop `toDisplayStep()` from `OnboardingRoutes.ts`.
4. `RememberedAccount.expiresAt` is stored but not enforced — no TTL policy yet.
5. `app/live-activity-test.tsx` and `app/ui-playground.tsx` are dev-only tools included in the bundle; decide before release whether to strip or dev-gate them.

---

## 11. Version Bump

`app.json` and related metadata:
- iOS: `5.0.0 (198)`
- Android: `5.0.0 (60)`

This is a **major version** bump from 4.x — signals a significant UX change to returning users. OTA update will not work to push this; a full native rebuild + store submission is required.

---

## 12. Commit Timeline (for archaeology)

```
2bbff06  add design system theme tokens + font registration
3ee4673  add design system UI primitives
f2b23a9  add animation system for onboarding screens
7fe989b  add onboarding primitives + UI playground
65f724f  add Phase 2 onboarding screens 1-5 with unified step naming
55c2d81  fix: scale WelcomeStackedText to fit narrow screens
0024dbc  add Phase 2 Screen 6 (testimonials) + step-5 focus replay fix
c3d23a2  add Phase 2 Screen 7 (create account) + Figma outline auth buttons
ed92ea3  add onboarding login + signup screens with Figma outline UI
fdce1e1  merge login+signup into single onboarding-auth screen
008a505  docs: onboarding data sync architecture proposal
2751cde  add Phase 2 onboarding steps 10-13
0d4d2d5  add Phase 2 Screen 14 (personalized learning path)
4521cb5  refactor: rename IMAGE_HALF to IMAGE_WIDTH in step-14
2c44cb9  add paywall screen, merge personalize flow, wire resume logic
f38ba57  wire onboarding cloud sync + route new flow as primary
fe342ff  add welcome-back screen for returning signed-out users
20ac989  add post-signup celebration screen + gate notification prompt during signup
814a011  drop playground dev shortcuts + persist signup-mode flag
2ccb518  chore(version): version up AOS 5.0.0(60) and IOS 5.0.0(198)
a5455b1  polish onboarding option lists, auth keyboard, welcome-back mismatch
9992227  increase loading time of step 11
```

---

## 13. Testing Checklist for Merges

Before merging a downstream branch onto this one, verify:

- [ ] Fresh install → `/onboarding-step-1` (not `/welcome-back`, not `/(tabs)/today`).
- [ ] Complete onboarding → signed-in → kill app → reopen → `/(tabs)/today` (no onboarding replay).
- [ ] Mid-flow kill on step 10 → reopen → resumes at step 10 (only if `POST_SIGNUP_STEPS` includes it).
- [ ] Sign-out from `(tabs)/profile` → returns to `/welcome-back` with avatar.
- [ ] "Not you? Sign out" → drops back to step 1 and clears remembered cache.
- [ ] Switch Clerk accounts manually (dev tool) → onboarding `reset()` triggers on next app open.
- [ ] Reinstall on a different device logged into the same Clerk account → `onboarding_answers` hydrate from cloud (name pre-fill on step 3, interests pre-selected on step 5).
- [ ] Sign up via email → no generic notification prompt appears during steps 8–12 (gated by `isSignUpMode`).
- [ ] `npm run lint` clean (report issues, don't auto-fix per CLAUDE.md rule 2).
- [ ] Both iOS and Android simulators — production flow tested end-to-end.
