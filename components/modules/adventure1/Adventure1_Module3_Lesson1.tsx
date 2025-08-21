// Adventure1_Module3_Lesson1.tsx - Trade Routes Through Damascus
// Static map view with Read modal showing Damascus trade routes and cultural exchange

import ArchivesTheme from "@/constants/ArchivesTheme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState, useRef } from "react";
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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
  const panGestureRef = useRef(null);
  const scrollViewGestureRef = useRef(null);

  // Animation values for card expansion
  const cardHeight = useRef(new Animated.Value(160)).current;
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

  // Handle swipe gestures to expand/collapse the card
  const handleSwipeGesture = (event: any) => {
    const { translationY, velocityY, state } = event.nativeEvent;

    if (state === State.END || state === State.CANCELLED) {
      if (!isCardExpanded) {
        // Card is collapsed - swipe up to expand
        if (translationY < -30 || velocityY < -300) {
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
        {/* Main Damascus map - completely full screen */}
        <Image 
          source={{ uri: "https://dzyjrzj2lngmg.cloudfront.net/Images/Interactive+map.jpg" }}
          style={styles.mapImage}
          resizeMode="cover"
        />
        
        {/* Text overlay at the top */}
        <View style={styles.textOverlay}>
          <Text style={styles.overlayText}>
            Trade Routes Through Damascus
          </Text>
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
                    Trade Routes Through Damascus
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    Damascus was more than a capital; it sat at the intersection of ancient roads...
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
                          Trade Routes Through Damascus
                        </Text>
                        <Text style={styles.sheetSubtitle}>
                          Module 3 • Lesson 1
                        </Text>
                      </View>

                      {/* Historical Content */}
                      <View style={styles.historicalSection}>
                        <Text style={styles.sectionTitle}>Historical Context</Text>
                        <Text style={styles.historicalText}>
                          Damascus was more than a capital; it sat at the intersection of ancient roads. The King&apos;s Highway ran up through the deserts and highlands to the city, bringing caravans from Arabia and the Red Sea. Traders slept in khans, courtyard inns with stables, storage rooms, and a well. There they rested animals, stored goods, and swapped news before entering the busy markets.
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

  // Main map image - full screen
  mapImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'absolute',
    top: 0,
    left: 0,
  },

  // Text overlay at the top
  textOverlay: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  overlayText: {
    fontFamily: 'DM Sans',
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    lineHeight: 26,
    textShadowColor: 'black',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    shadowColor: 'black',
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },

  // Back Button - Top Left
  backButtonContainer: {
    position: 'absolute',
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Continue Button - Top Right
  continueButtonContainer: {
    position: 'absolute',
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
    justifyContent: 'center',
    alignItems: 'center',
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
});