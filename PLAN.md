# Implementation Plan: Daily Story PostHog Tracking

> **Spec:** `/Users/sunny/Downloads/daily-story-tracking-plan.md`
> **Branch:** `3.5.0`

---

## Context & Architecture Decisions

**Existing patterns this plan follows:**
- `useLessonTracking` hook pattern (mount/unmount lifecycle, time tracking via `startTimeRef`)
- `useQuizTracking` hook pattern (auto-fire start on mount, track on unmount)
- `AnalyticsService` typed interfaces + dedicated methods → `trackCustomEvent()`
- Person property updates via `$set` capture
- Customer.io forwarding for key engagement events

**Key mapping — spec terminology → codebase reality:**
| Spec concept | Codebase equivalent |
|---|---|
| `story_id` | `(displayedQuest \|\| todayQuest)?.id` (Supabase `daily_content.id`) |
| `story_date` | `(displayedQuest \|\| todayQuest)?.date` (YYYY-MM-DD) |
| `story_title` | `todayQuest.content.today_title` or `card1.title` |
| `cards_seen` (1-3) | WATCH modal opened (1), EXPLORE opened (2), QUIZ opened (3) |
| `scroll_depth_pct` | `progress / 100` (0, 0.33, 0.67, 1.0 — based on 3 sections) |
| `entry_source` | `'today_tab'` (default), `'rewind'` (historical), `'notification'` (from push) |
| `is_today` | `!isHistoricalView` |
| `rewind_tapped` | `handleDateClick` when `isPastDate` |
| `rewind_blocked` | `handleDateClick` when `isPastDate && !isSubscribed` |
| `media_played` | Video play in `TodayVideoLesson`, audio play in `TodayScrollableLesson` |

**Debouncing strategy for `daily_story_card_viewed`:**
Each card is a fullscreen modal, so it's naturally debounced — user can only view one at a time. Track via a `Set<number>` ref to fire once per card per session.

---

## Step 1: Add event interfaces to AnalyticsService.ts

**File:** `services/AnalyticsService.ts` (after line ~247, before `class AnalyticsService`)

Add 8 new TypeScript interfaces:

```typescript
// ==================== DAILY STORY EVENT INTERFACES ====================

interface DailyStoryViewedEvent {
  story_id: string;
  story_date: string;
  story_title: string;
  entry_source: 'today_tab' | 'notification' | 'rewind' | 'deep_link';
  is_today: boolean;
}

interface DailyStoryDismissedEvent {
  story_id: string;
  time_spent_seconds: number;
  scroll_depth_pct: number;     // 0–1 mapped from progress (0, 0.33, 0.67, 1.0)
  cards_seen: number;           // 0–3 (WATCH, EXPLORE, QUESTIONS)
  completed: boolean;
}

interface DailyStoryCardViewedEvent {
  story_id: string;
  card_index: number;           // 1 = WATCH, 2 = EXPLORE, 3 = QUESTIONS
}

interface DailyStoryCompletedEvent {
  story_id: string;
  story_date: string;
  time_spent_seconds: number;
  entry_source: 'today_tab' | 'notification' | 'rewind' | 'deep_link';
}

interface DailyStoryMediaPlayedEvent {
  story_id: string;
  media_type: 'audio' | 'video';
  media_id: string;
}

interface DailyStoryRewindTappedEvent {
  story_date: string;
  is_subscribed: boolean;
  days_ago: number;
}

interface DailyStoryRewindBlockedEvent {
  story_date: string;
  days_ago: number;
}

interface DailyStoryStreakIncrementedEvent {
  story_id: string;
  current_streak: number;
  is_first_action_today: boolean;
}
```

**Why these types:** Follows the existing pattern where every PostHog event has a dedicated TypeScript interface — provides compile-time safety and documents the exact shape of each event.

---

## Step 2: Add tracking methods to AnalyticsService.ts

### 2a. Add 8 event methods (after line ~1127, in the `NEW TRACKING EVENTS` section)

```typescript
// ==================== DAILY STORY EVENTS ====================

trackDailyStoryViewed(properties: DailyStoryViewedEvent) {
  this.trackCustomEvent('daily_story_viewed', properties);
}

trackDailyStoryDismissed(properties: DailyStoryDismissedEvent) {
  this.trackCustomEvent('daily_story_dismissed', properties);
}

trackDailyStoryCardViewed(properties: DailyStoryCardViewedEvent) {
  this.trackCustomEvent('daily_story_card_viewed', properties);
}

trackDailyStoryCompleted(properties: DailyStoryCompletedEvent) {
  this.trackCustomEvent('daily_story_completed', properties);
}

trackDailyStoryMediaPlayed(properties: DailyStoryMediaPlayedEvent) {
  this.trackCustomEvent('daily_story_media_played', properties);
}

trackDailyStoryRewindTapped(properties: DailyStoryRewindTappedEvent) {
  this.trackCustomEvent('daily_story_rewind_tapped', properties);
}

trackDailyStoryRewindBlocked(properties: DailyStoryRewindBlockedEvent) {
  this.trackCustomEvent('daily_story_rewind_blocked', properties);
}

trackDailyStoryStreakIncremented(properties: DailyStoryStreakIncrementedEvent) {
  this.trackCustomEvent('daily_story_streak_incremented', properties);
}
```

### 2b. Add `daily_story_completed` to Customer.io forwarded events (line ~327)

Add `'daily_story_completed'` to the `customerIOEvents` array so it reaches Customer.io for push notification campaigns:

```typescript
const customerIOEvents = [
  // ... existing events ...
  'daily_story_completed',  // NEW
];
```

### 2c. Add 3 new person properties to `initializePersonProperties` (line ~1145)

Add to the `nullProperties` object:

```typescript
// Daily story properties
last_daily_story_date: null,
daily_stories_read_count: null,
daily_story_completion_rate: null,
```

This adds them to the schema initialization (21 → 24 properties). Update the console.log count on line ~1178.

### 2d. Add `updateDailyStoryProperties` method (after `updateProgressProperties`)

```typescript
updateDailyStoryProperties(data: {
  last_daily_story_date?: string;
  daily_stories_read_count?: number;
  daily_story_completion_rate?: number;
}) {
  if (!this.posthog) {
    if (__DEV__) {
      console.log('📊 [Analytics] Skipping updateDailyStoryProperties (PostHog not ready)');
    }
    return;
  }

  const properties = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  );

  if (Object.keys(properties).length === 0) return;

  this.posthog.capture('$set', {
    $set: properties,
  });
  console.log('📊 [Analytics] Updated daily story properties:', properties);
}
```

---

## Step 3: Create `useDailyStoryTracking` hook

**New file:** `hooks/useDailyStoryTracking.ts`

**Pattern:** Follows `useLessonTracking` (mount/unmount time tracking) + `useQuizTracking` (XP access via context).

```typescript
interface UseDailyStoryTrackingProps {
  storyId: string | null;
  storyDate: string | null;
  storyTitle: string | null;
  entrySource: 'today_tab' | 'notification' | 'rewind' | 'deep_link';
  isToday: boolean;
  isSubscribed: boolean;
}
```

**Lifecycle behavior:**
- **Mount (quest loaded):** Fire `daily_story_viewed`, update `last_daily_story_date` person property
- **Card modal opens:** Fire `daily_story_card_viewed` (debounced via `cardsSeenRef: Set<number>`)
- **Quiz complete:** Fire `daily_story_completed`, update `daily_stories_read_count` person property (via `$set` with `$set_once` not available — will use increment logic)
- **Unmount / dismiss:** Fire `daily_story_dismissed` with time_spent, scroll_depth, cards_seen, completed

**Returned API:**
```typescript
{
  trackCardViewed: (cardIndex: 1 | 2 | 3) => void,
  trackCompleted: () => void,
  trackMediaPlayed: (mediaType: 'audio' | 'video', mediaId: string) => void,
  trackRewindTapped: (storyDate: string, daysAgo: number) => void,
  trackRewindBlocked: (storyDate: string, daysAgo: number) => void,
  trackStreakIncremented: (currentStreak: number, isFirstActionToday: boolean) => void,
}
```

**Important implementation detail for `daily_stories_read_count`:**
PostHog doesn't support atomic `$increment` on person properties from the client SDK. Instead:
- Track count via the `daily_story_completed` event itself
- Use PostHog's cohort/formula features to calculate `daily_stories_read_count` from event count
- OR maintain a local counter in AsyncStorage and `$set` it on each completion
- **Recommended:** Use AsyncStorage counter (matches existing pattern in GamifiedProgress)

**Important implementation detail for `daily_story_completion_rate`:**
- This is a derived metric: `daily_story_completed` count / `daily_story_viewed` count
- Better computed as a PostHog insight than stored as person property (stale quickly)
- **Recommendation:** Still set it as person property for Customer.io segmentation, but compute from local counters stored in AsyncStorage

---

## Step 4: Integrate hook into `today.tsx`

**File:** `app/(tabs)/today.tsx`

### 4a. Import and initialize hook

After the existing hooks (line ~348):

```typescript
const tracking = useDailyStoryTracking({
  storyId: (displayedQuest || todayQuest)?.id || null,
  storyDate: (displayedQuest || todayQuest)?.date || null,
  storyTitle: (displayedQuest || todayQuest)?.content?.today_title || null,
  entrySource: isHistoricalView ? 'rewind' : 'today_tab',
  isToday: !isHistoricalView,
  isSubscribed,
});
```

### 4b. Wire `trackCardViewed` into modal opens

In the `setActiveModal` calls, add tracking:

- When `setActiveModal("video")` is called → `tracking.trackCardViewed(1)`
- When `setActiveModal("reading")` is called → `tracking.trackCardViewed(2)`
- When `setActiveModal("quiz")` is called → `tracking.trackCardViewed(3)`

**Implementation approach:** Create a wrapper function:

```typescript
const openModal = (modal: ModalState) => {
  setActiveModal(modal);
  if (modal === 'video') tracking.trackCardViewed(1);
  if (modal === 'reading') tracking.trackCardViewed(2);
  if (modal === 'quiz') tracking.trackCardViewed(3);
};
```

Replace all `setActiveModal("video")` / `setActiveModal("reading")` / `setActiveModal("quiz")` calls with `openModal(...)`. Keep `setActiveModal("none")` as-is (no tracking needed for close).

### 4c. Wire `trackRewindTapped` / `trackRewindBlocked` into `handleDateClick` (line ~679)

In the `handleDateClick` function:

```typescript
// After line 684 (date clicked log):
if (isPastDate) {
  const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  tracking.trackRewindTapped(dateStr, daysAgo);

  if (!isSubscribed) {
    tracking.trackRewindBlocked(dateStr, daysAgo);
  }
}
```

### 4d. Wire `trackCompleted` into `handleQuizComplete` (line ~1140)

After line 1149 (`await reportTodayComplete(questDate)`):

```typescript
tracking.trackCompleted();
```

### 4e. Wire `trackMediaPlayed` — pass callback to child components

Add `onMediaPlayed` prop to `TodayVideoLesson` and `TodayScrollableLesson`:

```typescript
// TodayVideoLesson
onMediaPlayed={() => tracking.trackMediaPlayed('video', (displayedQuest || todayQuest)!.id)}

// TodayScrollableLesson
onMediaPlayed={() => tracking.trackMediaPlayed('audio', (displayedQuest || todayQuest)!.id)}
```

---

## Step 5: Add `onMediaPlayed` callback to child components

### 5a. TodayVideoLesson.tsx

**File:** `components/lessons/today/TodayVideoLesson.tsx`

- Add `onMediaPlayed?: () => void` to the component's props interface
- Call `onMediaPlayed?.()` when video starts playing (in the video player's `onPlayingStatusChange` or equivalent callback)
- Fire only once per session (use a `hasTrackedMediaRef`)

### 5b. TodayScrollableLesson.tsx

**File:** `components/lessons/today/TodayScrollableLesson.tsx`

- Add `onMediaPlayed?: () => void` to the component's props interface
- Call `onMediaPlayed?.()` when voiceover audio starts playing (in the `toggleAudio`/play handler)
- Fire only once per session (use a `hasTrackedMediaRef`)

---

## Step 6: Wire streak tracking (conditional)

Per the spec: "Only needed if daily stories count toward streak. If not, skip this event."

**Current behavior:** `reportTodayComplete(questDate)` in `GamificationOrchestrator` already increments the streak. The streak increment is internal to the orchestrator.

**Options:**
1. **Add tracking inside GamificationOrchestrator** — fire `daily_story_streak_incremented` when `reportTodayComplete` increments the streak
2. **Skip this event** — streak data is already tracked via `updateProgressProperties({ current_streak })` person property updates

**Recommendation:** Option 1 — add the event inside `GamificationOrchestrator.reportTodayComplete()` since it has access to streak state before/after. This keeps the tracking source-of-truth close to the logic.

**File:** `gamification/engines/GamificationOrchestrator.tsx`

In the `reportTodayComplete` method, after streak is incremented:

```typescript
analyticsService.trackDailyStoryStreakIncremented({
  story_id: questDate, // or pass story_id as parameter
  current_streak: newStreak,
  is_first_action_today: wasFirstActionToday,
});
```

---

## Step 7: Add `daily_story` trigger to subscribe_screen_viewed

Per spec: "Add `daily_story` as a value for the existing `subscribe_screen_viewed` → `trigger` property when paywall is shown from rewind"

**File:** `app/(tabs)/today.tsx`, in `handleShowPaywall` (line ~462)

Before calling `RevenueCatUI.presentPaywall()`, track the paywall view with trigger:

```typescript
analyticsService.trackCustomEvent('subscribe_screen_viewed', {
  trigger: 'daily_story_rewind',
  story_date: date.toISOString().split('T')[0],
});
```

---

## Step 8: Lint & verify

```bash
npm run lint
```

Verify:
- [ ] All 8 events have typed interfaces
- [ ] All 8 events have dedicated methods in AnalyticsService
- [ ] Hook fires `daily_story_viewed` on mount
- [ ] Hook fires `daily_story_dismissed` on unmount with metrics
- [ ] `daily_story_card_viewed` fires once per card per session
- [ ] `daily_story_completed` fires on quiz completion
- [ ] `daily_story_media_played` fires on video/audio play
- [ ] `daily_story_rewind_tapped/blocked` fire from calendar
- [ ] 3 new person properties initialized + updated
- [ ] `daily_story_completed` forwarded to Customer.io
- [ ] `subscribe_screen_viewed` has `trigger: 'daily_story_rewind'`
- [ ] No lint errors

---

## Files Modified (Summary)

| File | Changes |
|------|---------|
| `services/AnalyticsService.ts` | +8 interfaces, +8 methods, +1 person property method, +3 init properties, +1 Customer.io event |
| `hooks/useDailyStoryTracking.ts` | **NEW** — tracking hook with mount/unmount lifecycle |
| `app/(tabs)/today.tsx` | Import hook, wire all 6 tracking touchpoints, add `openModal` wrapper |
| `components/lessons/today/TodayVideoLesson.tsx` | Add `onMediaPlayed` prop, fire on video play |
| `components/lessons/today/TodayScrollableLesson.tsx` | Add `onMediaPlayed` prop, fire on audio play |
| `gamification/engines/GamificationOrchestrator.tsx` | Add streak increment tracking in `reportTodayComplete` |

**Estimated event interfaces:** 8 new
**Estimated new lines of code:** ~250 (hook) + ~100 (AnalyticsService) + ~30 (today.tsx wiring) + ~15 (child components) = ~395 lines
