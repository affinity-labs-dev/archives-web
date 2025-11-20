// Adventure5_Module1_Lesson1.tsx - ImageCarousel lesson about Caliph Yazīd II's reign (720-724 CE)
// Following EXACT implementation pattern from Adventure1_Module2_Lesson1.tsx

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

interface Adventure5_Module1_Lesson1Props {
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void;
}

// Screen dimensions for perfect full-screen display
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Card animation constants - matching SwiftUI spring animations
const COLLAPSED_HEIGHT = 160; // Exact collapsed card height
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.85; // 85% screen coverage when expanded

// Gesture sensitivity constants for cross-platform optimization
const IOS_GESTURE_CONSTANTS = {
  minDistance: 20, // Reduced for better iOS responsiveness
  minVelocity: 300, // Optimized for natural swipe detection
  activeOffsetY: 15, // PanGestureHandler sensitivity
  failOffsetX: 40, // Prevent horizontal scroll conflicts
};

const ANDROID_GESTURE_CONSTANTS = {
  minDistance: 25, // Slightly higher for Android touch precision
  maxTime: 400, // Gesture time window in milliseconds
  velocityThreshold: 0.3, // Touch velocity threshold
};

// UI positioning constants
const UI_CONSTANTS = {
  textOverlayTop: 120, // Caption overlay position from top
  pageIndicatorBottom: 180, // Page indicators position from bottom
  cardContainerBottom: -40, // Card container offset for proper positioning
  backButtonPadding: { top: 8, left: 16 },
  continueButtonPadding: { top: 8, right: 16 },
};

export default function Adventure5_Module1_Lesson1({
  onContinue,
  onDismiss,
  onBack,
}: Adventure5_Module1_Lesson1Props) {
  // Image carousel states - Core functionality
  const [currentImageIndex, setCurrentImageIndex] = useState(0); // Track current image (0 to length-1)
  const [showReadContent, setShowReadContent] = useState(false); // Toggle reading content visibility

  // Reading card states - Advanced card management
  const [isCardExpanded, setIsCardExpanded] = useState(false); // Track card expansion state
  const [scrollY, setScrollY] = useState(0); // Track scroll position for gesture priority

  // Critical gesture coordination state - Prevents carousel conflicts
  const [isCardGestureActive, setIsCardGestureActive] = useState(false); // Block carousel during card gestures

  // Animation values for smooth card expansion - EXACT SwiftUI spring timing
  const cardHeight = useRef(new Animated.Value(160)).current; // Collapsed: 160, Expanded: SCREEN_HEIGHT * 0.85
  const cardOpacity = useRef(new Animated.Value(1)).current; // Fade collapsed content: 1 → 0
  const cardTranslateY = useRef(new Animated.Value(0)).current; // Future use for advanced animations

  // Component refs for programmatic control
  const scrollViewRef = useRef<ScrollView>(null); // Carousel scroll control
  const scrollViewGestureRef = useRef(null); // Gesture handler for reading scroll
  const panGestureRef = useRef(null); // iOS PanGestureHandler ref

  // Background music integration
  const backgroundMusic = useBackgroundMusic(
    { uri: "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv5_M1_L1.mp3" },
    {
      volume: 0.5, // 50% volume for ambient atmosphere
      shouldLoop: true, // Continuous loop for immersive experience
    }
  );

  // Image content about Caliph Yazīd II's reign with AWS CloudFront URLs
  const yazidReignImages = [
    {
      id: 1,
      imageUrl: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv5_M1_Img01.png",
      title: "The Golden Age of Arts",
      caption:
        "Under Yazīd II's patronage, the Umayyad court became a center of artistic excellence, blending Islamic, Byzantine, and Persian influences.",
    },
    {
      id: 2,
      imageUrl: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv5_M1_Img02.png",
      title: "Architectural Innovations",
      caption:
        "The Caliph commissioned magnificent palaces and mosques, establishing architectural standards that would influence Islamic design for centuries.",
    },
  ];

  // Enhanced debug logging for background music - Production-ready
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(
      `🎵 [${timestamp}] Adventure5_Module1_Lesson1 - Background music state:`,
      {
        isLoaded: backgroundMusic.isLoaded,
        isPlaying: backgroundMusic.isPlaying,
        isLoading: backgroundMusic.isLoading || false,
      }
    );

    if (!backgroundMusic.isLoaded && !backgroundMusic.isLoading) {
      console.log(
        "🎵 Audio not loading - AWS CloudFront source should be available"
      );
      console.log(
        "🎵 AWS CloudFront Audio URL: https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv5_M1_L1.mp3"
      );
    }
  }, [backgroundMusic.isLoaded, backgroundMusic.isPlaying]);

  // Component mount logging for audio troubleshooting
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(
      "🎵 Adventure5_Module1_Lesson1 component mounted at:",
      timestamp
    );
  }, []);

  // Success/failure state logging for production debugging
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

  // CRITICAL: Proper cleanup for component unmounting
  useEffect(() => {
    return () => {
      console.log("🎵 Component unmounting - cleaning up all audio");

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

  // Handle carousel scroll - matching iOS TabView behavior with haptic feedback
  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const imageIndex = Math.round(contentOffsetX / SCREEN_WIDTH); // Calculate current page

    // Only update if index actually changed (prevents excessive updates)
    if (imageIndex !== currentImageIndex) {
      setCurrentImageIndex(imageIndex);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // Light haptic for page change
    }
  };

  // Navigate to next image - Used for swipe button functionality
  const handleSwipeNext = () => {
    if (currentImageIndex < yazidReignImages.length - 1) {
      const nextIndex = currentImageIndex + 1;

      // Smooth animated scroll to next page
      scrollViewRef.current?.scrollTo({
        x: nextIndex * SCREEN_WIDTH,
        animated: true,
      });

      setCurrentImageIndex(nextIndex);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Expand the card to full height with EXACT SwiftUI spring timing
  const expandCard = () => {
    console.log("🎬 Card expansion starting...");
    setIsCardExpanded(true);
    setShowReadContent(true);

    // ✅ IMMEDIATE FIX: Reset gesture state IMMEDIATELY for instant carousel re-enable
    setIsCardGestureActive(false);
    console.log("🎬 Carousel re-enabled IMMEDIATELY ✅");

    // Parallel spring animation matching SwiftUI behavior
    Animated.parallel([
      Animated.spring(cardHeight, {
        toValue: SCREEN_HEIGHT * 0.85, // 85% screen coverage
        useNativeDriver: false,
        tension: 100, // Perfect spring tension
        friction: 8, // Smooth damping
      }),
      Animated.timing(cardOpacity, {
        toValue: 0, // Fade out collapsed content
        duration: 300, // 300ms fade timing
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

    // Reverse animation with identical timing
    Animated.parallel([
      Animated.spring(cardHeight, {
        toValue: 160, // Return to collapsed height
        useNativeDriver: false,
        tension: 100, // Consistent spring feel
        friction: 8, // Smooth return animation
      }),
      Animated.timing(cardOpacity, {
        toValue: 1, // Fade in collapsed content
        duration: 300, // Consistent timing
        useNativeDriver: false,
      }),
    ]).start(() => {
      console.log("🎬 Card collapse animation finished");
    });
  };

  // Reading scroll handler for gesture priority management
  const handleReadingScroll = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    setScrollY(contentOffset.y); // Track scroll position for advanced gesture handling
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

    if (backgroundMusic.isPlaying) {
      console.log("🎵 Stopping background music before continue");
      backgroundMusic.stop();
    }
    onContinue();
  };

  return (
    <>
      {/* Platform-specific StatusBar handling */}
      {Platform.OS === "android" && (
        <StatusBar barStyle="dark-content" backgroundColor="#F4EBDB" />
      )}

      <View style={styles.container}>
        {/* FULL-SCREEN IMAGE CAROUSEL - Main Content */}
        <ScrollView
          ref={scrollViewRef}
          horizontal // Enable horizontal paging
          pagingEnabled // Snap to pages
          showsHorizontalScrollIndicator={false} // Clean UI without scroll bar
          onMomentumScrollEnd={handleScroll} // Page change detection
          scrollEnabled={!isCardGestureActive} // Disable during card gestures
          style={styles.carousel} // Full-screen styling
        >
          {yazidReignImages.map((image, index) => (
            <View key={image.id} style={styles.imageContainer}>
              {/* Full-screen reign image */}
              <Image
                source={{ uri: image.imageUrl }}
                style={styles.reignImage}
                resizeMode="cover" // Perfect full-screen coverage
              />

              {/* Text overlay with descriptive caption */}
              <View style={styles.textOverlay}>
                <Text style={styles.captionText}>{image.caption}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* NAVIGATION CONTROLS - Floating over carousel */}

        {/* Back Button - Top Left with SafeArea */}
        <SafeAreaView style={styles.backButtonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Continue Button - Top Right (only active on final image) */}
        <SafeAreaView style={styles.continueButtonContainer}>
          <TouchableOpacity
            style={[
              styles.topContinueButton,
              currentImageIndex !== yazidReignImages.length - 1 &&
                styles.topContinueButtonDisabled,
            ]}
            onPress={
              currentImageIndex === yazidReignImages.length - 1
                ? handleContinuePress
                : undefined
            }
            disabled={currentImageIndex !== yazidReignImages.length - 1}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={
                currentImageIndex === yazidReignImages.length - 1
                  ? "white"
                  : "#666"
              }
            />
          </TouchableOpacity>
        </SafeAreaView>

        {/* PAGE INDICATORS - Centered above reading card */}
        {!isCardExpanded && (
          <View style={styles.pageIndicatorsOnly}>
            {yazidReignImages.map((_, index) => (
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

        {/* EXPANDABLE READING CARD - Platform-Specific Implementation */}
        <PanGestureHandler
            ref={panGestureRef}
            onGestureEvent={handleSwipeGesture}
            onHandlerStateChange={handleSwipeGesture}
            activeOffsetY={[-15, 15]} // Optimized sensitivity
            failOffsetX={[-40, 40]} // Prevent horizontal conflicts
            minPointers={1}
            maxPointers={1}
          >
            <Animated.View
              style={[
                styles.cardContainer,
                { transform: [{ translateY: cardTranslateY }] },
              ]}
            >
              <Animated.View
                style={[styles.readingCard, { height: cardHeight }]}
              >
                {/* Card handle indicator */}
                <View style={styles.cardHandle} />

                {/* Collapsed content with fade animation */}
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
                        The Reign of Yazīd II (720-724 CE)
                      </Text>
                      <Text style={styles.cardSubtitle}>
                        Yazīd II's brief but influential reign marked the zenith
                        of Umayyad cultural achievement...
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
                              The Reign of Yazīd II
                            </Text>
                            <Text style={styles.sheetSubtitle}>
                              Caliph of the Umayyad Dynasty • 720-724 CE
                            </Text>
                          </View>
                        </TouchableOpacity>

                        {/* Historical Context Section */}
                        <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                          <View style={styles.historicalSection}>
                            <Text style={styles.sectionTitle}>
                              Historical Context
                            </Text>
                            <Text style={styles.historicalText}>
                              Yazīd II assumed the caliphate during a period of
                              relative stability within the Umayyad Dynasty. His
                              four-year reign, though brief, was marked by
                              significant cultural and artistic developments that
                              would define the golden age of Islamic civilization.
                            </Text>
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                          <View style={styles.historicalSection}>
                            <Text style={styles.sectionTitle}>
                              Architectural Legacy
                            </Text>
                            <Text style={styles.historicalText}>
                              Yazīd II's architectural patronage established new
                              standards for Islamic design.
                            </Text>
                          </View>
                        </TouchableOpacity>

                        {/* Key Terms Section */}
                        <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                          <View style={styles.keyTermsSection}>
                            <Text style={styles.sectionTitle}>Key Terms</Text>
                            <View style={styles.keyTermsContainer}>
                              <View style={styles.keyTermRow}>
                                <Text style={styles.keyTermTitle}>
                                  Cultural Synthesis
                                </Text>
                                <Text style={styles.keyTermDefinition}>
                                  The blending of Islamic, Byzantine, and Persian
                                  artistic traditions
                                </Text>
                              </View>
                              <View style={styles.keyTermRow}>
                                <Text style={styles.keyTermTitle}>
                                  Artistic Patronage
                                </Text>
                                <Text style={styles.keyTermDefinition}>
                                  Royal support and funding for artists,
                                  architects, and scholars
                                </Text>
                              </View>
                              <View style={styles.keyTermRow}>
                                <Text style={styles.keyTermTitle}>
                                  Golden Age
                                </Text>
                                <Text style={styles.keyTermDefinition}>
                                  Period of peak cultural achievement and artistic
                                  excellence
                                </Text>
                              </View>
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
  // MAIN CONTAINER - Full-screen black background
  container: {
    flex: 1,
    backgroundColor: "black", // Black for immersive full-screen experience
  },

  // CAROUSEL STYLES - Full-screen image display
  carousel: {
    flex: 1, // Take full available space
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: "relative",
    justifyContent: "center", // Center vertically
    alignItems: "center", // Center horizontally
    backgroundColor: "black", // Ensure no white gaps
    overflow: "hidden", // Prevent content spillover
  },
  reignImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: "absolute", // Absolute positioning for perfect centering
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // TEXT OVERLAY - Top caption positioning
  textOverlay: {
    position: "absolute",
    top: UI_CONSTANTS.textOverlayTop, // 120px from top for SafeArea accommodation
    left: 0,
    right: 0,
    paddingHorizontal: 40, // 40px horizontal padding
    alignItems: "center",
  },
  captionText: {
    fontFamily: "DM Sans",
    fontSize: 20, // Large readable font
    fontWeight: "700", // Bold for readability over images
    color: "white",
    textAlign: "center",
    lineHeight: 26, // 1.3 line height ratio
    textShadowColor: "black", // Text shadow for image overlay readability
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

  // NAVIGATION BUTTONS - Floating controls
  backButtonContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 20, // Highest z-index for accessibility
    paddingTop: UI_CONSTANTS.backButtonPadding.top, // 8px
    paddingLeft: UI_CONSTANTS.backButtonPadding.left, // 16px
  },
  backButton: {
    width: 40, // 40x40 touch target
    height: 40,
    borderRadius: 20, // Perfect circle
    backgroundColor: "rgba(0,0,0,0.6)", // Semi-transparent black
    justifyContent: "center",
    alignItems: "center",
  },
  continueButtonContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 20,
    paddingTop: UI_CONSTANTS.continueButtonPadding.top, // 8px
    paddingRight: UI_CONSTANTS.continueButtonPadding.right, // 16px
  },
  topContinueButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ArchivesTheme.colors.mossGreen, // Green when active
    justifyContent: "center",
    alignItems: "center",
  },
  topContinueButtonDisabled: {
    backgroundColor: "rgba(0,0,0,0.3)", // Gray when disabled
  },

  // READING CARD SYSTEM - Expandable bottom sheet
  cardContainer: {
    position: "absolute",
    bottom: UI_CONSTANTS.cardContainerBottom, // -40px offset for natural appearance
    left: 0,
    right: 0,
  },
  readingCard: {
    height: 160, // Collapsed height (animated)
    backgroundColor: "rgba(0,0,0,0.9)", // 90% black transparency
    borderTopLeftRadius: 20, // Rounded top corners only
    borderTopRightRadius: 20,
    shadowColor: "#000", // Professional shadow system
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12, // Android shadow
  },
  cardHandle: {
    width: 70, // 70px handle width
    height: 5, // 5px handle height
    backgroundColor: "rgba(255,255,255,0.4)", // 40% white opacity
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12, // 12px from top
  },

  // COLLAPSED CONTENT STYLES
  readingCardHeader: {
    padding: 20,
    paddingTop: 16, // Reduced top padding after handle
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
    opacity: 0.7, // 70% opacity for subtitle
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
    paddingTop: 20, // Top padding for handle space
  },
  expandedScroll: {
    flex: 1,
  },
  expandedContentInner: {
    padding: 20,
  },

  // EDUCATIONAL CONTENT STYLES
  titleSection: {
    marginBottom: 24, // 24px spacing after title
  },
  sheetTitle: {
    fontFamily: "DM Sans",
    fontSize: 24, // Large title for expanded view
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
    lineHeight: 20, // 1.43 line height for readability
    textAlign: "left",
  },

  // KEY TERMS SECTION
  keyTermsSection: {
    marginBottom: 20,
  },
  keyTermsContainer: {
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.1)", // 10% white overlay
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
    height: 60, // 60px bottom spacing for scroll completion
  },
});
