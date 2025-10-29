// Adventure4_Module2_Lesson1.tsx - Palace Life & Architecture (Previously Lesson 2)
// Full-screen carousel with expandable reading card - EXACT Adventure1_Module2_Lesson1 pattern

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
import { ScrollView as GestureHandlerScrollView, PanGestureHandler, State } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const COLLAPSED_HEIGHT = 140;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.85;

interface Adventure4_Module2_Lesson1Props {
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void;
}

export default function Adventure4_Module2_Lesson1({
  onContinue,
  onDismiss,
  onBack,
}: Adventure4_Module2_Lesson1Props) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [showReadContent, setShowReadContent] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [isCardGestureActive, setIsCardGestureActive] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const panGestureRef = useRef(null);
  const scrollViewGestureRef = useRef(null);

  // Animation values for card expansion
  const cardHeight = useRef(new Animated.Value(160)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;

  // Background music hook - AWS CloudFront
  const backgroundMusic = useBackgroundMusic(
    { uri: "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv4_M2_L1.mp3" },
    {
      volume: 0.5,
      shouldLoop: true,
    }
  );

  // Palace Life carousel data - Using AWS CloudFront URLs
  const palaceInteriors = [
    {
      id: 1,
      imageUrl: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M2_Img04.png",
      title: "Scribes at Work",
      caption: "Courtyard life at Qasr al-Hayr: carved stone, swaying palms, and the rhythm of desert luxury at an Umayyad retreat",
    },
    {
      id: 2,
      imageUrl: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M2_Img05.png",
      title: "Scribe's Tools",
      caption: "Water flows through hidden channels into a tiled fountain - cooling the desert air",
    },
    {
      id: 3,
      imageUrl: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M2_Img06.png",
      title: "Manuscript Pages",
      caption: "Riders and a falconer gather at the edge of Qasr al-Hayr's courtyard. Ornate arches frame the desert beyond",
    },
  ];

  // Historical text content for Palace Life
  const historicalText = `Even out in the desert, life at a palace could feel like paradise. Fresh water ran through clever channels beneath the stone, feeding fountains and gardens. Visitors rested in shaded walkways, while caliphs went on hunting trips nearby. These palaces showed the Umayyads' ability to bring beauty, comfort, and control - even to the harshest places.`;

  // Enhanced debug logging for background music
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🎵 [${timestamp}] Adventure4_Module2_Lesson1 - Background music state:`, {
      isLoaded: backgroundMusic.isLoaded,
      isPlaying: backgroundMusic.isPlaying,
      isLoading: backgroundMusic.isLoading || false,
      platform: Platform.OS
    });

    if (!backgroundMusic.isLoaded && !(backgroundMusic.isLoading)) {
      console.log('🎵 Audio not loading - AWS CloudFront source should be available');
      console.log('🎵 AWS CloudFront Audio URL: https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv4_M2_L1.mp3');
    }
  }, [backgroundMusic.isLoaded, backgroundMusic.isPlaying]);

  // Component mount logging
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log('🎵 Adventure4_Module2_Lesson1 component mounted at:', timestamp);
  }, []);

  // Cleanup background music when component unmounts
  useEffect(() => {
    return () => {
      console.log('🎵 Component unmounting - cleaning up all audio');

      if (backgroundMusic.stop) {
        console.log('🎵 Stopping background music on component unmount');
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

  // Handle horizontal scroll for image tracking
  const handleScroll = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    const imageIndex = Math.round(contentOffset.x / SCREEN_WIDTH);

    if (imageIndex !== currentImageIndex && imageIndex >= 0 && imageIndex < palaceInteriors.length) {
      setCurrentImageIndex(imageIndex);
      console.log("📱 Image changed to:", imageIndex + 1);
    }
  };

  // Navigate to next image (Swipe button functionality)
  const handleSwipeNext = () => {
    if (currentImageIndex < palaceInteriors.length - 1) {
      const nextIndex = currentImageIndex + 1;
      scrollViewRef.current?.scrollTo({ x: nextIndex * SCREEN_WIDTH, animated: true });
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
    // Optional: Could track reading progress here if needed for analytics
    // But completion is now triggered by card expansion for better UX
  };

  // Page indicators - only show when card is not expanded
  const renderPageIndicators = () => (
    !isCardExpanded && (
      <View style={styles.pageIndicatorsOnly}>
        {palaceInteriors.map((_, index) => (
          <View
            key={index}
            style={[
              styles.pageIndicator,
              currentImageIndex === index && styles.pageIndicatorActive
            ]}
          />
        ))}
      </View>
    )
  );

  return (
    <>
      {Platform.OS === 'android' && (
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
              {/* Full screen manuscript image */}
              <Image
                source={{ uri: interior.imageUrl }}
                style={styles.palaceImage}
                resizeMode="cover"
              />

              {/* Text overlay with descriptive caption */}
              <View style={styles.textOverlay}>
                <Text style={styles.captionText}>
                  {interior.caption}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Page indicator dots - centered */}
        {renderPageIndicators()}

        {/* Back Button - Top Left */}
        <SafeAreaView style={styles.backButtonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => {
            if (backgroundMusic.isPlaying) {
              console.log('🎵 Stopping background music on back button');
              backgroundMusic.stop();
            }

            (onBack || onDismiss)();
          }}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Continue Button - Top Right (only active on final image) */}
        <SafeAreaView style={styles.continueButtonContainer}>
          <TouchableOpacity
            style={[
              styles.topContinueButton,
              currentImageIndex !== palaceInteriors.length - 1 && styles.topContinueButtonDisabled
            ]}
            onPress={currentImageIndex === palaceInteriors.length - 1 ? () => {
              // Stop all audio before continuing (no await for instant navigation)
              // if (backgroundMusic.isPlaying) {
              //   console.log('🎵 Stopping background music before continue');
              //   backgroundMusic.stop(); // Remove await for instant navigation
              // }

              onContinue();
            } : undefined}
            disabled={currentImageIndex !== palaceInteriors.length - 1}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={currentImageIndex === palaceInteriors.length - 1 ? "white" : "#666"}
            />
          </TouchableOpacity>
        </SafeAreaView>

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
                      Umayyad Desert Retreats
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      Even out in the desert, life at a palace could feel like paradise...
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
                      {/* Title Section - Tappable to collapse */}
                      <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                        <View style={styles.titleSection}>
                          <Text style={styles.sheetTitle}>
                            Palace Life & Architecture
                          </Text>
                          <Text style={styles.sheetSubtitle}>
                            Module 2 • Lesson 1
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {/* Historical Content */}
                      <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                        <View style={styles.historicalSection}>
                          <Text style={styles.sectionTitle}>Historical Context</Text>
                          <Text style={styles.historicalText}>{historicalText}</Text>
                        </View>
                      </TouchableOpacity>

                      {/* Key Terms Section */}
                      <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                        <View style={styles.keyTermsSection}>
                          <Text style={styles.sectionTitle}>Key Terms</Text>
                          <View style={styles.keyTermsContainer}>
                            <KeyTermRow
                              term="Courtyard Gardens"
                              definition="Central palace spaces with fountains, palm trees, and shaded walkways for relaxation"
                            />
                            <KeyTermRow
                              term="Water Channels"
                              definition="Clever underground systems that carried fresh water to fountains and gardens"
                            />
                            <KeyTermRow
                              term="Hunting Grounds"
                              definition="Desert areas around palaces where caliphs and nobles practiced falconry and hunting"
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
    backgroundColor: 'black',
  },

  // Main carousel - full screen
  carousel: {
    flex: 1,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'relative',
    justifyContent: 'center',    // Center vertically
    alignItems: 'center',        // Center horizontally
    backgroundColor: 'black',    // Ensure no white gaps
    overflow: 'hidden',          // Prevent any content from spilling out
  },
  palaceImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'absolute',        // Absolute positioning for perfect centering
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Text overlay at top - matching Adventure1 design exactly
  textOverlay: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  captionText: {
    fontFamily: 'DM Sans',
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    lineHeight: 26,
    textShadowColor: 'black',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // Page indicators - Figma design with dark pill container
  pageIndicatorsOnly: {
    position: 'absolute',
    bottom: 180, // Position above the reading card
    alignSelf: 'center', // Center horizontally, auto-fit width to content
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    // Dark pill container background - width auto-fits to content
    backgroundColor: 'rgba(0, 0, 0, 0.8)', // 80% black opacity
    borderRadius: 15, // Smooth rounded pill shape
    paddingHorizontal: 5, // Left & right padding
    paddingVertical: 6, // Top & bottom padding
  },
  pageIndicator: {
    width: 9, // Dot size
    height: 9,
    borderRadius: 4.5, // Perfect circle (half of width)
    backgroundColor: 'rgb(147, 147, 147)', // Gray color
    marginHorizontal: 4.5, // Spacing between dots
  },
  pageIndicatorActive: {
    backgroundColor: 'rgb(255, 255, 255)', // Pure white
    // No scale transform - clean, simple design
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

  // Card Container for scale animation
  cardContainer: {
    position: "absolute",
    bottom: -40,
    left: 0,
    right: 0,
  },

  // Reading Card at Bottom - Swipeable
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
