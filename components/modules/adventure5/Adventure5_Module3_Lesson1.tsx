// Adventure5_Module3_Lesson1.tsx - VideoReadingLesson about Abbasid Revolution and Baghdad Foundation
// Combines full-screen video playback with expandable reading content about the 750 CE Abbasid takeover

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

interface Adventure5_Module3_Lesson1Props {
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

// Historical content about the Abbasid Revolution and Baghdad foundation
const historicalText = `In 750 CE, after years of unrest, the Abbasids overthrew the Umayyads and took control of the Islamic world. They promised fairness, knowledge, and leadership connected to the Prophet's family. To mark this new beginning, they founded a brand-new capital: Baghdad - a city built from scratch to reflect their power, order, and love of learning. It became the shining heart of a new age.`;

export default function Adventure5_Module3_Lesson1({
  onContinue,
  onDismiss,
  onBack,
}: Adventure5_Module3_Lesson1Props) {
  // Video-related states
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);

  // Reading card states
  const [hasFinishedReading, setHasFinishedReading] = useState(false);
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [touchStart, setTouchStart] = useState<{
    y: number;
    time: number;
  } | null>(null);

  // Critical gesture coordination state
  const [isCardGestureActive, setIsCardGestureActive] = useState(false);

  // Animation values for smooth card expansion
  const cardHeight = useRef(new Animated.Value(160)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;

  // Component refs for programmatic control
  const scrollViewGestureRef = useRef(null);
  const panGestureRef = useRef(null);

  // Progress context integration
  const { completeLesson } = useProgress();

  // Video status handler
  const handleVideoStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsVideoLoaded(true);
      setVideoDuration(status.durationMillis || 0);
      setVideoProgress(status.positionMillis || 0);
      setIsVideoPlaying(status.isPlaying);
    }
  };

  // Enhanced iOS PanGestureHandler with perfect gesture coordination
  const handleSwipeGesture = (event: any) => {
    if (Platform.OS !== "ios") return;

    const { state, translationY, velocityY } = event.nativeEvent;

    if (state === State.BEGAN || state === State.ACTIVE) {
      setIsCardGestureActive(true);
    } else if (
      state === State.END ||
      state === State.CANCELLED ||
      state === State.FAILED
    ) {
      setIsCardGestureActive(false);
    }

    if (state === State.END) {
      const minDistance = IOS_GESTURE_CONSTANTS.minDistance;
      const minVelocity = IOS_GESTURE_CONSTANTS.minVelocity;

      // Swipe up to expand
      if (
        !isCardExpanded &&
        (translationY < -minDistance || velocityY < -minVelocity)
      ) {
        expandCard();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      // Swipe down to collapse
      else if (
        isCardExpanded &&
        (translationY > minDistance || velocityY > minVelocity)
      ) {
        collapseCard();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  // Enhanced Android touch handlers
  const handleTouchStart = (event: any) => {
    setTouchStart({
      y: event.nativeEvent.pageY,
      time: Date.now(),
    });
    setIsCardGestureActive(true);
  };

  const handleTouchEnd = (event: any) => {
    setIsCardGestureActive(false);

    if (!touchStart) return;

    const touchEnd = event.nativeEvent.pageY;
    const distance = touchStart.y - touchEnd;
    const time = Date.now() - touchStart.time;

    const minDistance = ANDROID_GESTURE_CONSTANTS.minDistance;
    const maxTime = ANDROID_GESTURE_CONSTANTS.maxTime;
    const velocity = Math.abs(distance) / time;
    const velocityThreshold = ANDROID_GESTURE_CONSTANTS.velocityThreshold;

    // Swipe up to expand
    if (
      !isCardExpanded &&
      distance > minDistance &&
      time < maxTime &&
      velocity > velocityThreshold
    ) {
      expandCard();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Swipe down to collapse
    else if (
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

  // Expand the card to full height
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
    setIsCardExpanded(false);

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

  // Reading scroll handler
  const handleReadingScroll = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    setScrollY(contentOffset.y);
  };

  // Navigation handlers
  const handleBackPress = () => {
    (onBack || onDismiss)();
  };

  const handleContinuePress = () => {
    if (!hasFinishedReading) {
      console.log("🔄 Continue button pressed but reading not finished");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    // Mark lesson as completed
    completeLesson(5, 3, "lesson1");
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

  // Progress calculation for display
  const progressPercentage =
    videoDuration > 0 ? (videoProgress / videoDuration) * 100 : 0;

  return (
    <>
      {Platform.OS === "android" && (
        <StatusBar barStyle="dark-content" backgroundColor="#F4EBDB" />
      )}

      <View style={styles.container}>
        {/* FULL-SCREEN VIDEO PLAYER */}
        <LessonPlayer
          videoSource={{
            uri: "https://dzyjrzj2lngmg.cloudfront.net/Reel%20Videos/Adv5_M3_Reel1.mp4",
          }}
          onPlaybackStatusUpdate={handleVideoStatusUpdate}
        />

        {/* NAVIGATION CONTROLS */}

        {/* Back Button */}
        <SafeAreaView style={styles.backButtonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
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
            onPress={hasFinishedReading ? handleContinuePress : undefined}
            disabled={!hasFinishedReading}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={hasFinishedReading ? "white" : "#666"}
            />
          </TouchableOpacity>
        </SafeAreaView>

        {/* VIDEO PROGRESS BAR */}
        {!isCardExpanded && isVideoLoaded && (
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progressPercentage}%` },
                ]}
              />
            </View>
          </View>
        )}

        {/* EXPANDABLE READING CARD */}
        {Platform.OS === "ios" ? (
          <PanGestureHandler
            ref={panGestureRef}
            onGestureEvent={handleSwipeGesture}
            onHandlerStateChange={handleSwipeGesture}
            activeOffsetY={[
              -IOS_GESTURE_CONSTANTS.activeOffsetY,
              IOS_GESTURE_CONSTANTS.activeOffsetY,
            ]}
            failOffsetX={[
              -IOS_GESTURE_CONSTANTS.failOffsetX,
              IOS_GESTURE_CONSTANTS.failOffsetX,
            ]}
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
                      <Text style={styles.cardTitle}>
                        Abbasid Revolution and New Order
                      </Text>
                      <Text style={styles.cardSubtitle}>
                        Building a new capital to reflect their power and vision
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
                              Abbasid Revolution and New Order
                            </Text>
                            <Text style={styles.sheetSubtitle}>
                              Module 3 • Lesson 1
                            </Text>
                          </View>
                        </TouchableOpacity>

                        {/* Historical Content */}
                        <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                          <View style={styles.historicalSection}>
                            <Text style={styles.sectionTitle}>
                              The Great Revolution
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
                                term="New Order"
                                definition="Abbasid promise of fairness, knowledge, and proper Islamic leadership"
                              />
                              <KeyTermRow
                                term="Round City"
                                definition="Baghdad's unique circular design symbolizing unity and perfection"
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
        ) : (
          <View onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <Animated.View
              style={[
                styles.cardContainer,
                { transform: [{ translateY: cardTranslateY }] },
              ]}
            >
              <Animated.View
                style={[styles.readingCard, { height: cardHeight }]}
              >
                <View style={styles.cardHandle} />

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
                        Abbasid Revolution and New Order
                      </Text>
                      <Text style={styles.collapsedSubtitle}>
                        Building a new capital to reflect their power and vision
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
                      onScrollBeginDrag={() => setIsCardGestureActive(true)}
                      onScrollEndDrag={() => setIsCardGestureActive(false)}
                    >
                      <View style={styles.expandedContentInner}>
                        {/* Title Section - Tappable to collapse */}
                        <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                          <View style={styles.titleSection}>
                            <Text style={styles.sheetTitle}>
                              Abbasid Revolution and New Order
                            </Text>
                            <Text style={styles.sheetSubtitle}>
                              Module 3 • Lesson 1
                            </Text>
                          </View>
                        </TouchableOpacity>

                        {/* Historical Content */}
                        <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                          <View style={styles.historicalSection}>
                            <Text style={styles.sectionTitle}>
                              The Great Revolution
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
                                term="750 CE"
                                definition="The year the Abbasids overthrew the Umayyads and seized power"
                              />
                              <KeyTermRow
                                term="Baghdad"
                                definition="The new Abbasid capital city built from scratch near the Tigris River"
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
          </View>
        )}
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

  // VIDEO PLAYER
  videoPlayer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },

  // PROGRESS BAR
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

  // Collapsed Content Styles
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
  },

  // Expanded Content System
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

  // Educational Content Styles
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

  // Android-specific optimizations
  collapsedContentWrapper: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 25,
    marginTop: -15,
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

  // Utility Styles
  sheetBottomSpacer: {
    height: 60,
  },
});
