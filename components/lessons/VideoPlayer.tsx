// VideoPlayer.tsx - Full-screen video player for lessons
// EXACT replica of SwiftUI Module1VideoPlayerView
// Migrated to expo-video (modern API)

import { useEvent } from 'expo'
import * as Haptics from 'expo-haptics'
import { useVideoPlayer, VideoView, VideoSource } from 'expo-video'
import React, { useEffect, useMemo, useState, useRef } from 'react'
import {
  AppState,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import AppLogger from '@/services/AppLogger'
import { analyticsService } from '@/services/AnalyticsService'
import { networkPerformanceService } from '@/services/NetworkPerformanceService'

interface VideoPlayerProps {
  videoSource: any
  onPlaybackStatusUpdate?: (status: any) => void
  autoPlay?: boolean
  shouldLoop?: boolean
}

export default function VideoPlayer({
  videoSource,
  onPlaybackStatusUpdate,
  autoPlay = true,
  shouldLoop = true,
}: VideoPlayerProps) {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)

  // Track if we've already logged the source (prevent spam)
  const hasLoggedSource = useRef(false)

  // Guard against stale statusChange events after player cleanup
  const isReleasedRef = useRef(false)

  // AFF-579: Performance tracking refs
  const playerCreatedAtRef = useRef<number>(Date.now())
  const hasTrackedLoadTime = useRef(false)
  const userInitiatedPauseRef = useRef(false)
  const bufferStartTimeRef = useRef<number | null>(null)
  const wasPlayingRef = useRef(false)
  const hasTrackedErrorRef = useRef(false)
  const appIsActiveRef = useRef(AppState.currentState === 'active')

  // AFF-612: Video completion tracking refs
  const maxPositionRef = useRef(0)
  const videoDurationRef = useRef(0)
  const watchStartTimeRef = useRef<number>(Date.now())
  const hasTrackedCompletionRef = useRef(false)
  const videoSourceUriRef = useRef('')

  // PERFORMANCE: Optimize videoSource with useMemo
  const optimizedVideoSource: VideoSource = useMemo(() => {
    // Remote URL object
    if (typeof videoSource === 'object' && videoSource !== null && 'uri' in videoSource) {
      const uri = videoSource.uri || '';

      // Auto-detect HLS for Android compatibility
      const isHLS = uri.includes('.m3u8') || uri.includes('/hls/') || uri.includes('format=m3u8');

      const source = {
        ...videoSource,
        contentType: isHLS ? 'hls' : 'progressive',
      };

      // Log only once
      if (!hasLoggedSource.current && Platform.OS === 'android') {
        if (__DEV__) {
          console.log('🎬 [Android] VideoPlayer source:', {
            uri: uri.substring(0, 80) + '...',
            contentType: source.contentType,
            detectedFormat: isHLS ? 'HLS' : 'Progressive',
          });
        }
        hasLoggedSource.current = true;
      }

      return source;
    }

    // Local asset from require()
    if (typeof videoSource === 'number') {
      return videoSource;
    }

    // String URI
    if (typeof videoSource === 'string') {
      const isHLS = videoSource.includes('.m3u8') || videoSource.includes('/hls/') || videoSource.includes('format=m3u8');
      return {
        uri: videoSource,
        contentType: isHLS ? 'hls' : 'progressive',
      };
    }

    return videoSource;
  }, [videoSource])

  // AFF-579: Pause buffer tracking when app backgrounds (calls, Siri, Control Center, etc.)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      appIsActiveRef.current = state === 'active';
      if (state !== 'active') {
        // Clear pending buffer on background — not a real stall
        bufferStartTimeRef.current = null;
      }
    });
    return () => sub.remove();
  }, []);

  // AFF-579/612: Reset tracking refs when videoSource changes (new video loaded)
  const videoSourceUri = typeof videoSource === 'object' ? videoSource?.uri : String(videoSource ?? '');
  useEffect(() => {
    playerCreatedAtRef.current = Date.now();
    hasTrackedLoadTime.current = false;
    hasTrackedErrorRef.current = false;
    bufferStartTimeRef.current = null;
    wasPlayingRef.current = false;
    // AFF-612: Reset completion tracking for new video
    maxPositionRef.current = 0;
    videoDurationRef.current = 0;
    watchStartTimeRef.current = Date.now();
    hasTrackedCompletionRef.current = false;
    videoSourceUriRef.current = videoSourceUri;
  }, [videoSourceUri]);

  // Create video player
  const player = useVideoPlayer(optimizedVideoSource, player => {
    player.loop = shouldLoop;

    if (__DEV__) {
      console.log('🎬 [' + Platform.OS + '] Player created, autoPlay:', autoPlay);
    }

    if (autoPlay) {
      player.play();
    }
  })

  // Use proper expo-video event handling
  const { isPlaying } = useEvent(player, 'playingChange', {
    isPlaying: player.playing,
  })

  // Reset released flag when player changes; mark as released on cleanup
  useEffect(() => {
    isReleasedRef.current = false;
    return () => {
      isReleasedRef.current = true;
    };
  }, [player]);

  // ✅ FIXED: Correct event listener signature (receives single payload object)
  useEffect(() => {
    if (isReleasedRef.current) return;

    const statusSubscription = player.addListener('statusChange', (payload) => {
      if (isReleasedRef.current) return;

      try {
        const { status, oldStatus, error } = payload;

        AppLogger.info('video', 'Video player status changed', { oldStatus: oldStatus, newStatus: status });

        if (error) {
          AppLogger.error('video', 'Video player error', { uri: typeof videoSource === 'object' ? videoSource?.uri : videoSource }, error);
        }

        if (status === 'readyToPlay') {
          AppLogger.info('video', 'Video ready to play');

          // AFF-579: Track video load time (player creation -> readyToPlay)
          if (!hasTrackedLoadTime.current && playerCreatedAtRef.current > 0) {
            const loadTimeMs = Date.now() - playerCreatedAtRef.current;
            const videoUrl = typeof videoSource === 'object' ? videoSource?.uri : String(videoSource ?? '');
            const isHLS = videoUrl?.includes('.m3u8') || videoUrl?.includes('/hls/') || videoUrl?.includes('format=m3u8');
            const cdnDomain = networkPerformanceService.extractCDNDomain(videoUrl || '');
            analyticsService.trackVideoLoadTime({
              load_time_ms: loadTimeMs,
              video_url: videoUrl || '',
              content_type: isHLS ? 'hls' : 'progressive',
              cdn_domain: cdnDomain,
            });
            hasTrackedLoadTime.current = true;

            // Passive network speed: HEAD request for Content-Length, then record throughput
            // Non-blocking — runs in background, does not delay video playback
            if (videoUrl && !isHLS) {
              networkPerformanceService.fetchContentLength(videoUrl).then((bytes) => {
                if (bytes) {
                  const sample = networkPerformanceService.recordThroughput(bytes, loadTimeMs, 'video');
                  if (sample) {
                    analyticsService.trackNetworkSpeed({
                      download_speed_mbps: sample.speedMbps,
                      content_size_bytes: sample.contentSizeBytes,
                      load_time_ms: sample.loadTimeMs,
                      media_type: 'video',
                      measurement_method: 'passive',
                      cdn_domain: cdnDomain,
                    });
                  }
                }
              }).catch((error) => {
                AppLogger.warn('network', 'Network speed measurement failed', {
                  url: videoUrl.substring(0, 80),
                  error: error instanceof Error ? error.message : String(error),
                });
              });
            }
          }

          if (!isVideoLoaded) {
            setIsVideoLoaded(true);
          }
          if (autoPlay && !player.playing) {
            if (__DEV__) {
              console.log('🎬 [Android] Forcing play after readyToPlay');
            }
            player.play();
          }
        }

        if (status === 'error') {
          AppLogger.error('video', 'Video player entered error state', { uri: typeof videoSource === 'object' ? videoSource?.uri : videoSource });

          // AFF-579: Track CDN error (once per video source)
          if (!hasTrackedErrorRef.current) {
            const videoUrl = typeof videoSource === 'object' ? videoSource?.uri : String(videoSource ?? '');
            analyticsService.trackCDNError({
              media_type: 'video',
              url: videoUrl || '',
              cdn_domain: networkPerformanceService.extractCDNDomain(videoUrl || ''),
              error_message: error?.message || error?.toString() || 'unknown_video_error',
            });
            hasTrackedErrorRef.current = true;
          }
        }
      } catch (err) {
        AppLogger.error('video', 'Video statusChange handler error', {}, err);
      }
    });

    return () => statusSubscription?.remove();
  }, [player, isVideoLoaded, autoPlay, videoSource]);

  // AFF-579: Detect buffering via playingChange transitions
  // Only after readyToPlay (isVideoLoaded), only when app is active
  useEffect(() => {
    if (isReleasedRef.current || !isVideoLoaded || !appIsActiveRef.current) {
      wasPlayingRef.current = isPlaying;
      return;
    }

    const MAX_BUFFER_MS = 30_000; // Ignore stalls > 30s (likely app backgrounded)
    const MIN_BUFFER_MS = 200;    // Ignore sub-200ms jitter

    if (wasPlayingRef.current && !isPlaying && !userInitiatedPauseRef.current) {
      // Was playing, now stopped without user action -> buffer stall
      bufferStartTimeRef.current = Date.now();
    } else if (!wasPlayingRef.current && isPlaying && bufferStartTimeRef.current) {
      // Resumed after a buffer stall
      const bufferDurationMs = Date.now() - bufferStartTimeRef.current;
      bufferStartTimeRef.current = null;

      if (bufferDurationMs > MIN_BUFFER_MS && bufferDurationMs < MAX_BUFFER_MS) {
        const isHLS = videoSourceUri?.includes('.m3u8') || videoSourceUri?.includes('/hls/') || videoSourceUri?.includes('format=m3u8');
        analyticsService.trackVideoBufferStall({
          buffer_time_ms: bufferDurationMs,
          video_url: videoSourceUri || '',
          content_type: isHLS ? 'hls' : 'progressive',
          cdn_domain: networkPerformanceService.extractCDNDomain(videoSourceUri || ''),
        });
      }
    }

    // Only reset pause flag when user PAUSED (not when they tap to resume)
    if (!isPlaying) {
      userInitiatedPauseRef.current = false;
    }
    wasPlayingRef.current = isPlaying;
  }, [isPlaying, isVideoLoaded, videoSourceUri]);

  // Progress updates + AFF-612: track max position for completion rate
  useEffect(() => {
    const interval = setInterval(() => {
      if (isReleasedRef.current) return;
      try {
        if (player.status === 'readyToPlay') {
          const currentTime = player.currentTime;
          const duration = player.duration;

          if (Number.isFinite(currentTime) && Number.isFinite(duration) && duration > 0) {
            // AFF-612: Track highest position reached (handles looping videos)
            maxPositionRef.current = Math.max(maxPositionRef.current, currentTime);
            videoDurationRef.current = duration;

            if (onPlaybackStatusUpdate) {
              onPlaybackStatusUpdate({
                isLoaded: true,
                isPlaying: player.playing,
                positionMillis: currentTime * 1000,
                durationMillis: duration * 1000,
                status: 'readyToPlay'
              });
            }
          }
        }
      } catch {
        // Player released mid-interval — safe to ignore, cleanup will clear interval
      }
    }, 100);

    return () => clearInterval(interval);
  }, [player, onPlaybackStatusUpdate]);

  // Cleanup + AFF-612: fire video_completion on unmount
  useEffect(() => {
    return () => {
      // AFF-612: Track completion rate before cleanup (all values from refs — no stale closures)
      if (!hasTrackedCompletionRef.current && videoDurationRef.current > 0) {
        const url = videoSourceUriRef.current;
        const completionRate = Math.min(maxPositionRef.current / videoDurationRef.current, 1.0);
        const isHLS = url?.includes('.m3u8') || url?.includes('/hls/') || url?.includes('format=m3u8');
        analyticsService.trackVideoCompletion({
          completion_rate: completionRate,
          watch_duration_ms: Date.now() - watchStartTimeRef.current,
          video_duration_ms: videoDurationRef.current * 1000,
          video_url: url || '',
          content_type: isHLS ? 'hls' : 'progressive',
          cdn_domain: networkPerformanceService.extractCDNDomain(url || ''),
        });
        hasTrackedCompletionRef.current = true;
      }

      try {
        player.pause();
      } catch (error) {
        // Silently handle cleanup errors
      }
    };
  }, [player]);

  // Handle tap to play/pause
  const handleVideoTap = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (isPlaying) {
        userInitiatedPauseRef.current = true; // AFF-579: Only flag pause, not resume
        player.pause();
      } else {
        // User tapping to resume - clear any pending buffer tracking
        bufferStartTimeRef.current = null;
        player.play();
      }
    } catch (error) {
      AppLogger.error('video', 'Failed to toggle playback', {}, error);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={handleVideoTap}>
      <View style={styles.container}>
        <VideoView
          player={player}
          style={styles.video}
          fullscreenOptions={{ enable: false }}
          allowsPictureInPicture={false}
          nativeControls={false}
          contentFit="cover"
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: 'black',
    position: 'relative',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: 'black',
  },
});
