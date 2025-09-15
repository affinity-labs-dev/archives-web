// Adventure4_Module2_Lesson2.tsx - Illuminated Manuscripts & Scribes Carousel
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
// import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const COLLAPSED_HEIGHT = 140;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.85;

interface Adventure4_Module2_Lesson2Props {
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void;
}

export default function Adventure4_Module2_Lesson2({
  onContinue,
  onDismiss,
  onBack,
}: Adventure4_Module2_Lesson2Props) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [showReadContent, setShowReadContent] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [touchStart, setTouchStart] = useState<{y: number, time: number} | null>(null);
  const [isCardGestureActive, setIsCardGestureActive] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const panGestureRef = useRef(null);
  const scrollViewGestureRef = useRef(null);

  // Animation values for card expansion
  const cardHeight = useRef(new Animated.Value(160)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;

  // Background music - commented out for now to prevent errors
  // const { playBackgroundMusic, stopBackgroundMusic } = useBackgroundMusic();

  // Manuscript & Scribes carousel data - using placeholder assets for now
  const palaceInteriors = [
    {
      id: 1,
      imageUrl: require('@/assets/images/lesson-content/Reader.png'),
      title: "Scribes at Work",
      caption: "An Umayyad scribe at work in a quiet library. Copying texts by candlelight, surrounded by scrolls, ink, and gold pigment",
    },
    {
      id: 2,
      imageUrl: require('@/assets/images/lesson-content/map.png'),
      title: "Scribe's Tools",
      caption: "A scribe&apos;s desk in an Umayyad library - tools of the trade laid out in candlelight: reed pens, pigments, ink, and parchment",
    },
    {
      id: 3,
      imageUrl: require('@/assets/images/quiz-images/Bilingual.png'),
      title: "Manuscript Pages",
      caption: "Half-finished Qur'anic pages in Kufic script dry on wooden racks",
    },
  ];

  // Historical text content for Illuminated Manuscripts
  const historicalText = `Illuminated manuscripts weren't made quickly - they took time, patience, and deep respect. Scribes trained for years to master every curve of the letters. They mixed gold into paint, carefully applied borders, and copied each page by hand. These books weren't just for reading - they were made to last, to be passed on, and to reflect the beauty of the words inside.`;

  useEffect(() => {
    console.log("🎵 Adventure4_Module2_Lesson2 mounted - starting background music");
    // playBackgroundMusic("https://www.udio.com/songs/o1pEeKwpBrSxqhcorwdgof");

    return () => {
      console.log("🎵 Adventure4_Module2_Lesson2 unmounting - stopping background music");
      // stopBackgroundMusic();
    };
  }, []);

  // Handle horizontal scroll for image tracking
  const handleScroll = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    const imageIndex = Math.round(contentOffset.x / SCREEN_WIDTH);

    if (imageIndex !== currentImageIndex && imageIndex >= 0 && imageIndex < palaceInteriors.length) {
      setCurrentImageIndex(imageIndex);
      console.log("📱 Image changed to:", imageIndex + 1);
    }
  };

  // Navigate to next image (Swipe button functionality)
  const handleSwipeNext = () => {
    if (currentImageIndex < palaceInteriors.length - 1) {
      const nextIndex = currentImageIndex + 1;
      scrollViewRef.current?.scrollTo({ x: nextIndex * SCREEN_WIDTH, animated: true });
      setCurrentImageIndex(nextIndex);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Enhanced iOS PanGestureHandler with gesture coordination
  const handleSwipeGesture = (event: any) => {
    if (Platform.OS !== 'ios') return;

    const { state, translationY, velocityY } = event.nativeEvent;

    // Track gesture activity for carousel coordination
    if (state === State.BEGAN || state === State.ACTIVE) {
      setIsCardGestureActive(true);
      console.log("📱 iOS card gesture started - blocking carousel");
    } else if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      setIsCardGestureActive(false);
      console.log("📱 iOS card gesture ended - allowing carousel");
    }

    if (state === State.END) {
      console.log("📱 iOS PanGesture detected", {
        translationY,
        velocityY,
        isCardExpanded,
        platform: Platform.OS
      });

      // Improved iOS swipe detection with better sensitivity
      const minDistance = 20; // Reduced from 30 for better responsiveness
      const minVelocity = 300; // Reduced from 500 for easier activation

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

  // Enhanced Android touch handlers with improved sensitivity
  const handleTouchStart = (event: any) => {
    setTouchStart({
      y: event.nativeEvent.pageY,
      time: Date.now()
    });
    setIsCardGestureActive(true);
    console.log("📖 Android card gesture started - blocking carousel");
  };

  const handleTouchEnd = (event: any) => {
    setIsCardGestureActive(false);
    console.log("📖 Android card gesture ended - allowing carousel");

    if (!touchStart) return;

    const touchEnd = event.nativeEvent.pageY;
    const distance = touchStart.y - touchEnd; // Positive = swipe up
    const time = Date.now() - touchStart.time;

    // Improved Android swipe detection with better sensitivity
    const minDistance = 25; // Reduced from 40 for better responsiveness
    const maxTime = 400; // Increased from 300 for easier activation
    const velocity = Math.abs(distance) / time; // Calculate velocity
    const velocityThreshold = 0.3; // Reduced from 0.5 for easier activation

    console.log("📖 Android gesture analysis:", {
      distance,
      time,
      velocity: velocity.toFixed(2),
      minDistance,
      maxTime,
      velocityThreshold,
      meetsDistanceRequirement: Math.abs(distance) > minDistance,
      meetsTimeRequirement: time < maxTime,
      meetsVelocityRequirement: velocity > velocityThreshold
    });

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
    } else {
      console.log("📖 Android gesture rejected - requirements not met");
    }

    // Reset touch start
    setTouchStart(null);
  };

  // Expand the card to full height
  const expandCard = () => {
    setIsCardExpanded(true);
    setShowReadContent(true);

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
    setShowReadContent(false);

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

  // Page indicators - only show when card is not expanded
  const renderPageIndicators = () => (
    !isCardExpanded && (
      <View style={styles.pageIndicatorsOnly}>
        {palaceInteriors.map((_, index) => (
          <View
            key={index}
            style={[
              styles.pageIndicator,
              currentImageIndex === index && styles.pageIndicatorActive
            ]}
          />
        ))}
      </View>
    )
  );

  return (
    <>
      {Platform.OS === 'android' && (
        <StatusBar barStyle="dark-content" backgroundColor="#F4EBDB" />
      )}
      <View style={styles.container}>
        {/* Main carousel - full screen TabView equivalent */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEnabled={!isCardGestureActive} // Disable carousel when card gesture is active
          style={styles.carousel}
        >
          {palaceInteriors.map((interior, index) => (
            <View key={interior.id} style={styles.imageContainer}>
              {/* Full screen manuscript image */}
              <Image
                source={interior.imageUrl}
                style={styles.palaceImage}
                resizeMode="cover"
              />

              {/* Text overlay with descriptive caption */}
              <View style={styles.textOverlay}>
                <Text style={styles.captionText}>
                  {interior.caption}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Page indicator dots - centered */}
        {renderPageIndicators()}

        {/* Back Button - Top Left */}
        <SafeAreaView style={styles.backButtonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => {
            (onBack || onDismiss)();
          }}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Continue Button - Top Right (only active on final image) */}
        <SafeAreaView style={styles.continueButtonContainer}>
          <TouchableOpacity
            style={[
              styles.topContinueButton,
              currentImageIndex !== palaceInteriors.length - 1 && styles.topContinueButtonDisabled
            ]}
            onPress={currentImageIndex === palaceInteriors.length - 1 ? () => {
              // Stop all audio before continuing (no await for instant navigation)
              // if (backgroundMusic.isPlaying) {
              //   console.log('🎵 Stopping background music before continue');
              //   backgroundMusic.stop(); // Remove await for instant navigation
              // }

              onContinue();
            } : undefined}
            disabled={currentImageIndex !== palaceInteriors.length - 1}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={currentImageIndex === palaceInteriors.length - 1 ? "white" : "#666"}
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
                      Illuminated Manuscripts & Scribes
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      Illuminated manuscripts weren&apos;t made quickly - they took time, patience...
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
                            Palace Life & Architecture
                          </Text>
                          <Text style={styles.sheetSubtitle}>
                            Module 2 • Lesson 2
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
                              term="Courtyard Gardens"
                              definition="Central palace spaces with fountains, palm trees, and shaded walkways for relaxation"
                            />
                            <KeyTermRow
                              term="Water Channels"
                              definition="Clever underground systems that carried fresh water to fountains and gardens"
                            />
                            <KeyTermRow
                              term="Hunting Grounds"
                              definition="Desert areas around palaces where caliphs and nobles practiced falconry and hunting"
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
                      Illuminated Manuscripts & Scribes
                    </Text>
                    <Text style={styles.collapsedSubtitle}>
                      Illuminated manuscripts weren&apos;t made quickly - they took time, patience...
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
                            Palace Life & Architecture
                          </Text>
                          <Text style={styles.sheetSubtitle}>
                            Module 2 • Lesson 2
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
                              term="Courtyard Gardens"
                              definition="Central palace spaces with fountains, palm trees, and shaded walkways for relaxation"
                            />
                            <KeyTermRow
                              term="Water Channels"
                              definition="Clever underground systems that carried fresh water to fountains and gardens"
                            />
                            <KeyTermRow
                              term="Hunting Grounds"
                              definition="Desert areas around palaces where caliphs and nobles practiced falconry and hunting"
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
    backgroundColor: 'black',
  },

  // Main carousel - full screen
  carousel: {
    flex: 1,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'relative',
    justifyContent: 'center',    // Center vertically
    alignItems: 'center',        // Center horizontally
    backgroundColor: 'black',    // Ensure no white gaps
    overflow: 'hidden',          // Prevent any content from spilling out
  },
  palaceImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'absolute',        // Absolute positioning for perfect centering
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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

  // Page indicators only - centered without buttons
  pageIndicatorsOnly: {
    position: 'absolute',
    bottom: 180, // Position above the reading card
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  pageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)', // 60% opacity for inactive dots
    marginHorizontal: 4,
  },
  pageIndicatorActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // 90% opacity for active dot
    transform: [{ scale: 1.2 }],
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

  // Continue Button - Top Right
  continueButtonContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 20,
    paddingTop: 8,
    paddingRight: 16,
  },
  topContinueButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ArchivesTheme.colors.mossGreen,
    justifyContent: "center",
    alignItems: "center",
  },

  topContinueButtonDisabled: {
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