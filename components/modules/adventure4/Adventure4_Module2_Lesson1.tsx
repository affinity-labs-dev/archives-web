// Adventure4_Module2_Lesson1.tsx - Desert Palaces (Qasr al-Hayr)
// Full-screen carousel with expandable reading card - EXACT Adventure1_Module2_Lesson1 pattern

import ArchivesTheme from "@/constants/ArchivesTheme";
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
import { PanGestureHandler, State, ScrollView as GestureHandlerScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const COLLAPSED_HEIGHT = 140;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.85;

interface Adventure4_Module2_Lesson1Props {
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void;
}

export default function Adventure4_Module2_Lesson1({
  onContinue,
  onDismiss,
  onBack,
}: Adventure4_Module2_Lesson1Props) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  // Removed hasFinishedReading - using currentPageIndex for continue button logic like Adventure1
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [touchStart, setTouchStart] = useState<{y: number, time: number} | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const panGestureRef = useRef(null);
  const scrollViewGestureRef = useRef(null);

  // Animation values for card expansion
  const cardHeight = useRef(new Animated.Value(160)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;

  // Background music hook - AWS CloudFront
  const backgroundMusic = useBackgroundMusic(
    { uri: "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv4_M2_L1.mp3" },
    {
      volume: 0.5,
      shouldLoop: true,
    }
  );

  // Desert Palaces carousel data - Using AWS CloudFront URLs
  const carouselData = [
    {
      id: 1,
      imageUrl: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M2_Img01.jpg",
      title: "Desert Palace Location", // Not displayed on image overlay
      caption: "In the middle of the Syrian desert, the Umayyads built desert palaces like Qasr al-Hayr - calm retreats far from the crowded cities.",
    },
    {
      id: 2,
      imageUrl: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M2_Img02.jpg",
      title: "Palace Life", // Not displayed on image overlay
      caption: "These weren't just places to relax. They were hunting lodges, rest stops for caravans, and centers of rural life.",
    },
    {
      id: 3,
      imageUrl: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv4_M2_Img03.jpg",
      title: "Garden Oasis", // Not displayed on image overlay
      caption: "The walls were decorated with stucco designs, and cool water flowed through pools and channels to beat the desert heat.",
    },
  ];

  // Historical text content for Desert Palaces
  const historicalText = `The Umayyad desert palaces, or "qusur," represented a unique fusion of luxury and frontier governance. Built in the Syrian desert between 660-750 CE, these magnificent complexes like Qasr al-Hayr al-Gharbi and Qasr al-Hayr al-Sharqi served multiple purposes: administrative centers, hunting lodges, agricultural experiments, and symbols of caliphal power. The palaces featured advanced water management systems, elaborate bathhouses, intricate mosaics, and enclosed hunting parks called "hima." They allowed the Umayyad rulers to maintain control over trade routes while enjoying the traditional Bedouin lifestyle that remained central to their identity.`;

  // Enhanced debug logging for background music
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🎵 [${timestamp}] Adventure4_Module2_Lesson1 - Background music state:`, {
      isLoaded: backgroundMusic.isLoaded,
      isPlaying: backgroundMusic.isPlaying,
      isLoading: backgroundMusic.isLoading || false,
      platform: Platform.OS
    });

    if (!backgroundMusic.isLoaded && !(backgroundMusic.isLoading)) {
      console.log('🎵 Audio not loading - AWS CloudFront source should be available');
      console.log('🎵 AWS CloudFront Audio URL: https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv4_M2_L1.mp3');
    }
  }, [backgroundMusic.isLoaded, backgroundMusic.isPlaying]);

  // Component mount logging
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log('🎵 Adventure4_Module2_Lesson1 component mounted at:', timestamp);
  }, []);

  // Cleanup background music when component unmounts
  useEffect(() => {
    return () => {
      console.log('🎵 Component unmounting - cleaning up all audio');

      if (backgroundMusic.stop) {
        console.log('🎵 Stopping background music on component unmount');
        backgroundMusic.stop();
      }
    };
  }, []);

  // Handle horizontal scroll for page tracking
  const handleScroll = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    const pageIndex = Math.round(contentOffset.x / SCREEN_WIDTH);

    if (pageIndex !== currentPageIndex && pageIndex >= 0 && pageIndex < carouselData.length) {
      setCurrentPageIndex(pageIndex);
      console.log("📱 Page changed to:", pageIndex + 1);
    }
  };

  // Continue button handler - only works when user reaches last image (Adventure1 pattern)
  const handleContinue = () => {
    if (currentPageIndex !== carouselData.length - 1) {
      console.log("🔄 Continue button pressed but not on last image");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    console.log("🔄 Continue button pressed - proceeding to Adventure4_Module2_Lesson2");
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

    // Just expand the card - continue button logic now based on image position
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log("📖 Reading card expanded");

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

  // Page indicators
  const renderPageIndicators = () => (
    <View style={styles.pageIndicators}>
      {carouselData.map((_, index) => (
        <View
          key={index}
          style={[
            styles.pageIndicator,
            currentPageIndex === index && styles.pageIndicatorActive,
          ]}
        />
      ))}
    </View>
  );

  return (
    <>
      {Platform.OS === 'android' && (
        <StatusBar barStyle="dark-content" backgroundColor="#F4EBDB" />
      )}
      <View style={styles.container}>
        {/* Full-screen horizontal carousel */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={false}
          style={styles.carousel}
        >
          {carouselData.map((item, index) => (
            <View key={item.id} style={styles.carouselPage}>
              <Image source={{ uri: item.imageUrl }} style={styles.carouselImage} />

              {/* Text overlay with descriptive caption */}
              <View style={styles.textOverlay}>
                <Text style={styles.captionText}>
                  {item.caption}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Page indicators */}
        {renderPageIndicators()}

        {/* Back Button - Top Left */}
        <SafeAreaView style={styles.backButtonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => {
            if (backgroundMusic.isPlaying) {
              console.log('🎵 Stopping background music on back button');
              backgroundMusic.stop();
            }

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
              currentPageIndex !== carouselData.length - 1 && styles.nextButtonDisabled
            ]}
            onPress={currentPageIndex === carouselData.length - 1 ? handleContinue : undefined}
            disabled={currentPageIndex !== carouselData.length - 1}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={currentPageIndex === carouselData.length - 1 ? "white" : "#666"}
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
              <Animated.View style={[
                styles.readingCard,
                {
                  height: cardHeight,
                }
              ]}>
                {/* Top handle indicator */}
                <View style={styles.cardHandle} />

                {/* iOS Collapsed content */}
                <Animated.View style={[
                  styles.collapsedContent,
                  { opacity: cardOpacity }
                ]}>
                  <View style={styles.readingCardHeader}>
                    <Text style={styles.cardTitle}>
                      Desert Palaces of the Umayyads
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      The Umayyad desert palaces represented a unique fusion of luxury and frontier governance...
                    </Text>
                  </View>
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
                        {/* Title Section */}
                        <View style={styles.titleSection}>
                          <Text style={styles.sheetTitle}>
                            Desert Palaces of the Umayyads
                          </Text>
                          <Text style={styles.sheetSubtitle}>
                            Module 2 • Lesson 1
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
                              term="Qusur (Desert Palaces)"
                              definition="Magnificent palace complexes built in the Syrian desert as centers of power and luxury"
                            />
                            <KeyTermRow
                              term="Qasr al-Hayr al-Gharbi"
                              definition="The western desert palace built around 727 CE with intricate mosaics and bathhouses"
                            />
                            <KeyTermRow
                              term="Hima (Hunting Parks)"
                              definition="Enclosed hunting grounds within the palace complexes for royal recreation"
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
                  <View style={styles.collapsedContentWrapper}>
                    <Text style={styles.collapsedTitle}>
                      Desert Palaces of the Umayyads
                    </Text>
                    <Text style={styles.collapsedSubtitle}>
                      The Umayyad desert palaces represented a unique fusion of luxury and frontier governance...
                    </Text>
                  </View>
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
                        {/* Title Section */}
                        <View style={styles.titleSection}>
                          <Text style={styles.sheetTitle}>
                            Desert Palaces of the Umayyads
                          </Text>
                          <Text style={styles.sheetSubtitle}>
                            Module 2 • Lesson 1
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
                              term="Qusur (Desert Palaces)"
                              definition="Magnificent palace complexes built in the Syrian desert as centers of power and luxury"
                            />
                            <KeyTermRow
                              term="Qasr al-Hayr al-Gharbi"
                              definition="The western desert palace built around 727 CE with intricate mosaics and bathhouses"
                            />
                            <KeyTermRow
                              term="Hima (Hunting Parks)"
                              definition="Enclosed hunting grounds within the palace complexes for royal recreation"
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
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },

  // Full-screen carousel
  carousel: {
    flex: 1,
  },
  carouselPage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'relative',
    justifyContent: 'center',    // Center vertically
    alignItems: 'center',        // Center horizontally
    backgroundColor: 'black',    // Ensure no white gaps
    overflow: 'hidden',          // Prevent any content from spilling out
  },
  carouselImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'absolute',        // Absolute positioning for perfect centering
    resizeMode: "cover",
  },

  // Text overlay at top - matching Adventure1 design exactly
  textOverlay: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  captionText: {
    fontFamily: 'DM Sans',
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    lineHeight: 26,
    textShadowColor: 'black',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // Page indicators
  pageIndicators: {
    position: "absolute",
    bottom: 170,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  pageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.4)",
    marginHorizontal: 4,
  },
  pageIndicatorActive: {
    backgroundColor: "white",
    width: 12,
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
    backgroundColor: ArchivesTheme.colors.mossGreen,
    justifyContent: "center",
    alignItems: "center",
  },
  nextButtonDisabled: {
    backgroundColor: "rgba(0,0,0,0.3)",
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