// Adventure5_Module2_Lesson1.tsx - VideoReadingLesson about Abbasid Revolutionary Strategy
// Combines full-screen video playback with expandable reading content about Abbasid rebellion tactics

import ArchivesTheme from "@/constants/ArchivesTheme";
import { useProgress } from "@/context/ProgressContext";
import { Ionicons } from "@expo/vector-icons";
import { AVPlaybackStatus } from "expo-av";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
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
import LessonPlayer from "../LessonPlayer";

interface Adventure5_Module2_Lesson1Props {
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void;
}

// Screen dimensions for perfect full-screen display
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// Card animation constants - EXACT SwiftUI measurements
const COLLAPSED_HEIGHT = 160;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.85;

// Animation constants for ultra-smooth experience
const PROGRESS_ANIMATION_DURATION = 50;
const CARD_ANIMATION_TENSION = 100;
const CARD_ANIMATION_FRICTION = 8;
const VIDEO_COMPLETION_THRESHOLD = 0.95;
const PROGRESS_SENSITIVITY = 0.0005;

// Historical content about Abbasid revolutionary strategy
const historicalText = `Long before the Abbasids took the throne, they built a movement in whispers and promises. Pamphlets, secret meetings, and emotional appeals were their tools. They offered a new vision - an empire with fair leadership, grounded in loyalty to the Prophet's family. Their message was simple, bold, and powerful - and it lit a fire that would soon change the Islamic world forever.`;

export default function Adventure5_Module2_Lesson1({
  onContinue,
  onDismiss,
  onBack,
}: Adventure5_Module2_Lesson1Props) {
  // Video-related states
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [hasVideoCompleted, setHasVideoCompleted] = useState(false);

  // Reading card states
  const [hasFinishedReading, setHasFinishedReading] = useState(false);
  const [isCardExpanded, setIsCardExpanded] = useState(false);

  // Gesture handling states
  const [scrollY, setScrollY] = useState(0);
  const [touchStart, setTouchStart] = useState<{
    y: number;
    time: number;
  } | null>(null);

  // Component refs for gesture coordination
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollViewGestureRef = useRef(null);
  const panGestureRef = useRef(null);

  // Animation refs - All required for smooth animations
  const cardHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;
  const progressBarWidth = useRef(new Animated.Value(0)).current;

  // Progress tracking ref
  const lastProgress = useRef(0);

  // Progress context integration
  const { completeLesson } = useProgress();

  // Ultra-smooth video progress tracking
  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      if (!isVideoLoaded) {
        setIsVideoLoaded(true);
      }

      if (status.durationMillis && status.positionMillis) {
        const progress = status.positionMillis / status.durationMillis;
        setVideoProgress(progress);

        // Ultra-smooth progress bar animation - prevents micro-animations
        const progressDiff = Math.abs(progress - lastProgress.current);
        if (progressDiff > PROGRESS_SENSITIVITY) {
          lastProgress.current = progress;

          Animated.timing(progressBarWidth, {
            toValue: progress,
            duration: PROGRESS_ANIMATION_DURATION,
            useNativeDriver: false,
          }).start();
        }

        // Video completion detection
        if (progress >= VIDEO_COMPLETION_THRESHOLD && !hasVideoCompleted) {
          setHasVideoCompleted(true);
          triggerCardPopAnimation();
        }
      }
    }
  };

  // Card pop animation on video completion
  const triggerCardPopAnimation = () => {
    Animated.sequence([
      Animated.spring(cardTranslateY, {
        toValue: -20,
        useNativeDriver: true,
        tension: 120,
        friction: 7,
      }),
      Animated.spring(cardTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: CARD_ANIMATION_TENSION,
        friction: CARD_ANIMATION_FRICTION,
      }),
    ]).start();

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // iOS PanGestureHandler
  const handleSwipeGesture = (event: any) => {
    if (Platform.OS !== "ios") return;

    if (event.nativeEvent.state === State.END) {
      const { translationY, velocityY } = event.nativeEvent;

      const minDistance = 30;
      const minVelocity = 500;

      if (
        !isCardExpanded &&
        (translationY < -minDistance || velocityY < -minVelocity)
      ) {
        expandCard();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (
        isCardExpanded &&
        (translationY > minDistance || velocityY > minVelocity)
      ) {
        collapseCard();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  // Android touch events
  const handleTouchStart = (event: any) => {
    setTouchStart({
      y: event.nativeEvent.pageY,
      time: Date.now(),
    });
  };

  const handleTouchEnd = (event: any) => {
    if (!touchStart) return;

    const touchEnd = event.nativeEvent.pageY;
    const distance = touchStart.y - touchEnd;
    const time = Date.now() - touchStart.time;

    const minDistance = 40;
    const maxTime = 300;
    const velocity = Math.abs(distance) / time;
    const velocityThreshold = 0.5;

    if (
      !isCardExpanded &&
      distance > minDistance &&
      time < maxTime &&
      velocity > velocityThreshold
    ) {
      expandCard();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (
      isCardExpanded &&
      distance < -minDistance &&
      time < maxTime &&
      velocity > velocityThreshold
    ) {
      collapseCard();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setTouchStart(null);
  };

  // Card expansion logic
  const expandCard = () => {
    setIsCardExpanded(true);

    if (!hasFinishedReading) {
      setHasFinishedReading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

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

  // Card collapse logic
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

  // Lesson completion logic
  const handleContinue = () => {
    if (!hasFinishedReading) {
      console.log("🔄 Continue button pressed but reading not finished");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    completeLesson(5, 2, "lesson1");
    console.log("🔄 Continue button pressed - proceeding to next lesson");
    onContinue();
  };

  // Reading scroll handler
  const handleReadingScroll = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    setScrollY(contentOffset.y);
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

  // Reading card content
  const renderReadingCard = () => (
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
              <Text style={styles.cardTitle}>Abbasid Revolutionary Strategy</Text>
              <Text style={styles.cardSubtitle}>
                Building a movement through whispers and promises
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
              waitFor={Platform.OS === "ios" ? panGestureRef : undefined}
            >
              <View style={styles.expandedContentInner}>
                {/* Title Section - Tappable to collapse */}
                <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                  <View style={styles.titleSection}>
                    <Text style={styles.sheetTitle}>
                      Abbasid Revolutionary Strategy
                    </Text>
                    <Text style={styles.sheetSubtitle}>Module 2 • Lesson 1</Text>
                  </View>
                </TouchableOpacity>

                {/* Historical Content */}
                <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                  <View style={styles.historicalSection}>
                    <Text style={styles.sectionTitle}>Revolutionary Tactics</Text>
                    <Text style={styles.historicalText}>{historicalText}</Text>
                  </View>
                </TouchableOpacity>

                {/* Key Terms Section */}
                <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                  <View style={styles.keyTermsSection}>
                    <Text style={styles.sectionTitle}>Key Terms</Text>
                    <View style={styles.keyTermsContainer}>
                      <KeyTermRow
                        term="Propaganda"
                        definition="Strategic communication designed to influence public opinion and build revolutionary support"
                      />
                      <KeyTermRow
                        term="Ahl al-Bayt"
                        definition="The Prophet's family - central to Abbasid claims of religious legitimacy"
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
  );

  return (
    <>
      {Platform.OS === "android" && (
        <StatusBar barStyle="dark-content" backgroundColor="#F4EBDB" />
      )}

      <View style={styles.container}>
        {/* Full-screen Video Player */}
        <LessonPlayer
          videoSource={{
            uri: "https://dzyjrzj2lngmg.cloudfront.net/Reel+Videos/Adv5_M2_Reel1.mp4",
          }}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          autoPlay={true}
          shouldLoop={true}
        />

        {/* Video Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressBarWidth.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>
        </View>

        {/* Back Button */}
        <SafeAreaView style={styles.backButtonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={onDismiss}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Continue Button */}
        <SafeAreaView style={styles.nextButtonContainer}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              !hasFinishedReading && styles.nextButtonDisabled,
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
          <View onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            {renderReadingCard()}
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // Main container - Full screen black background for video
  container: {
    flex: 1,
    backgroundColor: "black",
  },

  // Video Progress Bar
  progressBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    zIndex: 10,
  },
  progressBarBackground: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: ArchivesTheme.colors.persianOrange,
  },

  // Navigation Buttons
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
  nextButtonContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 20,
    paddingTop: 8,
    paddingRight: 16,
  },
  nextButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ArchivesTheme.colors.mossGreen,
    justifyContent: "center",
    alignItems: "center",
  },
  nextButtonDisabled: {
    backgroundColor: "rgba(0,0,0,0.3)",
  },

  // Reading Card System
  cardContainer: {
    position: "absolute",
    bottom: -40,
    left: 0,
    right: 0,
  },
  readingCard: {
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

  // Collapsed Content
  collapsedContent: {
    flex: 1,
  },
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
    lineHeight: 20,
  },

  // Expanded Content
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

  // Title Section
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

  // Historical Section
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

  // Bottom Spacer
  sheetBottomSpacer: {
    height: 80,
  },
});
