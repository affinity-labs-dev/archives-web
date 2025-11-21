# PostHog Analytics Tracking Specification

**Last Updated:** 2025-01-19
**App Version:** 2.2.8
**Status:** Initial Implementation

---

## 📋 General Notes from PostHog Specialist

> **⚠️ IMPORTANT RECOMMENDATIONS:**
> - Enable app lifecycle events autocapture in PostHog SDK for more reliable and accurate tracking
> - Remove custom event properties like `timestamp`, `user_id`, `platform`, `device_type` - these are automatically tracked by PostHog
> - Use PostHog's built-in autocapture features instead of manual event tracking where possible

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

## 🔐 Authentication Events

| Event Name | Description | When It Fires | Status |
|------------|-------------|---------------|------------|
| `auth_screen_viewed` | User lands on authentication screen | Screen mounts | ✅ Implemented |
| `auth_method_selected` | User selects auth method | Apple/Google/Email button pressed | ✅ Implemented |
| `auth_succeeded` | Authentication completes successfully | OAuth success or email auth success | ✅ Implemented |
| `auth_failed` | Authentication fails | OAuth error or email auth error | ✅ Implemented |
| `auth_screen_exited` | User leaves auth screen | Screen unmounts with duration tracking | ✅ Implemented |

<details>
<summary><b>📊 Property Details</b></summary>

### `auth_screen_viewed`
```typescript
{
  screen: string,              // ✅ KEEP - 'archives_auth'
  mode: 'signin' | 'signup',   // ✅ KEEP - Current auth mode
  // Base properties included automatically
}
```

**Location:** `app/(auth)/archives-auth.tsx` - useEffect on mount

**Example:**
```typescript
analyticsService.trackAuthScreenViewed({
  screen: 'archives_auth',
  mode: 'signup',
});
```

---

### `auth_method_selected`
```typescript
{
  screen: string,                              // ✅ KEEP - 'archives_auth'
  auth_method: 'apple' | 'google' | 'email',  // ✅ KEEP - Selected method
  mode: 'signin' | 'signup',                   // ✅ KEEP - Current auth mode
  // Base properties included automatically
}
```

**Location:**
- `app/(auth)/archives-auth.tsx` - Button onPress handlers
- `components/AppleSignInButton.tsx` - onPressCallback
- `components/GoogleSignInButton.tsx` - onPressCallback

**Examples:**
```typescript
// Apple button pressed
analyticsService.trackAuthMethodSelected({
  screen: 'archives_auth',
  auth_method: 'apple',
  mode: 'signup',
});

// Google button pressed
analyticsService.trackAuthMethodSelected({
  screen: 'archives_auth',
  auth_method: 'google',
  mode: 'signin',
});

// Email button pressed
analyticsService.trackAuthMethodSelected({
  screen: 'archives_auth',
  auth_method: 'email',
  mode: 'signup',
});
```

---

### `auth_succeeded`
```typescript
{
  screen: string,                              // ✅ KEEP - 'archives_auth'
  auth_method: 'apple' | 'google' | 'email',  // ✅ KEEP - Method used
  mode: 'signin' | 'signup',                   // ✅ KEEP - Auth mode
  is_new_user: boolean,                        // ✅ KEEP - true = signup, false = signin
  // Base properties included automatically
}
```

**Location:**
- `app/(auth)/archives-auth.tsx` - onSuccess callbacks
- `components/AppleSignInButton.tsx` - OAuth success handlers
- `components/GoogleSignInButton.tsx` - OAuth success handlers

**Examples:**
```typescript
// New user signs up with Apple
analyticsService.trackAuthSucceeded({
  screen: 'archives_auth',
  auth_method: 'apple',
  mode: 'signup',
  is_new_user: true,
});

// Existing user signs in with Google
analyticsService.trackAuthSucceeded({
  screen: 'archives_auth',
  auth_method: 'google',
  mode: 'signin',
  is_new_user: false,
});
```

---

### `auth_failed`
```typescript
{
  screen: string,                              // ✅ KEEP - 'archives_auth'
  auth_method: 'apple' | 'google' | 'email',  // ✅ KEEP - Method that failed
  mode: 'signin' | 'signup',                   // ✅ KEEP - Auth mode
  error_message: string,                       // ✅ KEEP - Error description
  // Base properties included automatically
}
```

**Location:**
- `app/(auth)/archives-auth.tsx` - onError callbacks
- `components/AppleSignInButton.tsx` - OAuth error handlers
- `components/GoogleSignInButton.tsx` - OAuth error handlers

**Examples:**
```typescript
// Apple OAuth cancelled
analyticsService.trackAuthFailed({
  screen: 'archives_auth',
  auth_method: 'apple',
  mode: 'signup',
  error_message: 'Apple sign-in was cancelled.',
});

// Google OAuth configuration error
analyticsService.trackAuthFailed({
  screen: 'archives_auth',
  auth_method: 'google',
  mode: 'signin',
  error_message: 'There was a problem with Google sign-in configuration.',
});
```

---

### `auth_screen_exited`
```typescript
{
  screen: string,                                           // ✅ KEEP - 'archives_auth'
  exit_action: 'authenticated' | 'back_button' | 'app_closed',  // ✅ KEEP - How user left
  duration_seconds: number,                                  // ✅ KEEP - Time on screen
  mode: 'signin' | 'signup',                                // ✅ KEEP - Auth mode at exit
  // Base properties included automatically
}
```

**Location:** `app/(auth)/archives-auth.tsx` - useEffect cleanup on unmount

**Examples:**
```typescript
// User successfully authenticated
analyticsService.trackAuthScreenExited({
  screen: 'archives_auth',
  exit_action: 'authenticated',
  duration_seconds: 8,
  mode: 'signup',
});

// User pressed back button
analyticsService.trackAuthScreenExited({
  screen: 'archives_auth',
  exit_action: 'back_button',
  duration_seconds: 5,
  mode: 'signin',
});

// App closed/crashed
analyticsService.trackAuthScreenExited({
  screen: 'archives_auth',
  exit_action: 'app_closed',
  duration_seconds: 12,
  mode: 'signup',
});
```

</details>

<details>
<summary><b>🔨 Implementation Notes</b></summary>

**Files Modified:**
- `services/AnalyticsService.ts` - Added interfaces and methods
- `app/(auth)/archives-auth.tsx` - Screen view, exit, and button tracking
- `components/AppleSignInButton.tsx` - Updated to support tracking callbacks
- `components/GoogleSignInButton.tsx` - Updated to support tracking callbacks

**Key Implementation Details:**
- **Screen duration tracking:** `screenStartTime` state captures mount timestamp
- **Exit action tracking:** `exitAction` state updated based on user behavior
- **New user detection:** OAuth components distinguish between signup (true) and signin (false)
- **Error tracking:** Full error messages captured from Clerk OAuth errors
- **Non-blocking:** All tracking calls are fire-and-forget, no UI blocking

**OAuth Button Callback Signatures:**
```typescript
// Updated AppleSignInButton & GoogleSignInButton props
interface AuthButtonProps {
  onPress?: () => void;                        // Tracks method selection
  onSuccess?: (isNewUser: boolean) => void;   // Tracks success with user status
  onError?: (error: { message: string }) => void;  // Tracks failures
}
```

**Usage Pattern:**
```typescript
<AppleSignInButton
  onPress={() => {
    analyticsService.trackAuthMethodSelected({
      screen: 'archives_auth',
      auth_method: 'apple',
      mode: isSignInMode ? 'signin' : 'signup',
    });
  }}
  onSuccess={async (isNewUser: boolean) => {
    analyticsService.trackAuthSucceeded({
      screen: 'archives_auth',
      auth_method: 'apple',
      mode: isSignInMode ? 'signin' : 'signup',
      is_new_user: isNewUser,
    });
    setExitAction('authenticated');
    await onContinue();
  }}
  onError={(error) => {
    analyticsService.trackAuthFailed({
      screen: 'archives_auth',
      auth_method: 'apple',
      mode: isSignInMode ? 'signin' : 'signup',
      error_message: error.message,
    });
  }}
/>
```

</details>

---

## 📍 Era Selection Events

| Event Name | Description | When It Fires | Status |
|------------|-------------|---------------|--------|
| `era_selected` | User selects a historical era to explore | Era card tapped (onboarding or era switching) | ✅ Implemented |

<details>
<summary><b>📊 Property Details</b></summary>

### `era_selected`
```typescript
{
  era_name: string,                           // ✅ KEEP - Human-readable era name
  era_id: string,                             // ✅ KEEP - Machine-readable identifier
  screen: string,                             // ✅ KEEP - Source screen
  context: 'onboarding' | 'era_switch',      // ✅ KEEP - Selection context
  selection_order: number,                    // ✅ KEEP - Position/index in UI
  // Base properties included automatically
}
```

**Location:**
- `app/era-selection.tsx` - Initial era selection during onboarding (lines 157-163)
- `app/(tabs)/eras.tsx` - Era switching within the app (lines 140-146)

**Example - Onboarding Context:**
```typescript
// User selects "Rise of Islam" during onboarding
analyticsService.trackEraSelected({
  era_name: 'Rise of Islam (570–632 CE)',
  era_id: 'riseOfIslam',
  screen: 'era_selection',
  context: 'onboarding',
  selection_order: 0,
});
```

**Example - Era Switching Context:**
```typescript
// User switches to "Umayyad Dynasty" from eras tab
analyticsService.trackEraSelected({
  era_name: 'Umayyad Dynasty (661–750 CE)',
  era_id: 'umayyad',
  screen: 'eras_tab',
  context: 'era_switch',
  selection_order: 1,
});
```

**Available Eras:**
- **Rise of Islam** - `era_id: 'riseOfIslam'` - Selection order: 0
- **Umayyad Dynasty** - `era_id: 'umayyad'` - Selection order: 1

</details>

<details>
<summary><b>🔨 Implementation Notes</b></summary>

**Files with Era Selection Tracking:**
- `services/AnalyticsService.ts` - Interface and method (lines 43-49, 309-317)
- `app/era-selection.tsx` - Onboarding era selection
- `app/(tabs)/eras.tsx` - In-app era switching

**Two Tracking Contexts:**

1. **Onboarding Context** (`era-selection.tsx`)
   - Fires when user selects their first era during onboarding
   - `screen: 'era_selection'`
   - `context: 'onboarding'`
   - User must select an era to proceed

2. **Era Switch Context** (`eras.tsx`)
   - Fires when user switches between eras in the Eras tab
   - `screen: 'eras_tab'`
   - `context: 'era_switch'`
   - User can freely switch between unlocked eras

**Property Explanations:**
- `era_name` - Display name shown to user (e.g., "Rise of Islam (570–632 CE)")
- `era_id` - Technical identifier used in code (e.g., "riseOfIslam")
- `screen` - Which screen triggered the selection
- `context` - Distinguishes first-time selection from subsequent switches
- `selection_order` - Position in UI (helps understand user preference patterns)

**Additional Tracking:**
Both screens also track page views via `startPageView()` and `endPageView()` for time-on-screen metrics.

</details>

---

## 🔔 Push Notifications Events

| Event Name | Description | When It Fires | Status |
|------------|-------------|---------------|--------|
| `push_notifications_enabled` | User grants push notification permission | Permission granted in onboarding Q3 | ✅ Implemented |
| `push_notifications_declined` | User denies push notification permission | Permission denied in onboarding Q3 | ✅ Implemented |

<details>
<summary><b>📊 Property Details</b></summary>

### `push_notifications_enabled`
```typescript
{
  permission_type: 'push_notifications',  // ✅ KEEP - Constant identifier
  screen: string,                          // ✅ KEEP - 'onboarding_question_3'
  result: 'granted',                       // ✅ KEEP - Permission result
  platform: string,                        // ❌ REMOVE - Use PostHog's $os
  // Base properties included automatically
}
```

**Location:** `app/onboarding-question-3.tsx` (lines 104-110)

**Example:**
```typescript
analyticsService.trackPushNotificationsEnabled({
  permission_type: 'push_notifications',
  screen: 'onboarding_question_3',
  result: 'granted',
  platform: Platform.OS,  // ❌ Remove this
});
```

---

### `push_notifications_declined`
```typescript
{
  permission_type: 'push_notifications',  // ✅ KEEP - Constant identifier
  screen: string,                          // ✅ KEEP - 'onboarding_question_3'
  result: 'denied',                        // ✅ KEEP - Permission result
  platform: string,                        // ❌ REMOVE - Use PostHog's $os
  // Base properties included automatically
}
```

**Location:** `app/onboarding-question-3.tsx` (lines 111-118)

**Example:**
```typescript
analyticsService.trackPushNotificationsDeclined({
  permission_type: 'push_notifications',
  screen: 'onboarding_question_3',
  result: 'denied',
  platform: Platform.OS,  // ❌ Remove this
});
```

</details>

<details>
<summary><b>🔨 Implementation Notes</b></summary>

**Implementation Details:**
- Tracks immediately after notification permission request in onboarding flow
- Both events use the same properties, only event name differs
- Integrates with existing `permission_requested` event (tracks the request)
- These events track the specific outcome (granted vs denied)

**Platform-Specific Behavior:**
- **iOS**: Shows native permission modal, tracks result
- **Android**: Permission granted by default on Android 12 and below
- **Simulator**: Not supported, permission automatically set to 'false'

**Related Events:**
- `permission_requested` - Tracks when permission prompt is shown
- Both events fire in sequence: `permission_requested` → `push_notifications_enabled` OR `push_notifications_declined`

</details>

---

## 📲 Push Notification Tracking Events

| Event Name | Description | When It Fires | Status |
|------------|-------------|---------------|--------|
| `notification_received` | Push notification received by app | Notification arrives while app is in foreground | ✅ Implemented |
| `notification_clicked` | User taps on a push notification | Notification tapped (any app state) | ✅ Implemented |

<details>
<summary><b>📊 Property Details</b></summary>

### `notification_received`
```typescript
{
  app_state: string,       // ✅ KEEP - Currently always 'foreground'
  message_id: string,      // ✅ KEEP - Unique notification identifier
  title: string,           // ✅ KEEP - Notification title text
  // Base properties included automatically:
  // - user_id, anonymous_id, is_authenticated
  // - $timestamp (PostHog auto-capture)
}
```

**Location:** `app/_layout.tsx` (lines 102-106)

**Example:**
```typescript
analyticsService.trackCustomEvent('notification_received', {
  message_id: 'notif_1234567890',
  title: 'Daily Streak Reminder',
  app_state: 'foreground',
});
```

**Notes:**
- Currently only tracks **foreground** notifications (when app is open)
- Background notifications are not currently tracked
- Uses `trackCustomEvent()` instead of dedicated method

---

### `notification_clicked`
```typescript
{
  message_id: string,      // ✅ KEEP - Unique notification identifier
  // Base properties included automatically:
  // - anonymous_id
  // - is_authenticated
  // - user_id
  // - $timestamp (PostHog auto-capture)
}
```

**Location:**
- Method: `services/AnalyticsService.ts` (lines 963-978)
- Usage: `app/_layout.tsx` (line 112)

**Example:**
```typescript
analyticsService.trackNotificationClicked('notif_1234567890');
```

**Notes:**
- Has dedicated `trackNotificationClicked()` method
- Tracks when user taps notification (any app state)
- Triggers deep linking to notification content

</details>

<details>
<summary><b>🔨 Implementation Notes</b></summary>

**Current Implementation:**

1. **notification_received**
   - Uses generic `trackCustomEvent()` method
   - Only tracks foreground notifications
   - Registered via `Notifications.addNotificationReceivedListener()`
   - Properties: message_id, title, app_state
   - File: `app/_layout.tsx` (AnalyticsWrapper component)

2. **notification_clicked**
   - Has dedicated `trackNotificationClicked()` method
   - Tracks all notification taps (foreground, background, killed state)
   - Registered via `Notifications.addNotificationResponseReceivedListener()`
   - Properties: message_id (plus base properties)
   - File: `app/_layout.tsx` (AnalyticsWrapper component)

**Listener Setup:**
```typescript
// Notification received (foreground only)
const notificationListener = Notifications.addNotificationReceivedListener(notification => {
  const messageId = notification.request.identifier || `notif_${Date.now()}`;
  analyticsService.trackCustomEvent('notification_received', {
    message_id: messageId,
    title: notification.request.content.title,
    app_state: 'foreground',
  });
});

// Notification clicked (any state)
const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
  const messageId = response.notification.request.identifier || `notif_${Date.now()}`;
  analyticsService.trackNotificationClicked(messageId);
});
```

**Relationship to Permission Events:**
- `push_notifications_enabled` / `push_notifications_declined` track permission requests
- These events track actual notification interactions after permission is granted

**Future Enhancements:**
- Track background notifications (requires background task setup)
- Add notification content type property (reminder, update, streak, etc.)
- Track notification action buttons (if implemented)
- Create dedicated `trackNotificationReceived()` method for consistency

**Deep Linking:**
- When notification is tapped, app opens to relevant content
- Deep link URLs processed by Expo Router
- No explicit deep link tracking yet (could be added)

</details>

---

## 🗺️ Adventure & Module Events

| Event Name | Description | When It Fires | Status |
|------------|-------------|---------------|--------|
| `adventure_started` | User opens an adventure summary/detail | Adventure card/title tapped | ✅ Implemented |
| `adventure_complete_continue` | User continues after completing adventure | Continue button on completion screen | ✅ Implemented |
| `module_started` | User opens a module (Umayyad only) | Module icon tapped on adventure map | ✅ Implemented |
| `module_completed` | Module fully completed (Umayyad only) | Both lessons + quiz passed (score ≥1) | ✅ Implemented |

<details>
<summary><b>📊 Property Details</b></summary>

### `adventure_started`
```typescript
{
  era_id: number,              // ✅ KEEP - 1 = Umayyad, 2 = Rise of Islam
  era_name: string,            // ✅ KEEP - 'umayyad' | 'riseOfIslam'
  adventure_id: number | string,  // ✅ KEEP - Numeric (Umayyad) or UUID (ROI)
  adventure_number: number,    // ✅ KEEP - 1-5 for cross-era comparison
  adventure_title: string,     // ✅ KEEP - Human-readable title
  screen: string,              // ✅ KEEP - 'roi_home' | 'umayyad_home'
  // Base properties included automatically
}
```

**Location:**
- **ROI**: `components/ROI/ROIEraComponent.tsx` (lines 268-286)
- **Umayyad**: `components/eras/UmmayadDynastyEra.tsx` (lines 249-269)

**Examples:**
```typescript
// Rise of Islam
analyticsService.trackAdventureStarted({
  era_id: 2,
  era_name: 'riseOfIslam',
  adventure_id: 'roi_adventure_1',
  adventure_number: 1,
  adventure_title: 'The Birth of Islam',
  screen: 'roi_home',
});

// Umayyad Dynasty
analyticsService.trackAdventureStarted({
  era_id: 1,
  era_name: 'umayyad',
  adventure_id: 1,
  adventure_number: 1,
  adventure_title: 'Damascus - The New Capital',
  screen: 'umayyad_home',
});
```

---

### `adventure_complete_continue`
```typescript
{
  adventure_id: string,        // ✅ KEEP - ROI adventure ID
  adventure_number: number,    // ✅ KEEP - 1-5
  adventure_title: string,     // ✅ KEEP - Human-readable title
  screen: string,              // ✅ KEEP - 'adventure_complete_screen'
  era_id: number,              // ✅ KEEP - Currently only ROI (2)
  era_name: string,            // ✅ KEEP - 'riseOfIslam'
  total_xp_earned: number,     // ✅ KEEP - XP from this adventure
  // Base properties included automatically
}
```

**Location:** `components/ROI/AdventureCompleteScreen.tsx` (lines 137-151)

**Example:**
```typescript
analyticsService.trackCustomEvent('adventure_complete_continue', {
  adventure_id: 'roi_adventure_1',
  adventure_title: 'The Birth of Islam',
  era_id: 2,
  era_name: 'riseOfIslam',
  adventure_number: 1,
  total_xp_earned: 50,
});
```

---

### `module_started` (Umayyad Only)
```typescript
{
  era_id: 1,                   // ✅ KEEP - Always 1 (Umayyad)
  era_name: 'umayyad',        // ✅ KEEP - Always 'umayyad'
  adventure_id: number,        // ✅ KEEP - 1-5
  adventure_number: number,    // ✅ KEEP - Same as adventure_id
  module_id: number,           // ✅ KEEP - 1-3
  module_number: number,       // ✅ KEEP - Same as module_id
  // Base properties included automatically
}
```

**Location:** `components/eras/UmmayadDynastyEra.tsx` (lines 290-300)

**Example:**
```typescript
analyticsService.trackModuleStarted({
  era_id: 1,
  era_name: 'umayyad',
  adventure_id: 1,
  adventure_number: 1,
  module_id: 1,
  module_number: 1,
});
```

---

### `module_completed` (Umayyad Only)
```typescript
{
  era_id: 1,                   // ✅ KEEP - Always 1 (Umayyad)
  era_name: 'umayyad',        // ✅ KEEP - Always 'umayyad'
  adventure_id: number,        // ✅ KEEP - 1-5
  adventure_number: number,    // ✅ KEEP - Same as adventure_id
  module_id: number,           // ✅ KEEP - 1-3
  module_number: number,       // ✅ KEEP - Same as module_id
  lessons_completed: 2,        // ✅ KEEP - Always 2 (all Umayyad modules have 2 lessons)
  quiz_score: number,          // ✅ KEEP - Star rating (1-3)
  xp_earned: number,           // ✅ KEEP - XP earned from this module (quiz correct answers × 10)
  total_xp_after: number,      // ✅ KEEP - User's total XP across all eras after completion
  total_time_seconds?: number, // ✅ KEEP - Optional, not currently tracked
  // Base properties included automatically
}
```

**Location:** `context/ProgressContext.tsx` (lines 639-652)

**XP Calculation:**
- `xp_earned`: Number of correct quiz answers × 10
  - 1★ (2 correct): 20 XP
  - 2★ (3-4 correct): 30-40 XP
  - 3★ (5 correct): 50 XP
- `total_xp_after`: Includes XP from both Umayyad Dynasty and Rise of Islam eras

**Example:**
```typescript
analyticsService.trackModuleCompleted({
  era_id: 1,
  era_name: 'umayyad',
  adventure_id: 1,
  adventure_number: 1,
  module_id: 1,
  module_number: 1,
  lessons_completed: 2,
  quiz_score: 3,
  xp_earned: 50,
  total_xp_after: 150,
});
```

</details>

<details>
<summary><b>🔨 Implementation Notes</b></summary>

**Adventure Events:**
- `adventure_started` tracks when user opens adventure detail/summary modal
- `adventure_complete_continue` tracks when user continues after finishing all modules
- Both events work for ROI and Umayyad (started), or ROI only (continue)

**Module Events (Umayyad Only):**
- `module_started` tracks when user taps module icon on adventure map
- Only fires for unlocked modules
- `module_completed` tracks in ProgressContext when module becomes complete
- Module completion requires: both lessons done + quiz passed (score ≥ 1)
- Centralized tracking in ProgressContext ensures all completion paths are captured

**Why Module Events are Umayyad Only:**
- Umayyad has explicit module structure (3 modules per adventure)
- ROI has flat content_list structure (no modules, just lessons/quizzes)
- ROI uses adventure-level completion tracking instead

**Cross-Era Comparison:**
- `adventure_number` and `module_number` enable comparison between eras
- Umayyad uses numeric IDs (1-5), ROI uses UUID strings
- Both eras have adventure_number for aggregated analytics

</details>

---

## 📝 Quiz Results Events

| Event Name | Description | When It Fires | Status |
|------------|-------------|---------------|--------|
| `quiz_results_viewed` | User views quiz results screen | Results screen mounts after quiz completion | ✅ Implemented |
| `quiz_results_continue_clicked` | User clicks continue on results | Continue button pressed | ✅ Enhanced |
| `quiz_results_retake_clicked` | User clicks retake quiz | Retake button pressed | ✅ Enhanced |

<details>
<summary><b>📊 Property Details</b></summary>

### `quiz_results_viewed`
```typescript
{
  adventure_id: string | number,   // ✅ KEEP - Numeric (Umayyad) or UUID (ROI)
  module_id: string | number,      // ✅ KEEP - Numeric (Umayyad) or UUID (ROI)
  quiz_id: string,                  // ✅ KEEP - Quiz identifier
  correct_answers: number,          // ✅ KEEP - Number correct
  total_questions: number,          // ✅ KEEP - Total questions
  percentage: number,               // ✅ KEEP - Score percentage
  total_points: number,             // ✅ KEEP - XP earned (correct_answers × 10)
  performance_tier: 'high' | 'medium' | 'low',  // ✅ KEEP - Performance category
  era_id: number,                   // ✅ KEEP - Era identifier
  era_name: string,                 // ✅ KEEP - Era name
  adventure_number: number,         // ✅ KEEP - For cross-era comparison
  module_number: number,            // ✅ KEEP - For cross-era comparison
  total_xp_after: number,           // ✅ KEEP - User's total XP across all eras after quiz
  // Base properties included automatically
}
```

**Location:** `components/ROI/ROIQuizResults.tsx` (lines 143-159)

**Performance Tier Calculation:**
- `high`: percentage ≥ 70%
- `medium`: percentage 34-69%
- `low`: percentage < 34%

**XP Calculation:**
- `total_points`: Number of correct answers × 10
- `total_xp_after`: User's cumulative XP from both Umayyad Dynasty and Rise of Islam eras

**Example:**
```typescript
analyticsService.trackQuizResultsViewed({
  adventure_id: 'roi_adventure_1',
  module_id: 'module_uuid_123',
  quiz_id: 'module_uuid_123',
  correct_answers: 4,
  total_questions: 5,
  percentage: 80,
  total_points: 40,
  performance_tier: 'high',
  era_id: 2,
  era_name: 'riseOfIslam',
  adventure_number: 1,
  module_number: 1,
  total_xp_after: 190,
});
```

---

### `quiz_results_continue_clicked`
```typescript
{
  adventure_id: string | number,   // ✅ KEEP - Numeric (Umayyad) or UUID (ROI)
  module_id: string | number,      // ✅ KEEP - Numeric (Umayyad) or UUID (ROI)
  era_id: number,                   // ✅ KEEP - Era identifier
  era_name: string,                 // ✅ KEEP - Era name
  adventure_number: number,         // ✅ KEEP - For cross-era comparison
  module_number: number,            // ✅ KEEP - For cross-era comparison
  percentage: number,               // ✅ KEEP - Score percentage
  correct_answers: number,          // ✅ KEEP - Number correct
  total_questions: number,          // ✅ KEEP - Total questions
  total_points: number,             // ✅ KEEP - XP earned (correct_answers × 10)
  total_xp_after: number,           // ✅ KEEP - User's total XP across all eras after quiz
  // Base properties included automatically
}
```

**Location:** `components/ROI/ROIQuizResults.tsx` (lines 156-174)

**XP Calculation:**
- `total_points`: Number of correct answers × 10
- `total_xp_after`: User's cumulative XP from both Umayyad Dynasty and Rise of Islam eras

**Example:**
```typescript
analyticsService.trackCustomEvent('quiz_results_continue_clicked', {
  adventure_id: 'roi_adventure_1',
  module_id: 'module_uuid_123',
  era_id: 2,
  era_name: 'riseOfIslam',
  adventure_number: 1,
  module_number: 1,
  percentage: 80,
  correct_answers: 4,
  total_questions: 5,
  total_points: 40,
  total_xp_after: 190,
});
```

---

### `quiz_results_retake_clicked`
```typescript
{
  adventure_id: string | number,   // ✅ KEEP - Numeric (Umayyad) or UUID (ROI)
  module_id: string | number,      // ✅ KEEP - Numeric (Umayyad) or UUID (ROI)
  era_id: number,                   // ✅ KEEP - Era identifier
  era_name: string,                 // ✅ KEEP - Era name
  adventure_number: number,         // ✅ KEEP - For cross-era comparison
  module_number: number,            // ✅ KEEP - For cross-era comparison
  percentage: number,               // ✅ KEEP - Score percentage
  correct_answers: number,          // ✅ KEEP - Number correct
  total_questions: number,          // ✅ KEEP - Total questions
  total_points: number,             // ✅ KEEP - XP earned (correct_answers × 10)
  total_xp_after: number,           // ✅ KEEP - User's total XP across all eras after quiz
  // Base properties included automatically
}
```

**Location:** `components/ROI/ROIQuizResults.tsx` (lines 135-153)

**XP Calculation:**
- `total_points`: Number of correct answers × 10
- `total_xp_after`: User's cumulative XP from both Umayyad Dynasty and Rise of Islam eras

**Example:**
```typescript
analyticsService.trackCustomEvent('quiz_results_retake_clicked', {
  adventure_id: 'roi_adventure_1',
  module_id: 'module_uuid_123',
  era_id: 2,
  era_name: 'riseOfIslam',
  adventure_number: 1,
  module_number: 1,
  percentage: 60,
  correct_answers: 3,
  total_questions: 5,
  total_points: 30,
  total_xp_after: 170,
});
```

</details>

<details>
<summary><b>🔨 Implementation Notes</b></summary>

**Enhancement Details:**
- **NEW Event**: `quiz_results_viewed` tracks when results screen is displayed
- **Enhanced Events**: `quiz_results_continue_clicked` and `quiz_results_retake_clicked` now include full adventure/module context

**Previous Implementation:**
- Events only tracked quiz-level data (percentage, correct_answers, etc.)
- Missing era context and cross-era comparison properties

**Current Implementation:**
- All three events now include: era_id, era_name, adventure_number, module_number
- `quiz_results_viewed` includes performance_tier for quick filtering
- Full context enables funnel analysis and cross-era comparison

**Performance Tier Usage:**
- Enables quick filtering: "Show all users with 'low' performance"
- Used for intervention triggers: "Send encouragement to users with low tier"
- Cohort analysis: "Compare high vs low performers"

**ROI-Specific Implementation:**
- Props passed from `ROIQuiz.tsx` to `ROIQuizResults.tsx`
- Context extracted from adventure data structures
- Uses UUID strings for adventure_id and module_id

</details>

---

## 👤 Account Management Events

| Event Name | Description | When It Fires | Status |
|------------|-------------|---------------|--------|
| `user_account_deleted` | User permanently deletes their account | Account deletion confirmed in settings | ✅ Implemented |

<details>
<summary><b>📊 Property Details</b></summary>

### `user_account_deleted`
```typescript
{
  account_age_days?: number,        // ✅ KEEP - Days since account creation
  total_xp?: number,                // ✅ KEEP - Total XP earned
  adventures_completed?: number,    // ✅ KEEP - Total adventures completed (both eras)
  deletion_reason?: string,         // ✅ KEEP - Not currently captured
  // Base properties included automatically
}
```

**Location:** `app/(tabs)/profile.tsx` (lines 464-492)

**Example:**
```typescript
analyticsService.trackUserAccountDeleted({
  account_age_days: 45,
  total_xp: 230,
  adventures_completed: 3,
});
```

</details>

<details>
<summary><b>🔨 Implementation Notes</b></summary>

**Implementation Details:**
- Tracks BEFORE data deletion to capture user stats
- Calculates account age from Clerk user.createdAt timestamp
- Aggregates adventures from both Umayyad and ROI eras:
  - Umayyad: Adventure complete when all 3 modules done
  - ROI: Adventure complete when all modules in content_list done
- Deletion reason not currently captured (could be added with modal)

**Data Calculation:**
```typescript
// Account age
const accountAgeDays = user.createdAt
  ? Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24))
  : undefined;

// Umayyad adventures (all 3 modules complete)
const umayyedAdventuresComplete = [1, 2, 3, 4, 5].filter(advId => {
  const modulesForAdventure = moduleProgress.filter(m => m.adventureId === advId);
  return modulesForAdventure.length === 3 && modulesForAdventure.every(m => m.isCompleted);
}).length;

// ROI adventures (module completed)
const roiAdventuresComplete = newUserProgress.filter(m => m.isCompleted).length;

// Total
const totalAdventuresCompleted = umayyedAdventuresComplete + roiAdventuresComplete;
```

**Timing:**
1. User confirms deletion in alert
2. Event tracked with stats
3. Local data cleared via `clearUserData()`
4. Clerk account deleted via `user.delete()`
5. User redirected to onboarding

**Future Enhancements:**
- Add optional deletion reason via modal
- Track additional metrics (lessons_completed, quizzes_passed, etc.)

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
   - Quiz Events (quiz_started, quiz_completed with XP tracking, etc.)
   - Push Notification Events
   - Video Events

**Note:** XP tracking has been integrated throughout the quiz funnel:
- `quiz_results_viewed` includes `total_xp_after`
- `quiz_results_continue_clicked` includes `total_xp_after`
- `quiz_results_retake_clicked` includes `total_xp_after`
- `module_completed` includes `xp_earned` and `total_xp_after`

---

**Document Version:** 1.0
**Created:** 2025-01-19
