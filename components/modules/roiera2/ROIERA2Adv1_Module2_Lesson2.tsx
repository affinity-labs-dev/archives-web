// ROIERA2Adv1_Module2_Lesson2.tsx - Rise of Islam Era 2: Adventure 1 Module 2 Lesson 2
// "Social Injustice in Pre-Islamic Arabia" - Video Carousel lesson with 2 videos and reading card
// CORRECT DESIGN: Full-screen video carousel with overlay structure

import ArchivesTheme from "@/constants/ArchivesTheme";
import { useProgress } from "@/context/ProgressContext";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useVideoPlayer, VideoView } from "expo-video";
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get(
  Platform.OS === "android" ? "screen" : "window"
);

// Card Height Constants - EXACT SwiftUI measurements (matching Lesson 1)
const COLLAPSED_HEIGHT = 160;           // Card collapsed state height
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.85;  // Card expanded to 85% of screen

// Animation Constants - Performance Optimized (matching Lesson 1)
const CARD_ANIMATION_TENSION = 100;     // Spring animation tension
const CARD_ANIMATION_FRICTION = 8;      // Spring animation friction

interface ROIERA2Adv1_Module2_Lesson2Props {
  onContinue: () => void;
  onDismiss: () => void;
  onBack: () => void;
}

interface MediaContent {
  id: number;
  videoUrl: string;
  caption: string;
}

// ROI Video content with exact URLs and captions
const mediaContents: MediaContent[] = [
  {
    id: 1,
    videoUrl:
      "http://d3bi5e5vkj68.cloudfront.net/Carousel-videos/ROI_Adv1_M2_Media2_Video1.mp4",
    caption:
      "Wealth and power provided safety, but mainly for the privileged few. Vulnerable groups-especially women, orphans, and the poor-were often ignored or treated unfairly.",
  },
  {
    id: 2,
    videoUrl:
      "http://d3bi5e5vkj68.cloudfront.net/Carousel-videos/ROI_Adv1_M2_Media2_Video2.mp4",
    caption:
      "Some tribes even buried baby girls because they feared shame or poverty. Traditions frequently took priority over kindness, and justice often depended on tribal revenge rather than fairness.",
  },
];

export default function ROIERA2Adv1_Module2_Lesson2({
  onContinue,
  onDismiss,
  onBack,
}: ROIERA2Adv1_Module2_Lesson2Props) {
  // Progress context for lesson completion tracking (ROI system)
  const { roiAtomicProgressUpdate } = useProgress();

  // Video carousel states
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [touchStart, setTouchStart] = useState<{
    y: number;
    time: number;
  } | null>(null);
  const [isCardGestureActive, setIsCardGestureActive] = useState(false);

  // Component refs for gesture coordination
  const scrollViewRef = useRef<ScrollView>(null);
  const panGestureRef = useRef(null);
  const scrollViewGestureRef = useRef(null);

  // Animation refs - All required for smooth animations
  const cardHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;

  // Create separate video players for each video - CORRECT ARCHITECTURE
  const videoPlayer1 = useVideoPlayer(mediaContents[0].videoUrl, (player) => {
    player.loop = true;
    player.muted = false;
    console.log(
      `🎬 ROI Video player 0 created for URL: ${mediaContents[0].videoUrl}`
    );
  });

  const videoPlayer2 = useVideoPlayer(mediaContents[1].videoUrl, (player) => {
    player.loop = true;
    player.muted = false;
    console.log(
      `🎬 ROI Video player 1 created for URL: ${mediaContents[1].videoUrl}`
    );
  });

  // Array of video players for easy access
  const videoPlayers = [videoPlayer1, videoPlayer2];

  // Auto-play first video when ready
  useEffect(() => {
    console.log(`🎬 ROI Setting up auto-play for first video`);
    videoPlayer1.play();
  }, [videoPlayer1]);

  // Background music integration with ROI audio
  const backgroundMusic = useBackgroundMusic(
    {
      uri: "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv1_M2_L2.mp3",
    },
    {
      volume: 0.5, // 50% volume - matching reference
      shouldLoop: true,
    }
  );

  // Handle video switching when index changes
  useEffect(() => {
    console.log(`🎬 ROI Video index changed to: ${currentVideoIndex}`);
    videoPlayers.forEach((player, index) => {
      try {
        if (index === currentVideoIndex) {
          player.play();
        } else {
          console.log(`🎬 ROI Pausing video ${index}`);
          player.pause();
        }
      } catch (error) {
        console.error(`🎬 ROI Error controlling video ${index}:`, error);
      }
    });
  }, [currentVideoIndex]);

  // Audio cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log("🎵 ROI Component unmounting - cleaning up all audio");

      // Stop background music hook
      if (backgroundMusic.stop) {
        console.log("🎵 ROI Stopping background music on component unmount");
        backgroundMusic.stop();
      }
    };
  }, []);

  // Video carousel scroll handling - EXACT reference implementation
  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const videoIndex = Math.round(contentOffsetX / SCREEN_WIDTH);

    if (
      videoIndex !== currentVideoIndex &&
      videoIndex >= 0 &&
      videoIndex < videoPlayers.length
    ) {
      console.log(
        `🎬 ROI Scroll detected: switching from video ${currentVideoIndex} to ${videoIndex}`
      );

      // Just update the index, let useEffect handle the video switching
      setCurrentVideoIndex(videoIndex);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Enhanced Android touch handlers with improved sensitivity
  const handleTouchStart = (event: any) => {
    setTouchStart({
      y: event.nativeEvent.pageY,
      time: Date.now(),
    });
    setIsCardGestureActive(true);
    console.log("📖 ROI Android card gesture started - blocking carousel");
  };

  const handleTouchEnd = (event: any) => {
    setIsCardGestureActive(false);
    console.log("📖 ROI Android card gesture ended - allowing carousel");

    if (!touchStart) return;

    const touchEnd = event.nativeEvent.pageY;
    const distance = touchStart.y - touchEnd; // Positive = swipe up
    const time = Date.now() - touchStart.time;

    // Improved Android swipe detection with better sensitivity
    const minDistance = 25; // Reduced from 40 for better responsiveness
    const maxTime = 300; // Shorter time for more responsive gestures
    const velocity = Math.abs(distance) / time; // Calculate velocity
    const velocityThreshold = 0.4; // Reduced threshold for better responsiveness

    if (
      !isCardExpanded &&
      distance > minDistance &&
      time < maxTime &&
      velocity > velocityThreshold
    ) {
      console.log("📖 ROI Android touch swipe up detected - expanding card", {
        distance,
        time,
        velocity: velocity.toFixed(2),
        platform: Platform.OS,
      });
      expandCard();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (
      isCardExpanded &&
      distance < -minDistance &&
      time < maxTime &&
      velocity > velocityThreshold
    ) {
      console.log(
        "📖 ROI Android touch swipe down detected - collapsing card",
        {
          distance,
          time,
          velocity: velocity.toFixed(2),
          platform: Platform.OS,
        }
      );
      collapseCard();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Reset touch start
    setTouchStart(null);
  };

  // Enhanced iOS PanGestureHandler with gesture coordination
  const handleSwipeGesture = (event: any) => {
    if (Platform.OS !== "ios") return;

    const { state, translationY, velocityY } = event.nativeEvent;

    // Track gesture activity for carousel coordination
    if (state === State.BEGAN || state === State.ACTIVE) {
      setIsCardGestureActive(true);
      console.log("📱 ROI iOS card gesture started - blocking carousel");
    } else if (
      state === State.END ||
      state === State.CANCELLED ||
      state === State.FAILED
    ) {
      setIsCardGestureActive(false);
      console.log("📱 ROI iOS card gesture ended - allowing carousel");
    }

    if (state === State.END) {
      console.log("📱 ROI iOS PanGesture detected", {
        translationY,
        velocityY,
        isCardExpanded,
        platform: Platform.OS,
      });

      // iOS-optimized swipe detection with improved sensitivity
      const minDistance = 25; // Reduced from 30 for better responsiveness
      const minVelocity = 400; // Reduced from 500 for better responsiveness

      if (
        !isCardExpanded &&
        (translationY < -minDistance || velocityY < -minVelocity)
      ) {
        console.log(
          "📱 ROI iOS PanGesture swipe up detected - expanding card",
          {
            translationY,
            velocityY,
            platform: Platform.OS,
          }
        );
        expandCard();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (
        isCardExpanded &&
        (translationY > minDistance || velocityY > minVelocity)
      ) {
        console.log(
          "📱 ROI iOS PanGesture swipe down detected - collapsing card",
          {
            translationY,
            velocityY,
            platform: Platform.OS,
          }
        );
        collapseCard();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  // Card Expansion Logic
  const expandCard = () => {
    setIsCardExpanded(true);

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

  // Lesson Completion Logic
  const handleContinue = async () => {
    // Light haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Mark lesson as completed in progress context (ROI system: ROI_Adv1_M2, Lesson 2)
    await roiAtomicProgressUpdate("ROI_Adv1_M2", {
      type: "LESSON_COMPLETED",
      lessonId: "lesson2",
    });
    console.log(
      "🔄 ROI Continue button pressed - ROI_Adv1_M2 Lesson 2 completed, proceeding to quiz"
    );
    onContinue();
  };

  return (
    <>
      {Platform.OS === "android" && (
        <StatusBar barStyle="dark-content" backgroundColor="#F4EBDB" />
      )}
      <View style={styles.container}>
        {/* Main video carousel - full screen horizontal ScrollView */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEnabled={!isCardGestureActive}
          style={styles.carousel}
        >
          {mediaContents.map((content, index) => (
            <View key={content.id} style={styles.videoContainer}>
              {/* Full screen ROI video */}
              <VideoView
                player={videoPlayers[index]}
                style={styles.video}
                contentFit={Platform.OS === "android" ? "fill" : "cover"}
                nativeControls={false}
                useExoShutter={Platform.OS === "android" ? false : undefined}
                surfaceType={
                  Platform.OS === "android" ? "surfaceView" : undefined
                }
              />

              {/* Text overlay with descriptive caption - REMOVED per user request */}
              {/* <View style={styles.textOverlay}>
                <Text style={styles.captionText}>{content.caption}</Text>
              </View> */}
            </View>
          ))}
        </ScrollView>

        {/* Back Button - Top Left */}
        <SafeAreaView style={styles.backButtonContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              // Stop all audio when going back
              if (backgroundMusic.isPlaying) {
                console.log("🎵 ROI Stopping background music on back button");
                backgroundMusic.stop();
              }

              onBack();
            }}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Continue Button - Top Right (only active on final video) */}
        <SafeAreaView style={styles.continueButtonContainer}>
          <TouchableOpacity
            style={[
              styles.topContinueButton,
              currentVideoIndex !== mediaContents.length - 1 &&
                styles.topContinueButtonDisabled,
            ]}
            onPress={
              currentVideoIndex === mediaContents.length - 1
                ? () => {
                    // Stop all audio before continuing (no await for instant navigation)
                    if (backgroundMusic.isPlaying) {
                      console.log(
                        "🎵 ROI Stopping background music before continue"
                      );
                      backgroundMusic.stop(); // Remove await for instant navigation
                    }

                    handleContinue();
                  }
                : undefined
            }
            disabled={currentVideoIndex !== mediaContents.length - 1}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={
                currentVideoIndex === mediaContents.length - 1
                  ? "white"
                  : "#666"
              }
            />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Page indicator dots - centered */}
        {!isCardExpanded && (
          <View style={styles.pageIndicatorsOnly}>
            {mediaContents.map((_, index) => (
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

        {/* Reading Card at Bottom - Platform-Specific Gesture Handling */}
        {Platform.OS === "ios" ? (
          // iOS: Native PanGestureHandler
          <PanGestureHandler
            ref={panGestureRef}
            onGestureEvent={handleSwipeGesture}
            onHandlerStateChange={handleSwipeGesture}
            activeOffsetY={[-15, 15]}
            failOffsetX={[-40, 40]}
            minPointers={1}
            maxPointers={1}
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
                {/* Top handle indicator */}
                <View style={styles.cardHandle} />

                {/* iOS Collapsed content */}
                <Animated.View
                  style={[styles.collapsedContent, { opacity: cardOpacity }]}
                >
                  <View style={styles.readingCardHeader}>
                    <Text style={styles.cardTitle}>
                      Social Injustice in Pre-Islamic Arabia
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      Understanding the problems Muhammad ﷺ later challenged
                    </Text>
                  </View>
                </Animated.View>

                {/* Expanded content when card is swiped up */}
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
                      scrollEventThrottle={100}
                      waitFor={
                        Platform.OS === "ios" ? panGestureRef : undefined
                      }
                    >
                      <View style={styles.expandedContentInner}>
                        {/* Title Section */}
                        <View style={styles.titleSection}>
                          <Text style={styles.sheetTitle}>
                            Social Injustice in Pre-Islamic Arabia
                          </Text>
                          <Text style={styles.sheetSubtitle}>
                            Module 2 • Lesson 2
                          </Text>
                        </View>

                        {/* Historical Content */}
                        <View style={styles.historicalSection}>
                          <Text style={styles.sectionTitle}>
                            Historical Context
                          </Text>
                          <Text style={styles.historicalText}>
                            While Mecca was rich and full of culture, pre-Islamic Arabia faced serious social problems. The powerful ruled without being held responsible, and loyalty to one's tribe was more important than justice. Slavery was common, and some families buried baby girls out of fear or shame. The poor, orphans, and women were often mistreated or forgotten. Religion didn't offer much comfort-people followed idols, jinn, and fortune-tellers instead of clear guidance or compassion. Weaker tribes had no real protection, and justice was based on revenge, not fairness.
                          </Text>
                        </View>

                        {/* Key Terms Section */}
                        <View style={styles.keyTermsSection}>
                          <Text style={styles.sectionTitle}>
                            Key Terms
                          </Text>
                          <View style={styles.keyTermsList}>
                            <View style={styles.keyTermItem}>
                              <Text style={styles.keyTermName}>Vulnerable Groups</Text>
                              <Text style={styles.keyTermDefinition}>Women, orphans, and the poor who lacked protection and rights</Text>
                            </View>
                            <View style={styles.keyTermItem}>
                              <Text style={styles.keyTermName}>Tribal Revenge</Text>
                              <Text style={styles.keyTermDefinition}>Justice system based on retaliation rather than fairness</Text>
                            </View>
                            <View style={styles.keyTermItem}>
                              <Text style={styles.keyTermName}>Infanticide</Text>
                              <Text style={styles.keyTermDefinition}>Practice of burying baby girls out of fear or shame</Text>
                            </View>
                            <View style={styles.keyTermItem}>
                              <Text style={styles.keyTermName}>Social Hierarchy</Text>
                              <Text style={styles.keyTermDefinition}>System where wealth and power determined protection and rights</Text>
                            </View>
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
              <Animated.View
                style={[
                  styles.readingCard,
                  {
                    height: cardHeight,
                  },
                ]}
              >
                {/* Top handle indicator */}
                <View style={styles.cardHandle} />

                {/* Android Collapsed content */}
                <Animated.View
                  style={[styles.collapsedContent, { opacity: cardOpacity }]}
                >
                  <View style={styles.readingCardHeader}>
                    <Text style={styles.cardTitle}>
                      Social Injustice in Pre-Islamic Arabia
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      Understanding the problems Muhammad ﷺ later challenged
                    </Text>
                  </View>
                </Animated.View>

                {/* Expanded content when card is swiped up */}
                {isCardExpanded && (
                  <Animated.View
                    style={[
                      styles.expandedContent,
                      { opacity: Animated.subtract(1, cardOpacity) },
                    ]}
                  >
                    <ScrollView
                      style={styles.expandedScroll}
                      showsVerticalScrollIndicator={false}
                      scrollEventThrottle={100}
                    >
                      <View style={styles.expandedContentInner}>
                        {/* Title Section */}
                        <View style={styles.titleSection}>
                          <Text style={styles.sheetTitle}>
                            Social Injustice in Pre-Islamic Arabia
                          </Text>
                          <Text style={styles.sheetSubtitle}>
                            Module 2 • Lesson 2
                          </Text>
                        </View>

                        {/* Historical Content */}
                        <View style={styles.historicalSection}>
                          <Text style={styles.sectionTitle}>
                            Historical Context
                          </Text>
                          <Text style={styles.historicalText}>
                            While Mecca was rich and full of culture, pre-Islamic Arabia faced serious social problems. The powerful ruled without being held responsible, and loyalty to one's tribe was more important than justice. Slavery was common, and some families buried baby girls out of fear or shame. The poor, orphans, and women were often mistreated or forgotten. Religion didn't offer much comfort-people followed idols, jinn, and fortune-tellers instead of clear guidance or compassion. Weaker tribes had no real protection, and justice was based on revenge, not fairness.
                          </Text>
                        </View>

                        {/* Key Terms Section */}
                        <View style={styles.keyTermsSection}>
                          <Text style={styles.sectionTitle}>
                            Key Terms
                          </Text>
                          <View style={styles.keyTermsList}>
                            <View style={styles.keyTermItem}>
                              <Text style={styles.keyTermName}>Vulnerable Groups</Text>
                              <Text style={styles.keyTermDefinition}>Women, orphans, and the poor who lacked protection and rights</Text>
                            </View>
                            <View style={styles.keyTermItem}>
                              <Text style={styles.keyTermName}>Tribal Revenge</Text>
                              <Text style={styles.keyTermDefinition}>Justice system based on retaliation rather than fairness</Text>
                            </View>
                            <View style={styles.keyTermItem}>
                              <Text style={styles.keyTermName}>Infanticide</Text>
                              <Text style={styles.keyTermDefinition}>Practice of burying baby girls out of fear or shame</Text>
                            </View>
                            <View style={styles.keyTermItem}>
                              <Text style={styles.keyTermName}>Social Hierarchy</Text>
                              <Text style={styles.keyTermDefinition}>System where wealth and power determined protection and rights</Text>
                            </View>
                          </View>
                        </View>

                        {/* Bottom spacer to ensure full scroll */}
                        <View style={styles.sheetBottomSpacer} />
                      </View>
                    </ScrollView>
                  </Animated.View>
                )}
              </Animated.View>
            </Animated.View>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },

  // Main carousel - full screen
  carousel: {
    flex: 1,
    ...(Platform.OS === "android" && {
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
    }),
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

  // Text overlay at bottom - matching reference design
  textOverlay: {
    position: "absolute",
    bottom: 200, // Above reading card
    left: 20,
    right: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 12,
    zIndex: 3,
  },
  captionText: {
    color: "white",
    fontSize: 14,
    lineHeight: 18,
    textAlign: "center",
    fontFamily: "DM Sans",
    fontWeight: "500",
  },

  // Back button - top left overlay
  backButtonContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 10,
    paddingTop: 8,
    paddingLeft: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Continue button - top right overlay
  continueButtonContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 8,
    paddingRight: 16,
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
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },

  // Page indicators - Figma design with dark pill container
  pageIndicatorsOnly: {
    position: "absolute",
    bottom: 180, // Position above the reading card
    alignSelf: "center", // Center horizontally, auto-fit width to content
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    // Dark pill container background - width auto-fits to content
    backgroundColor: "rgba(0, 0, 0, 0.8)", // 80% black opacity
    borderRadius: 15, // Smooth rounded pill shape
    paddingHorizontal: 5, // Left & right padding
    paddingVertical: 6, // Top & bottom padding
  },
  pageIndicator: {
    width: 9, // Dot size
    height: 9,
    borderRadius: 4.5, // Perfect circle (half of width)
    backgroundColor: "rgb(147, 147, 147)", // Gray color
    marginHorizontal: 4.5, // Spacing between dots
  },
  pageIndicatorActive: {
    backgroundColor: "rgb(255, 255, 255)", // Pure white
    // No scale transform - clean, simple design
  },

  // Reading card - bottom overlay
  cardContainer: {
    position: "absolute",
    bottom: -40,            // -40px offset for partial visibility (matching L1)
    left: 0,
    right: 0,
    zIndex: 5,
  },
  readingCard: {
    backgroundColor: "rgba(0,0,0,0.9)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  cardHandle: {
    width: 70,
    height: 5,
    backgroundColor: "rgba(255,255,255,0.4)",
    alignSelf: "center",
    marginTop: 12,
    borderRadius: 2,
  },

  // Card content
  collapsedContent: {
    flex: 1,
  },
  readingCardHeader: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
    fontFamily: "DM Sans",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "white",
    fontFamily: "DM Sans",
    opacity: 0.7,
  },

  // Expanded content
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

  // Title section
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

  // Historical content section
  historicalSection: {
    marginBottom: 20,
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
    lineHeight: 20,
    textAlign: "left",
  },

  // Key terms section
  keyTermsSection: {
    marginBottom: 20,
  },
  keyTermsList: {
    gap: 12,
  },
  keyTermItem: {
    marginBottom: 12,
  },
  keyTermName: {
    fontFamily: "DM Sans",
    fontSize: 15,
    fontWeight: "600",
    color: "white",
    marginBottom: 4,
  },
  keyTermDefinition: {
    fontFamily: "DM Sans",
    fontSize: 13,
    color: "white",
    opacity: 0.8,
    lineHeight: 18,
  },

  // Bottom spacer for full scroll
  sheetBottomSpacer: {
    height: 80,
  },
});