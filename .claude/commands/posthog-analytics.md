---
name: posthog-analytics
description: Use when adding PostHog events, person properties, or tracking hooks to the Archives Expo app. Use when verifying event data via PostHog MCP. Use when auditing which analytics a component sends. Use when creating PostHog dashboards or insights. Activates for analytics, tracking, events, capture, person properties, Customer.io forwarding, useLessonTracking, useQuizTracking, AnalyticsService, PostHog MCP, query-run, HogQL.
---

# PostHog Analytics

## Overview

All analytics flow through a three-layer stack. Never bypass it.

```
AnalyticsService (singleton)  →  Tracking Hooks (React)  →  PostHog MCP (verification)
services/AnalyticsService.ts     hooks/use*Tracking.ts       mcp__posthog__query-run
```

## When to Use

- Adding a new tracking event or person property
- Wiring analytics into a new or existing component
- Checking if an event fires correctly in production
- Auditing what a component tracks
- Creating PostHog dashboards or insights
- **NOT for** modifying PostHog initialization, session replay config, or ATT flow

## Pre-Flight (MANDATORY)

Before ANY change:
1. Read `services/AnalyticsService.ts` — understand existing interfaces and methods
2. Search for duplicates: `grep -rn "<event_name>" --include="*.ts" --include="*.tsx"`
3. Verify in production via `mcp__posthog__query-run` (count > 0 = already exists)
4. Read the relevant hook if modifying hook-level tracking

## Quick Reference

### Key Files

| File | Role |
|------|------|
| `services/AnalyticsService.ts` | Event interfaces, track methods, person properties, Customer.io forwarding |
| `hooks/useAnalytics.ts` | General hook with `safeTrack()` wrapper |
| `hooks/useLessonTracking.ts` | Lesson events (video play/pause/complete, card expand, buffering) |
| `hooks/useQuizTracking.ts` | Quiz events with XP calculation integration |
| `services/CustomerIOService.ts` | Push notification campaign event sync |

### Existing Events (30+)

**Auth:** `user_signed_up`, `user_session_in`, `auth_screen_viewed`, `auth_method_selected`, `auth_succeeded`, `auth_failed`, `auth_screen_exited`
**Onboarding:** `onboarding_completed`, `onboarding_question_answered`, `onboarding_screen_exited`, `era_selected`, `permission_requested`
**Lessons:** `lesson_started`, `lesson_completed`, `video_played`, `video_paused`, `video_completed`, `reading_card_expanded`, `video_buffering`, `carousel_image_view`, `screen_press`, `first_lesson`
**Quizzes:** `quiz_started`, `quiz_question_answered`, `quiz_completed`, `quiz_retake`, `quiz_results_viewed`
**Progress:** `module_started`, `module_completed`, `module_tracking`, `adventure_started`, `adventure_complete_continue`
**Notifications:** `notification_sent`, `notification_clicked`, `push_notifications_enabled`, `push_notifications_declined`
**Other:** `subscription_details`, `user_account_deleted`, `drop_off`, `page_view`, `$exception`

### 21 Person Properties

`knowledge_level`, `daily_learning_goal`, `learning_motivation`, `awareness_channel`, `onboarding_result`, `last_active_at`, `is_push_enabled`, `current_streak`, `current_streak_date`, `longest_streak`, `longest_streak_date`, `lessons_completed`, `modules_completed`, `adventures_completed`, `eras_completed`, `quizzes_completed`, `total_xp`, `era_xp`, `subscription_product_id`, `subscription_billing_cycle`, `rc_subscription_status`

### Naming Conventions

| What | Convention | Example |
|------|-----------|---------|
| Event names | `snake_case`, `{noun}_{past_verb}` | `lesson_completed`, `quiz_started` |
| Interfaces | `PascalCase` + `Event` | `LessonCompletedEvent` |
| Methods | `track` + `PascalCase` | `trackLessonCompleted` |
| Properties | `snake_case` | `time_spent_seconds`, `is_correct` |
| IDs | `{noun}_id: string \| number` | `adventure_id`, `module_id` |
| Booleans | `is_{adjective}` | `is_retake`, `is_authenticated` |
| Durations | `time_{context}_seconds` or `{context}_seconds` | `time_spent_seconds` |
| PostHog specials | `$current_url`, `$screen_name` | Screen tracking in activity view |

---

## Adding a New Event

### 1. Define Interface

In `services/AnalyticsService.ts`, EVENT INTERFACES section (~lines 17-248):

```typescript
interface YourNewEvent {
  adventure_id: string | number;  // Support Era 1 (number) + Era 2 (string)
  module_id: string | number;
  your_property: string;
  duration_seconds?: number;
  // Era context — REQUIRED for content events
  era_id?: string;
  era_name?: string;
  adventure_number?: number;
  module_number?: number;
  $current_url?: string;    // Optional: PostHog activity view
  $screen_name?: string;    // Optional: screen name
}
```

**Rules:** No `$timestamp`/`$os`/`$geoip_*` (auto-captured). Use union types over `string`. Never use `any`.

### 2. Add Track Method

**Pattern A — Direct capture** (events needing base properties or custom logic):
```typescript
trackYourEvent(data: YourNewEvent) {
  const event = { ...data, ...this.getBaseProperties() };
  this.posthog?.capture('your_event_name', event);
  this.trackToCustomerIO('your_event_name', event);  // Only if needed — see step 3
  console.log('📊 [Analytics] Your Event:', event);
}
```

**Pattern B — Via trackCustomEvent** (simple forwarding, most new events):
```typescript
trackYourEvent(properties: YourNewEvent) {
  this.trackCustomEvent('your_event_name', properties);
}
```

### 3. Customer.io Decision

Add to `customerIOEvents` array in `trackToCustomerIO()` (~line 327) **ONLY IF**:
- Key engagement milestone (lesson/quiz/module complete)
- Useful for push campaign segmentation
- Conversion action (subscription, sign-up)

**Never add:** micro-interactions, debug events, buffering, screen views.

### 4. Wire Into Components

**In a tracking hook** (lesson/quiz events — recommended):
```typescript
const trackYourEvent = useCallback((param: string) => {
  analyticsService.trackYourEvent({
    adventure_id: adventureId, module_id: moduleId, lesson_id: lessonId,
    your_property: param,
    era_id: eraId, era_name: eraName,
    adventure_number: adventureNumber, module_number: moduleNumber,
  });
}, [adventureId, moduleId, lessonId, eraId, eraName, adventureNumber, moduleNumber]);
```
Add to the hook's return object.

**Direct service call** (non-lesson/quiz):
```typescript
import { analyticsService } from '@/services/AnalyticsService';
const handlePress = () => { analyticsService.trackYourEvent({ ... }); };
```

### 5. Verify via PostHog MCP

```
mcp__posthog__query-run → TrendsQuery with event name, dateRange "-7d"
mcp__posthog__query-generate-hogql-from-question → "Show last 10 <event> events with properties"
```

### 6. Lint

```bash
npm run lint
```

---

## Adding a Person Property

1. **Null-initialize** in `initializePersonProperties()` (~line 1137): add `your_prop: null`
2. **Update method** — extend existing (`updateProgressProperties`, `updateOnboardingProperties`, etc.) or create new:
```typescript
updateYourProperties(data: { your_prop?: string | null }) {
  if (!this.posthog) { if (__DEV__) console.log('📊 Skipping (PostHog not ready)'); return; }
  const props = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
  if (Object.keys(props).length === 0) return;
  this.posthog.capture('$set', { $set: props });
}
```
3. **Customer.io sync** (if needed): `CustomerIOService.setProfileAttributes({ your_prop: value })`
4. **Verify**: `mcp__posthog__query-generate-hogql-from-question` → "Show distinct person property 'your_prop'"

---

## Auditing a Component

1. Read component, search for: `analyticsService`, `useAnalytics`, `useLessonTracking`, `useQuizTracking`, `posthog.capture`
2. Query live: `mcp__posthog__query-generate-hogql-from-question` → "Event counts grouped by event name where $screen_name contains '<screen>'"
3. Check volume: `mcp__posthog__query-run` → TrendsQuery for specific event, last 30d

---

## Creating Insights & Dashboards

1. **Test query** with `mcp__posthog__query-run` first — always
2. **Save** with `mcp__posthog__insight-create-from-query`
3. **Dashboard** with `mcp__posthog__dashboard-create` + `mcp__posthog__add-insight-to-dashboard`

---

## PostHog MCP Tools

| Tool | Use For |
|------|---------|
| `mcp__posthog__query-run` | **Primary**: event volumes, trends, funnels, breakdowns |
| `mcp__posthog__query-generate-hogql-from-question` | Natural language queries, raw event inspection |
| `mcp__posthog__docs-search` | PostHog SDK/API documentation lookup |
| `mcp__posthog__insight-create-from-query` | Save tested query as reusable insight |
| `mcp__posthog__insight-query` | Re-run existing insight |
| `mcp__posthog__insight-get` / `insight-update` | Read/modify saved insights |
| `mcp__posthog__dashboard-create` | Create new dashboard |
| `mcp__posthog__add-insight-to-dashboard` | Add insight to dashboard |
| `mcp__posthog__feature-flag-get-all` | List feature flags |
| `mcp__posthog__create-feature-flag` | Create new feature flag |

**Note:** `entity-search` requires elevated permissions and may return 403. Use `query-run` (count > 0) to verify events exist.

---

## Safety Rules

1. **NEVER** call `posthog.capture()` directly in components — go through AnalyticsService or hooks
2. **NEVER** track in render body — only event handlers, `useCallback`, or cleanup effects
3. **NEVER** create duplicate events — search codebase + query PostHog first
4. **NEVER** put PII in event properties — use person properties (`$set`) for email/name/phone
5. **NEVER** modify existing event schemas — adding properties OK, renaming/removing breaks dashboards
6. **NEVER** skip null-check pattern — PostHog may not be initialized (iOS ATT permission)
7. **NEVER** use `any` type for event properties — always define typed interface
8. **ALWAYS** include era context (`era_id`, `era_name`) for content events
9. **ALWAYS** use `snake_case` for event names and property keys
10. **ALWAYS** run `npm run lint` after changes

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Calling `posthog.capture()` in component | Use `analyticsService.trackX()` or tracking hook |
| Tracking in `useEffect` without deps guard | Use `useCallback` or `hasStartedRef` pattern |
| Missing era context on content event | Add `era_id`, `era_name` to interface and call site |
| Forgetting Customer.io sync for milestone | Add to `customerIOEvents` array |
| Creating event that already exists | Search codebase + query PostHog MCP before creating |
| Using `any` for event payload | Define `interface XEvent` with typed properties |
| Adding `$timestamp` to event | PostHog auto-captures this — remove it |

## Red Flags — STOP and Re-check

- About to call `posthog.capture()` outside AnalyticsService
- Event name looks similar to an existing one
- No era context on a content-related event
- Using `Record<string, any>` for event properties
- Tracking fires on every render (missing deps guard)
- PII showing up in event properties instead of person properties
