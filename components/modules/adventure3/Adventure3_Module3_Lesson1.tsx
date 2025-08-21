// Adventure3_Module3_Lesson1.tsx - EXACT replica of Adventure1_Module1_Lesson1 structure
// Full-screen video lesson with expandable reading card and progress tracking

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
} from "react-native";
import { PanGestureHandler, State, ScrollView as GestureHandlerScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import LessonPlayer from "../LessonPlayer";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const COLLAPSED_HEIGHT = 140;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.85;

interface Adventure3_Module3_Lesson1Props {
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void;
}

export default function Adventure3_Module3_Lesson1({
  onContinue,
  onDismiss,
  onBack,
}: Adventure3_Module3_Lesson1Props) {
  // Removed isPlaying state - now managed by LessonPlayer using expo-video useEvent
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [hasFinishedReading, setHasFinishedReading] = useState(false);
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [hasVideoCompleted, setHasVideoCompleted] = useState(false);
  const [scrollY, setScrollY] = useState(0);
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

  // EXACT Adventure3_Module3_Lesson1 historicalText content for Battle of Tours
  const historicalText = `In 732 CE, the Umayyad army met the Frankish forces led by Charles Martel near the city of Tours. It was a tough battle. After days of fighting, the Umayyads withdrew, and Martel's victory became a major moment in European history. While the battle didn't end Muslim rule in Spain, it stopped their advance into northern Europe - a turning point that shaped the future of the continent.`;






  // Handle video playback status and track progress
  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      if (!isVideoLoaded) {
        setIsVideoLoaded(true);
        console.log(
          "🎬 DEBUG: Adventure3_Module3_Lesson1 video player ready - starting playback"
        );
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


    console.log("🔄 Continue button pressed - proceeding to lesson 2");
    onContinue();
  };

  // Handle swipe gestures to expand/collapse the card with smart priority
  const handleSwipeGesture = (event: any) => {
    const { translationY, velocityY, state } = event.nativeEvent;

    // Detect gesture when it ends
    if (state === State.END || state === State.CANCELLED) {
      if (!isCardExpanded) {
        // Card is collapsed - swipe up to expand
        if (translationY < -30 || velocityY < -300) {
          console.log("📖 Reading card swiped up - expanding card", {
            translationY,
            velocityY,
          });
          expandCard();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } else {
        // Card is expanded - intelligent swipe down detection
        const shouldCloseCard = 
          // Fast downward swipe (strong intent to close)
          (velocityY > 800) ||
          // Medium swipe with good distance
          (translationY > 50 && velocityY > 400) ||
          // Swipe down when at top of scroll content
          (scrollY <= 10 && translationY > 30 && velocityY > 200);
        
        if (shouldCloseCard) {
          console.log("📖 Reading card swiped down - collapsing card", {
            translationY,
            velocityY,
            scrollY,
          });
          collapseCard();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    }
  };

  // Expand the card to full height
  const expandCard = () => {
    setIsCardExpanded(true);
    
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
      <StatusBar barStyle="light-content" backgroundColor="black" />
      <View style={styles.container}>
        {/* Full-screen video player */}
        <LessonPlayer
          videoSource={{ uri: "https://dzyjrzj2lngmg.cloudfront.net/Reel+Videos/Adv3_M3_Reel1.mp4" }}
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

        {/* Reading Card at Bottom - Expandable */}
        <PanGestureHandler 
          ref={panGestureRef}
          onHandlerStateChange={handleSwipeGesture}
          simultaneousHandlers={scrollViewGestureRef}
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
              <View style={styles.readingCardHeader}>
                <Text style={styles.cardTitle}>
                  Battle of Tours (732 CE)
                </Text>
                <Text style={styles.cardSubtitle}>
                  In 732 CE, the Umayyad army met the Frankish forces...
                </Text>
              </View>
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
                    {/* Title Section */}
                    <View style={styles.titleSection}>
                      <Text style={styles.sheetTitle}>
                        Battle of Tours (732 CE)
                      </Text>
                      <Text style={styles.sheetSubtitle}>
                        Module 3 • Lesson 1
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
                          term="Charles Martel"
                          definition="Frankish leader at Tours, nicknamed 'The Hammer'"
                        />
                        <KeyTermRow
                          term="Battle of Tours (732 CE)"
                          definition="Decisive battle marking the limit of Umayyad expansion into Europe"
                        />
                        <KeyTermRow
                          term="Abdul Rahman Al-Ghafiqi"
                          definition="Umayyad commander who led forces at Tours"
                        />
                      </View>
                    </View>

                    {/* Bottom spacer to ensure full scroll */}
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

// Key Term Row Component - EXACT Adventure1_Module1_Lesson1: keyTermRow(term:definition:)
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
});