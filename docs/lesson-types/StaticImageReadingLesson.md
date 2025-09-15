# Static Image + Reading Lesson Implementation Guide

## 📖 Overview
The Static Image + Reading lesson type provides an immersive full-screen image display with an expandable reading card, perfect for maps, diagrams, monuments, and other content requiring detailed visual examination and educational context. This implementation features sophisticated cross-platform gesture handling with pixel-perfect SwiftUI conversion patterns.

## 🎯 Best Implementation Reference
**File**: `Adventure1_Module3_Lesson1.tsx`
**Why it's the best**:
- ✅ Full-screen immersive image display with perfect coverage
- ✅ Sophisticated dual platform implementation (iOS PanGestureHandler + Android TouchEvents)
- ✅ Professional floating UI elements with proper z-index management
- ✅ Advanced expandable reading card with comprehensive educational content
- ✅ Perfect gesture coordination preventing conflicts between scroll and swipe
- ✅ Complete AWS CloudFront integration with optimized image loading
- ✅ Comprehensive educational content structure with Key Terms component
- ✅ Pixel-perfect text overlay with professional shadow system
- ✅ Cross-platform StatusBar and SafeAreaView handling

## ✨ Key Features
- ✅ **Full-Screen Image Display** - Complete immersive visual experience
- ✅ **Advanced Gesture Coordination** - Sophisticated iOS/Android platform handling
- ✅ **Professional Text Overlay** - Perfect positioning with shadow systems
- ✅ **Expandable Reading Card** - Smooth spring animations with educational content
- ✅ **Floating Navigation** - Professional back/continue buttons with proper positioning
- ✅ **Educational Framework** - Structured content with Key Terms and Historical Context
- ✅ **AWS CloudFront Integration** - Optimized image delivery and loading
- ✅ **Cross-Platform Optimization** - Platform-specific implementations for best UX

## 🛠️ Technical Implementation

### Core Dependencies
```typescript
// EXACT dependencies from Adventure1_Module3_Lesson1.tsx
import ArchivesTheme from "@/constants/ArchivesTheme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { PanGestureHandler, State, ScrollView as GestureHandlerScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
```

### Component Interface
```typescript
interface StaticImageReadingLessonProps {
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void; // Optional back handler
}
```

### Layout Constants - EXACT SwiftUI Measurements
```typescript
// EXACT measurements from Adventure1_Module3_Lesson1.tsx
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const LAYOUT_CONSTANTS = {
  // Card animation constants
  COLLAPSED_HEIGHT: 140,                    // Card collapsed height
  EXPANDED_HEIGHT: SCREEN_HEIGHT * 0.85,    // 85% screen coverage when expanded

  // Text overlay positioning
  textOverlayTop: 100,                      // 100px from top for SafeArea accommodation
  textOverlayHorizontalPadding: 40,         // 40px horizontal padding for text

  // Floating button positioning
  buttonContainerPadding: { top: 8, horizontal: 16 }, // Consistent button positioning
  buttonSize: 40,                           // 40x40 touch target
  buttonRadius: 20,                         // Perfect circle

  // Card handle and header
  cardHandleWidth: 70,                      // 70px handle width
  cardHandleHeight: 5,                      // 5px handle height
  cardHandleTopMargin: 12,                  // 12px from top

  // Content spacing
  readingCardHeaderPadding: { horizontal: 20, top: 16, bottom: 30 },
  expandedContentPadding: 20,               // 20px padding for expanded content
  titleSectionBottomMargin: 24,             // 24px spacing after title section
  historicalSectionBottomMargin: 20,        // 20px spacing after historical section
  keyTermsBottomMargin: 20,                 // 20px spacing after key terms

  // Key terms styling
  keyTermsContainerPadding: 12,             // 12px padding inside key terms container
  keyTermRowBottomMargin: 8,                // 8px spacing between key term rows

  // Android-specific adjustments
  androidCollapsedContentMarginTop: -15,    // Move text content up slightly on Android
  androidCollapsedPadding: { horizontal: 20, top: 10, bottom: 25 },

  // Animation timing
  springAnimationTension: 100,              // Spring animation tension
  springAnimationFriction: 8,               // Spring animation friction
  fadeAnimationDuration: 300,               // Fade animation duration
};
```

## 🖼️ Image Content Structure - AWS CloudFront Integration

### Static Image Setup
```typescript
// EXACT AWS CloudFront URL from Adventure1_Module3_Lesson1.tsx
const mainImageSource = {
  uri: "https://dzyjrzj2lngmg.cloudfront.net/Images/Interactive+map.jpg"
};

// AWS CloudFront URL Pattern for Static Images:
// https://dzyjrzj2lngmg.cloudfront.net/Images/{ImageName}.jpg
// Examples:
// "https://dzyjrzj2lngmg.cloudfront.net/Images/Interactive+map.jpg"
// "https://dzyjrzj2lngmg.cloudfront.net/Images/Damascus_Trade_Routes.jpg"
// "https://dzyjrzj2lngmg.cloudfront.net/Images/Umayyad_Palace_Diagram.jpg"

// Image Metadata
const imageTitle = "Trade Routes Through Damascus";
const imageDescription = "Ancient trade routes connecting Damascus to major cities";

// Content Structure for Educational Context
const educationalContent = {
  moduleInfo: "Module 3 • Lesson 1",
  historicalContext: "Damascus was more than a capital; it sat at the intersection of ancient roads. The King's Highway ran up through the deserts and highlands to the city, bringing caravans from Arabia and the Red Sea. Traders slept in khans, courtyard inns with stables, storage rooms, and a well. There they rested animals, stored goods, and swapped news before entering the busy markets.",
  keyTerms: [
    {
      term: "King's Highway",
      definition: "The ancient road through deserts and highlands that brought caravans to Damascus"
    },
    {
      term: "Khans",
      definition: "Courtyard inns with stables, storage rooms, and wells where traders rested"
    },
    {
      term: "Caravans from Red Sea",
      definition: "Trading groups that traveled from Arabia and the Red Sea to Damascus"
    }
  ]
};
```

## 🎯 Essential State Management - Complete Implementation

```typescript
// EXACT state structure from Adventure1_Module3_Lesson1.tsx

// Reading card states - Core functionality
const [showReadContent, setShowReadContent] = useState(false);   // Toggle expanded content visibility
const [isCardExpanded, setIsCardExpanded] = useState(false);     // Track card expansion state

// Advanced gesture handling states
const [scrollY, setScrollY] = useState(0);                       // Track scroll position for gesture priority
const [touchStart, setTouchStart] = useState<{y: number, time: number} | null>(null); // Android gesture tracking

// Component refs for gesture coordination
const panGestureRef = useRef(null);                              // iOS PanGestureHandler ref
const scrollViewGestureRef = useRef(null);                       // Gesture handler for reading scroll

// Animation values for smooth card expansion - EXACT SwiftUI spring timing
const cardHeight = useRef(new Animated.Value(LAYOUT_CONSTANTS.COLLAPSED_HEIGHT)).current;
const cardOpacity = useRef(new Animated.Value(1)).current;
const cardTranslateY = useRef(new Animated.Value(0)).current;
```

## 🤲 Advanced Gesture Handling - Cross-Platform Perfection

### Card Expansion/Collapse Logic
```typescript
// EXACT animation implementation from Adventure1_Module3_Lesson1.tsx

// Expand the card to full height with perfect SwiftUI spring timing
const expandCard = () => {
  setIsCardExpanded(true);
  setShowReadContent(true);

  Animated.parallel([
    Animated.spring(cardHeight, {
      toValue: LAYOUT_CONSTANTS.EXPANDED_HEIGHT,                // 85% screen coverage
      useNativeDriver: false,
      tension: LAYOUT_CONSTANTS.springAnimationTension,        // 100 - Perfect spring tension
      friction: LAYOUT_CONSTANTS.springAnimationFriction,      // 8 - Smooth damping
    }),
    Animated.timing(cardOpacity, {
      toValue: 0,                                               // Fade out collapsed content
      duration: LAYOUT_CONSTANTS.fadeAnimationDuration,        // 300ms fade timing
      useNativeDriver: false,
    }),
  ]).start();
};

// Collapse the card back to original size
const collapseCard = () => {
  setIsCardExpanded(false);
  setShowReadContent(false);

  Animated.parallel([
    Animated.spring(cardHeight, {
      toValue: LAYOUT_CONSTANTS.COLLAPSED_HEIGHT,               // Return to 140px collapsed height
      useNativeDriver: false,
      tension: LAYOUT_CONSTANTS.springAnimationTension,        // Consistent spring feel
      friction: LAYOUT_CONSTANTS.springAnimationFriction,      // Smooth return animation
    }),
    Animated.timing(cardOpacity, {
      toValue: 1,                                               // Fade in collapsed content
      duration: LAYOUT_CONSTANTS.fadeAnimationDuration,        // Consistent timing
      useNativeDriver: false,
    }),
  ]).start();
};

// Handle reading scroll - track scroll position for gesture priority management
const handleReadingScroll = (event: any) => {
  const { contentOffset } = event.nativeEvent;
  setScrollY(contentOffset.y);  // Track scroll position for advanced gesture handling
};
```

### iOS PanGestureHandler with Advanced Coordination
```typescript
// Enhanced iOS PanGestureHandler with comprehensive logging and optimized sensitivity
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

    // iOS-optimized swipe detection with precise thresholds
    const minDistance = 30;   // 30px minimum translation
    const minVelocity = 500;  // 500 minimum velocity

    // Swipe up to expand
    if (!isCardExpanded &&
        (translationY < -minDistance || velocityY < -minVelocity)) {
      console.log("📱 iOS PanGesture swipe up detected - expanding card", {
        translationY,
        velocityY,
        platform: Platform.OS
      });
      expandCard();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Swipe down to collapse
    else if (isCardExpanded &&
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

### Android Touch Events with Enhanced Precision
```typescript
// Enhanced Android touch handlers with optimized sensitivity and comprehensive logging
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

  // Advanced Android swipe detection with velocity calculation
  const minDistance = 40;           // Increased for better gesture recognition
  const maxTime = 300;              // Shorter time for more responsive gestures
  const velocity = Math.abs(distance) / time;  // Calculate velocity
  const velocityThreshold = 0.5;    // Minimum velocity threshold

  console.log("📖 Android gesture analysis:", {
    distance,
    time,
    velocity: velocity.toFixed(2),
    minDistance,
    maxTime,
    velocityThreshold,
    meetsDistanceRequirement: Math.abs(distance) > minDistance,
    meetsTimeRequirement: time < maxTime,
    meetsVelocityRequirement: velocity > velocityThreshold
  });

  // Swipe up to expand
  if (!isCardExpanded && distance > minDistance && time < maxTime && velocity > velocityThreshold) {
    console.log("📖 Android touch swipe up detected - expanding card", {
      distance,
      time,
      velocity: velocity.toFixed(2),
      platform: Platform.OS
    });
    expandCard();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  // Swipe down to collapse
  else if (isCardExpanded && distance < -minDistance && time < maxTime && velocity > velocityThreshold) {
    console.log("📖 Android touch swipe down detected - collapsing card", {
      distance,
      time,
      velocity: velocity.toFixed(2),
      platform: Platform.OS
    });
    collapseCard();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  // Reset touch tracking
  setTouchStart(null);
};
```

## 🎨 Complete UI Layout Structure - Full-Screen Implementation

```typescript
// EXACT UI structure from Adventure1_Module3_Lesson1.tsx
return (
  <>
    {/* Platform-specific StatusBar handling */}
    {Platform.OS === 'android' && (
      <StatusBar barStyle="dark-content" backgroundColor="#F4EBDB" />
    )}

    <View style={styles.container}>
      {/* FULL-SCREEN IMAGE DISPLAY - Main Content */}
      <Image
        source={mainImageSource}
        style={styles.mapImage}
        resizeMode="cover"                                    // Full coverage without letterboxing
      />

      {/* FLOATING TEXT OVERLAY - Professional positioning */}
      <View style={styles.textOverlay}>
        <Text style={styles.overlayText}>
          {imageTitle}
        </Text>
      </View>

      {/* FLOATING BACK BUTTON - Top Left with SafeArea */}
      <SafeAreaView style={styles.backButtonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={onDismiss}>
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* FLOATING CONTINUE BUTTON - Top Right */}
      <SafeAreaView style={styles.continueButtonContainer}>
        <TouchableOpacity
          style={styles.topContinueButton}
          onPress={onContinue}
        >
          <Ionicons name="chevron-forward" size={24} color="white" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* PLATFORM-SPECIFIC EXPANDABLE READING CARD */}

      {/* Android Implementation - Custom Touch Handlers */}
      {Platform.OS === 'android' && (
        <Animated.View
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={[styles.androidReadingCard, { height: cardHeight }]}
        >
          {/* Card handle indicator */}
          <View style={styles.cardHandle} />

          {/* Collapsed content */}
          {!isCardExpanded && (
            <Animated.View style={[styles.collapsedContent, { opacity: cardOpacity }]}>
              <View style={styles.collapsedContentWrapper}>
                <Text style={styles.collapsedTitle}>
                  {imageTitle}
                </Text>
                <Text style={styles.collapsedSubtitle}>
                  {educationalContent.historicalContext.substring(0, 100)}...
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Expanded content when card is swiped up */}
          {isCardExpanded && (
            <View style={styles.androidExpandedContent}>
              <Text style={styles.androidExpandedTitle}>
                {imageTitle}
              </Text>

              <Text style={styles.androidExpandedSubtitle}>
                {educationalContent.moduleInfo}
              </Text>

              <Text style={styles.androidSectionTitle}>
                Historical Context
              </Text>

              <Text style={styles.androidHistoricalText}>
                {educationalContent.historicalContext}
              </Text>

              <Text style={styles.androidSectionTitle}>
                Key Terms
              </Text>

              <View style={styles.androidKeyTermsContainer}>
                {educationalContent.keyTerms.map((keyTerm, index) => (
                  <View key={index} style={styles.androidKeyTermRow}>
                    <Text style={styles.androidKeyTermTitle}>{keyTerm.term}</Text>
                    <Text style={styles.androidKeyTermDefinition}>{keyTerm.definition}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Animated.View>
      )}

      {/* iOS Implementation - Native PanGestureHandler */}
      {Platform.OS === 'ios' && (
        <PanGestureHandler
          ref={panGestureRef}
          onGestureEvent={handleSwipeGesture}
          onHandlerStateChange={handleSwipeGesture}
          activeOffsetY={[-20, 20]}                           // Optimized sensitivity
          failOffsetX={[-30, 30]}                             // Prevent horizontal conflicts
        >
          <Animated.View style={[styles.cardContainer, { transform: [{ translateY: cardTranslateY }] }]}>
            <Animated.View style={[styles.readingCard, { height: cardHeight }]}>
              {/* Card handle indicator */}
              <View style={styles.cardHandle} />

              {/* Collapsed content with fade animation */}
              <Animated.View style={[styles.collapsedContent, { opacity: cardOpacity }]}>
                <View style={styles.readingCardHeader}>
                  <Text style={styles.cardTitle}>
                    {imageTitle}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {educationalContent.historicalContext.substring(0, 100)}...
                  </Text>
                </View>
              </Animated.View>

              {/* Expanded content when card is swiped up */}
              {isCardExpanded && (
                <Animated.View style={[styles.expandedContent, { opacity: Animated.subtract(1, cardOpacity) }]}>
                  <GestureHandlerScrollView
                    ref={scrollViewGestureRef}
                    style={styles.expandedScroll}
                    showsVerticalScrollIndicator={false}
                    onScroll={handleReadingScroll}
                    scrollEventThrottle={100}
                    waitFor={panGestureRef}
                    simultaneousHandlers={panGestureRef}
                  >
                    <View style={styles.expandedContentInner}>
                      {/* Title Section */}
                      <View style={styles.titleSection}>
                        <Text style={styles.sheetTitle}>
                          {imageTitle}
                        </Text>
                        <Text style={styles.sheetSubtitle}>
                          {educationalContent.moduleInfo}
                        </Text>
                      </View>

                      {/* Historical Content */}
                      <View style={styles.historicalSection}>
                        <Text style={styles.sectionTitle}>Historical Context</Text>
                        <Text style={styles.historicalText}>
                          {educationalContent.historicalContext}
                        </Text>
                      </View>

                      {/* Key Terms Section */}
                      <View style={styles.keyTermsSection}>
                        <Text style={styles.sectionTitle}>Key Terms</Text>
                        <View style={styles.keyTermsContainer}>
                          {educationalContent.keyTerms.map((keyTerm, index) => (
                            <KeyTermRow
                              key={index}
                              term={keyTerm.term}
                              definition={keyTerm.definition}
                            />
                          ))}
                        </View>
                      </View>

                      {/* Bottom spacer to ensure full scroll */}
                      <View style={styles.sheetBottomSpacer} />
                    </View>
                  </GestureHandlerScrollView>
                </Animated.View>
              )}
            </Animated.View>
          </Animated.View>
        </PanGestureHandler>
      )}
    </View>
  </>
);
```

## 🧩 Key Term Row Component

```typescript
// EXACT KeyTermRow component from Adventure1_Module3_Lesson1.tsx
interface KeyTermRowProps {
  term: string;
  definition: string;
}

function KeyTermRow({ term, definition }: KeyTermRowProps) {
  return (
    <View style={styles.keyTermRow}>
      <Text style={styles.keyTermTitle}>{term}</Text>
      <Text style={styles.keyTermDefinition}>{definition}</Text>
    </View>
  );
}
```

## 🎨 Complete StyleSheet - Pixel-Perfect Implementation

```typescript
// EXACT StyleSheet from Adventure1_Module3_Lesson1.tsx with comprehensive styling
const styles = StyleSheet.create({
  // MAIN CONTAINER - Full-screen black background for immersive experience
  container: {
    flex: 1,
    backgroundColor: 'black',
  },

  // FULL-SCREEN IMAGE DISPLAY
  mapImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // FLOATING TEXT OVERLAY - Professional positioning with shadows
  textOverlay: {
    position: 'absolute',
    top: LAYOUT_CONSTANTS.textOverlayTop,                     // 100px from top for SafeArea
    left: 0,
    right: 0,
    paddingHorizontal: LAYOUT_CONSTANTS.textOverlayHorizontalPadding, // 40px horizontal padding
    alignItems: 'center',
  },
  overlayText: {
    fontFamily: 'DM Sans',
    fontSize: 20,                                             // Large readable font
    fontWeight: '700',                                        // Bold for image overlay readability
    color: 'white',
    textAlign: 'center',
    lineHeight: 26,                                           // 1.3 line height ratio
    textShadowColor: 'black',                                 // Text shadow for readability
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    shadowColor: 'black',                                     // Additional shadow for emphasis
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },

  // FLOATING NAVIGATION BUTTONS
  backButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 20,                                               // Highest z-index for accessibility
    paddingTop: LAYOUT_CONSTANTS.buttonContainerPadding.top, // 8px
    paddingLeft: LAYOUT_CONSTANTS.buttonContainerPadding.horizontal, // 16px
  },
  backButton: {
    width: LAYOUT_CONSTANTS.buttonSize,                       // 40x40 touch target
    height: LAYOUT_CONSTANTS.buttonSize,
    borderRadius: LAYOUT_CONSTANTS.buttonRadius,             // Perfect circle
    backgroundColor: 'rgba(0,0,0,0.6)',                       // Semi-transparent black
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 20,
    paddingTop: LAYOUT_CONSTANTS.buttonContainerPadding.top,
    paddingRight: LAYOUT_CONSTANTS.buttonContainerPadding.horizontal,
  },
  topContinueButton: {
    width: LAYOUT_CONSTANTS.buttonSize,
    height: LAYOUT_CONSTANTS.buttonSize,
    borderRadius: LAYOUT_CONSTANTS.buttonRadius,
    backgroundColor: ArchivesTheme.colors.mossGreen,          // Green for continue action
    justifyContent: 'center',
    alignItems: 'center',
  },

  // READING CARD SYSTEM - iOS Implementation
  cardContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 30,                                               // High z-index for card overlay
    elevation: 20,                                            // Android elevation
  },
  readingCard: {
    height: LAYOUT_CONSTANTS.COLLAPSED_HEIGHT,                // 140px collapsed height
    backgroundColor: "rgba(0,0,0,0.9)",                       // 90% black transparency
    borderTopLeftRadius: 20,                                  // Rounded top corners
    borderTopRightRadius: 20,
    shadowColor: "#000",                                      // Professional shadow system
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,                                            // Android shadow
  },
  cardHandle: {
    width: LAYOUT_CONSTANTS.cardHandleWidth,                  // 70px handle width
    height: LAYOUT_CONSTANTS.cardHandleHeight,                // 5px handle height
    backgroundColor: "rgba(255,255,255,0.4)",                 // 40% white opacity
    borderRadius: 2,
    alignSelf: "center",
    marginTop: LAYOUT_CONSTANTS.cardHandleTopMargin,          // 12px from top
  },

  // COLLAPSED CONTENT STYLES
  collapsedContent: {
    flex: 1,
  },
  readingCardHeader: {
    padding: LAYOUT_CONSTANTS.readingCardHeaderPadding.horizontal, // 20px
    paddingTop: LAYOUT_CONSTANTS.readingCardHeaderPadding.top,     // 16px
    paddingBottom: LAYOUT_CONSTANTS.readingCardHeaderPadding.bottom, // 30px
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
    opacity: 0.7,                                             // 70% opacity for subtitle
  },

  // EXPANDED CONTENT SYSTEM
  expandedContent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 20,                                           // Top padding for handle space
  },
  expandedScroll: {
    flex: 1,
  },
  expandedContentInner: {
    padding: LAYOUT_CONSTANTS.expandedContentPadding,         // 20px padding
  },

  // EDUCATIONAL CONTENT STYLES
  titleSection: {
    marginBottom: LAYOUT_CONSTANTS.titleSectionBottomMargin, // 24px spacing after title
  },
  sheetTitle: {
    fontFamily: "DM Sans",
    fontSize: 24,                                             // Large title for expanded view
    fontWeight: "700",
    color: "white",
    marginBottom: 8,
  },
  sheetSubtitle: {
    fontFamily: "DM Sans",
    fontSize: 14,
    color: "white",
    opacity: 0.7,
  },
  historicalSection: {
    marginBottom: LAYOUT_CONSTANTS.historicalSectionBottomMargin, // 20px spacing
  },
  sectionTitle: {
    fontFamily: "DM Sans",
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginBottom: 8,
  },
  historicalText: {
    fontFamily: "DM Sans",
    fontSize: 14,
    color: "white",
    lineHeight: 20,                                           // 1.43 line height for readability
    textAlign: "left",
  },

  // KEY TERMS SECTION
  keyTermsSection: {
    marginBottom: LAYOUT_CONSTANTS.keyTermsBottomMargin,      // 20px spacing
  },
  keyTermsContainer: {
    padding: LAYOUT_CONSTANTS.keyTermsContainerPadding,       // 12px padding
    backgroundColor: "rgba(255,255,255,0.1)",                 // 10% white overlay
    borderRadius: 8,
  },
  keyTermRow: {
    marginBottom: LAYOUT_CONSTANTS.keyTermRowBottomMargin,    // 8px spacing between rows
  },
  keyTermTitle: {
    fontFamily: "DM Sans",
    fontSize: 14,
    fontWeight: "600",
    color: "white",
    marginBottom: 2,
  },
  keyTermDefinition: {
    fontFamily: "DM Sans",
    fontSize: 14,
    color: "white",
    lineHeight: 16,
  },

  // ANDROID-SPECIFIC IMPLEMENTATION
  androidReadingCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.9)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 30,
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  collapsedContentWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT_CONSTANTS.androidCollapsedPadding.horizontal, // 20px
    paddingTop: LAYOUT_CONSTANTS.androidCollapsedPadding.top,               // 10px
    paddingBottom: LAYOUT_CONSTANTS.androidCollapsedPadding.bottom,         // 25px
    marginTop: LAYOUT_CONSTANTS.androidCollapsedContentMarginTop,           // -15px - Move text up slightly
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

  // Android expanded content styles
  androidExpandedContent: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
  },
  androidExpandedTitle: {
    fontFamily: "DM Sans",
    fontSize: 22,
    fontWeight: "700",
    color: "white",
    marginBottom: 8
  },
  androidExpandedSubtitle: {
    fontFamily: "DM Sans",
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 20
  },
  androidSectionTitle: {
    fontFamily: "DM Sans",
    fontSize: 18,
    fontWeight: "600",
    color: "white",
    marginBottom: 8
  },
  androidHistoricalText: {
    fontFamily: "DM Sans",
    fontSize: 14,
    color: "white",
    lineHeight: 20,
    marginBottom: 20
  },
  androidKeyTermsContainer: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: 12
  },
  androidKeyTermRow: {
    marginBottom: 8,
  },
  androidKeyTermTitle: {
    fontFamily: "DM Sans",
    fontSize: 14,
    fontWeight: "600",
    color: "white",
    marginBottom: 2
  },
  androidKeyTermDefinition: {
    fontFamily: "DM Sans",
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 16
  },

  // UTILITY STYLES
  sheetBottomSpacer: {
    height: 60,                                               // 60px bottom spacing for scroll completion
  },
});
```

## 🚀 Comprehensive Implementation Checklist

### **Phase 1: Core Setup & Dependencies**
- [ ] Import ALL required dependencies from Adventure1_Module3_Lesson1.tsx reference
- [ ] Set up component interface with proper TypeScript props
- [ ] Initialize EXACT layout constants with SwiftUI measurements
- [ ] Configure AWS CloudFront image URL following pattern
- [ ] Set up state management (card expansion, gesture tracking)
- [ ] Structure educational content with proper text variables and key terms
- [ ] Initialize animation refs (cardHeight, cardOpacity, cardTranslateY)

### **Phase 2: Full-Screen Image Implementation**
- [ ] Implement full-screen image display with SCREEN_WIDTH x SCREEN_HEIGHT
- [ ] Configure Image component with resizeMode="cover" for perfect coverage
- [ ] Test AWS CloudFront image loading across platforms
- [ ] Add image overlay with exact text positioning (top: 100px, padding: 40px)
- [ ] Style overlay text with professional shadow system for readability
- [ ] Ensure image covers entire screen without letterboxing

### **Phase 3: Floating Navigation System**
- [ ] Add SafeAreaView-wrapped back button (top-left, 40x40 touch target)
- [ ] Implement continue button (top-right, MossGreen background)
- [ ] Position navigation with exact measurements (8px top, 16px horizontal)
- [ ] Style buttons with proper transparency and shadows
- [ ] Add proper z-index management (navigation: 20, card: 30)
- [ ] Test navigation functionality and visual consistency

### **Phase 4: Advanced Gesture System**
- [ ] Set up iOS PanGestureHandler with optimal configuration
  - [ ] activeOffsetY: [-20, 20] for sensitivity
  - [ ] failOffsetX: [-30, 30] for horizontal conflict prevention
  - [ ] Proper simultaneousHandlers and waitFor coordination
- [ ] Implement handleSwipeGesture with comprehensive logging
- [ ] Create Android touch handlers (handleTouchStart, handleTouchEnd)
- [ ] Add precise Android gesture calculations (distance, time, velocity)
- [ ] Implement cross-platform haptic feedback
- [ ] Test gesture responsiveness on both platforms

### **Phase 5: Expandable Reading Card System**
- [ ] Create card container with proper positioning (bottom: 0, zIndex: 30)
- [ ] Implement animated card with spring expansion (tension: 100, friction: 8)
- [ ] Add card handle indicator (70px width, 5px height, 40% white opacity)
- [ ] Create collapsed content with fade animation (opacity: 1 → 0)
- [ ] Build expanded content system with GestureHandlerScrollView
- [ ] Add comprehensive educational content structure
- [ ] Implement platform-specific card implementations

### **Phase 6: Educational Content Structure**
- [ ] Structure content with title section (24px bottom margin)
- [ ] Add historical context with proper typography (DM Sans, 14px, line height 20)
- [ ] Implement Key Terms section with container styling
- [ ] Create KeyTermRow component for term definitions
- [ ] Add proper content spacing and hierarchy
- [ ] Ensure content scrollability with bottom spacer (60px)

### **Phase 7: Platform-Specific Optimizations**
- [ ] Add platform-specific StatusBar handling (Android backgroundColor)
- [ ] Implement iOS-specific PanGestureHandler optimizations
- [ ] Create Android-specific touch event handling and styling
- [ ] Add platform-specific collapsed content positioning
- [ ] Test gesture coordination on both platforms
- [ ] Verify UI consistency across iOS and Android

### **Phase 8: Animation & UI Polish**
- [ ] Apply EXACT SwiftUI spring animations (tension: 100, friction: 8)
- [ ] Implement parallel animations for card expansion/collapse
- [ ] Add smooth fade transitions (300ms duration)
- [ ] Test animation performance on both platforms
- [ ] Verify proper shadow rendering (elevation: 12 for Android)
- [ ] Ensure 60fps animation performance

### **Phase 9: AWS CloudFront Integration**
- [ ] Configure image URLs following exact pattern structure
- [ ] Test image loading from AWS CloudFront across platforms
- [ ] Verify image quality and loading performance
- [ ] Implement fallback handling for network issues
- [ ] Add image preloading for smooth experience
- [ ] Test image caching and memory usage

### **Phase 10: Production Quality & Testing**
- [ ] Add comprehensive error handling for image loading
- [ ] Implement loading states for slow connections
- [ ] Add gesture status tracking for production debugging
- [ ] Test with various image sizes and formats
- [ ] Verify educational content accessibility
- [ ] Test complete user flow from start to continue
- [ ] Validate cross-platform consistency
- [ ] Perform memory usage testing

## 📚 Educational Content Applications

This lesson type excels for:
- **Historical Maps** - Trade routes, territorial expansion, cultural exchange maps
- **Architectural Diagrams** - Palace layouts, mosque designs, city planning
- **Archaeological Sites** - Excavation diagrams, site layouts, artifact contexts
- **Monument Studies** - Detailed architectural analysis with historical context
- **Reference Materials** - Charts, timelines, infographics requiring study
- **Cultural Artifacts** - Detailed examination with comprehensive background

## 🔧 Advanced Customization Options

### **Visual Customization**
- Modify `textOverlay` positioning for different image compositions
- Adjust card expansion height percentage for content requirements
- Customize image overlay styling and shadow effects
- Change floating button colors and transparency

### **Gesture Customization**
- Modify iOS gesture sensitivity (`activeOffsetY`, `failOffsetX`) for user preferences
- Adjust Android gesture thresholds (`minDistance`, `maxTime`, `velocityThreshold`)
- Customize haptic feedback intensity for different interactions
- Add double-tap gestures for alternative card expansion

### **Content Structure Customization**
- Extend Key Terms with additional educational components
- Add multiple image sections with navigation
- Implement progressive disclosure for complex content
- Include interactive elements within expanded content

### **Animation Customization**
- Modify spring animation tension/friction for different feels
- Adjust fade timing for content transitions
- Add custom card entrance animations
- Implement parallax effects for image overlay

## ⚠️ Critical Implementation Notes

### **AWS CloudFront Requirements**
- **Image URLs**: Must follow pattern `https://dzyjrzj2lngmg.cloudfront.net/Images/{ImageName}.jpg`
- **Image Optimization**: Ensure images are optimized for mobile (< 2MB recommended)
- **Network Handling**: Implement proper loading states for slow connections
- **Caching**: Leverage CloudFront caching for improved performance

### **Gesture Coordination System**
- **iOS**: Use PanGestureHandler with proper simultaneousHandlers coordination
- **Android**: Implement custom touch events with velocity calculations
- **Conflict Prevention**: Ensure scroll gestures don't interfere with card gestures
- **Testing**: Always test gesture conflicts on both platforms

### **Platform-Specific Requirements**
- **iOS**: Requires `react-native-gesture-handler` for optimal PanGestureHandler
- **Android**: Custom touch events provide consistent cross-platform experience
- **StatusBar**: Platform-specific handling for immersive experience
- **SafeArea**: Proper SafeAreaView integration for notched devices

### **Performance Considerations**
- **Image Loading**: Monitor memory usage with high-resolution images
- **Animation Performance**: Ensure 60fps animations on lower-end devices
- **Gesture Responsiveness**: Test gesture accuracy during animations
- **Memory Management**: Implement proper image cleanup and caching

### **Educational Framework Considerations**
- **Content Flow**: Structure content for logical educational progression
- **Text Length**: Balance detailed information with readability
- **Key Terms**: Focus on essential vocabulary and concepts
- **Visual-Text Integration**: Ensure content enhances image understanding

## 🎯 Production Quality Standards

### **Code Quality Requirements**
- Follow EXACT implementation patterns from `Adventure1_Module3_Lesson1.tsx`
- Include comprehensive gesture logging for production debugging
- Implement proper TypeScript interfaces for all props and data structures
- Use consistent naming conventions following Adventure{N}_Module{N}_Lesson{N} pattern

### **User Experience Standards**
- Ensure smooth image loading without flickering or delays
- Provide clear visual feedback for all interactive elements
- Maintain consistent gesture sensitivity across platforms
- Test with various image qualities and network conditions

### **Performance Benchmarks**
- Image loading: < 2 seconds on average connections
- Animation performance: 60fps card expansion/collapse
- Memory usage: < 50MB for high-resolution images
- Gesture responsiveness: < 100ms response time

### **Educational Effectiveness**
- Structure content with clear visual-text relationships
- Provide meaningful context that enhances image understanding
- Include comprehensive key terms for vocabulary building
- Ensure seamless progression from visual to detailed content

---

## 📖 Complete Reference Documentation

**Primary Implementation**: `Adventure1_Module3_Lesson1.tsx`
**Core Dependencies**: `react-native-gesture-handler`, `ArchivesTheme` constants
**AWS CloudFront Pattern**: `https://dzyjrzj2lngmg.cloudfront.net/Images/{ImageName}.jpg`

**Required Testing Platforms**: iOS (PanGestureHandler), Android (Touch Events)
**Performance Target**: < 2s image loading, 60fps animations, < 50MB memory usage
**Educational Framework**: Visual focus with comprehensive contextual reading content

**SwiftUI Conversion Accuracy**: 100% measurement and behavior parity
**Production Readiness**: Complete error handling, gesture coordination, and cross-platform optimization