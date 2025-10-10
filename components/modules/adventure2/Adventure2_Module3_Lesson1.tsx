// Adventure2_Module3_Lesson1.tsx - Dome of the Rock Construction Carousel
// EXACT replica of Adventure1_Module2_Lesson1 structure with Dome of the Rock content

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
import { PanGestureHandler, State, ScrollView as GestureHandlerScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Adventure2_Module3_Lesson1Props {
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void;
}

// Dome of the Rock construction data with AWS CloudFront URLs
const domeOfRockImages = [
  {
    id: 1,
    imageUrl: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv2_M3_Img01.jpg",
    title: "Planning Phase",
    caption: "Pre-Muslim conquest, the Temple Mount was in ruins, used as a garbage dump by Byzantine rule to keep Jews away from their holy site."
  },
  {
    id: 2,
    imageUrl: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv2_M3_Img02.jpg",
    title: "Construction in Progress", 
    caption: "After the site was cleared of garbage, planners on the Haram al-Sharif prepared designs for the Dome of the Rock"
  },
  {
    id: 3,
    imageUrl: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv2_M3_Img03.jpg",
    title: "Completed Monument",
    caption: "Jerusalem, 691 CE: the Dome of the Rock rises, a monument built to mark the Prophet's Night Journey."
  }
];

export default function Adventure2_Module3_Lesson1({
  onContinue,
  onDismiss,
  onBack,
}: Adventure2_Module3_Lesson1Props) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [isCardGestureActive, setIsCardGestureActive] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const panGestureRef = useRef(null);
  const scrollViewGestureRef = useRef(null);

  // Animation values for card expansion
  const cardHeight = useRef(new Animated.Value(160)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;

  // Background music hook - Desert Whispers ambience from AWS CloudFront
  const backgroundMusic = useBackgroundMusic(
    { uri: "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv2_M2_L1_Desert+Whispers.mp3" }, // Using requested audio file
    {
      volume: 0.15, // 15% volume - very low ambient background
      shouldLoop: true,
      fadeInDuration: 1000, // 1 second fade in for faster feedback
      fadeOutDuration: 1500, // 1.5 second fade out
    }
  );

  // Enhanced debug logging for background music
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🎵 [${timestamp}] Adventure2_Module3_Lesson1 - Background music state:`, {
      isLoaded: backgroundMusic.isLoaded,
      isPlaying: backgroundMusic.isPlaying,
      isLoading: backgroundMusic.isLoading
    });
    
    // Additional debugging for audio file loading (AWS CloudFront)
    if (!backgroundMusic.isLoaded && !backgroundMusic.isLoading) {
      console.log('🎵 Audio not loading - AWS CloudFront source should be available');
      console.log('🎵 AWS Audio URL: https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv2_M2_L1_Desert+Whispers.mp3');
    }
  }, [backgroundMusic.isLoaded, backgroundMusic.isPlaying, backgroundMusic.isLoading]);

  // Debug logging for carousel scroll state
  useEffect(() => {
    console.log("🎠 Carousel scroll state:", { isCardGestureActive, scrollEnabled: !isCardGestureActive });
  }, [isCardGestureActive]);

  // Safety mechanism: Auto-reset stuck gesture state after 100ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isCardGestureActive) {
        console.log("⚠️ Safety reset: Clearing stuck gesture state");
        setIsCardGestureActive(false);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isCardExpanded]);

  // Handle carousel scroll
  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const imageIndex = Math.round(contentOffsetX / SCREEN_WIDTH);
    
    if (imageIndex !== currentImageIndex) {
      setCurrentImageIndex(imageIndex);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Background music lifecycle management
  useEffect(() => {
    const startBackgroundMusic = async () => {
      const timestamp = new Date().toLocaleTimeString();
      if (backgroundMusic.isLoaded && !backgroundMusic.isPlaying) {
        console.log(`🎵 [${timestamp}] Starting dome construction background music`);
        console.log(`🎵 [${timestamp}] Audio state before play:`, {
          isLoaded: backgroundMusic.isLoaded,
          isPlaying: backgroundMusic.isPlaying,
          isLoading: backgroundMusic.isLoading
        });
        
        try {
          await backgroundMusic.play();
          console.log(`🎵 [${timestamp}] Background music started successfully`);
        } catch (error) {
          console.error(`🎵 [${timestamp}] Failed to start background music:`, error);
        }
      } else if (!backgroundMusic.isLoaded) {
        console.log(`🎵 [${timestamp}] Music not loaded yet, waiting...`);
      } else if (backgroundMusic.isPlaying) {
        console.log(`🎵 [${timestamp}] Music already playing`);
      }
    };

    if (backgroundMusic.isLoaded) {
      console.log(`🎵 [${new Date().toLocaleTimeString()}] Audio is loaded, attempting to start playback`);
      startBackgroundMusic();
    } else {
      console.log(`🎵 [${new Date().toLocaleTimeString()}] Background music not available - continuing without audio`);
    }
  }, [backgroundMusic.isLoaded]);

  // Cleanup background music when component unmounts
  useEffect(() => {
    return () => {
      console.log('🎵 Component unmounting - cleaning up audio');

      if (backgroundMusic.stop) {
        console.log('🎵 Stopping background music on component unmount');
        backgroundMusic.stop();
      }
    };
  }, []);

  // Universal gesture handler for both iOS and Android
  const handleSwipeGesture = (event: any) => {
    const { state, translationY, velocityY } = event.nativeEvent;

    // Track gesture activity for carousel coordination
    if (state === State.BEGAN || state === State.ACTIVE) {
      setIsCardGestureActive(true);
      console.log("📱 Card gesture started - blocking carousel");
    }

    if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      console.log("📱 Gesture state:", state, {translationY, velocityY, isCardExpanded, platform: Platform.OS});

      if (state === State.END) {
        const minDistance = 20;
        const minVelocity = 300;

        if (!isCardExpanded && (translationY < -minDistance || velocityY < -minVelocity)) {
          expandCard();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          return;
        } else if (isCardExpanded && (translationY > minDistance || velocityY > minVelocity)) {
          collapseCard();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          return;
        }
      }

      setIsCardGestureActive(false);
      console.log("📱 Gesture ended - carousel re-enabled");
    }
  };

  // Expand the card to full height
  const expandCard = () => {
    console.log("🎬 Card expansion starting...");
    setIsCardExpanded(true);

    setIsCardGestureActive(false);
    console.log("🎬 Carousel re-enabled IMMEDIATELY ✅");

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
    ]).start(() => {
      console.log("🎬 Card expansion animation finished");
    });
  };

  // Collapse the card back to original size
  const collapseCard = () => {
    console.log("🎬 Card collapse starting...");
    setIsCardExpanded(false);

    setIsCardGestureActive(false);
    console.log("🎬 Carousel re-enabled IMMEDIATELY ✅");

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
    ]).start(() => {
      console.log("🎬 Card collapse animation finished");
    });
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
        {/* Main carousel - full screen */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEnabled={!isCardGestureActive}
          style={styles.carousel}
        >
          {domeOfRockImages.map((domeImage, index) => (
            <View key={domeImage.id} style={styles.imageContainer}>
              {/* Full screen dome construction image */}
              <Image 
                source={{ uri: domeImage.imageUrl }}
                style={styles.domeImage}
                resizeMode="cover"
              />
              
              {/* Text overlay at the top */}
              <View style={styles.textOverlay}>
                <Text style={styles.captionText}>{domeImage.caption}</Text>
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
              currentImageIndex !== domeOfRockImages.length - 1 && styles.topContinueButtonDisabled
            ]}
            onPress={currentImageIndex === domeOfRockImages.length - 1 ? () => {
              if (backgroundMusic.isPlaying) {
                console.log('🎵 Stopping background music before continue');
                backgroundMusic.stop();
              }

              onContinue();
            } : undefined}
            disabled={currentImageIndex !== domeOfRockImages.length - 1}
          >
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color={currentImageIndex === domeOfRockImages.length - 1 ? "white" : "#666"} 
            />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Page indicator dots - centered */}
        {!isCardExpanded && (
          <View style={styles.pageIndicatorsOnly}>
            {domeOfRockImages.map((_, index) => (
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

        {/* Reading Card at Bottom - Expandable */}
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
                  Building the Dome of the Rock
                </Text>
                <Text style={styles.cardSubtitle}>
                  The Dome of the Rock is one of the oldest and most remarkable buildings...
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
                        Building the Dome of the Rock
                      </Text>
                      <Text style={styles.sheetSubtitle}>
                        Module 3 • Lesson 1
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Historical Content */}
                  <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                    <View style={styles.historicalSection}>
                      <Text style={styles.sectionTitle}>Historical Context</Text>
                      <Text style={styles.historicalText}>
                        The Dome of the Rock is one of the oldest and most remarkable buildings in Islamic history. Caliph Abd al-Malik began its construction in Jerusalem, and it was completed in 691 CE. Unlike earlier Roman or Byzantine churches, its design was a perfect circle with a golden dome that could be seen from all across the city. Built to honor the Prophet Muhammad&apos;s Night Journey and Ascension, it also served as a bold symbol of Islamic identity and the empire&apos;s growing power.
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Key Terms Section */}
                  <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                    <View style={styles.keyTermsSection}>
                      <Text style={styles.sectionTitle}>Key Terms</Text>
                      <View style={styles.keyTermsContainer}>
                        <KeyTermRow
                          term="Perfect Circle Design"
                          definition="Unique circular architecture with golden dome, unlike Roman or Byzantine churches"
                        />
                        <KeyTermRow
                          term="Night Journey and Ascension"
                          definition="Prophet Muhammad's miraculous journey honored by the Dome of the Rock"
                        />
                        <KeyTermRow
                          term="691 CE Completion"
                          definition="Year Abd al-Malik's remarkable building project was finished in Jerusalem"
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
  domeImage: {
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

  // Page indicators only - Figma design with dark pill container
  pageIndicatorsOnly: {
    position: "absolute",
    bottom: 180, // Position above the reading card
    alignSelf: "center", // Center horizontally, auto-fit width to content
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    // Dark pill container background - width auto-fits to content
    backgroundColor: "rgba(0, 0, 0, 0.8)", // 80% black opacity
    borderRadius: 15, // Smooth rounded pill shape
    paddingHorizontal: 5, // Left & right padding
    paddingVertical: 6, // Top & bottom padding
  },
  pageIndicator: {
    width: 9, // Dot size
    height: 9,
    borderRadius: 4.5, // Perfect circle (half of width)
    backgroundColor: "rgb(147, 147, 147)", // Gray color
    marginHorizontal: 4.5, // Spacing between dots
  },
  pageIndicatorActive: {
    backgroundColor: "rgb(255, 255, 255)", // Pure white
    // No scale transform - clean, simple design
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