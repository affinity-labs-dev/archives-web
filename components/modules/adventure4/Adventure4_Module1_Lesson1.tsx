// Adventure4_Module1_Lesson1.tsx - Great Mosque of Damascus Mosaics Carousel
// Full-screen TabView carousel showing Byzantine mosaic images

import ArchivesTheme from "@/constants/ArchivesTheme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState, useEffect } from "react";
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
import {
  ScrollView as GestureHandlerScrollView,
  PanGestureHandler,
  State
} from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Adventure4_Module1_Lesson1Props {
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void;
}

// Mosque mosaic data with external URLs from user content
const mosqueMosaics = [
  {
    id: 1,
    imageUrl: "https://i.redd.it/q2ejnqxg69f61.jpg",
    title: "The Umayyad Mosque Today",
    caption: "The Great Mosque of Damascus is one of the oldest and most beautiful in the world - and its walls sparkle with Byzantine-made mosaics."
  },
  {
    id: 2,
    imageUrl: "https://farahmahbub.com/wp-content/uploads/2022/03/Umayyad-Mosque_01-scaled.jpg",
    title: "The Umayyad Mosque Today",
    caption: "These weren&apos;t pictures of people or battles. Instead, they showed peaceful imaginary landscapes filled with trees, palaces, and flowing water."
  },
  {
    id: 3,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/The_Great_Umayyed_Mosque_of_Damascus%2C_Syria_western_portico%2C_mosaic_depicting_a_continuous_landscape.jpg/1200px-The_Great_Umayyed_Mosque_of_Damascus%2C_Syria_western_portico%2C_mosaic_depicting_a_continuous_landscape.jpg",
    title: "Mosaic on the Umayyad Mosque",
    caption: "These dreamlike scenes reminded worshippers of paradise, creating a calm and sacred feeling inside the mosque."
  }
];

export default function Adventure4_Module1_Lesson1({
  onContinue,
  onDismiss,
  onBack,
}: Adventure4_Module1_Lesson1Props) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showReadContent, setShowReadContent] = useState(false);
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [touchStart, setTouchStart] = useState<{y: number, time: number} | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollViewGestureRef = useRef(null);
  const panGestureRef = useRef(null);
  const [isCardGestureActive, setIsCardGestureActive] = useState(false);

  // Animation values for card expansion
  const cardHeight = useRef(new Animated.Value(160)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;

  // Background music hook - Using provided Udio link
  const backgroundMusic = useBackgroundMusic(
    { uri: "https://www.udio.com/songs/ecJUifKdtKqz5idU5DbkT3?utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing" },
    {
      volume: 0.5,
      shouldLoop: true,
    }
  );

  // Enhanced debug logging for background music
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🎵 [${timestamp}] Adventure4_Module1_Lesson1 - Background music state:`, {
      isLoaded: backgroundMusic.isLoaded,
      isPlaying: backgroundMusic.isPlaying,
      isLoading: backgroundMusic.isLoading || false,
      platform: Platform.OS
    });

    if (!backgroundMusic.isLoaded && !(backgroundMusic.isLoading)) {
      console.log('🎵 Audio not loading - Udio source should be available');
      console.log('🎵 Udio Audio URL: https://www.udio.com/songs/ecJUifKdtKqz5idU5DbkT3');
    }
  }, [backgroundMusic.isLoaded, backgroundMusic.isPlaying]);

  // Component mount logging
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log('🎵 Adventure4_Module1_Lesson1 component mounted at:', timestamp);
  }, []);

  // Handle carousel scroll - matching iOS TabView behavior
  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const imageIndex = Math.round(contentOffsetX / SCREEN_WIDTH);

    if (imageIndex !== currentImageIndex) {
      setCurrentImageIndex(imageIndex);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Simple status logging
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    if (backgroundMusic.isLoaded && backgroundMusic.isPlaying) {
      console.log(`🎵 [${timestamp}] Background music auto-playing successfully`);
    } else if (backgroundMusic.isLoaded && !backgroundMusic.isPlaying) {
      console.log(`🎵 [${timestamp}] Background music loaded but not playing`);
    } else {
      console.log(`🎵 [${timestamp}] Background music not loaded yet`);
    }
  }, [backgroundMusic.isLoaded, backgroundMusic.isPlaying]);

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

  // Navigate to next image (Swipe button functionality)
  const handleSwipeNext = () => {
    if (currentImageIndex < mosqueMosaics.length - 1) {
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

      const minDistance = 20;
      const minVelocity = 300;

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

  // Enhanced Android touch handlers
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
    const distance = touchStart.y - touchEnd;
    const time = Date.now() - touchStart.time;

    const minDistance = 25;
    const maxTime = 400;
    const velocity = Math.abs(distance) / time;
    const velocityThreshold = 0.3;

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

  // Handle reading scroll
  const handleReadingScroll = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    setScrollY(contentOffset.y);
  };

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
          scrollEnabled={!isCardGestureActive}
          style={styles.carousel}
        >
          {mosqueMosaics.map((mosaic, index) => (
            <View key={mosaic.id} style={styles.imageContainer}>
              {/* Full screen mosque mosaic image */}
              <Image
                source={{ uri: mosaic.imageUrl }}
                style={styles.mosaicImage}
                resizeMode="cover"
              />

              {/* Text overlay with descriptive caption */}
              <View style={styles.textOverlay}>
                <Text style={styles.captionText}>
                  {mosaic.caption}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

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

        {/* Continue Button - Top Right (only active on final image) */}
        <SafeAreaView style={styles.continueButtonContainer}>
          <TouchableOpacity
            style={[
              styles.topContinueButton,
              currentImageIndex !== mosqueMosaics.length - 1 && styles.topContinueButtonDisabled
            ]}
            onPress={currentImageIndex === mosqueMosaics.length - 1 ? () => {
              if (backgroundMusic.isPlaying) {
                console.log('🎵 Stopping background music before continue');
                backgroundMusic.stop();
              }

              onContinue();
            } : undefined}
            disabled={currentImageIndex !== mosqueMosaics.length - 1}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={currentImageIndex === mosqueMosaics.length - 1 ? "white" : "#666"}
            />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Page indicator dots - centered */}
        {!isCardExpanded && (
          <View style={styles.pageIndicatorsOnly}>
            {mosqueMosaics.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.pageIndicator,
                  currentImageIndex === index && styles.pageIndicatorActive
                ]}
              />
            ))}
          </View>
        )}

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

                {/* iOS Collapsed content */}
                <Animated.View style={[
                  styles.collapsedContent,
                  { opacity: cardOpacity }
                ]}>
                  <View style={styles.readingCardHeader}>
                    <Text style={styles.cardTitle}>
                      Great Mosque of Damascus Mosaics
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      Marvel at shimmering landscapes made of tiny tiles...
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
                      simultaneousHandlers={Platform.OS === 'ios' ? panGestureRef : undefined}
                    >
                      <View style={styles.expandedContentInner}>
                        {/* Title Section */}
                        <View style={styles.titleSection}>
                          <Text style={styles.sheetTitle}>
                            Great Mosque of Damascus Mosaics
                          </Text>
                          <Text style={styles.sheetSubtitle}>
                            Adventure 4 • Module 1 • Lesson 1
                          </Text>
                        </View>

                        {/* Historical Content */}
                        <View style={styles.historicalSection}>
                          <Text style={styles.sectionTitle}>Historical Context</Text>
                          <Text style={styles.historicalText}>
                            The Great Mosque of Damascus is one of the oldest and most beautiful in the world - and its walls sparkle with Byzantine-made mosaics. These weren&apos;t pictures of people or battles. Instead, they showed peaceful imaginary landscapes filled with trees, palaces, and flowing water. These dreamlike scenes reminded worshippers of paradise, creating a calm and sacred feeling inside the mosque.
                          </Text>
                          <Text style={[styles.historicalText, { marginTop: 16 }]}>
                            To build something this beautiful, the Umayyads invited expert Byzantine mosaic artists - even though they came from a former rival empire. This shows how the Umayyads valued skill, no matter where it came from. They didn&apos;t just decorate for beauty - they used art to create peace, wonder, and connection. Their mosaics didn&apos;t tell one story - they told many, in color and light.
                          </Text>
                        </View>

                        {/* Key Terms Section */}
                        <View style={styles.keyTermsSection}>
                          <Text style={styles.sectionTitle}>Key Terms</Text>
                          <View style={styles.keyTermsContainer}>
                            <KeyTermRow
                              term="Byzantine Mosaics"
                              definition="Decorative art made of tiny colored tiles created by artists from the Byzantine Empire"
                            />
                            <KeyTermRow
                              term="Paradise Landscapes"
                              definition="Peaceful imaginary scenes of trees, palaces, and water representing heavenly gardens"
                            />
                            <KeyTermRow
                              term="Artistic Collaboration"
                              definition="The Umayyads' practice of hiring skilled artists regardless of their empire of origin"
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

                {/* Android Collapsed content */}
                <Animated.View style={[
                  styles.collapsedContent,
                  { opacity: cardOpacity }
                ]}>
                  <View style={styles.collapsedContentWrapper}>
                    <Text style={styles.collapsedTitle}>
                      Great Mosque of Damascus Mosaics
                    </Text>
                    <Text style={styles.collapsedSubtitle}>
                      Marvel at shimmering landscapes made of tiny tiles...
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
                      onScrollBeginDrag={() => {
                        console.log("📖 Android: Internal scrolling started - maintaining gesture block");
                        setIsCardGestureActive(true);
                      }}
                      onScrollEndDrag={() => {
                        console.log("📖 Android: Internal scrolling ended - allowing carousel");
                        setIsCardGestureActive(false);
                      }}
                    >
                      <View style={styles.expandedContentInner}>
                        {/* Title Section */}
                        <View style={styles.titleSection}>
                          <Text style={styles.sheetTitle}>
                            Great Mosque of Damascus Mosaics
                          </Text>
                          <Text style={styles.sheetSubtitle}>
                            Adventure 4 • Module 1 • Lesson 1
                          </Text>
                        </View>

                        {/* Historical Content */}
                        <View style={styles.historicalSection}>
                          <Text style={styles.sectionTitle}>Historical Context</Text>
                          <Text style={styles.historicalText}>
                            The Great Mosque of Damascus is one of the oldest and most beautiful in the world - and its walls sparkle with Byzantine-made mosaics. These weren&apos;t pictures of people or battles. Instead, they showed peaceful imaginary landscapes filled with trees, palaces, and flowing water. These dreamlike scenes reminded worshippers of paradise, creating a calm and sacred feeling inside the mosque.
                          </Text>
                          <Text style={[styles.historicalText, { marginTop: 16 }]}>
                            To build something this beautiful, the Umayyads invited expert Byzantine mosaic artists - even though they came from a former rival empire. This shows how the Umayyads valued skill, no matter where it came from. They didn&apos;t just decorate for beauty - they used art to create peace, wonder, and connection. Their mosaics didn&apos;t tell one story - they told many, in color and light.
                          </Text>
                        </View>

                        {/* Key Terms Section */}
                        <View style={styles.keyTermsSection}>
                          <Text style={styles.sectionTitle}>Key Terms</Text>
                          <View style={styles.keyTermsContainer}>
                            <KeyTermRow
                              term="Byzantine Mosaics"
                              definition="Decorative art made of tiny colored tiles created by artists from the Byzantine Empire"
                            />
                            <KeyTermRow
                              term="Paradise Landscapes"
                              definition="Peaceful imaginary scenes of trees, palaces, and water representing heavenly gardens"
                            />
                            <KeyTermRow
                              term="Artistic Collaboration"
                              definition="The Umayyads' practice of hiring skilled artists regardless of their empire of origin"
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
    overflow: 'hidden',
  },
  mosaicImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Text overlay at top
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
    bottom: 180,
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
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: 4,
  },
  pageIndicatorActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    transform: [{ scale: 1.2 }],
  },

  // Reading Card Container
  cardContainer: {
    position: "absolute",
    bottom: -40,
    left: 0,
    right: 0,
  },

  // Reading Card - Swipeable
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
    backgroundColor: "rgba(0,0,0,0.3)",
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
});