// Adventure1_Module1_Lesson2.tsx - Damascus Growth Under Umayyad Rule
// Full-screen video lesson with progress bar, reading card, and repositioned controls

import ArchivesTheme from "@/constants/ArchivesTheme";
import { Ionicons } from "@expo/vector-icons";
import { AVPlaybackStatus } from "expo-av";
import * as Haptics from "expo-haptics";
import React, { useRef, useState, useEffect } from "react";
import {
  Animated,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { PanGestureHandler, State, ScrollView as GestureHandlerScrollView } from "react-native-gesture-handler";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useProgress } from "@/context/ProgressContext";
import { useLessonTracking } from "@/hooks/useLessonTracking";
import LessonPlayer from "../LessonPlayer";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const COLLAPSED_HEIGHT = 160;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.85;

interface Adventure1_Module1_Lesson2Props {
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void;
}

export default function Adventure1_Module1_Lesson2({
  onContinue,
  onDismiss,
  onBack,
}: Adventure1_Module1_Lesson2Props) {
  // Progress context for lesson completion tracking
  const { completeLesson } = useProgress();
  const insets = useSafeAreaInsets();

  // Analytics tracking for video and lesson events
  const {
    trackVideoPlay,
    trackVideoPause,
    trackVideoComplete,
    trackCardExpanded,
    trackLessonComplete
  } = useLessonTracking({
    adventureId: 1,
    moduleId: 1,
    lessonId: 'lesson2',
    lessonType: 'video_reading',
    lessonTitle: "The Barada River's Gift",
    chapterNumber: 1,
    screenUrl: '/adventure/1/module/1/lesson2'
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

  // Hardcoded walkthrough hints (no first-time condition)
  const [showReadHint, setShowReadHint] = useState(false);
  const [showContinueHint, setShowContinueHint] = useState(false);

  // Animation values for card expansion
  const cardHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;

  // Animated value for smooth progress bar
  const progressBarWidth = useRef(new Animated.Value(0)).current;

  // Track last progress to prevent unnecessary animations
  const lastProgress = useRef(0);

  // Historical text content from iOS
  const historicalText = `Damascus grew quickly under Umayyad rule because of the Barada River. As the river left the mountains, people split its water into canals that turned the dry land around the city into the green Ghouta oasis. The Barada is the same river called "Abana" in the Bible. With steady water, markets and mosques spread, and the new capital came to life.`;

  // Handle video playback status and track progress
  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      if (!isVideoLoaded) {
        setIsVideoLoaded(true);
        console.log(
          "🎬 DEBUG: Adventure1_Module1_Lesson2 video player ready - starting playback"
        );
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
        if (progressDiff > 0.0005) { // More sensitive threshold for ultra-smooth updates
          lastProgress.current = progress;

          // Update progress bar with smooth animation
          Animated.timing(progressBarWidth, {
            toValue: progress,
            duration: 16, // 16ms for 60fps equivalent smoothness
            useNativeDriver: false,
          }).start();
        }

        // Check if video completed (reached 95% to account for slight timing issues)
        if (progress >= 0.95 && !hasVideoCompleted) {
          setHasVideoCompleted(true);
          trackVideoComplete(status.durationMillis);
          console.log("🎬 DEBUG: Video playback completed, triggering card animation");
          triggerCardPopAnimation();
        }
      }
    } else if (status.error) {
      console.error("🎬 ERROR: Video playback error:", status.error);
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

  // Hardcoded walkthrough hints - percentage-based timing (no conditions)
  useEffect(() => {
    // Read hint triggers: 20-30%, 50-60%, 95%+ (10% duration each)
    const shouldShowRead =
      (videoProgress >= 0.2 && videoProgress < 0.3) ||
      (videoProgress >= 0.5 && videoProgress < 0.6) ||
      videoProgress >= 0.95;

    if (shouldShowRead && !showReadHint) {
      setShowReadHint(true);
      console.log(`👁️ Read hint shown at ${Math.round(videoProgress * 100)}%`);
    } else if (!shouldShowRead && showReadHint) {
      setShowReadHint(false);
      console.log(`👁️ Read hint hidden at ${Math.round(videoProgress * 100)}%`);
    }

    // Continue hint triggers: 30-40%, 60-70%, 100%+ (10% duration each)
    const shouldShowContinue =
      (videoProgress >= 0.3 && videoProgress < 0.4) ||
      (videoProgress >= 0.6 && videoProgress < 0.7) ||
      videoProgress >= 1.0;

    if (shouldShowContinue && !showContinueHint) {
      setShowContinueHint(true);
      console.log(`👁️ Continue hint shown at ${Math.round(videoProgress * 100)}%`);
    } else if (!shouldShowContinue && showContinueHint) {
      setShowContinueHint(false);
      console.log(`👁️ Continue hint hidden at ${Math.round(videoProgress * 100)}%`);
    }
  }, [videoProgress]);

  // Expand the card to full height
  const expandCard = () => {
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

  // Enhanced iOS PanGestureHandler with gesture coordination
  const handleSwipeGesture = (event: any) => {
    if (Platform.OS !== 'ios') return;

    const { state, translationY, velocityY } = event.nativeEvent;

    if (state === State.END) {
      console.log("📱 iOS PanGesture detected", {
        translationY,
        velocityY,
        isCardExpanded,
        platform: Platform.OS
      });

      // iOS-optimized swipe detection with improved sensitivity
      const minDistance = 25; // Reduced from 30 for better responsiveness
      const minVelocity = 400; // Reduced from 500 for better responsiveness

      if (!isCardExpanded &&
          (translationY < -minDistance || velocityY < -minVelocity)) {
        console.log("📱 iOS PanGesture swipe up detected - expanding card", {
          translationY,
          velocityY,
          platform: Platform.OS
        });
        expandCard();
      } else if (isCardExpanded &&
                 (translationY > minDistance || velocityY > minVelocity)) {
        console.log("📱 iOS PanGesture swipe down detected - collapsing card", {
          translationY,
          velocityY,
          platform: Platform.OS
        });
        collapseCard();
      }
    }
  };

  // Continue button handler
  const handleContinue = () => {
    // Track lesson completion in analytics
    trackLessonComplete();

    // Mark lesson as completed in progress context (Adventure 1, Module 1, Lesson 2)
    completeLesson(1, 1, "lesson2");
    console.log("🔄 Continue button pressed - Adventure 1 Module 1 Lesson 2 completed, proceeding to quiz");
    onContinue();
  };

  // Handle marking reading as finished - triggered when user scrolls to bottom
  const handleScrollEnd = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isAtBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 20;

    if (isAtBottom && !hasFinishedReading) {
      console.log('📖 User reached bottom of reading content');
      setHasFinishedReading(true);
    }
  };

  return (
    <>
      {Platform.OS === 'android' && (
        <StatusBar barStyle="dark-content" backgroundColor="#F4EBDB" />
      )}
      <View style={styles.container}>
        {/* Full-screen video player */}
        <LessonPlayer
          videoSource={{ uri: "https://dzyjrzj2lngmg.cloudfront.net/Reel+Videos/Adv1_M1_Reel2.mp4" }}
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
                    outputRange: ['0%', '100%'],
                  })
                },
              ]}
            />
          </View>
        </View>

        {/* Back Button - Top Left */}
        <SafeAreaView style={styles.backButtonContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack || onDismiss}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Next Button - Top Right */}
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

        {/* Reading Card at Bottom - Platform-Specific Gesture Handling */}
        {Platform.OS === 'ios' ? (
          // iOS: Native PanGestureHandler
          <PanGestureHandler
            ref={panGestureRef}
            onGestureEvent={handleSwipeGesture}
            onHandlerStateChange={handleSwipeGesture}
            activeOffsetY={[-15, 15]}
            failOffsetX={[-40, 40]}
            minPointers={1}
            maxPointers={1}
          >
            <Animated.View style={[
            styles.cardContainer,
            {
              transform: [{ translateY: cardTranslateY }]
            }
          ]}>
            <Animated.View style={[
              styles.readingCard,
              {
                height: cardHeight,
              }
            ]}>
            {/* Top handle indicator */}
            <View style={styles.cardHandle} />

            {/* Collapsed content */}
            <Animated.View style={[
              styles.collapsedContent,
              { opacity: cardOpacity }
            ]}>
              <TouchableOpacity
                onPress={expandCard}
                activeOpacity={0.8}
                disabled={isCardExpanded}
              >
                <View style={styles.readingCardHeader}>
                  <Text style={styles.cardTitle}>
                    The Barada River&apos;s Gift
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    Damascus grew quickly under Umayyad rule because of the Barada River...
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>

              {/* Expanded content */}
              {isCardExpanded && (
                <Animated.View style={[
                  styles.expandedContent,
                  { opacity: Animated.subtract(1, cardOpacity) }
                ]}>

                  <GestureHandlerScrollView
                    ref={scrollViewGestureRef}
                    waitFor={Platform.OS === 'ios' ? panGestureRef : undefined}
                    style={styles.expandedScroll}
                    showsVerticalScrollIndicator={false}
                    onScrollEndDrag={handleScrollEnd}
                    onMomentumScrollEnd={handleScrollEnd}
                    scrollEventThrottle={100}
                  >
                    <View style={styles.expandedContentInner}>
                      {/* Title Section - Tappable to collapse */}
                      <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                        <View style={styles.titleSection}>
                          <Text style={styles.sheetTitle}>
                            The Barada River&apos;s Gift
                          </Text>
                          <Text style={styles.sheetSubtitle}>
                            Module 1 • Lesson 2
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
                              term="Barada River"
                              definition="The river from the mountains that people split into canals, also called 'Abana' in the Bible"
                            />
                            <KeyTermRow
                              term="Ghouta Oasis"
                              definition="The green fertile land around Damascus created by the Barada River's canals"
                            />
                            <KeyTermRow
                              term="Canal System"
                              definition="Network of waterways that brought river water to dry land for farming and city life"
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
          <Animated.View style={[
            styles.cardContainer,
            {
              transform: [{ translateY: cardTranslateY }]
            }
          ]}>
            <Animated.View style={[
              styles.readingCard,
              {
                height: cardHeight,
              }
            ]}>
            {/* Top handle indicator */}
            <View style={styles.cardHandle} />

            {/* Collapsed content */}
            <Animated.View style={[
              styles.collapsedContent,
              { opacity: cardOpacity }
            ]}>
              <TouchableOpacity
                onPress={expandCard}
                activeOpacity={0.8}
                disabled={isCardExpanded}
              >
                <View style={styles.collapsedContentWrapper}>
                  <Text style={styles.collapsedTitle}>
                    The Barada River&apos;s Gift
                  </Text>
                  <Text style={styles.collapsedSubtitle}>
                    Damascus grew quickly under Umayyad rule because of the Barada River...
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>

              {/* Expanded content */}
              {isCardExpanded && (
                <Animated.View style={[
                  styles.expandedContent,
                  { opacity: Animated.subtract(1, cardOpacity) }
                ]}>
                  <GestureHandlerScrollView
                    ref={scrollViewGestureRef}
                    style={styles.expandedScroll}
                    showsVerticalScrollIndicator={false}
                    onScrollEndDrag={handleScrollEnd}
                    onMomentumScrollEnd={handleScrollEnd}
                    scrollEventThrottle={100}
                  >
                    <View style={styles.expandedContentInner}>
                      {/* Title Section - Tappable to collapse */}
                      <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                        <View style={styles.titleSection}>
                          <Text style={styles.sheetTitle}>
                            The Barada River&apos;s Gift
                          </Text>
                          <Text style={styles.sheetSubtitle}>
                            Module 1 • Lesson 2
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
                              term="Barada River"
                              definition="The river from the mountains that people split into canals, also called 'Abana' in the Bible"
                            />
                            <KeyTermRow
                              term="Ghouta Oasis"
                              definition="The green fertile land around Damascus created by the Barada River's canals"
                            />
                            <KeyTermRow
                              term="Canal System"
                              definition="Network of waterways that brought river water to dry land for farming and city life"
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

        {/* Hardcoded Walkthrough Hints */}
        {showReadHint && (
          <View style={styles.readHintContainer}>
            <Image
              source={require("@/assets/images/walkthrough/read.svg")}
              style={styles.readHintImage}
              contentFit="contain"
            />
          </View>
        )}

        {showContinueHint && (
          <View style={[styles.continueHintContainer, { top: insets.top + 4 }]}>
            <Image
              source={require("@/assets/images/walkthrough/continue.svg")}
              style={styles.continueHintImage}
              contentFit="contain"
            />
          </View>
        )}
      </View>
    </>
  );
}

// Key Term Row Component
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

  // Collapsed and Expanded content
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
    marginBottom: 8,
  },
  cardSubtitle: {
    fontFamily: "DM Sans",
    fontSize: 14,
    color: "white",
    opacity: 0.8,
    lineHeight: 20,
  },

  // Title section
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

  // Hardcoded walkthrough hints
  readHintContainer: {
    position: "absolute",
    bottom: COLLAPSED_HEIGHT - SCREEN_HEIGHT * 0.01, // Responsive overlap
    alignSelf: "center",
    zIndex: 15,
    pointerEvents: "none",
  },
  readHintImage: {
    width: 180,
    height: 73, // Match 198:80 SVG aspect ratio
  },
  continueHintContainer: {
    position: "absolute",
    right: 66, // 16 (button margin) + 40 (button width) + 10 (spacing)
    zIndex: 25,
    pointerEvents: "none",
  },
  continueHintImage: {
    width: 120,
    height: 48, // Match 120:48 SVG aspect ratio (1.2X)
  },
});