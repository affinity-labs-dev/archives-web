// Adventure5_Module1_Lesson2.tsx - StaticImageReadingLesson about Yazīd II's Cultural Synthesis
// Redesigned with clean pattern - single renderReadingCard() function

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

interface Adventure5_Module1_Lesson2Props {
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void;
}

// EXACT measurements from Adventure1_Module3_Lesson1.tsx
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const LAYOUT_CONSTANTS = {
  // Card animation constants
  COLLAPSED_HEIGHT: 140, // Card collapsed height
  EXPANDED_HEIGHT: SCREEN_HEIGHT * 0.85, // 85% screen coverage when expanded

  // Text overlay positioning
  textOverlayTop: 140, // 140px from top for SafeArea accommodation
  textOverlayHorizontalPadding: 40, // 40px horizontal padding for text

  // Floating button positioning
  buttonContainerPadding: { top: 8, horizontal: 16 }, // Consistent button positioning
  buttonSize: 40, // 40x40 touch target
  buttonRadius: 20, // Perfect circle

  // Card handle and header
  cardHandleWidth: 70, // 70px handle width
  cardHandleHeight: 5, // 5px handle height
  cardHandleTopMargin: 12, // 12px from top

  // Content spacing
  readingCardHeaderPadding: { horizontal: 20, top: 16, bottom: 30 },
  expandedContentPadding: 20, // 20px padding for expanded content
  titleSectionBottomMargin: 24, // 24px spacing after title section
  historicalSectionBottomMargin: 20, // 20px spacing after historical section
  keyTermsBottomMargin: 20, // 20px spacing after key terms

  // Key terms styling
  keyTermsContainerPadding: 12, // 12px padding inside key terms container
  keyTermRowBottomMargin: 8, // 8px spacing between key term rows

  // Animation timing
  springAnimationTension: 100, // Spring animation tension
  springAnimationFriction: 8, // Spring animation friction
  fadeAnimationDuration: 300, // Fade animation duration
};

export default function Adventure5_Module1_Lesson2({
  onContinue,
  onDismiss,
  onBack,
}: Adventure5_Module1_Lesson2Props) {
  // Reading card states - Core functionality
  const [showReadContent, setShowReadContent] = useState(false); // Toggle expanded content visibility
  const [isCardExpanded, setIsCardExpanded] = useState(false); // Track card expansion state

  // Advanced gesture handling states
  const [scrollY, setScrollY] = useState(0); // Track scroll position for gesture priority

  // Component refs for gesture coordination
  const panGestureRef = useRef(null); // iOS PanGestureHandler ref
  const scrollViewGestureRef = useRef(null); // Gesture handler for reading scroll

  // Animation values for smooth card expansion - EXACT SwiftUI spring timing
  const cardHeight = useRef(
    new Animated.Value(LAYOUT_CONSTANTS.COLLAPSED_HEIGHT)
  ).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;

  // Background music integration - Yazīd II Cultural Synthesis audio
  const backgroundMusic = useBackgroundMusic(
    { uri: "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv5_M1_L2.mp3" },
    {
      volume: 0.5, // 50% volume for ambient atmosphere
      shouldLoop: true, // Continuous loop for immersive experience
    }
  );

  // EXACT AWS CloudFront URL with the third image
  const mainImageSource = {
    uri: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv5_M1_Img03.png",
  };

  // Image metadata
  const imageTitle =
    "The court of Yazīd II became a place of tension and silence.";
  const imageDescription =
    "The peak of Umayyad cultural achievement where diverse traditions merged";

  // Content Structure for Educational Context
  const educationalContent = {
    moduleInfo: "Adventure 5 • Module 1 • Lesson 2",
    historicalContext:
      "Yazīd II's reign marked the peak of Umayyad cultural achievement, where diverse traditions merged into a distinctive Islamic aesthetic that would influence art and architecture for centuries to come. His court became a melting pot of Islamic, Byzantine, and Persian influences, creating an unprecedented synthesis of artistic traditions.",
    keyTerms: [
      {
        term: "Cultural Synthesis",
        definition:
          "The blending of Islamic, Byzantine, and Persian artistic traditions into a unified aesthetic",
      },
      {
        term: "Artistic Patronage",
        definition:
          "Royal support and funding for artists, architects, and scholars that enabled cultural flourishing",
      },
    ],
  };

  // Enhanced debug logging for background music - Production-ready
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(
      `🎵 [${timestamp}] Adventure5_Module1_Lesson2 - Background music state:`,
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
        "🎵 AWS CloudFront Audio URL: https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv5_M1_L2.mp3"
      );
    }
  }, [backgroundMusic.isLoaded, backgroundMusic.isPlaying]);

  // Component mount logging for audio troubleshooting
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(
      "🎵 Adventure5_Module1_Lesson2 component mounted at:",
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

  // Expand the card to full height with perfect SwiftUI spring timing
  const expandCard = () => {
    setIsCardExpanded(true);
    setShowReadContent(true);

    Animated.parallel([
      Animated.spring(cardHeight, {
        toValue: LAYOUT_CONSTANTS.EXPANDED_HEIGHT, // 85% screen coverage
        useNativeDriver: false,
        tension: LAYOUT_CONSTANTS.springAnimationTension, // 100 - Perfect spring tension
        friction: LAYOUT_CONSTANTS.springAnimationFriction, // 8 - Smooth damping
      }),
      Animated.timing(cardOpacity, {
        toValue: 0, // Fade out collapsed content
        duration: LAYOUT_CONSTANTS.fadeAnimationDuration, // 300ms fade timing
        useNativeDriver: false,
      }),
    ]).start();
  };

  // Collapse the card back to original size
  const collapseCard = () => {
    setIsCardExpanded(false);
    setShowReadContent(false);

    Animated.parallel([
      Animated.spring(cardHeight, {
        toValue: LAYOUT_CONSTANTS.COLLAPSED_HEIGHT, // Return to 140px collapsed height
        useNativeDriver: false,
        tension: LAYOUT_CONSTANTS.springAnimationTension, // Consistent spring feel
        friction: LAYOUT_CONSTANTS.springAnimationFriction, // Smooth return animation
      }),
      Animated.timing(cardOpacity, {
        toValue: 1, // Fade in collapsed content
        duration: LAYOUT_CONSTANTS.fadeAnimationDuration, // Consistent timing
        useNativeDriver: false,
      }),
    ]).start();
  };

  // Handle reading scroll - track scroll position for gesture priority management
  const handleReadingScroll = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    setScrollY(contentOffset.y); // Track scroll position for advanced gesture handling
  };

  // Enhanced iOS PanGestureHandler with comprehensive logging and optimized sensitivity
  const handleSwipeGesture = (event: any) => {
    if (Platform.OS !== "ios") return;

    if (event.nativeEvent.state === State.END) {
      const { translationY, velocityY } = event.nativeEvent;
      console.log("📱 iOS PanGesture detected", {
        translationY,
        velocityY,
        isCardExpanded,
      });

      // iOS-optimized swipe detection with precise thresholds
      const minDistance = 30; // 30px minimum translation
      const minVelocity = 500; // 500 minimum velocity

      // Swipe up to expand
      if (
        !isCardExpanded &&
        (translationY < -minDistance || velocityY < -minVelocity)
      ) {
        console.log("📱 iOS PanGesture swipe up detected - expanding card", {
          translationY,
          velocityY,
        });
        expandCard();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      // Swipe down to collapse
      else if (
        isCardExpanded &&
        (translationY > minDistance || velocityY > minVelocity)
      ) {
        console.log("📱 iOS PanGesture swipe down detected - collapsing card", {
          translationY,
          velocityY,
        });
        collapseCard();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
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

  // Reading card content - unified for both iOS and Android
  const renderReadingCard = () => (
    <Animated.View
      style={[
        styles.cardContainer,
        { transform: [{ translateY: cardTranslateY }] },
      ]}
    >
      <Animated.View style={[styles.readingCard, { height: cardHeight }]}>
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
              <Text style={styles.cardTitle}>{imageTitle}</Text>
              <Text style={styles.cardSubtitle}>
                {educationalContent.historicalContext.substring(0, 100)}...
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Expanded content when card is swiped up or tapped */}
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
              waitFor={Platform.OS === "ios" ? panGestureRef : undefined}
              simultaneousHandlers={Platform.OS === "ios" ? panGestureRef : undefined}
            >
              <View style={styles.expandedContentInner}>
                {/* Title Section - Tappable to collapse */}
                <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                  <View style={styles.titleSection}>
                    <Text style={styles.sheetTitle}>{imageTitle}</Text>
                    <Text style={styles.sheetSubtitle}>
                      {educationalContent.moduleInfo}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Historical Content */}
                <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                  <View style={styles.historicalSection}>
                    <Text style={styles.sectionTitle}>Historical Context</Text>
                    <Text style={styles.historicalText}>
                      {educationalContent.historicalContext}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Key Terms Section */}
                <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                  <View style={styles.keyTermsSection}>
                    <Text style={styles.sectionTitle}>Key Terms</Text>
                    <View style={styles.keyTermsContainer}>
                      {educationalContent.keyTerms.map((keyTerm, index) => (
                        <KeyTermRow
                          key={index}
                          term={keyTerm.term}
                          definition={keyTerm.definition}
                        />
                      ))}
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
  );

  return (
    <>
      {/* Platform-specific StatusBar handling */}
      {Platform.OS === "android" && (
        <StatusBar barStyle="dark-content" backgroundColor="#F4EBDB" />
      )}

      <View style={styles.container}>
        {/* FULL-SCREEN IMAGE DISPLAY - Main Content */}
        <Image
          source={mainImageSource}
          style={styles.culturalImage}
          resizeMode="cover" // Full coverage without letterboxing
        />

        {/* FLOATING TEXT OVERLAY - Professional positioning */}
        <View style={styles.textOverlay}>
          <Text style={styles.overlayText}>{imageTitle}</Text>
        </View>

        {/* FLOATING BACK BUTTON - Top Left with SafeArea */}
        <SafeAreaView style={styles.backButtonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* FLOATING CONTINUE BUTTON - Top Right */}
        <SafeAreaView style={styles.continueButtonContainer}>
          <TouchableOpacity
            style={styles.topContinueButton}
            onPress={handleContinuePress}
          >
            <Ionicons name="chevron-forward" size={24} color="white" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Platform-Specific Reading Card */}
        {Platform.OS === "ios" ? (
          <PanGestureHandler
            ref={panGestureRef}
            onGestureEvent={handleSwipeGesture}
            onHandlerStateChange={handleSwipeGesture}
            activeOffsetY={[-20, 20]}
            failOffsetX={[-30, 30]}
          >
            {renderReadingCard()}
          </PanGestureHandler>
        ) : (
          renderReadingCard()
        )}
      </View>
    </>
  );
}

// EXACT StyleSheet from Adventure1_Module3_Lesson1.tsx with comprehensive styling
const styles = StyleSheet.create({
  // MAIN CONTAINER - Full-screen black background for immersive experience
  container: {
    flex: 1,
    backgroundColor: "black",
  },

  // FULL-SCREEN IMAGE DISPLAY
  culturalImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // FLOATING TEXT OVERLAY - Professional positioning with shadows
  textOverlay: {
    position: "absolute",
    top: LAYOUT_CONSTANTS.textOverlayTop, // 140px from top for SafeArea
    left: 0,
    right: 0,
    paddingHorizontal: LAYOUT_CONSTANTS.textOverlayHorizontalPadding, // 40px horizontal padding
    alignItems: "center",
  },
  overlayText: {
    fontFamily: "DM Sans",
    fontSize: 20, // Large readable font
    fontWeight: "700", // Bold for image overlay readability
    color: "white",
    textAlign: "center",
    lineHeight: 26, // 1.3 line height ratio
    textShadowColor: "black", // Text shadow for readability
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    shadowColor: "black", // Additional shadow for emphasis
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },

  // FLOATING NAVIGATION BUTTONS
  backButtonContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 20, // Highest z-index for accessibility
    paddingTop: LAYOUT_CONSTANTS.buttonContainerPadding.top, // 8px
    paddingLeft: LAYOUT_CONSTANTS.buttonContainerPadding.horizontal, // 16px
  },
  backButton: {
    width: LAYOUT_CONSTANTS.buttonSize, // 40x40 touch target
    height: LAYOUT_CONSTANTS.buttonSize,
    borderRadius: LAYOUT_CONSTANTS.buttonRadius, // Perfect circle
    backgroundColor: "rgba(0,0,0,0.6)", // Semi-transparent black
    justifyContent: "center",
    alignItems: "center",
  },
  continueButtonContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 20,
    paddingTop: LAYOUT_CONSTANTS.buttonContainerPadding.top,
    paddingRight: LAYOUT_CONSTANTS.buttonContainerPadding.horizontal,
  },
  topContinueButton: {
    width: LAYOUT_CONSTANTS.buttonSize,
    height: LAYOUT_CONSTANTS.buttonSize,
    borderRadius: LAYOUT_CONSTANTS.buttonRadius,
    backgroundColor: ArchivesTheme.colors.mossGreen, // Green for continue action
    justifyContent: "center",
    alignItems: "center",
  },

  // READING CARD SYSTEM - Unified implementation
  cardContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 30, // High z-index for card overlay
    elevation: 20, // Android elevation
  },
  readingCard: {
    height: LAYOUT_CONSTANTS.COLLAPSED_HEIGHT, // 140px collapsed height
    backgroundColor: "rgba(0,0,0,0.9)", // 90% black transparency
    borderTopLeftRadius: 20, // Rounded top corners
    borderTopRightRadius: 20,
    shadowColor: "#000", // Professional shadow system
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12, // Android shadow
  },
  cardHandle: {
    width: LAYOUT_CONSTANTS.cardHandleWidth, // 70px handle width
    height: LAYOUT_CONSTANTS.cardHandleHeight, // 5px handle height
    backgroundColor: "rgba(255,255,255,0.4)", // 40% white opacity
    borderRadius: 2,
    alignSelf: "center",
    marginTop: LAYOUT_CONSTANTS.cardHandleTopMargin, // 12px from top
  },

  // COLLAPSED CONTENT STYLES
  collapsedContent: {
    flex: 1,
  },
  readingCardHeader: {
    padding: LAYOUT_CONSTANTS.readingCardHeaderPadding.horizontal, // 20px
    paddingTop: LAYOUT_CONSTANTS.readingCardHeaderPadding.top, // 16px
    paddingBottom: LAYOUT_CONSTANTS.readingCardHeaderPadding.bottom, // 30px
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
    padding: LAYOUT_CONSTANTS.expandedContentPadding, // 20px padding
  },

  // EDUCATIONAL CONTENT STYLES
  titleSection: {
    marginBottom: LAYOUT_CONSTANTS.titleSectionBottomMargin, // 24px spacing after title
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
    marginBottom: LAYOUT_CONSTANTS.historicalSectionBottomMargin, // 20px spacing
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
    marginBottom: LAYOUT_CONSTANTS.keyTermsBottomMargin, // 20px spacing
  },
  keyTermsContainer: {
    padding: LAYOUT_CONSTANTS.keyTermsContainerPadding, // 12px padding
    backgroundColor: "rgba(255,255,255,0.1)", // 10% white overlay
    borderRadius: 8,
  },
  keyTermRow: {
    marginBottom: LAYOUT_CONSTANTS.keyTermRowBottomMargin, // 8px spacing between rows
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
