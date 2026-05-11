// useVideoPreloader.ts - Preload videos for instant playback
// Creates VideoPlayer instances that buffer in background before display
// NOTE: Disabled on Android to prevent decoder exhaustion (max ~4-8 hardware decoders)

import { createVideoPlayer, VideoPlayer } from 'expo-video';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

interface PreloadOptions {
  enabled?: boolean; // Allow disabling preload
  maxVideos?: number; // Limit number of videos to preload (default: 2 on Android, 6 on iOS)
}

/**
 * Preloads an array of video URLs so they start instantly when displayed.
 * Creates VideoPlayer instances that buffer in the background.
 * Players are automatically cleaned up on unmount.
 *
 * ANDROID: Limited to 2 videos max to prevent decoder exhaustion.
 * ExoPlayer's hardware decoders (OMX) have limited slots (~4-8 per device).
 *
 * @param videoUrls - Array of video URLs to preload
 * @param options - Configuration options
 */
export function useVideoPreloader(videoUrls: string[], options: PreloadOptions = {}): void {
  // Android: Limit to 2 to prevent decoder exhaustion, iOS: Allow 6
  const defaultMaxVideos = Platform.OS === 'android' ? 2 : 6;
  const { enabled = true, maxVideos = defaultMaxVideos } = options;
  const playersRef = useRef<VideoPlayer[]>([]);

  useEffect(() => {
    // Skip preloading if disabled or no URLs
    if (!enabled || videoUrls.length === 0) {
      return;
    }

    // ANDROID: Completely disable video preloading to prevent decoder exhaustion
    // ExoPlayer's hardware decoders (OMX) have limited slots (~4-8 per device)
    // Creating preload players exhausts these slots before actual playback
    if (Platform.OS === 'android') {
      console.log('🎬 [Android] Video preloading DISABLED - prevents decoder exhaustion');
      return;
    }

    // Filter valid URLs and limit count
    const urlsToPreload = videoUrls
      .filter((url) => url && typeof url === 'string' && url.length > 0)
      .slice(0, maxVideos);

    if (urlsToPreload.length === 0) {
      return;
    }

    console.log(
      `🎬 [${Platform.OS}] Preloading ${urlsToPreload.length}/${videoUrls.length} videos (max: ${maxVideos})`
    );

    // Create players for each video URL
    const players: VideoPlayer[] = [];

    for (const url of urlsToPreload) {
      try {
        const player = createVideoPlayer({
          uri: url,
          useCaching: true, // Enable caching for faster subsequent loads
        });

        // Don't play - just let it buffer
        player.muted = true;

        players.push(player);
      } catch (error) {
        console.error('🎬 Failed to create preload player:', error);
      }
    }

    playersRef.current = players;
    console.log(`🎬 Created ${players.length} preload players`);

    // Cleanup: safe deferred release to prevent EXC_BAD_ACCESS (REACT-NATIVE-17/1P)
    // AVPlayer KVO callbacks (onLoadedPlayerItem, currentVideoTrack.didset) may still
    // be queued on the native run loop when release() frees memory. Pausing first stops
    // new events, then a 200ms delay lets the run loop drain before freeing.
    return () => {
      const playersToRelease = [...playersRef.current];
      playersRef.current = [];

      if (playersToRelease.length === 0) return;

      for (const player of playersToRelease) {
        try {
          player.pause();
        } catch (err) {
          console.warn('🎬 [Preload] player.pause() failed before deferred release:', err);
        }
      }

      // ← 50ms delay: lets AVFoundation KVO queue drain before release() frees native memory
      // Prevents EXC_BAD_ACCESS (REACT-NATIVE-17/1P) from use-after-free on iOS
      setTimeout(() => {
        for (const player of playersToRelease) {
          try {
            player.release();
          } catch (err) {
            console.warn('🎬 [Preload] player.release() failed (deferred 50ms):', err);
          }
        }
        console.log(`🎬 Released ${playersToRelease.length} preload players (deferred)`);
      }, 50);
    };
  }, [enabled, videoUrls.join(','), maxVideos]);
}

/**
 * Extract all video URLs from ROI content items
 */
export function extractVideoUrls(
  contentList: { media_url?: string[] | null; content_type?: string }[]
): string[] {
  const urls: string[] = [];

  for (const item of contentList) {
    // Only preload video content types (reel, video_carousel)
    if (item.content_type === 'reel' || item.content_type === 'video_carousel') {
      if (item.media_url && Array.isArray(item.media_url)) {
        urls.push(...item.media_url.filter(Boolean));
      }
    }
  }

  return urls;
}
