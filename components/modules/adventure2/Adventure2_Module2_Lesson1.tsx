// Adventure2_Module2_Lesson1.tsx - Currency Reform Coin Carousel  
// EXACT replica of Adventure1_Module2_Lesson1 structure with coin content

import ArchivesTheme from "@/constants/ArchivesTheme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState, useEffect } from "react";
import {
  Animated,
  Dimensions,
  Image,
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
import { Audio } from 'expo-av';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Adventure2_Module2_Lesson1Props {
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void;
}

// Currency coin data - EXACT SwiftUI content with AWS CloudFront URLs
const coinStyles = [
  {
    id: 1,
    imageUrl: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv2_M2_Img01.jpg",
    title: "Byzantine Gold Coins",
    caption: "Byzantine gold coins showing the emperor's face - a pre-reform currency still in circulation across early Umayyad lands"
  },
  {
    id: 2,
    imageUrl: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv2_M2_Img02.jpg",
    title: "Sasanian-Style Coins", 
    caption: "Sasanian-style gold coins with a fire altar at the center - a holdover from Persian rule before Umayyad reforms standardized currency"
  }
];

export default function Adventure2_Module2_Lesson1({
  onContinue,
  onDismiss,
  onBack,
}: Adventure2_Module2_Lesson1Props) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const panGestureRef = useRef(null);
  const scrollViewGestureRef = useRef(null);

  // Animation values for card expansion
  const cardHeight = useRef(new Animated.Value(160)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;

  // Background music hook - Desert Whispers ambience from AWS CloudFront
  const backgroundMusic = useBackgroundMusic(
    { uri: "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv1_M2_L1_Desert+Whispers.mp3" }, // Temporarily using working Adv1 file for testing
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
    console.log(`🎵 [${timestamp}] Adventure2_Module2_Lesson1 - Background music state:`, {
      isLoaded: backgroundMusic.isLoaded,
      isPlaying: backgroundMusic.isPlaying,
      isLoading: backgroundMusic.isLoading
    });
    
    // Additional debugging for audio file loading (AWS CloudFront)
    if (!backgroundMusic.isLoaded && !backgroundMusic.isLoading) {
      console.log('🎵 Audio not loading - AWS CloudFront source should be available');
      console.log('🎵 AWS Audio URL: https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv1_M2_L1_Desert+Whispers.mp3 (using working Adv1 file)');
    }
  }, [backgroundMusic.isLoaded, backgroundMusic.isPlaying, backgroundMusic.isLoading]);

  // Component mount logging + Simple audio test
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log('🎵 Adventure2_Module2_Lesson1 component mounted at:', timestamp);
    
    // Simple direct audio test with AWS CloudFront
    const testDirectAudio = async () => {
      try {
        console.log('🎵 [DIRECT TEST A2M2L1] Attempting to load audio from AWS CloudFront...');
        const audioSource = { uri: "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv1_M2_L1_Desert+Whispers.mp3" }; // Temporarily using working Adv1 file for testing
        console.log('🎵 [DIRECT TEST A2M2L1] Audio source:', audioSource);
        
        const { sound } = await Audio.Sound.createAsync(audioSource, {
          shouldPlay: true,
          volume: 0.15,
          isLooping: true
        });
        
        console.log('🎵 [DIRECT TEST A2M2L1] AWS audio created and playing successfully!');
        
        // Store sound reference for cleanup
        window.testSoundA2M2L1 = sound;
        
      } catch (error) {
        console.error('🎵 [DIRECT TEST A2M2L1] Failed to load/play AWS audio:', error);
      }
    };
    
    // Run direct test after a short delay
    setTimeout(testDirectAudio, 1000);
    
    return () => {
      console.log('🎵 Adventure2_Module2_Lesson1 component unmounting at:', new Date().toLocaleTimeString());
      
      // Cleanup direct test audio
      if (window.testSoundA2M2L1) {
        console.log('🎵 [DIRECT TEST A2M2L1] Cleaning up test audio');
        window.testSoundA2M2L1.unloadAsync().catch(console.error);
        window.testSoundA2M2L1 = null;
      }
    };
  }, []);

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
        console.log(`🎵 [${timestamp}] Starting currency reform background music`);
        console.log(`🎵 [${timestamp}] Audio state before play:`, {
          isLoaded: backgroundMusic.isLoaded,
          isPlaying: backgroundMusic.isPlaying,
          isLoading: backgroundMusic.isLoading
        });
        
        try {
          await backgroundMusic.play();
          console.log(`🎵 [${timestamp}] Play command sent successfully`);
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

  // Force music playback on component mount (debugging)
  useEffect(() => {
    const forcePlayMusic = async () => {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`🎵 [${timestamp}] Force play attempt - checking if we can start music immediately`);
      
      // Try to play after a short delay to allow audio loading
      setTimeout(async () => {
        if (backgroundMusic.isLoaded && !backgroundMusic.isPlaying) {
          console.log(`🎵 [${timestamp}] Force playing music after timeout`);
          try {
            await backgroundMusic.play();
          } catch (error) {
            console.error(`🎵 [${timestamp}] Force play failed:`, error);
          }
        } else {
          console.log(`🎵 [${timestamp}] Force play skipped - loaded: ${backgroundMusic.isLoaded}, playing: ${backgroundMusic.isPlaying}`);
        }
      }, 2000); // Wait 2 seconds for audio to load
    };

    forcePlayMusic();
  }, []); // Run once on mount

  // Cleanup background music when component unmounts
  useEffect(() => {
    return () => {
      console.log('🎵 Component unmounting - cleaning up all audio');
      // Stop background music (regardless of playing state)
      if (backgroundMusic.stop) {
        console.log('🎵 Stopping background music on component unmount');
        backgroundMusic.stop();
      }
      // Cleanup direct test audio
      if (window.testSoundA2M2L1) {
        console.log('🎵 Cleaning up direct test audio on unmount');
        window.testSoundA2M2L1.unloadAsync().catch(console.error);
        window.testSoundA2M2L1 = null;
      }
    };
  }, []);

  // Handle swipe gestures to expand/collapse the card
  const handleSwipeGesture = (event: any) => {
    const { translationY, velocityY, state } = event.nativeEvent;

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
          (velocityY > 800) ||
          (translationY > 50 && velocityY > 400) ||
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

  // Handle reading scroll
  const handleReadingScroll = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    setScrollY(contentOffset.y);
  };

  return (
    <>
      <StatusBar hidden />
      <View style={styles.container}>
        {/* Main carousel - full screen */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          style={styles.carousel}
        >
          {coinStyles.map((coin, index) => (
            <View key={coin.id} style={styles.imageContainer}>
              {/* Full screen coin image */}
              <Image 
                source={{ uri: coin.imageUrl }}
                style={styles.coinImage}
                resizeMode="cover"
              />
              
              {/* Text overlay at the top */}
              <View style={styles.textOverlay}>
                <Text style={styles.captionText}>{coin.caption}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Back Button - Top Left */}
        <SafeAreaView style={styles.backButtonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => {
            // Stop background music when going back
            if (backgroundMusic.isPlaying) {
              console.log('🎵 Stopping background music on back button');
              backgroundMusic.stop();
            }
            // Cleanup direct test audio
            if (window.testSoundA2M2L1) {
              console.log('🎵 Cleaning up direct test audio on back');
              window.testSoundA2M2L1.unloadAsync().catch(console.error);
              window.testSoundA2M2L1 = null;
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
              currentImageIndex !== coinStyles.length - 1 && styles.topContinueButtonDisabled
            ]}
            onPress={currentImageIndex === coinStyles.length - 1 ? () => {
              // Stop background music before continuing (no await for instant navigation)
              if (backgroundMusic.isPlaying) {
                console.log('🎵 Stopping background music before continue');
                backgroundMusic.stop(); // Remove await for instant navigation
              }
              // Cleanup direct test audio
              if (window.testSoundA2M2L1) {
                console.log('🎵 Cleaning up direct test audio on continue');
                window.testSoundA2M2L1.unloadAsync().catch(console.error);
                window.testSoundA2M2L1 = null;
              }
              onContinue();
            } : undefined}
            disabled={currentImageIndex !== coinStyles.length - 1}
          >
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color={currentImageIndex === coinStyles.length - 1 ? "white" : "#666"} 
            />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Page indicator dots - centered */}
        {!isCardExpanded && (
          <View style={styles.pageIndicatorsOnly}>
            {coinStyles.map((_, index) => (
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
              <TouchableOpacity 
                style={styles.readingCardHeader}
                onPress={expandCard}
              >
                <Text style={styles.cardTitle}>
                  Currency Reform Under the Umayyads
                </Text>
                <Text style={styles.cardSubtitle}>
                  Before Abd al-Malik's reforms, multiple currencies...
                </Text>
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
                    {/* Title Section */}
                    <View style={styles.titleSection}>
                      <Text style={styles.sheetTitle}>
                        Currency Reform Under the Umayyads
                      </Text>
                      <Text style={styles.sheetSubtitle}>
                        Module 2 • Lesson 1
                      </Text>
                    </View>

                    {/* Historical Content */}
                    <View style={styles.historicalSection}>
                      <Text style={styles.sectionTitle}>Historical Context</Text>
                      <Text style={styles.historicalText}>
                        Before Abd al-Malik's reforms, multiple currencies circulated across the empire - Byzantine gold coins showed the emperor's face, while Sasanian-style coins featured fire altars from Persian rule. This created confusion in markets and made trade difficult. By standardizing currency with Islamic designs and Arabic inscriptions, the Umayyads unified their economic system and established their authority over commerce throughout the empire.
                      </Text>
                    </View>

                    {/* Key Terms Section */}
                    <View style={styles.keyTermsSection}>
                      <Text style={styles.sectionTitle}>Key Terms</Text>
                      <View style={styles.keyTermsContainer}>
                        <KeyTermRow
                          term="Currency Reform"
                          definition="Abd al-Malik's standardization of Islamic coinage across the empire"
                        />
                        <KeyTermRow
                          term="Byzantine Gold Coins"
                          definition="Pre-reform currency featuring the emperor's image"
                        />
                        <KeyTermRow
                          term="Sasanian-Style Coins"
                          definition="Persian-influenced currency with fire altar symbols"
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
  coinImage: {
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