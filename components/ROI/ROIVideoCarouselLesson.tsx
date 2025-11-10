// ROIVideoCarouselLesson.tsx - Reusable Video Carousel lesson for Rise of Islam
// Accepts data from adventures.content_list and injects dynamically
// Full-screen TabView carousel showing video series

import ArchivesTheme from "@/constants/ArchivesTheme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { VideoView, useVideoPlayer, VideoSource } from 'expo-video';
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import React, { useRef, useState, useEffect, useMemo } from "react";
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
  GestureHandlerRootView,
  ScrollView as GestureHandlerScrollView,
  PanGestureHandler,
  TapGestureHandler,
  State,
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ContentItem } from "./types";
import RenderHtml from 'react-native-render-html';
import { ROI_LESSON_CONSTANTS } from "./ROILessonConstants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WALKTHROUGH_KEYS } from "@/constants/WalkthroughKeys";
import { Image as ExpoImage } from "expo-image";
import { useLessonTracking } from "@/hooks/useLessonTracking";

// Static dimensions (module-level) - Umayyad Dynasty pattern
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get(
  Platform.OS === 'android' ? "screen" : "window"
);

// Responsive card heights (module-level)
const COLLAPSED_HEIGHT = SCREEN_HEIGHT * ROI_LESSON_CONSTANTS.READING_CARD.COLLAPSED_HEIGHT_RATIO;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * ROI_LESSON_CONSTANTS.READING_CARD.EXPANDED_HEIGHT_RATIO;

interface ROIVideoCarouselLessonProps {
  contentItem: ContentItem;  // Data from adventures.content_list
  adventureId: string;       // e.g., "roi_adventure_1"
  moduleId: string;          // e.g., "ROI_Adv1_M1"
  lessonId: string;          // e.g., "lesson2"
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void;
}

// Video carousel item component with hooks at top level
interface VideoItemProps {
  videoUrl: string;
  caption: string;
  index: number;
  isActive: boolean;
}

const VideoCarouselItem: React.FC<VideoItemProps> = ({ videoUrl, caption, isActive }) => {
  // PERFORMANCE: Enable video caching for 50-90% faster loading on repeated views
  const videoSource: VideoSource = useMemo(() => ({
    uri: videoUrl,
    useCaching: true  // Enable 1GB default cache
  }), [videoUrl]);

  const player = useVideoPlayer(videoSource, (player) => {
    if (isActive) {
      player.play();
      player.loop = true;
    } else {
      player.pause();
    }
  });

  useEffect(() => {
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, player]);

  return (
    <View style={styles.videoContainer}>
      <VideoView
        player={player}
        style={styles.video}
        nativeControls={false}
        contentFit={Platform.OS === 'android' ? "fill" : "cover"}
        useExoShutter={Platform.OS === 'android' ? false : undefined}
        surfaceType={Platform.OS === 'android' ? "surfaceView" : undefined}
      />

      {/* Text overlay with caption */}
      <View style={styles.textOverlay}>
        <Text style={styles.captionText}>{caption}</Text>
      </View>
    </View>
  );
};

export default function ROIVideoCarouselLesson({
  contentItem,
  adventureId,
  moduleId,
  lessonId,
  onContinue,
  onDismiss,
  onBack,
}: ROIVideoCarouselLessonProps) {
  // Safe area insets for proper button positioning
  const insets = useSafeAreaInsets();

  // Analytics tracking
  const {
    trackCardExpanded,
    trackLessonComplete,
  } = useLessonTracking({
    adventureId,
    moduleId,
    lessonId,
    lessonType: "video_carousel",
    lessonTitle: contentItem.top_content?.title || "Unknown",
    screenUrl: `/roi/${adventureId}/${moduleId}/${lessonId}`,
  });

  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showReadContent, setShowReadContent] = useState(false);
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollViewGestureRef = useRef(null);
  const panGestureRef = useRef(null);
  const tapGestureRef = useRef(null);
  const horizontalSwipeRef = useRef(null);
  const [isCardGestureActive, setIsCardGestureActive] = useState(false);

  // Walkthrough hint states
  const [walkthroughEnabled, setWalkthroughEnabled] = useState(false);
  const [showContinueHint, setShowContinueHint] = useState(false);

  // Animation values
  const cardHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;

  // Background music hook - Auto-play immediately if URL exists
  const backgroundMusic = useBackgroundMusic(
    contentItem.background_music_url ? { uri: contentItem.background_music_url } : null,
    { volume: 0.5, shouldLoop: true }
  );

  // Extract videos and captions from contentItem
  const videos = contentItem.media_url || [];
  const captions = contentItem.bottom_content?.carousel_captions || [];

  // Check if user has seen carousel walkthrough before
  useEffect(() => {
    const checkWalkthrough = async () => {
      try {
        const hasSeenCarousel = await AsyncStorage.getItem(WALKTHROUGH_KEYS.CAROUSEL);
        if (hasSeenCarousel !== 'true') {
          setWalkthroughEnabled(true);
          console.log('👁️ Carousel walkthrough enabled - first time');
        } else {
          console.log('👁️ Carousel walkthrough disabled - already seen');
        }
      } catch (error) {
        console.error('❌ Error checking carousel walkthrough:', error);
      }
    };
    checkWalkthrough();
  }, []);

  // Show continue hint when on last video (only if walkthrough enabled)
  useEffect(() => {
    if (walkthroughEnabled && currentVideoIndex === videos.length - 1) {
      setShowContinueHint(true);
      console.log('👁️ Continue hint shown - last video reached');
    } else {
      setShowContinueHint(false);
    }
  }, [walkthroughEnabled, currentVideoIndex, videos.length]);

  // Debug logging for carousel scroll state
  useEffect(() => {
    console.log(
      `🎠 Carousel scroll state: ${
        isCardGestureActive
          ? "🔒 BLOCKED (card gesture active)"
          : "✅ ENABLED (can swipe videos)"
      }`
    );
  }, [isCardGestureActive]);

  // Safety mechanism: Reset gesture state if stuck
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isCardGestureActive) {
        console.log("⚠️ Safety reset: Clearing stuck gesture state");
        setIsCardGestureActive(false);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isCardExpanded]);

  // Handle carousel scroll
  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const videoIndex = Math.round(contentOffsetX / SCREEN_WIDTH);

    if (videoIndex !== currentVideoIndex) {
      setCurrentVideoIndex(videoIndex);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
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

  // Swipe gesture handler (cross-platform)
  const handleSwipeGesture = (event: any) => {
    const { state, translationY, velocityY } = event.nativeEvent;

    if (state === State.BEGAN || state === State.ACTIVE) {
      setIsCardGestureActive(true);
      console.log("📱 Card gesture started - blocking carousel");
    }

    if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      console.log("📱 Gesture state:", state, {
        translationY,
        velocityY,
        isCardExpanded,
        platform: Platform.OS,
      });

      if (state === State.END) {
        const minDistance = 20;
        const minVelocity = 300;

        if (
          !isCardExpanded &&
          (translationY < -minDistance || velocityY < -minVelocity)
        ) {
          console.log("📱 Swipe up detected - expanding card");
          expandCard();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          return;
        } else if (
          isCardExpanded &&
          (translationY > minDistance || velocityY > minVelocity)
        ) {
          console.log("📱 Swipe down detected - collapsing card");
          collapseCard();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          return;
        }
      }

      setIsCardGestureActive(false);
      console.log("📱 Gesture ended - carousel re-enabled");
    }
  };

  // Expand card
  const expandCard = () => {
    console.log("🎬 Card expansion starting...");
    setIsCardExpanded(true);
    setShowReadContent(true);

    // Track reading card expansion
    trackCardExpanded();

    setIsCardGestureActive(false);
    console.log("🎬 Carousel re-enabled IMMEDIATELY ✅");

    Animated.parallel([
      Animated.spring(cardHeight, {
        toValue: EXPANDED_HEIGHT,
        useNativeDriver: false,
        tension: ROI_LESSON_CONSTANTS.READING_CARD.ANIMATION_TENSION,
        friction: ROI_LESSON_CONSTANTS.READING_CARD.ANIMATION_FRICTION,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  };

  // Collapse card
  const collapseCard = () => {
    console.log("🎬 Card collapse starting...");
    setIsCardExpanded(false);
    setShowReadContent(false);

    setIsCardGestureActive(false);
    console.log("🎬 Carousel re-enabled IMMEDIATELY ✅");

    Animated.parallel([
      Animated.spring(cardHeight, {
        toValue: COLLAPSED_HEIGHT,
        useNativeDriver: false,
        tension: ROI_LESSON_CONSTANTS.READING_CARD.ANIMATION_TENSION,
        friction: ROI_LESSON_CONSTANTS.READING_CARD.ANIMATION_FRICTION,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  };

  // Handle reading scroll
  const handleReadingScroll = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    setScrollY(contentOffset.y);
  };

  // Handle continue
  const handleContinue = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Track lesson completion
    trackLessonComplete();

    // Save walkthrough flag when user completes lesson
    try {
      await AsyncStorage.setItem(WALKTHROUGH_KEYS.CAROUSEL, 'true');
      console.log('✅ Carousel walkthrough marked as seen');
    } catch (error) {
      console.error('❌ Error saving carousel walkthrough flag:', error);
    }

    console.log(`🔄 ${moduleId} ${lessonId}`);
    onContinue();
  };

  // Horizontal Swipe Gesture Handler (for navigation)
  const handleHorizontalSwipe = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;

      const minDistance = 50;  // Minimum swipe distance
      const minVelocity = 500; // Minimum swipe velocity

      // Swipe right -> Continue (next lesson) - only when on last video
      if (currentVideoIndex === videos.length - 1 && translationX > minDistance && velocityX > minVelocity) {
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {Platform.OS === "android" && (
        <StatusBar barStyle="dark-content" backgroundColor="#F4EBDB" />
      )}
      <PanGestureHandler
        ref={horizontalSwipeRef}
        onHandlerStateChange={handleHorizontalSwipe}
        activeOffsetX={[-30, 30]}
        failOffsetY={[-20, 20]}
        waitFor={panGestureRef}
      >
        <View style={{ flex: 1 }}>
          <View style={[
            styles.container,
            Platform.OS === 'android' && { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }
          ]}>
        {/* Main carousel - full screen */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEnabled={!isCardGestureActive}
          style={styles.carousel}
        >
          {videos.map((videoUrl, index) => (
            <VideoCarouselItem
              key={index}
              videoUrl={videoUrl}
              caption={captions[index] || ''}
              index={index}
              isActive={currentVideoIndex === index}
            />
          ))}
        </ScrollView>

        {/* Back Button */}
        <View style={[styles.backButtonContainer, { top: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => (onBack || onDismiss)()}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Continue Button */}
        <View style={[styles.continueButtonContainer, { top: insets.top + 8 }]}>
          <TouchableOpacity
            style={[
              styles.topContinueButton,
              currentVideoIndex !== videos.length - 1 &&
                styles.topContinueButtonDisabled,
            ]}
            onPress={
              currentVideoIndex === videos.length - 1
                ? handleContinue
                : undefined
            }
            disabled={currentVideoIndex !== videos.length - 1}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={
                currentVideoIndex === videos.length - 1 ? "white" : "#666"
              }
            />
          </TouchableOpacity>
        </View>

        {/* Walkthrough Hints */}
        {walkthroughEnabled && (
          <View style={styles.aboveDotsHintContainer}>
            <ExpoImage
              source={require('@/assets/images/walkthrough/abovedots.svg')}
              style={styles.aboveDotsHintImage}
              contentFit="contain"
            />
          </View>
        )}

        {walkthroughEnabled && showContinueHint && (
          <View style={styles.continueHintContainer}>
            <ExpoImage
              source={require('@/assets/images/walkthrough/continue.svg')}
              style={styles.continueHintImage}
              contentFit="contain"
            />
          </View>
        )}

        {/* Page indicators */}
        {!isCardExpanded && (
          <View style={styles.pageIndicatorsOnly}>
            {videos.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.pageIndicator,
                  currentVideoIndex === index && styles.pageIndicatorActive,
                ]}
              />
            ))}
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
              minPointers={1}
              maxPointers={1}
              simultaneousHandlers={tapGestureRef}
            >
              <Animated.View
                style={[
                  styles.cardContainer,
                  {
                    transform: [{ translateY: cardTranslateY }],
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.readingCard,
                    {
                      height: cardHeight,
                    },
                  ]}
                >
                  <View style={styles.cardHandle} />

                  {/* Collapsed content */}
                  <Animated.View
                    style={[styles.collapsedContent, { opacity: cardOpacity }]}
                  >
                    <TouchableOpacity
                      onPress={expandCard}
                      activeOpacity={0.8}
                      disabled={isCardExpanded}
                    >
                      <View style={styles.readingCardHeader}>
                        <Text style={styles.cardTitle}>
                          {contentItem.thumbnail_title || 'Video Series'}
                        </Text>
                        <Text style={styles.cardSubtitle} numberOfLines={2}>
                          {contentItem.bottom_content?.reading_text?.replace(/<[^>]*>/g, '').substring(0, 100) || ''}...
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>

                  {/* Expanded content */}
                  {isCardExpanded && (
                    <Animated.View
                      style={[
                        styles.expandedContent,
                        { opacity: Animated.subtract(1, cardOpacity) },
                      ]}
                    >
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
                          <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                            <View style={styles.titleSection}>
                              <Text style={styles.sheetTitle}>
                                {contentItem.thumbnail_title || 'Video Series'}
                              </Text>
                              <Text style={styles.sheetSubtitle}>
                                Video Carousel • {contentItem.order_by}
                              </Text>
                            </View>
                          </TouchableOpacity>

                          {/* HTML Content */}
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

                          <View style={styles.sheetBottomSpacer} />
                        </View>
                      </GestureHandlerScrollView>
                    </Animated.View>
                  )}
                </Animated.View>
              </Animated.View>
            </PanGestureHandler>
          ) : (
            <Animated.View
              style={[
                styles.cardContainer,
                {
                  transform: [{ translateY: cardTranslateY }],
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.readingCard,
                  {
                    height: cardHeight,
                  },
                ]}
              >
                <View style={styles.cardHandle} />

                {/* Collapsed content */}
                <Animated.View
                  style={[styles.collapsedContent, { opacity: cardOpacity }]}
                >
                  <TouchableOpacity
                    onPress={expandCard}
                    activeOpacity={0.8}
                    disabled={isCardExpanded}
                  >
                    <View style={styles.readingCardHeader}>
                      <Text style={styles.cardTitle}>
                        {contentItem.thumbnail_title || 'Video Series'}
                      </Text>
                      <Text style={styles.cardSubtitle} numberOfLines={2}>
                        {contentItem.bottom_content?.reading_text?.replace(/<[^>]*>/g, '').substring(0, 100) || ''}...
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>

                {/* Expanded content */}
                {isCardExpanded && (
                  <Animated.View
                    style={[
                      styles.expandedContent,
                      { opacity: Animated.subtract(1, cardOpacity) },
                    ]}
                  >
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
                        <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                          <View style={styles.titleSection}>
                            <Text style={styles.sheetTitle}>
                              {contentItem.thumbnail_title || 'Video Series'}
                            </Text>
                            <Text style={styles.sheetSubtitle}>
                              Video Carousel • {contentItem.order_by}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        {/* HTML Content */}
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

                        <View style={styles.sheetBottomSpacer} />
                      </View>
                    </GestureHandlerScrollView>
                  </Animated.View>
                )}
              </Animated.View>
            </Animated.View>
          )}
        </TapGestureHandler>
          </View>
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

  carousel: {
    flex: 1,
  },
  videoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
    overflow: "hidden",
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  textOverlay: {
    position: "absolute",
    top: 120,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
    alignItems: "center",
  },
  captionText: {
    fontFamily: "DM Sans",
    fontSize: 20,
    fontWeight: "700",
    color: "white",
    textAlign: "center",
    lineHeight: 26,
    textShadowColor: "black",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  pageIndicatorsOnly: {
    position: "absolute",
    bottom: SCREEN_HEIGHT * 0.22,  // Responsive: ~22% from bottom
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: 15,
    paddingHorizontal: 5,
    paddingVertical: 6,
  },
  pageIndicator: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "rgb(147, 147, 147)",
    marginHorizontal: 4.5,
  },
  pageIndicatorActive: {
    backgroundColor: "rgb(255, 255, 255)",
  },

  cardContainer: {
    position: "absolute",
    bottom: -40,
    left: 0,
    right: 0,
  },

  readingCard: {
    height: 160,
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
    width: 70,
    height: 5,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
  },

  readingCardHeader: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 30,
  },

  backButtonContainer: {
    position: "absolute",
    left: 16,
    zIndex: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },

  continueButtonContainer: {
    position: "absolute",
    right: 16,
    zIndex: 20,
  },
  topContinueButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ArchivesTheme.colors.mossGreen,
    justifyContent: "center",
    alignItems: "center",
  },

  topContinueButtonDisabled: {
    backgroundColor: "rgba(0,0,0,0.3)",
  },

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

  historicalSection: {
    marginBottom: 20,
  },

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

  sheetBottomSpacer: {
    height: 60,
  },

  // Walkthrough hints
  aboveDotsHintContainer: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.25,  // Responsive: ~25% from bottom (closer to dots)
    alignSelf: 'center',
    zIndex: 15,
    pointerEvents: 'none',
  },
  aboveDotsHintImage: {
    width: 176,  // 1X original size
    height: 79,  // Match 176:79 SVG aspect ratio (1X)
  },
  continueHintContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 64 : 74,
    right: 66,  // 16 (button margin) + 40 (button width) + 10 (spacing)
    zIndex: 25,
    pointerEvents: 'none',
  },
  continueHintImage: {
    width: 120,  // 1.2X size
    height: 48,  // Match 120:48 SVG aspect ratio (1.2X)
  },
});
