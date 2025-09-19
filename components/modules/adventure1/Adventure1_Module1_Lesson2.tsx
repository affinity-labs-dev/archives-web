// Adventure1_Module1_Lesson2.tsx - Pre-Islamic Arabian Life in Mecca Video Carousel
// Video carousel with expandable reading card showing trade, poetry, and faith

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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get(Platform.OS === 'android' ? "screen" : "window");

interface Adventure1_Module1_Lesson2Props {
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void;
}

interface MediaContent {
  id: number;
  videoUrl: string;
  caption: string;
}

// Media content with AWS CloudFront video URLs for Rise of Islam Era
const mediaContents: MediaContent[] = [
  {
    id: 1,
    videoUrl: "http://d3bi5e5vkj68.cloudfront.net/Carousel-videos/ROI_Adv1_M1_Media2_Video1.mp4",
    caption: "Mecca was an important resting point for caravans carrying goods between Yemen in the south and Syria in the north, making it a center of trade.",
  },
  {
    id: 2,
    videoUrl: "http://d3bi5e5vkj68.cloudfront.net/Carousel-videos/ROI_Adv1_M1_Media2_Video2.mp4",
    caption: "Poetry contests were popular events in pre-Islamic Arabia. Tribes used poetry to share stories, show pride, and build their reputations.",
  },
  {
    id: 3,
    videoUrl: "http://d3bi5e5vkj68.cloudfront.net/Carousel-videos/ROI_Adv1_M1_Media2_Video3.mp4",
    caption: "Tribes often fought in ongoing conflicts driven by raids, insults, or offenses against honor. Some of these conflicts continued for generations.",
  },
  {
    id: 4,
    videoUrl: "https://d3bi5e5vkj68.cloudfront.net/Carousel-videos/ROI_Adv1_M1_Media2_Video4.mp4",
    caption: "Arab tribes worshipped multiple gods, placing idols of these gods at shrines and altars throughout the city.",
  },
];

export default function Adventure1_Module1_Lesson2({
  onContinue,
  onDismiss,
  onBack,
}: Adventure1_Module1_Lesson2Props) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [touchStart, setTouchStart] = useState<{y: number, time: number} | null>(null);
  const [isCardGestureActive, setIsCardGestureActive] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const panGestureRef = useRef(null);
  const scrollViewGestureRef = useRef(null);

  // Create video players for each media content with proper setup
  const videoPlayer1 = useVideoPlayer(mediaContents[0].videoUrl, player => {
    player.loop = true;
    player.muted = false;
    console.log(`🎬 Video player 0 created for URL: ${mediaContents[0].videoUrl}`);
  });
  const videoPlayer2 = useVideoPlayer(mediaContents[1].videoUrl, player => {
    player.loop = true;
    player.muted = false;
    console.log(`🎬 Video player 1 created for URL: ${mediaContents[1].videoUrl}`);
  });
  const videoPlayer3 = useVideoPlayer(mediaContents[2].videoUrl, player => {
    player.loop = true;
    player.muted = false;
    console.log(`🎬 Video player 2 created for URL: ${mediaContents[2].videoUrl}`);
  });
  const videoPlayer4 = useVideoPlayer(mediaContents[3].videoUrl, player => {
    player.loop = true;
    player.muted = false;
    console.log(`🎬 Video player 3 created for URL: ${mediaContents[3].videoUrl}`);
  });

  const videoPlayers = [videoPlayer1, videoPlayer2, videoPlayer3, videoPlayer4];

  // Auto-play first video when ready
  useEffect(() => {
    console.log(`🎬 Setting up auto-play for first video`);
    videoPlayer1.play();
  }, [videoPlayer1]);

  // Animation values for card expansion
  const cardHeight = useRef(new Animated.Value(160)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;

  // Background music hook - Ambient desert atmosphere for pre-Islamic Arabia
  const backgroundMusic = useBackgroundMusic(
    { uri: "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv1_M1_L2_Desert+Winds.mp3" },
    {
      volume: 0.4, // 40% volume to not compete with video audio
      shouldLoop: true,
    }
  );

  // Enhanced debug logging for background music - Platform-compatible
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🎵 [${timestamp}] Adventure1_Module1_Lesson2 - Background music state:`, {
      isLoaded: backgroundMusic.isLoaded,
      isPlaying: backgroundMusic.isPlaying,
      isLoading: backgroundMusic.isLoading || false, // Android may not have isLoading
      platform: Platform.OS
    });

    // Additional debugging for audio file loading (AWS CloudFront)
    if (!backgroundMusic.isLoaded && !(backgroundMusic.isLoading)) {
      console.log('🎵 Audio not loading - AWS CloudFront source should be available');
      console.log('🎵 AWS Audio URL: https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv1_M1_L2_Desert+Winds.mp3');
    }
  }, [backgroundMusic.isLoaded, backgroundMusic.isPlaying]);

  // Component mount logging
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log('🎵 Adventure1_Module1_Lesson2 component mounted at:', timestamp);
  }, []);

  // Simple status logging - no manual triggering needed (auto-play)
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    if (backgroundMusic.isLoaded && backgroundMusic.isPlaying) {
      console.log(`🎵 [${timestamp}] Background music auto-playing successfully`);
    } else if (backgroundMusic.isLoaded && !backgroundMusic.isPlaying) {
      console.log(`🎵 [${timestamp}] Background music loaded but not playing`);
    } else {
      console.log(`🎵 [${timestamp}] Background music not loaded yet`);
    }
  }, [backgroundMusic.isLoaded, backgroundMusic.isPlaying]);

  // Handle video switching when index changes
  useEffect(() => {
    console.log(`🎬 Video index changed to: ${currentVideoIndex}`);
    videoPlayers.forEach((player, index) => {
      try {
        if (index === currentVideoIndex) {
          player.play();
        } else {
          console.log(`🎬 Pausing video ${index}`);
          player.pause();
        }
      } catch (error) {
        console.error(`🎬 Error controlling video ${index}:`, error);
      }
    });
  }, [currentVideoIndex]);

  // Cleanup background music when component unmounts
  useEffect(() => {
    return () => {
      console.log('🎵 Component unmounting - cleaning up all audio');

      // Stop background music hook
      if (backgroundMusic.stop) {
        console.log('🎵 Stopping background music on component unmount');
        backgroundMusic.stop();
      }
    };
  }, []);

  // Handle carousel scroll
  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const videoIndex = Math.round(contentOffsetX / SCREEN_WIDTH);

    if (videoIndex !== currentVideoIndex && videoIndex >= 0 && videoIndex < videoPlayers.length) {
      console.log(`🎬 Scroll detected: switching from video ${currentVideoIndex} to ${videoIndex}`);

      // Just update the index, let useEffect handle the video switching
      setCurrentVideoIndex(videoIndex);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Enhanced Android touch handlers with improved sensitivity
  const handleTouchStart = (event: any) => {
    setTouchStart({
      y: event.nativeEvent.pageY,
      time: Date.now()
    });
    setIsCardGestureActive(true);
    console.log("📖 Android card gesture started - blocking carousel");
  };

  const handleTouchEnd = (event: any) => {
    setIsCardGestureActive(false);
    console.log("📖 Android card gesture ended - allowing carousel");

    if (!touchStart) return;

    const touchEnd = event.nativeEvent.pageY;
    const distance = touchStart.y - touchEnd; // Positive = swipe up
    const time = Date.now() - touchStart.time;

    // Improved Android swipe detection with better sensitivity
    const minDistance = 25; // Reduced from 40 for better responsiveness
    const maxTime = 300; // Shorter time for more responsive gestures
    const velocity = Math.abs(distance) / time; // Calculate velocity
    const velocityThreshold = 0.4; // Reduced threshold for better responsiveness

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

  // Enhanced iOS PanGestureHandler with gesture coordination
  const handleSwipeGesture = (event: any) => {
    if (Platform.OS !== 'ios') return;

    const { state, translationY, velocityY } = event.nativeEvent;

    // Track gesture activity for carousel coordination
    if (state === State.BEGAN || state === State.ACTIVE) {
      setIsCardGestureActive(true);
      console.log("📱 iOS card gesture started - blocking carousel");
    } else if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      setIsCardGestureActive(false);
      console.log("📱 iOS card gesture ended - allowing carousel");
    }

    if (state === State.END) {
      console.log("📱 iOS PanGesture detected", {
        translationY,
        velocityY,
        isCardExpanded,
        platform: Platform.OS
      });

      // iOS-optimized swipe detection with improved sensitivity
      const minDistance = 25; // Reduced from 30 for better responsiveness
      const minVelocity = 400; // Reduced from 500 for better responsiveness

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

  // Expand the card to full height
  const expandCard = () => {
    setIsCardExpanded(true);

    Animated.parallel([
      Animated.spring(cardHeight, {
        toValue: SCREEN_HEIGHT * 0.85,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  };

  // Collapse the card back to original size
  const collapseCard = () => {
    setIsCardExpanded(false);

    Animated.parallel([
      Animated.spring(cardHeight, {
        toValue: 160,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  };

  return (
    <>
      {Platform.OS === 'android' && (
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
              {/* Full screen video for pre-Islamic Arabia */}
              <VideoView
                player={videoPlayers[index]}
                style={styles.video}
                contentFit={Platform.OS === 'android' ? "fill" : "cover"}
                nativeControls={false}
                allowsFullscreen={false}
                allowsPictureInPicture={false}
                useExoShutter={Platform.OS === 'android' ? false : undefined}
                surfaceType={Platform.OS === 'android' ? "surfaceView" : undefined}
              />

              {/* Text overlay with descriptive caption */}
              <View style={styles.textOverlay}>
                <Text style={styles.captionText}>
                  {content.caption}
                </Text>
              </View>
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
                console.log('🎵 Stopping background music on back button');
                backgroundMusic.stop();
              }

              (onBack || onDismiss)();
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
                    // Stop all audio before continuing
                    if (backgroundMusic.isPlaying) {
                      console.log(
                        "🎵 Stopping background music before continue"
                      );
                      backgroundMusic.stop();
                    }

                    onContinue();
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
        {Platform.OS === 'ios' ? (
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
                      Life in Pre-Islamic Mecca
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      Life in Mecca was shaped by trade, poetry, and faith...
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
                      waitFor={Platform.OS === 'ios' ? panGestureRef : undefined}
                    >
                    <View style={styles.expandedContentInner}>
                      {/* Title Section */}
                      <View style={styles.titleSection}>
                        <Text style={styles.sheetTitle}>
                          Life in Pre-Islamic Mecca
                        </Text>
                        <Text style={styles.sheetSubtitle}>
                          Module 1 • Lesson 2
                        </Text>
                      </View>

                      {/* Historical Content */}
                      <View style={styles.historicalSection}>
                        <Text style={styles.sectionTitle}>
                          Historical Context
                        </Text>
                        <Text style={styles.historicalText}>
                          Life in Mecca was shaped by trade, poetry, and faith. Caravans rested here, poets competed to win honor for their tribes, and shrines filled the city with idols of many gods. Rivalries often led to conflict, but shared traditions tied people together. Mecca stood as both a marketplace of goods and a crossroads of culture.
                        </Text>
                      </View>

                      {/* Key Terms Section */}
                      <View style={styles.keyTermsSection}>
                        <Text style={styles.sectionTitle}>Key Terms</Text>
                        <View style={styles.keyTermsContainer}>
                          <KeyTermRow
                            term="Trade Caravans"
                            definition="Groups of merchants traveling between Yemen and Syria, using Mecca as a vital resting point"
                          />
                          <KeyTermRow
                            term="Poetry Contests"
                            definition="Competitive events where tribal poets shared stories and built their tribe's reputation"
                          />
                          <KeyTermRow
                            term="Tribal Conflicts"
                            definition="Ongoing warfare driven by raids, honor, and insults that could last for generations"
                          />
                          <KeyTermRow
                            term="Idol Worship"
                            definition="Practice of worshipping multiple gods through statues placed at shrines throughout the city"
                          />
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
        <View
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
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

              {/* Android Collapsed content with improved styling */}
              <Animated.View
                style={[styles.collapsedContent, { opacity: cardOpacity }]}
              >
                <View style={styles.collapsedContentWrapper}>
                  <Text style={styles.collapsedTitle}>
                    Life in Pre-Islamic Mecca
                  </Text>
                  <Text style={styles.collapsedSubtitle}>
                    Life in Mecca was shaped by trade, poetry, and faith...
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
                  >
                    <View style={styles.expandedContentInner}>
                      {/* Title Section */}
                      <View style={styles.titleSection}>
                        <Text style={styles.sheetTitle}>
                          Life in Pre-Islamic Mecca
                        </Text>
                        <Text style={styles.sheetSubtitle}>
                          Module 1 • Lesson 2
                        </Text>
                      </View>

                      {/* Historical Content */}
                      <View style={styles.historicalSection}>
                        <Text style={styles.sectionTitle}>
                          Historical Context
                        </Text>
                        <Text style={styles.historicalText}>
                          Life in Mecca was shaped by trade, poetry, and faith. Caravans rested here, poets competed to win honor for their tribes, and shrines filled the city with idols of many gods. Rivalries often led to conflict, but shared traditions tied people together. Mecca stood as both a marketplace of goods and a crossroads of culture.
                        </Text>
                      </View>

                      {/* Key Terms Section */}
                      <View style={styles.keyTermsSection}>
                        <Text style={styles.sectionTitle}>Key Terms</Text>
                        <View style={styles.keyTermsContainer}>
                          <KeyTermRow
                            term="Trade Caravans"
                            definition="Groups of merchants traveling between Yemen and Syria, using Mecca as a vital resting point"
                          />
                          <KeyTermRow
                            term="Poetry Contests"
                            definition="Competitive events where tribal poets shared stories and built their tribe's reputation"
                          />
                          <KeyTermRow
                            term="Tribal Conflicts"
                            definition="Ongoing warfare driven by raids, honor, and insults that could last for generations"
                          />
                          <KeyTermRow
                            term="Idol Worship"
                            definition="Practice of worshipping multiple gods through statues placed at shrines throughout the city"
                          />
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
        </View>
      )}
      </View>
    </>
  );
}

// Key Term Row Component
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },

  // Main carousel - full screen
  carousel: {
    flex: 1,
    ...(Platform.OS === 'android' && {
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

  // Text overlay at top
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

  // Page indicators
  pageIndicatorsOnly: {
    position: "absolute",
    bottom: 180, // Position above the reading card
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  pageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.6)", // 60% opacity for inactive dots
    marginHorizontal: 4,
  },
  pageIndicatorActive: {
    backgroundColor: "rgba(255, 255, 255, 0.9)", // 90% opacity for active dot
    transform: [{ scale: 1.2 }],
  },

  // Reading Card Container
  cardContainer: {
    position: "absolute",
    bottom: -40,
    left: 0,
    right: 0,
  },

  // Reading Card - Swipeable
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

  // Back Button - Top Left
  backButtonContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 20,
    paddingTop: 8,
    paddingLeft: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Continue Button - Top Right
  continueButtonContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 20,
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
    backgroundColor: "rgba(0,0,0,0.3)", // Gray when disabled
  },

  // Collapsed and expanded content styles
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

  // Historical Content
  historicalSection: {
    marginBottom: 20,
  },

  // Title section
  titleSection: {
    marginBottom: 24,
  },

  // Content sections
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

  // Bottom spacer to ensure full scroll
  sheetBottomSpacer: {
    height: 60,
  },

  // Key terms section
  keyTermsSection: {
    marginBottom: 24,
  },
  keyTermsContainer: {
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
  },

  keyTermRow: {
    marginBottom: 8,
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
});