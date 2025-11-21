# PostHog Event Testing Guide

Comprehensive testing checklist for all 10 priority PostHog analytics events implemented in the Archives Expo app.

## Prerequisites

### 1. PostHog Dashboard Access
- Log in to PostHog dashboard
- Navigate to "Live Events" to see real-time event stream
- Keep browser tab open during testing

### 2. Test Devices
- **iOS**: Physical device or simulator (iOS 15.0+)
- **Android**: Physical device or emulator (API 24+)
- Both platforms required for complete testing

### 3. App Setup
```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Build and install on devices
# iOS
eas build --platform ios --profile development
# Android
eas build --platform android --profile development
```

### 4. Test Account
- Use a test account (not production user)
- Fresh install recommended for onboarding events
- Have PostHog dashboard open to verify events

---

## Event Testing Checklist

### ✅ Event 1: `adventure_started`
**Tracks when user opens an adventure modal**

#### Test Scenario - ROI (Rise of Islam)
1. Navigate to ROI era home screen
2. Tap on any adventure title (not card)
3. Verify adventure summary modal opens

**Expected Event Properties:**
```typescript
{
  era_id: 2,
  era_name: "riseOfIslam",
  adventure_id: "roi_adventure_1", // UUID string
  adventure_number: 1, // For cross-era comparison
  adventure_title: "The Prophet's Mission Begins",
  screen: "roi_home"
}
```

#### Test Scenario - Umayyad Dynasty
1. Navigate to Umayyad Dynasty era home screen
2. Tap on any adventure title
3. Verify adventure modal opens with modules

**Expected Event Properties:**
```typescript
{
  era_id: 1,
  era_name: "umayyad",
  adventure_id: 1, // Numeric ID
  adventure_number: 1,
  adventure_title: "From Revelation to Migration",
  screen: "umayyad_home"
}
```

**Verification:**
- [ ] iOS: Event appears in PostHog Live Events
- [ ] Android: Event appears in PostHog Live Events
- [ ] Console log shows: `📊 [Analytics] Adventure Started: {id} - {title}`
- [ ] Both ROI and Umayyad implementations tested

---

### ✅ Event 2: `push_notifications_enabled`
**Tracks when user grants push notification permission**

#### Test Scenario
1. Fresh install app (or clear app data)
2. Complete onboarding questions 1 and 2
3. On Question 3, tap "Yes, keep me updated"
4. Grant permission in system dialog

**Expected Event Properties:**
```typescript
{
  permission_type: "push_notifications",
  screen: "onboarding_question_3",
  result: "granted",
  platform: "ios" | "android"
}
```

**Verification:**
- [ ] iOS: System permission dialog appears
- [ ] iOS: Event fires after granting permission
- [ ] Android: Event fires after granting permission
- [ ] Console log shows permission status

**Note:** This also triggers `permission_requested` event (pre-existing)

---

### ✅ Event 3: `push_notifications_declined`
**Tracks when user denies push notification permission**

#### Test Scenario
1. Fresh install app (or clear app data)
2. Complete onboarding questions 1 and 2
3. On Question 3, tap "Yes, keep me updated"
4. Deny permission in system dialog OR tap "Skip"

**Expected Event Properties:**
```typescript
{
  permission_type: "push_notifications",
  screen: "onboarding_question_3",
  result: "denied",
  platform: "ios" | "android"
}
```

**Verification:**
- [ ] iOS: Event fires after denying permission
- [ ] Android: Event fires after denying permission
- [ ] Skip button also triggers declined event
- [ ] Console log shows permission status

---

### ✅ Event 4: `adventure_complete_continue`
**Tracks when user clicks Continue from Adventure Complete screen**

#### Test Scenario - ROI
1. Complete all modules in an ROI adventure
2. Adventure Complete screen appears with confetti
3. Tap "Continue" button

**Expected Event Properties:**
```typescript
{
  adventure_id: "roi_adventure_1",
  adventure_number: 1,
  era_id: 2,
  era_name: "riseOfIslam",
  total_xp_earned: 50, // Example
  completion_time_seconds: 1200 // Example
}
```

**Verification:**
- [ ] iOS: Event fires on Continue button tap
- [ ] Android: Event fires on Continue button tap
- [ ] Haptic feedback occurs
- [ ] Console log shows event tracking
- [ ] User navigates back to era home

**Implementation:** `components/ROI/AdventureCompleteScreen.tsx:115-126`

---

### ✅ Event 5: `user_account_deleted`
**Tracks when user deletes their account**

#### Test Scenario
1. Navigate to Profile tab
2. Scroll to bottom
3. Tap "Delete Account"
4. Confirm deletion in alert

**Expected Event Properties:**
```typescript
{
  account_age_days: 45, // Days since account creation
  total_xp: 500, // Current total XP
  adventures_completed: 3 // Both eras combined
}
```

**Calculation Logic:**
- **account_age_days**: `(Date.now() - user.createdAt) / (1000 * 60 * 60 * 24)`
- **total_xp**: Sum of Umayyad + ROI XP
- **adventures_completed**:
  - Umayyad: Adventures with all 3 modules complete
  - ROI: Adventures with isCompleted = true

**Verification:**
- [ ] iOS: Event fires BEFORE data is cleared
- [ ] Android: Event fires BEFORE data is cleared
- [ ] Properties show correct calculated values
- [ ] User is redirected to auth screen
- [ ] Console log shows event tracking

**Implementation:** `app/(tabs)/profile.tsx:464-492`

---

### ✅ Event 6: `quiz_results_continue_clicked`
**Enhanced with full context for funnel analysis**

#### Test Scenario
1. Complete any ROI quiz
2. Quiz Results screen appears
3. Tap "Continue" button

**Expected Event Properties:**
```typescript
{
  adventure_id: "roi_adventure_1",
  module_id: "module_uuid",
  era_id: 2,
  era_name: "riseOfIslam",
  adventure_number: 1,
  module_number: 1,
  percentage: 80, // Quiz score percentage
  correct_answers: 4,
  total_questions: 5,
  total_points: 40, // XP earned (correct_answers × 10)
  total_xp_after: 190 // User's total XP across all eras after quiz
}
```

**XP Verification:**
- [ ] `total_points` shows correct value (correct_answers × 10)
- [ ] `total_xp_after` includes XP from both eras
- [ ] `total_xp_after` = previous total XP + total_points
- [ ] XP values are numbers, not undefined

**Verification:**
- [ ] iOS: Event fires with all context properties
- [ ] Android: Event fires with all context properties
- [ ] Haptic feedback occurs
- [ ] Console log: `📊 [Analytics] Quiz Results Continue Clicked: {id}, {%}%`

**Implementation:** `components/ROI/ROIQuizResults.tsx:182-201`

---

### ✅ Event 7: `quiz_results_retake_clicked`
**Enhanced with full context for funnel analysis**

#### Test Scenario
1. Complete any ROI quiz
2. Quiz Results screen appears
3. Tap "Retake Quiz" button

**Expected Event Properties:**
```typescript
{
  adventure_id: "roi_adventure_1",
  module_id: "module_uuid",
  era_id: 2,
  era_name: "riseOfIslam",
  adventure_number: 1,
  module_number: 1,
  percentage: 60, // Previous score
  correct_answers: 3,
  total_questions: 5,
  total_points: 30, // XP earned (correct_answers × 10)
  total_xp_after: 170 // User's total XP across all eras after quiz
}
```

**XP Verification:**
- [ ] `total_points` shows correct value (correct_answers × 10)
- [ ] `total_xp_after` includes XP from both eras
- [ ] `total_xp_after` = previous total XP + total_points
- [ ] XP values are numbers, not undefined

**Verification:**
- [ ] iOS: Event fires with all context properties
- [ ] Android: Event fires with all context properties
- [ ] Haptic feedback occurs
- [ ] Quiz resets and starts over
- [ ] Console log: `📊 [Analytics] Quiz Results Retake Clicked: {id}, {%}%`

**Implementation:** `components/ROI/ROIQuizResults.tsx:161-180`

---

### ✅ Event 8: `quiz_results_viewed` (NEW)
**Tracks when quiz results screen is displayed**

#### Test Scenario
1. Complete any ROI quiz (test all 3 performance tiers)
2. Quiz Results screen automatically appears
3. Event fires immediately on mount

**Performance Tier Thresholds:**
- **high**: ≥70% correct (quiz-reward3 video)
- **medium**: 34-69% correct (quiz-reward2 video)
- **low**: <34% correct (quiz-reward1 video)

**Expected Event Properties:**
```typescript
{
  adventure_id: "roi_adventure_1",
  module_id: "module_uuid",
  quiz_id: "module_uuid", // Same as module_id in ROI
  correct_answers: 4,
  total_questions: 5,
  percentage: 80,
  total_points: 40, // XP earned (correct_answers × 10)
  performance_tier: "high", // "high" | "medium" | "low"
  era_id: 2,
  era_name: "riseOfIslam",
  adventure_number: 1,
  module_number: 1,
  total_xp_after: 190 // User's total XP across all eras after quiz
}
```

**Test All Tiers:**
- [ ] High tier (≥70%): Answer 4-5 questions correctly
- [ ] Medium tier (34-69%): Answer 2-3 questions correctly
- [ ] Low tier (<34%): Answer 0-1 questions correctly

**XP Verification:**
- [ ] `total_points` shows correct value (correct_answers × 10)
- [ ] `total_xp_after` includes XP from both eras
- [ ] `total_xp_after` = previous total XP + total_points
- [ ] XP values are numbers, not undefined

**Verification:**
- [ ] iOS: Event fires on results screen mount
- [ ] Android: Event fires on results screen mount
- [ ] Correct performance_tier calculated
- [ ] Correct reward video plays based on tier
- [ ] Console log: `📊 [Analytics] Quiz Results Viewed: {id}, {%}%, {tier}`

**Implementation:** `components/ROI/ROIQuizResults.tsx:143-159`

---

### ✅ Event 9: `module_started` (Umayyad Only)
**Tracks when user opens a module modal**

#### Test Scenario
1. Navigate to Umayyad Dynasty era
2. Open any adventure (1-5)
3. Tap on an unlocked module card
4. Module modal opens with lessons

**Expected Event Properties:**
```typescript
{
  era_id: 1,
  era_name: "umayyad",
  adventure_id: 1,
  adventure_number: 1,
  module_id: 1,
  module_number: 1
}
```

**Verification:**
- [ ] iOS: Event fires when module modal opens
- [ ] Android: Event fires when module modal opens
- [ ] Only fires for unlocked modules (locked modules show warning)
- [ ] Haptic feedback occurs
- [ ] Console log: `📊 [Analytics] Module Started: Adv{id} Mod{id}`

**Why Umayyad Only:**
- ROI has flat content_list structure (no modules)
- Umayyad has explicit 3-module-per-adventure structure

**Implementation:** `components/eras/UmmayadDynastyEra.tsx:290-311`

---

### ✅ Event 10: `module_completed` (Umayyad Only)
**Tracks when module is completed (quiz passed + both lessons done)**

#### Test Scenario
1. Navigate to Umayyad Dynasty
2. Open any module
3. Complete Lesson 1
4. Complete Lesson 2
5. Pass quiz (≥1 star = score ≥1)

**Expected Event Properties:**
```typescript
{
  era_id: 1,
  era_name: "umayyad",
  adventure_id: 1,
  adventure_number: 1,
  module_id: 1,
  module_number: 1,
  lessons_completed: 2, // Always 2 for Umayyad
  quiz_score: 3, // Star rating (1-3)
  xp_earned: 50, // XP earned from this module (quiz correct answers × 10)
  total_xp_after: 150, // User's total XP across all eras after completion
  total_time_seconds: undefined // Optional, not implemented yet
}
```

**Completion Criteria:**
- Both lessons marked complete
- Quiz score ≥1 (at least 2/5 correct answers)

**XP Calculation:**
- `xp_earned`: Number of correct quiz answers × 10
  - 1★ (2 correct): 20 XP
  - 2★ (3-4 correct): 30-40 XP
  - 3★ (5 correct): 50 XP
- `total_xp_after`: Includes XP from both Umayyad Dynasty and Rise of Islam eras

**XP Verification:**
- [ ] `xp_earned` shows correct value (quiz correct answers × 10)
- [ ] `total_xp_after` includes XP from both eras
- [ ] `total_xp_after` = previous total XP + xp_earned
- [ ] XP values are numbers, not undefined

**Verification:**
- [ ] iOS: Event fires when quiz completion updates progress
- [ ] Android: Event fires when quiz completion updates progress
- [ ] Success haptic feedback occurs
- [ ] Next module/adventure unlocks if applicable
- [ ] Console log: `📊 [Analytics] Module Completed: Adv{id} Mod{id}, XP: {xp}, Total: {total}`
- [ ] Console log: `🎉 Module {id} completed!`

**Why Umayyad Only:**
- ROI tracks adventure completion, not module completion
- Umayyad has explicit module structure

**Implementation:** `context/ProgressContext.tsx:639-654`

---

### ✅ Umayyad Dynasty Quiz Events

**Test all 15 quiz files (Adventures 1-5, Modules 1-3)**

Umayyad Dynasty has 5 adventures, each with 3 modules, totaling 15 quizzes that need testing.

#### Scenario:
1. Open any Umayyad adventure (Adventures 1-5)
2. Select any module (Modules 1-3)
3. Complete Lesson 1 and Lesson 2
4. Start quiz → Verify `quiz_started` fires (if implemented)
5. Answer questions → Verify `quiz_question_answered` fires with XP (if implemented)
6. Complete quiz → Verify `quiz_completed` fires with XP (if implemented)
7. Results screen → Verify `quiz_results_viewed` fires (ROI only currently)
8. Click Continue/Retake → Verify respective event fires (ROI only currently)
9. Verify `module_completed` fires with XP

**Expected Properties for module_completed:**
- era_id: 1
- era_name: "umayyad"
- adventure_id: 1-5
- module_id: 1-3
- xp_earned: correct answers × 10 (20-50 XP)
- total_xp_after: includes new XP from this module

**Quiz Files to Test:**
- Adventure 1: Modules 1-3 (3 quizzes)
- Adventure 2: Modules 1-3 (3 quizzes)
- Adventure 3: Modules 1-3 (3 quizzes)
- Adventure 4: Modules 1-3 (3 quizzes)
- Adventure 5: Modules 1-3 (3 quizzes)

**XP Verification:**
- [ ] `xp_earned` shows correct value for each module
- [ ] `total_xp_after` increases correctly after each quiz
- [ ] XP accumulates across all adventures
- [ ] Both Umayyad and ROI XP included in total_xp_after

**Note:** Quiz events (quiz_started, quiz_question_answered, quiz_completed) are not yet implemented for Umayyad quizzes. Only module_completed tracks XP currently.

---

### 🧮 XP Calculation Validation

**Test XP accuracy across quiz funnel:**

This section validates that XP calculations are consistent and accurate throughout the quiz completion flow.

#### Scenario 1: Single Quiz Completion (ROI)
1. Note user's total XP before quiz (check Profile screen)
2. Complete ROI quiz with known correct answers (e.g., 3/5)
3. Verify events show:
   - `quiz_results_viewed`:
     - total_points: 30 (3 × 10)
     - total_xp_after: previous_xp + 30
   - `quiz_results_continue_clicked`:
     - total_points: 30
     - total_xp_after: same as quiz_results_viewed
4. Check Profile screen confirms new total XP
5. Check PostHog dashboard confirms values

#### Scenario 2: Module Completion (Umayyad)
1. Note user's total XP before module
2. Complete both lessons
3. Pass quiz with known correct answers (e.g., 4/5)
4. Verify `module_completed` event shows:
   - xp_earned: 40 (4 × 10)
   - total_xp_after: previous_xp + 40
5. Check Profile screen confirms new total XP
6. Check PostHog dashboard confirms values

#### Scenario 3: Cross-Era XP Accumulation
1. Complete one Umayyad module (e.g., 50 XP)
2. Note total_xp_after in module_completed event
3. Complete one ROI module (e.g., 40 XP)
4. Verify total_xp_after in ROI events = Umayyad XP + ROI XP (90 total)
5. Profile screen should show 90 XP total

#### Scenario 4: Quiz Retake (ROI)
1. Complete quiz with low score (e.g., 2/5 = 20 XP)
2. Note total_xp_after (e.g., 120 XP)
3. Click Retake Quiz
4. Complete with higher score (e.g., 5/5 = 50 XP)
5. Verify new total_xp_after = 120 + 50 = 170 XP
6. Confirm XP increases even on retake

**XP Calculation Checklist:**
- [ ] XP formula: correct_answers × 10
- [ ] total_xp_after includes both Umayyad and ROI eras
- [ ] XP persists after app restart
- [ ] XP syncs to cloud (Supabase)
- [ ] Profile screen matches PostHog events
- [ ] No XP loss on retakes (always increases)
- [ ] XP values are never undefined or null

**Common XP Values:**
- 1 correct: 10 XP
- 2 correct (1★): 20 XP
- 3 correct (2★): 30 XP
- 4 correct (2★): 40 XP
- 5 correct (3★): 50 XP

---

## Testing Workflow

### Full Test Session (1-2 hours)
1. **Fresh Install Test** (Onboarding events)
   - Uninstall app
   - Reinstall
   - Test events 2-3 (push notifications)
   - Complete onboarding flow

2. **ROI Era Test** (Events 1, 4, 6-8)
   - Test adventure_started (event 1)
   - Complete a module and quiz
   - Test quiz results events (events 6-8)
   - Complete adventure
   - Test adventure complete (event 4)

3. **Umayyad Era Test** (Events 1, 9-10)
   - Test adventure_started (event 1)
   - Test module_started (event 9)
   - Complete module
   - Test module_completed (event 10)

4. **Account Deletion Test** (Event 5)
   - Navigate to Profile
   - Test user_account_deleted (event 5)

### Quick Smoke Test (10-15 minutes)
1. Open app
2. Tap ROI adventure title → Verify adventure_started
3. Open quiz → Complete → Verify quiz events (viewed, continue/retake)
4. Open Umayyad → Tap adventure → Tap module → Verify module_started

---

## PostHog Dashboard Verification

### Live Events View
1. Navigate to PostHog → Live Events
2. Filter by your user ID or distinct_id
3. Events appear within 1-5 seconds

### Event Properties Check
Click on each event to expand and verify:
- All required properties present
- Property values correct
- No undefined/null values (except optional fields)
- Timestamps accurate

### Common Issues
| Issue | Solution |
|-------|----------|
| Events not appearing | Check internet connection, PostHog API key |
| Missing properties | Check TypeScript interface matches implementation |
| Wrong property values | Check calculation logic in component |
| Duplicate events | Check useEffect dependencies |

---

## Platform-Specific Testing Notes

### iOS
- **Simulator:** All events work except push notifications
- **Physical Device:** Required for push notification events (2-3)
- **ATT Permission:** PostHog only initializes if tracking permitted
- **Haptics:** Only on physical device (silent on simulator)

### Android
- **Emulator:** All events work
- **Physical Device:** Recommended for full testing
- **Permissions:** Notification permission dialog appears on first request
- **Haptics:** Works on emulator with vibration enabled

---

## Console Log Reference

Look for these console logs during testing:

```
📊 [Analytics] Adventure Started: {id} - {title}
📊 [Analytics] Module Started: Adv{id} Mod{id}
📊 [Analytics] Module Completed: Adv{id} Mod{id}
📊 [Analytics] Quiz Results Viewed: {id}, {%}%, {tier}
📊 [Analytics] Quiz Results Continue Clicked: {id}, {%}%
📊 [Analytics] Quiz Results Retake Clicked: {id}, {%}%
```

---

## Troubleshooting

### Event not firing
1. Check console for error messages
2. Verify component imports AnalyticsService
3. Check if event tracking code is in correct lifecycle
4. Verify PostHog initialized (check ATT permission on iOS)

### Wrong property values
1. Check TypeScript interface in AnalyticsService.ts
2. Verify calculation logic in component
3. Check if props passed correctly (quiz results context)

### iOS ATT Issues
- PostHog only initializes if tracking permitted
- Check Settings → Privacy → Tracking → Archives Expo
- If disabled, events won't send

### Testing after code changes
```bash
# Clear Metro cache
npx expo start --clear

# Rebuild if native changes
eas build --platform ios --profile development
```

---

## Success Criteria

All 10 events should:
- ✅ Fire on both iOS and Android
- ✅ Appear in PostHog Live Events within 5 seconds
- ✅ Include all required properties
- ✅ Have correct property values
- ✅ Match TypeScript interfaces
- ✅ Include cross-era comparison fields (adventure_number, module_number)

---

## Next Steps After Testing

1. **Document any issues found** in Linear or GitHub
2. **Share PostHog dashboard** with data analyst team
3. **Set up PostHog insights** for funnel analysis
4. **Create dashboards** for:
   - Adventure completion funnels
   - Quiz performance by tier
   - Push notification opt-in rates
   - Module completion rates (Umayyad)

---

## Testing Completion Checklist

- [ ] All 10 events tested on iOS
- [ ] All 10 events tested on Android
- [ ] All events appear in PostHog dashboard
- [ ] All properties verified correct
- [ ] Console logs verified
- [ ] Both eras tested (ROI + Umayyad)
- [ ] All 3 performance tiers tested (quiz_results_viewed)
- [ ] Fresh install tested (onboarding events)
- [ ] Account deletion tested
- [ ] No errors in console
- [ ] Haptic feedback working (physical device)
- [ ] Documentation reviewed and approved
