// ROIERA2Adv1_Module1_Lesson2.tsx - Rise of Islam Era 2: Adventure 1 Module 1 Lesson 2
// "The Early Years" - Pre-Islamic Arabian Life in Mecca Video Carousel
// Video carousel with expandable reading card showing trade, poetry, and faith

import ArchivesTheme from "@/constants/ArchivesTheme";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
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
  State,
} from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get(Platform.OS === 'android' ? "screen" : "window");

interface ROIERA2Adv1_Module1_Lesson2Props {
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void;
}

interface MediaContent {
  id: number;
  videoUrl: string;
  caption: string;
}

// Media content with AWS CloudFront video URLs for Rise of Islam Era
const mediaContents: MediaContent[] = [
  {
    id: 1,
    videoUrl: "http://d3bi5e5vkj68.cloudfront.net/Carousel-videos/ROI_Adv1_M1_Media2_Video1.mp4",
    caption: "Mecca was an important resting point for caravans carrying goods between Yemen in the south and Syria in the north, making it a center of trade.",
  },
  {
    id: 2,
    videoUrl: "http://d3bi5e5vkj68.cloudfront.net/Carousel-videos/ROI_Adv1_M1_Media2_Video2.mp4",
    caption: "The Quraysh tribe controlled Mecca&apos;s trade routes, organizing massive caravans that brought wealth and connected different cultures.",
  },
  {
    id: 3,
    videoUrl: "http://d3bi5e5vkj68.cloudfront.net/Carousel-videos/ROI_Adv1_M1_Media2_Video3.mp4",
    caption: "Poetry was central to Arab culture, preserving history, expressing honor, and celebrating the values that defined tribal identity.",
  },
  {
    id: 4,
    videoUrl: "http://d3bi5e5vkj68.cloudfront.net/Carousel-videos/ROI_Adv1_M1_Media2_Video4.mp4",
    caption: "While many worshipped tribal gods at the Kaaba, some seekers called hanifs rejected idolatry and searched for pure monotheistic faith.",
  },
];

const COLLAPSED_HEIGHT = 120;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.4;

export default function ROIERA2Adv1_Module1_Lesson2({
  onContinue,
  onDismiss,
  onBack,
}: ROIERA2Adv1_Module1_Lesson2Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [hasFinishedViewing, setHasFinishedViewing] = useState(false);
  const [viewedVideos, setViewedVideos] = useState<Set<number>>(new Set());
  const [scrollY, setScrollY] = useState(0);
  const [touchStart, setTouchStart] = useState<{y: number, time: number} | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollViewGestureRef = useRef(null);
  const panGestureRef = useRef(null);

  // Animation values
  const cardHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;

  // Background music with dynamic cross-fading
  const { setBackgroundMusic, cleanupMusic } = useBackgroundMusic();

  useEffect(() => {
    // Set atmospheric background music for Ancient Arabian setting
    setBackgroundMusic("https://d3bi5e5vkj68.cloudfront.net/Music/ancient-arabian-ambience.mp3", {
      volume: 0.4,
      isLooping: true,
      fadeInDuration: 2000
    });

    return () => {
      cleanupMusic();
    };
  }, [setBackgroundMusic, cleanupMusic]);

  // Create video players for each media content
  const player1 = useVideoPlayer(mediaContents[0].videoUrl, player => {
    player.loop = true;
    player.muted = false;
    player.volume = 0.8;
    player.play();
  });

  const player2 = useVideoPlayer(mediaContents[1].videoUrl, player => {
    player.loop = true;
    player.muted = false;
    player.volume = 0.8;
  });

  const player3 = useVideoPlayer(mediaContents[2].videoUrl, player => {
    player.loop = true;
    player.muted = false;
    player.volume = 0.8;
  });

  const videoPlayers = [player1, player2, player3];

  // Handle swipe to next/previous video
  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'left' && currentIndex < mediaContents.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);

      // Pause current video and play next
      videoPlayers[currentIndex]?.pause();
      videoPlayers[newIndex]?.play();

      // Track viewed video
      setViewedVideos(prev => new Set(prev).add(newIndex));

      console.log(`📱 Swiped to video ${newIndex + 1}`);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (direction === 'right' && currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);

      // Pause current video and play previous
      videoPlayers[currentIndex]?.pause();
      videoPlayers[newIndex]?.play();

      console.log(`📱 Swiped to video ${newIndex + 1}`);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Navigation button handlers
  const handlePrevious = () => {
    if (currentIndex > 0) {
      handleSwipe('right');
    }
  };

  const handleNext = () => {
    if (currentIndex < mediaContents.length - 1) {
      handleSwipe('left');
    }
  };

  // Check if user has viewed enough content
  useEffect(() => {
    // Mark as viewed when user reaches the last video or has seen at least 3 videos
    if (currentIndex === mediaContents.length - 1 || viewedVideos.size >= 3) {
      if (!hasFinishedViewing) {
        setHasFinishedViewing(true);
        console.log("🎬 ROIERA2Adv1_Module1_Lesson2: User has finished viewing content");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, [currentIndex, viewedVideos.size, hasFinishedViewing]);

  // Custom touch handlers for card expansion (Android)
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

  // Pan gesture handler for card expansion (iOS)
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
    if (scrollPercent > 0.85 && !hasFinishedViewing) {
      setHasFinishedViewing(true);
      console.log("📚 ROIERA2Adv1_Module1_Lesson2: User has finished reading content");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleContinue = () => {
    if (!hasFinishedViewing) {
      console.log("🔄 Continue button pressed but content not fully viewed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    console.log("🔄 Continue button pressed - ROIERA2Adv1_Module1_Lesson2 completed, proceeding to quiz");
    onContinue();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Video Carousel Container */}
      <View style={styles.videoContainer}>
        {/* Current Video */}
        <VideoView
          player={videoPlayers[currentIndex]}
          style={styles.video}
          contentFit="cover"
          nativeControls={false}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
        />

        {/* Top Controls */}
        <View style={styles.topControls}>
          <TouchableOpacity style={styles.backButton} onPress={onBack || onDismiss}>
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
        </View>

        {/* Video Navigation */}
        <View style={styles.videoNavigation}>
          <TouchableOpacity
            style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
            onPress={handlePrevious}
            disabled={currentIndex === 0}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>

          <View style={styles.videoIndicators}>
            {mediaContents.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  index === currentIndex && styles.indicatorActive,
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.navButton,
              currentIndex === mediaContents.length - 1 && styles.navButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={currentIndex === mediaContents.length - 1}
          >
            <Ionicons name="chevron-forward" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Video Caption */}
        <View style={styles.captionContainer}>
          <Text style={styles.captionText}>
            {mediaContents[currentIndex].caption}
          </Text>
        </View>
      </View>

      {/* Reading Card */}
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
            <Text style={styles.cardTitle}>Pre-Islamic Arabia</Text>
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
              The videos you&apos;re viewing show the rich cultural tapestry of pre-Islamic Arabia, a world that would profoundly shape the early life of Muhammad ibn Abdullah.
              {'\n\n'}
              <Text style={styles.sectionHeader}>Trade Networks & Commerce</Text>
              {'\n\n'}
              Mecca&apos;s strategic location made it a vital hub in the ancient world&apos;s trade networks. Caravans carrying frankincense from Dhofar, spices from India, silk from China, and ivory from Africa would stop in Mecca to rest, resupply, and trade.
              {'\n\n'}
              The Quraysh tribe had expertly organized these trade operations, creating partnerships with Byzantine merchants to the north and South Arabian kingdoms to the south. This trade brought tremendous wealth but also exposed Meccans to diverse cultures, languages, and ideas.
              {'\n\n'}
              <Text style={styles.sectionHeader}>The Power of Poetry</Text>
              {'\n\n'}
              In a largely illiterate society, poetry served as the primary means of preserving history, expressing emotions, and articulating tribal values. Skilled poets were revered figures who could elevate their tribe&apos;s reputation or devastate enemies with their words.
              {'\n\n'}
              The annual poetry competitions at markets like Ukaz drew participants from across Arabia. Winning poems were sometimes inscribed in gold and hung on the Kaaba, earning the title &quot;al-Mu&apos;allaqat&quot; (the suspended ones).
              {'\n\n'}
              <Text style={styles.sectionHeader}>Religious Diversity</Text>
              {'\n\n'}
              While the Kaaba housed hundreds of tribal idols, Arabian religious life was more complex than simple polytheism. There were Christian communities, especially in Najran and among some Bedouin tribes. Jewish communities had established themselves in places like Yathrib (later Medina) and Khaybar.
              {'\n\n'}
              Most intriguingly, there were individuals known as hanifs—monotheistic seekers who rejected both idol worship and formal Christianity or Judaism. They believed in one God (Allah) and often retreated to caves for meditation and spiritual contemplation.
              {'\n\n'}
              <Text style={styles.sectionHeader}>Social Structures</Text>
              {'\n\n'}
              Arabian society was built around kinship and tribal loyalty. While this system provided protection and identity, it also created cycles of revenge, blood feuds, and social inequality. The wealthy merchant families enjoyed prosperity while many struggled with debt and marginalization.
              {'\n\n'}
              Into this complex world of trade, poetry, diverse faiths, and tribal politics, Muhammad was born—a world that would both shape his character and provide the context for the revolutionary message he would later bring.
            </Text>
          </GestureHandlerScrollView>

          {/* Continue Button */}
          <View style={styles.cardFooter}>
            <TouchableOpacity
              style={[
                styles.continueButton,
                hasFinishedViewing
                  ? styles.continueButtonEnabled
                  : styles.continueButtonDisabled,
              ]}
              onPress={handleContinue}
              disabled={!hasFinishedViewing}
            >
              <Text
                style={[
                  styles.continueButtonText,
                  hasFinishedViewing
                    ? styles.continueButtonTextEnabled
                    : styles.continueButtonTextDisabled,
                ]}
              >
                {hasFinishedViewing ? "Continue to Quiz" : "View All Content to Continue"}
              </Text>
              {hasFinishedViewing && (
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
  video: {
    width: "100%",
    height: "100%",
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
  videoNavigation: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  videoIndicators: {
    flexDirection: "row",
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  indicatorActive: {
    backgroundColor: ArchivesTheme.colors.persianOrange,
  },
  captionContainer: {
    position: "absolute",
    top: "50%",
    left: 20,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 12,
    padding: 16,
    zIndex: 5,
  },
  captionText: {
    color: "white",
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
    fontFamily: "DM Sans",
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