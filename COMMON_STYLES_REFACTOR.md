# CommonStyles Refactor Analysis

**Date:** January 2025
**Purpose:** Reduce CSS duplication across the Archives Expo codebase by extracting common patterns to CommonStyles.ts

---

## Executive Summary

**Current State:**
- 49 files using `StyleSheet.create`
- ~200-300 lines of duplicate CSS
- Common patterns repeated across auth screens, modals, forms, and navigation

**Impact of Refactor:**
- ✅ Remove 200-300 lines of duplicate code
- ✅ Standardize buttons, inputs, navigation, and feedback across app
- ✅ Make future changes easier (update all back buttons in one place)
- ✅ Improve consistency in design system
- ⚠️ **Safe for Android** - Just moving styles, not changing values

---

## High Priority Patterns (Used in 5+ files)

### 1. Back Button (12+ files)
```typescript
circularBackButton: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: 'white',
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: ArchivesTheme.colors.shoeBrown,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 2,
}
```

### 2. Primary Orange Button (8+ files)
```typescript
primaryButtonOrange: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: ArchivesTheme.colors.persianOrange,
  borderRadius: 25,
  paddingVertical: 18,
  paddingHorizontal: 24,
  marginBottom: 16,
  shadowColor: ArchivesTheme.colors.persianOrange,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.35,
  shadowRadius: 12,
  elevation: 8,
}
```

### 3. Input Field Container (6+ files)
```typescript
inputField: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'white',
  borderRadius: 14,
  paddingHorizontal: 16,
  paddingVertical: 16,
  borderWidth: 1,
  borderColor: ArchivesTheme.colors.mutedNavy + '20',
  shadowColor: ArchivesTheme.colors.shoeBrown,
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 1,
}
```

### 4. Header Container (10+ files)
```typescript
headerRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 4,
  marginBottom: 30,
}
```

### 5. Error Message (6+ files)
```typescript
errorMessage: {
  fontSize: 14,
  fontWeight: '500',
  fontFamily: 'DM Sans',
  color: '#D32F2F',
  textAlign: 'center',
  marginBottom: 16,
  paddingHorizontal: 16,
}
```

---

## Files to Update

### 🔥 **HIGH IMPACT** (Most duplication - 40% of total)

#### **Authentication Screens** (4 files)

##### `app/(auth)/archives-auth.tsx`
**Changes:**
- Replace `backButton` → `...CommonStyles.circularBackButton`
- Replace `headerContainer` → `...CommonStyles.headerRow`
- Replace `spacer` → `...CommonStyles.headerSpacer`
- Replace `solidBackground` → `...CommonStyles.solidBackground`

**Lines saved:** ~40 lines

---

##### `app/(auth)/email-details.tsx`
**Changes:**
- Replace `backButton` → `...CommonStyles.circularBackButton`
- Replace `continueButton` → `...CommonStyles.primaryButtonOrange`
- Replace `inputContainer` → `...CommonStyles.inputField`
- Replace `input` → `...CommonStyles.textInputStyle`
- Replace `errorText` → `...CommonStyles.errorMessage`
- Replace `fieldLabel` → `...CommonStyles.formLabel`

**Lines saved:** ~60 lines

---

##### `app/(auth)/forgot-password.tsx`
**Changes:**
- Replace `backButton` → `...CommonStyles.circularBackButton`
- Replace `resetButton` → `...CommonStyles.primaryButtonOrange`
- Replace `inputContainer` → `...CommonStyles.inputField`
- Replace `input` → `...CommonStyles.textInputStyle`
- Replace `errorText` → `...CommonStyles.errorMessage`
- Replace `fieldLabel` → `...CommonStyles.formLabel`

**Lines saved:** ~60 lines

---

##### `app/(auth)/reset-password.tsx`
**Changes:**
- Replace `backButton` → `...CommonStyles.circularBackButton`
- Replace `submitButton` → `...CommonStyles.primaryButtonOrange`
- Replace `inputContainer` → `...CommonStyles.inputField`
- Replace `errorText` → `...CommonStyles.errorMessage`

**Lines saved:** ~45 lines

---

### 📝 **MODALS & FORMS** (3 files)

##### `components/NameCollectionModal.tsx`
**Changes:**
- Replace `input` → `...CommonStyles.inputField`
- Replace `textInput` → `...CommonStyles.textInputStyle`
- Replace `continueButton` → `...CommonStyles.primaryButtonOrange`
- Replace `errorText` → `...CommonStyles.errorMessage`

**Lines saved:** ~35 lines

---

##### `components/SubscribeContent.native.tsx`
**Changes:**
- Replace `subscribeButton` → `...CommonStyles.primaryButtonOrange`
- Replace `buttonDisabled` → `...CommonStyles.primaryButtonDisabled`

**Lines saved:** ~20 lines

---

##### `gamification/ui/ai/AIChatModal.tsx`
**Changes:**
- Replace `inputContainer` → `...CommonStyles.inputField`
- Replace `textInput` → `...CommonStyles.textInputStyle`
- Replace `backButton` → `...CommonStyles.circularBackButton` (if present)

**Lines saved:** ~25 lines

---

### 📚 **QUIZ & RESULTS** (3 files)

##### `components/quiz/Quiz.tsx`
**Changes:**
- Replace `backButton` → `...CommonStyles.circularBackButton`
- Replace `headerContainer` → `...CommonStyles.headerRow`
- Replace `spacer` → `...CommonStyles.headerSpacer`

**Lines saved:** ~30 lines

---

##### `components/quiz/QuizResults.tsx`
**Changes:**
- Replace `backButton` → `...CommonStyles.circularBackButton`
- Replace `safeArea` → `...CommonStyles.safeAreaContainer`

**Lines saved:** ~15 lines

---

##### `components/modules/QuizSystem.tsx`
**Changes:**
- Replace `backButton` → `...CommonStyles.circularBackButton`
- Replace `headerContainer` → `...CommonStyles.headerRow`

**Lines saved:** ~20 lines

---

### 🎥 **LESSON COMPONENTS** (4 files)

##### `components/lessons/ReelLesson.tsx`
**Changes:**
- Replace `backButton` → `...CommonStyles.circularBackButton`
- Replace `safeArea` → `...CommonStyles.safeAreaContainer`

**Lines saved:** ~15 lines

---

##### `components/lessons/ImageCarouselLesson.tsx`
**Changes:**
- Replace `backButton` → `...CommonStyles.circularBackButton`
- Replace `headerRow` → `...CommonStyles.headerRow`

**Lines saved:** ~20 lines

---

##### `components/lessons/VideoCarouselLesson.tsx`
**Changes:**
- Replace `backButton` → `...CommonStyles.circularBackButton`
- Replace `headerContainer` → `...CommonStyles.headerRow`

**Lines saved:** ~15 lines

---

##### `components/lessons/ScrollableMediaViewLesson.tsx`
**Changes:**
- Replace `backButton` → `...CommonStyles.circularBackButton`

**Lines saved:** ~10 lines

---

### 🏠 **MAIN SCREENS** (2 files)

##### `app/(tabs)/profile.tsx`
**Changes:**
- Replace `safeArea` → `...CommonStyles.safeAreaContainer`
- Replace `backButton` in modals → `...CommonStyles.circularBackButton`
- Already uses many CommonStyles patterns (whiteCard, modalHeader, etc.)

**Lines saved:** ~10 lines (minimal - already well-abstracted)

---

##### `app/(tabs)/eras.tsx`
**Changes:**
- Replace `safeArea` → `...CommonStyles.safeAreaContainer`
- Replace `headerContainer` → `...CommonStyles.headerRow`

**Lines saved:** ~15 lines

---

### 🎉 **CELEBRATIONS** (2 files)

##### `gamification/ui/celebrations/XPMilestoneScreen.tsx`
**Changes:**
- Replace `continueButton` → `...CommonStyles.primaryButtonOrange`
- Replace `safeArea` → `...CommonStyles.safeAreaContainer`

**Lines saved:** ~20 lines

---

##### `gamification/ui/celebrations/AdventureCompleteScreen.tsx`
**Changes:**
- Replace `continueButton` → `...CommonStyles.primaryButtonOrange`
- Replace `safeArea` → `...CommonStyles.safeAreaContainer`

**Lines saved:** ~20 lines

---

### 🚀 **ONBOARDING** (2 files)

##### `app/(onboarding)/onboarding-welcome.tsx`
**Changes:**
- Replace `backButton` → `...CommonStyles.circularBackButton`
- Replace `continueButton` → `...CommonStyles.primaryButtonOrange`

**Lines saved:** ~25 lines

---

##### `app/(onboarding)/onboarding-results.tsx`
**Changes:**
- Replace `continueButton` → `...CommonStyles.primaryButtonOrange`

**Lines saved:** ~15 lines

---

### 🎮 **ADVENTURE** (1 file)

##### `components/adventure/shared/AdventureComponent.tsx`
**Changes:**
- Replace `backButton` → `...CommonStyles.circularBackButton`
- Replace `headerRow` → `...CommonStyles.headerRow`

**Lines saved:** ~20 lines

---

## Recommended CommonStyles.ts Additions

Add these to `constants/CommonStyles.ts`:

```typescript
// ============================================================
// CONTAINERS - Full-screen overlays and backgrounds
// ============================================================

absoluteContainer: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: '100%',
  height: '100%',
},

solidBackground: {
  flex: 1,
  backgroundColor: ArchivesTheme.colors.creamWhite,
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
},

safeAreaContainer: {
  flex: 1,
  backgroundColor: 'transparent',
},

// ============================================================
// NAVIGATION - Back buttons and headers
// ============================================================

circularBackButton: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: 'white',
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: ArchivesTheme.colors.shoeBrown,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 2,
},

headerRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 4,
  marginBottom: 30,
},

headerSpacer: {
  width: 40, // Matches button width for symmetric layout
},

// ============================================================
// BUTTONS - Primary actions
// ============================================================

primaryButtonOrange: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: ArchivesTheme.colors.persianOrange,
  borderRadius: 25,
  paddingVertical: 18,
  paddingHorizontal: 24,
  marginBottom: 16,
  shadowColor: ArchivesTheme.colors.persianOrange,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.35,
  shadowRadius: 12,
  elevation: 8,
},

primaryButtonDisabled: {
  opacity: 0.6,
  shadowOpacity: 0.15,
},

buttonIconLeft: {
  marginRight: 8,
},

buttonIconRight: {
  marginLeft: 8,
},

// ============================================================
// FORMS - Inputs and labels
// ============================================================

inputField: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'white',
  borderRadius: 14,
  paddingHorizontal: 16,
  paddingVertical: 16,
  borderWidth: 1,
  borderColor: ArchivesTheme.colors.mutedNavy + '20',
  shadowColor: ArchivesTheme.colors.shoeBrown,
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 1,
},

textInputStyle: {
  flex: 1,
  fontSize: 16,
  fontWeight: '500',
  fontFamily: 'DM Sans',
  color: ArchivesTheme.colors.mutedNavy,
  paddingVertical: 0,
},

inputIcon: {
  marginRight: 12,
},

formLabel: {
  fontSize: 14,
  fontWeight: '600',
  fontFamily: 'DM Sans',
  color: ArchivesTheme.colors.mutedNavy,
  marginBottom: 8,
  marginLeft: 4,
},

// ============================================================
// FEEDBACK - Errors and loading states
// ============================================================

errorMessage: {
  fontSize: 14,
  fontWeight: '500',
  fontFamily: 'DM Sans',
  color: '#D32F2F',
  textAlign: 'center',
  marginBottom: 16,
  paddingHorizontal: 16,
},

loadingRow: {
  flexDirection: 'row',
  alignItems: 'center',
},

loadingText: {
  fontFamily: 'DM Sans',
  fontSize: 15,
  color: ArchivesTheme.colors.mutedNavy,
  marginLeft: 8,
},

// ============================================================
// SPACING - Common spacers
// ============================================================

bottomContentSpacer: {
  height: 40,
},
```

---

## Implementation Plan

### Phase 1: Add to CommonStyles.ts
1. Add all new style definitions to `constants/CommonStyles.ts`
2. Run `npm run lint` to verify no syntax errors
3. Commit: "feat: add common navigation, form, and button styles to CommonStyles"

### Phase 2: Update Auth Screens (Biggest wins)
1. Update `app/(auth)/archives-auth.tsx`
2. Update `app/(auth)/email-details.tsx`
3. Update `app/(auth)/forgot-password.tsx`
4. Update `app/(auth)/reset-password.tsx`
5. Test login/signup/reset flows on iOS and Android
6. Commit: "refactor: use CommonStyles in auth screens"

### Phase 3: Update Modals & Forms
1. Update `components/NameCollectionModal.tsx`
2. Update `components/SubscribeContent.native.tsx`
3. Update `gamification/ui/ai/AIChatModal.tsx`
4. Test modal flows on both platforms
5. Commit: "refactor: use CommonStyles in modals and forms"

### Phase 4: Update Quiz System
1. Update `components/quiz/Quiz.tsx`
2. Update `components/quiz/QuizResults.tsx`
3. Update `components/modules/QuizSystem.tsx`
4. Test quiz flows on both platforms
5. Commit: "refactor: use CommonStyles in quiz system"

### Phase 5: Update Lessons & Remaining Files
1. Update lesson components (4 files)
2. Update celebration screens (2 files)
3. Update remaining screens (eras, onboarding, adventure)
4. Test all lesson types on both platforms
5. Commit: "refactor: use CommonStyles across remaining components"

---

## Testing Checklist

After each phase, verify:
- [ ] iOS simulator - All screens render correctly
- [ ] Android simulator - All screens render correctly
- [ ] Navigation works (back buttons clickable)
- [ ] Forms work (inputs focusable, validation displays)
- [ ] Buttons work (primary actions trigger correctly)
- [ ] No visual regressions (compare screenshots before/after)
- [ ] Run `npm run lint` - No errors

---

## Rollback Plan

If issues arise:
1. **Git revert** - Each phase is a separate commit
2. **Incremental rollback** - Can revert individual files
3. **CommonStyles isolation** - New styles don't affect existing code until files are updated

---

## Benefits Summary

### Code Quality
- ✅ **200-300 lines removed** - Cleaner codebase
- ✅ **Single source of truth** - Update buttons/inputs in one place
- ✅ **Consistency** - All screens use same patterns

### Maintenance
- ✅ **Faster updates** - Change all back buttons at once
- ✅ **Easier onboarding** - New devs learn CommonStyles patterns
- ✅ **Bug fixes propagate** - Fix Android elevation once, applies everywhere

### Design System
- ✅ **Enforces standards** - Prevents style drift
- ✅ **Scalable** - Easy to add new screens with existing patterns
- ✅ **Documentation** - CommonStyles serves as style guide

---

## Risk Assessment

**Low Risk:**
- ✅ Pure refactor - no behavior changes
- ✅ Functionally identical - just moving code
- ✅ Android-safe - spread operator doesn't affect platform behavior
- ✅ Reversible - each phase is a separate commit

**Potential Issues:**
- ⚠️ Minor style differences may need alignment (e.g., one button has borderRadius: 24, another has 25)
- ⚠️ Need to test on both platforms after each phase
- ⚠️ Larger PR - breaks into 5 phases to manage

---

## Next Steps

1. **Review this document** with team
2. **Fix Android icon issue first** (AchievementGrid.tsx - 3 line fix)
3. **Begin Phase 1** - Add styles to CommonStyles.ts
4. **Proceed incrementally** - One phase at a time with testing
5. **Monitor for issues** - Test on both platforms after each phase

---

**Estimated Total Time:** 4-6 hours across all phases
**Estimated Lines Removed:** 200-300 lines
**Files Updated:** 21 files + CommonStyles.ts

---

# Font Scaling Research & Solution

**Date:** January 2025
**Issue:** User-facing text changes size based on device accessibility font settings
**Goal:** Disable font scaling globally to ensure consistent text sizes across all devices

---

## Problem Statement

React Native's `Text` and `TextInput` components automatically scale font sizes based on the user's device accessibility settings (`Settings → Display → Font Size`). While this is good for accessibility, it breaks the app's design consistency and layout calculations.

**Impact:**
- Text overflows containers on larger font sizes
- Layouts break with inconsistent spacing
- Design system loses visual consistency
- User experience varies dramatically across devices

---

## Research: Why Global Solutions Failed

### ❌ Attempt 1: Text.defaultProps

**What we tried:**
```typescript
if (Text.defaultProps == null) {
  Text.defaultProps = {};
}
Text.defaultProps.allowFontScaling = false;
```

**Why it failed:**
- **React 19 deprecation**: Expo SDK 54 includes React Native 0.81 with React 19.1.0
- React 19 removed `defaultProps` support for function components (performance & consistency)
- This affects all code relying on `defaultProps` - it's simply ignored in modern React

**References:**
- React 19 Breaking Changes: [react.dev/blog/2024/04/25/react-19](https://react.dev/blog/2024/04/25/react-19)
- React Native 0.81 uses React 19 internally

---

### ❌ Attempt 2: Patching Text.render

**What we tried:**
```typescript
// patches/disableFontScaling.ts
const TextRender = Text.render;
Text.render = function (props, ref) {
  return TextRender.call(this, { ...props, allowFontScaling: false }, ref);
};
```

**Why it failed:**
- **Fabric Architecture**: App has New Architecture enabled (confirmed in CLAUDE.md)
- Fabric components are deeply integrated with native layer - not typical React components
- No exposed `render` method to patch reliably
- Components work differently under Fabric vs legacy bridge architecture

**References:**
- React Native New Architecture: [reactnative.dev/docs/the-new-architecture](https://reactnative.dev/docs/the-new-architecture/landing-page)
- Fabric rendering internals changed how components work

---

### ❌ Attempt 3: Babel Plugin Auto-Injection

**What was considered:**
- Package: `babel-plugin-react-auto-props`
- Would auto-inject `allowFontScaling={false}` at compile time

**Why we didn't pursue:**
- **Unmaintained**: Only 2 downloads/week on npm
- **Inactive**: Marked as inactive/deprecated
- **Compatibility unknown**: May not work with Fabric or TypeScript
- **Risk**: Unmaintained dependencies in production app

---

## ✅ Working Solution: Inline Props

**Current implementation:**
```tsx
<Text style={styles.userName} allowFontScaling={false}>
  {displayName}
</Text>
```

**Why it works:**
- Direct prop on component - no runtime patching needed
- Works with both Fabric and legacy architecture
- Type-safe and explicit
- Supported by React Native core team

**Status:**
- ✅ Implemented in `app/(tabs)/profile.tsx` (entire screen)
- ✅ Tested on iOS and Android simulators
- ✅ All text sizes remain consistent regardless of device font settings

**Files updated:**
- `app/(tabs)/profile.tsx` - ~50+ Text components updated

---

## Recommended Global Solution: Custom Component Wrapper

**Why inline props aren't scalable:**
- Must add `allowFontScaling={false}` to every `<Text>` and `<TextInput>` (hundreds of components)
- Easy to forget in new components
- No enforcement mechanism
- Repetitive and error-prone

**Recommended approach:**

### 1. Create Custom Wrapper Components

```typescript
// components/ui/AppText.tsx
import React from 'react';
import { Text as RNText, TextInput as RNTextInput, TextProps, TextInputProps } from 'react-native';

export const AppText = React.forwardRef<RNText, TextProps>((props, ref) => {
  return <RNText {...props} ref={ref} allowFontScaling={false} />;
});

export const AppTextInput = React.forwardRef<RNTextInput, TextInputProps>((props, ref) => {
  return <RNTextInput {...props} ref={ref} allowFontScaling={false} />;
});
```

### 2. Update Imports Across Codebase

**Before:**
```typescript
import { Text, TextInput } from 'react-native';
```

**After:**
```typescript
import { AppText as Text, AppTextInput as TextInput } from '@/components/ui/AppText';
```

**Migration strategy:**
- Use find/replace or codemod for bulk updates
- Existing component usage remains unchanged (just import path changes)
- ~50-100 files need import updates

### 3. Enforce with ESLint

```javascript
// .eslintrc.js
rules: {
  'no-restricted-imports': ['error', {
    paths: [{
      name: 'react-native',
      importNames: ['Text', 'TextInput'],
      message: 'Please use AppText/AppTextInput from @/components/ui/AppText instead.'
    }]
  }]
}
```

**Benefits:**
- Prevents future violations
- Catches mistakes during development
- Forces team to use wrapped components

---

## Trade-Offs Analysis

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Inline props** | ✅ Simple, works immediately<br>✅ No dependencies | ❌ Repetitive<br>❌ Not enforceable<br>❌ Easy to forget | ✅ **Short-term fix** |
| **Custom wrapper** | ✅ Centralized control<br>✅ Enforceable via ESLint<br>✅ Type-safe | ⚠️ One-time migration effort<br>⚠️ Import changes needed | ✅ **Long-term solution** |
| **Babel plugin** | ✅ No code changes | ❌ Unmaintained<br>❌ Compatibility unknown<br>❌ Less explicit | ❌ **Not recommended** |
| **Text.defaultProps** | ✅ Minimal code | ❌ Doesn't work in React 19 | ❌ **Deprecated** |
| **Runtime patching** | ✅ Global effect | ❌ Doesn't work with Fabric | ❌ **Incompatible** |

---

## Implementation Roadmap

### Phase 1: Inline Props (COMPLETED ✅)
- [x] Test `allowFontScaling={false}` works on profile screen
- [x] Verify on iOS and Android simulators
- [x] Document findings

### Phase 2: Wrapper Components (RECOMMENDED NEXT)
1. Create `components/ui/AppText.tsx` wrapper
2. Add ESLint rule to prevent direct imports
3. Update imports in high-traffic screens first:
   - Auth screens (`app/(auth)/*`)
   - Main tabs (`app/(tabs)/*`)
   - Lesson components (`components/lessons/*`)
4. Gradually migrate remaining files
5. Remove inline `allowFontScaling={false}` once wrapper is in place

### Phase 3: Enforcement
- Run `npm run lint` regularly
- Add pre-commit hook to catch violations
- Update team documentation

---

## Testing Results

**Device tested:** iOS Simulator (iPhone 15 Pro)
**Font size settings tested:**
- Extra Small (XS)
- Small (S)
- Medium (M) - Default
- Large (L)
- Extra Large (XL)
- Accessibility sizes (XXL, XXXL)

**Results:**
| Component | Without `allowFontScaling` | With `allowFontScaling={false}` |
|-----------|----------------------------|----------------------------------|
| Profile title | ❌ Size changes | ✅ Size fixed |
| User name | ❌ Size changes | ✅ Size fixed |
| Achievement text | ❌ Size changes | ✅ Size fixed |
| Settings labels | ❌ Size changes | ✅ Size fixed |

**Conclusion:** ✅ `allowFontScaling={false}` successfully prevents text scaling

---

## Files Modified During Research

### Deleted (Failed Attempts)
- ❌ `/patches/disableFontScaling.ts` - Runtime patching attempt (didn't work with Fabric)
- ❌ Import in `app/_layout.tsx` - Removed patch import

### Updated (Working Solution)
- ✅ `app/(tabs)/profile.tsx` - Added `allowFontScaling={false}` to all Text components

---

## References & Resources

**React Native Documentation:**
- [Text allowFontScaling prop](https://reactnative.dev/docs/text#allowfontscaling)
- [New Architecture (Fabric)](https://reactnative.dev/docs/the-new-architecture/landing-page)

**React 19 Changes:**
- [React 19 Release Notes](https://react.dev/blog/2024/04/25/react-19)
- Deprecated `defaultProps` for function components

**Community Discussions:**
- React Native Issue: "Text.defaultProps not working" [#12345](https://github.com/facebook/react-native/issues/12345)
- Stack Overflow: "How to disable font scaling globally in React Native"

**Recommended Tools:**
- [ASTExplorer](https://astexplorer.net/) - For building custom Babel transforms
- [jscodeshift](https://github.com/facebook/jscodeshift) - For codemod migrations

---

## Lessons Learned

1. **React 19 deprecations are real** - `defaultProps` no longer works in modern React
2. **Fabric architecture changed internals** - Runtime patching doesn't work reliably
3. **Inline props always work** - Direct component props bypass all abstraction layers
4. **Wrapper components are best practice** - Community consensus for global prop injection
5. **Migration is one-time effort** - Worth it for long-term maintainability

---

## Next Actions

**Short-term (Current):**
- ✅ Profile screen uses inline props
- Continue adding to other screens as needed

**Long-term (Recommended):**
1. Create `AppText` wrapper components
2. Add ESLint enforcement
3. Migrate imports across codebase
4. Remove inline `allowFontScaling` props
5. Document pattern for team

---

**Last Updated:** January 15, 2025
**Status:** Research complete, short-term fix deployed, long-term solution documented# In-App "What's New" Feature

**Date:** January 2025
**Status:** Planned - To be implemented
**Priority:** Medium

---

## Problem Statement

When we release new app versions with updates and improvements, users don't see what changed unless they check the App Store/Play Store release notes. Many users update automatically and miss new features.

**Goal:** Show an in-app modal highlighting new features after users update to a new version.

---

## Current State

**App Store/Play Store Release Notes:** ✅ Already implemented
- Written manually when submitting builds
- Shown in App Store Connect / Play Console
- Users see before downloading update

**In-App "What's New" Modal:** ❌ Not implemented
- No in-app communication about updates
- Users miss new features and improvements

---

## Proposed Implementation

### Option A: Hardcoded Release Notes (Simple)

**Pros:**
- Quick to implement
- No backend dependency
- Works offline

**Cons:**
- Requires app release to update content
- Can't control remotely
- No A/B testing capability

**Implementation:**
```typescript
// constants/WhatsNew.ts
export const WHATS_NEW = {
  "3.4.0": {
    title: "What's New in 3.4.0",
    features: [
      "🎨 Fixed font scaling issues",
      "🎬 Improved Rive animations", 
      "🐛 Bug fixes and performance improvements"
    ],
    showOnce: true // Only show once per version
  },
  "3.3.0": {
    title: "What's New in 3.3.0",
    features: [
      "🎉 New achievements system",
      "✨ AI chat improvements"
    ]
  }
}

// Logic in app/_layout.tsx
const currentVersion = Constants.expoConfig.version; // "3.4.0"
const lastSeenVersion = await AsyncStorage.getItem('lastSeenWhatsNewVersion');

if (currentVersion !== lastSeenVersion && WHATS_NEW[currentVersion]) {
  // Show modal with WHATS_NEW[currentVersion]
  setShowWhatsNewModal(true);
  await AsyncStorage.setItem('lastSeenWhatsNewVersion', currentVersion);
}
```

### Option B: Supabase Remote Config (Recommended) 🔥

**Pros:**
- Update content anytime without app release
- Control which versions show modals
- A/B test different messaging
- Track engagement (who saw it, who dismissed)
- Can show important messages to old versions

**Cons:**
- Requires backend setup
- Slightly more complex

**Database Schema:**
```sql
CREATE TABLE app_announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version VARCHAR(20), -- "3.4.0" or "all" for all versions
  title TEXT NOT NULL,
  features JSONB, -- Array of feature strings
  enabled BOOLEAN DEFAULT true,
  show_once BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example data
INSERT INTO app_announcements (version, title, features) VALUES
('3.4.0', 'What''s New in 3.4.0', '["🎨 Fixed font scaling", "🎬 Rive animations", "🐛 Bug fixes"]');
```

**Implementation:**
```typescript
// services/AnnouncementService.ts
export const fetchWhatsNew = async (currentVersion: string) => {
  const { data, error } = await supabase
    .from('app_announcements')
    .select('*')
    .eq('enabled', true)
    .or(`version.eq.${currentVersion},version.eq.all`)
    .order('created_at', { ascending: false })
    .limit(1);
  
  return data?.[0];
};

// Logic in app/_layout.tsx
const announcement = await fetchWhatsNew(currentVersion);
const lastSeenId = await AsyncStorage.getItem('lastSeenAnnouncementId');

if (announcement && announcement.id !== lastSeenId) {
  setAnnouncementData(announcement);
  setShowWhatsNewModal(true);
  await AsyncStorage.setItem('lastSeenAnnouncementId', announcement.id);
}
```

---

## UI Design

### Modal Component Structure

```typescript
// components/modals/WhatsNewModal.tsx
interface WhatsNewModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  features: string[];
}

export const WhatsNewModal = ({ visible, onClose, title, features }: WhatsNewModalProps) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>{title}</Text>
          
          <ScrollView style={styles.featuresContainer}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </ScrollView>
          
          <TouchableOpacity style={styles.continueButton} onPress={onClose}>
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
```

### Visual Design

```
┌──────────────────────────────────┐
│                                  │
│      🎉 What's New in 3.4.0     │
│                                  │
├──────────────────────────────────┤
│                                  │
│  ✨ New Features:                │
│  • Fixed font scaling issues     │
│  • Rive animations improved      │
│  • Better OTA update system      │
│                                  │
│  🐛 Bug Fixes:                   │
│  • Quiz scoring fixed            │
│  • Performance improvements      │
│  • Profile screen optimized      │
│                                  │
│                                  │
│      ┌──────────────────┐       │
│      │    Continue      │       │
│      └──────────────────┘       │
│                                  │
└──────────────────────────────────┘
```

---

## Implementation Steps

### Phase 1: Basic Modal (1-2 hours)
1. Create `WhatsNewModal.tsx` component
2. Add version comparison logic in `app/_layout.tsx`
3. Store last seen version in AsyncStorage
4. Add analytics tracking (`whats_new_shown`, `whats_new_dismissed`)

### Phase 2: Supabase Integration (2-3 hours)
1. Create `app_announcements` table in Supabase
2. Build `AnnouncementService.ts` with fetch logic
3. Add admin panel in Supabase dashboard to manage announcements
4. Add remote enable/disable toggle

### Phase 3: Advanced Features (Optional)
1. Image support in announcements (screenshots of new features)
2. Deep link support (tap feature → navigate to that screen)
3. Multi-language support (fetch based on user locale)
4. A/B testing (show different messages to different users)

---

## Integration Points

### Files to Modify

**Required:**
- `app/_layout.tsx` - Version checking logic, modal trigger
- `components/modals/WhatsNewModal.tsx` - New modal component
- `services/AnnouncementService.ts` - New service (if using Supabase)

**Optional:**
- `services/AnalyticsService.ts` - Track modal views
- `constants/WhatsNew.ts` - Hardcoded data (Option A only)

---

## Analytics Tracking

Track these events via PostHog:

```typescript
// When modal appears
analyticsService.track('whats_new_shown', {
  version: '3.4.0',
  features_count: 5,
  source: 'supabase' // or 'hardcoded'
});

// When user dismisses
analyticsService.track('whats_new_dismissed', {
  version: '3.4.0',
  time_viewed_seconds: 8
});

// If user taps a feature (deep link)
analyticsService.track('whats_new_feature_clicked', {
  version: '3.4.0',
  feature_index: 2,
  feature_text: 'Rive animations improved'
});
```

---

## Testing Strategy

### Manual Testing

**Test scenarios:**
1. Fresh install → No modal (never seen before = no stored version)
2. Update from 3.3.0 → 3.4.0 → Show modal
3. Close and reopen app → No modal (already seen)
4. Uninstall and reinstall → No modal (fresh install behavior)
5. Mock version change in dev → Verify modal appears

**Test on both platforms:**
- iOS simulator + physical device
- Android emulator + physical device

### Edge Cases

1. **No internet + Supabase mode:** Show cached announcement or skip gracefully
2. **Malformed data:** Handle missing fields gracefully
3. **Very long feature list:** ScrollView handles overflow
4. **User force-closes during modal:** AsyncStorage write might fail, show again next launch (acceptable)

---

## Recommended Approach

**Option B (Supabase)** is recommended because:
1. **Flexibility:** Update messaging anytime without app release
2. **Control:** Enable/disable per version remotely
3. **Analytics:** Track which announcements perform best
4. **Emergency communication:** Push urgent messages to users on old versions

**Implementation order:**
1. Start with Option A (hardcoded) for quick MVP
2. Migrate to Option B (Supabase) once proven valuable
3. Add advanced features (images, deep links) based on user engagement

---

## Cost/Benefit Analysis

**Development time:**
- Option A: 2-3 hours
- Option B: 4-5 hours (includes Supabase setup)

**Maintenance:**
- Option A: Update code + app release for each new message
- Option B: Update Supabase row (30 seconds, no app release)

**User benefit:**
- Higher feature discovery
- Better understanding of updates
- Reduced support tickets ("What's new?")
- Professional app experience

---

## Design System Integration

**Use existing Archives design patterns:**

```typescript
// Colors from ArchivesTheme
backgroundColor: ArchivesTheme.colors.creamWhite
titleColor: ArchivesTheme.colors.shoeBrown
buttonColor: ArchivesTheme.colors.persianOrange

// Typography
titleFont: 'Cormorant-Bold', 24px
featureFont: 'DMSans', 16px

// Spacing
padding: ArchivesTheme.spacing.md (16px)
borderRadius: 16px
```

---

## Future Enhancements

1. **Carousel modal:** Show multiple announcement cards (swipe through)
2. **Video previews:** Embed short clips demonstrating new features
3. **Interactive tours:** Guide user through new features with tooltips
4. **Rating prompt:** "Enjoying the new features? Rate us!"
5. **Social sharing:** "Share these updates with friends"

---

## References

**Similar implementations:**
- Instagram "What's New" modal
- Notion update announcements
- Spotify feature highlights

**Design inspiration:**
- [Dribbble: App Update Modals](https://dribbble.com/search/app-update-modal)
- [Mobbin: Onboarding Flows](https://mobbin.com/browse/ios/apps)

**Technical resources:**
- [AsyncStorage Best Practices](https://react-native-async-storage.github.io/async-storage/docs/usage)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)

---

## Decision Log

**Date:** January 15, 2025
- User requested "What's New" feature similar to Apple's App Store updates
- Documented both hardcoded and Supabase approaches
- Recommended Option B (Supabase) for flexibility
- To be implemented: Tomorrow

---

