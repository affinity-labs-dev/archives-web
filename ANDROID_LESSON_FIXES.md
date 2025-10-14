# Android Video + Reading Lesson Fix Instructions

**For: Claude Code**
**Purpose:** Apply two critical Android fixes to all Video + Reading lesson components

---

## Overview

Two Android-specific bugs were discovered and fixed in `Adventure1_Module1_Lesson1.tsx`:

1. **Bug #1**: Collapsed card text not visible on Android
2. **Bug #2**: Tap-to-expand not working on Android

These fixes need to be applied to all Video + Reading lesson files that use the same collapsed card pattern.

---

## How to Identify Files That Need These Fixes

**Files to fix:** All Video + Reading lesson components with these characteristics:
- Have Android-specific collapsed card implementation
- Use `Platform.OS` conditional rendering for iOS vs Android
- Have `collapsedContentWrapper` style
- Have touch handlers on Android (`onTouchStart`, `onTouchEnd`)

**Example file pattern:**
- `components/modules/adventure*/Adventure*_Module*_Lesson*.tsx`
- Only files with Video + Reading lesson type (not Image Carousel, Video Carousel, etc.)

---

## Fix #1: Collapsed Card Text Visibility

### Problem
The `collapsedContentWrapper` style uses `flex: 1` with `justifyContent: "center"`, which vertically centers the text. Combined with the card positioned 40px below the screen (`bottom: -40`), this causes text to be pushed into the hidden area.

### How to Identify This Issue

Look for a style definition like this:

```typescript
collapsedContentWrapper: {
  flex: 1,                    // ❌ Problem indicator
  justifyContent: "center",   // ❌ Problem indicator
  paddingHorizontal: 20,
  paddingTop: 10,
  paddingBottom: 25,
  marginTop: -15,            // ❌ Problem indicator
}
```

### Fix Instructions

**FIND** the `collapsedContentWrapper` style definition (usually near the end of the file in the StyleSheet).

**REPLACE** with simple top-aligned padding:

```typescript
collapsedContentWrapper: {
  padding: 20,
  paddingTop: 16,
  paddingBottom: 30,
}
```

**Key changes:**
- Remove `flex: 1`
- Remove `justifyContent: "center"`
- Remove `marginTop: -15`
- Simplify to padding-based layout

---

## Fix #2: Enable Tap-to-Expand on Android

### Problem
Android implementation has two competing touch handlers:
1. Outer `<View>` with `onTouchStart` and `onTouchEnd`
2. Inner `<TouchableOpacity>` with `onPress`

The outer View consumes all touch events, blocking the TouchableOpacity from receiving taps.

### How to Identify This Issue

Look for Android rendering code that looks like this:

```typescript
) : (
  // Android: Custom Touch Handlers
  <View onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
    <Animated.View style={[styles.cardContainer, ...]}>
      {/* ... */}
      <TouchableOpacity onPress={expandCard}>
        {/* Card content */}
      </TouchableOpacity>
    </Animated.View>
  </View>
)
```

### Fix Instructions - Part A: Remove Wrapper View

**FIND** the Android section that starts with:
```typescript
) : (
  // Android: Custom Touch Handlers
  <View onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
```

**REPLACE** the wrapper `<View>` with direct `<Animated.View>`:

**BEFORE:**
```typescript
) : (
  // Android: Custom Touch Handlers
  <View onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
    <Animated.View
      style={[
        styles.cardContainer,
        {
          transform: [{ translateY: cardTranslateY }],
        },
      ]}
    >
```

**AFTER:**
```typescript
) : (
  // Android: TouchableOpacity for tap-to-expand
  <Animated.View
    style={[
      styles.cardContainer,
      {
        transform: [{ translateY: cardTranslateY }],
      },
    ]}
  >
```

**IMPORTANT:** Also remove the closing `</View>` tag at the end of the Android section (before the final `)`).

### Fix Instructions - Part B: Remove Touch Handler State

**FIND** this state declaration (usually near the top of the component):

```typescript
const [touchStart, setTouchStart] = useState<{
  y: number;
  time: number;
} | null>(null);
```

**DELETE** these 4 lines entirely.

### Fix Instructions - Part C: Remove Touch Handler Functions

**FIND** these two function definitions:

```typescript
// Custom touch handlers for reliable Android swipe detection
const handleTouchStart = (event: any) => {
  setTouchStart({
    y: event.nativeEvent.pageY,
    time: Date.now(),
  });
};

const handleTouchEnd = (event: any) => {
  if (!touchStart) return;

  const touchEnd = event.nativeEvent.pageY;
  const distance = touchStart.y - touchEnd;
  const time = Date.now() - touchStart.time;

  // ... swipe detection logic ...

  setTouchStart(null);
};
```

**DELETE** both complete function definitions (approximately 45 lines).

---

## Verification Checklist

After applying fixes to a file, verify:

### Code Changes:
- [ ] `collapsedContentWrapper` style uses simple `padding` (no `flex`, `justifyContent`, or `marginTop`)
- [ ] Android section has NO wrapper `<View>` with touch handlers
- [ ] Android section starts directly with `<Animated.View style={[styles.cardContainer`
- [ ] `touchStart` state declaration is removed
- [ ] `handleTouchStart` function is removed
- [ ] `handleTouchEnd` function is removed

### Test on Android Device/Emulator:
- [ ] Collapsed card text (title + subtitle) is fully visible
- [ ] Tapping collapsed card expands it successfully
- [ ] Tapping expanded content collapses the card

### Test on iOS Device/Simulator (Regression Check):
- [ ] No changes to iOS behavior
- [ ] Tap and swipe both still work on iOS

---

## Example: Complete Before/After

### BEFORE (Broken on Android):

**State:**
```typescript
const [scrollY, setScrollY] = useState(0);
const [touchStart, setTouchStart] = useState<{
  y: number;
  time: number;
} | null>(null);
const scrollViewRef = useRef<ScrollView>(null);
```

**Functions:**
```typescript
const handleTouchStart = (event: any) => {
  setTouchStart({
    y: event.nativeEvent.pageY,
    time: Date.now(),
  });
};

const handleTouchEnd = (event: any) => {
  if (!touchStart) return;
  // ... 40+ lines of swipe detection logic ...
};
```

**JSX:**
```typescript
) : (
  // Android: Custom Touch Handlers
  <View onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
    <Animated.View style={[styles.cardContainer, ...]}>
      {/* Card content */}
    </Animated.View>
  </View>
)
```

**Style:**
```typescript
collapsedContentWrapper: {
  flex: 1,
  justifyContent: "center",
  paddingHorizontal: 20,
  paddingTop: 10,
  paddingBottom: 25,
  marginTop: -15,
}
```

### AFTER (Fixed):

**State:**
```typescript
const [scrollY, setScrollY] = useState(0);
const scrollViewRef = useRef<ScrollView>(null);
```

**Functions:**
```typescript
// handleTouchStart and handleTouchEnd removed
```

**JSX:**
```typescript
) : (
  // Android: TouchableOpacity for tap-to-expand
  <Animated.View style={[styles.cardContainer, ...]}>
    {/* Card content */}
  </Animated.View>
)
```

**Style:**
```typescript
collapsedContentWrapper: {
  padding: 20,
  paddingTop: 16,
  paddingBottom: 30,
}
```

---

## Files Already Fixed

- ✅ `components/modules/adventure1/Adventure1_Module1_Lesson1.tsx`

---

## Notes

- These fixes simplify the Android implementation by removing swipe gesture support
- Android now uses tap-only interaction (simpler and more reliable)
- iOS retains both tap and swipe via PanGestureHandler
- Total code reduction: ~50 lines per file
- Improves maintainability and reliability

---

## Questions or Issues?

If you encounter a file with a different structure or additional complexity, ask the user for clarification before proceeding. Not all lesson files may follow the exact same pattern.
