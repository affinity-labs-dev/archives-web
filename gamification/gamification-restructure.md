# Gamification Restructure Plan

## Streak Update Behavior - Change to Activity-Based (Duolingo Pattern)

### Current Behavior
**App opens** → `loadStreak()` → Auto-increment if consecutive day → Save to Supabase

### Desired Behavior (Duolingo)
**App opens** → Read streak (no update)
**Complete module quiz OR today quest** → Increment streak → Save to Supabase

---

## Changes Required

### 1. **GamificationOrchestrator.tsx** - Modify `loadStreak()` function
**Effort: LOW (15 mins)**

**Current (lines 628-791):**
```typescript
const loadStreak = useCallback(async () => {
  // Reads from Supabase
  // Checks if consecutive day
  // Auto-increments or resets
  // Saves back to Supabase
}, []);
```

**New:**
```typescript
const loadStreak = useCallback(async () => {
  // ONLY read from Supabase
  // DON'T auto-increment
  // Just load into state for display
}, []);

const incrementStreakOnActivity = useCallback(async () => {
  // NEW function
  // Check if already updated today (lastActiveDate === today)
  // If yes → do nothing (prevent double increment)
  // If no → increment streak, save to Supabase
  // Update frozen data
}, []);
```

### 2. **Call incrementStreakOnActivity after quiz completion**
**Effort: VERY LOW (5 mins)**

**In `reportQuizComplete` (around line 1243):**
```typescript
const reportQuizComplete = useCallback(async (input: QuizCompleteInput) => {
  // Existing code...

  // ADD THIS:
  await incrementStreakOnActivity();

  // Rest of celebration checks...
}, []);
```

### 3. **Call incrementStreakOnActivity after today quest completion**
**Effort: LOW (10 mins)**

Need to find where today quest completion happens and add the same call.

**Question:** Where does today quest completion trigger? In Quiz.tsx with `isToday` flag?

### 4. **Edge Cases to Handle**
**Effort: MEDIUM (30 mins)**

**Case 1: Multiple modules in one day**
- First module → increments streak
- Second module → checks `lastActiveDate === today` → skip increment ✅

**Case 2: Do today quest THEN module (or vice versa)**
- Whichever happens first → increments streak
- Second activity → skip increment ✅

**Case 3: User misses a day**
- Next completion → reset to 1 (not increment)
- Need logic to detect gap

**Case 4: Frozen data update**
- After first activity of the day → update frozen data
- Rest of day → uses updated frozen data ✅

### 5. **Testing Requirements**
**Effort: MEDIUM (45 mins)**

- Test consecutive days (increment)
- Test missed days (reset to 1)
- Test multiple activities same day (only increment once)
- Test today quest + module combo
- Test calendar display after activity

---

## Total Effort Estimate
**~2 hours** (including testing)

**Breakdown:**
- Code changes: 30 mins
- Edge case handling: 30 mins
- Testing: 45 mins
- Buffer: 15 mins

---

## Risk Level
**LOW** - The logic is straightforward, main risk is ensuring streak only updates once per day regardless of how many activities completed.

---

## Files to Change
1. `gamification/engines/GamificationOrchestrator.tsx` - Main changes
2. Wherever today quest completion happens - Add increment call

---

## Important Notes

### Frozen Streak Data Pattern (DO NOT CHANGE)
The frozen data pattern is working correctly and should NOT be modified:

**Why frozen data exists:**
- Creates consistent calendar view for entire day
- Prevents confusing UX (calendar changing after each activity)
- Snapshot is taken once per day (first app open)
- Tomorrow gets fresh snapshot with updated data

**Example flow:**
1. **Morning (first open):** Freeze `{ streak: 44, lastActive: Jan 18 }`
2. **Afternoon (complete module):** Supabase updates but frozen data stays same
3. **Calendar shows:** Consistent view all day using frozen snapshot
4. **Tomorrow:** New frozen snapshot created with current Supabase data

This is the CORRECT behavior - do not "fix" this!

---

## Status
**Planned - Not Implemented**

Created: Jan 22, 2026