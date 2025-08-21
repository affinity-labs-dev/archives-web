// Adventure1_Module2_Lesson1.tsx - Umayyad Palace Interior Carousel
// Full-screen TabView carousel showing palace interior images

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
  Modal,
} from "react-native";
import { PanGestureHandler, State, ScrollView as GestureHandlerScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { Audio } from 'expo-av';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Adventure1_Module2_Lesson1Props {
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void;
}

// Palace interior data with AWS CloudFront URLs
const palaceInteriors = [
  {
    id: 1,
    imageUrl: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv1_M2_Img01.jpg",
    title: "Throne Room",
    caption: "The throne room glittered with gold mosaics crafted by Byzantine artists, once rivals but now working for the Umayyads."
  },
  {
    id: 2,
    imageUrl: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv1_M2_Img02.jpg",
    title: "Reception Hall", 
    caption: "Striped arches and lamps light the reception hall, a design that influenced buildings like Cordoba's mosque in Spain."
  },
  {
    id: 3,
    imageUrl: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv1_M2_Img03.jpg",
    title: "Private Courtyard Garden",
    caption: "The courtyard's fountains and trees stayed cool thanks to water channels, turning the palace into an oasis."
  },
  {
    id: 4,
    imageUrl: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv1_M2_Img04.jpg",
    title: "Audience Chamber",
    caption: "In the audience chamber, laws and taxes were debated in Arabic, Greek, and Syriac."
  },
  {
    id: 5,
    imageUrl: "https://dzyjrzj2lngmg.cloudfront.net/Images/Adv1_M2_Img05.jpg",
    title: "Scriptorium", 
    caption: "Scribes in the scriptorium copied records, switching between Arabic, Greek, and Syriac."
  }
];

export default function Adventure1_Module2_Lesson1({
  onContinue,
  onDismiss,
  onBack,
}: Adventure1_Module2_Lesson1Props) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showReadContent, setShowReadContent] = useState(false);
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const panGestureRef = useRef(null);
  const scrollViewGestureRef = useRef(null);
  const directAudioSoundRef = useRef<Audio.Sound | null>(null);

  // Animation values for card expansion
  const cardHeight = useRef(new Animated.Value(160)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;

  // Audio source for direct audio testing
  const audioSource = { uri: "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv1_M2_L1_Desert+Whispers.mp3" };

  // Background music hook - Desert Whispers ambience from AWS CloudFront
  const backgroundMusic = useBackgroundMusic(
    { uri: "https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv1_M2_L1_Desert+Whispers.mp3" },
    {
      volume: 0.15, // 15% volume - very low ambient background
      shouldLoop: true,
      fadeInDuration: 1000, // 1 second fade in (reduced from 3 seconds for faster feedback)
      fadeOutDuration: 1500, // 1.5 second fade out
    }
  );

  // Enhanced debug logging for background music
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🎵 [${timestamp}] Adventure1_Module2_Lesson1 - Background music state:`, {
      isLoaded: backgroundMusic.isLoaded,
      isPlaying: backgroundMusic.isPlaying,
      isLoading: backgroundMusic.isLoading
    });
    
    // Additional debugging for audio file loading (AWS CloudFront)
    if (!backgroundMusic.isLoaded && !backgroundMusic.isLoading) {
      console.log('🎵 Audio not loading - AWS CloudFront source should be available');
      console.log('🎵 AWS Audio URL: https://dzyjrzj2lngmg.cloudfront.net/Audios/Adv1_M2_L1_Desert+Whispers.mp3');
    }
  }, [backgroundMusic.isLoaded, backgroundMusic.isPlaying, backgroundMusic.isLoading]);

  // Component mount logging + direct audio fallback
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log('🎵 Adventure1_Module2_Lesson1 component mounted at:', timestamp);
    
    // Force audio start attempt immediately (no setTimeout)
    if (backgroundMusic.isLoaded && !backgroundMusic.isPlaying) {
      console.log('🎵 Attempting immediate audio start on mount');
      backgroundMusic.play().catch(error => {
        console.error('🎵 Immediate audio start failed:', error);
      });
    }
    
    // Direct audio fallback (immediate, no timeout) in case useBackgroundMusic fails
    const directAudioFallback = async () => {
      try {
        console.log('🎵 [DIRECT FALLBACK A1M2L1] Creating direct audio as backup');
        
        const { sound } = await Audio.Sound.createAsync(audioSource, {
          shouldPlay: true,
          volume: 0.15,
          isLooping: true
        });
        
        // Store sound reference for cleanup
        directAudioSoundRef.current = sound;
        
        console.log('🎵 [DIRECT FALLBACK A1M2L1] Direct audio created and playing successfully!');
        
      } catch (error) {
        console.error('🎵 [DIRECT FALLBACK A1M2L1] Direct audio fallback also failed:', error);
      }
    };
    
    // Start direct audio fallback immediately
    directAudioFallback();
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

  // Background music lifecycle management
  useEffect(() => {
    // Start background music when component mounts
    const startBackgroundMusic = async () => {
      const timestamp = new Date().toLocaleTimeString();
      if (backgroundMusic.isLoaded && !backgroundMusic.isPlaying) {
        console.log(`🎵 [${timestamp}] Starting palace ambience background music`);
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

    // Auto-start music when loaded (only if audio source exists)
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

  // Navigate to next image (Swipe button functionality)
  const handleSwipeNext = () => {
    if (currentImageIndex < palaceInteriors.length - 1) {
      const nextIndex = currentImageIndex + 1;
      scrollViewRef.current?.scrollTo({ x: nextIndex * SCREEN_WIDTH, animated: true });
      setCurrentImageIndex(nextIndex);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
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
  };


  return (
    <>
      <StatusBar hidden />
      <View style={styles.container}>
        {/* Main carousel - full screen TabView equivalent */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          style={styles.carousel}
        >
          {palaceInteriors.map((interior, index) => (
            <View key={interior.id} style={styles.imageContainer}>
              {/* Full screen palace interior image */}
              <Image 
                source={{ uri: interior.imageUrl }}
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

        {/* Continue Button - Top Right (only active on final image) */}
        <SafeAreaView style={styles.continueButtonContainer}>
          <TouchableOpacity 
            style={[
              styles.topContinueButton,
              currentImageIndex !== palaceInteriors.length - 1 && styles.topContinueButtonDisabled
            ]}
            onPress={currentImageIndex === palaceInteriors.length - 1 ? () => {
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

        {/* Page indicator dots - centered */}
        {!isCardExpanded && (
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
                  Interiors of the Umayyad Palace
                </Text>
                <Text style={styles.cardSubtitle}>
                  The Umayyad palace in Damascus was called the Green Dome...
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
                        Interiors of the Umayyad Palace
                      </Text>
                      <Text style={styles.sheetSubtitle}>
                        Module 2 • Lesson 1
                      </Text>
                    </View>

                    {/* Historical Content */}
                    <View style={styles.historicalSection}>
                      <Text style={styles.sectionTitle}>Historical Context</Text>
                      <Text style={styles.historicalText}>
                        The Umayyad palace in Damascus was called the Green Dome, or al-Khadra. Muʿawiya built it beside the Umayyad Mosque as a working seat of power, with a coin mint, stables, and a prison. Sources describe a domed audience hall, marble floors, and gardens with fountains, myrtles, and vines. Later rulers still used the complex, but by the 1000s it had vanished, and travelers wrote that markets stood where the palace once was.
                      </Text>
                    </View>

                    {/* Key Terms Section */}
                    <View style={styles.keyTermsSection}>
                      <Text style={styles.sectionTitle}>Key Terms</Text>
                      <View style={styles.keyTermsContainer}>
                        <KeyTermRow
                          term="Green Dome (al-Khadra)"
                          definition="The name of the Umayyad palace complex built by Muʿawiya in Damascus"
                        />
                        <KeyTermRow
                          term="Audience Hall"
                          definition="The domed reception room with marble floors where the caliph met visitors"
                        />
                        <KeyTermRow
                          term="Working Palace"
                          definition="A palace complex with coin mint, stables, and prison for government operations"
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
  
  // Text overlay at top - matching iOS design
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
    backgroundColor: "rgba(0,0,0,0.3)", // Gray when disabled
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