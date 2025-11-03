// Adventure1_Module2_Lesson1.tsx - Umayyad Palace Interior Carousel
// Full-screen TabView carousel showing palace interior images

import ArchivesTheme from "@/constants/ArchivesTheme";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
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
import {
  ScrollView as GestureHandlerScrollView,
  PanGestureHandler,
  State,
} from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const DOTS_BOTTOM_POSITION = 180;

interface Adventure1_Module2_Lesson1Props {
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void;
}

// Palace interior data with AWS CloudFront URLs
const palaceInteriors = [
  {
    id: 1,
    imageUrl: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv1_M2_Img01.jpg",
    title: "Throne Room",
    caption:
      "The throne room glittered with gold mosaics crafted by Byzantine artists, once rivals but now working for the Umayyads.",
  },
  {
    id: 2,
    imageUrl: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv1_M2_Img02.jpg",
    title: "Reception Hall",
    caption:
      "Striped arches and lamps light the reception hall, a design that influenced buildings like Cordoba's mosque in Spain.",
  },
  {
    id: 3,
    imageUrl: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv1_M2_Img03.jpg",
    title: "Private Courtyard Garden",
    caption:
      "The courtyard's fountains and trees stayed cool thanks to water channels, turning the palace into an oasis.",
  },
  {
    id: 4,
    imageUrl: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv1_M2_Img04.jpg",
    title: "Audience Chamber",
    caption:
      "In the audience chamber, laws and taxes were debated in Arabic, Greek, and Syriac.",
  },
  {
    id: 5,
    imageUrl: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv1_M2_Img05.jpg",
    title: "Scriptorium",
    caption:
      "Scribes in the scriptorium copied records, switching between Arabic, Greek, and Syriac.",
  },
];

export default function Adventure1_Module2_Lesson1({
  onContinue,
  onDismiss,
  onBack,
}: Adventure1_Module2_Lesson1Props) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showReadContent, setShowReadContent] = useState(false);
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollViewGestureRef = useRef(null);
  const panGestureRef = useRef(null);
  const [isCardGestureActive, setIsCardGestureActive] = useState(false);

  // Animation values for card expansion
  const cardHeight = useRef(new Animated.Value(160)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;

  // Background music hook - Auto-play immediately
  const backgroundMusic = useBackgroundMusic(
    {
      uri: "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv1_M2_L1_Desert+Whispers.mp3",
    },
    {
      volume: 0.5, // 50% volume
      shouldLoop: true,
    }
  );

  // Enhanced debug logging for background music - Platform-compatible
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(
      `🎵 [${timestamp}] Adventure1_Module2_Lesson1 - Background music state:`,
      {
        isLoaded: backgroundMusic.isLoaded,
        isPlaying: backgroundMusic.isPlaying,
        isLoading: backgroundMusic.isLoading || false, // Android may not have isLoading
        platform: Platform.OS,
      }
    );

    // Additional debugging for audio file loading (AWS CloudFront)
    if (!backgroundMusic.isLoaded && !backgroundMusic.isLoading) {
      console.log(
        "🎵 Audio not loading - AWS CloudFront source should be available"
      );
      console.log(
        "🎵 AWS Audio URL: https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv1_M2_L1_Desert+Whispers.mp3"
      );
    }
  }, [backgroundMusic.isLoaded, backgroundMusic.isPlaying]);

  // Component mount logging - Direct audio fallback removed (no longer needed with platform-specific audio)
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(
      "🎵 Adventure1_Module2_Lesson1 component mounted at:",
      timestamp
    );
  }, []);

  // Handle carousel scroll - matching iOS TabView behavior
  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const imageIndex = Math.round(contentOffsetX / SCREEN_WIDTH);

    if (imageIndex !== currentImageIndex) {
      setCurrentImageIndex(imageIndex);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Simple status logging - no manual triggering needed (auto-play)
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    if (backgroundMusic.isLoaded && backgroundMusic.isPlaying) {
      console.log(
        `🎵 [${timestamp}] Background music auto-playing successfully`
      );
    } else if (backgroundMusic.isLoaded && !backgroundMusic.isPlaying) {
      console.log(`🎵 [${timestamp}] Background music loaded but not playing`);
    } else {
      console.log(`🎵 [${timestamp}] Background music not loaded yet`);
    }
  }, [backgroundMusic.isLoaded, backgroundMusic.isPlaying]);

  // Cleanup background music when component unmounts
  useEffect(() => {
    return () => {
      console.log("🎵 Component unmounting - cleaning up all audio");

      // Stop background music hook
      if (backgroundMusic.stop) {
        console.log("🎵 Stopping background music on component unmount");
        backgroundMusic.stop();
      }
    };
  }, []);

  // Debug logging for carousel scroll state
  useEffect(() => {
    console.log(
      `🎠 Carousel scroll state: ${
        isCardGestureActive
          ? "🔒 BLOCKED (card gesture active)"
          : "✅ ENABLED (can swipe images)"
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

  // Navigate to next image (Swipe button functionality)
  const handleSwipeNext = () => {
    if (currentImageIndex < palaceInteriors.length - 1) {
      const nextIndex = currentImageIndex + 1;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * SCREEN_WIDTH,
        animated: true,
      });
      setCurrentImageIndex(nextIndex);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Universal gesture handler using PanGestureHandler (works on all platforms)
  const handleSwipeGesture = (event: any) => {
    const { state, translationY, velocityY } = event.nativeEvent;

    // Track gesture activity for carousel coordination
    if (state === State.BEGAN || state === State.ACTIVE) {
      setIsCardGestureActive(true);
      console.log("📱 Card gesture started - blocking carousel");
    }

    // Handle ALL end states (END, CANCELLED, FAILED)
    if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      console.log("📱 Gesture state:", state, {
        translationY,
        velocityY,
        isCardExpanded,
        platform: Platform.OS,
      });

      // Only process swipe if gesture completed successfully
      if (state === State.END) {
        const minDistance = 20;
        const minVelocity = 300;

        if (
          !isCardExpanded &&
          (translationY < -minDistance || velocityY < -minVelocity)
        ) {
          console.log("📱 Swipe up detected - expanding card", {
            translationY,
            velocityY,
          });
          expandCard();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          return;
        } else if (
          isCardExpanded &&
          (translationY > minDistance || velocityY > minVelocity)
        ) {
          console.log("📱 Swipe down detected - collapsing card", {
            translationY,
            velocityY,
          });
          collapseCard();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          return;
        }
      }

      // Always reset if we reach here (gesture ended without action)
      setIsCardGestureActive(false);
      console.log("📱 Gesture ended - carousel re-enabled");
    }
  };

  // Expand the card to full height
  const expandCard = () => {
    console.log("🎬 Card expansion starting...");
    setIsCardExpanded(true);
    setShowReadContent(true);

    // ✅ IMMEDIATE FIX: Reset gesture state IMMEDIATELY for instant carousel re-enable
    // Animation plays in background (400-600ms) but carousel works right away
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

  // Collapse the card back to original size
  const collapseCard = () => {
    console.log("🎬 Card collapse starting...");
    setIsCardExpanded(false);
    setShowReadContent(false);

    // ✅ IMMEDIATE FIX: Reset gesture state IMMEDIATELY for instant carousel re-enable
    // Animation plays in background (400-600ms) but carousel works right away
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

  // Handle reading scroll - track scroll position for gesture priority
  const handleReadingScroll = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    setScrollY(contentOffset.y);
  };

  return (
    <>
      {Platform.OS === "android" && (
        <StatusBar barStyle="dark-content" backgroundColor="#F4EBDB" />
      )}
      <View style={styles.container}>
        {/* Main carousel - full screen TabView equivalent */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEnabled={!isCardGestureActive} // Disable carousel when card gesture is active
          style={styles.carousel}
        >
          {palaceInteriors.map((interior, index) => (
            <View key={interior.id} style={styles.imageContainer}>
              {/* Full screen palace interior image */}
              <Image
                source={{ uri: interior.imageUrl }}
                style={styles.palaceImage}
                resizeMode="cover"
              />

              {/* Text overlay with descriptive caption */}
              <View style={styles.textOverlay}>
                <Text style={styles.captionText}>{interior.caption}</Text>
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
                console.log("🎵 Stopping background music on back button");
                backgroundMusic.stop();
              }

              (onBack || onDismiss)();
            }}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Continue Button - Top Right (only active on final image) */}
        <SafeAreaView style={styles.continueButtonContainer}>
          <TouchableOpacity
            style={[
              styles.topContinueButton,
              currentImageIndex !== palaceInteriors.length - 1 &&
                styles.topContinueButtonDisabled,
            ]}
            onPress={
              currentImageIndex === palaceInteriors.length - 1
                ? () => {
                    // Light haptic feedback
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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
            disabled={currentImageIndex !== palaceInteriors.length - 1}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={
                currentImageIndex === palaceInteriors.length - 1
                  ? "white"
                  : "#666"
              }
            />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Page indicator dots - centered */}
        {!isCardExpanded && (
          <View style={styles.pageIndicatorsOnly}>
            {palaceInteriors.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.pageIndicator,
                  currentImageIndex === index && styles.pageIndicatorActive,
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
                      Interiors of the Umayyad Palace
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      The Umayyad palace in Damascus was called the Green Dome...
                    </Text>
                  </View>
                </TouchableOpacity>
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
                    onScroll={handleReadingScroll}
                    scrollEventThrottle={100}
                    waitFor={panGestureRef}
                    simultaneousHandlers={panGestureRef}
                  >
                    <View style={styles.expandedContentInner}>
                      {/* Title Section - Tappable to collapse */}
                      <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                        <View style={styles.titleSection}>
                          <Text style={styles.sheetTitle}>
                            Interiors of the Umayyad Palace
                          </Text>
                          <Text style={styles.sheetSubtitle}>
                            Module 2 • Lesson 1
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {/* Historical Content */}
                      <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                        <View style={styles.historicalSection}>
                          <Text style={styles.sectionTitle}>
                            Historical Context
                          </Text>
                          <Text style={styles.historicalText}>
                            The Umayyad palace in Damascus was called the Green
                            Dome, or al-Khadra. Muʿawiya built it beside the
                            Umayyad Mosque as a working seat of power, with a
                            coin mint, stables, and a prison. Sources describe a
                            domed audience hall, marble floors, and gardens with
                            fountains, myrtles, and vines. Later rulers still
                            used the complex, but by the 1000s it had vanished,
                            and travelers wrote that markets stood where the
                            palace once was.
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {/* Key Terms Section */}
                      <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                        <View style={styles.keyTermsSection}>
                          <Text style={styles.sectionTitle}>Key Terms</Text>
                          <View style={styles.keyTermsContainer}>
                            <KeyTermRow
                              term="Green Dome (al-Khadra)"
                              definition="The name of the Umayyad palace complex built by Muʿawiya in Damascus"
                            />
                            <KeyTermRow
                              term="Audience Hall"
                              definition="The domed reception room with marble floors where the caliph met visitors"
                            />
                          </View>
                        </View>
                      </TouchableOpacity>

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

// Key Term Row Component - EXACT SwiftUI: keyTermRow(term:definition:)
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
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: "relative",
    justifyContent: "center", // Center vertically
    alignItems: "center", // Center horizontally
    backgroundColor: "black", // Ensure no white gaps
    overflow: "hidden", // Prevent any content from spilling out
  },
  palaceImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: "absolute", // Absolute positioning for perfect centering
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Text overlay at top - matching iOS design
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

  // Page indicators only - Figma design with dark pill container
  pageIndicatorsOnly: {
    position: "absolute",
    bottom: DOTS_BOTTOM_POSITION, // Position above the reading card (relational)
    alignSelf: "center", // Center the container horizontally
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    // Dark pill container background - width auto-fits to content
    backgroundColor: "rgba(0, 0, 0, 0.8)", // 80% black opacity from Figma
    borderRadius: 15, // 12.75 rounded up for smoother pill shape
    paddingHorizontal: 5, // ~4.75px from Figma
    paddingVertical: 6, // Adjusted for better visual balance
  },
  pageIndicator: {
    width: 9, // 9.33px from Figma (rounded)
    height: 9,
    borderRadius: 4.5, // Half of 9 for perfect circle
    backgroundColor: "rgb(147, 147, 147)", // Gray from Figma (inactive dots)
    marginHorizontal: 4.5, // Adjusted for proper spacing
  },
  pageIndicatorActive: {
    backgroundColor: "rgb(255, 255, 255)", // Pure white from Figma (active dot)
    // No scale transform - removed per Figma design
  },

  // Reading Card Container
  cardContainer: {
    position: "absolute",
    bottom: -40,
    left: 0,
    right: 0,
    zIndex: 30, // On top of hints when expanded
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

  // Key Terms Section
  keyTermsSection: {
    marginBottom: 20,
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

  // Bottom spacer to ensure full scroll
  sheetBottomSpacer: {
    height: 60,
  },
});
