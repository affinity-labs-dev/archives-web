// Adventure1_Module1_Lesson1.tsx - Umayyad Dynasty: Damascus Capital Lesson
// Full-screen video lesson with progress bar, reading card, and repositioned controls

import ArchivesTheme from "@/constants/ArchivesTheme";
import { useProgress } from "@/context/ProgressContext";
import { useLessonTracking } from "@/hooks/useLessonTracking";
import { Ionicons } from "@expo/vector-icons";
import { AVPlaybackStatus } from "expo-av";
import { Image } from "expo-image";
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

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const COLLAPSED_HEIGHT = 160;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.85;

interface Adventure1_Module1_Lesson1Props {
  onContinue: () => void;
  onDismiss: () => void;
}

export default function Adventure1_Module1_Lesson1({
  onContinue,
  onDismiss,
}: Adventure1_Module1_Lesson1Props) {
  // Progress context for lesson completion tracking
  const { completeLesson } = useProgress();

  // Analytics tracking for video and lesson events
  const {
    trackVideoPlay,
    trackVideoPause,
    trackVideoComplete,
    trackCardExpanded,
    trackLessonComplete,
  } = useLessonTracking({
    adventureId: 1,
    moduleId: 1,
    lessonId: "lesson1",
    lessonType: "video_reading",
    lessonTitle: "Bay'ah Ceremony & Damascus",
    chapterNumber: 1,
    screenUrl: "/adventure/1/module/1/lesson1",
  });

  // Removed isPlaying state - now managed by LessonPlayer using expo-video useEvent
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [wasPlaying, setWasPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [hasFinishedReading, setHasFinishedReading] = useState(true);
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [hasVideoCompleted, setHasVideoCompleted] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollViewGestureRef = useRef(null);
  const panGestureRef = useRef(null);

  // Animation values for card expansion
  const cardHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;

  // Animated value for smooth progress bar
  const progressBarWidth = useRef(new Animated.Value(0)).current;

  // Track last progress to prevent unnecessary animations
  const lastProgress = useRef(0);

  // Umayyad Dynasty: Damascus historical content
  const historicalText = `In 661 CE, Muʿawiya became the first Umayyad caliph and moved the capital to Damascus. He gained power through the bayʿah ceremony, where leaders and citizens pledged loyalty by placing their hands in his. This public act wasn't just symbolic - it showed unity and made his rule legitimate. From Damascus, Muʿawiya built the foundations of a new dynasty and a powerful center of leadership.`;

  // Handle video playback status and track progress
  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      if (!isVideoLoaded) {
        setIsVideoLoaded(true);
      }

      // Track video play/pause events for analytics
      if (status.isPlaying && !wasPlaying) {
        // Video started playing
        trackVideoPlay(status.durationMillis);
        setWasPlaying(true);
      } else if (!status.isPlaying && wasPlaying) {
        // Video was paused
        trackVideoPause(status.positionMillis || 0, status.durationMillis || 0);
        setWasPlaying(false);
      }

      // Update video progress for progress bar
      if (status.durationMillis && status.positionMillis) {
        const progress = status.positionMillis / status.durationMillis;
        setVideoProgress(progress);

        // Only animate if progress changed significantly (prevents micro-animations)
        const progressDiff = Math.abs(progress - lastProgress.current);
        if (progressDiff > 0.0005) {
          // More sensitive threshold for ultra-smooth updates
          lastProgress.current = progress;

          // Ultra-smooth progress bar animation
          Animated.timing(progressBarWidth, {
            toValue: progress,
            duration: 50, // Very short animation for silky smooth transitions
            useNativeDriver: false, // Width animations require native driver false
          }).start();
        }

        // Check if video completed (reached 95% to account for slight timing issues)
        if (progress >= 0.95 && !hasVideoCompleted) {
          setHasVideoCompleted(true);
          trackVideoComplete(status.durationMillis);
          triggerCardPopAnimation();
        }
      }
    }
  };

  // Trigger card bounce up animation when video completes
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
        tension: 100,
        friction: 8,
      }),
    ]).start();
  };

  // Removed handleTogglePlayback - now handled directly by LessonPlayer

  // Continue button handler
  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Track lesson completion in analytics
    trackLessonComplete();

    // Mark lesson as completed in progress context (Adventure 1, Module 1, Lesson 1)
    completeLesson(1, 1, "lesson1");
    console.log(
      "🔄 Continue button pressed - Adventure 1 lesson 1 completed, proceeding to lesson 2"
    );
    onContinue();
  };

  // iOS PanGestureHandler for native iOS gesture experience
  const handleSwipeGesture = (event: any) => {
    if (Platform.OS !== "ios") return;

    if (event.nativeEvent.state === State.END) {
      const { translationY, velocityY } = event.nativeEvent;
      console.log("📱 iOS PanGesture detected", {
        translationY,
        velocityY,
        isCardExpanded,
        platform: Platform.OS,
      });

      // iOS-optimized swipe detection
      const minDistance = 30;
      const minVelocity = 500;

      if (
        !isCardExpanded &&
        (translationY < -minDistance || velocityY < -minVelocity)
      ) {
        console.log("📱 iOS PanGesture swipe up detected - expanding card", {
          translationY,
          velocityY,
          platform: Platform.OS,
        });
        expandCard();
      } else if (
        isCardExpanded &&
        (translationY > minDistance || velocityY > minVelocity)
      ) {
        console.log("📱 iOS PanGesture swipe down detected - collapsing card", {
          translationY,
          velocityY,
          platform: Platform.OS,
        });
        collapseCard();
      }
    }
  };

  // Expand the card to full height
  const expandCard = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsCardExpanded(true);

    // Track reading card expansion in analytics
    trackCardExpanded();

    // Activate continue button when user expands card (shows engagement with content)
    if (!hasFinishedReading) {
      setHasFinishedReading(true);
      console.log("📖 Reading card expanded - Continue button now enabled");
    }

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsCardExpanded(false);

    Animated.parallel([
      Animated.spring(cardHeight, {
        toValue: COLLAPSED_HEIGHT,
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
    // Optional: Could track reading progress here if needed for analytics
    // But completion is now triggered by card expansion for better UX
  };

  // Handle card dismiss
  const handleCardDismiss = () => {
    console.log("📖 Reading card dismissed");
    collapseCard();
  };

  return (
    <>
      {Platform.OS === "android" && (
        <StatusBar barStyle="dark-content" backgroundColor="#F4EBDB" />
      )}
      <View style={styles.container}>
        {/* Full-screen video player */}
        <LessonPlayer
          videoSource={{
            uri: "https://dzyjrzj2lngmg.cloudfront.net/Reel+Videos/Adv1_M1_Reel1.mp4",
          }}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          autoPlay={true}
          shouldLoop={true}
        />

        {/* Video Progress Bar at bottom */}
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

        {/* Back Button - Top Left */}
        <SafeAreaView style={styles.backButtonContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onDismiss();
            }}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Next Button - Top Right */}
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

        {/* Reading Card at Bottom - Platform-Specific Gesture Handling */}
        {Platform.OS === "ios" ? (
          // iOS: Native PanGestureHandler
          <PanGestureHandler
            ref={panGestureRef}
            onGestureEvent={handleSwipeGesture}
            onHandlerStateChange={handleSwipeGesture}
            activeOffsetY={[-20, 20]}
            failOffsetX={[-30, 30]}
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
                        Bay&apos;ah Ceremony & Damascus
                      </Text>
                      <Text style={styles.cardSubtitle}>
                        In 661 CE, Muʿawiya became the first Umayyad caliph...
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
                      waitFor={
                        Platform.OS === "ios" ? panGestureRef : undefined
                      }
                    >
                      <View style={styles.expandedContentInner}>
                        {/* Title Section - Tappable to collapse */}
                        <TouchableOpacity
                          onPress={collapseCard}
                          activeOpacity={0.9}
                        >
                          <View style={styles.titleSection}>
                            <Text style={styles.sheetTitle}>
                              Bay&apos;ah Ceremony & Damascus
                            </Text>
                            <Text style={styles.sheetSubtitle}>
                              Module 1 • Lesson 1
                            </Text>
                          </View>
                        </TouchableOpacity>

                        {/* Historical Content */}
                        <TouchableOpacity
                          onPress={collapseCard}
                          activeOpacity={0.9}
                        >
                          <View style={styles.historicalSection}>
                            <Text style={styles.sectionTitle}>
                              Historical Context
                            </Text>
                            <Text style={styles.historicalText}>
                              {historicalText}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        {/* Key Terms Section */}
                        <TouchableOpacity
                          onPress={collapseCard}
                          activeOpacity={0.9}
                        >
                          <View style={styles.keyTermsSection}>
                            <Text style={styles.sectionTitle}>Key Terms</Text>
                            <View style={styles.keyTermsContainer}>
                              <KeyTermRow
                                term="Bay'ah"
                                definition="A pledge of loyalty ceremony where people place hands with the caliph to show allegiance"
                              />
                              <KeyTermRow
                                term="Damascus"
                                definition="The capital city chosen by Muʿawiya for the Umayyad Caliphate in 661 CE"
                              />
                              <KeyTermRow
                                term="Legitimacy"
                                definition="The acceptance of a leader's right to rule, established through ceremonies like bay'ah"
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
        ) : (
          // Android: TouchableOpacity for tap-to-expand
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
                  <View style={styles.collapsedContentWrapper}>
                    <Text style={styles.collapsedTitle}>
                      Bay&apos;ah Ceremony & Damascus
                    </Text>
                    <Text style={styles.collapsedSubtitle}>
                      In 661 CE, Muʿawiya became the first Umayyad caliph...
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>

              {/* Expanded content when card is expanded */}
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
                  >
                    <View style={styles.expandedContentInner}>
                      {/* Title Section - Tappable to collapse */}
                      <TouchableOpacity
                        onPress={collapseCard}
                        activeOpacity={0.9}
                      >
                        <View style={styles.titleSection}>
                          <Text style={styles.sheetTitle}>
                            Bay&apos;ah Ceremony & Damascus
                          </Text>
                          <Text style={styles.sheetSubtitle}>
                            Module 1 • Lesson 1
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {/* Historical Context Section */}
                      <TouchableOpacity
                        onPress={collapseCard}
                        activeOpacity={0.9}
                      >
                        <View style={styles.historicalSection}>
                          <Text style={styles.sectionTitle}>
                            Historical Context
                          </Text>
                          <Text style={styles.historicalText}>
                            {historicalText}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {/* Key Terms Section */}
                      <TouchableOpacity
                        onPress={collapseCard}
                        activeOpacity={0.9}
                      >
                        <View style={styles.keyTermsSection}>
                          <Text style={styles.sectionTitle}>Key Terms</Text>
                          <View style={styles.keyTermsContainer}>
                            <KeyTermRow
                              term="Bay'ah"
                              definition="A pledge of loyalty ceremony where people place hands with the caliph to show allegiance"
                            />
                            <KeyTermRow
                              term="Damascus"
                              definition="The capital city chosen by Muʿawiya for the Umayyad Caliphate in 661 CE"
                            />
                            <KeyTermRow
                              term="Legitimacy"
                              definition="The acceptance of a leader's right to rule, established through ceremonies like bay'ah"
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
        )}

        {/* Read Walkthrough Hint - Above reading card */}
        <View style={styles.readHintContainer}>
          <Image
            source={require('@/assets/images/walkthrough/read.svg')}
            style={styles.readHintImage}
            resizeMode="contain"
          />
        </View>

        {/* Continue Walkthrough Hint - Left of Next button */}
        <SafeAreaView style={styles.continueHintContainer}>
          <Image
            source={require('@/assets/images/walkthrough/continue.svg')}
            style={styles.continueHintImage}
            resizeMode="contain"
          />
        </SafeAreaView>
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

  // Next Button - Top Right
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
    backgroundColor: ArchivesTheme.colors.mossGreen, // Brand moss green color
    justifyContent: "center",
    alignItems: "center",
  },
  nextButtonDisabled: {
    backgroundColor: "rgba(0,0,0,0.3)", // Gray when disabled
  },

  // Card Container for scale animation
  cardContainer: {
    position: "absolute",
    bottom: -40,
    left: 0,
    right: 0,
    zIndex: 30, // On top of hints when expanded
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
  expandedHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.2)",
  },
  expandedScroll: {
    flex: 1,
  },
  expandedContentInner: {
    padding: 20,
  },

  // Continue button in expanded view
  continueButtonExpanded: {
    position: "absolute",
    right: 20,
    bottom: 40,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#8BC34A", // Green color like in screenshot
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
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
  readingCardPreview: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  expandIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
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

  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  doneButtonText: {
    fontFamily: "DM Sans",
    fontSize: 16,
    fontWeight: "600",
    color: "white",
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

  // Collapsed card text styles (for Android touch version)
  collapsedContentWrapper: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 30,
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

  // Walkthrough hints
  readHintContainer: {
    position: 'absolute',
    bottom: COLLAPSED_HEIGHT - 80, // Very close to card top (COLLAPSED_HEIGHT - 40 bottom offset - 40 spacing)
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 15, // Below card, above progress bar
    pointerEvents: 'none', // Don't block interactions
  },
  readHintImage: {
    width: 180,
    height: 180,
  },

  continueHintContainer: {
    position: 'absolute',
    top: 0,
    right: 64, // Left of Next button (paddingRight 16 + button 40 + spacing 8)
    paddingTop: 8, // Same as Next button
    zIndex: 15, // Below card, above progress bar
    pointerEvents: 'none',
  },
  continueHintImage: {
    width: 120,
    height: 60,
  },
});
