// TodayVideoLesson.tsx - Custom video player for Today screen only
// Simplified from ReelLesson with progress bar top and Next button always visible

import type { ContentItem } from "@/components/shared/types";
import ArchivesTheme from "@/constants/ArchivesTheme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  GestureHandlerRootView,
  ScrollView as GestureHandlerScrollView,
  PanGestureHandler,
  State,
} from "react-native-gesture-handler";
import RenderHtml from "react-native-render-html";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import VideoPlayer from "../VideoPlayer";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.75;

interface TodayVideoLessonProps {
  contentItem: ContentItem;
  progress: number; // Overall today progress 0-100
  onNext: () => void;
  onDismiss: () => void;
}

export default function TodayVideoLesson({
  contentItem,
  progress,
  onNext,
  onDismiss,
}: TodayVideoLessonProps) {
  const insets = useSafeAreaInsets();

  // Card state - Initially hidden (height 0)
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [hasFinishedReading, setHasFinishedReading] = useState(false);
  const cardHeight = useRef(new Animated.Value(0)).current;

  // Video state
  const [videoCompleted, setVideoCompleted] = useState(false);

  // Gesture refs
  const panGestureRef = useRef(null);

  // Make status bar transparent for fullscreen experience
  useEffect(() => {
    StatusBar.setBarStyle("light-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor("transparent");
      StatusBar.setTranslucent(true);
    }

    return () => {
      StatusBar.setBarStyle("dark-content");
      // Removed StatusBar.setTranslucent(false) to prevent safe area timing issues
    };
  }, []);

  // Expand/collapse card
  const expandCard = () => {
    Animated.spring(cardHeight, {
      toValue: EXPANDED_HEIGHT,
      tension: 80,
      friction: 12,
      useNativeDriver: false,
    }).start();
    setIsCardExpanded(true);
  };

  const collapseCard = () => {
    Animated.spring(cardHeight, {
      toValue: 0, // Hide completely
      tension: 80,
      friction: 12,
      useNativeDriver: false,
    }).start();
    setIsCardExpanded(false);
  };

  // Handle swipe gesture
  const handleSwipeGesture = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      if (event.nativeEvent.velocityY > 500) {
        collapseCard();
      } else if (event.nativeEvent.velocityY < -500) {
        expandCard();
      }
    }
  };

  // Track scroll progress
  const handleReadingScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollPercentage =
      (contentOffset.y / (contentSize.height - layoutMeasurement.height)) * 100;

    if (scrollPercentage >= 95 && !hasFinishedReading) {
      setHasFinishedReading(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  // Video status handler
  const handleVideoStatus = (status: any) => {
    if (status.isLoaded && status.durationMillis && status.positionMillis) {
      const watchedPercentage =
        (status.positionMillis / status.durationMillis) * 100;
      if (watchedPercentage >= 95 && !videoCompleted) {
        setVideoCompleted(true);
      }
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={[]}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* Main Content Area - Video fills entire screen */}
        <View style={ArchivesTheme.common.today.watchModalContainer}>
          {/* Video Background */}
          <View style={ArchivesTheme.common.today.watchVideoContainer}>
            <VideoPlayer
              videoSource={{ uri: contentItem.media_url?.[0] || "" }}
              onPlaybackStatusUpdate={handleVideoStatus}
              autoPlay={true}
              shouldLoop={true}
            />
          </View>

          {/* Fixed Header - Progress Bar (Absolute positioned over video) */}
          <View
            style={{
              position: "absolute",
              top: Platform.OS === "ios" ? 50 : 40,
              left: 0,
              right: 0,
              paddingBottom: 8,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              zIndex: 100,
            }}
          >
            {/* Back Button */}
            <TouchableOpacity
              style={ArchivesTheme.common.today.watchBackButton}
              onPress={onDismiss}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color="white"
              />
            </TouchableOpacity>

            {/* Progress Bar */}
            <View style={{ flex: 1 }}>
              <View style={ArchivesTheme.common.today.watchProgressContainer}>
                <Text
                  style={[
                    ArchivesTheme.common.today.watchProgressLabel,
                    { color: "white" },
                  ]}
                >
                  Progress today
                </Text>
                <Text
                  style={[
                    ArchivesTheme.common.today.watchProgressPercentage,
                    { color: "white" },
                  ]}
                >
                  {progress}%
                </Text>
              </View>
              <View style={ArchivesTheme.common.today.watchProgressBar}>
                <View
                  style={[
                    ArchivesTheme.common.today.watchProgressFill,
                    { width: `${progress}%` },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Reading Card - Hidden initially, expands on "Read" click */}
          {isCardExpanded &&
            (Platform.OS === "ios" ? (
              <PanGestureHandler
                ref={panGestureRef}
                onGestureEvent={handleSwipeGesture}
                onHandlerStateChange={handleSwipeGesture}
                activeOffsetY={[-10, 10]}
                failOffsetX={[-20, 20]}
              >
                <Animated.View
                  style={[
                    ArchivesTheme.common.today.watchCardContainer,
                    { height: cardHeight },
                  ]}
                >
                  <View style={ArchivesTheme.common.today.watchReadingCard}>
                    {/* Card Handle */}
                    <View style={ArchivesTheme.common.today.watchCardHandle} />

                    {/* Expanded Content */}
                    <Animated.View
                      style={ArchivesTheme.common.today.watchExpandedContent}
                    >
                      <GestureHandlerScrollView
                        style={ArchivesTheme.common.today.watchExpandedScroll}
                        showsVerticalScrollIndicator={false}
                        onScroll={handleReadingScroll}
                        scrollEventThrottle={100}
                      >
                        <View
                          style={
                            ArchivesTheme.common.today.watchExpandedContentInner
                          }
                        >
                          {/* Title */}
                          <View
                            style={ArchivesTheme.common.today.watchTitleSection}
                          >
                            <Text
                              style={ArchivesTheme.common.today.watchSheetTitle}
                            >
                              {contentItem.thumbnail_title || "Content"}
                            </Text>
                          </View>

                          {/* HTML Content */}
                          {contentItem.bottom_content?.reading_text && (
                            <View
                              style={
                                ArchivesTheme.common.today
                                  .watchHistoricalSection
                              }
                            >
                              <RenderHtml
                                contentWidth={SCREEN_WIDTH - 40}
                                source={{
                                  html: contentItem.bottom_content.reading_text,
                                }}
                                tagsStyles={{
                                  body: {
                                    color: "white",
                                    fontFamily: "DM Sans",
                                    fontSize: 18,
                                    lineHeight: 20,
                                  },
                                  h1: {
                                    color: "white",
                                    fontFamily: "DM Sans",
                                    fontSize: 24,
                                    fontWeight: "700",
                                    marginBottom: 12,
                                  },
                                  h2: {
                                    color: "white",
                                    fontFamily: "DM Sans",
                                    fontSize: 20,
                                    fontWeight: "700",
                                    marginBottom: 10,
                                  },
                                  h3: {
                                    color: "white",
                                    fontFamily: "DM Sans",
                                    fontSize: 18,
                                    fontWeight: "600",
                                    marginBottom: 8,
                                  },
                                  p: {
                                    color: "white",
                                    fontFamily: "DM Sans",
                                    fontSize: 18,
                                    lineHeight: 20,
                                    marginBottom: 12,
                                  },
                                  strong: {
                                    fontWeight: "600",
                                    color: "white",
                                  },
                                  em: { fontStyle: "italic", color: "white" },
                                }}
                              />
                            </View>
                          )}

                          <View style={{ height: 100 }} />
                        </View>
                      </GestureHandlerScrollView>
                    </Animated.View>
                  </View>
                </Animated.View>
              </PanGestureHandler>
            ) : (
              <PanGestureHandler
                ref={panGestureRef}
                onGestureEvent={handleSwipeGesture}
                onHandlerStateChange={handleSwipeGesture}
                activeOffsetY={[-10, 10]}
                failOffsetX={[-20, 20]}
              >
                <Animated.View
                  style={[
                    ArchivesTheme.common.today.watchCardContainer,
                    { height: cardHeight },
                  ]}
                >
                  <View style={ArchivesTheme.common.today.watchReadingCard}>
                    {/* Card Handle */}
                    <View style={ArchivesTheme.common.today.watchCardHandle} />

                    {/* Expanded Content */}
                    <Animated.View
                      style={ArchivesTheme.common.today.watchExpandedContent}
                    >
                      <GestureHandlerScrollView
                        style={ArchivesTheme.common.today.watchExpandedScroll}
                        showsVerticalScrollIndicator={false}
                        onScroll={handleReadingScroll}
                        scrollEventThrottle={100}
                      >
                        <View
                          style={
                            ArchivesTheme.common.today.watchExpandedContentInner
                          }
                        >
                          {/* Title */}
                          <View
                            style={ArchivesTheme.common.today.watchTitleSection}
                          >
                            <Text
                              style={ArchivesTheme.common.today.watchSheetTitle}
                            >
                              {contentItem.thumbnail_title || "Content"}
                            </Text>
                          </View>

                          {/* HTML Content */}
                          {contentItem.bottom_content?.reading_text && (
                            <View
                              style={
                                ArchivesTheme.common.today
                                  .watchHistoricalSection
                              }
                            >
                              <RenderHtml
                                contentWidth={SCREEN_WIDTH - 40}
                                source={{
                                  html: contentItem.bottom_content.reading_text,
                                }}
                                tagsStyles={{
                                  body: {
                                    color: "white",
                                    fontFamily: "DM Sans",
                                    fontSize: 18,
                                    lineHeight: 20,
                                  },
                                  h1: {
                                    color: "white",
                                    fontFamily: "DM Sans",
                                    fontSize: 24,
                                    fontWeight: "700",
                                    marginBottom: 12,
                                  },
                                  h2: {
                                    color: "white",
                                    fontFamily: "DM Sans",
                                    fontSize: 20,
                                    fontWeight: "700",
                                    marginBottom: 10,
                                  },
                                  h3: {
                                    color: "white",
                                    fontFamily: "DM Sans",
                                    fontSize: 18,
                                    fontWeight: "600",
                                    marginBottom: 8,
                                  },
                                  p: {
                                    color: "white",
                                    fontFamily: "DM Sans",
                                    fontSize: 18,
                                    lineHeight: 20,
                                    marginBottom: 12,
                                  },
                                  strong: {
                                    fontWeight: "600",
                                    color: "white",
                                  },
                                  em: { fontStyle: "italic", color: "white" },
                                }}
                              />
                            </View>
                          )}

                          <View style={{ height: 100 }} />
                        </View>
                      </GestureHandlerScrollView>
                    </Animated.View>
                  </View>
                </Animated.View>
              </PanGestureHandler>
            ))}

          {/* Fixed Bottom Buttons - Float over video, always visible */}
          <View
            style={[
              ArchivesTheme.common.today.watchFloatingButtonContainer,
              { bottom: 0 },
            ]}
          >
            <View style={ArchivesTheme.common.today.watchButtonRow}>
              {/* Read Button - Left */}
              <TouchableOpacity
                style={ArchivesTheme.common.today.watchReadButton}
                onPress={expandCard}
                activeOpacity={0.8}
              >
                <Ionicons name="menu" size={20} color="white" />
                <Text style={ArchivesTheme.common.today.watchReadButtonText}>
                  Read
                </Text>
              </TouchableOpacity>

              {/* Continue Button - Right */}
              <TouchableOpacity
                style={ArchivesTheme.common.today.watchContinueButton}
                onPress={onNext}
                activeOpacity={0.8}
              >
                <Text
                  style={ArchivesTheme.common.today.watchContinueButtonText}
                >
                  Continue
                </Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </GestureHandlerRootView>
    </SafeAreaView>
  );
}
