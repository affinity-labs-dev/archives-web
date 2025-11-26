# PostHog Analytics Tracking Specification

**Last Updated:** 2025-01-19
**App Version:** 2.2.8
**Status:** Initial Implementation

---

## 🔧 Base Properties (Auto-Captured by PostHog)

All events automatically include these properties via `getBaseProperties()` and PostHog autocapture:

| Property | Type | Source | Description |
|----------|------|--------|-------------|
| `anonymous_id` | string | Custom | Persistent anonymous identifier (generated on first app launch) |
| `user_id` | string/null | Custom | User ID after authentication (null for anonymous users) |
| `is_authenticated` | boolean | Custom | Whether user is logged in |
| `$timestamp` | datetime | PostHog | Event timestamp (ISO 8601 format) |
| `$os` | string | PostHog | Operating system (ios/android) |
| `$app_version` | string | PostHog | App version |
| `$device_type` | string | PostHog | Device type |
| `$geoip_country_name` | string | PostHog | User's country (from IP) |
| `$geoip_city_name` | string | PostHog | User's city (from IP) |

**⚠️ DO NOT manually track:** `timestamp`, `platform`, `device_type` - PostHog handles these automatically.

---

## 📱 App Lifecycle Events

**🚨 RECOMMENDATION:** Stop sending manual app lifecycle events and enable SDK autocapture.

| Event Name | Description | When It Fires | Status |
|------------|-------------|---------------|---------|
| `app_opened` | User opens the app | App becomes active from closed state | ✅ Implemented |
| `app_closed` | User closes the app | App terminates or goes to background | ✅ Implemented |
| `app_backgrounded` | App goes to background | User switches away from app | ✅ Implemented |
| `app_foregrounded` | App returns to foreground | User returns to app from background | ✅ Implemented |
| `app_entry_point` | Initial app entry tracking | App launch with context | ✅ Implemented |

<details>
<summary><b>📊 Property Details</b></summary>

### `app_opened`
```typescript
{
  platform: string,        // ❌ REMOVE - Use PostHog's $os instead
  timestamp: datetime,     // ❌ REMOVE - Use PostHog's $timestamp instead
  // Base properties included automatically
}
```

### `app_closed`
```typescript
{
  platform: string,        // ❌ REMOVE - Use PostHog's $os instead
  timestamp: datetime,     // ❌ REMOVE - Use PostHog's $timestamp instead
  // Base properties included automatically
}
```

### `app_backgrounded`
```typescript
{
  previous_state: string,  // State before backgrounding
  timestamp: datetime,     // ❌ REMOVE - Use PostHog's $timestamp instead
  // Base properties included automatically
}
```

### `app_foregrounded`
```typescript
{
  previous_state: string,  // State before foregrounding
  timestamp: datetime,     // ❌ REMOVE - Use PostHog's $timestamp instead
  // Base properties included automatically
}
```

### `app_entry_point`
```typescript
{
  is_loaded: boolean,      // Whether app assets are loaded
  is_signed_in: boolean,   // ✅ KEEP - Same as is_authenticated
  screen: string,          // Initial screen shown
  timestamp: datetime,     // ❌ REMOVE - Use PostHog's $timestamp instead
  // Base properties included automatically
}
```

</details>

<details>
<summary><b>🔨 Implementation Notes</b></summary>

**Current Implementation:** `app/_layout.tsx` (AnalyticsWrapper component)

**Recommendation:** Enable PostHog SDK autocapture:
```typescript
// In posthog initialization
const posthog = await PostHog.initAsync(apiKey, {
  host: hostUrl,
  enableSessionReplay: true,
  autocapture: true,  // ✅ Enable this
  captureAppLifecycleEvents: true,  // ✅ Enable this
});
```

Then remove manual tracking code from:
- `app/_layout.tsx` lines 150-250 (AnalyticsWrapper component)
- `services/AnalyticsService.ts` lifecycle tracking methods

</details>

---

## 👤 Signup & Onboarding Events

| Event Name | Description | When It Fires | Status |
|------------|-------------|---------------|---------|
| `user_signed_up` | New user account created | After successful sign up (Apple/Google/Email) | ✅ Implemented |
| `onboarding_completed` | User completes onboarding flow | After all 4 questions + ATT permission | ✅ Implemented |
| `permission_requested` | Permission prompt shown to user | ATT or push notification permission requested | ✅ Implemented |
| `onboarding_question_answered` | User answers onboarding question | Each question selection (real-time) | ✅ Implemented |
| `onboarding_screen_exited` | User leaves onboarding screen | Screen unmount with duration tracking | ✅ Implemented |

<details>
<summary><b>📊 Property Details</b></summary>

### `user_signed_up`
```typescript
{
  sign_up_method: 'apple' | 'google' | 'email',  // ✅ KEEP
  referral_code?: string,                         // ✅ KEEP - Optional
  anonymous_id: string,        // ❌ REMOVE - In base properties
  device_type: string,         // ❌ REMOVE - Use PostHog's $device_type
  is_authenticated: boolean,   // ❌ REMOVE - In base properties (always true after signup)
  timestamp: datetime,         // ❌ REMOVE - Use PostHog's $timestamp
  user_id: string,            // ❌ REMOVE - In base properties
  // Base properties included automatically
}
```

**Location:** `services/AnalyticsService.ts` - `trackUserSignedUp()`

---

### `onboarding_completed`
```typescript
{
  screen: 'onboarding_results',           // ✅ KEEP
  context: 'onboarding',                  // ✅ KEEP
  time_to_complete_seconds: number,       // ✅ KEEP - Duration from start to finish
  onboarding_q1: string,                  // ✅ KEEP - Q1: How much Islamic history do you know?
  onboarding_q2: string[],                // ✅ KEEP - Q2: How did you learn about Archives? (array)
  onboarding_q3: string,                  // ✅ KEEP - Q3: What's your daily learning goal?
  onboarding_q4: string,                  // ✅ KEEP - Q4: Why are you learning? (can be array)
  anonymous_id: string,      // ❌ REMOVE - In base properties
  is_authenticated: boolean, // ❌ REMOVE - In base properties
  timestamp: datetime,       // ❌ REMOVE - Use PostHog's $timestamp
  user_id: string,          // ❌ REMOVE - In base properties
  // Base properties included automatically
}
```

**Location:** `app/onboarding-results.tsx` - `trackOnboardingCompletion()`

**Example:**
```typescript
analyticsService.trackOnboardingCompleted({
  screen: 'onboarding_results',
  context: 'onboarding',
  time_to_complete_seconds: 127,
  onboarding_q1: "I'm brand new",
  onboarding_q2: ["TikTok", "Instagram"],
  onboarding_q3: "10 min / day • Regular",
  onboarding_q4: "Connect with heritage",
});
```

---

### `permission_requested`
```typescript
{
  permission_type: 'app_tracking_transparency' | 'push_notifications',  // ✅ KEEP
  screen: string,                                                        // ✅ KEEP - Where request happened
  result: 'granted' | 'denied' | 'undetermined' | 'restricted',        // ✅ KEEP
  platform: 'ios' | 'android',    // ❌ REMOVE - Use PostHog's $os
  // Base properties included automatically
}
```

**Location:**
- `app/onboarding-results.tsx` - ATT permission (line 114-120)
- `app/onboarding-question-3.tsx` - Push notifications (line 84-89)

**Examples:**
```typescript
// ATT Permission
analyticsService.trackPermissionRequested({
  permission_type: 'app_tracking_transparency',
  screen: 'onboarding_results',
  result: 'granted',
  platform: Platform.OS,  // ❌ Remove this
});

// Push Notifications
analyticsService.trackPermissionRequested({
  permission_type: 'push_notifications',
  screen: 'onboarding_question_3',
  result: 'denied',
  platform: Platform.OS,  // ❌ Remove this
});
```

---

### `onboarding_question_answered`
```typescript
{
  screen: string,              // ✅ KEEP - e.g., 'onboarding_question_1'
  question_number: number,     // ✅ KEEP - 1-4
  question_text: string,       // ✅ KEEP - Full question text
  answer: string | string[],   // ✅ KEEP - Selected answer(s)
  answer_index?: number,       // ✅ KEEP - Optional index for single-select
  // Base properties included automatically
}
```

**Location:** All 4 question screens track answers in real-time
- `app/onboarding-question-1.tsx`
- `app/onboarding-question-2.tsx`
- `app/onboarding-question-3.tsx`
- `app/onboarding-question-4.tsx` (tracks array for multi-select)

**Example:**
```typescript
// Single select (Q1, Q2, Q3)
analyticsService.trackOnboardingQuestionAnswered({
  screen: 'onboarding_question_1',
  question_number: 1,
  question_text: "How much Middle Eastern history do you already know?",
  answer: "I'm brand new",
  answer_index: 0,
});

// Multi-select (Q4)
analyticsService.trackOnboardingQuestionAnswered({
  screen: 'onboarding_question_4',
  question_number: 4,
  question_text: "Why are you learning about Middle Eastern history?",
  answer: ["Just for fun", "Connect with heritage"],  // Array
});
```

---

### `onboarding_screen_exited`
```typescript
{
  screen: string,                                              // ✅ KEEP - Screen identifier
  exit_action: 'back_button' | 'continued' | 'app_closed',   // ✅ KEEP - How user left
  duration_seconds: number,                                    // ✅ KEEP - Time on screen
  // Base properties included automatically
}
```

**Location:** All 8 onboarding screens track exits
- `app/onboarding-video.tsx`
- `app/onboarding-video-2.tsx`
- `app/onboarding-welcome.tsx`
- `app/onboarding-question-1.tsx`
- `app/onboarding-question-2.tsx`
- `app/onboarding-question-3.tsx`
- `app/onboarding-question-4.tsx`
- `app/onboarding-results.tsx`

**Example:**
```typescript
analyticsService.trackOnboardingScreenExited({
  screen: 'onboarding_question_2',
  exit_action: 'continued',  // User tapped Continue
  duration_seconds: 23,
});
```

</details>

<details>
<summary><b>🔨 Implementation Notes</b></summary>

**Files Modified:**
- `services/AnalyticsService.ts` - Added interfaces and methods
- All onboarding screens - Added tracking calls

**Base Properties Cleanup:**
Remove these from event calls since they're in `getBaseProperties()`:
- ❌ `anonymous_id`
- ❌ `user_id`
- ❌ `is_authenticated`
- ❌ `timestamp`
- ❌ `platform` / `device_type`

**Keep Only Event-Specific Properties:**
- ✅ `sign_up_method`, `referral_code`
- ✅ `time_to_complete_seconds`, `onboarding_q1-4`
- ✅ `permission_type`, `result`
- ✅ `screen`, `exit_action`, `duration_seconds`

</details>

---

## 📊 Status Legend

| Symbol | Status | Description |
|--------|--------|-------------|
| ✅ | Implemented | Event is tracked in production |
| 🚧 | In Progress | Event is partially implemented |
| 🆕 | NEW | Event needs to be implemented |
| ❌ | Deprecated | Event should be removed |

---

## 🚀 Next Steps

1. **Enable PostHog SDK autocapture** for app lifecycle events
2. **Remove manual tracking** of auto-captured properties (timestamp, platform, device_type)
3. **Add remaining event categories:**
   - Learning Events (lesson_started, lesson_completed, etc.)
   - Quiz Events (quiz_started, quiz_completed, etc.)
   - XP Events (xp_milestone_reached, etc.)
   - Push Notification Events
   - Video Events

---

**Document Version:** 1.0
**Created:** 2025-01-19
