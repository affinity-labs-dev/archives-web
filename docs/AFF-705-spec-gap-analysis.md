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
| Time threshold | Past **9:00 PM** local | Documented as 21:00 in Attributes.swift + StreakGuardLiveActivity.swift | ✅ Match |
| Cards completed today | **Zero** quest cards | Not enforced in widget (JS bridge responsibility) | ✅ Correct scope |
| Minimum streak | Streak **>= 3 days** (no urgency fatigue for new users) | Not enforced in widget (JS bridge responsibility) | ✅ Correct scope — document in JS bridge |

### 1.2 End Conditions

| Condition | Spec | Current | Status |
|---|---|---|---|
| User completes any card | Success — streak saved | `.expiring` → `.saved` state transition | ✅ Implemented |
| Midnight passes | Failed — streak broken | `.expiring` → `.failed` state transition | ✅ Implemented |
| Saved → chains into DailyStory | Start DailyStory with 1 card checked | Not implemented — `.saved` is terminal | 🔴 Missing — JS bridge chaining logic |

### 1.3 Lock Screen Banner

#### Expiring state (Figma 2481:3902)

| Element | Spec | Current | Status |
|---|---|---|---|
| Background | Dark red/maroon | `#470F0A` maroon + red glow gradient | ✅ Match |
| Headline | "12 day streak at risk" | Mixed 22/16pt bold cream text | ✅ Match |
| Countdown | Large timer | 52pt `Text(timerInterval:)` native iOS format | ✅ Match |
| Subtitle | "Left to extend your streak" | 15pt semibold tan `#BF998C` | ✅ Match |
| Mascot | Explorer (worried expression) | `Mascot.imageset` bottom-right aligned | ✅ Match |
| Warning badge | Red dot next to flame | 10pt `Circle()` fill `#E6402E` | ✅ Match |
| Padding | Symmetric top/bottom | `.padding(.top, 18) .padding(.bottom, 38)` | ✅ Match |

#### Saved state (Figma 2773:4522)

| Element | Spec | Current | Status |
|---|---|---|---|
| Background | Dark gray | `#1A1A1A` flat | ✅ Match |
| Headline | "Streak saved!" with flame | "🔥 Streak saved!" 17pt bold white | ✅ Match |
| Streak count | Lime green | "N days" in `#B2E965` | ✅ Match (matches Figma design) |
| CTA text | "Keep it going — complete today's quest" | 13pt medium white 70% opacity | ✅ Implemented |
| Mascot | Celebrator (pom-poms) | `CelebrationMascot.imageset` | ✅ Match |
| Linger duration | 15 minutes | Documented in code/plan | ✅ Match |

#### Failed state (Figma 2764:4517)

| Element | Spec | Current | Status |
|---|---|---|---|
| Background | Dark red/maroon (no glow) | `#470F0A` maroon, no gradient | ✅ Match |
| Headline | "Your 12-day streak has ended" | 17pt bold cream | ✅ Match |
| Subtitle | "Start a new streak today" in light purple | 14pt medium `#D6BBFF` lavender | ✅ Match |
| Mascot | Sad/shocked face | `SadMascot.imageset` | ✅ Match (matches Figma export) |
| Linger duration | 15 minutes | Documented in code/plan | ✅ Match |

### 1.4 Dynamic Island — Compact

| Element | Spec | Current | Status |
|---|---|---|---|
| Leading | Flame + streak count | `🔥` emoji + streak number 14pt semibold white | ✅ Match |
| Trailing (expiring) | Countdown in pink | `Text(Date, style: .timer)` in `#FF6B8A` pink + `.frame(maxWidth: 32)` | ✅ Match |
| Trailing (saved) | Success indicator | Green checkmark SF Symbol | ✅ Match |
| Trailing (failed) | Failed indicator | Red xmark SF Symbol | ✅ Match |
| Timer format | iOS native | `Text(Date, style: .timer)` — iOS auto-formats as `m:ss` or `h:mm:ss` | ✅ Match (iOS limitation accepted) |

### 1.5 Dynamic Island — Expanded

| Element | Spec | Current | Status |
|---|---|---|---|
| Layout | Mini-banner matching lock screen at smaller scale | ZStack with mascot + text VStack (13pt/36pt/13pt typography) | ✅ Match |
| Row 1 | "N-day streak at risk" | 13pt semibold tan `#BF998C` | ✅ Match |
| Countdown | Timer | 36pt `Text(timerInterval:)` cream | ✅ Match |
| Subtitle | "Left to save your streak" | 13pt semibold tan | ✅ Match |
| Mascot | Explorer (worried) | `Mascot.imageset` 102x135 | ✅ Match |

### 1.6 Dynamic Island — Minimal

| Element | Spec | Current | Status |
|---|---|---|---|
| Content | Flame emoji in small pill | `Text("🔥")` 12pt | ✅ Match (Dynamic Island pill is inherently rounded) |

### 1.7 Tap / Deep Link

| Element | Spec | Current | Status |
|---|---|---|---|
| Destination | Today tab | `archives://today` deep link | ✅ Match |
| URL parameter | `?source=live_activity_urgent` | `?source=live_activity_urgent` | ✅ Match |

### 1.8 Timer Behavior

| Element | Spec | Current | Status |
|---|---|---|---|
| Implementation | iOS native `Text(date, style: .timer)` | `Text(Date(timeIntervalSinceNow:), style: .timer)` | ✅ Match |
| Battery | Zero app wakeups | Native rendering, no manual updates | ✅ Match |

### 1.9 Streak Expiry — Remaining Gaps

| # | Gap | Severity | Owner | Notes |
|---|---|---|---|---|
| 1 | Saved → chain into DailyStory activity | 🔴 | JS bridge (Phase 1) | After streak saved, end StreakGuard and start DailyStory with 1 card checked |
| 2 | Start condition: streak >= 3 guard | 🟡 | JS bridge (Phase 1) | Document in bridge layer — widget itself doesn't check |
| 3 | Activity doesn't auto-end at midnight | 🟡 | JS bridge (Phase 1) | Need background timer or push notification to trigger `.failed` transition |

---

## 2. Daily Story Incomplete (DailyStoryLiveActivity)

> **NOTE:** Daily Story is deferred — Streak Expiry is priority. This section documents gaps for future reference only.

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
| Quest Incomplete ended state | "Quest incomplete" + muted blue bar + pink X + shocked mascot | Not implemented | 🔴 Missing |
| Linger duration | 30 minutes (both ended states) | Not documented | 🟠 |

### 2.3 Mascot Gaps

| Character | Spec usage | Asset status |
|---|---|---|
| Teacher (glasses, pointer stick) | DailyStory Lock Screen | ❌ Not exported from Figma |
| Celebrator (pom-poms) | Quest Complete, Streak Saved | ✅ `CelebrationMascot.imageset` |
| Sad/Shocked face | Streak Lost, Quest Incomplete, DI Expanded | ✅ `SadMascot.imageset` |
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
| Only one activity at a time | Required | Not enforced — both can start simultaneously | 🔴 JS bridge must enforce |
| Streak Expiry always wins | If conditions met, replace DailyStory | Not implemented | 🔴 JS bridge logic |
| Saved streak → chain to DailyStory | End StreakGuard, start DailyStory with 1 card checked | Not implemented | 🔴 JS bridge logic |
| Simultaneous start | Start Streak Expiry (not DailyStory) | Not implemented | 🔴 JS bridge logic |

---

## 4. What's Already Correct

### Streak Expiry (fully implemented)

| Aspect | Details |
|---|---|
| 3-state architecture | `StreakState` enum with `.expiring`, `.saved`, `.failed` — exhaustive `if/else` branching |
| Lock screen expiring banner | Maroon + glow + explorer mascot + countdown + warning dot — faithful Figma match |
| Lock screen saved banner | Dark gray + celebrator mascot + CTA "Keep it going" — matches Figma |
| Lock screen failed banner | Maroon + sad mascot + lavender subtitle — matches Figma |
| Dynamic Island compact | `🔥 N` leading + pink timer trailing (`.frame(maxWidth: 32)` for correct pill width) |
| Dynamic Island expanded | Mini-banner layout with mascot + 3-row text (13/36/13pt) |
| Dynamic Island minimal | `🔥` flame emoji |
| Deep link | `archives://today?source=live_activity_urgent` |
| Timer | Native `Text(Date, style: .timer)` — zero battery drain |
| Start time | 21:00 (9 PM) per spec |

### Infrastructure (shared)

| Aspect | Details |
|---|---|
| File structure | 11 Swift files organized by feature (`StreakGuard/`, `DailyStory/`, `Colors.swift`, `Attributes.swift`) |
| Edge case hardening | Defensive clamps (`max(1, streak)`), lineLimit, minimumScaleFactor, dynamicTypeSize cap, singular/plural grammar |
| Expo Module bridge | `LiveActivityModule.swift` with 9 AsyncFunctions, TypeScript types, structured error handling |
| Test screen | Full test UI at `/live-activity-test` with buttons for all StreakGuard states + DailyStory progression |
| Asset pipeline | 3 mascot imagesets (Mascot, CelebrationMascot, SadMascot) at @1x/@2x/@3x |
| Prebuild workflow | `@bacons/apple-targets` convention, `PBXFileSystemSynchronizedRootGroup` auto-include |
| ViewBuilder compatibility | All `switch` converted to `if/else`, no `let` bindings in result builder closures |
| Color system | Centralized `Colors.swift` with 14 semantic color constants across 5 palettes |

---

## 5. Remaining Action Items

### Streak Expiry — JS bridge work (Phase 1)

| # | Item | Owner | Notes |
|---|---|---|---|
| 1 | Saved → chain into DailyStory | JS bridge | After streak saved, end StreakGuard and start DailyStory with 1 card checked |
| 2 | Start condition guards | JS bridge | Enforce: time >= 21:00, zero cards today, streak >= 3 |
| 3 | Midnight auto-transition | JS bridge | Background timer or push notification to trigger `.failed` at midnight |
| 4 | Dismissal timing | JS bridge | `.saved` and `.failed` → `endActivity(dismissInSeconds: 15 * 60)` |
| 5 | Mutual exclusion | JS bridge | Only one activity at a time; StreakGuard replaces DailyStory |

### Daily Story — Deferred (separate work)

| # | Item | Notes |
|---|---|---|
| 1 | Add `DailyStoryState` enum | `.inProgress`, `.completed`, `.incomplete` |
| 2 | Add `currentStreak` + `endDate` to DailyStoryAttributes | Needed for compact/minimal streak display + countdown |
| 3 | Change trigger to Today tab open | Not app background |
| 4 | Build Quest Complete banner | "+30 XP" gold, celebrator mascot, 30 min linger |
| 5 | Build Quest Incomplete banner | Muted blue bar, pink X, shocked mascot, 30 min linger |
| 6 | Fix compact/minimal content | `🔥` + streak (not `📖` + cards) |
| 7 | Get Teacher mascot from designer | Needed for DailyStory Lock Screen |
| 8 | Conflict resolution with StreakGuard | Only one activity at a time |

---

## Changelog

| Date | Author | Change |
|---|---|---|
| 2026-04-10 | Huy | Initial gap analysis created |
| 2026-04-10 | Huy | Updated after applying fixes: pink timer, saved CTA, deep link URL, start time 9 PM. Removed resolved items. Reorganized remaining gaps by owner (widget Swift vs JS bridge). |
