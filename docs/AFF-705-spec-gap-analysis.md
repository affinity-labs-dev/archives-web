# AFF-705: Spec Gap Analysis

**Date:** April 10, 2026
**Branch:** `AFF-705`
**Ticket:** [AFF-705 — Implement Live Activity](https://linear.app/affinity-labs/issue/AFF-705/implement-live-activity)
**Figma:** [Archives Live Activities](https://www.figma.com/design/rQCyFdW0CFzpUoegFfew7u/Archives_Raw_File?node-id=2489-3675)

---

## Scope

This document compares the AFF-705 Linear ticket spec against the current Swift implementation on branch `AFF-705`. It covers both Streak Expiry and Daily Story Incomplete activity types.

**Focus areas:**
- What's implemented and matches spec
- What's implemented but differs from spec
- What's missing entirely

---

## 1. Streak Expiry (StreakGuardLiveActivity)

### 1.1 Start Conditions

| Condition | Spec | Current | Status |
|---|---|---|---|
| Time threshold | Past **9:00 PM** local | Documented as 10:00 PM (22:00) | 🟠 Wrong time — JS bridge must use 21:00 |
| Cards completed today | **Zero** quest cards | Not enforced in widget (JS responsibility) | ✅ Correct scope — JS bridge checks |
| Minimum streak | Streak **>= 3 days** (no urgency fatigue for new users) | Not documented or enforced | 🟠 Missing — JS bridge must check `streak >= 3` |

### 1.2 End Conditions

| Condition | Spec | Current | Status |
|---|---|---|---|
| User completes any card | → Success (streak saved) | `.expiring` → `.saved` state transition | ✅ Implemented |
| Midnight passes | → Failed (streak broken) | `.expiring` → `.failed` state transition | ✅ Implemented |
| Saved → chains into DailyStory | Start DailyStory with 1 card checked | Not implemented — `.saved` is terminal | 🔴 Missing chaining logic (JS bridge) |

### 1.3 Lock Screen Banner

#### Expiring state (Figma 2481:3902)

| Element | Spec | Current | Status |
|---|---|---|---|
| Background | Dark red/maroon | `#470F0A` maroon + red glow gradient | ✅ Match |
| Headline | "12 day streak at risk" | Mixed 22/16pt bold cream text | ✅ Match |
| Countdown | Large timer (00:23:15) | 52pt `Text(timerInterval:)` native | ✅ Match (format differs: iOS shows `23:15` not `00:23:15`) |
| Subtitle | "Left to extend your streak" | 15pt semibold tan `#BF998C` | ✅ Match |
| Mascot | Explorer (hat, walking stick) — worried expression | `Mascot.imageset` (worried explorer) | ✅ Match |
| Warning badge | Red dot next to flame | 10pt `Circle()` fill `#E6402E` | ✅ Match |
| Bottom padding | Symmetric with top | `.padding(.bottom, 38)` | ✅ Fixed |

#### Saved state (Figma 2773:4522)

| Element | Spec | Current | Status |
|---|---|---|---|
| Background | Dark gray | `#1A1A1A` flat | ✅ Match |
| Headline | "Streak saved!" with flame | "🔥 Streak saved!" 17pt bold white | ✅ Match |
| Streak count | In gold | "N days" in `#B2E965` lime green | 🟠 Spec says "gold", current is green. Need designer confirmation |
| CTA text | "Keep it going — complete today's quest" | Not present | 🟠 Missing |
| Mascot | Celebrator (pom-poms) | `CelebrationMascot.imageset` | ✅ Match |
| Linger duration | 15 minutes | Documented in code/plan | ✅ Match |

#### Failed state (Figma 2764:4517)

| Element | Spec | Current | Status |
|---|---|---|---|
| Background | Dark red/maroon (no glow) | `#470F0A` maroon, no gradient | ✅ Match |
| Headline | "Your 12-day streak has ended" | 17pt bold cream | ✅ Match |
| Subtitle | "Start a new streak today" in light purple | 14pt medium `#D6BBFF` lavender | ✅ Match |
| Mascot | Shocked face (big eyes) | `SadMascot.imageset` (tears) | 🟡 Partial — spec says "shocked", we have "sad". May need different asset |
| Linger duration | 15 minutes | Documented in code/plan | ✅ Match |

### 1.4 Dynamic Island — Compact

| Element | Spec | Current | Status |
|---|---|---|---|
| Leading | Flame + streak count | `🔥` emoji + streak number 14pt semibold white | ✅ Match |
| Trailing | Countdown in **pink** (HH:MM:SS format) | `Text(Date, style: .timer)` in `.white` + `.frame(maxWidth: 32)` | 🟠 Color should be pink, not white |
| Trailing format | "HH:MM:SS" pink | iOS native timer format (no leading zeros, no custom format) | 🟡 iOS limitation — cannot force HH:MM:SS. Accept native format |

### 1.5 Dynamic Island — Expanded

| Element | Spec | Current | Status |
|---|---|---|---|
| Row 1 left | "12-day streak at risk" | 13pt semibold tan `#BF998C` | ✅ Match |
| Row 1 right | Countdown timer in pink | `Text(timerInterval:)` 36pt cream | 🟠 Should be pink color + smaller font to match expanded spec |
| Below | "Left to save your streak" CTA | 13pt semibold tan | ✅ Match |
| All three quest cards | Shown as incomplete | Not shown — expanded mirrors lock screen mini-banner | 🟠 Missing — spec wants WATCH/EXPLORE/QUESTIONS pills in expanded |
| Mascot | Explorer (worried) | `Mascot.imageset` 102x135 | ✅ Match |

### 1.6 Dynamic Island — Minimal

| Element | Spec | Current | Status |
|---|---|---|---|
| Content | "Flame emoji in a small circular pill" | `Text("🔥")` 12pt | 🟡 No explicit circular styling — likely OK since Dynamic Island pill is inherently rounded |

### 1.7 Tap / Deep Link

| Element | Spec | Current | Status |
|---|---|---|---|
| Destination | Today tab | `archives://today` deep link | ✅ Match |
| URL parameter | `?source=live_activity_urgent` | `?source=live_activity` | 🟠 Missing `_urgent` suffix |

### 1.8 Timer Behavior

| Element | Spec | Current | Status |
|---|---|---|---|
| Implementation | iOS native `Text(date, style: .timer)` | `Text(Date(timeIntervalSinceNow:), style: .timer)` | ✅ Match |
| Battery | Zero app wakeups | Native rendering, no manual updates | ✅ Match |

---

## 2. Daily Story Incomplete (DailyStoryLiveActivity)

> **NOTE:** Daily Story is deferred — StreakGuard is priority. This section documents gaps for future reference.

### 2.1 Architecture Gaps

| Gap | Description | Severity |
|---|---|---|
| No state machine | DailyStory has no state enum — can't render "Quest Complete" or "Quest Incomplete" ended states | 🔴 |
| Wrong trigger | Our plan: "app background mid-story". Spec: "User opens Today tab first time that day" | 🔴 |
| Missing streak in attributes | Spec wants streak count in compact/minimal but `DailyStoryAttributes` has no `currentStreak` field | 🟠 |
| Missing `endDate` | Spec shows countdown to midnight but `DailyStoryAttributes.ContentState` has no endDate field | 🟠 |
| No conflict resolution | Can start both activities simultaneously — spec says only one at a time | 🔴 |

### 2.2 UI Gaps

| Element | Spec | Current | Gap |
|---|---|---|---|
| Compact leading | `🔥` + streak count | `📖` + card fraction | 🟠 Wrong content |
| Compact trailing | Countdown to midnight | Circular progress ring | 🟠 Wrong content |
| Minimal | `🔥` + streak count (oval) | `📖` book icon | 🟠 Wrong content |
| Lock screen | Streak + timer + progress bar + cards + mascot | Placeholder brand palette | 🟠 Needs Figma design |
| Quest Complete ended state | "Quest Complete! +30 XP" + gold + celebrator mascot | Not implemented | 🔴 Missing |
| Quest Incomplete ended state | "Quest incomplete" + muted blue bar + pink ✕ + shocked mascot | Not implemented | 🔴 Missing |
| Linger duration | 30 minutes (both ended states) | Not documented | 🟠 |

### 2.3 Mascot Gaps

| Character | Spec usage | Asset status |
|---|---|---|
| Teacher (glasses, pointer stick) | DailyStory Lock Screen | ❌ Not exported from Figma |
| Celebrator (pom-poms) | Quest Complete, Streak Saved | ✅ `CelebrationMascot.imageset` |
| Shocked face (big eyes, blinking) | Streak Lost, Quest Incomplete, DI Expanded | ⚠️ Have `SadMascot` (tears) — may need "shocked" variant |
| Explorer (hat, walking stick) | Streak Expiry Lock Screen + Expanded | ✅ `Mascot.imageset` |

### 2.4 Animation

| Element | Spec | Current | Status |
|---|---|---|---|
| Blinking eyes | Every ~2.8s, double blink every ~6s | Static PNG | 🟡 Spec says fallback to static is OK |
| Ear wiggle | Subtle rotation | Not implemented | 🟡 Widget extension animation support limited |
| Breathing | Gentle body scale pulse | Not implemented | 🟡 Widget extension animation support limited |

---

## 3. Priority & Conflict Resolution

| Rule | Spec | Current | Status |
|---|---|---|---|
| Only one activity at a time | ✅ Required | ❌ Not enforced — both can start simultaneously | 🔴 JS bridge must enforce |
| Streak Expiry always wins | If conditions met, replace DailyStory | Not implemented | 🔴 JS bridge logic |
| Saved streak → chain to DailyStory | End StreakGuard, start DailyStory with 1 card checked | Not implemented | 🔴 JS bridge logic |
| Simultaneous start | Start Streak Expiry (not DailyStory) | Not implemented | 🔴 JS bridge logic |

---

## 4. What's Already Correct

| Aspect | Details |
|---|---|
| StreakGuard 3-state architecture | `StreakState` enum with `.expiring`, `.saved`, `.failed` — clean exhaustive branching |
| Lock screen expiring banner | Maroon + glow + explorer mascot + countdown + warning dot — faithful Figma match |
| Lock screen failed banner | Maroon + sad mascot + lavender subtitle — matches Figma |
| Lock screen saved banner | Dark gray + celebrator mascot — mostly matches (missing CTA text) |
| File structure | 11 Swift files organized by feature (`StreakGuard/`, `DailyStory/`, shared `Colors.swift`, `Attributes.swift`) |
| Edge case hardening | Defensive clamps, lineLimit, minimumScaleFactor, dynamicTypeSize cap, grammar fixes |
| Expo Module bridge | `LiveActivityModule.swift` with 9 AsyncFunctions, TypeScript types, error handling |
| Test screen | Full test UI with buttons for all StreakGuard states + DailyStory progression |
| Asset pipeline | 3 mascot imagesets at @1x/@2x/@3x in widget extension `Assets.xcassets` |
| Timer implementation | Native `Text(Date, style: .timer)` — zero battery drain |
| Prebuild workflow | `@bacons/apple-targets` convention, `PBXFileSystemSynchronizedRootGroup` auto-include |
| ViewBuilder compatibility | All `switch` → `if/else`, no `let` bindings in result builder closures |

---

## 5. Action Items — Streak Expiry Only

Ordered by priority. Daily Story deferred.

| # | Gap | Fix | Effort |
|---|---|---|---|
| 1 | Compact trailing color (Gap 10) | Change `.foregroundColor(.white)` → pink/urgent color | 5 min |
| 2 | Saved banner CTA (Gap 11) | Add "Keep it going — complete today's quest" text row | 10 min |
| 3 | Deep link URL (Gap 16) | Change `live_activity` → `live_activity_urgent` | 2 min |
| 4 | Start time docs (Gap 18) | Update all references 22:00 → 21:00 | 5 min |
| 5 | Expanded missing card pills (Gap spec 1.5) | Add WATCH/EXPLORE/QUESTIONS pills to StreakGuard expanded view | 30 min — requires adding card state fields back to StreakGuardAttributes |
| 6 | Start condition: streak >= 3 (Gap 3) | Document in Attributes.swift + enforce in JS bridge | 5 min |
| 7 | Saved → chain to DailyStory (Gap 5) | JS bridge only — document contract | 5 min |
| 8 | Shocked mascot vs sad mascot (Gap 14) | Confirm with designer if SadMascot is correct or need new export | Designer dependency |

---

## Changelog

| Date | Author | Change |
|---|---|---|
| 2026-04-10 | Huy | Initial gap analysis created |
