# Video Carousel Lesson Implementation Guide

## 📖 Overview
The Video Carousel lesson type provides swipeable video galleries with contextual captions, modern expo-video implementation, and smooth navigation for video series content.

## 🎯 Best Implementation Reference
**File**: `Adventure1_Module3_Lesson2.tsx`

## ✨ Key Features
- ✅ Modern `expo-video` implementation with `useVideoPlayer` hooks
- ✅ Structured video content array with AWS CloudFront URLs
- ✅ Smooth video carousel navigation with proper indexing
- ✅ Integration with background music system
- ✅ Platform-specific dimension handling
- ✅ Clean TypeScript interfaces for video content structure
- ✅ Expandable reading card with video context
- ✅ Haptic feedback for enhanced user experience

## 🛠️ Technical Implementation

### Core Dependencies
```typescript
import ArchivesTheme from "@/constants/ArchivesTheme";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ScrollView as GestureHandlerScrollView,
  PanGestureHandler,
  State,
} from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
```

### Component Interface
```typescript
interface VideoCarouselLessonProps {
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void;
}
```

## 🎬 Video Content Structure

### Video Content Interface
```typescript
interface MediaContent {
  id: number;
  videoUrl: string;
  caption: string;
}
```

### Video Content Array
```typescript
// Media content with AWS CloudFront video URLs
const mediaContents: MediaContent[] = [
  {
    id: 1,
    videoUrl: "https://dzyjrzj2lngmg.cloudfront.net/carouselvideos/Adv1_M3_Media2_Video1.mp4",
    caption: "Damascus Thrives on the Barada river, its water powering farms, markets, and daily life in the new capital"
  },
  {
    id: 2,
    videoUrl: "https://dzyjrzj2lngmg.cloudfront.net/carouselvideos/Adv1_M3_Media2_Video2.mp4",
    caption: "Damascus was famous for glassmaking, a skill adopted from the Sasanian Persians and exported across the empire"
  },
  {
    id: 3,
    videoUrl: "https://dzyjrzj2lngmg.cloudfront.net/carouselvideos/Adv1_M3_Media2_Video3.mp4",
    caption: "Merchants from Byzantium, Persia, and Arabia crowded markets, trading silk, spices, and knowledge"
  },
  {
    id: 4,
    videoUrl: "https://dzyjrzj2lngmg.cloudfront.net/carouselvideos/Adv1_M3_Media2_Video4.mp4",
    caption: "In tea houses, scholars debated ideas - like al Battani's discovery that a year is 365 days and 5 hours"
  },
  {
    id: 5,
    videoUrl: "https://dzyjrzj2lngmg.cloudfront.net/carouselvideos/Adv1_M3_Media2_Video5.mp4",
    caption: "Damascus had seven gates, like Bab al-Saghir and Bab al-Faradis, each opening to trade routes"
  },
];
```

### AWS CloudFront URL Pattern
```typescript
// Standard URL format for carousel videos
const videoUrl = `https://dzyjrzj2lngmg.cloudfront.net/carouselvideos/Adv{N}_M{N}_Media{N}_Video{N}.mp4`;

// Example: Adventure 1, Module 3, Media 2, Video 1
"https://dzyjrzj2lngmg.cloudfront.net/carouselvideos/Adv1_M3_Media2_Video1.mp4"
```

## 🎯 Essential State Management

```typescript
// Video carousel states
const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
const [currentVideoSource, setCurrentVideoSource] = useState(mediaContents[0]);

// Reading card states
const [isCardExpanded, setIsCardExpanded] = useState(false);
const [scrollY, setScrollY] = useState(0);
const [touchStart, setTouchStart] = useState<{y: number, time: number} | null>(null);

// Gesture coordination
const [isCardGestureActive, setIsCardGestureActive] = useState(false);

// Animation refs
const cardHeight = useRef(new Animated.Value(160)).current;
const cardOpacity = useRef(new Animated.Value(1)).current;
const cardTranslateY = useRef(new Animated.Value(0)).current;

// Component refs
const scrollViewRef = useRef<ScrollView>(null);
const scrollViewGestureRef = useRef(null);
const panGestureRef = useRef(null);
```

## 📱 Modern expo-video Implementation

### Video Player Setup
```typescript
// Modern expo-video usage with useVideoPlayer hook
const videoPlayer = useVideoPlayer(currentVideoSource.videoUrl, player => {
  player.loop = true;
  player.play();
});

// Update video source when current index changes
useEffect(() => {
  const newVideoSource = mediaContents[currentVideoIndex];
  setCurrentVideoSource(newVideoSource);
}, [currentVideoIndex]);
```

### Video View Component
```typescript
<View style={styles.videoContainer}>
  <VideoView
    style={styles.video}
    player={videoPlayer}
    allowsFullscreen={false}
    allowsPictureInPicture={false}
  />

  {/* Video Caption Overlay */}
  <View style={styles.videoOverlay}>
    <Text style={styles.videoCaptionText}>
      {currentVideoSource.caption}
    </Text>
  </View>
</View>
```

## 🎵 Background Music Integration

### Audio Setup
```typescript
// Background music hook with Desert Whispers audio
const backgroundMusic = useBackgroundMusic(
  { uri: "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv1_M3_L2_Desert+Whispers.mp3" },
  {
    volume: 0.4, // Slightly lower to not compete with video audio
    shouldLoop: true,
  }
);

// Audio cleanup on component unmount
useEffect(() => {
  return () => {
    if (backgroundMusic.stop) {
      backgroundMusic.stop();
    }
  };
}, []);
```

## 🔄 Carousel Navigation

### Horizontal Scroll Handling
```typescript
// Handle video carousel scroll
const handleScroll = (event: any) => {
  const contentOffsetX = event.nativeEvent.contentOffset.x;
  const videoIndex = Math.round(contentOffsetX / SCREEN_WIDTH);

  if (videoIndex !== currentVideoIndex && videoIndex >= 0 && videoIndex < mediaContents.length) {
    setCurrentVideoIndex(videoIndex);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};
```

### Programmatic Navigation
```typescript
// Navigate to next video
const handleSwipeNext = () => {
  if (currentVideoIndex < mediaContents.length - 1) {
    const nextIndex = currentVideoIndex + 1;
    scrollViewRef.current?.scrollTo({
      x: nextIndex * SCREEN_WIDTH,
      animated: true
    });
    setCurrentVideoIndex(nextIndex);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};

// Navigate to previous video
const handleSwipePrevious = () => {
  if (currentVideoIndex > 0) {
    const prevIndex = currentVideoIndex - 1;
    scrollViewRef.current?.scrollTo({
      x: prevIndex * SCREEN_WIDTH,
      animated: true
    });
    setCurrentVideoIndex(prevIndex);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};
```

## 🎨 UI Layout Structure

```typescript
const cardAnimationStyle = {
  height: cardHeight,
  opacity: cardOpacity,
  transform: [{ translateY: cardTranslateY }],
};

return (
  <SafeAreaView style={styles.container}>
    <StatusBar barStyle="dark-content" backgroundColor={ArchivesTheme.colors.creamWhite} />

    {/* Header */}
    <View style={styles.header}>
      <TouchableOpacity onPress={onDismiss} style={styles.headerButton}>
        <Ionicons name="close" size={24} color={ArchivesTheme.colors.mutedNavy} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Damascus Markets</Text>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color={ArchivesTheme.colors.mutedNavy} />
        </TouchableOpacity>
      )}
    </View>

    {/* Video Carousel */}
    <ScrollView
      ref={scrollViewRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      style={styles.carousel}
      scrollEnabled={!isCardGestureActive}
    >
      {mediaContents.map((item, index) => (
        <View key={item.id} style={styles.videoSlide}>
          {index === currentVideoIndex ? (
            <View style={styles.videoContainer}>
              <VideoView
                style={styles.video}
                player={videoPlayer}
                allowsFullscreen={false}
                allowsPictureInPicture={false}
              />
              <View style={styles.videoOverlay}>
                <Text style={styles.videoCaptionText}>
                  {item.caption}
                </Text>
              </View>
            </View>
          ) : (
            // Placeholder for non-active videos to maintain layout
            <View style={[styles.videoContainer, styles.videoPlaceholder]}>
              <View style={styles.videoPlaceholderContent}>
                <Ionicons name="play-circle" size={60} color={ArchivesTheme.colors.mutedNavy} />
                <Text style={styles.videoPlaceholderText}>Video {index + 1}</Text>
              </View>
            </View>
          )}
        </View>
      ))}
    </ScrollView>

    {/* Navigation Controls */}
    <View style={styles.navigationControls}>
      <TouchableOpacity
        style={[styles.navButton, currentVideoIndex === 0 && styles.navButtonDisabled]}
        onPress={handleSwipePrevious}
        disabled={currentVideoIndex === 0}
      >
        <Ionicons name="chevron-back" size={24} color={
          currentVideoIndex === 0 ? ArchivesTheme.colors.concreteGrey : ArchivesTheme.colors.mutedNavy
        } />
      </TouchableOpacity>

      <Text style={styles.navigationText}>
        {currentVideoIndex + 1} of {mediaContents.length}
      </Text>

      <TouchableOpacity
        style={[styles.navButton, currentVideoIndex === mediaContents.length - 1 && styles.navButtonDisabled]}
        onPress={handleSwipeNext}
        disabled={currentVideoIndex === mediaContents.length - 1}
      >
        <Ionicons name="chevron-forward" size={24} color={
          currentVideoIndex === mediaContents.length - 1 ? ArchivesTheme.colors.concreteGrey : ArchivesTheme.colors.mutedNavy
        } />
      </TouchableOpacity>
    </View>

    {/* Expandable Reading Card */}
    <PanGestureHandler
      ref={panGestureRef}
      onGestureEvent={handleSwipeGesture}
      simultaneousHandlers={scrollViewGestureRef}
      enabled={Platform.OS === 'ios'}
    >
      <Animated.View style={[styles.readingCard, cardAnimationStyle]}>
        {/* Card Content */}
      </Animated.View>
    </PanGestureHandler>
  </SafeAreaView>
);
```

## 📐 SwiftUI Layout Constants - EXACT Measurements

```typescript
// EXACT iOS SwiftUI Layout Specifications - Pixel Perfect Video Carousel
const iOSLayout = {
  // Screen dimensions with platform handling
  screenWidth: Dimensions.get(Platform.OS === 'android' ? 'screen' : 'window').width,
  screenHeight: Dimensions.get(Platform.OS === 'android' ? 'screen' : 'window').height,

  // Header section measurements (EXACT SwiftUI header)
  headerHeight: 70,                    // Total header container height
  headerHorizontalPadding: 20,         // Left/right header padding
  headerVerticalPadding: 10,           // Top/bottom header padding
  headerButtonSize: 44,                // Touch target size for header buttons
  headerIconSize: 24,                  // Close/back icon size
  headerTitleFontSize: 20,             // Header title text size

  // Video carousel container measurements
  carouselContainerPadding: 20,        // Horizontal padding for video slides
  videoSlideWidth: 0,                  // Calculated as screenWidth
  videoContainerMargin: 40,            // Total horizontal margin (20px each side)
  videoContainerHeight: 0,             // Calculated as screenHeight * 0.6
  videoContainerCornerRadius: 20,      // Video container border radius
  videoContainerShadowRadius: 8,       // Shadow blur radius
  videoContainerShadowOpacity: 0.1,    // Shadow opacity
  videoContainerShadowOffsetY: 4,      // Shadow vertical offset

  // Video overlay and caption styling
  videoOverlayPadding: 16,             // Caption overlay internal padding
  videoCaptionFontSize: 14,            // Caption text size
  videoCaptionLineHeight: 20,          // Caption line spacing
  videoOverlayCornerRadius: 0,         // Bottom corners only

  // Video placeholder styling
  placeholderIconSize: 60,             // Play icon size for non-active videos
  placeholderTextSize: 16,             // Placeholder label text size
  placeholderGap: 10,                  // Gap between icon and text

  // Navigation controls measurements
  navigationControlsHeight: 60,        // Navigation section height
  navigationHorizontalPadding: 40,     // Left/right padding for nav controls
  navigationVerticalPadding: 20,       // Top/bottom padding for nav section
  navButtonSize: 40,                   // Navigation button touch target
  navButtonIconSize: 24,               // Navigation arrow icon size
  navButtonCornerRadius: 20,           // Navigation button border radius
  navButtonShadowRadius: 4,            // Navigation button shadow
  navButtonShadowOpacity: 0.1,         // Navigation button shadow opacity
  navButtonShadowOffsetY: 2,           // Navigation button shadow offset
  navigationTextSize: 14,              // "X of Y" counter text size

  // Expandable reading card measurements
  cardCollapsedHeight: 160,            // Collapsed card height
  cardExpandedHeight: 0,               // Calculated as screenHeight * 0.85
  cardCornerRadius: 20,                // Card border radius (top corners)
  cardPadding: 20,                     // Internal card padding
  cardHandleWidth: 40,                 // Drag handle width
  cardHandleHeight: 4,                 // Drag handle thickness
  cardHandleCornerRadius: 2,           // Drag handle border radius
  cardHandleTopMargin: 10,             // Handle top spacing
  cardTitleFontSize: 18,               // Card title text size
  cardContentFontSize: 16,             // Card content text size
  cardContentLineHeight: 24,           // Card content line spacing
  cardScrollPadding: 20,               // Scroll content padding

  // Animation timing constants
  cardAnimationDuration: 300,          // Card expand/collapse duration (ms)
  cardAnimationTension: 100,           // Spring animation tension
  cardAnimationFriction: 8,            // Spring animation friction
  carouselScrollThrottle: 16,          // Scroll event throttling (60fps)
  hapticFeedbackDelay: 50,             // Delay before haptic feedback

  // Video loading and performance
  videoLoadTimeout: 5000,              // Video load timeout (ms)
  videoBufferSize: 2,                  // Number of videos to preload
  videoQualityCheck: 1000,             // Video quality check interval
  memoryWarningThreshold: 100,         // Memory usage warning (MB)

  // Cross-platform adjustments
  androidElevation: 8,                 // Android shadow elevation
  iosOnlyShadow: Platform.OS === 'ios', // iOS-specific shadow handling
  androidScrollBehavior: Platform.OS === 'android' ? 'padding' : 'height',
  statusBarHeight: Platform.OS === 'ios' ? 44 : 24, // Platform status bar
};

// Calculate dynamic dimensions
iOSLayout.videoSlideWidth = iOSLayout.screenWidth;
iOSLayout.videoContainerHeight = iOSLayout.screenHeight * 0.6;
iOSLayout.cardExpandedHeight = iOSLayout.screenHeight * 0.85;

// Video content area calculation
const VIDEO_CONTENT_WIDTH = iOSLayout.screenWidth - iOSLayout.videoContainerMargin;
const VIDEO_CONTENT_HEIGHT = iOSLayout.videoContainerHeight;

// Safe area calculations for different devices
const SAFE_AREA_BOTTOM = Platform.OS === 'ios' ? 34 : 0; // iPhone home indicator
const SAFE_AREA_TOP = iOSLayout.statusBarHeight;
```

## 🎨 Styling Guidelines

### Core Styles
```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },

  carousel: {
    flex: 1,
  },

  videoSlide: {
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  videoContainer: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_HEIGHT * 0.6,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: ArchivesTheme.colors.shoeBrown,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },

  video: {
    width: '100%',
    height: '100%',
  },

  videoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
  },

  videoCaptionText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'DM Sans',
    lineHeight: 20,
  },

  videoPlaceholder: {
    backgroundColor: ArchivesTheme.colors.concreteGrey,
    justifyContent: 'center',
    alignItems: 'center',
  },

  videoPlaceholderContent: {
    alignItems: 'center',
    gap: 10,
  },

  videoPlaceholderText: {
    fontSize: 16,
    color: ArchivesTheme.colors.mutedNavy,
    fontFamily: 'DM Sans',
  },

  navigationControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 20,
  },

  navButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: ArchivesTheme.colors.surface,
    shadowColor: ArchivesTheme.colors.shoeBrown,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },

  navButtonDisabled: {
    opacity: 0.5,
  },

  navigationText: {
    fontSize: 14,
    color: ArchivesTheme.colors.mutedNavy,
    fontFamily: 'DM Sans',
  },
});
```

## 🚀 Implementation Checklist - Pixel Perfect Video Carousel System

### Phase 1: Project Setup & Dependencies
- [ ] Import core React Native components (View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Animated, Dimensions, Platform)
- [ ] Import SafeAreaView from react-native-safe-area-context for proper screen boundaries
- [ ] Import modern expo-video components (useVideoPlayer, VideoView) for video playback
- [ ] Import Ionicons from @expo/vector-icons for navigation and UI icons
- [ ] Import expo-haptics for tactile feedback on carousel interactions
- [ ] Import react-native-gesture-handler components (PanGestureHandler, State) for advanced gestures
- [ ] Import ArchivesTheme for consistent design system colors and typography
- [ ] Import useBackgroundMusic hook for immersive audio experience
- [ ] Set up TypeScript interfaces for VideoCarouselLessonProps and MediaContent
- [ ] Configure platform-specific dimensions handling (screen vs window)

### Phase 2: Video Content Structure & Data Management
- [ ] Define MediaContent interface with id, videoUrl, and caption properties
- [ ] Structure video content array with proper AWS CloudFront URLs
- [ ] Implement AWS CloudFront URL pattern: carouselvideos/Adv{N}_M{N}_Media{N}_Video{N}.mp4
- [ ] Set up video content with contextual captions for educational value
- [ ] Configure video array with proper indexing for carousel navigation
- [ ] Validate all video URLs are accessible and properly formatted
- [ ] Set up video metadata for tracking and analytics
- [ ] Implement video duration and quality information
- [ ] Configure video preloading strategy for smooth transitions
- [ ] Set up error handling for missing or corrupt video files

### Phase 3: State Management & Video Player Setup
- [ ] Initialize currentVideoIndex state for tracking active video
- [ ] Set up currentVideoSource state for active video content
- [ ] Configure isCardExpanded state for reading card visibility
- [ ] Set up scrollY state for scroll position tracking
- [ ] Initialize touchStart state for gesture detection
- [ ] Configure isCardGestureActive state for gesture coordination
- [ ] Set up animation refs (cardHeight, cardOpacity, cardTranslateY)
- [ ] Initialize component refs (scrollViewRef, scrollViewGestureRef, panGestureRef)
- [ ] Configure modern expo-video player with useVideoPlayer hook
- [ ] Set up video player options (loop: true, autoplay on index change)
- [ ] Implement video source updates when currentVideoIndex changes
- [ ] Configure video player cleanup on component unmount

### Phase 4: SwiftUI Layout Constants Implementation
- [ ] Define EXACT header measurements (headerHeight: 70, headerHorizontalPadding: 20)
- [ ] Configure precise video container dimensions (height: screenHeight * 0.6, cornerRadius: 20)
- [ ] Set up video overlay specifications (overlayPadding: 16, captionFontSize: 14)
- [ ] Define navigation controls measurements (navigationControlsHeight: 60, navButtonSize: 40)
- [ ] Configure reading card dimensions (collapsedHeight: 160, expandedHeight: screenHeight * 0.85)
- [ ] Set up animation timing constants (cardAnimationDuration: 300ms, springTension: 100)
- [ ] Define shadow specifications (shadowRadius: 8, shadowOpacity: 0.1, shadowOffset: 4)
- [ ] Configure cross-platform adjustments (androidElevation: 8, iosOnlyShadow)
- [ ] Set up platform-specific scroll behavior and status bar handling
- [ ] Calculate dynamic dimensions based on screen size and platform

### Phase 5: Video Carousel Navigation System
- [ ] Implement horizontal ScrollView with paging enabled
- [ ] Configure scrollEventThrottle: 16 for smooth 60fps tracking
- [ ] Set up handleScroll function with proper video index calculation
- [ ] Implement video index bounds checking (0 to mediaContents.length - 1)
- [ ] Add haptic feedback for video transitions (Haptics.ImpactFeedbackStyle.Light)
- [ ] Configure scroll coordination with card gesture state
- [ ] Implement programmatic navigation (handleSwipeNext, handleSwipePrevious)
- [ ] Set up smooth scroll animations with proper timing
- [ ] Add scroll position validation and error handling
- [ ] Configure scroll behavior for different content lengths
- [ ] Test carousel navigation with various video counts
- [ ] Verify smooth transitions between video content

### Phase 6: Modern expo-video Implementation
- [ ] Configure useVideoPlayer hook with currentVideoSource.videoUrl
- [ ] Set up video player options (loop: true, autoplay behavior)
- [ ] Implement VideoView component with proper styling
- [ ] Configure video player props (allowsFullscreen: false, allowsPictureInPicture: false)
- [ ] Set up video source updates when carousel index changes
- [ ] Implement video loading states and error handling
- [ ] Add video player cleanup on component unmount
- [ ] Configure video quality settings for optimal performance
- [ ] Set up video buffering and preloading strategies
- [ ] Implement video player event handling (onLoad, onError, onEnd)
- [ ] Add video playback controls coordination
- [ ] Test video performance across different devices

### Phase 7: Video Overlay & Caption System
- [ ] Implement video overlay with proper positioning (position: 'absolute', bottom: 0)
- [ ] Configure overlay background (backgroundColor: 'rgba(0,0,0,0.7)')
- [ ] Set up overlay padding (padding: 16px) for content spacing
- [ ] Implement caption text with proper typography (fontSize: 14, lineHeight: 20)
- [ ] Configure caption color (color: 'white') for visibility
- [ ] Set up dynamic caption content based on currentVideoSource
- [ ] Implement caption text wrapping and line height
- [ ] Add caption fade-in animations for smooth transitions
- [ ] Configure caption accessibility with proper ARIA labels
- [ ] Test caption visibility across different video content
- [ ] Verify caption positioning on various screen sizes
- [ ] Implement caption truncation for very long text

### Phase 8: Navigation Controls Implementation
- [ ] Create navigation controls section with proper layout
- [ ] Implement previous button with chevron-back icon
- [ ] Set up next button with chevron-forward icon
- [ ] Configure navigation counter text ("X of Y" format)
- [ ] Add button disabled states for first/last videos
- [ ] Implement button press handlers with haptic feedback
- [ ] Set up button styling with shadows and proper touch targets
- [ ] Configure button accessibility with proper labels
- [ ] Add button press animations with scale effects
- [ ] Implement navigation button color changes based on state
- [ ] Test navigation controls with various video counts
- [ ] Verify navigation button responsiveness and feedback

### Phase 9: Expandable Reading Card System
- [ ] Implement PanGestureHandler for card expansion gestures
- [ ] Configure simultaneous handlers with scrollView gesture coordination
- [ ] Set up card animation system with Animated.Value refs
- [ ] Implement card expansion logic with proper bounds checking
- [ ] Configure card collapse functionality with smooth animations
- [ ] Set up gesture state management (isCardGestureActive)
- [ ] Implement card content with proper typography and spacing
- [ ] Add card drag handle with visual feedback
- [ ] Configure card background and shadow effects
- [ ] Set up card scroll behavior for content overflow
- [ ] Test gesture coordination between card and carousel
- [ ] Verify card animations are smooth and responsive

### Phase 10: Background Music Integration
- [ ] Configure useBackgroundMusic hook with proper audio URL
- [ ] Set up background music options (volume: 0.4, shouldLoop: true)
- [ ] Implement audio cleanup on component unmount
- [ ] Configure audio volume balancing with video audio
- [ ] Set up audio state management and error handling
- [ ] Implement audio fade-in/fade-out transitions
- [ ] Add audio loading states and fallback behavior
- [ ] Configure audio interruption handling (calls, other apps)
- [ ] Test audio performance across different devices
- [ ] Verify audio doesn't conflict with video playback
- [ ] Implement audio debugging and logging
- [ ] Test audio memory management and cleanup

### Phase 11: Cross-Platform Gesture Handling
- [ ] Configure iOS-specific PanGestureHandler implementation
- [ ] Set up Android-compatible touch event handling
- [ ] Implement gesture state coordination between components
- [ ] Configure simultaneous gesture recognition
- [ ] Set up gesture conflict resolution (card vs carousel)
- [ ] Implement platform-specific gesture thresholds
- [ ] Add gesture velocity and direction detection
- [ ] Configure gesture animation timing per platform
- [ ] Test gestures on both iOS and Android devices
- [ ] Verify gesture responsiveness and smoothness
- [ ] Implement gesture debugging and performance monitoring
- [ ] Test gesture behavior during video playback

### Phase 12: Animation & Visual Effects System
- [ ] Implement spring animations for card transitions (tension: 100, friction: 8)
- [ ] Configure fade animations for video transitions
- [ ] Set up scale animations for button interactions
- [ ] Implement smooth scroll animations for carousel navigation
- [ ] Configure shadow animations for depth effects
- [ ] Set up loading animations for video content
- [ ] Implement hover states and touch feedback
- [ ] Configure animation performance optimization
- [ ] Add animation debugging and performance monitoring
- [ ] Test animations across different device performance levels
- [ ] Verify animation timing and easing curves
- [ ] Implement animation cleanup and memory management

### Phase 13: Performance Optimization & Memory Management
- [ ] Implement video preloading for adjacent videos
- [ ] Configure memory-efficient video loading strategies
- [ ] Set up video player cleanup and resource management
- [ ] Implement image and video caching optimization
- [ ] Configure efficient re-rendering with React.memo
- [ ] Set up proper component cleanup on unmount
- [ ] Implement memory usage monitoring and warnings
- [ ] Configure video quality adjustment based on device performance
- [ ] Set up efficient state updates and minimized re-renders
- [ ] Implement background task management for preloading
- [ ] Test memory usage during extended carousel sessions
- [ ] Verify performance on low-end devices

### Phase 14: Error Handling & Edge Cases
- [ ] Implement video loading error handling with fallback states
- [ ] Configure network error handling for video streaming
- [ ] Set up timeout handling for slow video loading
- [ ] Implement graceful degradation for missing videos
- [ ] Configure error boundaries for component crash prevention
- [ ] Set up video format validation and error reporting
- [ ] Implement carousel state recovery from interruptions
- [ ] Configure proper error messages and user feedback
- [ ] Add retry mechanisms for failed video loads
- [ ] Set up error logging and analytics tracking
- [ ] Test error scenarios and recovery mechanisms
- [ ] Verify app stability during error conditions

### Phase 15: Testing & Quality Assurance
- [ ] Test video carousel with various content lengths (1-10 videos)
- [ ] Verify smooth video transitions and loading performance
- [ ] Test gesture coordination between carousel and reading card
- [ ] Validate background music integration and volume balancing
- [ ] Test cross-platform behavior on iOS and Android devices
- [ ] Verify haptic feedback works on all supported devices
- [ ] Test video playback quality and performance optimization
- [ ] Validate accessibility features and screen reader support
- [ ] Test carousel behavior during app backgrounding/foregrounding
- [ ] Verify memory management during extended usage
- [ ] Test network interruption handling and recovery
- [ ] Validate video URL patterns and AWS CloudFront integration
- [ ] Test animation performance and smoothness
- [ ] Verify component cleanup and resource management
- [ ] Conduct comprehensive user experience testing

## 📚 Usage Examples

This lesson type is perfect for:
- **Video series content** with related but distinct segments
- **Historical sequences** showing progression or development
- **Market scenes** with different aspects or locations
- **Cultural activities** demonstrated through multiple videos
- **Any content** requiring multiple video perspectives on a topic

## 🔧 Customization Options

- Add video progress indicators for each video in the series
- Implement video preloading for smoother transitions
- Customize video overlay positioning and styling
- Add video thumbnails in navigation controls
- Implement video quality selection options
- Add video duration indicators

## ⚠️ Important Notes

- **expo-video Performance**: Only load video player for the currently active video
- **Memory Management**: Implement proper cleanup for video players
- **Gesture Coordination**: Use `isCardGestureActive` to prevent scroll conflicts
- **AWS CloudFront**: Use structured URL format for consistent loading
- **Platform Testing**: Test video playback on both iOS and Android devices
- **Background Audio**: Balance background music volume with video audio

## 💡 Advanced Features - Professional Video Carousel Extensions

### Video Preloading System
```typescript
// Advanced video preloading for smoother transitions
interface VideoPreloadManager {
  preloadedVideos: Set<string>;
  preloadQueue: string[];
  maxPreloadCount: number;
}

const useVideoPreloading = (mediaContents: MediaContent[], currentIndex: number) => {
  const [preloadManager, setPreloadManager] = useState<VideoPreloadManager>({
    preloadedVideos: new Set(),
    preloadQueue: [],
    maxPreloadCount: 3
  });

  const preloadAdjacentVideos = useCallback((currentIndex: number) => {
    const indicesToPreload = [];

    // Preload previous video
    if (currentIndex > 0) {
      indicesToPreload.push(currentIndex - 1);
    }

    // Preload next video
    if (currentIndex < mediaContents.length - 1) {
      indicesToPreload.push(currentIndex + 1);
    }

    // Preload video after next for smooth experience
    if (currentIndex < mediaContents.length - 2) {
      indicesToPreload.push(currentIndex + 2);
    }

    indicesToPreload.forEach(index => {
      const videoUrl = mediaContents[index]?.videoUrl;
      if (videoUrl && !preloadManager.preloadedVideos.has(videoUrl)) {
        preloadVideo(videoUrl);
      }
    });
  }, [mediaContents, preloadManager]);

  const preloadVideo = async (videoUrl: string) => {
    try {
      // Create video player instance for preloading
      const preloadPlayer = useVideoPlayer(videoUrl);

      // Add to preloaded set when loaded
      setPreloadManager(prev => ({
        ...prev,
        preloadedVideos: new Set([...prev.preloadedVideos, videoUrl])
      }));

      console.log(`[VideoCarousel] Preloaded video: ${videoUrl}`);
    } catch (error) {
      console.warn(`[VideoCarousel] Failed to preload video: ${videoUrl}`, error);
    }
  };

  return { preloadAdjacentVideos, preloadedVideos: preloadManager.preloadedVideos };
};
```

### Video Status Tracking & Analytics
```typescript
// Comprehensive video status tracking
interface VideoAnalytics {
  videoId: string;
  loadTime: number;
  playTime: number;
  completionRate: number;
  qualityMetrics: {
    resolution: string;
    bitrate: number;
    bufferHealth: number;
  };
}

const useVideoAnalytics = () => {
  const [analytics, setAnalytics] = useState<Map<string, VideoAnalytics>>(new Map());

  const trackVideoLoad = (videoUrl: string, loadStartTime: number) => {
    const loadTime = Date.now() - loadStartTime;

    setAnalytics(prev => {
      const newAnalytics = new Map(prev);
      const existing = newAnalytics.get(videoUrl) || {
        videoId: videoUrl,
        loadTime: 0,
        playTime: 0,
        completionRate: 0,
        qualityMetrics: { resolution: '', bitrate: 0, bufferHealth: 0 }
      };

      newAnalytics.set(videoUrl, {
        ...existing,
        loadTime
      });

      return newAnalytics;
    });

    // Track load performance
    if (loadTime > 3000) {
      console.warn(`[VideoCarousel] Slow video load: ${loadTime}ms for ${videoUrl}`);
    }
  };

  const trackVideoProgress = (videoUrl: string, progress: number, duration: number) => {
    const completionRate = Math.round((progress / duration) * 100);

    setAnalytics(prev => {
      const newAnalytics = new Map(prev);
      const existing = newAnalytics.get(videoUrl);

      if (existing) {
        newAnalytics.set(videoUrl, {
          ...existing,
          playTime: progress,
          completionRate
        });
      }

      return newAnalytics;
    });
  };

  return { analytics, trackVideoLoad, trackVideoProgress };
};
```

### Adaptive Video Quality
```typescript
// Dynamic video quality adjustment
interface QualityLevel {
  label: string;
  resolution: string;
  bitrate: number;
  urlSuffix: string;
}

const VIDEO_QUALITY_LEVELS: QualityLevel[] = [
  { label: 'Auto', resolution: 'auto', bitrate: 0, urlSuffix: '' },
  { label: '1080p', resolution: '1920x1080', bitrate: 5000, urlSuffix: '_1080p' },
  { label: '720p', resolution: '1280x720', bitrate: 2500, urlSuffix: '_720p' },
  { label: '480p', resolution: '854x480', bitrate: 1000, urlSuffix: '_480p' }
];

const useAdaptiveQuality = () => {
  const [selectedQuality, setSelectedQuality] = useState<QualityLevel>(VIDEO_QUALITY_LEVELS[0]);
  const [networkSpeed, setNetworkSpeed] = useState<number>(0);

  const getOptimalQuality = useCallback((baseUrl: string) => {
    if (selectedQuality.label === 'Auto') {
      // Auto-select based on network conditions
      if (networkSpeed > 5000) return baseUrl + '_1080p.mp4';
      if (networkSpeed > 2500) return baseUrl + '_720p.mp4';
      return baseUrl + '_480p.mp4';
    }

    return baseUrl + selectedQuality.urlSuffix + '.mp4';
  }, [selectedQuality, networkSpeed]);

  return { selectedQuality, setSelectedQuality, getOptimalQuality };
};
```

### Video Gesture Controls
```typescript
// Advanced gesture controls for video interaction
const useVideoGestures = (videoPlayer: any) => {
  const [gestureState, setGestureState] = useState({
    isDoubleTapEnabled: true,
    isPinchToZoomEnabled: false,
    isSwipeToSeekEnabled: true
  });

  const handleDoubleTap = useCallback(() => {
    if (!gestureState.isDoubleTapEnabled) return;

    // Toggle play/pause on double tap
    if (videoPlayer.playing) {
      videoPlayer.pause();
    } else {
      videoPlayer.play();
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [videoPlayer, gestureState.isDoubleTapEnabled]);

  const handleSwipeToSeek = useCallback((direction: 'left' | 'right', velocity: number) => {
    if (!gestureState.isSwipeToSeekEnabled) return;

    const seekAmount = Math.min(velocity * 0.01, 10); // Max 10 second seek
    const currentTime = videoPlayer.currentTime || 0;

    if (direction === 'right') {
      videoPlayer.seekTo(currentTime + seekAmount);
    } else {
      videoPlayer.seekTo(Math.max(0, currentTime - seekAmount));
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [videoPlayer, gestureState.isSwipeToSeekEnabled]);

  return { handleDoubleTap, handleSwipeToSeek, gestureState, setGestureState };
};
```

### Background Sync & Offline Support
```typescript
// Offline video caching and background sync
const useOfflineVideoSupport = (mediaContents: MediaContent[]) => {
  const [cachedVideos, setCachedVideos] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Map<string, number>>(new Map());

  const cacheVideoForOffline = async (videoUrl: string) => {
    try {
      setDownloadProgress(prev => new Map(prev).set(videoUrl, 0));

      // Implement video caching logic
      const response = await fetch(videoUrl);
      const blob = await response.blob();

      // Store in device cache
      // Implementation depends on chosen caching strategy

      setCachedVideos(prev => new Set([...prev, videoUrl]));
      setDownloadProgress(prev => {
        const newMap = new Map(prev);
        newMap.delete(videoUrl);
        return newMap;
      });

      console.log(`[VideoCarousel] Cached video for offline: ${videoUrl}`);
    } catch (error) {
      console.error(`[VideoCarousel] Failed to cache video: ${videoUrl}`, error);
      setDownloadProgress(prev => {
        const newMap = new Map(prev);
        newMap.delete(videoUrl);
        return newMap;
      });
    }
  };

  const getCachedVideoUrl = (originalUrl: string): string => {
    if (cachedVideos.has(originalUrl)) {
      // Return local cached URL
      return `file://cached_videos/${encodeURIComponent(originalUrl)}`;
    }
    return originalUrl;
  };

  return { cacheVideoForOffline, getCachedVideoUrl, cachedVideos, downloadProgress };
};
```

### Accessibility Enhancements
```typescript
// Comprehensive accessibility features
const useVideoAccessibility = (mediaContents: MediaContent[], currentIndex: number) => {
  const [accessibilitySettings, setAccessibilitySettings] = useState({
    audioDescriptions: false,
    hapticFeedback: true,
    largeText: false,
    highContrast: false,
    reduceMotion: false
  });

  const announceVideoChange = useCallback((newIndex: number) => {
    const currentVideo = mediaContents[newIndex];
    if (currentVideo) {
      const announcement = `Video ${newIndex + 1} of ${mediaContents.length}: ${currentVideo.caption}`;

      // Use accessibility API to announce content
      AccessibilityInfo.announceForAccessibility(announcement);
    }
  }, [mediaContents]);

  const getAccessibilityProps = (type: 'video' | 'navigation' | 'card') => {
    const baseProps = {
      accessible: true,
      accessibilityRole: type === 'video' ? 'button' : type === 'navigation' ? 'button' : 'region'
    };

    switch (type) {
      case 'video':
        return {
          ...baseProps,
          accessibilityLabel: `Video ${currentIndex + 1}: ${mediaContents[currentIndex]?.caption}`,
          accessibilityHint: 'Double tap to play or pause video'
        };
      case 'navigation':
        return {
          ...baseProps,
          accessibilityLabel: 'Video navigation',
          accessibilityHint: 'Swipe to navigate between videos'
        };
      case 'card':
        return {
          ...baseProps,
          accessibilityLabel: 'Reading content',
          accessibilityHint: 'Swipe up to expand reading material'
        };
      default:
        return baseProps;
    }
  };

  return { accessibilitySettings, announceVideoChange, getAccessibilityProps };
};
```

## 🚀 Performance Benchmarks & Quality Standards

### Target Performance Metrics
- **Video Load Time**: < 2 seconds for 1080p content over 4G
- **Carousel Scroll Response**: < 16ms (60fps) for smooth navigation
- **Video Transition Time**: < 500ms between carousel items
- **Memory Usage**: < 200MB peak during carousel session
- **Battery Impact**: < 5% per 10-minute carousel session
- **Network Efficiency**: < 50MB for 5-video carousel (auto quality)
- **Gesture Response**: < 100ms from touch to visual feedback

### Quality Assurance Standards
- **Video Playback**: 99.9% success rate across supported formats
- **Cross-Platform Parity**: Identical behavior on iOS/Android/Web
- **Accessibility Compliance**: WCAG 2.1 AA standard adherence
- **Network Resilience**: Graceful handling of 3G/4G/WiFi transitions
- **Error Recovery**: Automatic retry for failed video loads
- **Memory Stability**: Zero memory leaks during extended usage

### AWS CloudFront Integration Standards
- **URL Pattern**: `https://dzyjrzj2lngmg.cloudfront.net/carouselvideos/Adv{N}_M{N}_Media{N}_Video{N}.mp4`
- **Quality Variants**: `_1080p.mp4`, `_720p.mp4`, `_480p.mp4` suffixes
- **Cache Headers**: 24-hour cache for video content
- **Edge Optimization**: Global CDN distribution for low latency
- **Bandwidth Optimization**: Adaptive bitrate streaming support

## 🛡️ Error Handling & Recovery Strategies

### Video Loading Error Handling
```typescript
const handleVideoError = (error: any, videoUrl: string) => {
  console.error(`[VideoCarousel] Video load failed: ${videoUrl}`, error);

  // Attempt quality fallback
  if (videoUrl.includes('_1080p')) {
    const fallbackUrl = videoUrl.replace('_1080p', '_720p');
    console.log(`[VideoCarousel] Attempting 720p fallback: ${fallbackUrl}`);
    return fallbackUrl;
  }

  if (videoUrl.includes('_720p')) {
    const fallbackUrl = videoUrl.replace('_720p', '_480p');
    console.log(`[VideoCarousel] Attempting 480p fallback: ${fallbackUrl}`);
    return fallbackUrl;
  }

  // Final fallback to placeholder or error state
  return null;
};
```

### Network Connectivity Handling
```typescript
const useNetworkAwareLoading = () => {
  const [networkState, setNetworkState] = useState({
    isConnected: true,
    connectionType: 'wifi',
    isExpensive: false
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetworkState({
        isConnected: state.isConnected ?? false,
        connectionType: state.type,
        isExpensive: state.details?.isConnectionExpensive ?? false
      });
    });

    return unsubscribe;
  }, []);

  const shouldPreloadVideos = useMemo(() => {
    return networkState.isConnected &&
           networkState.connectionType === 'wifi' &&
           !networkState.isExpensive;
  }, [networkState]);

  return { networkState, shouldPreloadVideos };
};
```

## 📱 Cross-Platform Implementation Notes

### iOS-Specific Optimizations
- Use `PanGestureHandler` for smooth card expansion gestures
- Implement proper `SafeAreaView` handling for notched devices
- Configure haptic feedback with `ImpactFeedbackStyle.Light`
- Optimize video player for iOS hardware acceleration

### Android-Specific Considerations
- Use `elevation` property instead of shadow for card depth
- Configure proper `StatusBar` handling with system UI visibility
- Implement alternative gesture handling for devices without gesture support
- Test video performance across various Android hardware configurations

### Web Platform Adaptations
- Implement mouse/keyboard navigation alternatives
- Configure proper video controls for desktop browsers
- Adapt gesture handling for touch and mouse interactions
- Ensure responsive design for various screen sizes

---

*Reference Implementation: `Adventure1_Module3_Lesson2.tsx`*
*Component Dependencies: expo-video, useBackgroundMusic hook, ArchivesTheme, react-native-gesture-handler*
*AWS CloudFront Pattern: carouselvideos/Adv{N}_M{N}_Media{N}_Video{N}.mp4*
*Performance Target: 60fps interactions, <2s load times, offline-capable*
*Quality Standard: WCAG 2.1 AA accessibility, 99.9% video playback success*