// Adventure1_Module3_Lesson1.tsx - Trade Routes Through Damascus
// Static map view with Read modal showing Damascus trade routes and cultural exchange

import ArchivesTheme from "@/constants/ArchivesTheme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const COLLAPSED_HEIGHT = 140;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.85;

interface Adventure1_Module3_Lesson1Props {
  onContinue: () => void;
  onDismiss: () => void;
}

export default function Adventure1_Module3_Lesson1({
  onContinue,
  onDismiss,
}: Adventure1_Module3_Lesson1Props) {
  const [showReadContent, setShowReadContent] = useState(false);
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [touchStart, setTouchStart] = useState<{
    y: number;
    time: number;
  } | null>(null);
  const panGestureRef = useRef(null);
  const scrollViewGestureRef = useRef(null);

  // Animation values for card expansion
  const cardHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;

  const handleContinue = () => {
    console.log("🔄 Continue button pressed in Module3 Lesson1");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onContinue();
  };

  const handleReadPress = () => {
    console.log("📖 Read button pressed in Module3 Lesson1");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    expandCard();
  };

  // Custom touch handlers for reliable Android swipe detection
  const handleTouchStart = (event: any) => {
    setTouchStart({
      y: event.nativeEvent.pageY,
      time: Date.now(),
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

    if (
      !isCardExpanded &&
      distance > minDistance &&
      time < maxTime &&
      velocity > velocityThreshold
    ) {
      console.log("📖 Android touch swipe up detected - expanding card", {
        distance,
        time,
        velocity: velocity.toFixed(2),
        platform: Platform.OS,
      });
      expandCard();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (
      isCardExpanded &&
      distance < -minDistance &&
      time < maxTime &&
      velocity > velocityThreshold
    ) {
      console.log("📖 Android touch swipe down detected - collapsing card", {
        distance,
        time,
        velocity: velocity.toFixed(2),
        platform: Platform.OS,
      });
      collapseCard();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Reset touch start
    setTouchStart(null);
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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  // Expand the card to full height
  const expandCard = () => {
    setIsCardExpanded(true);
    setShowReadContent(true);

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
    setShowReadContent(false);

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
  };

  return (
    <>
      {Platform.OS === "android" && (
        <StatusBar barStyle="dark-content" backgroundColor="#F4EBDB" />
      )}
      <View style={styles.container}>
        {/* Main Damascus map - completely full screen */}
        <Image
          source={{
            uri: "https://dzyjrzj2lngmg.cloudfront.net/Images/Interactive_map.png",
          }}
          style={styles.mapImage}
          resizeMode="cover"
        />

        {/* Text overlay at the top */}
        <View style={styles.textOverlay}>
          <Text style={styles.overlayText}>Trade Routes Through Damascus</Text>
        </View>

        {/* Back Button - Top Left */}
        <SafeAreaView style={styles.backButtonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={onDismiss}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Continue Button - Top Right */}
        <SafeAreaView style={styles.continueButtonContainer}>
          <TouchableOpacity
            style={styles.topContinueButton}
            onPress={handleContinue}
          >
            <Ionicons name="chevron-forward" size={24} color="white" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Android Reading Card - Simplified Working Version with Animation */}
        {Platform.OS === "android" && (
          <Animated.View
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: cardHeight,
              backgroundColor: "rgba(0,0,0,0.9)",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              zIndex: 30,
              elevation: 20,
              shadowColor: "#000",
              shadowOpacity: 0.2,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: -4 },
            }}
          >
            {/* Top handle indicator */}
            <View style={styles.cardHandle} />

            {/* Collapsed content */}
            {!isCardExpanded && (
              <Animated.View
                style={[styles.collapsedContent, { opacity: cardOpacity }]}
              >
                <View style={styles.collapsedContentWrapper}>
                  <Text style={styles.collapsedTitle}>
                    Trade Routes Through Damascus
                  </Text>
                  <Text style={styles.collapsedSubtitle}>
                    Damascus was more than a capital; it sat at the intersection
                    of ancient roads...
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* Expanded content when card is swiped up */}
            {isCardExpanded && (
              <View
                style={{
                  flex: 1,
                  padding: 20,
                  paddingTop: 40,
                }}
              >
                <Text
                  style={{
                    fontFamily: "DM Sans",
                    fontSize: 22,
                    fontWeight: "700",
                    color: "white",
                    marginBottom: 8,
                  }}
                >
                  Trade Routes Through Damascus
                </Text>

                <Text
                  style={{
                    fontFamily: "DM Sans",
                    fontSize: 14,
                    color: "rgba(255,255,255,0.7)",
                    marginBottom: 20,
                  }}
                >
                  Module 3 • Lesson 1
                </Text>

                <Text
                  style={{
                    fontFamily: "DM Sans",
                    fontSize: 18,
                    fontWeight: "600",
                    color: "white",
                    marginBottom: 8,
                  }}
                >
                  Historical Context
                </Text>

                <Text
                  style={{
                    fontFamily: "DM Sans",
                    fontSize: 14,
                    color: "white",
                    lineHeight: 20,
                    marginBottom: 20,
                  }}
                >
                  Damascus was more than a capital; it sat at the intersection
                  of ancient roads. The King's Highway ran up through the
                  deserts and highlands to the city, bringing caravans from
                  Arabia and the Red Sea. Traders slept in khans, courtyard inns
                  with stables, storage rooms, and a well. There they rested
                  animals, stored goods, and swapped news before entering the
                  busy markets.
                </Text>

                <Text
                  style={{
                    fontFamily: "DM Sans",
                    fontSize: 18,
                    fontWeight: "600",
                    color: "white",
                    marginBottom: 12,
                  }}
                >
                  Key Terms
                </Text>

                <View
                  style={{
                    backgroundColor: "rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <View style={{ marginBottom: 8 }}>
                    <Text
                      style={{
                        fontFamily: "DM Sans",
                        fontSize: 14,
                        fontWeight: "600",
                        color: "white",
                        marginBottom: 2,
                      }}
                    >
                      King's Highway
                    </Text>
                    <Text
                      style={{
                        fontFamily: "DM Sans",
                        fontSize: 12,
                        color: "rgba(255,255,255,0.8)",
                        lineHeight: 16,
                      }}
                    >
                      The ancient road through deserts and highlands that
                      brought caravans to Damascus
                    </Text>
                  </View>

                  <View style={{ marginBottom: 8 }}>
                    <Text
                      style={{
                        fontFamily: "DM Sans",
                        fontSize: 14,
                        fontWeight: "600",
                        color: "white",
                        marginBottom: 2,
                      }}
                    >
                      Khans
                    </Text>
                    <Text
                      style={{
                        fontFamily: "DM Sans",
                        fontSize: 12,
                        color: "rgba(255,255,255,0.8)",
                        lineHeight: 16,
                      }}
                    >
                      Courtyard inns with stables, storage rooms, and wells
                      where traders rested
                    </Text>
                  </View>

                  <View>
                    <Text
                      style={{
                        fontFamily: "DM Sans",
                        fontSize: 14,
                        fontWeight: "600",
                        color: "white",
                        marginBottom: 2,
                      }}
                    >
                      Caravans from Red Sea
                    </Text>
                    <Text
                      style={{
                        fontFamily: "DM Sans",
                        fontSize: 12,
                        color: "rgba(255,255,255,0.8)",
                        lineHeight: 16,
                      }}
                    >
                      Trading groups that traveled from Arabia and the Red Sea
                      to Damascus
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </Animated.View>
        )}

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

                {/* iOS Collapsed content */}
                <Animated.View
                  style={[styles.collapsedContent, { opacity: cardOpacity }]}
                >
                  <View style={styles.readingCardHeader}>
                    <Text style={styles.cardTitle}>
                      Trade Routes Through Damascus
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      Damascus was more than a capital; it sat at the
                      intersection of ancient roads...
                    </Text>
                  </View>
                </Animated.View>

                {/* Expanded content when card is swiped up */}
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
                        {/* Title Section */}
                        <View style={styles.titleSection}>
                          <Text style={styles.sheetTitle}>
                            Trade Routes Through Damascus
                          </Text>
                          <Text style={styles.sheetSubtitle}>
                            Module 3 • Lesson 1
                          </Text>
                        </View>

                        {/* Historical Content */}
                        <View style={styles.historicalSection}>
                          <Text style={styles.sectionTitle}>
                            Historical Context
                          </Text>
                          <Text style={styles.historicalText}>
                            Damascus was more than a capital; it sat at the
                            intersection of ancient roads. The King&apos;s
                            Highway ran up through the deserts and highlands to
                            the city, bringing caravans from Arabia and the Red
                            Sea. Traders slept in khans, courtyard inns with
                            stables, storage rooms, and a well. There they
                            rested animals, stored goods, and swapped news
                            before entering the busy markets.
                          </Text>
                        </View>

                        {/* Key Terms Section */}
                        <View style={styles.keyTermsSection}>
                          <Text style={styles.sectionTitle}>Key Terms</Text>
                          <View style={styles.keyTermsContainer}>
                            <KeyTermRow
                              term="King's Highway"
                              definition="The ancient road through deserts and highlands that brought caravans to Damascus"
                            />
                            <KeyTermRow
                              term="Khans"
                              definition="Courtyard inns with stables, storage rooms, and wells where traders rested"
                            />
                            <KeyTermRow
                              term="Caravans from Red Sea"
                              definition="Trading groups that traveled from Arabia and the Red Sea to Damascus"
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
          <View onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <Animated.View
              style={[
                styles.cardContainer,
                // {
                //   transform: [{ translateY: cardTranslateY }]
                // }
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

                {/* Android Collapsed content with improved styling */}
                <Animated.View
                  style={[styles.collapsedContent, { opacity: cardOpacity }]}
                >
                  <View style={styles.collapsedContentWrapper}>
                    <Text style={styles.collapsedTitle}>
                      Trade Routes Through Damascus
                    </Text>
                    <Text style={styles.collapsedSubtitle}>
                      Damascus was more than a capital; it sat at the
                      intersection of ancient roads...
                    </Text>
                  </View>
                </Animated.View>

                {/* Expanded content when card is swiped up */}
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
                        {/* Title Section */}
                        <View style={styles.titleSection}>
                          <Text style={styles.sheetTitle}>
                            Trade Routes Through Damascus
                          </Text>
                          <Text style={styles.sheetSubtitle}>
                            Module 3 • Lesson 1
                          </Text>
                        </View>

                        {/* Historical Content */}
                        <View style={styles.historicalSection}>
                          <Text style={styles.sectionTitle}>
                            Historical Context
                          </Text>
                          <Text style={styles.historicalText}>
                            Damascus was more than a capital; it sat at the
                            intersection of ancient roads. The King&apos;s
                            Highway ran up through the deserts and highlands to
                            the city, bringing caravans from Arabia and the Red
                            Sea. Traders slept in khans, courtyard inns with
                            stables, storage rooms, and a well. There they
                            rested animals, stored goods, and swapped news
                            before entering the busy markets.
                          </Text>
                        </View>

                        {/* Key Terms Section */}
                        <View style={styles.keyTermsSection}>
                          <Text style={styles.sectionTitle}>Key Terms</Text>
                          <View style={styles.keyTermsContainer}>
                            <KeyTermRow
                              term="King's Highway"
                              definition="The ancient road through deserts and highlands that brought caravans to Damascus"
                            />
                            <KeyTermRow
                              term="Khans"
                              definition="Courtyard inns with stables, storage rooms, and wells where traders rested"
                            />
                            <KeyTermRow
                              term="Caravans from Red Sea"
                              definition="Trading groups that traveled from Arabia and the Red Sea to Damascus"
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
    backgroundColor: "black",
  },

  // Main map image - full screen
  mapImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Text overlay at the top
  textOverlay: {
    position: "absolute",
    top: 100,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
    alignItems: "center",
  },
  overlayText: {
    fontFamily: "DM Sans",
    fontSize: 20,
    fontWeight: "700",
    color: "white",
    textAlign: "center",
    lineHeight: 26,
    textShadowColor: "black",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    shadowColor: "black",
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
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

  // Reading Card Container
  cardContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    elevation: 20,
  },

  // Reading Card - Swipeable
  readingCard: {
    height: COLLAPSED_HEIGHT,
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
    flex: 1,
    justifyContent: "center",
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
