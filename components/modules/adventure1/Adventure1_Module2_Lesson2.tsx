// Adventure1_Module2_Lesson2.tsx - Court & Administration
// Full-screen video lesson with progress bar, reading card, and repositioned controls

import ArchivesTheme from "@/constants/ArchivesTheme";
import { Ionicons } from "@expo/vector-icons";
import { AVPlaybackStatus } from "expo-av";
import * as Haptics from "expo-haptics";
import React, { useRef, useState, useEffect } from "react";
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
import { PanGestureHandler, State, ScrollView as GestureHandlerScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { useProgress } from "@/context/ProgressContext";
import { useLessonTracking } from "@/hooks/useLessonTracking";
import LessonPlayer from "../LessonPlayer";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const COLLAPSED_HEIGHT = 140;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.85;

interface Adventure1_Module2_Lesson2Props {
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void;
}

export default function Adventure1_Module2_Lesson2({
  onContinue,
  onDismiss,
  onBack,
}: Adventure1_Module2_Lesson2Props) {
  // Progress context for lesson completion tracking
  const { completeLesson } = useProgress();

  // Analytics tracking for video and lesson events
  const {
    trackVideoPlay,
    trackVideoPause,
    trackVideoComplete,
    trackCardExpanded,
    trackLessonComplete
  } = useLessonTracking({
    adventureId: 1,
    moduleId: 2,
    lessonId: 'lesson2',
    lessonType: 'video_reading',
    lessonTitle: "The Heart of Government",
    chapterNumber: 2,
    screenUrl: '/adventure/1/module/2/lesson2'
  });

  // Removed isPlaying state - now managed by LessonPlayer using expo-video useEvent
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [wasPlaying, setWasPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [hasFinishedReading, setHasFinishedReading] = useState(true);
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [hasVideoCompleted, setHasVideoCompleted] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [touchStart, setTouchStart] = useState<{y: number, time: number} | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const panGestureRef = useRef(null);
  const scrollViewGestureRef = useRef(null);

  // Animation values for card expansion
  const cardHeight = useRef(new Animated.Value(160)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;
  
  // Animated value for smooth progress bar
  const progressBarWidth = useRef(new Animated.Value(0)).current;
  
  // Track last progress to prevent unnecessary animations
  const lastProgress = useRef(0);

  // Historical text content for Court & Administration
  const historicalText = `Inside the Umayyad court, every job had a clear task. The chief minister, sometimes called a wazir, helped the caliph run daily affairs, and the qadi judged cases using Islamic law. People spoke Arabic, Greek, and Syriac in meetings. In 696 CE, Abd al-Malik ordered government records to shift into Arabic, which made the system more unified.`;




  // Handle video playback status and track progress
  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      if (!isVideoLoaded) {
        setIsVideoLoaded(true);
        console.log(
          "🎬 DEBUG: Adventure1_Module2_Lesson2 video player ready - starting playback"
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
          console.log("🎬 Video completed - triggering card pop animation");
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
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Removed handleTogglePlayback - now handled directly by LessonPlayer

  // Continue button handler
  const handleContinue = () => {
    // Light haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Track lesson completion in analytics
    trackLessonComplete();

    // Mark lesson as completed in progress context
    completeLesson(1, 2, "lesson2");
    console.log("🔄 Continue button pressed - proceeding to Module 2 Quiz");
    onContinue();
  };

  // iOS PanGestureHandler for native iOS gesture experience
  const handleSwipeGesture = (event: any) => {
    if (Platform.OS !== 'ios') return;
    
    if (event.nativeEvent.state === State.END) {
      const { translationY, velocityY } = event.nativeEvent;
      console.log("📱 iOS PanGesture detected", {
        translationY,
        velocityY,
        isCardExpanded,
        platform: Platform.OS
      });
      
      // iOS-optimized swipe detection
      const minDistance = 30;
      const minVelocity = 500;
      
      if (!isCardExpanded && 
          (translationY < -minDistance || velocityY < -minVelocity)) {
        console.log("📱 iOS PanGesture swipe up detected - expanding card", {
          translationY,
          velocityY,
          platform: Platform.OS
        });
        expandCard();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (isCardExpanded && 
                 (translationY > minDistance || velocityY > minVelocity)) {
        console.log("📱 iOS PanGesture swipe down detected - collapsing card", {
          translationY,
          velocityY,
          platform: Platform.OS
        });
        collapseCard();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  // Custom touch handlers for reliable Android swipe detection
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
    
    // Optimized Android swipe detection for smoothness
    const minDistance = 40; // Increased for better gesture recognition
    const maxTime = 300; // Shorter time for more responsive gestures
    const velocity = Math.abs(distance) / time; // Calculate velocity
    const velocityThreshold = 0.5; // Minimum velocity threshold
    
    if (!isCardExpanded && distance > minDistance && time < maxTime && velocity > velocityThreshold) {
      console.log("📖 Android touch swipe up detected - expanding card", {
        distance,
        time,
        velocity: velocity.toFixed(2),
        platform: Platform.OS
      });
      expandCard();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (isCardExpanded && distance < -minDistance && time < maxTime && velocity > velocityThreshold) {
      console.log("📖 Android touch swipe down detected - collapsing card", {
        distance,
        time,
        velocity: velocity.toFixed(2),
        platform: Platform.OS
      });
      collapseCard();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Reset touch start
    setTouchStart(null);
  };

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
      {Platform.OS === 'android' && (
        <StatusBar barStyle="dark-content" backgroundColor="#F4EBDB" />
      )}
      <View style={styles.container}>
        {/* Full-screen video player */}
        <LessonPlayer
          videoSource={{ uri: "https://dzyjrzj2lngmg.cloudfront.net/Reel+Videos/Adv1_M2_Reel1.mp4" }}
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
          <TouchableOpacity style={styles.backButton} onPress={() => {
            (onBack || onDismiss)();
          }}>
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
            activeOffsetY={[-20, 20]}
            failOffsetX={[-30, 30]}
          >
            <Animated.View style={[
              styles.cardContainer,
              {
                transform: [{ translateY: cardTranslateY }]
              }
            ]}>
              {/* iOS Card Content - Use existing structure */}
              <Animated.View style={[
                styles.readingCard,
                {
                  height: cardHeight,
                }
              ]}>
                {/* Top handle indicator */}
                <View style={styles.cardHandle} />

                {/* iOS Collapsed content - existing structure */}
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
                        The Heart of Government
                      </Text>
                      <Text style={styles.cardSubtitle}>
                        Inside the Umayyad court, every job had a clear task...
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>

                {/* Expanded content when card is swiped up */}
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
                        {/* Title Section - Tappable to collapse */}
                        <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                          <View style={styles.titleSection}>
                            <Text style={styles.sheetTitle}>
                              The Heart of Government
                            </Text>
                            <Text style={styles.sheetSubtitle}>
                              Module 2 • Lesson 2
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
                                term="Wazir (Chief Minister)"
                                definition="The minister who helped the caliph run daily affairs of government"
                              />
                              <KeyTermRow
                                term="Qadi"
                                definition="A judge who decided cases using Islamic law in the court system"
                              />
                              <KeyTermRow
                                term="Arabic Records (696 CE)"
                                definition="Abd al-Malik's order to shift government records into Arabic for unity"
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
          // Android: Custom Touch Handlers
          <View 
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
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

                {/* Android Collapsed content with improved styling */}
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
                        The Heart of Government
                      </Text>
                      <Text style={styles.collapsedSubtitle}>
                        Inside the Umayyad court, every job had a clear task...
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>

                {/* Expanded content when card is swiped up */}
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
                    >
                      <View style={styles.expandedContentInner}>
                        {/* Title Section - Tappable to collapse */}
                        <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                          <View style={styles.titleSection}>
                            <Text style={styles.sheetTitle}>
                              The Heart of Government
                            </Text>
                            <Text style={styles.sheetSubtitle}>
                              Module 2 • Lesson 2
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
                                term="Wazir (Chief Minister)"
                                definition="The minister who helped the caliph run daily affairs of government"
                              />
                              <KeyTermRow
                                term="Qadi"
                                definition="A judge who decided cases using Islamic law in the court system"
                              />
                              <KeyTermRow
                                term="Arabic Records (696 CE)"
                                definition="Abd al-Malik's order to shift government records into Arabic for unity"
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

  // Android-Specific Styles for proper text positioning
  collapsedContentWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 25,
    marginTop: -15, // Move text content up slightly
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
});