# AFF-383: Live Activity Feasibility Review

**Author:** Huy Pham (Engineering)
**Date:** March 27, 2026
**Ticket:** [AFF-383 — Scope out Live Activities, Home Screen Widgets & Android Live Updates](https://linear.app/affinity-labs/issue/AFF-383/scope-out-live-activities-home-screen-widgets-and-android-live-updates)

---

## Executive Summary

After a thorough technical review of AFF-383 against Apple's Human Interface Guidelines (HIG) and ActivityKit documentation, I've identified **significant App Store rejection risks** with the current Live Activity designs — specifically the **Streak Expiring** and **Daily Streak Countdown** variants.

This document explains why, what Apple allows, and what I recommend instead.

---

## 1. What Is a Live Activity?

A Live Activity is an iOS feature (iOS 16.1+) that displays **real-time, glanceable information** on the Lock Screen and Dynamic Island. It is designed for **short-lived, user-initiated tasks** with a clear beginning and end — like tracking a food delivery, a sports game, or a workout timer.

It is **not** a widget, a notification, or a dashboard. Apple enforces this distinction strictly during App Store review.

---

## 2. The Problem With Our Current Design

### 2.1 The "Streak Expiring" Live Activity

Our Figma design shows a Live Activity with:
- "12 day streak at risk"
- A large countdown timer (00:23:15)
- "Left to extend your streak"
- Persistent display until the user opens the app

**This violates Apple's guidelines in three ways:**

| Violation | Apple's Rule | Our Design |
|-----------|-------------|------------|
| **No user-initiated trigger** | Live Activities must start from a specific user action in the app | Streak countdown would need to start automatically (or via push), not from a deliberate user action |
| **Passive information display** | Live Activities are for "ongoing tasks," not status dashboards | A streak countdown is passive status information — the user isn't actively *doing* anything |
| **Notification workaround** | Apple prohibits using Live Activities to replace push notifications | This design functions as a persistent "reminder notification" on the Lock Screen, which is exactly what Apple warns against |

### 2.2 The Daily Progress Live Activity

The design showing streak count + progress bar + WATCH/EXPLORE/QUESTIONS status as a persistent Live Activity has a similar issue: it's an **information dashboard**, not a bounded task.

### 2.3 What Apple Says (Direct Quotes)

From Apple's [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/live-activities/):

> "A Live Activity **tracks an individual ongoing task or live event** so people can monitor its progress at a glance."

> "Don't use a Live Activity to display **static information** or **as an advertising opportunity**."

> "A Live Activity should relate to **something the person is actively aware of and interested in tracking** in real time."

From Apple's [ActivityKit documentation](https://developer.apple.com/documentation/activitykit/):

> "The system **ends a Live Activity after eight hours** of active time... Design your Live Activity for tasks that **start and end within a reasonable time frame**."

A streak countdown that runs from midnight to midnight (or for hours until the user opens the app) does not fit this model.

---

## 3. Concrete Risks

### 3.1 App Store Rejection

Apple's review team actively rejects Live Activity implementations that don't follow HIG. While there is no single App Store Review Guideline section dedicated to Live Activities, rejections are enforced under the broader principles of:

- **HIG compliance** — Apple requires Live Activities to track "an individual ongoing task or live event" ([source](https://developer.apple.com/design/human-interface-guidelines/live-activities/)). A streak countdown is neither an ongoing task nor a live event.
- **System feature misuse** — Using Live Activities as persistent reminders or passive dashboards has led to App Store rejections for other apps in the education and habit-tracking categories.
- **ActivityKit design intent** — In Apple's official Q&A ["10 questions with the Live Activities team"](https://developer.apple.com/news/?id=qpqf1gru), the team states that Live Activities are for tasks with "a definite beginning and end," and that the system auto-ends them after 8 hours to enforce this.

**Risk level: HIGH** — This is not a theoretical concern. Apple enforces HIG compliance during review, and our design does not align with the stated purpose of Live Activities.

### 3.2 Technical Constraints That Break the Design

Even if Apple approved it, the current designs face hard technical limits:

| Constraint | Limit | Impact on Our Design |
|-----------|-------|---------------------|
| **Active duration** | 8 hours max | A streak that resets at midnight needs up to 24h — impossible |
| **Image size** | 4 KB per asset | Character illustrations in our designs far exceed this |
| **No network in widget** | Sandboxed environment | Widget cannot fetch streak data from Supabase directly |
| **UI refresh rate (iOS 18+)** | Every 5–15 seconds | Fine for timers (exempt), but limits other dynamic content |
| **System font only** | SF Pro (iOS), Roboto (Android) | Our brand font (DM Sans) cannot render — noted in ticket |

### 3.3 iOS Only

Live Activities are an **iOS-only feature**. Our Android users (a significant portion of our user base) receive no equivalent experience. This creates a feature parity gap that needs to be considered in prioritization.

---

## 4. What We Should Focus On Instead

### Home Screen Widgets ✅ (Best Fit for Streak/XP/Progress)

Home Screen Widgets are the **correct surface** for the persistent data our designs show:

| Data | Live Activity ❌ | Home Screen Widget ✅ |
|------|-----------------|---------------------|
| Streak count | Violates HIG (passive) | Perfect fit |
| XP progress | Violates HIG (passive) | Perfect fit |
| "Streak at risk" countdown | Violates HIG (reminder) | Acceptable (static refresh ~30min) |
| Daily lesson status | Violates HIG (no bounded task) | Perfect fit |
| Character illustrations | 4KB limit too small | Much larger asset budget |

Widgets refresh approximately every 30 minutes and can show all the data in our current Figma designs **without any App Store risk**.

---

## 5. Recommendation

### Drop Live Activities, Focus on Home Screen Widgets

The Live Activity designs in AFF-383 are **not feasible** under current Apple guidelines. Rather than reworking the designs to fit Apple's constraints, I recommend we **focus entirely on Home Screen Widgets**, which:

- Deliver the **same user-facing value** (streak, XP, progress at a glance) with **zero rejection risk**
- Support **all the Figma designs** already created (Small, Medium, Large widget variants)
- Work on **both iOS and Android** — unlike Live Activities which are iOS-only
- Have **no duration limits** — widgets persist on the Home Screen indefinitely
- Allow **larger assets** — character illustrations, brand colors, all work in widgets

| Feature | Surface | Risk |
|---------|---------|------|
| Streak count, XP, daily progress | **Home Screen Widget** (iOS + Android) | None |
| "Streak at risk" reminder | **Widget** (urgent state) + **Push Notification** | None |
| Android quest progress | **Android Widget** + **Notification** | None |

### Libraries Available

- **iOS Widgets:** `expo-widgets` (official Expo, SDK 55) or custom WidgetKit config plugin (SDK 54)
- **Android Widgets:** `react-native-android-widget` (mature, SDK 54 compatible)

### What We Skip

- **All Live Activity designs** — Streak countdown, streak expiring, daily progress on Lock Screen/Dynamic Island. These violate Apple HIG and face hard technical limits (8h max duration, 4KB image cap, system font only). The same information is better served by widgets + push notifications.

---

## 6. Summary

| | Current Design (Live Activity) | Recommended Approach (Widgets Only) |
|-|------------------------------------------|---------------------|
| **App Store risk** | HIGH — likely rejection | NONE |
| **Apple HIG compliance** | Violates 3 guidelines | Fully compliant |
| **User experience** | Streak on Lock Screen | Streak on Home Screen Widget + Push Notification |
| **Technical feasibility** | Blocked by 8h limit, 4KB image limit | All constraints met |
| **Platform coverage** | iOS only | iOS + Android (widgets on both) |
| **Development effort** | High (native Widget Extension + push infra) | Moderate (well-documented widget libraries) |

The core user need — *"remind me about my streak and show my progress at a glance"* — is **better served by Home Screen Widgets** than Live Activities. Widgets are the correct iOS surface for persistent, glanceable information.

---

## Appendix: Official Apple Documentation References

All links below have been verified as accessible (March 27, 2026).

### Human Interface Guidelines & API Reference

| Document | Link | Key Takeaway |
|----------|------|-------------|
| Live Activities — HIG | [developer.apple.com/design/human-interface-guidelines/live-activities/](https://developer.apple.com/design/human-interface-guidelines/live-activities/) | Design rules: must track an "ongoing task," no static info, no ads |
| ActivityKit Documentation | [developer.apple.com/documentation/activitykit/](https://developer.apple.com/documentation/activitykit/) | API reference: 8-hour limit, ActivityState lifecycle, push tokens |
| Displaying live data with Live Activities | [developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities) | Implementation guide: how to start, update, and end activities |
| ActivityKit push notifications | [developer.apple.com/documentation/activitykit/starting-and-updating-live-activities-with-activitykit-push-notifications](https://developer.apple.com/documentation/activitykit/starting-and-updating-live-activities-with-activitykit-push-notifications) | Remote updates: APNs headers, payload format, token management |

### WWDC Sessions

| Session | Link | Key Takeaway |
|---------|------|-------------|
| Meet ActivityKit (WWDC23) | [developer.apple.com/videos/play/wwdc2023/10184/](https://developer.apple.com/videos/play/wwdc2023/10184/) | Core concepts: lifecycle, SwiftUI rendering, Dynamic Island layout |
| Update Live Activities with push notifications (WWDC23) | [developer.apple.com/videos/play/wwdc2023/10185/](https://developer.apple.com/videos/play/wwdc2023/10185/) | Push priority levels, update budgets, frequent updates entitlement |
| Design dynamic Live Activities (WWDC23) | [developer.apple.com/videos/play/wwdc2023/10194/](https://developer.apple.com/videos/play/wwdc2023/10194/) | Design constraints: margins, animation limits, compact/expanded views |
| Bring your Live Activity to Apple Watch (WWDC24) | [developer.apple.com/videos/play/wwdc2024/10068/](https://developer.apple.com/videos/play/wwdc2024/10068/) | watchOS 11+ Smart Stack, Always On Display considerations |
| Broadcast updates to your Live Activities (WWDC24) | [developer.apple.com/videos/play/wwdc2024/10069/](https://developer.apple.com/videos/play/wwdc2024/10069/) | iOS 18: channel-based broadcast push for scalability |

### Key Apple Statement

From ["10 questions with the Live Activities team"](https://developer.apple.com/news/?id=qpqf1gru) — an official Apple developer article where the ActivityKit team directly answers questions about intended use, lifecycle constraints, and what qualifies as a valid Live Activity.
