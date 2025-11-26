// ROIReelLesson.tsx - Reusable Reel lesson component for Rise of Islam
// Accepts data from adventures.content_list and injects dynamically
// Full-screen video lesson with ultra-smooth progress tracking

import ArchivesTheme from "@/constants/ArchivesTheme";
import { Ionicons } from "@expo/vector-icons";
import { AVPlaybackStatus } from "expo-av";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import {
  ScrollView as GestureHandlerScrollView,
  PanGestureHandler,
  TapGestureHandler,
  State,
  GestureHandlerRootView
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LessonPlayer from "../modules/LessonPlayer";
import LoadingOverlay from "./LoadingOverlay";
import type { ContentItem } from "./types";
import RenderHtml from 'react-native-render-html';
import { ROI_LESSON_CONSTANTS } from "./ROILessonConstants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WALKTHROUGH_KEYS } from "@/constants/WalkthroughKeys";
import { Image } from "expo-image";
import { useLessonTracking } from "@/hooks/useLessonTracking";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

// Card Height Constants (responsive to screen size)
const COLLAPSED_HEIGHT = SCREEN_HEIGHT * ROI_LESSON_CONSTANTS.READING_CARD.COLLAPSED_HEIGHT_RATIO;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * ROI_LESSON_CONSTANTS.READING_CARD.EXPANDED_HEIGHT_RATIO;

// Animation Constants
const PROGRESS_ANIMATION_DURATION = 50;
const CARD_ANIMATION_TENSION = ROI_LESSON_CONSTANTS.READING_CARD.ANIMATION_TENSION;
const CARD_ANIMATION_FRICTION = ROI_LESSON_CONSTANTS.READING_CARD.ANIMATION_FRICTION;
const VIDEO_COMPLETION_THRESHOLD = 0.95;
const PROGRESS_SENSITIVITY = 0.0005;

// Button Dimensions
const BUTTON_SIZE = 40;
const BUTTON_RADIUS = 20;
const CARD_HANDLE_WIDTH = 70;
const CARD_HANDLE_HEIGHT = 5;

interface ROIReelLessonProps {
  contentItem: ContentItem;  // Data from adventures.content_list
  adventureId: string;       // e.g., "roi_adventure_1"
  moduleId: string;          // e.g., "ROI_Adv1_M1"
  lessonId: string;          // e.g., "lesson1"
  onContinue: () => void;
  onDismiss: () => void;
}

export default function ROIReelLesson({
  contentItem,
  adventureId,
  moduleId,
  lessonId,
  onContinue,
  onDismiss,
}: ROIReelLessonProps) {
  // Safe area insets for proper button positioning
  const insets = useSafeAreaInsets();

  // Extract adventure number from adventureId (e.g., "roi_adventure_1" → 1)
  const adventureNumber = parseInt(adventureId.split('_')[2] || '0', 10);
  const moduleNumber = contentItem.order_by || 0;

  // Analytics tracking
  const {
    trackVideoPlay,
    trackVideoPause,
    trackVideoComplete,
    trackCardExpanded,
    trackLessonComplete,
  } = useLessonTracking({
    adventureId,
    moduleId,
    lessonId,
    lessonType: "reel",
    lessonTitle: contentItem.thumbnail_title || "Unknown",
    screenUrl: `/roi/${adventureId}/${moduleId}/${lessonId}`,
    eraId: 2,
    eraName: "riseOfIslam",
    adventureNumber,
    moduleNumber,
    screen: `ROI Lesson - ${adventureId} ${lessonId}`,
  });

  // Video-related states
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [hasVideoCompleted, setHasVideoCompleted] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  // Reading card states
  const [hasFinishedReading, setHasFinishedReading] = useState(true);
  const [isCardExpanded, setIsCardExpanded] = useState(false);

  // Walkthrough hint states
  const [walkthroughEnabled, setWalkthroughEnabled] = useState(false);
  const [showReadHint, setShowReadHint] = useState(false);
  const [showContinueHint, setShowContinueHint] = useState(false);
  const [hasEverExpandedCard, setHasEverExpandedCard] = useState(false);

  // Component refs for gesture coordination
  const scrollViewGestureRef = useRef(null);
  const panGestureRef = useRef(null);
  const tapGestureRef = useRef(null);
  const horizontalSwipeRef = useRef(null);

  // Animation refs
  const cardHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;
  const progressBarWidth = useRef(new Animated.Value(0)).current;

  // Progress tracking ref
  const lastProgress = useRef(0);

  // Extract video URL from media_url array (first item)
  const videoUrl = contentItem.media_url?.[0] || '';

  // Check if user has seen reel walkthrough before
  useEffect(() => {
    const checkWalkthrough = async () => {
      try {
        const hasSeenReel = await AsyncStorage.getItem(WALKTHROUGH_KEYS.REEL);
        if (hasSeenReel !== 'true') {
          setWalkthroughEnabled(true);
          console.log('👁️ Reel walkthrough enabled - first time');
        } else {
          console.log('👁️ Reel walkthrough disabled - already seen');
        }
      } catch (error) {
        console.error('❌ Error checking reel walkthrough:', error);
      }
    };
    checkWalkthrough();
  }, []);

  // Percentage-based hint timing
  useEffect(() => {
    if (!walkthroughEnabled || hasEverExpandedCard) return;

    // Read hint triggers: 20-30%, 50-60%, 95%+ (10% duration)
    if ((videoProgress >= 0.20 && videoProgress < 0.30) ||
        (videoProgress >= 0.50 && videoProgress < 0.60) ||
        (videoProgress >= 0.95)) {
      if (!showReadHint) {
        setShowReadHint(true);
        console.log(`👁️ Read hint shown at ${Math.round(videoProgress * 100)}%`);
      }
    } else {
      if (showReadHint) {
        setShowReadHint(false);
        console.log(`👁️ Read hint hidden at ${Math.round(videoProgress * 100)}%`);
      }
    }

    // Continue hint triggers: 30-40%, 60-70%, 100%+ (10% duration)
    if ((videoProgress >= 0.30 && videoProgress < 0.40) ||
        (videoProgress >= 0.60 && videoProgress < 0.70) ||
        (videoProgress >= 1.0)) {
      if (!showContinueHint) {
        setShowContinueHint(true);
        console.log(`👁️ Continue hint shown at ${Math.round(videoProgress * 100)}%`);
      }
    } else {
      if (showContinueHint && videoProgress < 1.0) {
        setShowContinueHint(false);
        console.log(`👁️ Continue hint hidden at ${Math.round(videoProgress * 100)}%`);
      }
    }
  }, [videoProgress, walkthroughEnabled, hasEverExpandedCard, showReadHint, showContinueHint]);

  // Hide both hints when card expands
  useEffect(() => {
    if (isCardExpanded && !hasEverExpandedCard) {
      setShowReadHint(false);
      setShowContinueHint(false);
      setHasEverExpandedCard(true);
      console.log('👁️ Both hints hidden - card expanded');
    }
  }, [isCardExpanded, hasEverExpandedCard]);

  // Ultra-Smooth Video Progress System
  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      if (!isVideoLoaded) {
        setIsVideoLoaded(true);
      }

      if (status.durationMillis && status.positionMillis) {
        const progress = status.positionMillis / status.durationMillis;
        setVideoProgress(progress);

        const progressDiff = Math.abs(progress - lastProgress.current);
        if (progressDiff > PROGRESS_SENSITIVITY) {
          lastProgress.current = progress;

          Animated.timing(progressBarWidth, {
            toValue: progress,
            duration: PROGRESS_ANIMATION_DURATION,
            useNativeDriver: false,
          }).start();
        }

        if (progress >= VIDEO_COMPLETION_THRESHOLD && !hasVideoCompleted) {
          setHasVideoCompleted(true);
          // Track video completion
          if (status.durationMillis) {
            trackVideoComplete(Math.floor(status.durationMillis / 1000));
          }
          triggerCardPopAnimation();
        }
      }
    }
  };

  // Card Pop Animation
  const triggerCardPopAnimation = () => {
    Animated.sequence([
      Animated.spring(cardTranslateY, {
        toValue: -20,
        useNativeDriver: true,
        tension: 120,
        friction: 7,
      }),
      Animated.spring(cardTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: CARD_ANIMATION_TENSION,
        friction: CARD_ANIMATION_FRICTION,
      }),
    ]).start();

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Lesson Completion Logic
  const handleContinue = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Track lesson completion
    trackLessonComplete();

    // Save walkthrough flag when user completes lesson
    try {
      await AsyncStorage.setItem(WALKTHROUGH_KEYS.REEL, 'true');
      console.log('✅ Reel walkthrough marked as seen');
    } catch (error) {
      console.error('❌ Error saving reel walkthrough flag:', error);
    }

    console.log(`🔄 Continue button pressed - ${moduleId} ${lessonId}`);
    onContinue();
  };

  // Tap Gesture Handler (cross-platform)
  const handleTapGesture = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      console.log('👆 Tap detected on reading card');
      if (isCardExpanded) {
        collapseCard();
      } else {
        expandCard();
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Swipe Gesture Handler (cross-platform)
  const handleSwipeGesture = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationY, velocityY } = event.nativeEvent;

      const minDistance = ROI_LESSON_CONSTANTS.GESTURES.MIN_SWIPE_DISTANCE;
      const minVelocity = ROI_LESSON_CONSTANTS.GESTURES.MIN_SWIPE_VELOCITY;

      if (!isCardExpanded &&
          (translationY < -minDistance || velocityY < -minVelocity)) {
        console.log('👆 Swipe up detected - expanding card');
        expandCard();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      else if (isCardExpanded &&
               (translationY > minDistance || velocityY > minVelocity)) {
        console.log('👇 Swipe down detected - collapsing card');
        collapseCard();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  // Horizontal Swipe Gesture Handler (for navigation)
  const handleHorizontalSwipe = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;

      const minDistance = 50;  // Minimum swipe distance
      const minVelocity = 500; // Minimum swipe velocity

      // Swipe right -> Continue (next lesson)
      if (hasFinishedReading && translationX > minDistance && velocityX > minVelocity) {
        console.log('👉 Swipe right detected - continuing to next');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        handleContinue();
      }
      // Swipe left -> Go back (dismiss)
      else if (translationX < -minDistance && velocityX < -minVelocity) {
        console.log('👈 Swipe left detected - going back');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onDismiss();
      }
    }
  };

  // Card Expansion Logic
  const expandCard = () => {
    setIsCardExpanded(true);

    // Track reading card expansion
    trackCardExpanded();

    if (!hasFinishedReading) {
      setHasFinishedReading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    Animated.parallel([
      Animated.spring(cardHeight, {
        toValue: EXPANDED_HEIGHT,
        useNativeDriver: false,
        tension: CARD_ANIMATION_TENSION,
        friction: CARD_ANIMATION_FRICTION,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  };

  // Card Collapse Logic
  const collapseCard = () => {
    setIsCardExpanded(false);

    Animated.parallel([
      Animated.spring(cardHeight, {
        toValue: COLLAPSED_HEIGHT,
        useNativeDriver: false,
        tension: CARD_ANIMATION_TENSION,
        friction: CARD_ANIMATION_FRICTION,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  };

  // Handle reading scroll
  const handleReadingScroll = () => {
    // Optional: track reading progress
  };

  // Reading Card Structure
  const renderReadingCard = () => (
    <Animated.View style={[
      styles.cardContainer,
      { transform: [{ translateY: cardTranslateY }] }
    ]}>
      <Animated.View style={[
        styles.readingCard,
        { height: cardHeight }
      ]}>
        {/* Card Handle */}
        <View style={styles.cardHandle} />

        {/* Collapsed Content */}
        <Animated.View style={[
          styles.collapsedContent,
          { opacity: cardOpacity }
        ]}>
          <TouchableOpacity
            onPress={expandCard}
            activeOpacity={0.8}
            disabled={isCardExpanded}
          >
            <View style={styles.readingCardHeader}>
              <Text style={styles.cardTitle}>
                {contentItem.thumbnail_title || 'Content'}
              </Text>
              <Text style={styles.cardSubtitle} numberOfLines={2}>
                {contentItem.bottom_content?.reading_text?.replace(/<[^>]*>/g, '').substring(0, 100) || ''}...
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Expanded Content */}
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
              <View style={styles.expandedContentInner}>
                {/* Title Section */}
                <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                  <View style={styles.titleSection}>
                    <Text style={styles.sheetTitle}>
                      {contentItem.thumbnail_title || 'Content'}
                    </Text>
                    <Text style={styles.sheetSubtitle}>
                      Reel • {contentItem.order_by}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* HTML Content Rendering */}
                {contentItem.bottom_content?.reading_text && (
                  <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                    <View style={styles.historicalSection}>
                      <RenderHtml
                        contentWidth={SCREEN_WIDTH - 40}
                        source={{ html: contentItem.bottom_content.reading_text }}
                        tagsStyles={{
                          body: { color: 'white', fontFamily: 'DM Sans', fontSize: 14, lineHeight: 20 },
                          h1: { color: 'white', fontFamily: 'DM Sans', fontSize: 24, fontWeight: '700', marginBottom: 12 },
                          h2: { color: 'white', fontFamily: 'DM Sans', fontSize: 20, fontWeight: '700', marginBottom: 10 },
                          h3: { color: 'white', fontFamily: 'DM Sans', fontSize: 18, fontWeight: '600', marginBottom: 8 },
                          p: { color: 'white', fontFamily: 'DM Sans', fontSize: 14, lineHeight: 20, marginBottom: 12 },
                          strong: { fontWeight: '600', color: 'white' },
                          em: { fontStyle: 'italic', color: 'white' },
                          ul: { marginBottom: 12 },
                          li: { color: 'white', fontFamily: 'DM Sans', fontSize: 14, lineHeight: 20, marginBottom: 6 },
                          blockquote: { borderLeftWidth: 3, borderLeftColor: ArchivesTheme.colors.persianOrange, paddingLeft: 12, marginBottom: 12, fontStyle: 'italic' },
                          hr: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)', marginVertical: 16 },
                        }}
                      />
                    </View>
                  </TouchableOpacity>
                )}

                {/* Bottom Spacer */}
                <View style={styles.sheetBottomSpacer} />
              </View>
            </GestureHandlerScrollView>
          </Animated.View>
        )}
      </Animated.View>
    </Animated.View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {Platform.OS === 'android' && (
        <StatusBar barStyle="dark-content" backgroundColor="#F4EBDB" />
      )}

      <PanGestureHandler
        ref={horizontalSwipeRef}
        onHandlerStateChange={handleHorizontalSwipe}
        activeOffsetX={[-30, 30]}
        failOffsetY={[-20, 20]}
        waitFor={panGestureRef}
      >
        <View style={styles.container}>
        {/* Full-screen Video Player with inline loading */}
        <View style={{ position: 'relative', flex: 1 }}>
          <LessonPlayer
            videoSource={{ uri: videoUrl }}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            autoPlay={true}
            shouldLoop={true}
          />

          <LoadingOverlay visible={!isVideoLoaded} />
        </View>

        {/* Video Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressBarWidth.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  })
                }
              ]}
            />
          </View>
        </View>

        {/* Back Button */}
        <View style={[styles.backButtonContainer, { top: insets.top + 8 }]}>
          <TouchableOpacity style={styles.backButton} onPress={onDismiss}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Continue Button */}
        <View style={[styles.nextButtonContainer, { top: insets.top + 8 }]}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              !hasFinishedReading && styles.nextButtonDisabled
            ]}
            onPress={hasFinishedReading ? handleContinue : undefined}
            disabled={!hasFinishedReading}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={hasFinishedReading ? "white" : "#666"}
            />
          </TouchableOpacity>
        </View>

        {/* Walkthrough Hints */}
        {showReadHint && (
          <View style={styles.readHintContainer}>
            <Image
              source={require('@/assets/images/walkthrough/read.svg')}
              style={styles.readHintImage}
              contentFit="contain"
            />
          </View>
        )}

        {showContinueHint && (
          <View style={[styles.continueHintContainer, { top: insets.top + 4 }]}>
            <Image
              source={require('@/assets/images/walkthrough/continue.svg')}
              style={styles.continueHintImage}
              contentFit="contain"
            />
          </View>
        )}

        {/* Reading Card: Tap only on Android, Tap + Swipe on iOS */}
        <TapGestureHandler
          ref={tapGestureRef}
          onHandlerStateChange={handleTapGesture}
        >
          {Platform.OS === 'ios' ? (
            <PanGestureHandler
              ref={panGestureRef}
              onGestureEvent={handleSwipeGesture}
              onHandlerStateChange={handleSwipeGesture}
              activeOffsetY={[-ROI_LESSON_CONSTANTS.GESTURES.ACTIVE_OFFSET_Y, ROI_LESSON_CONSTANTS.GESTURES.ACTIVE_OFFSET_Y]}
              failOffsetX={[-ROI_LESSON_CONSTANTS.GESTURES.FAIL_OFFSET_X, ROI_LESSON_CONSTANTS.GESTURES.FAIL_OFFSET_X]}
              simultaneousHandlers={tapGestureRef}
            >
              {renderReadingCard()}
            </PanGestureHandler>
          ) : (
            renderReadingCard()
          )}
        </TapGestureHandler>
        </View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },

  // Video Progress Bar
  progressBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    zIndex: 10,
  },
  progressBarBackground: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: ArchivesTheme.colors.persianOrange,
  },

  // Navigation Buttons
  backButtonContainer: {
    position: "absolute",
    left: 16,
    zIndex: 20,
  },
  backButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_RADIUS,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },

  nextButtonContainer: {
    position: "absolute",
    right: 16,
    zIndex: 20,
  },
  nextButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_RADIUS,
    backgroundColor: ArchivesTheme.colors.mossGreen,
    justifyContent: "center",
    alignItems: "center",
  },
  nextButtonDisabled: {
    backgroundColor: "rgba(0,0,0,0.3)",
  },

  // Card positioning
  cardContainer: {
    position: "absolute",
    bottom: -40,
    left: 0,
    right: 0,
    zIndex: 30,  // Above loading overlay and all other UI
  },

  // Main reading card
  readingCard: {
    height: COLLAPSED_HEIGHT,
    backgroundColor: "rgba(0,0,0,0.9)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },

  cardHandle: {
    width: CARD_HANDLE_WIDTH,
    height: CARD_HANDLE_HEIGHT,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
  },

  // Content layouts
  collapsedContent: {
    flex: 1,
  },
  expandedContent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 20,
  },
  expandedScroll: {
    flex: 1,
  },
  expandedContentInner: {
    padding: 20,
  },

  // Typography
  readingCardHeader: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 30,
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
    lineHeight: 20,
  },

  // Historical content section
  historicalSection: {
    marginBottom: 20,
  },

  // Expanded view title section
  titleSection: {
    marginBottom: 24,
  },
  sheetTitle: {
    fontFamily: "DM Sans",
    fontSize: 24,
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

  // Bottom spacer
  sheetBottomSpacer: {
    height: 80,
  },

  // Walkthrough hints
  readHintContainer: {
    position: 'absolute',
    bottom: COLLAPSED_HEIGHT - (SCREEN_HEIGHT * 0.01),  // 1% overlap
    alignSelf: 'center',
    zIndex: 15,
    pointerEvents: 'none',
  },
  readHintImage: {
    width: 180,  // 1.5X (was 120)
    height: 73,  // Match 198:80 SVG aspect ratio
  },
  continueHintContainer: {
    position: 'absolute',
    top: 0,  // Will be set inline with insets.top + 12
    right: 16 + BUTTON_SIZE + 10,  // Relative to button position
    zIndex: 25,
    pointerEvents: 'none',
  },
  continueHintImage: {
    width: 120,  // 1.2X size
    height: 48,  // Match 120:48 SVG aspect ratio (1.2X)
  },
});
