// Adventure2_Module1_Lesson2.tsx - Administrative Revolution Video Lesson
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
const COLLAPSED_HEIGHT = 160;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.85;

interface Adventure2_Module1_Lesson2Props {
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void;
}

export default function Adventure2_Module1_Lesson2({
  onContinue,
  onDismiss,
  onBack,
}: Adventure2_Module1_Lesson2Props) {
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
    adventureId: 2,
    moduleId: 1,
    lessonId: 'lesson2',
    lessonType: 'video_reading',
    lessonTitle: "The Umayyad Administrative Revolution",
    chapterNumber: 1,
    screenUrl: '/adventure/2/module/1/lesson2'
  });

  // Removed isPlaying state - now managed by LessonPlayer using expo-video useEvent
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [wasPlaying, setWasPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [hasFinishedReading, setHasFinishedReading] = useState(false);
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




  // EXACT historical text content
  const historicalText = `Switching to Arabic was not simple. Some governors resisted, afraid it would upset their control or slow the work of government. Soon, though, new scribes were trained in Arabic, and the diwān, or government office, fully adopted it. This was more than a change in paperwork, as Arabic grew into the shared language of law, trade, and empire across the Islamic world.`;

  // Handle video playback status and track progress
  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      if (!isVideoLoaded) {
        setIsVideoLoaded(true);
        console.log(
          "🎬 DEBUG: Adventure2_Module1_Lesson2 video player ready - starting playback"
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

  // Continue button handler - only works if reading is finished
  const handleContinue = () => {
    if (!hasFinishedReading) {
      console.log("🔄 Continue button pressed but reading not finished");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    // Track lesson completion in analytics
    trackLessonComplete();

    // Mark lesson as completed in progress context
    completeLesson(2, 1, "lesson2");
    console.log("🔄 Continue button pressed - proceeding to quiz");
    onContinue();
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

  // Expand the card to full height
  const expandCard = () => {
    setIsCardExpanded(true);

    // Track reading card expansion in analytics
    trackCardExpanded();

    // Activate continue button when user expands card (shows engagement with content)
    if (!hasFinishedReading) {
      setHasFinishedReading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
          videoSource={{ uri: "https://dzyjrzj2lngmg.cloudfront.net/Reel+Videos/Adv2_M1_Reel1.mp4" }}
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
          <TouchableOpacity style={styles.backButton} onPress={onBack || onDismiss}>
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

        {/* Reading Card at Bottom - Expandable */}
        {Platform.OS === 'ios' ? (
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
              {Platform.OS === 'ios' ? (
                <TouchableOpacity
                  onPress={expandCard}
                  activeOpacity={0.8}
                  disabled={isCardExpanded}
                >
                  <View style={styles.readingCardHeader}>
                    <Text style={styles.cardTitle}>
                      The Umayyad Administrative Revolution
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      Switching to Arabic was not simple. Some governors resisted...
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={expandCard}
                  activeOpacity={0.8}
                  disabled={isCardExpanded}
                >
                  <View style={styles.collapsedContentWrapper}>
                    <Text style={styles.collapsedTitle}>
                      The Umayyad Administrative Revolution
                    </Text>
                    <Text style={styles.collapsedSubtitle}>
                      Switching to Arabic was not simple. Some governors resisted...
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </Animated.View>

            {/* Expanded content */}
            {isCardExpanded && (
              <Animated.View style={[
                styles.expandedContent,
                { opacity: Animated.subtract(1, cardOpacity) }
              ]}>

                <GestureHandlerScrollView
                  ref={scrollViewGestureRef}
                  waitFor={panGestureRef}
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
                          The Umayyad Administrative Revolution
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
                            term="Diw\u0101n"
                            definition="Government office that fully adopted Arabic as its working language"
                          />
                          <KeyTermRow
                            term="Governor Resistance"
                            definition="Some governors opposed the Arabic switch, fearing loss of control"
                          />
                          <KeyTermRow
                            term="Scribe Training"
                            definition="New scribes were trained in Arabic to staff the changing government offices"
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

            {/* Collapsed content */}
            <Animated.View style={[
              styles.collapsedContent,
              { opacity: cardOpacity }
            ]}>
              {Platform.OS === 'ios' ? (
                <TouchableOpacity
                  onPress={expandCard}
                  activeOpacity={0.8}
                  disabled={isCardExpanded}
                >
                  <View style={styles.readingCardHeader}>
                    <Text style={styles.cardTitle}>
                      The Umayyad Administrative Revolution
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      Building an empire required more than conquest...
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={expandCard}
                  activeOpacity={0.8}
                  disabled={isCardExpanded}
                >
                  <View style={styles.readingCardHeader}>
                    <Text style={styles.cardTitle}>
                      The Umayyad Administrative Revolution
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      Building an empire required more than conquest...
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </Animated.View>

            {/* Expanded content */}
            {isCardExpanded && (
              <Animated.View style={[
                styles.expandedContent,
                { opacity: Animated.subtract(1, cardOpacity) }
              ]}>
                <GestureHandlerScrollView
                  ref={scrollViewGestureRef}
                  waitFor={panGestureRef}
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
                          The Umayyad Administrative Revolution
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
                            term="Diwan al-Kharaj"
                            definition="The tax administration system that revolutionized Umayyad governance"
                          />
                          <KeyTermRow
                            term="Abd al-Malik"
                            definition="Caliph who standardized currency and Arabic as administrative language"
                          />
                          <KeyTermRow
                            term="Administrative Arabization"
                            definition="Process of making Arabic the official language of government"
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
    lineHeight: 20,
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

  // Collapsed card text styles (for Android touch version)
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