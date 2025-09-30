// ROIERA2Adv1_Module1_Lesson1.tsx - Rise of Islam Era 2: Adventure 1 Module 1 Lesson 1
// "Meccan Life & Tribal Culture" - Video + Reading lesson with exact VideoReadingLesson.md compliance
// Full-screen video lesson with ultra-smooth progress tracking, pixel-perfect animations, and comprehensive progress integration

import ArchivesTheme from "@/constants/ArchivesTheme";
import { Ionicons } from "@expo/vector-icons";
import { AVPlaybackStatus } from "expo-av";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import {
  ScrollView as GestureHandlerScrollView,
  PanGestureHandler,
  State
} from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { useProgress } from "@/context/ProgressContext";
import LessonPlayer from "../LessonPlayer";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// Card Height Constants - EXACT SwiftUI measurements
const COLLAPSED_HEIGHT = 160;           // Card collapsed state height

// Animation Constants - Performance Optimized
const PROGRESS_ANIMATION_DURATION = 50; // Ultra-smooth 50ms intervals
const CARD_ANIMATION_TENSION = 100;     // Spring animation tension
const CARD_ANIMATION_FRICTION = 8;      // Spring animation friction
const VIDEO_COMPLETION_THRESHOLD = 0.95; // 95% video completion trigger
const PROGRESS_SENSITIVITY = 0.0005;   // Progress bar update sensitivity

// Button Dimensions - EXACT SwiftUI specifications
const BUTTON_SIZE = 40;                 // Back/Next button size
const BUTTON_RADIUS = 20;              // Button border radius
const CARD_HANDLE_WIDTH = 70;          // Card drag handle width
const CARD_HANDLE_HEIGHT = 5;          // Card drag handle height

interface ROIERA2Adv1_Module1_Lesson1Props {
  onContinue: () => void;    // Required: Navigation to next lesson
  onDismiss: () => void;     // Required: Close lesson modal
}

export default function ROIERA2Adv1_Module1_Lesson1({
  onContinue,
  onDismiss,
}: ROIERA2Adv1_Module1_Lesson1Props) {
  // Progress context for lesson completion tracking (ROI system)
  const { roiAtomicProgressUpdate } = useProgress();

  // Video-related states
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [hasVideoCompleted, setHasVideoCompleted] = useState(false);

  // Reading card states
  const [hasFinishedReading, setHasFinishedReading] = useState(false);
  const [isCardExpanded, setIsCardExpanded] = useState(false);

  // Gesture handling states
  const [touchStart, setTouchStart] = useState<{y: number, time: number} | null>(null);

  // Component refs for gesture coordination
  const scrollViewGestureRef = useRef(null);
  const panGestureRef = useRef(null);

  // Animation refs - All required for smooth animations
  const cardHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;
  const progressBarWidth = useRef(new Animated.Value(0)).current;

  // Progress tracking ref
  const lastProgress = useRef(0);

  // Historical content for Rise of Islam Era - Meccan Life & Tribal Culture
  const historicalText = `Mecca was a busy desert city, filled with caravans arriving from Yemen and Syria. Its markets were lively with trade and filled with songs and stories. The Kaaba was at the heart of the city, surrounded by idols, and served as an important gathering place for many tribes. People often shared stories of their ancestors, pride, and generosity. Belonging to a strong tribe provided safety and respect-but also led to rivalry and ongoing conflicts.`;

  // Ultra-Smooth Video Progress System - Pixel Perfect Animation
  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      // Initialize video loaded state
      if (!isVideoLoaded) {
        setIsVideoLoaded(true);
      }

      // Calculate and animate progress
      if (status.durationMillis && status.positionMillis) {
        const progress = status.positionMillis / status.durationMillis;

        // Ultra-smooth progress bar animation - prevents micro-animations
        const progressDiff = Math.abs(progress - lastProgress.current);
        if (progressDiff > PROGRESS_SENSITIVITY) { // Highly sensitive threshold
          lastProgress.current = progress;

          // 50ms animation for silky smooth transitions
          Animated.timing(progressBarWidth, {
            toValue: progress,
            duration: PROGRESS_ANIMATION_DURATION,
            useNativeDriver: false, // Width animations require native driver false
          }).start();
        }

        // Video completion detection with 95% threshold
        if (progress >= VIDEO_COMPLETION_THRESHOLD && !hasVideoCompleted) {
          setHasVideoCompleted(true);
          triggerCardPopAnimation();
        }
      }
    }
  };

  // Card Pop Animation - Exact SwiftUI Replication
  const triggerCardPopAnimation = () => {
    // Two-stage spring animation sequence
    Animated.sequence([
      // Bounce up 20px
      Animated.spring(cardTranslateY, {
        toValue: -20,
        useNativeDriver: true,
        tension: 120,  // Higher tension for snappy initial bounce
        friction: 7,   // Lower friction for bounce effect
      }),
      // Settle back to original position
      Animated.spring(cardTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: CARD_ANIMATION_TENSION,  // Standard tension for settle
        friction: CARD_ANIMATION_FRICTION,   // Higher friction for smooth settle
      }),
    ]).start();

    // Light haptic feedback for video completion
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Lesson Completion Logic
  const handleContinue = async () => {
    // Prevent continuation if reading not finished
    if (!hasFinishedReading) {
      console.log("🔄 Continue button pressed but reading not finished");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    // Mark lesson as completed in progress context (ROI system: ROI_Adv1_M1, Lesson 1)
    await roiAtomicProgressUpdate("ROI_Adv1_M1", {
      type: "LESSON_COMPLETED",
      lessonId: "lesson1"
    });
    console.log("🔄 Continue button pressed - ROI_Adv1_M1 Lesson 1 completed, proceeding to lesson 2");
    onContinue();
  };

  // iOS PanGestureHandler - Native iOS Experience
  const handleSwipeGesture = (event: any) => {
    if (Platform.OS !== 'ios') return;

    if (event.nativeEvent.state === State.END) {
      const { translationY, velocityY } = event.nativeEvent;

      // iOS-optimized gesture thresholds
      const minDistance = 30;   // Minimum swipe distance
      const minVelocity = 500;  // Minimum swipe velocity

      // Swipe up detection (card expansion)
      if (!isCardExpanded &&
          (translationY < -minDistance || velocityY < -minVelocity)) {
        expandCard();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      // Swipe down detection (card collapse)
      else if (isCardExpanded &&
               (translationY > minDistance || velocityY > minVelocity)) {
        collapseCard();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  // Android Touch Events - Custom Implementation
  const handleTouchStart = (event: any) => {
    setTouchStart({
      y: event.nativeEvent.pageY,
      time: Date.now()
    });
  };

  const handleTouchEnd = (event: any) => {
    if (!touchStart) return;

    const touchEnd = event.nativeEvent.pageY;
    const distance = touchStart.y - touchEnd; // Positive = swipe up
    const time = Date.now() - touchStart.time;

    // Android-optimized gesture detection
    const minDistance = 40;        // Increased for better recognition
    const maxTime = 300;          // Max gesture duration
    const velocity = Math.abs(distance) / time;
    const velocityThreshold = 0.5; // Minimum velocity

    // Swipe up detection
    if (!isCardExpanded &&
        distance > minDistance &&
        time < maxTime &&
        velocity > velocityThreshold) {
      expandCard();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Swipe down detection
    else if (isCardExpanded &&
             distance < -minDistance &&
             time < maxTime &&
             velocity > velocityThreshold) {
      collapseCard();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setTouchStart(null);
  };

  // Card Expansion Logic
  const expandCard = () => {
    setIsCardExpanded(true);

    // Mark reading as finished when card is expanded (shows engagement)
    if (!hasFinishedReading) {
      setHasFinishedReading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Parallel animations for smooth expansion
    Animated.parallel([
      // Height expansion to 85% of screen
      Animated.spring(cardHeight, {
        toValue: SCREEN_HEIGHT * 0.85,
        useNativeDriver: false, // Height animations require native driver false
        tension: CARD_ANIMATION_TENSION,
        friction: CARD_ANIMATION_FRICTION,
      }),
      // Fade out collapsed content
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

    // Parallel animations for smooth collapse
    Animated.parallel([
      // Height collapse back to 160px
      Animated.spring(cardHeight, {
        toValue: COLLAPSED_HEIGHT,
        useNativeDriver: false,
        tension: CARD_ANIMATION_TENSION,
        friction: CARD_ANIMATION_FRICTION,
      }),
      // Fade in collapsed content
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  };

  // Handle reading scroll - track scroll position for gesture priority
  const handleReadingScroll = () => {
    // Optional: Could track reading progress here if needed for analytics
    // But completion is now triggered by card expansion for better UX
  };

  // Reading Card Structure - Detailed Implementation
  const renderReadingCard = () => (
    <Animated.View style={[
      styles.cardContainer,
      { transform: [{ translateY: cardTranslateY }] }
    ]}>
      <Animated.View style={[
        styles.readingCard,
        { height: cardHeight }
      ]}>
        {/* Card Handle - Drag Indicator */}
        <View style={styles.cardHandle} />

        {/* Collapsed Content */}
        <Animated.View style={[
          styles.collapsedContent,
          { opacity: cardOpacity }
        ]}>
          <View style={styles.readingCardHeader}>
            <Text style={styles.cardTitle}>
              Meccan Life & Tribal Culture
            </Text>
            <Text style={styles.cardSubtitle}>
              Understanding desert city culture and tribal traditions
            </Text>
          </View>
        </Animated.View>

        {/* Expanded Content - Only visible when card is expanded */}
        {isCardExpanded && (
          <Animated.View style={[
            styles.expandedContent,
            { opacity: Animated.subtract(1, cardOpacity) }
          ]}>
            <GestureHandlerScrollView
              ref={scrollViewGestureRef}
              style={styles.expandedScroll}
              showsVerticalScrollIndicator={false}
              onScroll={handleReadingScroll}
              scrollEventThrottle={100}
              waitFor={Platform.OS === 'ios' ? panGestureRef : undefined}
            >
              <View style={styles.expandedContentInner}>
                {/* Title Section */}
                <View style={styles.titleSection}>
                  <Text style={styles.sheetTitle}>
                    Meccan Life & Tribal Culture
                  </Text>
                  <Text style={styles.sheetSubtitle}>
                    Module 1 • Lesson 1
                  </Text>
                </View>

                {/* Historical Content */}
                <View style={styles.historicalSection}>
                  <Text style={styles.sectionTitle}>Historical Context</Text>
                  <Text style={styles.historicalText}>{historicalText}</Text>
                </View>

                {/* Key Terms Section */}
                <View style={styles.keyTermsSection}>
                  <Text style={styles.sectionTitle}>Key Terms</Text>
                  <View style={styles.keyTermsContainer}>
                    <KeyTermRow
                      term="Kaaba"
                      definition="The sacred black cube structure at the center of Mecca, surrounded by tribal idols before Islam"
                    />
                    <KeyTermRow
                      term="Tribal Culture"
                      definition="The social organization based on family clans that provided protection and identity in Arabian society"
                    />
                    <KeyTermRow
                      term="Caravan Trade"
                      definition="The commercial network that brought goods and cultures from Yemen and Syria through Mecca"
                    />
                  </View>
                </View>

                {/* Bottom Spacer */}
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
      {/* Android Status Bar Configuration */}
      {Platform.OS === 'android' && (
        <StatusBar barStyle="dark-content" backgroundColor="#F4EBDB" />
      )}

      <View style={styles.container}>
        {/* Full-screen Video Player */}
        <LessonPlayer
          videoSource={{ uri: "https://d3bi5e5vkj68.cloudfront.net/Reels/ROI_Adv1_M1_Reel1.mp4" }}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          autoPlay={true}
          shouldLoop={true}
        />

        {/* Video Progress Bar - Bottom Overlay */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressBarWidth.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  })
                }
              ]}
            />
          </View>
        </View>

        {/* Back Button - Top Left */}
        <SafeAreaView style={styles.backButtonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={onDismiss}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Continue Button - Top Right */}
        <SafeAreaView style={styles.nextButtonContainer}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              !hasFinishedReading && styles.nextButtonDisabled
            ]}
            onPress={hasFinishedReading ? handleContinue : undefined}
            disabled={!hasFinishedReading}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={hasFinishedReading ? "white" : "#666"}
            />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Platform-Specific Reading Card */}
        {Platform.OS === 'ios' ? (
          <PanGestureHandler
            ref={panGestureRef}
            onGestureEvent={handleSwipeGesture}
            onHandlerStateChange={handleSwipeGesture}
            activeOffsetY={[-20, 20]}
            failOffsetX={[-30, 30]}
          >
            {/* iOS Card Implementation */}
            {renderReadingCard()}
          </PanGestureHandler>
        ) : (
          <View
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Android Card Implementation */}
            {renderReadingCard()}
          </View>
        )}
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
  // Main container - Full screen black background for video
  container: {
    flex: 1,
    backgroundColor: "black",
  },

  // Video Progress Bar - Bottom overlay
  progressBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,              // 4px height
    zIndex: 10,             // Above video, below buttons
  },
  progressBarBackground: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.3)", // 30% white overlay
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: ArchivesTheme.colors.persianOrange, // Brand orange
  },

  // Navigation Buttons - EXACT positioning
  backButtonContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 20,           // Above progress bar
    paddingTop: 8,        // 8px from SafeArea
    paddingLeft: 16,      // 16px from left edge
  },
  backButton: {
    width: BUTTON_SIZE,   // EXACT 40px diameter
    height: BUTTON_SIZE,
    borderRadius: BUTTON_RADIUS,     // Perfect circle
    backgroundColor: "rgba(0,0,0,0.6)", // 60% black background
    justifyContent: "center",
    alignItems: "center",
  },

  nextButtonContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 20,
    paddingTop: 8,
    paddingRight: 16,     // 16px from right edge
  },
  nextButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_RADIUS,
    backgroundColor: ArchivesTheme.colors.mossGreen, // Brand green
    justifyContent: "center",
    alignItems: "center",
  },
  nextButtonDisabled: {
    backgroundColor: "rgba(0,0,0,0.3)", // 30% black when disabled
  },

  // Card positioning and animation container
  cardContainer: {
    position: "absolute",
    bottom: -40,            // -40px offset for partial visibility
    left: 0,
    right: 0,
  },

  // Main reading card
  readingCard: {
    height: COLLAPSED_HEIGHT,            // EXACT collapsed height
    backgroundColor: "rgba(0,0,0,0.9)", // 90% black background
    borderTopLeftRadius: 20,  // 20px top corner radius
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,     // 20% shadow opacity
    shadowRadius: 12,       // 12px blur radius
    shadowOffset: { width: 0, height: -4 }, // 4px upward shadow
    elevation: 12,          // Android shadow
  },

  // Card drag handle
  cardHandle: {
    width: CARD_HANDLE_WIDTH,              // EXACT 70px width
    height: CARD_HANDLE_HEIGHT,              // EXACT 5px height
    backgroundColor: "rgba(255,255,255,0.4)", // 40% white
    borderRadius: 2,        // 2px radius for rounded ends
    alignSelf: "center",    // Centered horizontally
    marginTop: 12,          // 12px from top
  },

  // Content layout containers
  collapsedContent: {
    flex: 1,
  },
  expandedContent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 20,         // 20px from top
  },
  expandedScroll: {
    flex: 1,
  },
  expandedContentInner: {
    padding: 20,            // 20px padding all around
  },

  // Typography and spacing
  readingCardHeader: {
    padding: 20,            // 20px padding
    paddingTop: 16,         // Reduced top padding
    paddingBottom: 30,      // Extra bottom padding
  },
  cardTitle: {
    fontFamily: "DM Sans",
    fontSize: 18,           // 18px font size
    fontWeight: "600",      // Semi-bold
    color: "white",
    marginBottom: 4,        // 4px spacing
  },
  cardSubtitle: {
    fontFamily: "DM Sans",
    fontSize: 14,           // 14px font size
    color: "white",
    opacity: 0.7,           // 70% opacity
    lineHeight: 20,         // 20px line height for readability
  },

  // Historical content section
  historicalSection: {
    marginBottom: 20,       // 20px section spacing
  },
  sectionTitle: {
    fontFamily: "DM Sans",
    fontSize: 16,           // 16px section titles
    fontWeight: "600",
    color: "white",
    marginBottom: 8,        // 8px title spacing
  },
  historicalText: {
    fontFamily: "DM Sans",
    fontSize: 14,
    color: "white",
    lineHeight: 20,         // 20px line height for readability
    textAlign: "left",
  },

  // Key terms section
  keyTermsSection: {
    marginBottom: 20,
  },
  keyTermsContainer: {
    padding: 12,            // 12px inner padding
    backgroundColor: "rgba(255,255,255,0.1)", // 10% white background
    borderRadius: 8,        // 8px corner radius
  },
  keyTermRow: {
    marginBottom: 8,        // 8px between terms
  },
  keyTermTitle: {
    fontFamily: "DM Sans",
    fontSize: 14,
    fontWeight: "600",
    color: "white",
    marginBottom: 2,        // 2px tight spacing
  },
  keyTermDefinition: {
    fontFamily: "DM Sans",
    fontSize: 14,
    color: "white",
    lineHeight: 16,         // Compact line height for definitions
  },

  // Expanded view title section
  titleSection: {
    marginBottom: 24,       // 24px large section spacing
  },
  sheetTitle: {
    fontFamily: "DM Sans",
    fontSize: 24,           // Large 24px title
    fontWeight: "700",      // Bold weight
    color: "white",
    marginBottom: 8,
  },
  sheetSubtitle: {
    fontFamily: "DM Sans",
    fontSize: 14,
    color: "white",
    opacity: 0.7,
  },

  // Bottom spacer for full scroll
  sheetBottomSpacer: {
    height: 80,             // 80px bottom spacing
  },
});