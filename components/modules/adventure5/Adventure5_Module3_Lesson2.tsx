// Adventure5_Module3_Lesson2.tsx - ImageCarouselLesson showcasing Baghdad's Round City construction
// Full-screen swipeable image gallery with atmospheric background music and expandable reading content

import ArchivesTheme from "@/constants/ArchivesTheme";
import { useProgress } from "@/context/ProgressContext";
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

interface Adventure5_Module3_Lesson2Props {
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void;
}

// Screen dimensions for perfect full-screen display
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Card animation constants - matching SwiftUI spring animations
const COLLAPSED_HEIGHT = 160;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.85;

// Gesture sensitivity constants for cross-platform optimization
const IOS_GESTURE_CONSTANTS = {
  minDistance: 20,
  minVelocity: 300,
  activeOffsetY: 15,
  failOffsetX: 40,
};

const ANDROID_GESTURE_CONSTANTS = {
  minDistance: 25,
  maxTime: 400,
  velocityThreshold: 0.3,
};

// Baghdad Round City construction images
const baghdadImages = [
  {
    id: 1,
    imageUrl: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv5_M3_Img01.png",
    title: "Planning the Perfect City",
    caption:
      "Caliph al-Mansur and his planners survey the future site of Baghdad - scrolls in hand, the Tigris below, and a circle taking shape in the sand",
  },
  {
    id: 2,
    imageUrl: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv5_M3_Img02.png",
    title: "The Round City Rises",
    caption:
      "Early Abbasid Baghdad takes shape-a circular city rising by the Tigris, with domes, markets, and neighborhoods unfolding from the center",
  },
  {
    id: 3,
    imageUrl: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv5_M3_Img03.png",
    title: "Heart of Power and Faith",
    caption:
      "At the heart of Baghdad's Round City, the caliph's golden dome and Grand Mosque anchor a center of power, faith, and order",
  },
  {
    id: 4,
    imageUrl: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv5_M3_Img04.png",
    title: "Gates of the Empire",
    caption:
      "At Bab al-Kufa, traders and travelers enter Baghdad through carved gates and compass-marked stone - where daily life meets imperial design",
  },
  {
    id: 5,
    imageUrl: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv5_M3_Img05.png",
    title: "Life in the Outer City",
    caption:
      "In Baghdad's outer districts, markets, bathhouses, and schools line the curved streets - home to a diverse and busy city life",
  },
];

// Historical content about Baghdad's design and significance
const historicalText = `The Abbasids wanted a capital that symbolized unity and vision. They chose a site near the Tigris River and designed Baghdad as a perfect circle - a city of balance and brilliance. While the Umayyads fell in the East, a few family members escaped west and later ruled from Cordoba. But in the heart of the Islamic world, the Abbasids had built a new order - one that would shape the next 500 years.`;

export default function Adventure5_Module3_Lesson2({
  onContinue,
  onDismiss,
  onBack,
}: Adventure5_Module3_Lesson2Props) {
  // Image carousel states
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showReadContent, setShowReadContent] = useState(false);

  // Reading card states
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  // Critical gesture coordination state - Prevents carousel conflicts
  const [isCardGestureActive, setIsCardGestureActive] = useState(false);

  // Animation values for smooth card expansion
  const cardHeight = useRef(new Animated.Value(160)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;

  // Component refs for programmatic control
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollViewGestureRef = useRef(null);
  const panGestureRef = useRef(null);

  // Progress context integration
  const { completeLesson } = useProgress();

  // Background music integration
  const backgroundMusic = useBackgroundMusic(
    { uri: "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv5_M3_L2.mp3" },
    {
      volume: 0.5,
      shouldLoop: true,
    }
  );

  // Enhanced debug logging for background music
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(
      `🎵 [${timestamp}] Adventure5_Module3_Lesson2 - Background music state:`,
      {
        isLoaded: backgroundMusic.isLoaded,
        isPlaying: backgroundMusic.isPlaying,
        isLoading: backgroundMusic.isLoading || false,
        platform: Platform.OS,
        error: backgroundMusic.error || "No error",
      }
    );

    if (!backgroundMusic.isLoaded && !backgroundMusic.isLoading) {
      console.log("🎵 Audio not loading - checking AWS CloudFront source");
      console.log(
        "🎵 Exact AWS Audio URL: https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv5_M3_L2.mp3"
      );
    }

    if (backgroundMusic.error) {
      console.error("🎵 Background music error:", backgroundMusic.error);
    }
  }, [
    backgroundMusic.isLoaded,
    backgroundMusic.isPlaying,
    backgroundMusic.error,
  ]);

  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(
      "🎵 Adventure5_Module3_Lesson2 component mounted at:",
      timestamp
    );
  }, []);

  // Cleanup audio on component unmount
  useEffect(() => {
    return () => {
      console.log("🎵 Component unmounting - cleaning up all audio");
      if (backgroundMusic.stop) {
        console.log("🎵 Stopping background music on component unmount");
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
          : "✅ ENABLED (can swipe images)"
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

  // Handle carousel scroll - matching iOS TabView behavior with haptic feedback
  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const imageIndex = Math.round(contentOffsetX / SCREEN_WIDTH);

    if (imageIndex !== currentImageIndex) {
      setCurrentImageIndex(imageIndex);
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

    if (
      state === State.END ||
      state === State.CANCELLED ||
      state === State.FAILED
    ) {
      console.log("📱 Gesture state:", state, {
        translationY,
        velocityY,
        isCardExpanded,
        platform: Platform.OS,
      });

      if (state === State.END) {
        const minDistance = 20;
        const minVelocity = 300;

        // Swipe up to expand
        if (
          !isCardExpanded &&
          (translationY < -minDistance || velocityY < -minVelocity)
        ) {
          expandCard();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          return;
        }
        // Swipe down to collapse
        else if (
          isCardExpanded &&
          (translationY > minDistance || velocityY > minVelocity)
        ) {
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

  // Expand the card to full height with EXACT SwiftUI spring timing
  const expandCard = () => {
    console.log("🎬 Card expansion starting...");
    setIsCardExpanded(true);
    setShowReadContent(true);

    // ✅ IMMEDIATE FIX: Re-enable carousel BEFORE animation starts
    setIsCardGestureActive(false);
    console.log("🎬 Carousel re-enabled IMMEDIATELY ✅");

    Animated.parallel([
      Animated.spring(cardHeight, {
        toValue: EXPANDED_HEIGHT,
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

  // Reading scroll handler for gesture priority management
  const handleReadingScroll = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    setScrollY(contentOffset.y);
  };

  // Navigation cleanup - Stop audio before transitions
  const handleBackPress = () => {
    if (backgroundMusic.isPlaying) {
      console.log("🎵 Stopping background music on back button");
      backgroundMusic.stop();
    }
    (onBack || onDismiss)();
  };

  const handleContinuePress = () => {
    // Light haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Mark lesson as completed
    completeLesson(5, 3, "lesson2");

    if (backgroundMusic.isPlaying) {
      console.log("🎵 Stopping background music before continue");
      backgroundMusic.stop();
    }
    onContinue();
  };

  // Key terms component
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

  return (
    <>
      {Platform.OS === "android" && (
        <StatusBar barStyle="dark-content" backgroundColor="#F4EBDB" />
      )}

      <View style={styles.container}>
        {/* FULL-SCREEN IMAGE CAROUSEL */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEnabled={!isCardGestureActive}
          style={styles.carousel}
        >
          {baghdadImages.map((image, index) => (
            <View key={image.id} style={styles.imageContainer}>
              <Image
                source={{ uri: image.imageUrl }}
                style={styles.baghdadImage}
                resizeMode="cover"
              />

              <View style={styles.textOverlay}>
                <Text style={styles.captionText}>{image.caption}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* NAVIGATION CONTROLS */}

        {/* Back Button */}
        <SafeAreaView style={styles.backButtonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Continue Button */}
        <SafeAreaView style={styles.continueButtonContainer}>
          <TouchableOpacity
            style={[
              styles.topContinueButton,
              currentImageIndex !== baghdadImages.length - 1 &&
                styles.topContinueButtonDisabled,
            ]}
            onPress={
              currentImageIndex === baghdadImages.length - 1
                ? handleContinuePress
                : undefined
            }
            disabled={currentImageIndex !== baghdadImages.length - 1}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={
                currentImageIndex === baghdadImages.length - 1
                  ? "white"
                  : "#666"
              }
            />
          </TouchableOpacity>
        </SafeAreaView>

        {/* PAGE INDICATORS */}
        {!isCardExpanded && (
          <View style={styles.pageIndicatorsOnly}>
            {baghdadImages.map((_, index) => (
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

        {/* EXPANDABLE READING CARD - Universal Gesture Handling */}
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
              { transform: [{ translateY: cardTranslateY }] },
            ]}
          >
            <Animated.View style={[styles.readingCard, { height: cardHeight }]}>
              <View style={styles.cardHandle} />

              <Animated.View
                style={[styles.collapsedContent, { opacity: cardOpacity }]}
              >
                <TouchableOpacity
                  onPress={expandCard}
                  activeOpacity={0.8}
                  disabled={isCardExpanded}
                >
                  <View style={styles.readingCardHeader}>
                    <Text style={styles.cardTitle}>Baghdad: The Round City</Text>
                    <Text style={styles.cardSubtitle}>
                      A perfect circle symbolizing unity and imperial vision
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>

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
                            Baghdad: The Round City
                          </Text>
                          <Text style={styles.sheetSubtitle}>
                            Module 3 • Lesson 2
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {/* Historical Content */}
                      <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                        <View style={styles.historicalSection}>
                          <Text style={styles.sectionTitle}>
                            City of Unity and Vision
                          </Text>
                          <Text style={styles.historicalText}>
                            {historicalText}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {/* Key Terms Section */}
                      <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                        <View style={styles.keyTermsSection}>
                          <Text style={styles.sectionTitle}>Key Terms</Text>
                          <View style={styles.keyTermsContainer}>
                            <KeyTermRow
                              term="Round City"
                              definition="Baghdad's unique circular design symbolizing perfection and unity"
                            />
                            <KeyTermRow
                              term="Tigris River"
                              definition="Strategic river location chosen for Baghdad's water access and trade"
                            />
                          </View>
                        </View>
                      </TouchableOpacity>

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

const styles = StyleSheet.create({
  // MAIN CONTAINER
  container: {
    flex: 1,
    backgroundColor: "black",
  },

  // CAROUSEL STYLES
  carousel: {
    flex: 1,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
    overflow: "hidden",
  },
  baghdadImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // TEXT OVERLAY
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

  // PAGE INDICATORS - Figma design with dark pill container
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

  // NAVIGATION BUTTONS
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
    backgroundColor: "rgba(0,0,0,0.3)",
  },

  // READING CARD SYSTEM
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

  // COLLAPSED CONTENT STYLES
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
  },

  // EXPANDED CONTENT SYSTEM
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

  // EDUCATIONAL CONTENT STYLES
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

  // KEY TERMS SECTION
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

  // UTILITY STYLES
  sheetBottomSpacer: {
    height: 60,
  },
});
