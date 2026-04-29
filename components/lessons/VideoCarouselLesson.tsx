// VideoCarouselLesson.tsx - Reusable Video Carousel lesson for all eras
// Accepts data from adventures.content_list and injects dynamically
// Full-screen TabView carousel showing video series

import ArchivesTheme from "@/constants/ArchivesTheme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEvent } from 'expo';
import { VideoView, useVideoPlayer, VideoSource } from 'expo-video';
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import React, { useRef, useState, useEffect, useMemo } from "react";
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
  GestureHandlerRootView,
  ScrollView as GestureHandlerScrollView,
  PanGestureHandler,
  TapGestureHandler,
  State,
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LoadingOverlay from "@/components/shared/LoadingOverlay";
import type { ContentItem } from "@/components/shared/types";
import RenderHtml from 'react-native-render-html';
import { LESSON_CONSTANTS } from "./LessonConstants";
import { Image as ExpoImage } from "expo-image";
import { useLessonBase } from "@/hooks/useLessonBase";
import { useDeviceHealthMonitor } from "@/hooks/useDeviceHealthMonitor";
import AppLogger from '@/services/AppLogger';
import { analyticsService } from '@/services/AnalyticsService';
import { networkPerformanceService } from '@/services/NetworkPerformanceService';

// Static dimensions (module-level) - Umayyad Dynasty pattern
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get(
  Platform.OS === 'android' ? "screen" : "window"
);

// Responsive card heights (module-level)
const COLLAPSED_HEIGHT = SCREEN_HEIGHT * LESSON_CONSTANTS.READING_CARD.COLLAPSED_HEIGHT_RATIO;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * LESSON_CONSTANTS.READING_CARD.EXPANDED_HEIGHT_RATIO;

interface VideoCarouselLessonProps {
  contentItem: ContentItem;  // Data from adventures.content_list
  adventureId: string;       // e.g., "roi_adventure_1"
  moduleId: string;          // e.g., "ROI_Adv1_M1"
  lessonId: string;          // e.g., "lesson2"
  eraId: string;             // Era ID (e.g., "rise_of_islam", "umayyad")
  eraName: string;           // Era display name
  onContinue: () => void;
  onDismiss: () => void;
  onBack?: () => void;
}

// Video carousel item component with hooks at top level
interface VideoItemProps {
  videoUrl: string;
  caption: string;
  index: number;
  isActive: boolean;
  onReady?: () => void;  // Callback when video is ready to play
}

// Helper to detect content type based on URL (HLS vs progressive MP4)
const getContentType = (url: string): 'hls' | 'progressive' => {
  if (url?.includes('.m3u8') || url?.includes('/hls/') || url?.includes('format=m3u8')) {
    return 'hls';
  }
  return 'progressive'; // MP4 and other formats
};

const VideoCarouselItem: React.FC<VideoItemProps> = ({ videoUrl, caption, isActive, onReady }) => {
  // Simplified video source - caching/contentType can cause issues in Expo Go
  const videoSource: VideoSource = useMemo(() => ({
    uri: videoUrl,
  }), [videoUrl]);

  // AFF-579: Record player creation time for load time measurement
  const playerCreatedAtRef = useRef<number>(Date.now());
  const hasTrackedLoadTimeRef = useRef(false);
  const hasTrackedErrorRef = useRef(false);

  // Video reliability tracking refs
  const hasTrackedAttemptRef = useRef(false);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTimedOutRef = useRef(false);

  // AFF-612: Video completion tracking
  const maxPositionRef = useRef(0);
  const videoDurationRef = useRef(0);
  const watchStartTimeRef = useRef<number>(0);
  const hasTrackedCompletionRef = useRef(false);

  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = true;
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

    const contentType = getContentType(videoUrl);
    const cdnDomain = networkPerformanceService.extractCDNDomain(videoUrl);

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
  }, [videoUrl]);

  // Track player status for loading indicator
  const { status, error } = useEvent(player, 'statusChange', { status: player.status });
  const isVideoReady = status === 'readyToPlay';

  // Track every status transition for debugging (rate-limited in AnalyticsService)
  useEffect(() => {
    if (status === 'idle') return;
    const contentType = getContentType(videoUrl);
    const cdnDomain = networkPerformanceService.extractCDNDomain(videoUrl);
    analyticsService.trackVideoStatusChange({
      video_url: videoUrl,
      status,
      error_code: (error as any)?.code ?? undefined,
      error_message: error?.message,
      time_since_mount_ms: Date.now() - playerCreatedAtRef.current,
      content_type: contentType,
      cdn_domain: cdnDomain,
    });
  }, [status, error, videoUrl]);

  useEffect(() => {
    if (isActive) {
      player.play();
      // AFF-612: Reset watch timer when slide becomes active
      watchStartTimeRef.current = Date.now();
      hasTrackedCompletionRef.current = false;
      maxPositionRef.current = 0;

      // Run speed test on each slide change (non-blocking)
      // Skipped if a test is already in-flight
      const contentType = getContentType(videoUrl);
      const cdnDomain = networkPerformanceService.extractCDNDomain(videoUrl);
      networkPerformanceService.runSpeedTest().then((speedResult) => {
        if (speedResult && speedResult.downloadSpeedMbps > 0) {
          analyticsService.trackNetworkSpeed({
            download_speed_mbps: speedResult.downloadSpeedMbps,
            content_size_bytes: speedResult.bytesDownloaded,
            load_time_ms: speedResult.durationMs,
            media_type: 'video',
            content_type: contentType,
            measurement_method: 'active',
            cdn_domain: cdnDomain,
          });
        }
      }).catch(() => {});
    } else {
      player.pause();
      // AFF-612: Fire completion when user swipes away from this video
      if (watchStartTimeRef.current > 0 && videoDurationRef.current > 0 && !hasTrackedCompletionRef.current) {
        const completionRate = Math.min(maxPositionRef.current / videoDurationRef.current, 1.0);
        const contentType = getContentType(videoUrl);
        analyticsService.trackVideoCompletion({
          completion_rate: completionRate,
          watch_duration_ms: Date.now() - watchStartTimeRef.current,
          video_duration_ms: videoDurationRef.current * 1000,
          video_url: videoUrl,
          content_type: contentType,
          cdn_domain: networkPerformanceService.extractCDNDomain(videoUrl),
        });
        hasTrackedCompletionRef.current = true;
      }
    }
  }, [isActive, player, videoUrl]);

  // AFF-612: Poll player position for max position tracking
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      try {
        if (player.status === 'readyToPlay') {
          const currentTime = player.currentTime;
          const duration = player.duration;
          if (Number.isFinite(currentTime) && Number.isFinite(duration) && duration > 0) {
            maxPositionRef.current = Math.max(maxPositionRef.current, currentTime);
            videoDurationRef.current = duration;
          }
        }
      } catch {
        // Player released mid-interval — safe to ignore, cleanup will clear interval
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isActive, player]);

  // Unified success/error/abandoned tracking — single useEffect prevents race condition
  // where cleanup fires abandoned before the success flag is set in a separate effect
  const isUnmountedRef = useRef(false);
  useEffect(() => {
    isUnmountedRef.current = false;

    if (isVideoReady) {
      onReady?.();

      // Clear 30s timeout — video loaded successfully
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }

      // AFF-579: Track video load time
      if (!hasTrackedLoadTimeRef.current && playerCreatedAtRef.current > 0) {
        const loadTimeMs = Date.now() - playerCreatedAtRef.current;
        const contentType = getContentType(videoUrl);
        const cdnDomain = networkPerformanceService.extractCDNDomain(videoUrl);
        analyticsService.trackVideoLoadTime({
          load_time_ms: loadTimeMs,
          video_url: videoUrl,
          content_type: contentType,
          cdn_domain: cdnDomain,
          initial_speed_mbps: networkPerformanceService.getLastSpeedTest()?.downloadSpeedMbps,
        });
        hasTrackedLoadTimeRef.current = true;

        // Run speed test when this slide becomes active (not for pre-rendered next slide)
        if (isActive) {
          networkPerformanceService.runSpeedTest().then((speedResult) => {
            analyticsService.trackNetworkSpeed({
              download_speed_mbps: speedResult?.downloadSpeedMbps,
              content_size_bytes: speedResult?.bytesDownloaded,
              load_time_ms: loadTimeMs,
              media_type: 'video',
              content_type: contentType,
              measurement_method: 'active',
              cdn_domain: cdnDomain,
            });
          }).catch(() => {
            // Speed test failed — non-critical, ignore
          });
        }
      }
    }

    // Clear 30s timeout on error
    if (status === 'error' && loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }

    // AFF-579: Track CDN errors (once per video)
    if (status === 'error' && !hasTrackedErrorRef.current) {
      const errorMsg = (player as any).error?.message || (player as any).error?.toString() || 'carousel_video_load_error';
      analyticsService.trackCDNError({
        media_type: 'video',
        url: videoUrl,
        cdn_domain: networkPerformanceService.extractCDNDomain(videoUrl),
        error_message: errorMsg,
      });
      hasTrackedErrorRef.current = true;
    }

    // Cleanup: abandoned + completion on unmount
    return () => {
      isUnmountedRef.current = true;
      // Video reliability: track abandoned if never loaded
      if (!hasTrackedLoadTimeRef.current && !hasTrackedErrorRef.current && !hasTimedOutRef.current && hasTrackedAttemptRef.current) {
        const contentType = getContentType(videoUrl);
        analyticsService.trackVideoLoadAbandoned({
          video_url: videoUrl,
          elapsed_ms: Date.now() - playerCreatedAtRef.current,
          content_type: contentType,
          cdn_domain: networkPerformanceService.extractCDNDomain(videoUrl),
          had_any_playback: false,
        });
      }

      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }

      if (!hasTrackedCompletionRef.current && watchStartTimeRef.current > 0 && videoDurationRef.current > 0) {
        const completionRate = Math.min(maxPositionRef.current / videoDurationRef.current, 1.0);
        const contentType = getContentType(videoUrl);
        analyticsService.trackVideoCompletion({
          completion_rate: completionRate,
          watch_duration_ms: Date.now() - watchStartTimeRef.current,
          video_duration_ms: videoDurationRef.current * 1000,
          video_url: videoUrl,
          content_type: contentType,
          cdn_domain: networkPerformanceService.extractCDNDomain(videoUrl),
        });
        hasTrackedCompletionRef.current = true;
      }
    };
  }, [isVideoReady, status, onReady, videoUrl, player, isActive]);

  return (
    <View style={styles.videoContainer}>
      <VideoView
        player={player}
        style={styles.video}
        nativeControls={false}
        contentFit={Platform.OS === 'android' ? "fill" : "cover"}
        useExoShutter={Platform.OS === 'android' ? false : undefined}
        surfaceType={Platform.OS === 'android' ? "surfaceView" : undefined}
      />

      {/* Text overlay with caption */}
      <View style={styles.textOverlay}>
        <Text style={styles.captionText}>{caption}</Text>
      </View>
    </View>
  );
};

export default function VideoCarouselLesson({
  contentItem,
  adventureId,
  moduleId,
  lessonId,
  eraId,
  eraName,
  onContinue,
  onDismiss,
  onBack,
}: VideoCarouselLessonProps) {
  // Safe area insets for proper button positioning
  const insets = useSafeAreaInsets();

  // Shared lesson setup (analytics, walkthrough check, completion handler)
  const {
    walkthroughEnabled,
    tracking: { trackCardExpanded },
    handleLessonComplete,
  } = useLessonBase({
    contentItem,
    adventureId,
    moduleId,
    lessonId,
    lessonType: 'video_carousel',
    eraId,
    eraName,
    onContinue,
  });

  // AFF-618: Monitor device health (memory + CPU) during video playback
  const { startMonitoring, stopMonitoring } = useDeviceHealthMonitor();
  useEffect(() => {
    startMonitoring({ screen: 'VideoCarouselLesson', eraId, adventureId, moduleId, lessonId });
    return () => { stopMonitoring(); };
  }, [eraId, adventureId, moduleId, lessonId, startMonitoring, stopMonitoring]);

  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showReadContent, setShowReadContent] = useState(false);
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollViewGestureRef = useRef(null);
  const panGestureRef = useRef(null);
  const tapGestureRef = useRef(null);
  const horizontalSwipeRef = useRef(null);
  const [isCardGestureActive, setIsCardGestureActive] = useState(false);

  // Walkthrough hint states (walkthroughEnabled comes from useLessonBase)
  const [showContinueHint, setShowContinueHint] = useState(false);

  // Loading state for first video
  const [isFirstVideoReady, setIsFirstVideoReady] = useState(false);

  // Animation values
  const cardHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;

  // Background music hook - Auto-play immediately if URL exists
  const backgroundMusic = useBackgroundMusic(
    contentItem.background_music_url ? { uri: contentItem.background_music_url } : null,
    { volume: 0.5, shouldLoop: true }
  );

  // Extract videos and captions from contentItem
  const videos = contentItem.media_url || [];
  const captions = contentItem.bottom_content?.carousel_captions || [];

  // Show continue hint when on last video (walkthrough check handled by useLessonBase)
  useEffect(() => {
    if (walkthroughEnabled && currentVideoIndex === videos.length - 1) {
      setShowContinueHint(true);
      if (__DEV__) {
        console.log('👁️ Continue hint shown - last video reached');
      }
    } else {
      setShowContinueHint(false);
    }
  }, [walkthroughEnabled, currentVideoIndex, videos.length]);

  // Debug logging for carousel scroll state
  useEffect(() => {
    if (__DEV__) {
      console.log(
        `🎠 Carousel scroll state: ${
          isCardGestureActive
            ? "🔒 BLOCKED (card gesture active)"
            : "✅ ENABLED (can swipe videos)"
        }`
      );
    }
  }, [isCardGestureActive]);

  // Safety mechanism: Reset gesture state if stuck
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isCardGestureActive) {
        AppLogger.warn('content', 'Safety reset: clearing stuck gesture state');
        setIsCardGestureActive(false);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isCardExpanded]);

  // Handle carousel scroll
  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const videoIndex = Math.round(contentOffsetX / SCREEN_WIDTH);

    if (videoIndex !== currentVideoIndex) {
      setCurrentVideoIndex(videoIndex);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Tap Gesture Handler (cross-platform)
  const handleTapGesture = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      if (__DEV__) {
        console.log('👆 Tap detected on reading card');
      }
      if (isCardExpanded) {
        collapseCard();
      } else {
        expandCard();
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Swipe gesture handler (cross-platform)
  const handleSwipeGesture = (event: any) => {
    const { state, translationY, velocityY } = event.nativeEvent;

    if (state === State.BEGAN || state === State.ACTIVE) {
      setIsCardGestureActive(true);
      if (__DEV__) {
        console.log("📱 Card gesture started - blocking carousel");
      }
    }

    if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      if (__DEV__) {
        console.log("📱 Gesture state:", state, {
          translationY,
          velocityY,
          isCardExpanded,
        });
      }

      if (state === State.END) {
        const minDistance = 20;
        const minVelocity = 300;

        if (
          !isCardExpanded &&
          (translationY < -minDistance || velocityY < -minVelocity)
        ) {
          if (__DEV__) {
            console.log("📱 Swipe up detected - expanding card");
          }
          expandCard();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          return;
        } else if (
          isCardExpanded &&
          (translationY > minDistance || velocityY > minVelocity)
        ) {
          if (__DEV__) {
            console.log("📱 Swipe down detected - collapsing card");
          }
          collapseCard();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          return;
        }
      }

      setIsCardGestureActive(false);
      if (__DEV__) {
        console.log("📱 Gesture ended - carousel re-enabled");
      }
    }
  };

  // Expand card
  const expandCard = () => {
    if (__DEV__) {
      console.log("🎬 Card expansion starting...");
    }
    setIsCardExpanded(true);
    setShowReadContent(true);

    // Track reading card expansion
    trackCardExpanded();

    setIsCardGestureActive(false);
    if (__DEV__) {
      console.log("🎬 Carousel re-enabled IMMEDIATELY ✅");
    }

    Animated.parallel([
      Animated.spring(cardHeight, {
        toValue: EXPANDED_HEIGHT,
        useNativeDriver: false,
        tension: LESSON_CONSTANTS.READING_CARD.ANIMATION_TENSION,
        friction: LESSON_CONSTANTS.READING_CARD.ANIMATION_FRICTION,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  };

  // Collapse card
  const collapseCard = () => {
    if (__DEV__) {
      console.log("🎬 Card collapse starting...");
    }
    setIsCardExpanded(false);
    setShowReadContent(false);

    setIsCardGestureActive(false);
    if (__DEV__) {
      console.log("🎬 Carousel re-enabled IMMEDIATELY ✅");
    }

    Animated.parallel([
      Animated.spring(cardHeight, {
        toValue: COLLAPSED_HEIGHT,
        useNativeDriver: false,
        tension: LESSON_CONSTANTS.READING_CARD.ANIMATION_TENSION,
        friction: LESSON_CONSTANTS.READING_CARD.ANIMATION_FRICTION,
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

  // Lesson Completion Logic (handled by useLessonBase)

  // Horizontal Swipe Gesture Handler (for navigation)
  const handleHorizontalSwipe = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;

      const minDistance = 50;  // Minimum swipe distance
      const minVelocity = 500; // Minimum swipe velocity

      // Swipe right -> Continue (next lesson) - only when on last video
      if (currentVideoIndex === videos.length - 1 && translationX > minDistance && velocityX > minVelocity) {
        if (__DEV__) {
          console.log('👉 Swipe right detected - continuing to next');
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        handleLessonComplete();
      }
      // Swipe left -> Go back (dismiss)
      else if (translationX < -minDistance && velocityX < -minVelocity) {
        if (__DEV__) {
          console.log('👈 Swipe left detected - going back');
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onDismiss();
      }
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {Platform.OS === "android" && (
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      )}
      <PanGestureHandler
        ref={horizontalSwipeRef}
        onHandlerStateChange={handleHorizontalSwipe}
        activeOffsetX={[-30, 30]}
        failOffsetY={[-20, 20]}
        waitFor={panGestureRef}
      >
        <View style={{ flex: 1 }}>
          <View style={[
            styles.container,
            Platform.OS === 'android' && { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }
          ]}>
        {/* Main carousel - full screen */}
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            scrollEnabled={!isCardGestureActive}
            style={styles.carousel}
          >
            {videos.map((videoUrl, index) => {
              // LAZY LOADING: Only create players for current and next video
              // This prevents iOS from choking on multiple simultaneous HLS streams
              const shouldRenderPlayer = index === currentVideoIndex || index === currentVideoIndex + 1;

              if (!shouldRenderPlayer) {
                // Placeholder for videos not near current - maintains scroll position
                return (
                  <View key={index} style={styles.videoContainer}>
                    <View style={styles.videoPlaceholder} />
                  </View>
                );
              }

              return (
                <VideoCarouselItem
                  key={index}
                  videoUrl={videoUrl}
                  caption={captions[index] || ''}
                  index={index}
                  isActive={currentVideoIndex === index}
                  onReady={index === 0 ? () => setIsFirstVideoReady(true) : undefined}
                />
              );
            })}
          </ScrollView>

          <LoadingOverlay visible={!isFirstVideoReady} />
        </View>

        {/* Back Button */}
        <View style={[styles.backButtonContainer, { top: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => (onBack || onDismiss)()}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Continue Button */}
        <View style={[styles.continueButtonContainer, { top: insets.top + 8 }]}>
          <TouchableOpacity
            style={[
              styles.topContinueButton,
              currentVideoIndex !== videos.length - 1 &&
                styles.topContinueButtonDisabled,
            ]}
            onPress={
              currentVideoIndex === videos.length - 1
                ? handleLessonComplete
                : undefined
            }
            disabled={currentVideoIndex !== videos.length - 1}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={
                currentVideoIndex === videos.length - 1 ? "white" : "#666"
              }
            />
          </TouchableOpacity>
        </View>

        {/* Walkthrough Hints */}
        {walkthroughEnabled && (
          <View style={styles.aboveDotsHintContainer}>
            <ExpoImage
              source={require('@/assets/images/walkthrough/abovedots.svg')}
              style={styles.aboveDotsHintImage}
              contentFit="contain"
            />
          </View>
        )}

        {walkthroughEnabled && showContinueHint && (
          <View style={[styles.continueHintContainer, { top: insets.top + 4 }]}>
            <ExpoImage
              source={require('@/assets/images/walkthrough/continue.svg')}
              style={styles.continueHintImage}
              contentFit="contain"
            />
          </View>
        )}

        {/* Page indicators */}
        {!isCardExpanded && (
          <View style={styles.pageIndicatorsOnly}>
            {videos.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.pageIndicator,
                  currentVideoIndex === index && styles.pageIndicatorActive,
                ]}
              />
            ))}
          </View>
        )}

        {/* Reading Card: Tap only on Android, Tap + Swipe on iOS */}
        <TapGestureHandler
          ref={tapGestureRef}
          onHandlerStateChange={handleTapGesture}
        >
          {Platform.OS === 'ios' ? (
            <PanGestureHandler
              ref={panGestureRef}
              onGestureEvent={handleSwipeGesture}
              onHandlerStateChange={handleSwipeGesture}
              activeOffsetY={[-LESSON_CONSTANTS.GESTURES.ACTIVE_OFFSET_Y, LESSON_CONSTANTS.GESTURES.ACTIVE_OFFSET_Y]}
              failOffsetX={[-LESSON_CONSTANTS.GESTURES.FAIL_OFFSET_X, LESSON_CONSTANTS.GESTURES.FAIL_OFFSET_X]}
              minPointers={1}
              maxPointers={1}
              simultaneousHandlers={tapGestureRef}
            >
              <Animated.View
                style={[
                  styles.cardContainer,
                  {
                    transform: [{ translateY: cardTranslateY }],
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.readingCard,
                    {
                      height: cardHeight,
                    },
                  ]}
                >
                  <View style={styles.cardHandle} />

                  {/* Collapsed content */}
                  <Animated.View
                    style={[styles.collapsedContent, { opacity: cardOpacity }]}
                  >
                    <TouchableOpacity
                      onPress={expandCard}
                      activeOpacity={0.8}
                      disabled={isCardExpanded}
                    >
                      <View style={styles.readingCardHeader}>
                        <Text style={styles.cardTitle}>
                          {contentItem.thumbnail_title || 'Video Series'}
                        </Text>
                        <Text style={styles.cardSubtitle} numberOfLines={2}>
                          {contentItem.bottom_content?.reading_text?.replace(/<[^>]*>/g, '').substring(0, 100) || ''}...
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>

                  {/* Expanded content */}
                  {isCardExpanded && (
                    <Animated.View
                      style={[
                        styles.expandedContent,
                        { opacity: Animated.subtract(1, cardOpacity) },
                      ]}
                    >
                      <GestureHandlerScrollView
                        ref={scrollViewGestureRef}
                        style={styles.expandedScroll}
                        showsVerticalScrollIndicator={false}
                        onScroll={handleReadingScroll}
                        scrollEventThrottle={100}
                        waitFor={panGestureRef}
                        simultaneousHandlers={panGestureRef}
                      >
                        <View style={styles.expandedContentInner}>
                          {/* Title Section */}
                          <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                            <View style={styles.titleSection}>
                              <Text style={styles.sheetTitle}>
                                {contentItem.thumbnail_title || 'Video Series'}
                              </Text>
                              <Text style={styles.sheetSubtitle}>
                                Video Carousel • {contentItem.order_by}
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
                                    ul: { marginBottom: 12 },
                                    li: { color: 'white', fontFamily: 'DM Sans', fontSize: 14, lineHeight: 20, marginBottom: 6 },
                                    blockquote: { borderLeftWidth: 3, borderLeftColor: ArchivesTheme.colors.persianOrange, paddingLeft: 12, marginBottom: 12, fontStyle: 'italic' },
                                    hr: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)', marginVertical: 16 },
                                  }}
                                />
                              </View>
                            </TouchableOpacity>
                          )}

                          <View style={styles.sheetBottomSpacer} />
                        </View>
                      </GestureHandlerScrollView>
                    </Animated.View>
                  )}
                </Animated.View>
              </Animated.View>
            </PanGestureHandler>
          ) : (
            <Animated.View
              style={[
                styles.cardContainer,
                {
                  transform: [{ translateY: cardTranslateY }],
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.readingCard,
                  {
                    height: cardHeight,
                  },
                ]}
              >
                <View style={styles.cardHandle} />

                {/* Collapsed content */}
                <Animated.View
                  style={[styles.collapsedContent, { opacity: cardOpacity }]}
                >
                  <TouchableOpacity
                    onPress={expandCard}
                    activeOpacity={0.8}
                    disabled={isCardExpanded}
                  >
                    <View style={styles.readingCardHeader}>
                      <Text style={styles.cardTitle}>
                        {contentItem.thumbnail_title || 'Video Series'}
                      </Text>
                      <Text style={styles.cardSubtitle} numberOfLines={2}>
                        {contentItem.bottom_content?.reading_text?.replace(/<[^>]*>/g, '').substring(0, 100) || ''}...
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>

                {/* Expanded content */}
                {isCardExpanded && (
                  <Animated.View
                    style={[
                      styles.expandedContent,
                      { opacity: Animated.subtract(1, cardOpacity) },
                    ]}
                  >
                    <GestureHandlerScrollView
                      ref={scrollViewGestureRef}
                      style={styles.expandedScroll}
                      showsVerticalScrollIndicator={false}
                      onScroll={handleReadingScroll}
                      scrollEventThrottle={100}
                      waitFor={panGestureRef}
                      simultaneousHandlers={panGestureRef}
                    >
                      <View style={styles.expandedContentInner}>
                        {/* Title Section */}
                        <TouchableOpacity onPress={collapseCard} activeOpacity={0.9}>
                          <View style={styles.titleSection}>
                            <Text style={styles.sheetTitle}>
                              {contentItem.thumbnail_title || 'Video Series'}
                            </Text>
                            <Text style={styles.sheetSubtitle}>
                              Video Carousel • {contentItem.order_by}
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
                                  ul: { marginBottom: 12 },
                                  li: { color: 'white', fontFamily: 'DM Sans', fontSize: 14, lineHeight: 20, marginBottom: 6 },
                                  blockquote: { borderLeftWidth: 3, borderLeftColor: ArchivesTheme.colors.persianOrange, paddingLeft: 12, marginBottom: 12, fontStyle: 'italic' },
                                  hr: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)', marginVertical: 16 },
                                }}
                              />
                            </View>
                          </TouchableOpacity>
                        )}

                        <View style={styles.sheetBottomSpacer} />
                      </View>
                    </GestureHandlerScrollView>
                  </Animated.View>
                )}
              </Animated.View>
            </Animated.View>
          )}
        </TapGestureHandler>
          </View>
        </View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },

  carousel: {
    flex: 1,
  },
  videoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
    overflow: "hidden",
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  videoPlaceholder: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: "black",
  },

  textOverlay: {
    position: "absolute",
    top: 120,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
    alignItems: "center",
  },
  captionText: {
    fontFamily: "DM Sans",
    fontSize: 20,
    fontWeight: "700",
    color: "white",
    textAlign: "center",
    lineHeight: 26,
    textShadowColor: "black",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  pageIndicatorsOnly: {
    position: "absolute",
    bottom: SCREEN_HEIGHT * 0.22,  // Responsive: ~22% from bottom
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: 15,
    paddingHorizontal: 5,
    paddingVertical: 6,
  },
  pageIndicator: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "rgb(147, 147, 147)",
    marginHorizontal: 4.5,
  },
  pageIndicatorActive: {
    backgroundColor: "rgb(255, 255, 255)",
  },

  cardContainer: {
    position: "absolute",
    bottom: -40,
    left: 0,
    right: 0,
    zIndex: 30,
  },

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

  backButtonContainer: {
    position: "absolute",
    left: 16,
    zIndex: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },

  continueButtonContainer: {
    position: "absolute",
    right: 16,
    zIndex: 20,
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

  historicalSection: {
    marginBottom: 20,
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

  sheetBottomSpacer: {
    height: 60,
  },

  // Walkthrough hints
  aboveDotsHintContainer: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.25,  // Responsive: ~25% from bottom (closer to dots)
    alignSelf: 'center',
    zIndex: 15,
    pointerEvents: 'none',
  },
  aboveDotsHintImage: {
    width: 176,  // 1X original size
    height: 79,  // Match 176:79 SVG aspect ratio (1X)
  },
  continueHintContainer: {
    position: 'absolute',
    right: 66,  // 16 (button margin) + 40 (button width) + 10 (spacing)
    zIndex: 25,
    pointerEvents: 'none',
  },
  continueHintImage: {
    width: 120,  // 1.2X size
    height: 48,  // Match 120:48 SVG aspect ratio (1.2X)
  },
});
