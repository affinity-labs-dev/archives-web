// Adventure1_Module3_Lesson2.tsx - Damascus Market Video Carousel
// Video carousel with expandable reading card - matching Module 2 Lesson 1 style

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

interface Adventure1_Module3_Lesson2Props {
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void;
}

interface MediaContent {
  id: number;
  videoUrl: string;
  caption: string;
}

// Media content with AWS CloudFront video URLs - standardized for Adventure 1
const mediaContents: MediaContent[] = [
  {
    id: 1,
    videoUrl: "https://dzyjrzj2lngmg.cloudfront.net/carouselvideos/Adv1_M3_Media2_Video1.mp4",
    caption:
      "Damascus Thrives on the Barada river, it water powering farms, markets, and daily life in the new capital",
  },
  {
    id: 2,
    videoUrl: "https://dzyjrzj2lngmg.cloudfront.net/carouselvideos/Adv1_M3_Media2_Video2.mp4",
    caption:
      "Damascus was famous for glassmaking, a skill adopted from the Sasanian Persians and exported across the empire",
  },
  {
    id: 3,
    videoUrl: "https://dzyjrzj2lngmg.cloudfront.net/carouselvideos/Adv1_M3_Media2_Video3.mp4",
    caption:
      "Merchants from Byzantium, Persia, and Arabia crowded markets, trading silk, spices, and knowledge",
  },
  {
    id: 4,
    videoUrl: "https://dzyjrzj2lngmg.cloudfront.net/carouselvideos/Adv1_M3_Media2_Video4.mp4",
    caption:
      "In tea houses, scholars debated ideas - like al Battani's discovery that a year is 365 days and 5 hours - more accurate than the Roman calendar.",
  },
  {
    id: 5,
    videoUrl: "https://dzyjrzj2lngmg.cloudfront.net/carouselvideos/Adv1_M3_Media2_Video5.mp4",
    caption:
      "Damascus had seven gates, like Bab al-Saghir and Bab al-Faradis, each opening to trade routes.",
  },
];

export default function Adventure1_Module3_Lesson2({
  onContinue,
  onDismiss,
  onBack,
}: Adventure1_Module3_Lesson2Props) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isCardExpanded, setIsCardExpanded] = useState(false);
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
  const videoPlayer5 = useVideoPlayer(mediaContents[4].videoUrl, player => {
    player.loop = true;
    player.muted = false;
    console.log(`🎬 Video player 4 created for URL: ${mediaContents[4].videoUrl}`);
  });
  
  const videoPlayers = [videoPlayer1, videoPlayer2, videoPlayer3, videoPlayer4, videoPlayer5];
  
  // Auto-play first video when ready
  useEffect(() => {
    console.log(`🎬 Setting up auto-play for first video`);
    videoPlayer1.play();
  }, [videoPlayer1]);

  // Animation values for card expansion - matching Module 2 Lesson 1
  const cardHeight = useRef(new Animated.Value(160)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;

  // Background music hook - Desert Whispers ambience from AWS CloudFront
  const backgroundMusic = useBackgroundMusic(
    { uri: "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv1_M3_L2_Desert+Whispers.mp3" },
    {
      volume: 0.5, // 50% volume - matching Module2_Lesson1
      shouldLoop: true,
    }
  );

  // Enhanced debug logging for background music - Platform-compatible
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🎵 [${timestamp}] Adventure1_Module3_Lesson2 - Background music state:`, {
      isLoaded: backgroundMusic.isLoaded,
      isPlaying: backgroundMusic.isPlaying,
      isLoading: backgroundMusic.isLoading || false, // Android may not have isLoading
      platform: Platform.OS
    });
    
    // Additional debugging for audio file loading (AWS CloudFront)
    if (!backgroundMusic.isLoaded && !(backgroundMusic.isLoading)) {
      console.log('🎵 Audio not loading - AWS CloudFront source should be available');
      console.log('🎵 AWS Audio URL: https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv1_M3_L2_Desert+Whispers.mp3');
    }
  }, [backgroundMusic.isLoaded, backgroundMusic.isPlaying]);

  // Component mount logging - Direct audio fallback removed (no longer needed with platform-specific audio)
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log('🎵 Adventure1_Module3_Lesson2 component mounted at:', timestamp);
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

  // Debug logging: Carousel scroll state monitoring
  useEffect(() => {
    console.log(
      `🎠 Carousel scroll state: ${
        isCardGestureActive
          ? "🔒 BLOCKED (card gesture active)"
          : "✅ ENABLED (can swipe videos)"
      }`
    );
  }, [isCardGestureActive]);

  // Safety mechanism: Auto-reset gesture state if stuck
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isCardGestureActive) {
        console.log("⚠️ Safety reset: Clearing stuck gesture state");
        setIsCardGestureActive(false);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isCardExpanded]);

  // Handle carousel scroll - matching Module 2 TabView behavior
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


  // Universal gesture handler for both iOS and Android
  const handleSwipeGesture = (event: any) => {
    const { state, translationY, velocityY } = event.nativeEvent;

    // Track gesture activity for carousel coordination
    if (state === State.BEGAN || state === State.ACTIVE) {
      setIsCardGestureActive(true);
      console.log("📱 Card gesture started - blocking carousel");
    }

    if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      console.log("📱 Gesture state:", state, {
        translationY,
        velocityY,
        isCardExpanded,
        platform: Platform.OS
      });

      if (state === State.END) {
        const minDistance = 20;
        const minVelocity = 300;

        // Swipe up to expand
        if (!isCardExpanded &&
            (translationY < -minDistance || velocityY < -minVelocity)) {
          expandCard();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          return;
        }
        // Swipe down to collapse
        else if (isCardExpanded &&
                 (translationY > minDistance || velocityY > minVelocity)) {
          collapseCard();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          return;
        }
      }

      // Re-enable carousel after gesture completes
      setIsCardGestureActive(false);
      console.log("📱 Gesture ended - carousel re-enabled");
    }
  };

  // Expand the card to full height - matching Module 2
  const expandCard = () => {
    console.log("🎬 Card expansion starting...");
    setIsCardExpanded(true);

    // ✅ IMMEDIATE FIX: Re-enable carousel BEFORE animation starts
    setIsCardGestureActive(false);
    console.log("🎬 Carousel re-enabled IMMEDIATELY ✅");

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
    ]).start(() => {
      console.log("🎬 Card expansion animation finished");
    });
  };

  // Collapse the card back to original size - matching Module 2
  const collapseCard = () => {
    console.log("🎬 Card collapse starting...");
    setIsCardExpanded(false);

    // ✅ IMMEDIATE FIX: Re-enable carousel BEFORE animation starts
    setIsCardGestureActive(false);
    console.log("🎬 Carousel re-enabled IMMEDIATELY ✅");

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
    ]).start(() => {
      console.log("🎬 Card collapse animation finished");
    });
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
              {/* Full screen market scene video */}
              <VideoView
                player={videoPlayers[index]}
                style={styles.video}
                contentFit={Platform.OS === 'android' ? "fill" : "cover"}
                nativeControls={false}
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
                    // Stop all audio before continuing (no await for instant navigation)
                    if (backgroundMusic.isPlaying) {
                      console.log(
                        "🎵 Stopping background music before continue"
                      );
                      backgroundMusic.stop(); // Remove await for instant navigation
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

        {/* Reading Card at Bottom - Universal Gesture Handling */}
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
                      Damascus: A Living Exchange
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      Walk down a street in Umayyad Damascus and you would hear many languages...
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
                          Damascus: A Living Exchange
                        </Text>
                        <Text style={styles.sheetSubtitle}>
                          Module 3 • Lesson 2
                        </Text>
                      </View>

                      {/* Historical Content */}
                      <View style={styles.historicalSection}>
                        <Text style={styles.sectionTitle}>
                          Historical Context
                        </Text>
                        <Text style={styles.historicalText}>
                          Walk down a street in Umayyad Damascus and you would hear many languages, with traders mostly using Arabic. The main road, Straight Street, crossed the old city from Bab Sharqi to the western gate. The Bible mentions that Paul the Apostle once lived in a house on the street. Persian glassmakers sold bright lamps and tiles for mosques, while scholars debated in tea houses. Goods, beliefs, and knowledge shared the same streets, and the city felt alive.
                        </Text>
                      </View>

                      {/* Key Terms Section */}
                      <View style={styles.keyTermsSection}>
                        <Text style={styles.sectionTitle}>Key Terms</Text>
                        <View style={styles.keyTermsContainer}>
                          <KeyTermRow
                            term="Straight Street"
                            definition="The main road crossing Damascus from Bab Sharqi to the western gate"
                          />
                          <KeyTermRow
                            term="Bab Sharqi"
                            definition="The eastern gate of Damascus where Straight Street began"
                          />
                          <KeyTermRow
                            term="Persian Glassmakers"
                            definition="Craftsmen who sold bright lamps and mosque tiles on Damascus streets"
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
      </View>
    </>
  );
}

// Key Term Row Component - matching Module 2 style
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

  // Video progress bar overlay
  videoProgressContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    zIndex: 5,
  },
  videoProgressBackground: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  videoProgressFill: {
    height: "100%",
    backgroundColor: ArchivesTheme.colors.persianOrange,
  },

  // Text overlay at top - matching Module 2 design
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

  // Reading Card Container - matching Module 2
  cardContainer: {
    position: "absolute",
    bottom: -40,
    left: 0,
    right: 0,
  },

  // Reading Card - Swipeable - matching Module 2
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

  // Collapsed and expanded content styles - matching Module 2
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

  // Historical Content - matching Module 2
  historicalSection: {
    marginBottom: 20,
  },

  // Title section
  titleSection: {
    marginBottom: 24,
  },
  readTitle: {
    fontFamily: "DM Sans",
    fontSize: 20,
    fontWeight: "600",
    color: ArchivesTheme.colors.mutedNavy,
    marginBottom: 8,
  },
  readSubtitle: {
    fontFamily: "DM Sans",
    fontSize: 12,
    color: "rgba(0, 0, 0, 0.6)",
  },

  // Content sections
  contentSection: {
    marginBottom: 24,
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

});
