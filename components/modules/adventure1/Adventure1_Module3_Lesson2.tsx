// Adventure1_Module3_Lesson2.tsx - Damascus Market Video Carousel
// Video carousel with expandable reading card - matching Module 2 Lesson 1 style

import ArchivesTheme from "@/constants/ArchivesTheme";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { Audio } from 'expo-av';
import { Ionicons } from "@expo/vector-icons";
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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
      "Dawn over Umayyad Damascus: golden rooftops, rising minarets, and the Barada flowing as the city stirs to life",
  },
  {
    id: 2,
    videoUrl: "https://dzyjrzj2lngmg.cloudfront.net/carouselvideos/Adv1_M3_Media2_Video2.mp4",
    caption:
      "In a Damascus workshop, artisans shape fire into beauty - glass lamps glowing with the colors of a rising empire.",
  },
  {
    id: 3,
    videoUrl: "https://dzyjrzj2lngmg.cloudfront.net/carouselvideos/Adv1_M3_Media2_Video3.mp4",
    caption:
      "Afternoon in Umayyad Damascus: a Damascene watches as traders from across empires fill the streets with color, language, and life",
  },
  {
    id: 4,
    videoUrl: "https://dzyjrzj2lngmg.cloudfront.net/carouselvideos/Adv1_M3_Media2_Video4.mp4",
    caption:
      "Umayyad Damascus: bustling traders, vigilant guards, and calligraphy-covered gates welcome the world through dust and sunlight.",
  },
  {
    id: 5,
    videoUrl: "https://dzyjrzj2lngmg.cloudfront.net/carouselvideos/Adv1_M3_Media2_Video5.mp4",
    caption:
      "Evening in Damascus: as shadows grow long, the call to prayer echoes across the empire's beating heart.",
  },
];

export default function Adventure1_Module3_Lesson2({
  onContinue,
  onDismiss,
  onBack,
}: Adventure1_Module3_Lesson2Props) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showReadContent, setShowReadContent] = useState(false);
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [videoProgress, setVideoProgress] = useState<number[]>([0, 0, 0, 0, 0]);
  const [isVideoLoaded, setIsVideoLoaded] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
  ]);

  const scrollViewRef = useRef<ScrollView>(null);
  const videoRefs = useRef<Video[]>([]);
  const panGestureRef = useRef(null);
  const scrollViewGestureRef = useRef(null);

  // Animation values for card expansion - matching Module 2 Lesson 1
  const cardHeight = useRef(new Animated.Value(160)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;

  // Background music hook - Desert Whispers ambience from AWS CloudFront
  const backgroundMusic = useBackgroundMusic(
    { uri: "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv1_M3_L2_Desert Whispers.mp3" },
    {
      volume: 0.15, // 15% volume - very low ambient background (matching M2L1)
      shouldLoop: true,
      fadeInDuration: 1000, // 1 second fade in for faster feedback
      fadeOutDuration: 1500, // 1.5 second fade out
    }
  );

  // Enhanced debug logging for background music
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🎵 [${timestamp}] Adventure1_Module3_Lesson2 - Background music state:`, {
      isLoaded: backgroundMusic.isLoaded,
      isPlaying: backgroundMusic.isPlaying,
      isLoading: backgroundMusic.isLoading
    });
  }, [backgroundMusic.isLoaded, backgroundMusic.isPlaying, backgroundMusic.isLoading]);

  // Component mount logging + Simple audio test
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log('🎵 Adventure1_Module3_Lesson2 component mounted at:', timestamp);
    
    // Simple direct audio test with AWS CloudFront
    const testDirectAudio = async () => {
      try {
        console.log('🎵 [DIRECT TEST M3L2] Attempting to load audio from AWS CloudFront...');
        const audioSource = { uri: "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv1_M3_L2_Desert Whispers.mp3" };
        console.log('🎵 [DIRECT TEST M3L2] Audio source:', audioSource);
        
        const { sound } = await Audio.Sound.createAsync(audioSource, {
          shouldPlay: true,
          volume: 0.15,
          isLooping: true
        });
        
        console.log('🎵 [DIRECT TEST M3L2] AWS audio created and playing successfully!');
        
        // Store sound reference for cleanup
        window.testSoundM3L2 = sound;
        
      } catch (error) {
        console.error('🎵 [DIRECT TEST M3L2] Failed to load/play AWS audio:', error);
      }
    };
    
    // Run direct test after a short delay
    setTimeout(testDirectAudio, 1000);
    
    return () => {
      console.log('🎵 Adventure1_Module3_Lesson2 component unmounting at:', new Date().toLocaleTimeString());
      
      // Cleanup direct test audio
      if (window.testSoundM3L2) {
        console.log('🎵 [DIRECT TEST M3L2] Cleaning up test audio');
        window.testSoundM3L2.unloadAsync().catch(console.error);
        window.testSoundM3L2 = null;
      }
    };
  }, []);

  // Background music lifecycle management
  useEffect(() => {
    const startBackgroundMusic = async () => {
      const timestamp = new Date().toLocaleTimeString();
      if (backgroundMusic.isLoaded && !backgroundMusic.isPlaying) {
        console.log(`🎵 [${timestamp}] Starting market ambience background music`);
        console.log(`🎵 [${timestamp}] Audio state before play:`, {
          isLoaded: backgroundMusic.isLoaded,
          isPlaying: backgroundMusic.isPlaying,
          isLoading: backgroundMusic.isLoading
        });
        
        try {
          await backgroundMusic.play();
          console.log(`🎵 [${timestamp}] Play command sent successfully`);
        } catch (error) {
          console.error(`🎵 [${timestamp}] Failed to start background music:`, error);
        }
      } else if (!backgroundMusic.isLoaded) {
        console.log(`🎵 [${timestamp}] Music not loaded yet, waiting...`);
      } else if (backgroundMusic.isPlaying) {
        console.log(`🎵 [${timestamp}] Music already playing`);
      }
    };

    if (backgroundMusic.isLoaded) {
      console.log(`🎵 [${new Date().toLocaleTimeString()}] Audio is loaded, attempting to start playback`);
      startBackgroundMusic();
    } else {
      console.log(`🎵 [${new Date().toLocaleTimeString()}] Background music not available - continuing without audio`);
    }
  }, [backgroundMusic.isLoaded]);

  useEffect(() => {
    return () => {
      console.log('🎵 Component unmounting - cleaning up all audio');
      // Stop background music (regardless of playing state)
      if (backgroundMusic.stop) {
        console.log('🎵 Stopping background music on component unmount');
        backgroundMusic.stop();
      }
      // Cleanup direct test audio
      if (window.testSoundM3L2) {
        console.log('🎵 Cleaning up direct test audio on unmount');
        window.testSoundM3L2.unloadAsync().catch(console.error);
        window.testSoundM3L2 = null;
      }
    };
  }, []);

  // Handle carousel scroll - matching Module 2 TabView behavior
  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const videoIndex = Math.round(contentOffsetX / SCREEN_WIDTH);

    if (videoIndex !== currentVideoIndex) {
      // Pause previous video
      if (videoRefs.current[currentVideoIndex]) {
        videoRefs.current[currentVideoIndex].pauseAsync();
      }

      setCurrentVideoIndex(videoIndex);

      // Play new video
      if (videoRefs.current[videoIndex]) {
        videoRefs.current[videoIndex].playAsync();
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Handle video playback status
  const handlePlaybackStatusUpdate = (
    status: AVPlaybackStatus,
    videoIndex: number
  ) => {
    if (status.isLoaded) {
      if (!isVideoLoaded[videoIndex]) {
        const newLoaded = [...isVideoLoaded];
        newLoaded[videoIndex] = true;
        setIsVideoLoaded(newLoaded);
        console.log(`🎬 DEBUG: Video ${videoIndex} player ready`);
      }

      // Update video progress
      if (status.durationMillis && status.positionMillis) {
        const progress = status.positionMillis / status.durationMillis;
        const newProgress = [...videoProgress];
        newProgress[videoIndex] = progress;
        setVideoProgress(newProgress);

        console.log(
          `🎬 Video ${videoIndex} progress: ${Math.round(progress * 100)}%`
        );
      }
    }
  };

  // Handle swipe gestures to expand/collapse the card - matching Module 2
  const handleSwipeGesture = (event: any) => {
    const { translationY, velocityY, state } = event.nativeEvent;

    if (state === State.END || state === State.CANCELLED) {
      if (!isCardExpanded) {
        // Card is collapsed - swipe up to expand
        if (translationY < -30 || velocityY < -300) {
          console.log("📖 Reading card swiped up - expanding card");
          expandCard();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } else {
        // Card is expanded - intelligent swipe down detection
        const shouldCloseCard =
          velocityY > 800 ||
          (translationY > 50 && velocityY > 400) ||
          (scrollY <= 10 && translationY > 30 && velocityY > 200);

        if (shouldCloseCard) {
          console.log("📖 Reading card swiped down - collapsing card");
          collapseCard();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    }
  };

  // Expand the card to full height - matching Module 2
  const expandCard = () => {
    setIsCardExpanded(true);
    setShowReadContent(true);

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

  // Collapse the card back to original size - matching Module 2
  const collapseCard = () => {
    setIsCardExpanded(false);
    setShowReadContent(false);

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

  // Handle reading scroll - track scroll position for gesture priority
  const handleReadingScroll = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    setScrollY(contentOffset.y);
  };

  return (
    <>
      <StatusBar hidden />
      <View style={styles.container}>
        {/* Main video carousel - full screen horizontal ScrollView */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          style={styles.carousel}
        >
          {mediaContents.map((content, index) => (
            <View key={content.id} style={styles.videoContainer}>
              {/* Full screen market scene video */}
              <Video
                ref={(ref) => {
                  if (ref) videoRefs.current[index] = ref;
                }}
                source={{ uri: content.videoUrl }}
                style={styles.video}
                resizeMode={ResizeMode.COVER}
                shouldPlay={index === currentVideoIndex}
                isLooping={true}
                isMuted={false}
                onPlaybackStatusUpdate={(status) =>
                  handlePlaybackStatusUpdate(status, index)
                }
              />

              {/* Video progress bar overlay */}
              <View style={styles.videoProgressContainer}>
                <View style={styles.videoProgressBackground}>
                  <View
                    style={[
                      styles.videoProgressFill,
                      {
                        width: `${Math.round(videoProgress[index] * 100)}%`,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Text overlay at the top - matching Module 2 design */}
              <View style={styles.textOverlay}>
                <Text style={styles.captionText}>{content.caption}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Back Button - Top Left */}
        <SafeAreaView style={styles.backButtonContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              // Stop background music when going back
              if (backgroundMusic.isPlaying) {
                console.log('🎵 Stopping background music on back button');
                backgroundMusic.stop();
              }
              // Cleanup direct test audio
              if (window.testSoundM3L2) {
                console.log('🎵 Cleaning up direct test audio on back');
                window.testSoundM3L2.unloadAsync().catch(console.error);
                window.testSoundM3L2 = null;
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
                    // Stop background music before continuing (no await for instant navigation)
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

        {/* Reading Card at Bottom - Expandable - matching Module 2 style */}
        <PanGestureHandler
          ref={panGestureRef}
          onHandlerStateChange={handleSwipeGesture}
          simultaneousHandlers={scrollViewGestureRef}
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

              {/* Collapsed content */}
              <Animated.View
                style={[styles.collapsedContent, { opacity: cardOpacity }]}
              >
                <TouchableOpacity
                  style={styles.readingCardHeader}
                  onPress={expandCard}
                >
                  <Text style={styles.cardTitle}>
                    Damascus: A Living Exchange
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    Walk down a street in Umayyad Damascus...
                  </Text>
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
                    waitFor={panGestureRef}
                    style={styles.expandedScroll}
                    showsVerticalScrollIndicator={false}
                    onScroll={handleReadingScroll}
                    scrollEventThrottle={100}
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
                          Walk down a street in Umayyad Damascus, and you'd hear
                          a dozen languages - but Arabic was the one everyone
                          used to trade. Glassmakers from the former Sasanian
                          lands set up shops, adding sparkle to local mosques.
                          Scholars debated philosophy in tea houses. Goods,
                          faiths, and knowledge all passed through the same city
                          gates. Damascus wasn't just busy - it was alive with
                          exchange.
                        </Text>
                      </View>

                      {/* Key Terms Section */}
                      <View style={styles.keyTermsSection}>
                        <Text style={styles.sectionTitle}>Key Terms</Text>
                        <View style={styles.keyTermsContainer}>
                          <KeyTermRow
                            term="Multilingual Trade"
                            definition="Using multiple languages but Arabic as the common trading language"
                          />
                          <KeyTermRow
                            term="Sasanian Craftsmen"
                            definition="Skilled artisans from the former Persian empire who brought glassmaking techniques"
                          />
                          <KeyTermRow
                            term="Cultural Exchange"
                            definition="The mixing of goods, faiths, and knowledge through Damascus"
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
