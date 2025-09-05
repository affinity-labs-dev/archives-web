// Adventure2_Module3_Lesson2.tsx - Interior View of Dome of the Rock
// Full-screen image with expandable reading card - matching Adventure1_Module2_Lesson1 pattern

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
import { Audio } from 'expo-av';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Adventure2_Module3_Lesson2Props {
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void;
}

export default function Adventure2_Module3_Lesson2({
  onContinue,
  onDismiss,
  onBack,
}: Adventure2_Module3_Lesson2Props) {
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [touchStart, setTouchStart] = useState<{y: number, time: number} | null>(null);
  const [isCardGestureActive, setIsCardGestureActive] = useState(false);
  const panGestureRef = useRef(null);
  const scrollViewGestureRef = useRef(null);
  const directAudioSoundRef = useRef<Audio.Sound | null>(null);

  // Animation values for card expansion
  const cardHeight = useRef(new Animated.Value(160)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;

  // Audio source for direct audio testing
  const audioSource = { uri: "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv2_M2_L1_Desert+Whispers.mp3" };

  // Background music hook - Desert Whispers ambience from AWS CloudFront
  const backgroundMusic = useBackgroundMusic(
    { uri: "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv2_M2_L1_Desert+Whispers.mp3" },
    {
      volume: 0.5, // 50% volume for clear ambient sound
      shouldLoop: true,
    }
  );

  // Enhanced debug logging for background music
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🎵 [${timestamp}] Adventure2_Module3_Lesson2 - Background music state:`, {
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

  // Component mount logging
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log('🎵 Adventure2_Module3_Lesson2 component mounted at:', timestamp);
  }, []);

  // Background music lifecycle management
  useEffect(() => {
    const startBackgroundMusic = async () => {
      const timestamp = new Date().toLocaleTimeString();
      if (backgroundMusic.isLoaded && !backgroundMusic.isPlaying) {
        console.log(`🎵 [${timestamp}] Starting dome interior background music`);
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
      console.log('🎵 Component unmounting - cleaning up all audio');
      
      // Stop background music hook
      if (backgroundMusic.stop) {
        console.log('🎵 Stopping background music on component unmount');
        backgroundMusic.stop();
      }
      
      // Stop direct audio if it exists
      if (directAudioSoundRef.current) {
        try {
          console.log('🎵 Stopping direct audio on component unmount');
          directAudioSoundRef.current.stopAsync();
          directAudioSoundRef.current.unloadAsync();
          directAudioSoundRef.current = null;
        } catch (error) {
          console.error('🎵 Error stopping direct audio on unmount:', error);
        }
      }
    };
  }, []);

  // Custom touch handlers for reliable Android swipe detection
  const handleTouchStart = (event: any) => {
    setIsCardGestureActive(true);
    setTouchStart({ y: event.nativeEvent.pageY, time: Date.now() });
  };
  const handleTouchEnd = (event: any) => {
    setIsCardGestureActive(false);
    if (!touchStart) return;
    const touchEnd = event.nativeEvent.pageY, distance = touchStart.y - touchEnd, time = Date.now() - touchStart.time;
    const minDistance = 30, maxTime = 400, velocity = Math.abs(distance) / time, velocityThreshold = 0.3;
    if (!isCardExpanded && distance > minDistance && time < maxTime && velocity > velocityThreshold) {
      console.log("📖 Android touch swipe up detected - expanding card", { distance, time, velocity: velocity.toFixed(2), platform: Platform.OS });
      expandCard(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (isCardExpanded && distance < -minDistance && time < maxTime && velocity > velocityThreshold) {
      console.log("📖 Android touch swipe down detected - collapsing card", { distance, time, velocity: velocity.toFixed(2), platform: Platform.OS });
      collapseCard(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTouchStart(null);
  };
  // iOS PanGestureHandler for native iOS gesture experience
  const handleSwipeGesture = (event: any) => {
    if (Platform.OS !== 'ios') return;
    
    const { state } = event.nativeEvent;
    
    if (state === State.BEGAN || state === State.ACTIVE) {
      setIsCardGestureActive(true);
    } else if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      setIsCardGestureActive(false);
    }
    
    if (event.nativeEvent.state === State.END) {
      const { translationY, velocityY } = event.nativeEvent;
      console.log("📱 iOS PanGesture detected", { translationY, velocityY, isCardExpanded, platform: Platform.OS });
      const minDistance = 20, minVelocity = 300;
      if (!isCardExpanded && (translationY < -minDistance || velocityY < -minVelocity)) {
        console.log("📱 iOS PanGesture swipe up detected - expanding card", { translationY, velocityY, platform: Platform.OS });
        expandCard(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (isCardExpanded && (translationY > minDistance || velocityY > minVelocity)) {
        console.log("📱 iOS PanGesture swipe down detected - collapsing card", { translationY, velocityY, platform: Platform.OS });
        collapseCard(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  // Handle reading scroll - track scroll position for gesture priority
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
        {/* Full screen Dome of the Rock interior image */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv2_M3_Img04.jpg" }}
            style={styles.domeImage}
            resizeMode="cover"
          />
          
          {/* Text overlay with title */}
          <View style={styles.textOverlay}>
            <Text style={styles.captionText}>
              Interior View of the Dome of the Rock
            </Text>
          </View>
        </View>

        {/* Back Button - Top Left */}
        <SafeAreaView style={styles.backButtonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => {
            // Stop all audio when going back
            if (backgroundMusic.isPlaying) {
              console.log('🎵 Stopping background music on back button');
              backgroundMusic.stop();
            }
            
            // Stop direct audio if it exists
            if (directAudioSoundRef.current) {
              try {
                console.log('🎵 Stopping direct audio on back button');
                directAudioSoundRef.current.stopAsync();
                directAudioSoundRef.current.unloadAsync();
                directAudioSoundRef.current = null;
              } catch (error) {
                console.error('🎵 Error stopping direct audio on back:', error);
              }
            }
            
            (onBack || onDismiss)();
          }}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Continue Button - Top Right */}
        <SafeAreaView style={styles.continueButtonContainer}>
          <TouchableOpacity 
            style={styles.topContinueButton}
            onPress={() => {
              // Stop all audio before continuing (no await for instant navigation)
              if (backgroundMusic.isPlaying) {
                console.log('🎵 Stopping background music before continue');
                backgroundMusic.stop(); // Remove await for instant navigation
              }
              
              // Stop direct audio if it exists
              if (directAudioSoundRef.current) {
                try {
                  console.log('🎵 Stopping direct audio before continue');
                  directAudioSoundRef.current.stopAsync();
                  directAudioSoundRef.current.unloadAsync();
                  directAudioSoundRef.current = null;
                } catch (error) {
                  console.error('🎵 Error stopping direct audio before continue:', error);
                }
              }
              
              onContinue();
            }}
          >
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color="white"
            />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Reading Card at Bottom - Expandable */}
        {Platform.OS === 'ios' ? (
          <PanGestureHandler 
            ref={panGestureRef} 
            onGestureEvent={handleSwipeGesture} 
            onHandlerStateChange={handleSwipeGesture} 
            activeOffsetY={[-15, 15]} 
            failOffsetX={[-50, 50]}
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
              {Platform.OS === 'ios' ? (
                <View style={styles.readingCardHeader}>
                  <Text style={styles.cardTitle}>
                    The Sacred Stone
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    At the heart of the Dome sits a large stone believed to be where the Prophet Muhammad began his night journey...
                  </Text>
                </View>
              ) : (
                <View style={styles.collapsedContentWrapper}>
                  <Text style={styles.collapsedTitle}>
                    The Sacred Stone
                  </Text>
                  <Text style={styles.collapsedSubtitle}>
                    At the heart of the Dome sits a large stone believed to be where the Prophet Muhammad began his night journey...
                  </Text>
                </View>
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
                  waitFor={Platform.OS === 'ios' ? panGestureRef : undefined}
                  style={styles.expandedScroll} 
                  showsVerticalScrollIndicator={false}
                  onScroll={handleReadingScroll}
                  scrollEventThrottle={100}
                  scrollEnabled={!isCardGestureActive}
                >
                  <View style={styles.expandedContentInner}>
                    {/* Title Section */}
                    <View style={styles.titleSection}>
                      <Text style={styles.sheetTitle}>
                        The Sacred Stone
                      </Text>
                      <Text style={styles.sheetSubtitle}>
                        Module 3 • Lesson 2
                      </Text>
                    </View>

                    {/* Historical Content */}
                    <View style={styles.historicalSection}>
                      <Text style={styles.sectionTitle}>Historical Context</Text>
                      <Text style={styles.historicalText}>
                        At the heart of the Dome sits a large stone believed to be where the Prophet Muhammad began his night journey to the heavens. The large stone in the Dome of the Rock is sacred to Jews, Christians, and Muslims. Jews believe it's the Foundation Stone where the Temple once stood and where Abraham prepared to sacrifice Isaac. Christians revere it as part of the Temple Mount, central to Jesus' life.
                      </Text>
                    </View>

                    {/* Key Terms Section */}
                    <View style={styles.keyTermsSection}>
                      <Text style={styles.sectionTitle}>Key Terms</Text>
                      <View style={styles.keyTermsContainer}>
                        <KeyTermRow
                          term="Foundation Stone"
                          definition="The sacred stone believed to be where the Temple once stood and Abraham prepared to sacrifice Isaac"
                        />
                        <KeyTermRow
                          term="Night Journey"
                          definition="The Prophet Muhammad's miraculous journey from Mecca to Jerusalem and to the heavens"
                        />
                        <KeyTermRow
                          term="Temple Mount"
                          definition="Sacred site central to Judaism, Christianity, and Islam in Jerusalem"
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
          <View onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
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
              >
                <View style={styles.readingCardHeader}>
                  <Text style={styles.cardTitle}>
                    Inside the Dome: Islamic Art and Architecture
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    The interior showcases Byzantine and Persian influences...
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
                  scrollEnabled={!isCardGestureActive}
                >
                  <View style={styles.expandedContentInner}>
                    {/* Title Section */}
                    <View style={styles.titleSection}>
                      <Text style={styles.sheetTitle}>
                        Inside the Dome: Islamic Art and Architecture
                      </Text>
                      <Text style={styles.sheetSubtitle}>
                        Module 3 • Lesson 2
                      </Text>
                    </View>

                    {/* Historical Content */}
                    <View style={styles.historicalSection}>
                      <Text style={styles.sectionTitle}>Artistic Innovation</Text>
                      <Text style={styles.historicalText}>
                        The interior showcases Byzantine and Persian influences, with intricate mosaics, marble columns, and elaborate Islamic calligraphy. The blend of artistic traditions reflects the multicultural nature of the Umayyad Empire, incorporating elements from conquered Byzantine and Sassanian territories into a distinctly Islamic architectural style.
                      </Text>
                    </View>

                    {/* Key Terms Section */}
                    <View style={styles.keyTermsSection}>
                      <Text style={styles.sectionTitle}>Key Terms</Text>
                      <View style={styles.keyTermsContainer}>
                        <KeyTermRow
                          term="Islamic Calligraphy"
                          definition="Arabic script decorating the interior walls with Quranic verses"
                        />
                        <KeyTermRow
                          term="Byzantine Mosaics"
                          definition="Golden mosaic techniques adapted for Islamic architectural decoration"
                        />
                        <KeyTermRow
                          term="Cultural Synthesis"
                          definition="Blending of Islamic, Byzantine, and Persian artistic traditions"
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

// Key Term Row Component - EXACT Adventure1_Module2_Lesson1: keyTermRow(term:definition:)
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

  // Full screen image container
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
  
  // Text overlay at top - matching Adventure1_Module2_Lesson1 design
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
  collapsedContentWrapper: {
    flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 25, marginTop: -15,
  },
  collapsedTitle: {
    fontFamily: "DM Sans", fontSize: 18, fontWeight: "600", color: "white", marginBottom: 8,
  },
  collapsedSubtitle: {
    fontFamily: "DM Sans", fontSize: 14, color: "white", opacity: 0.8, lineHeight: 20,
  },
});