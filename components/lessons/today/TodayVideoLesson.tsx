// TodayVideoLesson.tsx - Custom media player for Today screen
// Supports: reel (single video), video_carousel (multiple videos), image_carousel (multiple images)

import type { ContentItem } from "@/components/shared/types";
import TodayLessonChrome from "@/components/today/TodayLessonChrome";
import {
  DepthButton,
  PaginationDots,
  Typography,
  colors,
  easings,
  safeDuration,
} from "@/components/ui";
import ArchivesTheme from "@/constants/ArchivesTheme";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView, VideoSource } from "expo-video";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { useDeviceHealthMonitor } from "@/hooks/useDeviceHealthMonitor";
import { useWalkthroughTarget } from "@/hooks/today/useWalkthroughTarget";
import { useWalkthroughDispatch } from "@/hooks/today/useWalkthroughDispatch";
import DevHealthOverlay from "@/components/lessons/DevHealthOverlay";
import { analyticsService } from "@/services/AnalyticsService";
import { networkPerformanceService } from "@/services/NetworkPerformanceService";
import AppLogger from "@/services/AppLogger";
import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import {
  GestureHandlerRootView,
  ScrollView as GestureHandlerScrollView,
  PanGestureHandler,
  State,
} from "react-native-gesture-handler";
import RenderHtml from "react-native-render-html";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

// Static dimensions - Use "screen" for Android, "window" for iOS (matches adventure pattern)
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get(
  Platform.OS === 'android' ? "screen" : "window"
);

// Sheet height = bottom 67% of screen (matches Figma 3365:9379/9380:
// height=573 on a 852-tall iPhone 16). Mock CSS uses 520px fixed; the
// percentage approach scales correctly across device sizes.
const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.67);

// Reading-card animation timings — copied verbatim from
// `Downloads/02 daily story/index.html:2403-2435` (`openReadSheet` /
// `closeReadSheet`). Theme easings map 1:1 to GSAP names:
//   back.out(1.4) → easings.backOut14
//   back.out(2)   → easings.backOut2
//   power2.out    → easings.power2Out
//   power2.in     → easings.power2In
const SHEET_OPEN_DURATION_MS = 420;
const SHEET_CLOSE_DURATION_MS = 320;
const HANDLE_DELAY_MS = 200;
const HANDLE_DURATION_MS = 300;
const TITLE_DELAY_MS = 250;
const TITLE_DURATION_MS = 350;
const BODY_DELAY_MS = 300;
const BODY_DURATION_MS = 400;
const BACKDROP_OPEN_DURATION_MS = 350;
const BACKDROP_CLOSE_DURATION_MS = 280;
const BACKDROP_TARGET_OPACITY = 0.45;

// Video item component for carousel (matches VideoCarouselLesson pattern)
interface TodayVideoItemProps {
  videoUrl: string;
  isActive: boolean;
  shouldLoop: boolean;
  onStatusUpdate?: (status: any) => void;
  // Fires once when the underlying player transitions to `readyToPlay`.
  // Parent uses it to gate the caption fade-in so we never paint caption
  // text over the still-black placeholder while the player primes.
  onReady?: () => void;
}

const TodayVideoItem: React.FC<TodayVideoItemProps> = ({
  videoUrl,
  isActive,
  shouldLoop,
  onStatusUpdate,
  onReady,
}) => {
  // Auto-detect HLS for cross-platform compatibility (Android ExoPlayer needs explicit hint)
  const isHLS = videoUrl?.includes('.m3u8') || videoUrl?.includes('/hls/') || videoUrl?.includes('format=m3u8');

  const videoSource: VideoSource = useMemo(
    () => ({
      uri: videoUrl,
      contentType: isHLS ? 'hls' : 'progressive',
      useCaching: !(isHLS && Platform.OS === 'ios'),
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

    // Skip iOS AVPlayer cancellation (carousel preload tearing down a still-loading
    // player). Not a real status transition worth tracking — see the matching
    // filter in the error handler below for the full explanation.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errAny = error as any;
    const isCancellation =
      status === 'error' &&
      ((typeof errAny?.message === 'string' &&
        errAny.message.includes('Operation Stopped')) ||
        errAny?.code === -999 ||
        errAny?.code === 'NSURLErrorCancelled' ||
        errAny?.code === 'AVErrorCancelled');
    if (isCancellation) return;

    const cdnDomain = networkPerformanceService.extractCDNDomain(videoUrl);
    analyticsService.trackVideoStatusChange({
      video_url: videoUrl,
      status,
      error_code: errAny?.code ?? undefined,
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
      // Notify parent that the player is ready — used to gate caption
      // fade-in so we don't paint over the black placeholder window.
      onReady?.();
    }

    // Track error — recoverable (carousel skips this item, others still play),
    // so use `warn` to keep Sentry breadcrumbs flowing without triggering the
    // dev LogBox red-screen overlay on every transient CDN hiccup.
    if (status === 'error' && !hasTrackedErrorRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errAny = error as any;
      const errorMessage: string | null = errAny?.message ?? null;
      const errorCode = errAny?.code ?? errAny?.errorCode ?? null;

      // Filter out iOS AVPlayer's normal cancellation signal. When the
      // carousel preloads the next item then advances, the previous item's
      // <TodayVideoItem> unmounts mid-load → AVPlayer surfaces this as
      // "Failed to load the player item: Operation Stopped" (AVErrorCancelled
      // / NSURLErrorCancelled, code -999). It's not a real failure — the
      // CDN is fine, the file is fine, the player just got torn down before
      // its network request finished. Dropping it from the warn/CDN-error
      // path so we don't pollute Sentry breadcrumbs and analytics with
      // normal lifecycle events.
      const isCancellation =
        (typeof errorMessage === 'string' &&
          errorMessage.includes('Operation Stopped')) ||
        errorCode === -999 ||
        errorCode === 'NSURLErrorCancelled' ||
        errorCode === 'AVErrorCancelled';

      if (isCancellation) {
        AppLogger.info(
          'video',
          'TodayVideoItem cancelled (normal lifecycle, not a real error)',
          {
            videoUrl: videoUrl?.substring(0, 80),
            isHLS,
            elapsedSinceMountMs: Date.now() - playerCreatedAtRef.current,
          },
        );
        hasTrackedErrorRef.current = true;
        return;
      }

      const cdnDomain = networkPerformanceService.extractCDNDomain(videoUrl);

      AppLogger.warn('video', 'TodayVideoItem player error', {
        videoUrl, // full URL — needed for copy/paste debugging the failing CDN response
        isHLS,
        cdnDomain,
        errorMessage,
        errorCode,
        errorDomain: errAny?.domain ?? null,
        errorRaw: error ? String(error) : null,
        playerDuration: player?.duration ?? null,
        playerCurrentTime: player?.currentTime ?? null,
        elapsedSinceMountMs: Date.now() - playerCreatedAtRef.current,
      });

      // Best-effort HEAD probe to surface what the server is actually
      // returning. Only useful for genuine failures (skipped above for
      // cancellations) — exposes Content-Type, byte-range support, status
      // code, CloudFront cache state. See the cancellation comment for
      // the lifecycle that *was* triggering this.
      fetch(videoUrl, { method: 'HEAD' })
        .then((res) => {
          AppLogger.info('video', 'TodayVideoItem error: HEAD probe', {
            videoUrl,
            status: res.status,
            statusText: res.statusText,
            contentType: res.headers.get('content-type'),
            contentLength: res.headers.get('content-length'),
            acceptRanges: res.headers.get('accept-ranges'),
            cacheControl: res.headers.get('cache-control'),
            etag: res.headers.get('etag'),
            xCache: res.headers.get('x-cache'), // CloudFront cache hit/miss
            xAmzCfId: res.headers.get('x-amz-cf-id'), // CloudFront request id (for AWS support)
          });
        })
        .catch((probeErr) => {
          AppLogger.warn('video', 'TodayVideoItem error: HEAD probe failed', {
            videoUrl,
            probeError:
              probeErr instanceof Error ? probeErr.message : String(probeErr),
          });
        });

      analyticsService.trackCDNError({
        media_type: 'video',
        url: videoUrl,
        cdn_domain: cdnDomain,
        error_message: errorMessage ?? 'today_video_load_error',
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

  // Walkthrough: target refs (steps 4-6) + event dispatcher.
  // - dotsRef: PaginationDots container — step 4 'swipe' interactive.
  // - readBtnRef: leftCta DepthButton wrapper — step 5 'read' action.
  // - continueBtnRef: rightCta DepthButton wrapper — step 6 'continue-s2' action.
  // The dispatcher fires 'read-sheet-open'/'read-sheet-close' events that the
  // walkthrough engine listens for to advance step 5 and ungate step 6's showOn.
  const dotsRef = useWalkthroughTarget("s2-dots");
  const readBtnRef = useWalkthroughTarget("s2-read");
  const continueBtnRef = useWalkthroughTarget("s2-continue");
  const dispatchWalkthrough = useWalkthroughDispatch();

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

  // Per-slide thumbnail array. Falls back to the contentItem's main
  // thumbnail_url so single-video lessons still get a poster behind the
  // black placeholder. Length is normalized to mediaUrls so each slot
  // can index into it directly.
  const thumbnailUrls = useMemo<(string | undefined)[]>(() => {
    const fallback = contentItem.thumbnail_url;
    const raw = (contentItem.bottom_content as any)?.thumbnails;
    if (Array.isArray(raw)) {
      return mediaUrls.map(
        (_, i) => (typeof raw[i] === 'string' && raw[i]) || fallback || undefined,
      );
    }
    return mediaUrls.map(() => fallback || undefined);
  }, [contentItem.thumbnail_url, contentItem.bottom_content, mediaUrls]);

  // Tracks whether the player at `currentMediaIndex` has reached
  // `readyToPlay`. Resets to false on every slide change so the caption
  // animation never lands on top of the black-placeholder window of the
  // newly-active slide.
  const [activeSlideReady, setActiveSlideReady] = useState(false);

  // Tracks whether the user is mid-gesture (finger down OR coasting on
  // momentum). Caption hides as soon as the drag begins so it never
  // sits over a partially-scrolled, half-covered video — even if the
  // user releases short of a full slide change.
  const [isCarouselScrolling, setIsCarouselScrolling] = useState(false);

  // Derived visibility — caption is visible only when BOTH:
  //   1. the active slide's player is ready, AND
  //   2. no scroll/drag is in flight.
  // This single flag drives the opacity tween; useEffect picks up any
  // change to either input. Keeps the visibility logic in one place.
  const shouldShowCaption = activeSlideReady && !isCarouselScrolling;

  // Caption opacity — driven on the UI thread. Hides the moment the
  // user starts swiping (or any time scroll is in flight), and fades
  // back in once the active player is ready AND the user has settled.
  // Single shared value avoids unmount/remount churn on the caption
  // Text and keeps the animation entirely off the JS thread.
  const captionOpacity = useSharedValue(0);
  const captionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: captionOpacity.value,
  }));

  useEffect(() => {
    if (shouldShowCaption) {
      // Fade in — 280ms `power2.out` matches the mock's default "fade
      // body in" beat (`Downloads/02 daily story/index.html:2403-2435`).
      captionOpacity.value = withTiming(1, {
        duration: safeDuration(280),
        easing: easings.power2Out,
      });
    } else {
      // Snap to 0 — caption text MUST be gone before the next slide's
      // video paints, otherwise a half-faded caption from the outgoing
      // slide briefly overlays the new slide's still-priming player.
      captionOpacity.value = 0;
    }
  }, [shouldShowCaption, captionOpacity]);

  // Card state - Initially hidden (sheet sits SHEET_HEIGHT below screen
  // baseline so a `translateY(0)` brings it fully into view).
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [hasFinishedReading, setHasFinishedReading] = useState(false);

  // Reading-card animation shared values — one per element the mock tweens
  // independently (sheet, handle, title, body, backdrop). Each is animated
  // by `expandCard` / `collapseCard` below.
  const sheetTranslateY = useSharedValue(SHEET_HEIGHT);
  const handleScaleX = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const bodyOpacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));
  const handleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: handleScaleX.value }],
  }));
  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));
  const bodyAnimatedStyle = useAnimatedStyle(() => ({
    opacity: bodyOpacity.value,
  }));
  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // Video state
  const [videoCompleted, setVideoCompleted] = useState(false);
  const hasTrackedMediaRef = useRef(false);

  // Gesture refs
  const panGestureRef = useRef(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // ─── Carousel scroll lifecycle ─────────────────────────────────────
  // Three handlers cooperate to drive caption visibility:
  //
  //   onScrollBeginDrag → flip `isCarouselScrolling=true` so the caption
  //     snaps to 0 the instant the finger moves. Covers the "user pulls
  //     halfway and either commits or releases back" case — without
  //     this hook the caption sat over a partially-revealed adjacent
  //     slide while the user dragged.
  //
  //   onMomentumScrollEnd → fired after the deceleration animation
  //     settles. We update the index here (still the source of truth
  //     for which video is active) and clear `isCarouselScrolling`. If
  //     the user landed on the SAME slide, `activeSlideReady` is still
  //     true and the derived `shouldShowCaption` flips back to true →
  //     caption fades back in. If they landed on a NEW slide, the
  //     index-change effect resets `activeSlideReady` to false → the
  //     caption stays hidden until the new player fires `onReady`.
  //
  //   onScrollEndDrag → backstop for the gesture path that releases
  //     too softly to trigger momentum (e.g. a tiny pull-and-release
  //     under the iOS minimum-velocity threshold). RN does NOT fire
  //     `onMomentumScrollEnd` in that case, so without this handler
  //     `isCarouselScrolling` would stick at true and the caption
  //     would never come back.
  const handleScrollBeginDrag = () => {
    setIsCarouselScrolling(true);
  };

  const handleScrollEndDrag = (event: any) => {
    // If momentum kicks in, `momentumScroll` events follow and
    // `onMomentumScrollEnd` will clear the flag. Detect that by
    // checking the velocity — RN provides it on the end-drag event.
    // No momentum on this gesture → clear the flag here too.
    const vx = event?.nativeEvent?.velocity?.x ?? 0;
    if (Math.abs(vx) < 0.05) {
      setIsCarouselScrolling(false);
    }
  };

  const handleCarouselScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setIsCarouselScrolling(false);
    if (index !== currentMediaIndex && index >= 0 && index < mediaUrls.length) {
      // Reset readiness BEFORE swapping the index — the useEffect that
      // drives caption opacity sees `activeSlideReady=false` first and
      // keeps the caption at 0. Without this two-step the caption from
      // the outgoing slide could linger over the new slide's still-
      // priming player for a frame.
      setActiveSlideReady(false);
      setCurrentMediaIndex(index);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Reset readiness whenever currentMediaIndex changes via any route
  // (e.g. programmatic scroll, future deep-link to a specific slide).
  // The `handleCarouselScroll` path above already does this, but keying
  // off the index too keeps the invariant safe regardless of how the
  // change was triggered.
  useEffect(() => {
    setActiveSlideReady(false);
  }, [currentMediaIndex]);

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

  // Expand / collapse — ports `openReadSheet` / `closeReadSheet` from the
  // mock (`Downloads/02 daily story/index.html:2403-2435`) verbatim. The
  // sheet slides up with a back-out overshoot, then the handle scales in,
  // then the title and body fade in staggered. The backdrop fades in over
  // the same window. Close reverses the sheet with a `power2.in` slide
  // and snaps the inner content opacities to 0 (matching `gsap.set`).
  const expandCard = () => {
    setIsCardExpanded(true);
    // Walkthrough advance hook — fires once per sheet open. Step 5 ('read')
    // listens for this to advance; step 6 ('continue-s2') waits for the
    // close event before its showOn gate flips and reveals its bubble.
    dispatchWalkthrough("read-sheet-open");
    sheetTranslateY.value = withTiming(0, {
      duration: safeDuration(SHEET_OPEN_DURATION_MS),
      easing: easings.backOut14,
    });
    handleScaleX.value = withDelay(
      safeDuration(HANDLE_DELAY_MS),
      withTiming(1, {
        duration: safeDuration(HANDLE_DURATION_MS),
        easing: easings.backOut2,
      }),
    );
    titleOpacity.value = withDelay(
      safeDuration(TITLE_DELAY_MS),
      withTiming(1, {
        duration: safeDuration(TITLE_DURATION_MS),
        easing: easings.power2Out,
      }),
    );
    bodyOpacity.value = withDelay(
      safeDuration(BODY_DELAY_MS),
      withTiming(1, {
        duration: safeDuration(BODY_DURATION_MS),
        easing: easings.power2Out,
      }),
    );
    backdropOpacity.value = withTiming(BACKDROP_TARGET_OPACITY, {
      duration: safeDuration(BACKDROP_OPEN_DURATION_MS),
      easing: easings.power2Out,
    });
  };

  const collapseCard = () => {
    setIsCardExpanded(false);
    // Walkthrough advance hook — un-gates step 6 ('continue-s2'), which has
    // showOn: 'event:read-sheet-close'. The bubble + spotlight stay hidden
    // until this fires so the user has a clean read-sheet UX uninterrupted
    // by overlay chrome.
    dispatchWalkthrough("read-sheet-close");
    sheetTranslateY.value = withTiming(SHEET_HEIGHT, {
      duration: safeDuration(SHEET_CLOSE_DURATION_MS),
      easing: easings.power2In,
    });
    // Mock uses `gsap.set` (instant) for h3/p on close — the sheet itself
    // animates out so animating their opacity too looks redundant.
    titleOpacity.value = 0;
    bodyOpacity.value = 0;
    handleScaleX.value = 0;
    backdropOpacity.value = withTiming(0, {
      duration: safeDuration(BACKDROP_CLOSE_DURATION_MS),
      easing: easings.power2In,
    });
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
        {/* StatusBar config moved to the useEffect on mount above —
            keeping a JSX <StatusBar> here would re-apply the props on
            every render, and on Android each commit re-fires window
            flags through the bridge → window manager re-layout →
            visible jitter on the modal contents and the parent tab bar.
            The mount-time imperative call fires once and stays put. */}

        {/* Main Content Area - Video fills entire screen */}
        <View style={[
          ArchivesTheme.common.today.watchModalContainer,
          Platform.OS === 'android' && { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }
        ]}>
          <TodayLessonChrome
            progress={progress}
            onBack={onDismiss}
            // Light tone defaults match the video backdrop — white text +
            // translucent-white track over the active video.
            leftCta={
              <View ref={readBtnRef} collapsable={false}>
                <DepthButton
                  variant="secondary"
                  surfaceColor="pinkSecondary"
                  shadowColor="pinkPrimary"
                  onPress={() => {
                    if (isCardExpanded) {
                      collapseCard();
                    } else {
                      expandCard();
                    }
                  }}
                  leftIcon={
                    <Ionicons name="menu" size={18} color={colors.white} />
                  }
                >
                  <Typography
                    family="onest"
                    size={18}
                    weight="700"
                    extraColor={colors.white}
                    style={styles.ctaLabel}
                  >
                    {isCardExpanded ? "COLLAPSE" : "READ"}
                  </Typography>
                </DepthButton>
              </View>
            }
            rightCta={
              <View ref={continueBtnRef} collapsable={false}>
                <DepthButton variant="secondary" onPress={onNext}>
                  <Typography
                    family="onest"
                    size={18}
                    weight="700"
                    extraColor={colors.white}
                    style={styles.ctaLabel}
                  >
                    CONTINUE
                  </Typography>
                </DepthButton>
              </View>
            }
          >
          {/* Media Background - Swipeable Carousel */}
          <View style={ArchivesTheme.common.today.watchVideoContainer}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              // See handler comments above. The pair (begin/end-drag +
              // momentum-end) covers all three release paths so the
              // caption visibility flag never gets stuck.
              onScrollBeginDrag={handleScrollBeginDrag}
              onScrollEndDrag={handleScrollEndDrag}
              onMomentumScrollEnd={handleCarouselScroll}
              scrollEnabled={!isCardExpanded}
              style={{ flex: 1 }}
            >
              {mediaUrls.map((mediaUrl, index) => {
                // Only render the ACTIVE video — never preload the next one.
                // Two simultaneous <TodayVideoItem> instances for the same
                // CloudFront origin race over iOS's NSURLSession connection
                // pool; combined with React strict-mode's dev double-mount,
                // one request gets cancelled and the video stays black.
                // Images are cheap, so we still render all of them.
                const shouldRenderMedia =
                  contentType === "image_carousel" ||
                  index === currentMediaIndex;

                return (
                  <View key={index} style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}>
                    {contentType === "image_carousel" ? (
                      <Image
                        source={{ uri: mediaUrl || "" }}
                        style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                        contentFit="cover"
                      />
                    ) : shouldRenderMedia ? (
                      // Active slide: render the video on top of the
                      // thumbnail. The thumbnail stays painted underneath
                      // until the player commits its first frame, so the
                      // ~1-2s priming window shows the poster instead of
                      // SurfaceView's default black.
                      <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: 'black' }}>
                        {!!thumbnailUrls[index] && (
                          <Image
                            source={{ uri: thumbnailUrls[index] }}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                          />
                        )}
                        <TodayVideoItem
                          videoUrl={mediaUrl || ""}
                          isActive={index === currentMediaIndex}
                          shouldLoop={true}
                          onStatusUpdate={index === currentMediaIndex ? handleVideoStatus : undefined}
                          onReady={
                            index === currentMediaIndex
                              ? () => setActiveSlideReady(true)
                              : undefined
                          }
                        />
                      </View>
                    ) : (
                      // Inactive slot: thumbnail-only placeholder. Same
                      // poster the home deck card cached, so this paint
                      // is essentially free on disk-cache hit.
                      <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: 'black' }}>
                        {!!thumbnailUrls[index] && (
                          <Image
                            source={{ uri: thumbnailUrls[index] }}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                          />
                        )}
                      </View>
                    )}

                  </View>
                );
              })}
            </ScrollView>
          </View>

          {/* Caption — top-anchored hero text per figma 3507:7980. Uses
              the design-system `display.large` variant (Bounded Black 28
              uppercase) so it matches every other hero moment in the app.
              `textShadow` mimics the figma's `text-shadow-[1px_1px_4px_black]`
              and gives legibility on top of arbitrary video frames. */}
          {captions[currentMediaIndex] && (
            // Animated wrapper — opacity driven by `captionOpacity`
            // (UI-thread shared value, see captionAnimatedStyle above).
            // Snaps to 0 the instant the user starts changing slides
            // and fades back to 1 once the new slide's video fires
            // `onReady`, so caption text never overlays the still-
            // priming player or the thumbnail placeholder.
            <Animated.View
              pointerEvents="none"
              style={[
                styles.captionContainer,
                // Caption sits below the floating header. `insets.top` plus
                // ~72px clears the back button + progress bar; figma 3507:7980
                // anchors the headline at ~14% from the top of the screen.
                { top: insets.top + 72 },
                captionAnimatedStyle,
              ]}
            >
              <Typography
                variant="display.medium"
                color="white"
                style={styles.captionText}
                align="center"
              >
                {captions[currentMediaIndex]}
              </Typography>
            </Animated.View>
          )}

          {/* Progress Dots — bottom-anchored, just above the floating CTAs
              per figma 3522:8033 (top: 723 of 867). Shared component with
              the home-screen card deck; white tones for legibility on the
              dark video. */}
          {isCarousel && (
            <View
              ref={dotsRef}
              collapsable={false}
              style={[
                styles.dotsContainer,
                // Sits above the CTA row: insets.bottom + 16 (CTA paddingBottom)
                // + 45 (CTA height) + 16 (breathing room) = the bottom edge
                // of the dots line.
                { bottom: insets.bottom + 100 },
              ]}
              pointerEvents="none"
            >
              <PaginationDots
                count={mediaUrls.length}
                activeIndex={currentMediaIndex}
                activeColor={colors.white}
                inactiveColor="rgba(255, 255, 255, 0.4)"
              />
            </View>
          )}

          {/* Backdrop — fades 0→0.45 over 350ms when the sheet opens (mock
              `index.html:576-582`). Tapping it collapses the sheet. */}
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.backdrop, backdropAnimatedStyle]}
            pointerEvents={isCardExpanded ? "auto" : "none"}
          >
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={collapseCard}
            />
          </Animated.View>

          {/* Reading sheet — bottom-anchored, slides in with `back.out(1.4)`,
              dark translucent + blurred background per figma 3365:9380.
              Single PanGestureHandler with the same swipe-down-to-close
              behavior across iOS + Android (the prior file duplicated this
              block per platform with no actual differences). */}
          <PanGestureHandler
            ref={panGestureRef}
            onGestureEvent={handleSwipeGesture}
            onHandlerStateChange={handleSwipeGesture}
            activeOffsetY={[-10, 10]}
            failOffsetX={[-20, 20]}
          >
            <Animated.View style={[styles.sheet, sheetAnimatedStyle]}>
              <BlurView
                intensity={Platform.OS === "ios" ? 30 : 18}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
              <View style={[StyleSheet.absoluteFill, styles.sheetTint]} />

              {/* Drag handle — scaleX 0→1 with back.out(2) once the sheet
                  has settled (200ms delay matches mock `delay: 0.2`). */}
              <Animated.View style={[styles.handle, handleAnimatedStyle]} />

              <GestureHandlerScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.sheetScroll}
                showsVerticalScrollIndicator={false}
                onScroll={handleReadingScroll}
                scrollEventThrottle={100}
                bounces={false}
                waitFor={Platform.select({ ios: panGestureRef, default: undefined })}
              >
                <Animated.View style={titleAnimatedStyle}>
                  <Typography
                    family="onest"
                    size={22}
                    weight="700"
                    extraColor={colors.white}
                    style={styles.title}
                  >
                    {contentItem.thumbnail_title || "Content"}
                  </Typography>
                </Animated.View>

                {contentItem.bottom_content?.reading_text && (
                  <Animated.View style={bodyAnimatedStyle}>
                    <RenderHtml
                      contentWidth={SCREEN_WIDTH - 56}
                      source={{
                        html: contentItem.bottom_content.reading_text,
                      }}
                      tagsStyles={readingHtmlStyles}
                    />
                  </Animated.View>
                )}

                {/* Bottom spacer leaves room for the floating CTAs */}
                <View style={{ height: 120 }} />
              </GestureHandlerScrollView>
            </Animated.View>
          </PanGestureHandler>

          </TodayLessonChrome>
        </View>

        {/* DEV ONLY: Device health + network speed overlay */}
        <DevHealthOverlay />
      </GestureHandlerRootView>
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────────────────
// Reading-sheet styles + RenderHtml tag styles
// ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Backdrop dim — sits above the video AND above the caption/dots
  // (zIndex 80) so when the sheet opens the dim covers the caption
  // text instead of leaving it bright. Tapping it collapses the sheet.
  backdrop: {
    backgroundColor: "#000",
    zIndex: 90,
  },
  // Bottom-anchored reading sheet. translateY shared value drives the
  // open/close slide; the BlurView + tint layer beneath provides the
  // figma 3365:9380 visual (`backdrop-blur 5px` + `rgba(0,0,0,0.8)`).
  // zIndex 100 lifts it above caption (80), dots (80), and backdrop (90)
  // — RN zIndex is sibling-only, so all four numbers compete directly
  // inside the chrome's body slot.
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
    zIndex: 100,
  },
  sheetTint: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  sheetScroll: {
    paddingTop: 26,
    paddingHorizontal: 24,
  },
  // 76×4 white pill, 60% opacity — figma 3365:9381 + mock CSS
  // `index.html:593`. Horizontally centered via marginHorizontal: auto.
  handle: {
    width: 76,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    alignSelf: "center",
    marginTop: 13,
    marginBottom: 16,
    zIndex: 10,
  },
  title: {
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  // CTA label refinement — DepthButton's Typography children take this via
  // `style` prop. Onest at -0.18 letter-spacing matches the figma 3526:8087
  // / 3365:9397 specs. Chrome owns the bottom-row geometry; this only tunes
  // the per-label kerning.
  ctaLabel: {
    letterSpacing: -0.18,
  },
  // Caption — top-anchored hero text per figma 3507:7980. `top` is set
  // inline with insets so the headline sits below the floating chrome
  // header on every device size.
  captionContainer: {
    position: "absolute",
    left: 24,
    right: 24,
    alignItems: "center",
    zIndex: 80,
  },
  captionText: {
    textShadowColor: "rgba(0, 0, 0, 1)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  // Progress dots — bottom-anchored above the floating CTA row.
  dotsContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 80,
  },
});

// HTML body styling for the reading content. Onest matches figma 3365:9384
// (font-['Onest:Medium']). Color is white so it reads on the dark sheet bg.
const readingHtmlStyles = {
  body: {
    color: colors.white,
    fontFamily: "Onest",
    fontSize: 16,
    lineHeight: 25,
  },
  h1: {
    color: colors.white,
    fontFamily: "Onest",
    fontSize: 24,
    fontWeight: "700" as const,
    marginBottom: 12,
  },
  h2: {
    color: colors.white,
    fontFamily: "Onest",
    fontSize: 20,
    fontWeight: "700" as const,
    marginBottom: 10,
  },
  h3: {
    color: colors.white,
    fontFamily: "Onest",
    fontSize: 18,
    fontWeight: "600" as const,
    marginBottom: 8,
  },
  p: {
    color: colors.white,
    fontFamily: "Onest",
    fontSize: 16,
    lineHeight: 25,
    marginBottom: 12,
  },
  strong: { fontWeight: "600" as const, color: colors.white },
  em: { fontStyle: "italic" as const, color: colors.white },
};
