// TodayVideoLesson.tsx - Custom media player for Today screen
// Supports: reel (single video), video_carousel (multiple videos), image_carousel (multiple images)

import type { ContentItem } from "@/components/shared/types";
import ArchivesTheme from "@/constants/ArchivesTheme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView, VideoSource } from "expo-video";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { useDeviceHealthMonitor } from "@/hooks/useDeviceHealthMonitor";
import DevHealthOverlay from "@/components/lessons/DevHealthOverlay";
import { analyticsService } from "@/services/AnalyticsService";
import { networkPerformanceService } from "@/services/NetworkPerformanceService";
import AppLogger from "@/services/AppLogger";
import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
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

// Static dimensions - Use "screen" for Android, "window" for iOS (matches adventure pattern)
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get(
  Platform.OS === 'android' ? "screen" : "window"
);

const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.75;

// Video item component for carousel (matches VideoCarouselLesson pattern)
interface TodayVideoItemProps {
  videoUrl: string;
  isActive: boolean;
  shouldLoop: boolean;
  onStatusUpdate?: (status: any) => void;
}

const TodayVideoItem: React.FC<TodayVideoItemProps> = ({
  videoUrl,
  isActive,
  shouldLoop,
  onStatusUpdate,
}) => {
  // Auto-detect HLS for cross-platform compatibility (Android ExoPlayer needs explicit hint)
  const isHLS = videoUrl?.includes('.m3u8') || videoUrl?.includes('/hls/') || videoUrl?.includes('format=m3u8');

  const videoSource: VideoSource = useMemo(
    () => ({
      uri: videoUrl,
      contentType: isHLS ? 'hls' : 'progressive',
    }),
    [videoUrl, isHLS]
  );

  // Performance tracking refs
  const playerCreatedAtRef = useRef<number>(Date.now());
  const hasTrackedLoadTimeRef = useRef(false);
  const hasTrackedErrorRef = useRef(false);

  // Video reliability tracking refs
  const hasTrackedAttemptRef = useRef(false);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTimedOutRef = useRef(false);

  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = shouldLoop;
    player.muted = true;
    // CRITICAL: mixWithOthers prevents ExoPlayer from requesting audio focus
    // Without this, every play() call steals focus from react-native-sound
    player.audioMixingMode = 'mixWithOthers';
    player.showNowPlayingNotification = false;
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  });

  // Video reliability: track attempt + start 30s timeout
  useEffect(() => {
    if (hasTrackedAttemptRef.current || !videoUrl) return;

    const cdnDomain = networkPerformanceService.extractCDNDomain(videoUrl);
    const contentType = isHLS ? 'hls' as const : 'progressive' as const;

    AppLogger.info('video', 'TodayVideoItem: player created', { videoUrl: videoUrl?.substring(0, 80), contentType, isHLS });

    analyticsService.trackVideoLoadAttempted({
      video_url: videoUrl,
      content_type: contentType,
      cdn_domain: cdnDomain,
      trigger: 'auto',
    });
    hasTrackedAttemptRef.current = true;

    loadTimeoutRef.current = setTimeout(() => {
      if (!hasTrackedLoadTimeRef.current && !hasTrackedErrorRef.current && !isUnmountedRef.current) {
        hasTimedOutRef.current = true;
        AppLogger.warn('video', 'TodayVideoItem: 30s load timeout', { videoUrl: videoUrl?.substring(0, 80), contentType });
        analyticsService.trackVideoLoadTimeout({
          video_url: videoUrl,
          elapsed_ms: 30000,
          content_type: contentType,
          cdn_domain: cdnDomain,
          last_known_status: 'loading',
        });
      }
    }, 30000);

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
  }, [videoUrl, isHLS]);

  // Track player status for loading + performance tracking
  const { status, error } = useEvent(player, 'statusChange', { status: player.status });

  // Track every status transition for debugging (rate-limited in AnalyticsService)
  useEffect(() => {
    if (status === 'idle') return; // Skip initial idle — wastes rate-limited budget
    const cdnDomain = networkPerformanceService.extractCDNDomain(videoUrl);
    analyticsService.trackVideoStatusChange({
      video_url: videoUrl,
      status,
      error_code: (error as any)?.code ?? undefined,
      error_message: error?.message,
      time_since_mount_ms: Date.now() - playerCreatedAtRef.current,
      content_type: isHLS ? 'hls' : 'progressive',
      cdn_domain: cdnDomain,
    });
  }, [status, error, videoUrl, isHLS]);

  // Control playback when isActive changes + run speed test
  useEffect(() => {
    // Ensure loop is always set (defensive)
    player.loop = shouldLoop;

    if (isActive) {
      player.play();

      // Run speed test on each slide activation (non-blocking)
      const cdnDomain = networkPerformanceService.extractCDNDomain(videoUrl);
      networkPerformanceService.runSpeedTest().then((speedResult) => {
        if (speedResult && speedResult.downloadSpeedMbps > 0) {
          analyticsService.trackNetworkSpeed({
            download_speed_mbps: speedResult.downloadSpeedMbps,
            content_size_bytes: speedResult.bytesDownloaded,
            load_time_ms: speedResult.durationMs,
            media_type: 'video',
            content_type: isHLS ? 'hls' : 'progressive',
            measurement_method: 'active',
            cdn_domain: cdnDomain,
          });
        }
      }).catch((error) => {
        AppLogger.warn('network', 'Speed test failed in TodayVideoItem', {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    } else {
      player.pause();
    }
  }, [isActive, player, shouldLoop, videoUrl, isHLS]);

  // Unified success/error/abandoned tracking — single useEffect prevents race condition
  // where cleanup fires abandoned before the success flag is set in a separate effect
  const isUnmountedRef = useRef(false);
  useEffect(() => {
    isUnmountedRef.current = false;

    // Clear 30s timeout on terminal states
    if ((status === 'readyToPlay' || status === 'error') && loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }

    // Track readyToPlay (success)
    if (status === 'readyToPlay' && !hasTrackedLoadTimeRef.current && playerCreatedAtRef.current > 0) {
      const loadTimeMs = Date.now() - playerCreatedAtRef.current;
      AppLogger.info('video', 'TodayVideoItem: readyToPlay', { videoUrl: videoUrl?.substring(0, 80), loadTimeMs });
      const cdnDomain = networkPerformanceService.extractCDNDomain(videoUrl);
      analyticsService.trackVideoLoadTime({
        load_time_ms: loadTimeMs,
        video_url: videoUrl,
        content_type: isHLS ? 'hls' : 'progressive',
        cdn_domain: cdnDomain,
        initial_speed_mbps: networkPerformanceService.getLastSpeedTest()?.downloadSpeedMbps,
      });
      hasTrackedLoadTimeRef.current = true;
    }

    // Track error
    if (status === 'error' && !hasTrackedErrorRef.current) {
      const cdnDomain = networkPerformanceService.extractCDNDomain(videoUrl);
      AppLogger.error('video', 'TodayVideoItem player error', {
        videoUrl: videoUrl?.substring(0, 80),
        isHLS,
        cdnDomain,
      });
      analyticsService.trackCDNError({
        media_type: 'video',
        url: videoUrl,
        cdn_domain: cdnDomain,
        error_message: 'today_video_load_error',
      });
      hasTrackedErrorRef.current = true;
    }

    // Cleanup: track abandoned only if no terminal event fired
    return () => {
      isUnmountedRef.current = true;
      if (!hasTrackedLoadTimeRef.current && !hasTrackedErrorRef.current && !hasTimedOutRef.current && hasTrackedAttemptRef.current) {
        AppLogger.warn('video', 'TodayVideoItem: abandoned while loading', { videoUrl: videoUrl?.substring(0, 80), elapsedMs: Date.now() - playerCreatedAtRef.current });
        const cdnDomain = networkPerformanceService.extractCDNDomain(videoUrl);
        analyticsService.trackVideoLoadAbandoned({
          video_url: videoUrl,
          elapsed_ms: Date.now() - playerCreatedAtRef.current,
          content_type: isHLS ? 'hls' : 'progressive',
          cdn_domain: cdnDomain,
          had_any_playback: false,
        });
      }
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
  }, [status, videoUrl, isHLS]);

  // Status updates for progress tracking
  useEffect(() => {
    if (!onStatusUpdate) return;

    const interval = setInterval(() => {
      if (player.status === "readyToPlay" && isActive) {
        const statusData = {
          isLoaded: true,
          isPlaying: player.playing,
          durationMillis: player.duration * 1000,
          positionMillis: player.currentTime * 1000,
        };
        onStatusUpdate(statusData);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [player, onStatusUpdate, isActive]);

  return (
    <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}>
      <VideoView
        player={player}
        style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
        nativeControls={false}
        contentFit={Platform.OS === "android" ? "fill" : "cover"}
        useExoShutter={Platform.OS === "android" ? false : undefined}
        surfaceType={Platform.OS === "android" ? "surfaceView" : undefined}
      />
    </View>
  );
};

interface TodayVideoLessonProps {
  contentItem: ContentItem;
  progress: number; // Overall today progress 0-100
  onMediaPlayed?: () => void;
  onNext: () => void;
  onDismiss: () => void;
}

export default function TodayVideoLesson({
  contentItem,
  progress,
  onMediaPlayed,
  onNext,
  onDismiss,
}: TodayVideoLessonProps) {
  const insets = useSafeAreaInsets();
  const { startMonitoring, stopMonitoring } = useDeviceHealthMonitor();

  // Start device health monitoring on mount
  useEffect(() => {
    startMonitoring({ screen: 'TodayVideoLesson' });
    return () => stopMonitoring();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Background music hook - Auto-play when modal opens
  const backgroundMusic = useBackgroundMusic(
    (contentItem as any).background_music_url
      ? { uri: (contentItem as any).background_music_url }
      : null,
    { volume: 0.5, shouldLoop: true }
  );

  // Determine content type and media URLs
  const contentType = contentItem.content_type || "reel";
  const mediaUrls = Array.isArray(contentItem.media_url)
    ? contentItem.media_url
    : [contentItem.media_url];
  const captions = (contentItem.bottom_content as any)?.captions || [];
  const isCarousel = mediaUrls.length > 1;

  // Carousel state
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  // Card state - Initially hidden (height 0)
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [hasFinishedReading, setHasFinishedReading] = useState(false);
  const cardHeight = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  // Video state
  const [videoCompleted, setVideoCompleted] = useState(false);
  const hasTrackedMediaRef = useRef(false);

  // Gesture refs
  const panGestureRef = useRef(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Carousel scroll handler (like adventure carousels)
  const handleCarouselScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== currentMediaIndex && index >= 0 && index < mediaUrls.length) {
      setCurrentMediaIndex(index);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

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
    setIsCardExpanded(true);
    Animated.parallel([
      Animated.spring(cardHeight, {
        toValue: EXPANDED_HEIGHT,
        tension: 100,
        friction: 15,
        useNativeDriver: false,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const collapseCard = () => {
    setIsCardExpanded(false);
    Animated.parallel([
      Animated.spring(cardHeight, {
        toValue: 0, // Hide completely
        tension: 100,
        friction: 15,
        useNativeDriver: false,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: false,
      }),
    ]).start();
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
      // Track media played on first play
      if (!hasTrackedMediaRef.current && status.isPlaying) {
        hasTrackedMediaRef.current = true;
        onMediaPlayed?.();
      }
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
        {/* Android StatusBar - Match adventure lesson pattern */}
        {Platform.OS === "android" && (
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        )}

        {/* Main Content Area - Video fills entire screen */}
        <View style={[
          ArchivesTheme.common.today.watchModalContainer,
          Platform.OS === 'android' && { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }
        ]}>
          {/* Media Background - Swipeable Carousel */}
          <View style={ArchivesTheme.common.today.watchVideoContainer}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleCarouselScroll}
              scrollEnabled={!isCardExpanded}
              style={{ flex: 1 }}
            >
              {mediaUrls.map((mediaUrl, index) => {
                // LAZY LOADING for videos: Only render current and next video
                // (Images are lightweight, so render all)
                const shouldRenderMedia =
                  contentType === "image_carousel" ||
                  index === currentMediaIndex ||
                  index === currentMediaIndex + 1;

                return (
                  <View key={index} style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}>
                    {contentType === "image_carousel" ? (
                      <Image
                        source={{ uri: mediaUrl || "" }}
                        style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                        contentFit="cover"
                      />
                    ) : shouldRenderMedia ? (
                      <TodayVideoItem
                        videoUrl={mediaUrl || ""}
                        isActive={index === currentMediaIndex}
                        shouldLoop={true}
                        onStatusUpdate={index === currentMediaIndex ? handleVideoStatus : undefined}
                      />
                    ) : (
                      // Placeholder for videos not near current
                      <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: "black" }} />
                    )}

                    {/* Caption Overlay for this media item */}
                    {captions[index] && index === currentMediaIndex && (
                      <View
                        style={{
                          position: "absolute",
                          bottom: 100,
                          left: 16,
                          right: 16,
                          backgroundColor: "rgba(0, 0, 0, 0.6)",
                          borderRadius: 8,
                          padding: 12,
                          zIndex: 5,
                        }}
                      >
                        <Text
                          style={{
                            color: "white",
                            fontFamily: "DM Sans",
                            fontSize: 14,
                            lineHeight: 20,
                            textAlign: "center",
                          }}
                        >
                          {captions[index]}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
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

          {/* Progress Dots - Only for carousels */}
          {isCarousel && (
            <View
              style={{
                position: "absolute",
                top: Platform.OS === "ios" ? 110 : 100,
                left: 0,
                right: 0,
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
                zIndex: 90,
              }}
            >
              {mediaUrls.map((_, index) => (
                <View
                  key={index}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor:
                      index === currentMediaIndex
                        ? "white"
                        : "rgba(255, 255, 255, 0.4)",
                  }}
                />
              ))}
            </View>
          )}

          {/* Reading Card - Always rendered, animated visibility */}
          {Platform.OS === "ios" ? (
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
                  { height: cardHeight, opacity: cardOpacity },
                ]}
              >
                  <TouchableOpacity
                    style={ArchivesTheme.common.today.watchReadingCard}
                    activeOpacity={1}
                    onPress={collapseCard}
                  >
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
                        bounces={false}
                        waitFor={Platform.select({ ios: panGestureRef, default: undefined })}
                      >
                        <View
                          style={
                            ArchivesTheme.common.today.watchExpandedContentInner
                          }
                        >
                          {/* Title */}
                          <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                          <View
                            style={ArchivesTheme.common.today.watchTitleSection}
                          >
                            <Text
                              style={ArchivesTheme.common.today.watchSheetTitle}
                            >
                              {contentItem.thumbnail_title || "Content"}
                            </Text>
                          </View>
                          </TouchableOpacity>

                          {/* HTML Content */}
                          {contentItem.bottom_content?.reading_text && (
                            <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
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
                            </TouchableOpacity>
                          )}

                          <View style={{ height: 100 }} />
                        </View>
                      </GestureHandlerScrollView>
                    </Animated.View>
                  </TouchableOpacity>
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
                    { height: cardHeight, opacity: cardOpacity },
                  ]}
                >
                  <TouchableOpacity
                    style={ArchivesTheme.common.today.watchReadingCard}
                    activeOpacity={1}
                    onPress={collapseCard}
                  >
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
                        bounces={false}
                        waitFor={Platform.select({ ios: panGestureRef, default: undefined })}
                      >
                        <View
                          style={
                            ArchivesTheme.common.today.watchExpandedContentInner
                          }
                        >
                          {/* Title */}
                          <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                          <View
                            style={ArchivesTheme.common.today.watchTitleSection}
                          >
                            <Text
                              style={ArchivesTheme.common.today.watchSheetTitle}
                            >
                              {contentItem.thumbnail_title || "Content"}
                            </Text>
                          </View>
                          </TouchableOpacity>

                          {/* HTML Content */}
                          {contentItem.bottom_content?.reading_text && (
                            <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
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
                            </TouchableOpacity>
                          )}

                          <View style={{ height: 100 }} />
                        </View>
                      </GestureHandlerScrollView>
                    </Animated.View>
                  </TouchableOpacity>
                </Animated.View>
              </PanGestureHandler>
            )}

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
                onPress={() => {
                  if (isCardExpanded) {
                    collapseCard();
                  } else {
                    expandCard();
                  }
                }}
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

        {/* DEV ONLY: Device health + network speed overlay */}
        <DevHealthOverlay />
      </GestureHandlerRootView>
    </SafeAreaView>
  );
}
