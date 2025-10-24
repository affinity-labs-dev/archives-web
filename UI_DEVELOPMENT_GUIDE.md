# UI Development Guide - Safe vs. Critical Files

This guide categorizes all code files based on safety for UI modifications. Follow this to avoid breaking core functionality while developing the UI.

---

## ✅ SAFE TO MODIFY - Pure UI/Presentation

### Era 2 (Rise of Islam) Components - YOUR MAIN WORK AREA

```
components/ROI/
├── ROIAdventureCardComponent.tsx     ✅ Adventure card UI
├── ROIAdventureComponent.tsx         ✅ Adventure layout
├── ROIAdventureSummary.tsx          ✅ Stats display
├── ROIEraComponent.tsx              ✅ Era screen layout
├── ROIImageCarouselLesson.tsx       ✅ Image carousel lesson
├── ROIReelLesson.tsx                ✅ Vertical video lesson
├── ROIVideoCarouselLesson.tsx       ✅ Video carousel lesson
└── ROIQuiz.tsx                      ✅ Quiz UI component
```

**Use Cases:**
- Modify layout, colors, spacing, fonts
- Add new UI elements
- Update animations and transitions
- Change image/video sources
- Adjust card designs

---

### Era Screens - Safe UI Modifications

```
components/eras/
├── RiseOfIslamEra.tsx               ✅ Era 2 main screen
├── UmmayadDynastyEra.tsx            ✅ Era 1 main screen
└── ComingSoonView.tsx               ✅ Placeholder screen
```

**What You Can Change:**
- Adventure map layouts
- Video player styling
- Module icon positions
- Scroll behavior (UI only)
- Pull-to-refresh UI elements

---

### Main Tabs - UI Layer

```
app/(tabs)/
├── eras.tsx                         ✅ Era selection screen
├── roi-bento.tsx                    ✅ ROI bento layout
├── subscribe.tsx                    ✅ Subscription screen
└── profile.tsx                      ✅ Profile screen
```

**Safe Changes:**
- Era card designs
- Bento grid layout
- Profile stats display
- Subscription UI elements

---

### Adventure Components

```
components/adventures/
└── AdventureDetailModal.tsx         ✅ Adventure detail modal
```

---

### UI Components - Pure Presentation

```
components/
├── LoadingScreen.tsx                ✅ Branded loading spinner
├── AvatarUnlockAnimation.tsx        ✅ Avatar unlock animation
├── AvatarUnlockNotification.tsx     ✅ Notification UI
├── ConfettiEffect.tsx               ✅ Celebration effect
├── NameCollectionModal.tsx          ✅ Name input modal
└── SyncDebugPanel.tsx               ✅ Debug UI panel
```

---

### Icon Components - 100% Safe

```
components/icons/
├── Adventure1Icon.tsx through Adventure10Icon.tsx  ✅ Adventure icons
├── HomeIcon.tsx                                     ✅ Tab icons
├── ErasIcon.tsx
├── ProfileIcon.tsx
└── SubscribeIcon.tsx
```

**Fully Safe:**
- Modify SVG paths
- Change colors
- Update sizes
- Add new icons

---

## ⚠️ MODIFY WITH CAUTION - UI + Logic Mix

### Contains Business Logic - Change UI Styling Only

```
app/(tabs)/
├── index.tsx                        ⚠️ Home tab (era routing logic)
└── _layout.tsx                      ⚠️ Tab navigation config

app/
├── era-selection.tsx                ⚠️ Era selection (storage logic)
├── onboarding-question-1.tsx        ⚠️ Onboarding (progress tracking)
├── onboarding-question-2.tsx        ⚠️
├── onboarding-question-3.tsx        ⚠️
├── onboarding-question-4.tsx        ⚠️
├── onboarding-results.tsx           ⚠️
├── onboarding-video.tsx             ⚠️
├── onboarding-video-2.tsx           ⚠️
├── onboarding-welcome.tsx           ⚠️
└── landing.tsx                      ⚠️ Landing screen

components/modules/
├── LessonPlayer.tsx                 ⚠️ Video player (state management)
├── QuizSystem.tsx                   ⚠️ Quiz engine (reward logic)
├── ModuleModal.tsx                  ⚠️ Era 1 modal (lesson flow)
└── ROIModuleModal.tsx               ⚠️ Era 2 modal (lesson flow)

components/
├── SubscribeContent.native.tsx      ⚠️ Paywall (RevenueCat integration)
├── AppleSignInButton.tsx            ⚠️ Auth button (Clerk)
├── GoogleSignInButton.tsx           ⚠️ Auth button
└── AuthToggle.tsx                   ⚠️ Auth UI
```

### Rules for Caution Files:

**✅ SAFE to change:**
- StyleSheet definitions (colors, fonts, spacing)
- JSX layout structure (View, Text arrangement)
- Visual animations (Animated API usage)
- Image sources
- Text content
- Layout dimensions

**❌ DO NOT change:**
- `useState` logic and dependencies
- `useEffect` dependencies array
- Function signatures (params, return types)
- Callback function logic
- Progress tracking calls (`atomicProgressUpdate`, etc.)
- Navigation logic (`router.push`, `router.replace`)
- Storage operations (`AsyncStorage`, `setSelectedEra`)
- Analytics calls (`analyticsService.trackEvent`)

---

## ❌ DO NOT TOUCH - Critical Infrastructure

### Core Contexts - App State Management

```
context/
├── ProgressContext.tsx              ❌ CRITICAL - Progress tracking for both eras
├── RewardsContext.tsx               ❌ CRITICAL - Badges/avatars system
├── AdventuresContentProvider.tsx    ❌ CRITICAL - Era 2 content from Supabase
├── BackgroundSyncProvider.tsx       ❌ CRITICAL - Cloud sync with Supabase
├── PreferencesContext.tsx           ❌ CRITICAL - User settings
├── AvatarContext.tsx                ❌ Legacy context (don't remove)
└── BadgeContext.tsx                 ❌ Legacy context (don't remove)
```

**Why Critical:**
- These manage all app state
- Used across entire app
- Breaking these breaks everything
- Complex interdependencies

---

### Services - Backend Logic

```
services/
├── ProgressService.ts               ❌ AsyncStorage operations
├── SimplifiedSyncService.ts         ❌ Supabase sync engine
├── AdventuresContentService.ts      ❌ Era 2 content fetching/caching
├── BackgroundSyncService.ts         ❌ Cloud sync logic
├── AnalyticsService.ts              ❌ PostHog tracking wrapper
└── NotificationTokenSync.ts         ❌ Push notification tokens
```

**Why Critical:**
- Direct database operations
- Cloud sync logic
- Data persistence
- Real-time subscriptions

---

### Hooks - Custom Logic

```
hooks/
├── useRevenueCat.ts                 ❌ Subscription logic (RevenueCat)
├── useSyncIntegration.ts            ❌ Cloud sync integration
├── useNotifications.ts              ❌ Push notification setup
├── useROIAdventures.ts              ❌ Era 2 data fetching
├── useAppTrackingTransparency.ts    ❌ iOS ATT permission
├── useAnalytics.ts                  ❌ Analytics tracking
├── useLessonTracking.ts             ❌ Lesson progress tracking
├── useQuizTracking.ts               ❌ Quiz progress tracking
├── useBackgroundMusic.tsx           ❌ Audio playback
├── useQuizSounds.ts                 ❌ Quiz sound effects
└── lib/supabase.ts                  ❌ Supabase client instance
```

**Why Critical:**
- Custom business logic
- Third-party integrations
- Stateful operations

---

### App Root - Provider Hierarchy

```
app/
├── _layout.tsx                      ❌ CRITICAL - Provider hierarchy
└── index.tsx                        ❌ CRITICAL - App entry routing
```

**Why Critical:**
- Defines provider order (changes break app)
- Controls font loading
- Manages splash screen
- PostHog/Clerk/Progress initialization

---

### Type Definitions

```
types/
├── progress.ts                      ❌ Progress type definitions
└── components/ROI/types.ts          ⚠️ Safe to extend, don't remove existing
```

**Rules:**
- ✅ Add new interfaces/types
- ❌ Don't modify existing types (breaks everything)
- ❌ Don't remove properties

---

### Theme Constants

```
constants/
├── ArchivesTheme.ts                 ⚠️ Theme system (extend only, don't remove)
├── AdventureData.ts                 ❌ Era 1 adventure definitions
└── Colors.ts                        ⚠️ Legacy (deprecated, use ArchivesTheme)
```

**ArchivesTheme.ts Rules:**
- ✅ Add new color constants
- ✅ Add new component styles
- ❌ Don't remove existing constants (used everywhere)
- ❌ Don't change existing color values without testing

---

## 🎨 RECOMMENDED UI WORKFLOW

### For Era 2 UI Development:

#### 1. Start Here (100% Safe)
```
components/ROI/*.tsx              - All ROI components
components/eras/RiseOfIslamEra.tsx - Main era screen
app/(tabs)/roi-bento.tsx          - Bento layout
```

#### 2. Add Styles (Safe)
```typescript
const styles = StyleSheet.create({
  myNewStyle: {
    backgroundColor: ArchivesTheme.colors.creamWhite,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
  }
})
```

Always use `ArchivesTheme.colors.*` constants!

#### 3. Modify Existing UI (Safe)
- ✅ Change layout (View, ScrollView structure)
- ✅ Update text styling (Text components)
- ✅ Adjust spacing (margin, padding)
- ✅ Replace images (Image source)
- ✅ Update animations (Animated values)
- ✅ Add haptic feedback
- ✅ Modify colors (use ArchivesTheme)

#### 4. When Touching "Caution" Files

**DO:**
- Change JSX structure (layout)
- Update styles
- Modify visual elements
- Add new UI components

**DON'T:**
- Change useState logic
- Modify useEffect dependencies
- Alter function signatures
- Remove existing props
- Change callback functions
- Touch AsyncStorage calls
- Modify router.push/replace logic

---

## 🚫 NEVER MODIFY THESE PATTERNS

### In ANY File, Don't Touch:

```typescript
// ❌ Provider hierarchy
<ProgressProvider>
  <RewardsProvider>
    <AdventuresContentProvider>

// ❌ Progress updates
atomicProgressUpdate(adventureId, moduleId, update)
getRoiModuleProgress(moduleId)
isRoiModuleUnlocked(moduleId)

// ❌ Supabase queries
supabase.from('adventures').select(...)
adventuresContentService.loadAdventures(eraId)

// ❌ AsyncStorage operations
AsyncStorage.setItem('key', value)
AsyncStorage.getItem('key')
await setSelectedEra(eraId)

// ❌ Cloud sync triggers
manualSync()
backgroundSync()
startRealtimeSync()

// ❌ Analytics tracking
analyticsService.trackEvent(...)
analyticsService.startPageView(...)

// ❌ Navigation logic
router.push('/(tabs)/')
router.replace('/era-selection')

// ❌ RevenueCat/Clerk
Purchases.configure(...)
useAuth() hook logic
```

---

## ✅ SAFE PATTERNS TO USE FREELY

### Always Safe to Add/Modify:

```typescript
// ✅ New styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    ...ArchivesTheme.components.card.shadow,
  }
})

// ✅ New UI components
const MyNewUIComponent = ({ title }: { title: string }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  )
}

// ✅ UI-only state (not business logic)
const [isMenuOpen, setIsMenuOpen] = useState(false)
const [selectedTab, setSelectedTab] = useState(0)
const [isExpanded, setIsExpanded] = useState(false)

// ✅ Animations
const fadeAnim = useRef(new Animated.Value(0)).current
const slideAnim = useRef(new Animated.Value(-100)).current

Animated.timing(fadeAnim, {
  toValue: 1,
  duration: 300,
  useNativeDriver: true,
}).start()

// ✅ Haptics
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
Haptics.selectionAsync()

// ✅ Image sources
<Image
  source={require('@/assets/images/myimage.png')}
  style={styles.image}
/>

// ✅ Conditional rendering
{isVisible && (
  <View style={styles.modal}>
    <Text>Modal Content</Text>
  </View>
)}

// ✅ List rendering
{items.map((item, index) => (
  <MyCard key={item.id} title={item.title} />
))}
```

---

## 📋 QUICK REFERENCE TABLE

| Task | Safe Files | Critical Files (Don't Touch) |
|------|------------|------------------------------|
| **Era 2 UI** | `components/ROI/*` | `context/*`, `services/*` |
| **Screens** | `app/(tabs)/eras.tsx`, `roi-bento.tsx` | `app/_layout.tsx`, `app/index.tsx` |
| **Icons** | `components/icons/*` | N/A |
| **Styling** | Any `.tsx` StyleSheet | `ArchivesTheme.ts` (extend only) |
| **Animations** | Component-level Animated code | Context/Service animations |
| **New Components** | Create in `components/` or `components/ROI/` | Don't modify contexts |
| **Images/Assets** | Replace in `assets/` folder | Don't break existing references |
| **Colors** | Use `ArchivesTheme.colors.*` | Don't hardcode colors |

---

## 🎯 COMMON UI TASKS - WHERE TO WORK

### Task: Update Era 2 Adventure Card Design
**Files to modify:**
- ✅ `components/ROI/ROIAdventureCardComponent.tsx` - Main card UI
- ✅ `components/ROI/ROIEraComponent.tsx` - Card container
- ✅ Add new images to `assets/images/`

**Don't touch:**
- ❌ `hooks/useROIAdventures.ts` - Data fetching
- ❌ `context/AdventuresContentProvider.tsx` - Data management

---

### Task: Redesign ROI Bento Screen
**Files to modify:**
- ✅ `app/(tabs)/roi-bento.tsx` - Main bento layout
- ✅ Create new components in `components/ROI/`
- ✅ Update styles using ArchivesTheme

**Don't touch:**
- ❌ `app/(tabs)/index.tsx` - Routing logic
- ❌ `context/ProgressContext.tsx` - Progress state

---

### Task: Add New Lesson Type UI
**Files to modify:**
- ✅ Create `components/ROI/ROINewLessonType.tsx`
- ✅ Add to `components/ROI/types.ts` (extend only)
- ✅ Use in `components/ROI/ROIEraComponent.tsx`

**Don't touch:**
- ❌ `services/AdventuresContentService.ts` - Data fetching
- ❌ `context/AdventuresContentProvider.tsx` - Content provider

---

### Task: Update Quiz UI
**Files to modify:**
- ✅ `components/ROI/ROIQuiz.tsx` - Quiz UI component
- ⚠️ `components/modules/QuizSystem.tsx` - UI only, not logic

**Don't touch:**
- ❌ `context/ProgressContext.tsx` - Quiz scoring
- ❌ `hooks/useQuizTracking.ts` - Analytics

---

### Task: Change Theme Colors
**Files to modify:**
- ⚠️ `constants/ArchivesTheme.ts` - Add new colors only
- ✅ Update component styles to use new colors

**Don't touch:**
- ❌ Don't remove existing color constants
- ❌ Don't change brand colors without approval

---

## 🔧 DEBUGGING UI ISSUES

### Safe Debugging Approaches:

1. **Add console.logs** (remove before commit):
   ```typescript
   console.log('🎨 Current tab:', selectedTab)
   console.log('📐 Layout dimensions:', width, height)
   ```

2. **Use SyncDebugPanel**:
   - Already built and safe to use
   - Shows progress, sync status
   - Location: `components/SyncDebugPanel.tsx`

3. **Test on both iOS/Android**:
   - Platform-specific styling is okay
   - Use `Platform.OS === 'ios'` checks

4. **Check ArchivesTheme**:
   - Verify you're using theme constants
   - Don't hardcode colors

---

## ⚠️ WARNING SIGNS - STOP IF YOU SEE:

If you're about to modify code that includes these patterns, **STOP** and ask first:

```typescript
// 🛑 STOP - This is critical logic
await AsyncStorage.setItem(...)
await atomicProgressUpdate(...)
supabase.from('table').insert(...)
Purchases.configure(...)
useAuth().signIn(...)
router.replace(...)

// 🛑 STOP - Provider modifications
<ProgressProvider>
<RewardsProvider>

// 🛑 STOP - Context value modifications
export const ProgressContext = createContext(...)

// 🛑 STOP - Service modifications
class AdventuresContentService {
  async loadAdventures(...) {
    // Complex logic
  }
}
```

---

## ✅ CHECKLIST Before Committing UI Changes

- [ ] Only modified files in "Safe to Modify" category
- [ ] Used `ArchivesTheme.colors.*` (no hardcoded colors)
- [ ] Tested on iOS simulator
- [ ] No changes to context/services/hooks
- [ ] No AsyncStorage modifications
- [ ] No navigation logic changes
- [ ] Removed debug console.logs
- [ ] Followed existing component patterns
- [ ] Run `npm run lint` to check for errors

---

## 🆘 WHEN IN DOUBT

**Golden Rule:** If you're unsure whether a file is safe to modify, assume it's CRITICAL and ask first.

**Safe default approach:**
1. Create a NEW component in `components/ROI/`
2. Use ArchivesTheme constants
3. Don't modify existing contexts/services
4. Test thoroughly before committing

---

This guide ensures you can work freely on UI while protecting core app functionality!
