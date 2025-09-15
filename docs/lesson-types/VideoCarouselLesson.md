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

## 📐 Layout Constants

```typescript
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get(
  Platform.OS === 'android' ? "screen" : "window"
);

const COLLAPSED_HEIGHT = 160;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.85;
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

## 🚀 Implementation Checklist

- [ ] Import all required dependencies including `useVideoPlayer` from expo-video
- [ ] Structure video content array with AWS CloudFront URLs
- [ ] Set up component interface with proper props
- [ ] Initialize state variables for carousel and video management
- [ ] Implement modern expo-video player with useVideoPlayer hook
- [ ] Create horizontal ScrollView with paging enabled
- [ ] Add video overlays with contextual captions
- [ ] Implement navigation controls with proper state management
- [ ] Set up background music integration with cleanup
- [ ] Add cross-platform gesture handling for expandable card
- [ ] Include haptic feedback for navigation interactions
- [ ] Test video loading and playback across platforms
- [ ] Verify gesture coordination between carousel and card
- [ ] Apply consistent styling with ArchivesTheme

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

## 💡 Advanced Features

### Video Preloading (Optional)
```typescript
// Preload next/previous videos for smoother transitions
const preloadAdjacentVideos = (currentIndex: number) => {
  const nextIndex = currentIndex + 1;
  const prevIndex = currentIndex - 1;

  if (nextIndex < mediaContents.length) {
    // Preload next video
  }
  if (prevIndex >= 0) {
    // Preload previous video
  }
};
```

### Video Status Tracking
```typescript
// Track video playback status
const handleVideoStatusUpdate = (status: any) => {
  if (status.isLoaded) {
    // Handle video loaded state
  }
};
```

---

*Reference Implementation: `Adventure1_Module3_Lesson2.tsx`*
*Component Dependencies: expo-video, useBackgroundMusic hook, ArchivesTheme*
*AWS CloudFront Pattern: carouselvideos/Adv{N}_M{N}_Media{N}_Video{N}.mp4*