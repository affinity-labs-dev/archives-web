# Walkthrough Implementation Guide
**Feature:** First-time user guided walkthroughs for Rise of Islam (ROI) lesson types

## Overview

### Strategy
- ✅ **Rise of Islam (Era 2):** Add walkthrough checks to 3 lesson components
- ✅ **Umayyad Dynasty (Era 1):** Leave completely untouched (static, no changes)
- ✅ **Benefits:** Minimal code changes, no risk to Era 1, modern UX for new era

### User Experience Flow
1. User opens a ROI lesson for the first time (reel, video carousel, or image carousel)
2. Walkthrough overlay appears with PNG arrows/indicators
3. User taps "Got it" or dismisses walkthrough
4. Flag is set in AsyncStorage
5. Next time user opens the same lesson type → No walkthrough (already seen)
6. Flags are universal across both eras

---

## AsyncStorage Flags

### Flag Structure
```typescript
{
  "hasSeenReelWalkthrough": "false" | "true",
  "hasSeenVideoCarouselWalkthrough": "false" | "true",
  "hasSeenImageCarouselWalkthrough": "false" | "true"
}
```

### Flag Keys (Constants)
Create these constants for consistency:
```typescript
// Add to a new file: constants/WalkthroughKeys.ts
export const WALKTHROUGH_KEYS = {
  REEL: 'hasSeenReelWalkthrough',
  VIDEO_CAROUSEL: 'hasSeenVideoCarouselWalkthrough',
  IMAGE_CAROUSEL: 'hasSeenImageCarouselWalkthrough',
} as const;
```

---

## Implementation Steps

### 1. ROIReelLesson.tsx

**File:** `components/ROI/ROIReelLesson.tsx`

**Add state:**
```typescript
const [showWalkthrough, setShowWalkthrough] = useState(false);
```

**Add useEffect for check:**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WALKTHROUGH_KEYS } from '@/constants/WalkthroughKeys';

useEffect(() => {
  const checkWalkthrough = async () => {
    try {
      const hasSeenReel = await AsyncStorage.getItem(WALKTHROUGH_KEYS.REEL);

      if (hasSeenReel !== 'true') {
        // First time seeing reel - show walkthrough after short delay
        setTimeout(() => {
          setShowWalkthrough(true);
        }, 500); // 500ms delay for smooth appearance
      }
    } catch (error) {
      console.error('❌ Error checking reel walkthrough:', error);
    }
  };

  checkWalkthrough();
}, []); // Empty array = runs once on mount
```

**Add dismiss handler:**
```typescript
const handleDismissWalkthrough = async () => {
  try {
    await AsyncStorage.setItem(WALKTHROUGH_KEYS.REEL, 'true');
    setShowWalkthrough(false);
    console.log('✅ Reel walkthrough dismissed');
  } catch (error) {
    console.error('❌ Error saving reel walkthrough:', error);
    setShowWalkthrough(false); // Dismiss anyway
  }
};
```

**Add walkthrough overlay to JSX:**
```typescript
{/* Existing lesson content */}

{/* Walkthrough overlay - render at end for z-index on top */}
{showWalkthrough && (
  <View style={styles.walkthroughOverlay}>
    {/* Your PNG arrows/indicators here */}
    <Image
      source={require('@/assets/walkthroughs/reel-walkthrough.png')}
      style={styles.walkthroughImage}
      resizeMode="contain"
    />

    {/* Dismiss button */}
    <TouchableOpacity
      style={styles.walkthroughDismissButton}
      onPress={handleDismissWalkthrough}
      activeOpacity={0.8}
    >
      <Text style={styles.walkthroughDismissText}>Got it!</Text>
    </TouchableOpacity>
  </View>
)}
```

**Add styles:**
```typescript
walkthroughOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.85)', // Dark overlay
  zIndex: 1000, // On top of everything
  justifyContent: 'center',
  alignItems: 'center',
},
walkthroughImage: {
  width: '90%',
  height: '70%',
},
walkthroughDismissButton: {
  position: 'absolute',
  bottom: 50,
  backgroundColor: ArchivesTheme.colors.persianOrange,
  paddingHorizontal: 40,
  paddingVertical: 16,
  borderRadius: 30,
},
walkthroughDismissText: {
  color: 'white',
  fontSize: 18,
  fontWeight: 'bold',
  fontFamily: 'DM Sans',
},
```

---

### 2. ROIVideoCarouselLesson.tsx

**File:** `components/ROI/ROIVideoCarouselLesson.tsx`

**Implementation:** Same pattern as ROIReelLesson, but use:
- Flag: `WALKTHROUGH_KEYS.VIDEO_CAROUSEL`
- Image: `@/assets/walkthroughs/video-carousel-walkthrough.png`

**Key differences:**
```typescript
useEffect(() => {
  const checkWalkthrough = async () => {
    try {
      const hasSeenVideoCarousel = await AsyncStorage.getItem(WALKTHROUGH_KEYS.VIDEO_CAROUSEL);

      if (hasSeenVideoCarousel !== 'true') {
        setTimeout(() => {
          setShowWalkthrough(true);
        }, 500);
      }
    } catch (error) {
      console.error('❌ Error checking video carousel walkthrough:', error);
    }
  };

  checkWalkthrough();
}, []);

const handleDismissWalkthrough = async () => {
  try {
    await AsyncStorage.setItem(WALKTHROUGH_KEYS.VIDEO_CAROUSEL, 'true');
    setShowWalkthrough(false);
    console.log('✅ Video carousel walkthrough dismissed');
  } catch (error) {
    console.error('❌ Error saving video carousel walkthrough:', error);
    setShowWalkthrough(false);
  }
};
```

---

### 3. ROIImageCarouselLesson.tsx

**File:** `components/ROI/ROIImageCarouselLesson.tsx`

**Implementation:** Same pattern as above, but use:
- Flag: `WALKTHROUGH_KEYS.IMAGE_CAROUSEL`
- Image: `@/assets/walkthroughs/image-carousel-walkthrough.png`

**Key differences:**
```typescript
useEffect(() => {
  const checkWalkthrough = async () => {
    try {
      const hasSeenImageCarousel = await AsyncStorage.getItem(WALKTHROUGH_KEYS.IMAGE_CAROUSEL);

      if (hasSeenImageCarousel !== 'true') {
        setTimeout(() => {
          setShowWalkthrough(true);
        }, 500);
      }
    } catch (error) {
      console.error('❌ Error checking image carousel walkthrough:', error);
    }
  };

  checkWalkthrough();
}, []);

const handleDismissWalkthrough = async () => {
  try {
    await AsyncStorage.setItem(WALKTHROUGH_KEYS.IMAGE_CAROUSEL, 'true');
    setShowWalkthrough(false);
    console.log('✅ Image carousel walkthrough dismissed');
  } catch (error) {
    console.error('❌ Error saving image carousel walkthrough:', error);
    setShowWalkthrough(false);
  }
};
```

---

## Walkthrough Assets

### Required PNG Files
Place in `/assets/walkthroughs/` directory:
1. `reel-walkthrough.png` - Shows arrows/indicators for reel interactions (swipe up, tap to pause, etc.)
2. `video-carousel-walkthrough.png` - Shows swipe left/right, video controls
3. `image-carousel-walkthrough.png` - Shows swipe gestures, caption reading

### Design Guidelines
- **Background:** Semi-transparent overlay (handled by CSS)
- **Arrows/Indicators:** Bright color (white, orange) for visibility
- **Text:** Minimal, clear instructions
- **Size:** 1080x1920 (mobile portrait) or scalable SVG

---

## Testing Checklist

### Functional Tests
- [ ] **First launch:** Reel walkthrough appears when opening first ROI reel
- [ ] **Dismiss:** Tapping "Got it" closes walkthrough and sets flag
- [ ] **Second launch:** Reel walkthrough does NOT appear after dismissal
- [ ] **Video carousel:** Walkthrough appears first time, not second time
- [ ] **Image carousel:** Walkthrough appears first time, not second time
- [ ] **Cross-era:** Flags work universally (ROI → Umayyad, Umayyad → ROI)

### Edge Cases
- [ ] **Network offline:** Walkthrough still works (AsyncStorage only)
- [ ] **App restart:** Flags persist after closing/reopening app
- [ ] **AsyncStorage error:** Walkthrough dismisses gracefully even if save fails
- [ ] **Quick dismiss:** Rapid tapping doesn't cause crashes

### UI/UX Tests
- [ ] **Z-index:** Walkthrough appears on top of all lesson content
- [ ] **Animation:** Smooth fade-in (500ms delay prevents jarring appearance)
- [ ] **Button accessibility:** "Got it" button is easy to tap
- [ ] **Dark overlay:** Background is dimmed but content is visible

---

## Debugging

### Check AsyncStorage Flags
```typescript
// Add temporary debug function
const debugWalkthroughs = async () => {
  const reel = await AsyncStorage.getItem('hasSeenReelWalkthrough');
  const video = await AsyncStorage.getItem('hasSeenVideoCarouselWalkthrough');
  const image = await AsyncStorage.getItem('hasSeenImageCarouselWalkthrough');

  console.log('🔍 Walkthrough flags:', { reel, video, image });
};
```

### Clear Flags for Testing
```typescript
// Reset all walkthroughs (for testing)
await AsyncStorage.removeItem('hasSeenReelWalkthrough');
await AsyncStorage.removeItem('hasSeenVideoCarouselWalkthrough');
await AsyncStorage.removeItem('hasSeenImageCarouselWalkthrough');
console.log('🔄 Walkthrough flags cleared');
```

### Console Logging
Use emoji prefixes for easy filtering:
- `✅ Reel walkthrough dismissed`
- `❌ Error checking reel walkthrough`
- `🔍 Walkthrough flags: { ... }`

---

## Future Enhancements

### Optional Features (Later)
1. **Settings toggle:** Add "Reset Walkthroughs" button in settings
2. **Analytics:** Track walkthrough completion rates via PostHog
3. **Skip all:** Add "Don't show tips again" checkbox
4. **Interactive:** Make walkthrough elements tappable (guided tour style)
5. **Animated arrows:** Use Rive or Lottie for animated indicators

### Supabase Sync (Optional)
If you want walkthroughs to sync across devices:
```typescript
// After setting AsyncStorage flag, also save to Supabase
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  await supabase
    .from('user_preferences')
    .upsert({
      user_id: user.id,
      walkthrough_flags: {
        reel: true,
        videoCarousel: true,
        imageCarousel: true,
      }
    });
}
```

---

## Implementation Timeline

### Day 1: Setup
- [ ] Create `constants/WalkthroughKeys.ts`
- [ ] Add walkthrough PNG assets to `/assets/walkthroughs/`
- [ ] Test PNG rendering in a simple View

### Day 2: ROIReelLesson
- [ ] Add state and useEffect
- [ ] Add dismiss handler
- [ ] Add overlay JSX
- [ ] Add styles
- [ ] Test thoroughly

### Day 3: ROIVideoCarouselLesson
- [ ] Copy pattern from ROIReelLesson
- [ ] Update flag key and asset
- [ ] Test thoroughly

### Day 4: ROIImageCarouselLesson
- [ ] Copy pattern from ROIReelLesson
- [ ] Update flag key and asset
- [ ] Test thoroughly

### Day 5: Final Testing
- [ ] Cross-era testing
- [ ] Edge case testing
- [ ] Performance testing
- [ ] Commit to git

---

## Code Summary

### Files to Create
1. `constants/WalkthroughKeys.ts` - Flag constants
2. `assets/walkthroughs/reel-walkthrough.png` - Reel asset
3. `assets/walkthroughs/video-carousel-walkthrough.png` - Video carousel asset
4. `assets/walkthroughs/image-carousel-walkthrough.png` - Image carousel asset

### Files to Modify
1. `components/ROI/ROIReelLesson.tsx` - Add walkthrough check
2. `components/ROI/ROIVideoCarouselLesson.tsx` - Add walkthrough check
3. `components/ROI/ROIImageCarouselLesson.tsx` - Add walkthrough check

### Files NOT to Touch
- All Umayyad Dynasty lesson files (static)
- `components/modules/LessonPlayer.tsx`
- Any Adventure1-5 lesson files

---

## Questions & Support

If you encounter issues:
1. Check console logs for emoji-prefixed messages
2. Use debug function to inspect AsyncStorage flags
3. Clear flags to reset for testing
4. Verify PNG assets are in correct directory
5. Check z-index layering if overlay doesn't appear on top

**Remember:** Keep Umayyad Dynasty completely untouched - only modify the 3 ROI lesson components!
