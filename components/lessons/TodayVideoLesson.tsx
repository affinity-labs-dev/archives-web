// TodayVideoLesson.tsx - Custom video player for Today screen only
// Simplified from ReelLesson with progress bar top and Next button always visible

import ArchivesTheme from "@/constants/ArchivesTheme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ScrollView as GestureHandlerScrollView,
  PanGestureHandler,
  TapGestureHandler,
  State,
  GestureHandlerRootView
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import VideoPlayer from "./VideoPlayer";
import type { ContentItem } from "@/components/shared/types";
import RenderHtml from 'react-native-render-html';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

const COLLAPSED_HEIGHT = SCREEN_HEIGHT * 0.25;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.75;

interface TodayVideoLessonProps {
  contentItem: ContentItem;
  progress: number;  // Overall today progress 0-100
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

  // Card state
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [hasFinishedReading, setHasFinishedReading] = useState(false);
  const cardHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;

  // Video state
  const [videoCompleted, setVideoCompleted] = useState(false);

  // Gesture refs
  const tapGestureRef = useRef(null);
  const panGestureRef = useRef(null);

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
      toValue: COLLAPSED_HEIGHT,
      tension: 80,
      friction: 12,
      useNativeDriver: false,
    }).start();
    setIsCardExpanded(false);
  };

  // Handle tap gesture
  const handleTapGesture = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      if (isCardExpanded) {
        collapseCard();
      } else {
        expandCard();
      }
    }
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
    const scrollPercentage = (contentOffset.y / (contentSize.height - layoutMeasurement.height)) * 100;

    if (scrollPercentage >= 95 && !hasFinishedReading) {
      setHasFinishedReading(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  // Video status handler
  const handleVideoStatus = (status: any) => {
    if (status.isLoaded && status.durationMillis && status.positionMillis) {
      const watchedPercentage = (status.positionMillis / status.durationMillis) * 100;
      if (watchedPercentage >= 95 && !videoCompleted) {
        setVideoCompleted(true);
      }
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Video Background */}
        <View style={styles.videoContainer}>
          <VideoPlayer
            videoSource={{ uri: contentItem.media_url?.[0] || '' }}
            onPlaybackStatusUpdate={handleVideoStatus}
            autoPlay={true}
            shouldLoop={true}
          />
        </View>

        {/* Back Button */}
        <View style={[styles.backButtonContainer, { top: insets.top + 8 }]}>
          <TouchableOpacity style={styles.backButton} onPress={onDismiss}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Top Progress Bar - Starts after back button */}
        <View style={[styles.topHeader, { top: insets.top + 8, left: 16 + 40 + 12 }]}>
          <View style={styles.progressContainer}>
            <Text style={styles.progressLabel}>Progress today</Text>
            <Text style={styles.progressPercentage}>{progress}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Reading Card */}
        <TapGestureHandler
          ref={tapGestureRef}
          onHandlerStateChange={handleTapGesture}
        >
          {Platform.OS === 'ios' ? (
            <PanGestureHandler
              ref={panGestureRef}
              onGestureEvent={handleSwipeGesture}
              onHandlerStateChange={handleSwipeGesture}
              activeOffsetY={[-10, 10]}
              failOffsetX={[-20, 20]}
              simultaneousHandlers={tapGestureRef}
            >
              <Animated.View style={[styles.cardContainer, { height: cardHeight }]}>
                <View style={styles.readingCard}>
                  {/* Card Handle */}
                  <View style={styles.cardHandle} />

                  {/* Collapsed Content */}
                  {!isCardExpanded && (
                    <View style={styles.collapsedContent}>
                      <Text style={styles.collapsedTitle} numberOfLines={2}>
                        {contentItem.thumbnail_title || 'Content'}
                      </Text>
                      <Text style={styles.collapsedHint}>Tap to read more</Text>
                    </View>
                  )}

                  {/* Expanded Content */}
                  {isCardExpanded && (
                    <Animated.View style={styles.expandedContent}>
                      <GestureHandlerScrollView
                        style={styles.expandedScroll}
                        showsVerticalScrollIndicator={false}
                        onScroll={handleReadingScroll}
                        scrollEventThrottle={100}
                      >
                        <View style={styles.expandedContentInner}>
                          {/* Title */}
                          <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                            <View style={styles.titleSection}>
                              <Text style={styles.sheetTitle}>
                                {contentItem.thumbnail_title || 'Content'}
                              </Text>
                            </View>
                          </TouchableOpacity>

                          {/* HTML Content */}
                          {contentItem.bottom_content?.reading_text && (
                            <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                              <View style={styles.historicalSection}>
                                <RenderHtml
                                  contentWidth={SCREEN_WIDTH - 40}
                                  source={{ html: contentItem.bottom_content.reading_text }}
                                  tagsStyles={{
                                    body: { color: 'white', fontFamily: 'DM Sans', fontSize: 14, lineHeight: 20 },
                                    h1: { color: 'white', fontFamily: 'DM Sans', fontSize: 24, fontWeight: '700', marginBottom: 12 },
                                    h2: { color: 'white', fontFamily: 'DM Sans', fontSize: 20, fontWeight: '700', marginBottom: 10 },
                                    h3: { color: 'white', fontFamily: 'DM Sans', fontSize: 18, fontWeight: '600', marginBottom: 8 },
                                    p: { color: 'white', fontFamily: 'DM Sans', fontSize: 14, lineHeight: 20, marginBottom: 12 },
                                    strong: { fontWeight: '600', color: 'white' },
                                    em: { fontStyle: 'italic', color: 'white' },
                                  }}
                                />
                              </View>
                            </TouchableOpacity>
                          )}

                          <View style={{ height: 16 }} />
                        </View>
                      </GestureHandlerScrollView>
                    </Animated.View>
                  )}

                  {/* Fixed Next Button - Always visible at bottom */}
                  <View style={styles.cardNextContainer}>
                    <TouchableOpacity
                      style={styles.cardNextButton}
                      onPress={onNext}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.cardNextText}>Next</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            </PanGestureHandler>
          ) : (
            <Animated.View style={[styles.cardContainer, { height: cardHeight }]}>
              <View style={styles.readingCard}>
                {/* Same content as iOS */}
                <View style={styles.cardHandle} />

                {!isCardExpanded && (
                  <View style={styles.collapsedContent}>
                    <Text style={styles.collapsedTitle} numberOfLines={2}>
                      {contentItem.thumbnail_title || 'Content'}
                    </Text>
                    <Text style={styles.collapsedHint}>Tap to read more</Text>
                  </View>
                )}

                {isCardExpanded && (
                  <Animated.View style={styles.expandedContent}>
                    <GestureHandlerScrollView
                      style={styles.expandedScroll}
                      showsVerticalScrollIndicator={false}
                      onScroll={handleReadingScroll}
                      scrollEventThrottle={100}
                    >
                      <View style={styles.expandedContentInner}>
                        <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                          <View style={styles.titleSection}>
                            <Text style={styles.sheetTitle}>
                              {contentItem.thumbnail_title || 'Content'}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        {contentItem.bottom_content?.reading_text && (
                          <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                            <View style={styles.historicalSection}>
                              <RenderHtml
                                contentWidth={SCREEN_WIDTH - 40}
                                source={{ html: contentItem.bottom_content.reading_text }}
                                tagsStyles={{
                                  body: { color: 'white', fontFamily: 'DM Sans', fontSize: 14, lineHeight: 20 },
                                  h1: { color: 'white', fontFamily: 'DM Sans', fontSize: 24, fontWeight: '700', marginBottom: 12 },
                                  h2: { color: 'white', fontFamily: 'DM Sans', fontSize: 20, fontWeight: '700', marginBottom: 10 },
                                  h3: { color: 'white', fontFamily: 'DM Sans', fontSize: 18, fontWeight: '600', marginBottom: 8 },
                                  p: { color: 'white', fontFamily: 'DM Sans', fontSize: 14, lineHeight: 20, marginBottom: 12 },
                                  strong: { fontWeight: '600', color: 'white' },
                                  em: { fontStyle: 'italic', color: 'white' },
                                }}
                              />
                            </View>
                          </TouchableOpacity>
                        )}

                        <View style={{ height: 16 }} />
                      </View>
                    </GestureHandlerScrollView>
                  </Animated.View>
                )}

                {/* Fixed Next Button - Always visible at bottom */}
                <View style={styles.cardNextContainer}>
                  <TouchableOpacity
                    style={styles.cardNextButton}
                    onPress={onNext}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cardNextText}>Next</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          )}
        </TapGestureHandler>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  topHeader: {
    position: 'absolute',
    right: 16,
    zIndex: 40,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressPercentage: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: ArchivesTheme.colors.mutedNavy,
    borderRadius: 2,
  },
  backButtonContainer: {
    position: 'absolute',
    left: 16,
    zIndex: 50,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  readingCard: {
    flex: 1,
    backgroundColor: 'rgba(77, 57, 46, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
  },
  cardHandle: {
    width: 70,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  collapsedContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 90, // Space for fixed Next button
  },
  collapsedTitle: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  collapsedHint: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  expandedContent: {
    flex: 1,
    paddingBottom: 90, // Space for fixed Next button
  },
  expandedScroll: {
    flex: 1,
  },
  expandedContentInner: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  titleSection: {
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: 'DM Sans',
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  historicalSection: {
    marginBottom: 16,
  },
  cardNextContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    backgroundColor: 'rgba(77, 57, 46, 0.98)',
  },
  cardNextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ArchivesTheme.colors.mutedNavy,
    paddingVertical: 16,
    borderRadius: 26,
    gap: 8,
  },
  cardNextButtonDisabled: {
    backgroundColor: '#666666',
    opacity: 0.5,
  },
  cardNextText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
