// ROIERA2Adv1_Module1_Lesson1.tsx - Rise of Islam Era 2: Adventure 1 Module 1 Lesson 1
// "The Early Years" - Meccan Life & Tribal Culture
// Full-screen video lesson with progress bar, reading card, and repositioned controls

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
  Platform,
} from "react-native";
import {
  ScrollView as GestureHandlerScrollView,
  PanGestureHandler,
  State
} from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { useProgress } from "@/context/ProgressContext";
import LessonPlayer from "../LessonPlayer";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const COLLAPSED_HEIGHT = 160;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.85;

interface ROIERA2Adv1_Module1_Lesson1Props {
  onContinue: () => void;
  onDismiss: () => void;
}

export default function ROIERA2Adv1_Module1_Lesson1({
  onContinue,
  onDismiss,
}: ROIERA2Adv1_Module1_Lesson1Props) {
  // Progress context for lesson completion tracking
  const { completeLesson } = useProgress();

  // Removed isPlaying state - now managed by LessonPlayer using expo-video useEvent
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [hasFinishedReading, setHasFinishedReading] = useState(false);
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [hasVideoCompleted, setHasVideoCompleted] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [touchStart, setTouchStart] = useState<{y: number, time: number} | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollViewGestureRef = useRef(null);
  const panGestureRef = useRef(null);

  // Animation values
  const cardHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;
  const progressBarWidth = useRef(new Animated.Value(0)).current;

  // Handle video playback status updates
  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsVideoLoaded(true);

      // Calculate progress percentage
      const progress = (status.positionMillis || 0) / (status.durationMillis || 1);
      setVideoProgress(progress);

      // Ultra-smooth progress bar animation
      Animated.timing(progressBarWidth, {
        toValue: progress,
        duration: 50, // Very short animation for silky smooth transitions
        useNativeDriver: false,
      }).start();

      // Video completion detection
      if (progress >= 0.95 && !hasVideoCompleted) {
        setHasVideoCompleted(true);
        console.log('🎬 ROIERA2Adv1_Module1_Lesson1: Video completed, triggering card pop animation');

        // Trigger card bounce when video finishes
        if (!isCardExpanded) {
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

  // Continue button handler - only works if reading is finished
  const handleContinue = () => {
    if (!hasFinishedReading) {
      console.log("🔄 Continue button pressed but reading not finished");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    // Mark lesson as completed in progress context (Rise of Islam Adventure 6 = ROIERA2Adv1, Module 1, Lesson 1)
    completeLesson(6, 1, "lesson1");
    console.log("🔄 Continue button pressed - ROIERA2Adv1_Module1_Lesson1 completed, proceeding to lesson 2");
    onContinue();
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

    const touchEnd = {
      y: event.nativeEvent.pageY,
      time: Date.now()
    };

    const deltaY = touchStart.y - touchEnd.y;
    const deltaTime = touchEnd.time - touchStart.time;
    const velocity = Math.abs(deltaY) / deltaTime;

    // Detect upward swipe (deltaY > 0 means swiping up)
    if (deltaY > 50 && velocity > 0.3 && !isCardExpanded) {
      console.log("📱 Android upward swipe detected, expanding card");
      expandCard();
    }

    setTouchStart(null);
  };

  // Pan gesture handler for iOS swipe detection
  const handlePanGestureStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationY, velocityY } = event.nativeEvent;

      // Detect upward swipe (negative translationY)
      if (translationY < -50 && velocityY < -500 && !isCardExpanded) {
        console.log("📱 iOS upward swipe detected, expanding card");
        expandCard();
      }
    }
  };

  // Expand card with smooth animation
  const expandCard = () => {
    setIsCardExpanded(true);
    Animated.spring(cardHeight, {
      toValue: EXPANDED_HEIGHT,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Collapse card
  const collapseCard = () => {
    setIsCardExpanded(false);
    Animated.spring(cardHeight, {
      toValue: COLLAPSED_HEIGHT,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Handle scroll to detect when user has read content
  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    setScrollY(contentOffset.y);

    // Check if user has scrolled near the bottom
    const scrollPercent = (contentOffset.y + layoutMeasurement.height) / contentSize.height;
    if (scrollPercent > 0.85 && !hasFinishedReading) {
      setHasFinishedReading(true);
      console.log("📚 ROIERA2Adv1_Module1_Lesson1: User has finished reading content");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Video Player Container */}
      <View style={styles.videoContainer}>
        <LessonPlayer
          videoSource={{ uri: "https://d3bi5e5vkj68.cloudfront.net/Reels/ROI_Adv1_M1_Reel1.mp4" }}
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
                  }),
                },
              ]}
            />
          </View>
        </View>

        {/* Top Controls */}
        <View style={styles.topControls}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onDismiss}
          >
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Reading Card with Android and iOS gesture support */}
      <PanGestureHandler
        ref={panGestureRef}
        onHandlerStateChange={handlePanGestureStateChange}
        simultaneousHandlers={[scrollViewGestureRef]}
      >
        <Animated.View
          style={[
            styles.readingCard,
            {
              height: cardHeight,
              transform: [{ translateY: cardTranslateY }],
            },
          ]}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Card Handle */}
          <View style={styles.cardHandle} />

          {/* Card Header */}
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Meccan Life & Tribal Culture</Text>
            <TouchableOpacity
              style={styles.expandButton}
              onPress={isCardExpanded ? collapseCard : expandCard}
            >
              <Ionicons
                name={isCardExpanded ? "chevron-down" : "chevron-up"}
                size={20}
                color={ArchivesTheme.colors.mutedNavy}
              />
            </TouchableOpacity>
          </View>

          {/* Card Content */}
          <GestureHandlerScrollView
            ref={scrollViewGestureRef}
            style={styles.cardContent}
            showsVerticalScrollIndicator={true}
            scrollEventThrottle={16}
            onScroll={handleScroll}
            simultaneousHandlers={[panGestureRef]}
          >
            <Text style={styles.contentText}>
              Welcome to the Arabian Peninsula in the 6th century CE, a land of desert tribes, bustling trade routes, and ancient traditions. This is the world into which Muhammad ibn Abdullah was born around 570 CE in the sacred city of Mecca.
              {'\n\n'}
              <Text style={styles.sectionHeader}>The City of Mecca</Text>
              {'\n\n'}
              Mecca was no ordinary city. Located in the Hijaz region of the Arabian Peninsula, it served as a crucial crossroads for trade caravans traveling between the Byzantine Empire to the north and the Indian Ocean trade networks to the south. The city&apos;s prosperity came from its strategic position along the frankincense and spice routes that connected Asia, Africa, and Europe.
              {'\n\n'}
              At the heart of Mecca stood the Kaaba, a sacred cube-shaped sanctuary that housed hundreds of idols representing the deities of various Arabian tribes. This made Mecca not just a commercial hub, but also a religious center that attracted pilgrims from across the peninsula during the sacred months when warfare was forbidden.
              {'\n\n'}
              <Text style={styles.sectionHeader}>Tribal Society & Honor</Text>
              {'\n\n'}
              Arabian society was organized around tribes (qaba&apos;il), extended family networks that provided protection, identity, and survival in the harsh desert environment. Each tribe had its own customs, dialects, and allegiances, but they shared common values centered around honor (karama), hospitality (karam), and loyalty.
              {'\n\n'}
              Poetry held a special place in this culture, serving as both entertainment and historical record. Skilled poets were treasured for their ability to preserve tribal genealogies, celebrate victories, and articulate the values that defined Arabian identity.
              {'\n\n'}
              <Text style={styles.sectionHeader}>Trade & Commerce</Text>
              {'\n\n'}
              The Quraysh tribe, to which Muhammad belonged, had gained control over Mecca&apos;s lucrative trade networks. They organized massive caravans that could include hundreds of camels carrying precious goods: silks from China, spices from India, incense from southern Arabia, and ivory from Africa.
              {'\n\n'}
              This trade brought wealth to Mecca but also created significant social inequality. While merchant families like the Banu Hashim (Muhammad&apos;s clan) enjoyed prosperity, many inhabitants struggled with poverty, debt, and social marginalization.
              {'\n\n'}
              <Text style={styles.sectionHeader}>Religious Landscape</Text>
              {'\n\n'}
              The Arabian Peninsula was religiously diverse. While many Arabs practiced polytheism, worshipping tribal deities and natural forces, there were also Christian communities, Jewish tribes, and individuals known as hanifs who rejected idol worship and sought a pure monotheistic faith.
              {'\n\n'}
              This rich tapestry of beliefs, customs, and social structures would profoundly shape the early life of Muhammad and provide the context for the revolutionary message he would later bring to the world.
            </Text>
          </GestureHandlerScrollView>

          {/* Continue Button */}
          <View style={styles.cardFooter}>
            <TouchableOpacity
              style={[
                styles.continueButton,
                hasFinishedReading
                  ? styles.continueButtonEnabled
                  : styles.continueButtonDisabled,
              ]}
              onPress={handleContinue}
              disabled={!hasFinishedReading}
            >
              <Text
                style={[
                  styles.continueButtonText,
                  hasFinishedReading
                    ? styles.continueButtonTextEnabled
                    : styles.continueButtonTextDisabled,
                ]}
              >
                {hasFinishedReading ? "Continue to Lesson 2" : "Finish Reading to Continue"}
              </Text>
              {hasFinishedReading && (
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color="white"
                  style={styles.continueButtonIcon}
                />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </PanGestureHandler>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  videoContainer: {
    flex: 1,
    position: "relative",
  },
  topControls: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  progressBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "transparent",
  },
  progressBarBackground: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: ArchivesTheme.colors.persianOrange,
  },
  readingCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: ArchivesTheme.colors.creamWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  cardHandle: {
    width: 40,
    height: 4,
    backgroundColor: ArchivesTheme.colors.mutedNavy,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 2,
    opacity: 0.3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: ArchivesTheme.colors.mutedNavy,
    fontFamily: "DM Sans",
    flex: 1,
  },
  expandButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ArchivesTheme.colors.creamWhite,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
    shadowColor: ArchivesTheme.colors.shoeBrown,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    color: ArchivesTheme.colors.mutedNavy,
    fontFamily: "DM Sans",
    marginBottom: 24,
  },
  sectionHeader: {
    fontWeight: "600",
    color: ArchivesTheme.colors.shoeBrown,
    fontFamily: "DM Sans",
  },
  cardFooter: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonEnabled: {
    backgroundColor: ArchivesTheme.colors.persianOrange,
    shadowColor: ArchivesTheme.colors.persianOrange,
  },
  continueButtonDisabled: {
    backgroundColor: ArchivesTheme.colors.mutedNavy,
    opacity: 0.6,
    shadowColor: ArchivesTheme.colors.mutedNavy,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "DM Sans",
  },
  continueButtonTextEnabled: {
    color: "white",
  },
  continueButtonTextDisabled: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  continueButtonIcon: {
    marginLeft: 8,
  },
});