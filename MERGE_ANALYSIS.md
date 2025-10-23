# Branch Merge Analysis: master vs profile-revamp
## File-by-File Comparison Guide

**How to use this document:**
1. For each file, see the change summary and recommendation
2. Use the provided git command to view full diff
3. Make your decision: KEEP MASTER, USE PROFILE, or MANUAL MERGE

**Legend:**
- 🆕 NEW - File only exists in profile-revamp
- 🗑️ DELETED - File removed in profile-revamp
- ⚠️ CONFLICT - Both branches modified, needs careful review
- ✏️ MODIFIED - Changed but likely compatible

---

## CRITICAL CONFIGURATION FILES (Review First)

### 1. package.json ⚠️ CONFLICT
**Changes:**
- profile-revamp removes: `expo-navigation-bar`, `react-native-purchases-ui`, `rive-react-native`
- profile-revamp downgrades: `react-native-purchases` 9.5.4 → 9.5.1
- profile-revamp adds: `expo-system-ui`, `react-native-render-html`

**View diff:**
```bash
git diff master profile-revamp -- package.json
```

**RECOMMENDATION:** **KEEP MASTER** (has latest packages, rive for animations, newer RevenueCat)
**Action:** After merge, optionally add `expo-system-ui` and `react-native-render-html` if Era 2 needs them

---

### 2. app.json ⚠️ CONFLICT
**Changes:**
- profile-revamp: buildNumber 73 → 75, versionCode stays 17
- profile-revamp: Removes "rive-react-native" plugin
- profile-revamp: Changes Team ID back to L33CVM28SL (master has LQ9LP2WW94)
- profile-revamp: Removes Universal Links config (associatedDomains, intentFilters)

**View diff:**
```bash
git diff master profile-revamp -- app.json
```

**RECOMMENDATION:** **KEEP MASTER** (has correct Team ID, Universal Links, latest build config)
**Action:** Manually update buildNumber to 75 in master if needed

---

### 3. CLAUDE.md ⚠️ CONFLICT
**Changes:**
- profile-revamp removes 118 lines of documentation:
  - Removes AnalyticsWrapper, RewardsProvider, PreferencesProvider from provider hierarchy
  - Removes sections about Universal Links, App Links, deep linking testing
  - Removes build profiles documentation (preview, channels)
  - Removes intro offer subscription details
  - Removes analytics event tracking details
  - Removes Rive, react-native-bottom-tabs from dependencies table

**View diff:**
```bash
git diff master profile-revamp -- CLAUDE.md | less
```

**RECOMMENDATION:** **KEEP MASTER + ADD ERA 2 DOCS**
**Action:** Keep master's comprehensive version, add new sections about:
- AdventuresContentProvider (if we use it)
- Era 2 ROI components structure
- types/progress.ts centralized types

---

### 4. app/_layout.tsx ⚠️ CRITICAL CONFLICT
**Changes:**
- profile-revamp removes: SplashScreen imports, NavigationBar imports, LoadingScreen import
- profile-revamp adds: AdventuresContentProvider, useAppTrackingTransparency hook
- profile-revamp removes: SplashScreen.preventAutoHideAsync() logic
- profile-revamp adds: ConditionalPostHogProvider with detailed session replay config
- profile-revamp changes: Provider hierarchy (adds AdventuresContentProvider layer)

**View diff:**
```bash
git diff master profile-revamp -- app/_layout.tsx | less
```

**RECOMMENDATION:** **KEEP MASTER BASE + SELECTIVE ADDITIONS**
**Action:**
1. Keep master's version (has LoadingScreen, SplashScreen logic)
2. Consider adding AdventuresContentProvider if Era 2 needs it
3. Review ConditionalPostHogProvider changes - may have improvements

---

### 5. eas.json ⚠️ CONFLICT
**Changes:**
- profile-revamp: Minimal changes to structure

**View diff:**
```bash
git diff master profile-revamp -- eas.json
```

**RECOMMENDATION:** **KEEP MASTER** (has preview profile, proper channel config)

---

## NEW ERA 2 FILES (Safe to Add) 🆕

### Core Era 2 Components
All these files are NEW in profile-revamp - no conflicts:

```bash
# View any of these:
git show profile-revamp:components/ROI/ROIAdventureCardComponent.tsx
git show profile-revamp:components/ROI/ROIAdventureComponent.tsx
git show profile-revamp:components/ROI/ROIAdventureSummary.tsx
git show profile-revamp:components/ROI/ROIEraComponent.tsx
git show profile-revamp:components/ROI/ROIImageCarouselLesson.tsx
git show profile-revamp:components/ROI/ROIQuiz.tsx
git show profile-revamp:components/ROI/ROIReelLesson.tsx
git show profile-revamp:components/ROI/ROIVideoCarouselLesson.tsx
git show profile-revamp:components/ROI/types.ts
```

**RECOMMENDATION:** **ADD ALL** (372-681 lines each, Era 2 functionality)

---

### 6. context/AdventuresContentProvider.tsx 🆕
**NEW FILE:** 117 lines, provides content management for adventures

**View file:**
```bash
git show profile-revamp:context/AdventuresContentProvider.tsx
```

**RECOMMENDATION:** **ADD** (needed for Era 2)
**Note:** Must integrate with app/_layout.tsx provider hierarchy

---

### 7. services/AdventuresContentService.ts 🆕
**NEW FILE:** 230 lines, content service for Era 2

**View file:**
```bash
git show profile-revamp:services/AdventuresContentService.ts
```

**RECOMMENDATION:** **ADD** (Era 2 backend)

---

### 8. types/progress.ts 🆕
**NEW FILE:** 83 lines, centralized type definitions

**View file:**
```bash
git show profile-revamp:types/progress.ts
```

**RECOMMENDATION:** **ADD** (good refactor, centralizes types)

---

### 9. hooks/useROIAdventures.ts 🆕
**NEW FILE:** 94 lines, Era 2 data hook

**View file:**
```bash
git show profile-revamp:hooks/useROIAdventures.ts
```

**RECOMMENDATION:** **ADD** (Era 2 hook)

---

### 10. app/(tabs)/roi-bento.tsx 🆕
**NEW FILE:** 170 lines, Era 2 bento grid layout screen

**View file:**
```bash
git show profile-revamp:app/(tabs)/roi-bento.tsx
```

**RECOMMENDATION:** **ADD** (Era 2 UI screen)

---

## CONTEXT FILES (Careful Review)

### 11. context/ProgressContext.tsx ⚠️ MAJOR CONFLICT
**Changes:**
- profile-revamp: Massive refactor (653 insertions, 943 deletions)
- Moves type definitions to types/progress.ts (imports them)
- Refactors progress logic to work with AdventuresContentService
- Changes internal structure significantly

**View diff:**
```bash
git diff master profile-revamp -- context/ProgressContext.tsx | less
```

**RECOMMENDATION:** **KEEP MASTER + IMPORT TYPES ONLY**
**Action:**
1. Keep master's stable ProgressContext implementation
2. Add import for types from types/progress.ts
3. Add Era 2-specific progress tracking WITHOUT the refactor

---

### 12. context/RewardsContext.tsx ⚠️ CONFLICT
**Changes:**
- profile-revamp: +53 insertions, -8 deletions
- Commit 140f61c: "user reward improvement"

**View diff:**
```bash
git diff master profile-revamp -- context/RewardsContext.tsx
```

**RECOMMENDATION:** **REVIEW & SELECTIVE MERGE**
**Action:** Cherry-pick the "user reward improvement" changes from profile-revamp

---

### 13. services/SimplifiedSyncService.ts ⚠️ CONFLICT
**Changes:**
- profile-revamp: +138 insertions, significant additions for Era 2 sync

**View diff:**
```bash
git diff master profile-revamp -- services/SimplifiedSyncService.ts
```

**RECOMMENDATION:** **MANUAL MERGE**
**Action:** Keep master base, add Era 2 sync logic from profile-revamp

---

## APP SCREENS (Review Each)

### 14. app/(tabs)/profile.tsx ⚠️ MAJOR UI CHANGES
**Changes:** 277 lines changed (major UI refactor)

**View diff:**
```bash
git diff master profile-revamp -- app/(tabs)/profile.tsx | less
```

**RECOMMENDATION:** **COMPARE SIDE-BY-SIDE**
**Action:** Review if profile-revamp has valuable UI improvements or bug fixes

---

### 15. app/(tabs)/eras.tsx ⚠️ CONFLICT
**Changes:** +42 lines, adds Era 2 selection logic

**View diff:**
```bash
git diff master profile-revamp -- app/(tabs)/eras.tsx
```

**RECOMMENDATION:** **MANUAL MERGE** (add Era 2 logic to master)

---

### 16. app/(tabs)/index.tsx ⚠️ CONFLICT
**Changes:** +23 lines changed

**View diff:**
```bash
git diff master profile-revamp -- app/(tabs)/index.tsx
```

**RECOMMENDATION:** **REVIEW** (check what changed)

---

### 17. app/(tabs)/_layout.tsx ✏️ MINOR
**Changes:** +7 lines (adds ROI bento tab)

**View diff:**
```bash
git diff master profile-revamp -- app/(tabs)/_layout.tsx
```

**RECOMMENDATION:** **MERGE** (add Era 2 tab to master)

---

### 18. app/era-selection.tsx ⚠️ CONFLICT
**Changes:** +32 lines (Era 2 selection UI)

**View diff:**
```bash
git diff master profile-revamp -- app/era-selection.tsx
```

**RECOMMENDATION:** **MERGE** (add Era 2 selection to master)

---

### 19. app/index.tsx ✏️ MINOR
**Changes:** +8 lines

**View diff:**
```bash
git diff master profile-revamp -- app/index.tsx
```

**RECOMMENDATION:** **REVIEW** (likely routing changes)

---

## AUTH SCREENS (Minor Changes)

### 20-23. app/(auth)/*.tsx ✏️ MINOR
Files: archives-auth.tsx, email-details.tsx, forgot-password.tsx, reset-password.tsx
**Changes:** 2-24 lines each, likely padding or style adjustments

**View all:**
```bash
git diff master profile-revamp -- app/(auth)/
```

**RECOMMENDATION:** **KEEP MASTER** (has proper Android padding fixes)

---

## ONBOARDING SCREENS (Minor Changes)

### 24-31. app/onboarding-*.tsx ✏️ MINOR
**Changes:** 2-3 lines each per file

**View all:**
```bash
git diff master profile-revamp -- app/onboarding-*.tsx
```

**RECOMMENDATION:** **KEEP MASTER** (minor differences)

---

## COMPONENT UPDATES

### 32. components/SubscribeContent.native.tsx ⚠️ CONFLICT
**Changes:** -118 lines (removes intro offer logic!)

**View diff:**
```bash
git diff master profile-revamp -- components/SubscribeContent.native.tsx
```

**RECOMMENDATION:** **KEEP MASTER** (has intro offer eligibility checking)

---

### 33. components/eras/UmmayadDynastyEra.tsx ⚠️ CONFLICT
**Changes:** -175 lines removed

**View diff:**
```bash
git diff master profile-revamp -- components/eras/UmmayadDynastyEra.tsx
```

**RECOMMENDATION:** **KEEP MASTER** (profile-revamp may have broken it)

---

### 34. components/modules/ModuleModal.tsx ✏️ MINOR
**Changes:** -9 lines

**View diff:**
```bash
git diff master profile-revamp -- components/modules/ModuleModal.tsx
```

**RECOMMENDATION:** **REVIEW** (may be cleanup or bug fix)

---

### 35. components/modules/QuizSystem.tsx ⚠️ CONFLICT
**Changes:** -86 lines (removes quiz sound effects!)

**View diff:**
```bash
git diff master profile-revamp -- components/modules/QuizSystem.tsx
```

**RECOMMENDATION:** **KEEP MASTER** (has quiz sound effects that profile removed)

---

### 36. components/modules/ROIModuleModal.tsx ✏️ MINOR
**Changes:** -9 lines

**View diff:**
```bash
git diff master profile-revamp -- components/modules/ROIModuleModal.tsx
```

**RECOMMENDATION:** **REVIEW**

---

## ADVENTURE LESSON/QUIZ FILES (30+ files)

### Adventure 1-5 Modules
All lesson and quiz files were modified in profile-revamp. Changes range from 2 to 502 lines.

**View any specific file:**
```bash
# Example:
git diff master profile-revamp -- components/modules/adventure1/Adventure1_Module1_Lesson1.tsx | less
git diff master profile-revamp -- components/modules/adventure2/Adventure2_Module1_Lesson2.tsx | less
```

**Files list:**
- components/modules/adventure1/*.tsx (6 files: 34-274 line changes each)
- components/modules/adventure2/*.tsx (7 files: 6-502 line changes!)
- components/modules/adventure3/*.tsx (3 files: 39-50 line changes)
- components/modules/adventure4/*.tsx (6 files: 2-86 line changes)
- components/modules/adventure5/*.tsx (6 files: 34-74 line changes)
- components/modules/roiera2/*.tsx (2 files: modified)

**RECOMMENDATION:** **REVIEW CASE-BY-CASE**
**Priority:** Adventure2_Module1_Lesson2.tsx has 502 line changes - check this first!

---

## HOOKS

### 37. hooks/useRevenueCat.ts ⚠️ CONFLICT
**Changes:** Modifications to intro offer logic

**View diff:**
```bash
git diff master profile-revamp -- hooks/useRevenueCat.ts
```

**RECOMMENDATION:** **KEEP MASTER** (has intro offer eligibility checking)

---

### 38. hooks/useSyncIntegration.ts ⚠️ CONFLICT
**Changes:** +59 lines modified for Era 2 sync

**View diff:**
```bash
git diff master profile-revamp -- hooks/useSyncIntegration.ts
```

**RECOMMENDATION:** **MANUAL MERGE** (add Era 2 sync to master)

---

## ANDROID CONFIGURATION

### 39. android/app/build.gradle ⚠️ CONFLICT
**Changes:** +10 lines (adds Google services plugin)

**View diff:**
```bash
git diff master profile-revamp -- android/app/build.gradle
```

**RECOMMENDATION:** **MANUAL MERGE** if google-services.json needed

---

### 40. android/app/google-services.json 🆕
**NEW FILE:** Firebase/Google services config

**View file:**
```bash
git show profile-revamp:android/app/google-services.json
```

**RECOMMENDATION:** **ADD IF NEEDED** (for Firebase notifications)

---

### 41. android/app/src/main/AndroidManifest.xml ⚠️ CONFLICT
**Changes:** -6 lines (removes Universal Links intent filter!)

**View diff:**
```bash
git diff master profile-revamp -- android/app/src/main/AndroidManifest.xml
```

**RECOMMENDATION:** **KEEP MASTER** (has App Links with autoVerify)

---

### 42-44. android/app/src/main/res/values/*.xml ⚠️ CONFLICTS
Files: colors.xml, values-night/colors.xml, styles.xml

**View diff:**
```bash
git diff master profile-revamp -- android/app/src/main/res/values/
```

**RECOMMENDATION:** **COMPARE** (likely minor color/style changes)

---

### 45-47. android/*.gradle, gradle.properties ✏️ MINOR
**Changes:** Gradle version, properties updates

**View diff:**
```bash
git diff master profile-revamp -- android/build.gradle android/gradle.properties
```

**RECOMMENDATION:** **KEEP MASTER** (unless profile fixes build issues)

---

## IOS CONFIGURATION

### 48. ios/Archives.xcodeproj/project.pbxproj ⚠️ CONFLICT
**Changes:** Xcode project modifications

**View diff:**
```bash
git diff master profile-revamp -- ios/Archives.xcodeproj/project.pbxproj | less
```

**RECOMMENDATION:** **KEEP MASTER** (has Universal Links setup, correct Team ID)

---

### 49. ios/Archives/Archives.entitlements ⚠️ CONFLICT
**Changes:** Entitlements modifications

**View diff:**
```bash
git diff master profile-revamp -- ios/Archives/Archives.entitlements
```

**RECOMMENDATION:** **KEEP MASTER** (has associated-domains for Universal Links)

---

### 50. ios/Podfile.lock ⚠️ CONFLICT
**Changes:** Pod dependencies differ

**RECOMMENDATION:** **REGENERATE** after merge (`cd ios && pod install`)

---

### 51. ios/Archives/Info.plist ⚠️ CONFLICT
**View diff:**
```bash
git diff master profile-revamp -- ios/Archives/Info.plist
```

**RECOMMENDATION:** **KEEP MASTER**

---

## ASSETS

### Binary Assets (Splash Screens)
- android/app/src/main/res/drawable-*/splashscreen_logo.png (5 files modified, 5 deleted)
- Dark mode variants deleted in profile-revamp

**RECOMMENDATION:** **KEEP MASTER** (preserve dark mode support)

---

### 52. assets/images/splash-icon.png ⚠️ CONFLICT
**Changes:** Binary file changed (21KB → 107KB)

**View in image viewer after checkout:**
```bash
# Compare both:
git show master:assets/images/splash-icon.png > /tmp/splash-master.png
git show profile-revamp:assets/images/splash-icon.png > /tmp/splash-profile.png
open /tmp/splash-master.png /tmp/splash-profile.png
```

**RECOMMENDATION:** **COMPARE VISUALLY** then decide

---

### ROI Assets (All New) 🆕
- assets/images/icons/ROI/*.svg (4 files)
- assets/images/icons/ROI/bilingual-2.png
- public/images/things-to-do.svg

**RECOMMENDATION:** **ADD ALL** (Era 2 assets)

---

## DELETED FILES IN PROFILE-REVAMP 🗑️

### Documentation
- ANDROID_LESSON_FIXES.md (315 lines)
- ANDROID_PADDING_CHANGES.md (407 lines)

**RECOMMENDATION:** **KEEP IN MASTER** (useful historical context)

---

### Assets
- assets/fonts/DM_Sans-SemiBold.ttf
- assets/videos/quiz_reward/*.mp4 (3 files)

**RECOMMENDATION:** **KEEP IN MASTER** (font used in UI, quiz rewards needed)

---

### Deep Linking Files (CRITICAL!)
- public/.well-known/apple-app-site-association
- public/.well-known/assetlinks.json
- public/index.html (interstitial page)
- public/vercel.json

**RECOMMENDATION:** **KEEP IN MASTER** (Universal Links require these!)

---

### Components
- components/LoadingScreen.tsx

**RECOMMENDATION:** **KEEP IN MASTER** (used in app/_layout.tsx)

---

### Config
- babel.config.js

**RECOMMENDATION:** **CHECK** if master has it, keep master version

---

### Environment
- .env (4 lines removed in profile-revamp)

**RECOMMENDATION:** **KEEP MASTER** (has correct API keys)

---

## TEMP/JUNK FILES (DO NOT MERGE) 🗑️

- components/modules/adventure1/.Adventure1_Module3_Quiz.tsx.swp (vim swap)
- context/.RewardsContext.tsx.swp (vim swap)
- Users/affinitylabs/Documents/GitHub/Archives_Expo/assets/images/icons/ROI/* (wrong paths)

**RECOMMENDATION:** **IGNORE/DELETE**

---

## QUICK COMPARISON COMMANDS

### View specific file differences:
```bash
# Critical files first:
git diff master profile-revamp -- package.json
git diff master profile-revamp -- app.json
git diff master profile-revamp -- CLAUDE.md | less
git diff master profile-revamp -- app/_layout.tsx | less
git diff master profile-revamp -- context/ProgressContext.tsx | less

# Check what profile-revamp deleted:
git diff master profile-revamp --diff-filter=D --name-only

# Check what profile-revamp added:
git diff master profile-revamp --diff-filter=A --name-only

# See all conflicts that will occur:
git merge --no-commit --no-ff profile-revamp 2>&1 | grep CONFLICT
git merge --abort
```

---

## SUMMARY BY RECOMMENDATION

### ✅ KEEP MASTER (Critical Infrastructure - 30+ files)
- package.json, package-lock.json
- app.json (Team ID, Universal Links, build numbers)
- eas.json
- CLAUDE.md (base version)
- app/_layout.tsx (base version)
- All deep linking files (public/.well-known/*)
- components/LoadingScreen.tsx
- components/SubscribeContent.native.tsx (intro offers)
- components/modules/QuizSystem.tsx (sound effects)
- hooks/useRevenueCat.ts (intro eligibility)
- All Android/iOS configs related to Universal Links
- Documentation files
- Quiz reward videos, SemiBold font
- All splash screen assets including dark mode

### 🆕 ADD FROM PROFILE-REVAMP (Era 2 Features - 20+ files)
- components/ROI/* (8 components)
- context/AdventuresContentProvider.tsx
- services/AdventuresContentService.ts
- types/progress.ts
- hooks/useROIAdventures.ts
- app/(tabs)/roi-bento.tsx
- All ROI assets (images, SVGs)
- android/app/google-services.json (if needed)

### 🔀 MANUAL MERGE REQUIRED (30+ files)
- context/ProgressContext.tsx (add type imports, keep master logic)
- context/RewardsContext.tsx (cherry-pick improvements)
- services/SimplifiedSyncService.ts (add Era 2 sync)
- app/(tabs)/*.tsx (add Era 2 screens/tabs)
- app/era-selection.tsx (add Era 2 selection)
- hooks/useSyncIntegration.ts (add Era 2 sync)
- All adventure lesson/quiz files (review case-by-case)
- components/modules/ROIModuleModal.tsx

---

## NEXT STEPS

1. **Start with critical files**: Review package.json, app.json, CLAUDE.md differences first
2. **Use git diff commands** above to compare each file
3. **Make decisions** file by file (KEEP MASTER / USE PROFILE / MANUAL MERGE)
4. **Test thoroughly** after merge
5. **Document** what you kept/merged in commit message

**Estimated time**: 4-6 hours for thorough review and merge

---
---

# STEP-BY-STEP MERGE WORKFLOW

## Table of Contents
- [Workflow Overview](#workflow-overview)
- [Phase 1: New Files (Easy)](#phase-1-new-files-easy)
- [Phase 2: Simple Deletions](#phase-2-simple-deletions)
- [Phase 3: Simple Modifications](#phase-3-simple-modifications)
- [Phase 4: Component Updates](#phase-4-component-updates)
- [Phase 5: Android/iOS Configuration](#phase-5-androidios-configuration)
- [Phase 6: Business Logic](#phase-6-business-logic)
- [Phase 7: Critical Configs](#phase-7-critical-configs)
- [Progress Tracking](#progress-tracking)
- [Git Commands Reference](#git-commands-reference)

---

## Workflow Overview

We'll merge 143 files one at a time, in order of increasing complexity. For each file, we'll:

1. **Show you the changes** - Display the git diff or file content
2. **Discuss what changed** - Explain the modifications in plain language
3. **Get your decision** - You decide: KEEP MASTER, USE PROFILE, or MANUAL MERGE
4. **Apply the change** - Make the change based on your decision
5. **Move to next file** - Repeat until complete

### Decision Options Per File

For each file, you can choose:
- **[K] KEEP MASTER** - Don't change the file, keep master's version
- **[P] USE PROFILE** - Replace with profile-revamp's version
- **[M] MANUAL MERGE** - We'll carefully merge both versions together
- **[S] SKIP** - Mark for later review, move to next file
- **[D] DIFF** - Show me more details about the changes
- **[Q] QUIT** - Save progress and stop for now

### Safety Features

1. **Backup branch created** - Before we start: `git branch backup-before-file-merge`
2. **Commit after each phase** - Never lose progress between phases
3. **Skip option** - Mark difficult files for later review
4. **Undo capability** - Can roll back individual files with git checkout
5. **Testing checkpoints** - Test app after major phases

---

## Phase 1: New Files (Easy)
**Duration:** ~30 minutes | **Files:** 20 | **Difficulty:** ⭐

These files don't exist in master - we just need to add them from profile-revamp.

### Files to Add

#### 1. types/progress.ts (83 lines)
**What:** Centralized type definitions for progress tracking
**Why:** Good refactor, makes types reusable across contexts
**Command to view:**
```bash
git show profile-revamp:types/progress.ts
```
**Command to add:**
```bash
git show profile-revamp:types/progress.ts > types/progress.ts
git add types/progress.ts
```
**Decision:** [K] Keep Master | [P] Use Profile | [S] Skip | [D] Show Diff

---

#### 2. services/AdventuresContentService.ts (230 lines)
**What:** Content management service for Era 2 adventures
**Why:** Backend service for ROI era functionality
**Command to view:**
```bash
git show profile-revamp:services/AdventuresContentService.ts | less
```
**Command to add:**
```bash
git show profile-revamp:services/AdventuresContentService.ts > services/AdventuresContentService.ts
git add services/AdventuresContentService.ts
```
**Decision:** [K] Keep Master | [P] Use Profile | [S] Skip | [D] Show Diff

---

#### 3. context/AdventuresContentProvider.tsx (117 lines)
**What:** React context provider for adventures content
**Why:** Provides Era 2 content to components
**Note:** Will need to integrate with app/_layout.tsx provider hierarchy
**Command to view:**
```bash
git show profile-revamp:context/AdventuresContentProvider.tsx | less
```
**Command to add:**
```bash
git show profile-revamp:context/AdventuresContentProvider.tsx > context/AdventuresContentProvider.tsx
git add context/AdventuresContentProvider.tsx
```
**Decision:** [K] Keep Master | [P] Use Profile | [S] Skip | [D] Show Diff

---

#### 4. hooks/useROIAdventures.ts (94 lines)
**What:** Custom hook for Era 2 adventure data
**Why:** Manages ROI era state and data fetching
**Command to view:**
```bash
git show profile-revamp:hooks/useROIAdventures.ts | less
```
**Command to add:**
```bash
git show profile-revamp:hooks/useROIAdventures.ts > hooks/useROIAdventures.ts
git add hooks/useROIAdventures.ts
```
**Decision:** [K] Keep Master | [P] Use Profile | [S] Skip | [D] Show Diff

---

#### 5. app/(tabs)/roi-bento.tsx (170 lines)
**What:** Era 2 bento grid layout screen
**Why:** Main UI for Rise of Islam era
**Command to view:**
```bash
git show profile-revamp:app/\(tabs\)/roi-bento.tsx | less
```
**Command to add:**
```bash
git show profile-revamp:app/\(tabs\)/roi-bento.tsx > app/\(tabs\)/roi-bento.tsx
git add app/\(tabs\)/roi-bento.tsx
```
**Decision:** [K] Keep Master | [P] Use Profile | [S] Skip | [D] Show Diff

---

#### 6-13. ROI Component Files (8 files, 372-681 lines each)

All new Era 2 components:

```bash
# View any component:
git show profile-revamp:components/ROI/ROIAdventureCardComponent.tsx | less    # 372 lines
git show profile-revamp:components/ROI/ROIAdventureComponent.tsx | less        # 594 lines
git show profile-revamp:components/ROI/ROIAdventureSummary.tsx | less          # 495 lines
git show profile-revamp:components/ROI/ROIEraComponent.tsx | less              # 385 lines
git show profile-revamp:components/ROI/ROIImageCarouselLesson.tsx | less       # 646 lines
git show profile-revamp:components/ROI/ROIQuiz.tsx | less                      # 654 lines
git show profile-revamp:components/ROI/ROIReelLesson.tsx | less                # 611 lines
git show profile-revamp:components/ROI/ROIVideoCarouselLesson.tsx | less       # 681 lines
git show profile-revamp:components/ROI/types.ts | less                         # 55 lines

# Add all at once:
mkdir -p components/ROI
git show profile-revamp:components/ROI/ROIAdventureCardComponent.tsx > components/ROI/ROIAdventureCardComponent.tsx
git show profile-revamp:components/ROI/ROIAdventureComponent.tsx > components/ROI/ROIAdventureComponent.tsx
git show profile-revamp:components/ROI/ROIAdventureSummary.tsx > components/ROI/ROIAdventureSummary.tsx
git show profile-revamp:components/ROI/ROIEraComponent.tsx > components/ROI/ROIEraComponent.tsx
git show profile-revamp:components/ROI/ROIImageCarouselLesson.tsx > components/ROI/ROIImageCarouselLesson.tsx
git show profile-revamp:components/ROI/ROIQuiz.tsx > components/ROI/ROIQuiz.tsx
git show profile-revamp:components/ROI/ROIReelLesson.tsx > components/ROI/ROIReelLesson.tsx
git show profile-revamp:components/ROI/ROIVideoCarouselLesson.tsx > components/ROI/ROIVideoCarouselLesson.tsx
git show profile-revamp:components/ROI/types.ts > components/ROI/types.ts
git add components/ROI/
```

**Decision for all 8 files:** [P] Use Profile (add all)

---

#### 14-20. ROI Asset Files (7 files)

New Era 2 images and icons:

```bash
# View and add assets:
mkdir -p assets/images/icons/ROI public/images

git show profile-revamp:assets/images/icons/ROI/bilingual-2.png > assets/images/icons/ROI/bilingual-2.png
git show profile-revamp:assets/images/icons/ROI/ellipse-126.svg > assets/images/icons/ROI/ellipse-126.svg
git show profile-revamp:assets/images/icons/ROI/frame-208.svg > assets/images/icons/ROI/frame-208.svg
git show profile-revamp:assets/images/icons/ROI/play-arrow.svg > assets/images/icons/ROI/play-arrow.svg
git show profile-revamp:assets/images/icons/ROI/things-to-do.svg > assets/images/icons/ROI/things-to-do.svg
git show profile-revamp:public/images/things-to-do.svg > public/images/things-to-do.svg

git add assets/images/icons/ROI/ public/images/
```

**Decision:** [P] Use Profile (add all)

---

### Phase 1 Completion

After adding all Phase 1 files, commit:

```bash
git commit -m "feat: add Era 2 (ROI) core components and services

- Add centralized progress types (types/progress.ts)
- Add AdventuresContentService and AdventuresContentProvider
- Add useROIAdventures hook for Era 2 data management
- Add ROI bento grid layout screen
- Add 8 ROI lesson/quiz components (carousel, reel, quiz, etc.)
- Add Era 2 assets (icons, images, SVGs)

Phase 1/7 complete - New files added (20/143 files processed)"
```

**Progress:** ✅ Phase 1 Complete | Files: 20/143 | Next: Phase 2

---

## Phase 2: Simple Deletions
**Duration:** ~20 minutes | **Files:** 15 | **Difficulty:** ⭐⭐

Files that profile-revamp deleted - decide if master should keep them.

### Files Deleted in profile-revamp

#### 21. ANDROID_LESSON_FIXES.md (315 lines)
**What:** Documentation about Android lesson fixes
**In profile-revamp:** DELETED
**In master:** EXISTS - Historical documentation
**My recommendation:** KEEP (useful context for future debugging)
**Decision:** [K] Keep Master | [D] Delete | [S] Skip

---

#### 22. ANDROID_PADDING_CHANGES.md (407 lines)
**What:** Documentation about Android padding changes
**In profile-revamp:** DELETED
**In master:** EXISTS - Historical documentation
**My recommendation:** KEEP (useful context)
**Decision:** [K] Keep Master | [D] Delete | [S] Skip

---

#### 23. babel.config.js
**What:** Babel configuration for build
**In profile-revamp:** DELETED
**In master:** Check if exists
**Command to check:**
```bash
ls -la babel.config.js
```
**My recommendation:** KEEP if exists in master
**Decision:** [K] Keep Master | [D] Delete | [S] Skip

---

#### 24. components/LoadingScreen.tsx (82 lines)
**What:** Loading screen component
**In profile-revamp:** DELETED
**In master:** EXISTS - Used in app/_layout.tsx
**My recommendation:** KEEP (still in use)
**To verify usage:**
```bash
git grep -n "LoadingScreen" app/_layout.tsx
```
**Decision:** [K] Keep Master | [D] Delete | [S] Skip

---

#### 25-27. Quiz Reward Videos (3 files)
**What:** Quiz completion reward videos
**In profile-revamp:** DELETED
- assets/videos/quiz_reward/quiz-reward1.mp4
- assets/videos/quiz_reward/quiz-reward2.mp4
- assets/videos/quiz_reward/quiz-reward3.mp4
**In master:** EXISTS - Used in quiz system
**My recommendation:** KEEP (quiz rewards feature)
**Decision:** [K] Keep Master | [D] Delete | [S] Skip

---

#### 28. assets/fonts/DM_Sans-SemiBold.ttf
**What:** DM Sans SemiBold font file
**In profile-revamp:** DELETED
**In master:** EXISTS - Used in profile UI
**To verify usage:**
```bash
git grep -n "DM_Sans-SemiBold" master
git grep -n "SemiBold" master
```
**My recommendation:** KEEP (font still in use)
**Decision:** [K] Keep Master | [D] Delete | [S] Skip

---

#### 29-33. Deep Linking Files (5 CRITICAL files)
**What:** Universal Links and App Links configuration
**In profile-revamp:** ALL DELETED ⚠️
- public/.well-known/apple-app-site-association (iOS Universal Links)
- public/.well-known/assetlinks.json (Android App Links)
- public/index.html (web interstitial page)
- public/vercel.json (deployment config)
- public/.gitignore

**In master:** EXISTS - Required for deep linking feature
**My recommendation:** **KEEP ALL** (critical for Universal Links to work!)
**Impact if deleted:** Deep linking breaks completely
**Decision:** [K] Keep Master | [D] Delete | [S] Skip

---

#### 34-38. Dark Mode Splash Screens (5 files)
**What:** Dark mode splash screen variants for Android
**In profile-revamp:** DELETED
- android/app/src/main/res/drawable-night-hdpi/splashscreen_logo.png
- android/app/src/main/res/drawable-night-mdpi/splashscreen_logo.png
- android/app/src/main/res/drawable-night-xhdpi/splashscreen_logo.png
- android/app/src/main/res/drawable-night-xxhdpi/splashscreen_logo.png
- android/app/src/main/res/drawable-night-xxxhdpi/splashscreen_logo.png

**In master:** EXISTS - Dark mode support
**My recommendation:** KEEP (preserve dark mode)
**Decision:** [K] Keep Master | [D] Delete | [S] Skip

---

### Phase 2 Completion

If you kept all master files (recommended):

```bash
# Nothing to commit - all files kept from master
echo "Phase 2 complete - All deleted files kept from master"
```

**Progress:** ✅ Phase 2 Complete | Files: 35/143 | Next: Phase 3

---

## Phase 3: Simple Modifications
**Duration:** ~1 hour | **Files:** 25 | **Difficulty:** ⭐⭐

Small changes, easy to review and decide.

### Onboarding Screens (8 files, 2-3 lines each)

#### 39-46. app/onboarding-*.tsx files

All onboarding screens have minor changes:
- onboarding-welcome.tsx (2 lines)
- onboarding-video.tsx (3 lines)
- onboarding-video-2.tsx (2 lines)
- onboarding-question-1.tsx (2 lines)
- onboarding-question-2.tsx (2 lines)
- onboarding-question-3.tsx (2 lines)
- onboarding-question-4.tsx (2 lines)
- onboarding-results.tsx (3 lines)

**View all changes:**
```bash
git diff master profile-revamp -- app/onboarding-*.tsx
```

**My recommendation:** Review changes, likely KEEP MASTER (minor style tweaks)
**Batch decision:** [K] Keep Master for all | [R] Review individually | [S] Skip

---

### Auth Screens (4 files)

#### 47-50. app/(auth)/*.tsx files

All auth screens modified:
- archives-auth.tsx (24 lines changed)
- email-details.tsx (2 lines)
- forgot-password.tsx (2 lines)
- reset-password.tsx (2 lines)

**View all changes:**
```bash
git diff master profile-revamp -- app/\(auth\)/
```

**My recommendation:** KEEP MASTER (has proper Android padding fixes from later commits)
**Batch decision:** [K] Keep Master for all | [R] Review individually | [S] Skip

---

### App Routing/Layout (2 files)

#### 51. app/index.tsx (8 lines)
**What:** Root routing logic
**View changes:**
```bash
git diff master profile-revamp -- app/index.tsx
```
**Decision:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [D] Show Diff

---

#### 52. app/(tabs)/_layout.tsx (7 lines added)
**What:** Adds Era 2 ROI bento tab
**View changes:**
```bash
git diff master profile-revamp -- app/\(tabs\)/_layout.tsx
```
**My recommendation:** MANUAL MERGE (add Era 2 tab to master's version)
**Decision:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [D] Show Diff

---

### Android Configuration (6 files)

#### 53-55. Android Gradle Files

- android/build.gradle (1 line added - Google services classpath)
- android/gradle.properties (4 lines changed)
- android/gradle/wrapper/gradle-wrapper.properties (2 lines - Gradle version)

**View changes:**
```bash
git diff master profile-revamp -- android/build.gradle
git diff master profile-revamp -- android/gradle.properties
git diff master profile-revamp -- android/gradle/wrapper/gradle-wrapper.properties
```

**My recommendation:** KEEP MASTER unless profile fixes build issues
**Batch decision:** [K] Keep Master for all | [R] Review individually

---

#### 56-58. Android XML Files

- android/app/src/main/res/values/colors.xml (4 lines)
- android/app/src/main/res/values-night/colors.xml (4 lines)
- android/app/src/main/res/values/styles.xml (3 lines)

**View changes:**
```bash
git diff master profile-revamp -- android/app/src/main/res/values/
```

**My recommendation:** Compare - likely minor color adjustments
**Decision:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [D] Show Diff

---

### iOS Assets (6 files)

#### 59-64. iOS Image Asset Changes

- ios/Archives/Images.xcassets/Contents.json
- ios/Archives/Images.xcassets/SplashScreenBackground.colorset/Contents.json
- ios/Archives/Images.xcassets/SplashScreenLogo.imageset/Contents.json
- ios/Archives/Images.xcassets/SplashScreenLogo.imageset/image.png
- ios/Archives/Images.xcassets/SplashScreenLogo.imageset/image@2x.png
- ios/Archives/Images.xcassets/SplashScreenLogo.imageset/image@3x.png

**View changes:**
```bash
git diff master profile-revamp -- ios/Archives/Images.xcassets/
```

**My recommendation:** KEEP MASTER (preserve current splash assets)
**Batch decision:** [K] Keep Master for all | [R] Review individually

---

### Phase 3 Completion

After reviewing all Phase 3 files, commit any changes:

```bash
git commit -m "chore: Phase 3 - review simple modifications

- Reviewed onboarding screens (kept master)
- Reviewed auth screens (kept master)
- Added Era 2 tab to tabs layout
- Reviewed Android/iOS configurations

Phase 3/7 complete - Simple modifications reviewed (60/143 files processed)"
```

**Progress:** ✅ Phase 3 Complete | Files: 60/143 | Next: Phase 4

---

## Phase 4: Component Updates
**Duration:** ~2-3 hours | **Files:** 35 | **Difficulty:** ⭐⭐⭐⭐

Adventure modules, lessons, quizzes - need careful review for bug fixes.

### Important Components (5 files)

#### 65. components/SubscribeContent.native.tsx ⚠️ CRITICAL
**Changes:** -118 lines (removes intro offer logic!)
**View diff:**
```bash
git diff master profile-revamp -- components/SubscribeContent.native.tsx | less
```
**Impact:** Removes RevenueCat intro offer eligibility checking
**My recommendation:** **KEEP MASTER** (intro offers are a key feature)
**Decision:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [D] Show More

---

#### 66. components/modules/QuizSystem.tsx ⚠️ CRITICAL
**Changes:** -86 lines (removes quiz sound effects!)
**View diff:**
```bash
git diff master profile-revamp -- components/modules/QuizSystem.tsx | less
```
**Impact:** Removes correct/incorrect/reward sound effects
**My recommendation:** **KEEP MASTER** (quiz sounds are important UX)
**Decision:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [D] Show More

---

#### 67. components/eras/UmmayadDynastyEra.tsx
**Changes:** -175 lines removed
**View diff:**
```bash
git diff master profile-revamp -- components/eras/UmmayadDynastyEra.tsx | less
```
**Impact:** Major refactor or simplification
**My recommendation:** KEEP MASTER (profile version may have issues)
**Decision:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [D] Show More

---

#### 68. components/modules/ModuleModal.tsx
**Changes:** -9 lines
**View diff:**
```bash
git diff master profile-revamp -- components/modules/ModuleModal.tsx
```
**My recommendation:** REVIEW (may be cleanup or bug fix)
**Decision:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [D] Show More

---

#### 69. components/modules/ROIModuleModal.tsx
**Changes:** -9 lines
**View diff:**
```bash
git diff master profile-revamp -- components/modules/ROIModuleModal.tsx
```
**My recommendation:** REVIEW
**Decision:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [D] Show More

---

### Adventure 1 Modules (6 files)

#### 70-75. Adventure 1 Lessons and Quizzes

- Adventure1_Module1_Lesson1.tsx (274 lines changed!)
- Adventure1_Module1_Lesson2.tsx (63 lines)
- Adventure1_Module1_Quiz.tsx (34 lines)
- Adventure1_Module2_Lesson2.tsx (76 lines)
- Adventure1_Module2_Quiz.tsx (40 lines)
- Adventure1_Module3_Lesson1.tsx (92 lines)
- Adventure1_Module3_Quiz.tsx (46 lines)

**View specific file:**
```bash
# Example:
git diff master profile-revamp -- components/modules/adventure1/Adventure1_Module1_Lesson1.tsx | less
```

**View all Adventure 1 changes:**
```bash
git diff master profile-revamp -- components/modules/adventure1/ | less
```

**My recommendation:** Review each file - likely has bug fixes or improvements
**For each file:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [S] Skip

---

### Adventure 2 Modules (7 files) ⚠️ PRIORITY

#### 76-82. Adventure 2 Lessons and Quizzes

- Adventure2_Module1_Lesson1.tsx (6 lines)
- **Adventure2_Module1_Lesson2.tsx (502 lines!)** ⚠️ HIGHEST PRIORITY
- Adventure2_Module1_Quiz.tsx (40 lines)
- Adventure2_Module2_Lesson1.tsx (6 lines)
- Adventure2_Module2_Quiz.tsx (40 lines)
- Adventure2_Module3_Lesson2.tsx (26 lines)
- Adventure2_Module3_Quiz.tsx (42 lines)

**View Adventure2_Module1_Lesson2.tsx (502 lines!):**
```bash
git diff master profile-revamp -- components/modules/adventure2/Adventure2_Module1_Lesson2.tsx | less
```

This file has the most changes - review carefully!

**View all Adventure 2 changes:**
```bash
git diff master profile-revamp -- components/modules/adventure2/ | less
```

**My recommendation:** Review each file, especially the 502-line change
**For each file:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [S] Skip

---

### Adventure 3 Modules (3 files)

#### 83-85. Adventure 3 Quizzes

- Adventure3_Module1_Quiz.tsx (50 lines)
- Adventure3_Module2_Quiz.tsx (39 lines)
- Adventure3_Module3_Quiz.tsx (40 lines)

**View all Adventure 3 changes:**
```bash
git diff master profile-revamp -- components/modules/adventure3/ | less
```

**For each file:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [S] Skip

---

### Adventure 4 Modules (6 files)

#### 86-91. Adventure 4 Lessons and Quizzes

- Adventure4_Module1_Lesson1.tsx (2 lines)
- Adventure4_Module1_Lesson2.tsx (86 lines)
- Adventure4_Module1_Quiz.tsx (34 lines)
- Adventure4_Module2_Lesson1.tsx (74 lines)
- Adventure4_Module2_Quiz.tsx (34 lines)
- Adventure4_Module3_Lesson1.tsx (86 lines)
- Adventure4_Module3_Quiz.tsx (34 lines)

**View all Adventure 4 changes:**
```bash
git diff master profile-revamp -- components/modules/adventure4/ | less
```

**For each file:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [S] Skip

---

### Adventure 5 Modules (6 files)

#### 92-97. Adventure 5 Lessons and Quizzes

- Adventure5_Module1_Lesson2.tsx (74 lines)
- Adventure5_Module1_Quiz.tsx (34 lines)
- Adventure5_Module2_Lesson1.tsx (74 lines)
- Adventure5_Module2_Quiz.tsx (34 lines)
- Adventure5_Module3_Lesson1.tsx (86 lines)
- Adventure5_Module3_Quiz.tsx (34 lines)

**View all Adventure 5 changes:**
```bash
git diff master profile-revamp -- components/modules/adventure5/ | less
```

**For each file:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [S] Skip

---

### ROI Era 2 Modules (2 files)

#### 98-99. ROI Era 2 Quizzes

- components/modules/roiera2/ROIERA2Adv1_Module1_Quiz.tsx
- components/modules/roiera2/ROIERA2Adv1_Module2_Quiz.tsx

**View ROI changes:**
```bash
git diff master profile-revamp -- components/modules/roiera2/ | less
```

**For each file:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [S] Skip

---

### Phase 4 Completion

After reviewing all Phase 4 files, commit:

```bash
git commit -m "feat: Phase 4 - update adventure components

[Document your decisions here - which files you kept/merged/updated]

Phase 4/7 complete - Component updates reviewed (95/143 files processed)"
```

**Progress:** ✅ Phase 4 Complete | Files: 95/143 | Next: Phase 5

---

## Phase 5: Android/iOS Configuration
**Duration:** ~45 minutes | **Files:** 10 | **Difficulty:** ⭐⭐⭐⭐

Build configuration needs careful review.

### Android Configuration (5 files)

#### 100. android/app/google-services.json 🆕
**What:** Firebase/Google services configuration (NEW FILE)
**Purpose:** Required for Firebase Cloud Messaging (push notifications)
**View file:**
```bash
git show profile-revamp:android/app/google-services.json | less
```
**My recommendation:** ADD if you're using Firebase for notifications
**Decision:** [P] Use Profile (add) | [S] Skip | [D] View File

---

#### 101. android/app/build.gradle ⚠️
**Changes:** +10 lines (adds Google services plugin)
**View diff:**
```bash
git diff master profile-revamp -- android/app/build.gradle
```
**My recommendation:** MANUAL MERGE if adding google-services.json
**Decision:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [D] Show More

---

#### 102. android/app/src/main/AndroidManifest.xml ⚠️ CRITICAL
**Changes:** -6 lines (removes Universal Links intent filter!)
**View diff:**
```bash
git diff master profile-revamp -- android/app/src/main/AndroidManifest.xml
```
**Impact:** Removes App Links deep linking configuration
**My recommendation:** **KEEP MASTER** (Universal Links require this!)
**Decision:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [D] Show More

---

#### 103-107. Android Splash Screen Images (5 binary files)
**What:** Splash screen logos for different densities
**Changes:** Binary files modified (different images)
**Files:**
- drawable-hdpi/splashscreen_logo.png (10KB → 17KB)
- drawable-mdpi/splashscreen_logo.png (6KB → 10KB)
- drawable-xhdpi/splashscreen_logo.png (14KB → 26KB)
- drawable-xxhdpi/splashscreen_logo.png (23KB → 45KB)
- drawable-xxxhdpi/splashscreen_logo.png (33KB → 70KB)

**Extract and compare:**
```bash
# Extract both versions:
git show master:android/app/src/main/res/drawable-xxhdpi/splashscreen_logo.png > /tmp/splash-master.png
git show profile-revamp:android/app/src/main/res/drawable-xxhdpi/splashscreen_logo.png > /tmp/splash-profile.png
open /tmp/splash-master.png /tmp/splash-profile.png
```

**My recommendation:** KEEP MASTER (current splash is correct)
**Decision:** [K] Keep Master | [P] Use Profile | [C] Compare Images

---

### iOS Configuration (5 files)

#### 108. ios/Archives.xcodeproj/project.pbxproj ⚠️
**What:** Xcode project file
**Changes:** Xcode project modifications
**View diff:**
```bash
git diff master profile-revamp -- ios/Archives.xcodeproj/project.pbxproj | less
```
**My recommendation:** **KEEP MASTER** (has Universal Links, correct Team ID)
**Decision:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [D] Show More

---

#### 109. ios/Archives/Archives.entitlements ⚠️
**What:** iOS app entitlements
**Changes:** Entitlements modifications
**View diff:**
```bash
git diff master profile-revamp -- ios/Archives/Archives.entitlements
```
**My recommendation:** **KEEP MASTER** (has associated-domains for Universal Links)
**Decision:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [D] Show More

---

#### 110. ios/Archives/Info.plist
**What:** iOS app information property list
**View diff:**
```bash
git diff master profile-revamp -- ios/Archives/Info.plist
```
**My recommendation:** KEEP MASTER
**Decision:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [D] Show More

---

#### 111. ios/Archives/SplashScreen.storyboard
**What:** iOS splash screen storyboard
**View diff:**
```bash
git diff master profile-revamp -- ios/Archives/SplashScreen.storyboard
```
**My recommendation:** KEEP MASTER
**Decision:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [D] Show More

---

#### 112. ios/Podfile.lock
**What:** iOS pod dependencies lock file
**Changes:** Pod versions differ between branches
**My recommendation:** **REGENERATE** after merge completes
**Command:**
```bash
cd ios && pod install && cd ..
```
**Decision:** [R] Regenerate after merge | [K] Keep Master | [P] Use Profile

---

### Phase 5 Completion

After reviewing all Phase 5 files, commit:

```bash
git commit -m "chore: Phase 5 - Android/iOS configuration

[Document your decisions - which configs you kept/merged]

Phase 5/7 complete - Platform configs reviewed (105/143 files processed)"
```

**Progress:** ✅ Phase 5 Complete | Files: 105/143 | Next: Phase 6

---

## Phase 6: Business Logic
**Duration:** ~1-2 hours | **Files:** 8 | **Difficulty:** ⭐⭐⭐⭐⭐

Core application logic - needs thorough review.

### Context Files (2 files)

#### 113. context/ProgressContext.tsx ⚠️ CRITICAL - MASSIVE REFACTOR
**Changes:** +653 insertions, -943 deletions (complete rewrite!)
**What changed:**
- Moves type definitions to types/progress.ts
- Refactors to work with AdventuresContentService
- Changes internal structure significantly

**View diff:**
```bash
git diff master profile-revamp -- context/ProgressContext.tsx | less
```

**My recommendation:** **KEEP MASTER + IMPORT TYPES**
**Strategy:**
1. Keep master's stable ProgressContext implementation
2. Add import for types from types/progress.ts (already added in Phase 1)
3. Add Era 2-specific progress tracking WITHOUT the full refactor

**Decision:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [D] Show More

---

#### 114. context/RewardsContext.tsx ⚠️
**Changes:** +53 insertions, -8 deletions
**What changed:** "user reward improvement" from commit 140f61c
**View diff:**
```bash
git diff master profile-revamp -- context/RewardsContext.tsx
```

**My recommendation:** REVIEW & SELECTIVE MERGE
**Strategy:** Cherry-pick the reward improvement logic

**Decision:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [D] Show More

---

### Service Files (1 file)

#### 115. services/SimplifiedSyncService.ts ⚠️
**Changes:** +138 insertions (Era 2 sync additions)
**What changed:** Adds Era 2 sync logic to existing service
**View diff:**
```bash
git diff master profile-revamp -- services/SimplifiedSyncService.ts | less
```

**My recommendation:** MANUAL MERGE
**Strategy:** Keep master base, add Era 2 sync logic from profile

**Decision:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [D] Show More

---

### Hooks (2 files)

#### 116. hooks/useRevenueCat.ts ⚠️
**Changes:** Modifications to intro offer logic
**View diff:**
```bash
git diff master profile-revamp -- hooks/useRevenueCat.ts
```

**My recommendation:** **KEEP MASTER** (has intro offer eligibility checking)

**Decision:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [D] Show More

---

#### 117. hooks/useSyncIntegration.ts ⚠️
**Changes:** +59 lines modified for Era 2 sync
**View diff:**
```bash
git diff master profile-revamp -- hooks/useSyncIntegration.ts
```

**My recommendation:** MANUAL MERGE (add Era 2 sync to master)

**Decision:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [D] Show More

---

### App Screens (3 files)

#### 118. app/(tabs)/profile.tsx ⚠️ MAJOR UI CHANGES
**Changes:** 277 lines changed (major UI refactor)
**View diff:**
```bash
git diff master profile-revamp -- app/\(tabs\)/profile.tsx | less
```

**My recommendation:** COMPARE SIDE-BY-SIDE
**Strategy:** Check if profile-revamp has valuable UI improvements

**Decision:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [D] Show More

---

#### 119. app/(tabs)/eras.tsx ⚠️
**Changes:** +42 lines (adds Era 2 selection logic)
**View diff:**
```bash
git diff master profile-revamp -- app/\(tabs\)/eras.tsx
```

**My recommendation:** MANUAL MERGE (add Era 2 logic to master)

**Decision:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [D] Show More

---

#### 120. app/era-selection.tsx ⚠️
**Changes:** +32 lines (Era 2 selection UI)
**View diff:**
```bash
git diff master profile-revamp -- app/era-selection.tsx
```

**My recommendation:** MANUAL MERGE (add Era 2 selection to master)

**Decision:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [D] Show More

---

### Phase 6 Completion

After carefully reviewing all Phase 6 files, commit:

```bash
git commit -m "feat: Phase 6 - business logic and Era 2 integration

[Document your merge decisions - what you kept, what you merged]

- Updated ProgressContext with Era 2 type imports
- Merged RewardsContext improvements
- Added Era 2 sync logic to SimplifiedSyncService
- Integrated Era 2 screens and selection logic

Phase 6/7 complete - Business logic reviewed (113/143 files processed)"
```

**Progress:** ✅ Phase 6 Complete | Files: 113/143 | Next: Phase 7 (Final!)

---

## Phase 7: Critical Configs (FINAL BOSS)
**Duration:** ~1 hour | **Files:** 10 | **Difficulty:** ⭐⭐⭐⭐⭐

Most important files - save for when we understand all changes.

### Package Management (2 files)

#### 121. package.json ⚠️ CRITICAL
**Changes:**
- profile-revamp removes: `expo-navigation-bar`, `react-native-purchases-ui`, `rive-react-native`
- profile-revamp downgrades: `react-native-purchases` 9.5.4 → 9.5.1
- profile-revamp adds: `expo-system-ui`, `react-native-render-html`

**View diff:**
```bash
git diff master profile-revamp -- package.json
```

**My recommendation:** **KEEP MASTER**
**Reasoning:**
- Master has rive-react-native (Start Here animation)
- Master has newer RevenueCat (intro offers)
- Master has expo-navigation-bar

**Optional:** Add expo-system-ui and react-native-render-html if Era 2 needs them

**Decision:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [D] Show More

---

#### 122. package-lock.json
**What:** NPM lock file (matches package.json)
**My recommendation:** Regenerate after final package.json decision
**Command:**
```bash
npm install
```

**Decision:** [R] Regenerate | [K] Keep Master | [P] Use Profile

---

### App Configuration (2 files)

#### 123. app.json ⚠️ CRITICAL
**Changes:**
- buildNumber: 73 → 75 (increment)
- Removes rive-react-native plugin
- Changes Team ID: LQ9LP2WW94 → L33CVM28SL (wrong!)
- Removes Universal Links config (associatedDomains, intentFilters)

**View diff:**
```bash
git diff master profile-revamp -- app.json
```

**My recommendation:** **KEEP MASTER**
**Reasoning:**
- Master has correct Team ID (LQ9LP2WW94)
- Master has Universal Links configuration
- Master has rive plugin

**Optional:** Manually update buildNumber to 75 if desired

**Decision:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [D] Show More

---

#### 124. eas.json
**Changes:** Minimal structure changes
**View diff:**
```bash
git diff master profile-revamp -- eas.json
```

**My recommendation:** **KEEP MASTER** (has preview profile, OTA channels)

**Decision:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [D] Show More

---

### Documentation (1 file)

#### 125. CLAUDE.md ⚠️ CRITICAL
**Changes:** -118 lines (removes extensive documentation!)
**What's removed:**
- Provider hierarchy details
- Universal Links documentation
- Build profiles documentation
- Intro offer subscription details
- Analytics tracking details

**View diff:**
```bash
git diff master profile-revamp -- CLAUDE.md | less
```

**My recommendation:** **KEEP MASTER + ADD ERA 2 DOCS**
**Strategy:**
1. Keep master's comprehensive documentation
2. Add new sections about Era 2 (AdventuresContentProvider, ROI components)

**Decision:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [D] Show More

---

### Root Provider (1 file)

#### 126. app/_layout.tsx ⚠️ CRITICAL - ROOT LAYOUT
**Changes:** +187 insertions, significant refactor
**What changed:**
- Removes: SplashScreen, NavigationBar, LoadingScreen imports
- Adds: AdventuresContentProvider, useAppTrackingTransparency
- Removes: SplashScreen.preventAutoHideAsync() logic
- Adds: ConditionalPostHogProvider with session replay config
- Changes: Provider hierarchy

**View diff:**
```bash
git diff master profile-revamp -- app/_layout.tsx | less
```

**My recommendation:** **KEEP MASTER BASE + SELECTIVE ADDITIONS**
**Strategy:**
1. Keep master's LoadingScreen, SplashScreen logic
2. Consider adding AdventuresContentProvider for Era 2
3. Review ConditionalPostHogProvider improvements

**Decision:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [D] Show More

---

### Environment & Settings (3 files)

#### 127. .env
**Changes:** -4 lines removed
**View diff:**
```bash
git diff master profile-revamp -- .env
```

**My recommendation:** **KEEP MASTER** (has correct API keys)

**Decision:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [D] Show More

---

#### 128. .claude/settings.local.json
**Changes:** +5 lines
**View diff:**
```bash
git diff master profile-revamp -- .claude/settings.local.json
```

**My recommendation:** REVIEW (local settings, may not matter)

**Decision:** [K] Keep Master | [P] Use Profile | [M] Manual Merge | [D] Show More

---

### Assets (2 files)

#### 129. assets/images/splash-icon.png
**Changes:** Binary file (21KB → 107KB!)
**Extract and compare:**
```bash
git show master:assets/images/splash-icon.png > /tmp/splash-icon-master.png
git show profile-revamp:assets/images/splash-icon.png > /tmp/splash-icon-profile.png
open /tmp/splash-icon-master.png /tmp/splash-icon-profile.png
```

**My recommendation:** COMPARE VISUALLY

**Decision:** [K] Keep Master | [P] Use Profile | [C] Compare Images

---

#### 130. assets/images/quiz-images/mosque.png
**Changes:** Binary file (979KB → 1.6MB)
**My recommendation:** COMPARE if this image is important

**Decision:** [K] Keep Master | [P] Use Profile | [C] Compare Images

---

### Phase 7 Completion - FINAL COMMIT

After completing Phase 7, make final commit:

```bash
git commit -m "feat: Phase 7 - critical configuration (merge complete)

[Document your final decisions]

- Kept master's package.json (rive, newer RevenueCat)
- Kept master's app.json (Team ID, Universal Links)
- Kept master's CLAUDE.md, added Era 2 documentation
- Reviewed app/_layout.tsx, integrated Era 2 provider
- Kept master's environment configuration

Phase 7/7 COMPLETE - All 143 files processed!
Merge status: profile-revamp → master integration complete"
```

**Progress:** ✅✅✅ ALL PHASES COMPLETE! | Files: 143/143

---

## Progress Tracking

Use this checklist to track your progress:

### Phase Completion Checklist

- [ ] **Phase 1:** New Files (20 files) - Duration: ~30 min
- [ ] **Phase 2:** Simple Deletions (15 files) - Duration: ~20 min
- [ ] **Phase 3:** Simple Modifications (25 files) - Duration: ~1 hour
- [ ] **Phase 4:** Component Updates (35 files) - Duration: ~2-3 hours
- [ ] **Phase 5:** Android/iOS Configuration (10 files) - Duration: ~45 min
- [ ] **Phase 6:** Business Logic (8 files) - Duration: ~1-2 hours
- [ ] **Phase 7:** Critical Configs (10 files) - Duration: ~1 hour

**Total:** 143 files | **Estimated time:** 6-10 hours

### Files Processed Counter

```
Phase 1: [ 0/20  ] ░░░░░░░░░░░░░░░░░░░░
Phase 2: [ 0/15  ] ░░░░░░░░░░░░░░░
Phase 3: [ 0/25  ] ░░░░░░░░░░░░░░░░░░░░░░░░░
Phase 4: [ 0/35  ] ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Phase 5: [ 0/10  ] ░░░░░░░░░░
Phase 6: [ 0/8   ] ░░░░░░░░
Phase 7: [ 0/10  ] ░░░░░░░░░░

Total:   [ 0/143 ] ░░░░░░░░░░░░░░░░░░░░
Progress: 0%
```

(Update this manually as you complete each phase)

---

## Git Commands Reference

### Viewing Changes

```bash
# View diff for specific file
git diff master profile-revamp -- path/to/file

# View diff with more context lines
git diff -U10 master profile-revamp -- path/to/file

# View file from specific branch
git show profile-revamp:path/to/file

# View file side-by-side diff
git diff master profile-revamp -- path/to/file | colordiff | less -R

# List all changed files
git diff --name-status master profile-revamp

# Count changed files
git diff --name-only master profile-revamp | wc -l
```

### Applying Changes

```bash
# Keep master version (do nothing)
# File is already from master

# Use profile-revamp version
git checkout profile-revamp -- path/to/file
git add path/to/file

# Add new file from profile-revamp
git show profile-revamp:path/to/file > path/to/file
git add path/to/file

# Manual merge (3-way merge)
git checkout -m profile-revamp -- path/to/file
# Then resolve conflicts manually

# Undo checkout (revert to master)
git checkout master -- path/to/file
```

### Managing Progress

```bash
# Create backup before starting
git branch backup-before-file-merge

# Commit after each phase
git add .
git commit -m "Phase X complete - [description]"

# Check current status
git status

# View commit history
git log --oneline -10

# Reset a file to master
git checkout master -- path/to/file

# Reset everything to master (nuclear option)
git reset --hard master
```

### Comparing Branches

```bash
# Show branch history
git log --oneline --graph --all --decorate -20

# Count commits between branches
git log master..profile-revamp --oneline | wc -l
git log profile-revamp..master --oneline | wc -l

# Find merge base (common ancestor)
git merge-base master profile-revamp

# Show commits since divergence
git log $(git merge-base master profile-revamp)..master --oneline
git log $(git merge-base master profile-revamp)..profile-revamp --oneline
```

### Binary Files (Images, etc.)

```bash
# Extract binary file for comparison
git show master:path/to/image.png > /tmp/image-master.png
git show profile-revamp:path/to/image.png > /tmp/image-profile.png

# Open for visual comparison (macOS)
open /tmp/image-master.png /tmp/image-profile.png

# Check file size
git cat-file -s master:path/to/image.png
git cat-file -s profile-revamp:path/to/image.png
```

### Testing Between Phases

```bash
# Clear Metro cache
npx expo start --clear

# Reinstall dependencies (if package.json changed)
rm -rf node_modules package-lock.json
npm install

# Regenerate iOS pods (if iOS changed)
cd ios && pod install && cd ..

# Run linter
npm run lint

# Check for type errors (if TypeScript)
npx tsc --noEmit
```

---

## Quick Reference: File Categories

| Category | Count | Difficulty | Time |
|----------|-------|------------|------|
| 🆕 New files (just add) | 20 | ⭐ | 30 min |
| 🗑️ Deletions (keep/remove) | 15 | ⭐⭐ | 20 min |
| ✏️ Minor modifications | 25 | ⭐⭐ | 1 hour |
| 🔧 Component updates | 35 | ⭐⭐⭐⭐ | 2-3 hours |
| 📱 Platform configs | 10 | ⭐⭐⭐⭐ | 45 min |
| 💼 Business logic | 8 | ⭐⭐⭐⭐⭐ | 1-2 hours |
| ⚙️ Critical configs | 10 | ⭐⭐⭐⭐⭐ | 1 hour |
| **Total** | **143** | | **6-10 hours** |

---

## Final Notes

### Session Management Tips

- **Work in 1-2 hour sessions** - Take breaks between phases
- **Commit after each phase** - Never lose progress
- **Test after Phases 4, 6, 7** - Ensure app still builds/runs
- **Use skip option liberally** - Come back to difficult files later
- **Keep notes** - Document your decisions for reference

### When to Stop and Ask for Help

Stop and consult if you encounter:
- **Merge conflicts** you don't understand
- **Breaking changes** that prevent app from building
- **Data loss concerns** - especially in ProgressContext or SyncService
- **Critical features breaking** - Universal Links, subscriptions, progress tracking
- **Uncertainty** about business logic changes

### Post-Merge Testing Checklist

After completing all phases, test:

- [ ] App builds successfully (`npx expo start`)
- [ ] No linting errors (`npm run lint`)
- [ ] Umayyad Dynasty era works (Adventures 1-5)
- [ ] Rise of Islam era is accessible
- [ ] Progress tracking works (complete a lesson)
- [ ] Cloud sync works (sign in/out)
- [ ] Universal Links work (test a deep link)
- [ ] Subscription flow works
- [ ] Intro offers display correctly
- [ ] Quiz sounds play
- [ ] Rewards unlock properly
- [ ] No console errors in development

---

## Ready to Begin?

When you're ready to start the file-by-file merge:

1. **Create backup branch:**
   ```bash
   git branch backup-before-file-merge
   ```

2. **Ensure on master:**
   ```bash
   git checkout master
   git status
   ```

3. **Start Phase 1, File 1:**
   - File: `types/progress.ts`
   - Action: Review and decide to add from profile-revamp
   - Let me know when you're ready!

**Remember:** We can pause at any time and resume later. Progress is saved after each phase.
