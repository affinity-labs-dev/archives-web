# Reading Card Platform-Specific Implementation Guide

This document provides step-by-step instructions for implementing the improved reading card with platform-specific gesture handling and styling fixes.

## Overview

The reading card implementation now uses:
- **iOS**: Native PanGestureHandler for smooth iOS gesture experience
- **Android**: Custom touch handlers with optimized velocity detection
- **Both**: Proper text styling and positioning fixes

## Required Imports

Add these imports to your lesson component:

```typescript
import {
  Platform,
  // ... other existing imports
} from "react-native";

import { 
  ScrollView as GestureHandlerScrollView,
  PanGestureHandler,
  State
} from "react-native-gesture-handler";
```

## State Management

Add these state variables and refs:

```typescript
const [touchStart, setTouchStart] = useState<{y: number, time: number} | null>(null);
const panGestureRef = useRef(null);
```

## Gesture Handler Functions

### 1. Custom Touch Handlers (Android)

```typescript
// Custom touch handlers for reliable Android swipe detection
const handleTouchStart = (event: any) => {
  setTouchStart({
    y: event.nativeEvent.pageY,
    time: Date.now()
  });
};

const handleTouchEnd = (event: any) => {
  if (!touchStart) return;
  
  const touchEnd = event.nativeEvent.pageY;
  const distance = touchStart.y - touchEnd; // Positive = swipe up
  const time = Date.now() - touchStart.time;
  
  // Optimized Android swipe detection for smoothness
  const minDistance = 40; // Increased for better gesture recognition
  const maxTime = 300; // Shorter time for more responsive gestures
  const velocity = Math.abs(distance) / time; // Calculate velocity
  const velocityThreshold = 0.5; // Minimum velocity threshold
  
  if (!isCardExpanded && distance > minDistance && time < maxTime && velocity > velocityThreshold) {
    console.log("📖 Android touch swipe up detected - expanding card", {
      distance,
      time,
      velocity: velocity.toFixed(2),
      platform: Platform.OS
    });
    expandCard();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } else if (isCardExpanded && distance < -minDistance && time < maxTime && velocity > velocityThreshold) {
    console.log("📖 Android touch swipe down detected - collapsing card", {
      distance,
      time,
      velocity: velocity.toFixed(2),
      platform: Platform.OS
    });
    collapseCard();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  
  // Reset touch start
  setTouchStart(null);
};
```

### 2. iOS PanGestureHandler

```typescript
// iOS PanGestureHandler for native iOS gesture experience
const handleSwipeGesture = (event: any) => {
  if (Platform.OS !== 'ios') return;
  
  if (event.nativeEvent.state === State.END) {
    const { translationY, velocityY } = event.nativeEvent;
    console.log("📱 iOS PanGesture detected", {
      translationY,
      velocityY,
      isCardExpanded,
      platform: Platform.OS
    });
    
    // iOS-optimized swipe detection
    const minDistance = 30;
    const minVelocity = 500;
    
    if (!isCardExpanded && 
        (translationY < -minDistance || velocityY < -minVelocity)) {
      console.log("📱 iOS PanGesture swipe up detected - expanding card", {
        translationY,
        velocityY,
        platform: Platform.OS
      });
      expandCard();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (isCardExpanded && 
               (translationY > minDistance || velocityY > minVelocity)) {
      console.log("📱 iOS PanGesture swipe down detected - collapsing card", {
        translationY,
        velocityY,
        platform: Platform.OS
      });
      collapseCard();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }
};
```

## Platform-Specific Component Structure

Replace your existing reading card wrapper with this platform-conditional structure:

### Main Card Wrapper

```typescript
{/* Reading Card at Bottom - Platform-Specific Gesture Handling */}
{Platform.OS === 'ios' ? (
  // iOS: Native PanGestureHandler
  <PanGestureHandler
    ref={panGestureRef}
    onGestureEvent={handleSwipeGesture}
    onHandlerStateChange={handleSwipeGesture}
    activeOffsetY={[-20, 20]}
    failOffsetX={[-30, 30]}
  >
    <Animated.View style={[
      styles.cardContainer,
      {
        transform: [{ translateY: cardTranslateY }]
      }
    ]}>
      {/* iOS Card Content - Use existing structure */}
      <Animated.View style={[
        styles.readingCard,
        {
          height: cardHeight,
        }
      ]}>
        {/* Top handle indicator */}
        <View style={styles.cardHandle} />

        {/* iOS Collapsed content - existing structure */}
        <Animated.View style={[
          styles.collapsedContent,
          { opacity: cardOpacity }
        ]}>
          <View style={styles.readingCardHeader}>
            <Text style={styles.cardTitle}>
              Your Title Here
            </Text>
            <Text style={styles.cardSubtitle}>
              Your subtitle here
            </Text>
          </View>
        </Animated.View>

        {/* Expanded content when card is swiped up */}
        {isCardExpanded && (
          <Animated.View style={[
            styles.expandedContent,
            { opacity: Animated.subtract(1, cardOpacity) }
          ]}>
            <GestureHandlerScrollView 
              ref={scrollViewGestureRef}
              style={styles.expandedScroll} 
              showsVerticalScrollIndicator={false}
              onScroll={handleReadingScroll}
              scrollEventThrottle={100}
              waitFor={Platform.OS === 'ios' ? panGestureRef : undefined}
            >
              {/* Your expanded content here */}
            </GestureHandlerScrollView>
          </Animated.View>
        )}
      </Animated.View>
    </Animated.View>
  </PanGestureHandler>
) : (
  // Android: Custom Touch Handlers
  <View 
    onTouchStart={handleTouchStart}
    onTouchEnd={handleTouchEnd}
  >
    <Animated.View style={[
      styles.cardContainer,
      {
        transform: [{ translateY: cardTranslateY }]
      }
    ]}>
      <Animated.View style={[
        styles.readingCard,
        {
          height: cardHeight,
        }
      ]}>
        {/* Top handle indicator */}
        <View style={styles.cardHandle} />

        {/* Android Collapsed content with improved styling */}
        <Animated.View style={[
          styles.collapsedContent,
          { opacity: cardOpacity }
        ]}>
          <View style={styles.collapsedContentWrapper}>
            <Text style={styles.collapsedTitle}>
              Your Title Here
            </Text>
            <Text style={styles.collapsedSubtitle}>
              Your subtitle here
            </Text>
          </View>
        </Animated.View>

        {/* Expanded content when card is swiped up */}
        {isCardExpanded && (
          <Animated.View style={[
            styles.expandedContent,
            { opacity: Animated.subtract(1, cardOpacity) }
          ]}>
            <GestureHandlerScrollView 
              ref={scrollViewGestureRef}
              style={styles.expandedScroll} 
              showsVerticalScrollIndicator={false}
              onScroll={handleReadingScroll}
              scrollEventThrottle={100}
            >
              {/* Your expanded content here */}
            </GestureHandlerScrollView>
          </Animated.View>
        )}
      </Animated.View>
    </Animated.View>
  </View>
)}
```

## Required Styles

Add these styles to your StyleSheet:

### Android-Specific Styles

```typescript
// Collapsed card text styles (for Android touch version)
collapsedContentWrapper: {
  flex: 1,
  justifyContent: 'center',
  paddingHorizontal: 20,
  paddingTop: 10,
  paddingBottom: 25,
  marginTop: -15, // Move text content up slightly
},
collapsedTitle: {
  fontFamily: "DM Sans",
  fontSize: 18,
  fontWeight: "600",
  color: "white",
  marginBottom: 8,
},
collapsedSubtitle: {
  fontFamily: "DM Sans",
  fontSize: 14,
  color: "white",
  opacity: 0.8,
  lineHeight: 20,
},
```

### iOS Styles (if not already present)

```typescript
readingCardHeader: {
  paddingHorizontal: 20,
  paddingVertical: 20,
},
cardTitle: {
  fontFamily: "DM Sans",
  fontSize: 18,
  fontWeight: "600",
  color: "white",
  marginBottom: 4,
},
cardSubtitle: {
  fontFamily: "DM Sans",
  fontSize: 14,
  color: "white",
  opacity: 0.7,
},
```

## Configuration Parameters

### Android Touch Detection
- **minDistance**: 40px (optimal balance between sensitivity and accidental triggers)
- **maxTime**: 300ms (quick responsive gestures)
- **velocityThreshold**: 0.5 (minimum velocity to distinguish intentional swipes)

### iOS PanGestureHandler
- **activeOffsetY**: [-20, 20] (vertical gesture activation range)
- **failOffsetX**: [-30, 30] (horizontal failure threshold)
- **minDistance**: 30px (iOS-optimized distance threshold)
- **minVelocity**: 500 (iOS-optimized velocity threshold)

## Text Positioning Fix

The key fix for Android text positioning:
- **marginTop**: -15px (moves content up in collapsed state)
- **paddingTop**: 10px (reduced from 20px)
- **paddingBottom**: 25px (increased for balance)

## Implementation Checklist

For each module you update:

- [ ] Add required imports (`Platform`, `PanGestureHandler`, `State`)
- [ ] Add state variables (`touchStart`, `panGestureRef`)
- [ ] Add both gesture handler functions (`handleTouchStart/End`, `handleSwipeGesture`)
- [ ] Replace card wrapper with platform-conditional structure
- [ ] Add Android-specific styles (`collapsedContentWrapper`, `collapsedTitle`, `collapsedSubtitle`)
- [ ] Update content structure for Android (add `collapsedContentWrapper`)
- [ ] Add `waitFor` prop to iOS `GestureHandlerScrollView`
- [ ] Test both platforms for gesture functionality and text visibility

## Debugging

Both platforms now include comprehensive console logging:
- **Android**: Shows distance, time, velocity, and platform
- **iOS**: Shows translationY, velocityY, card state, and platform

Look for these console messages:
- `📖 Android touch swipe up/down detected`
- `📱 iOS PanGesture swipe up/down detected`

## Notes

- iOS uses native gesture recognition for best iOS experience
- Android uses custom touch handling for reliability
- Both platforms share the same `expandCard()` and `collapseCard()` functions
- Text positioning is optimized separately for each platform
- Velocity-based detection prevents accidental gesture triggers on Android