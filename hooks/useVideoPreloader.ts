// useVideoPreloader.ts - Preload videos for instant playback
// Creates VideoPlayer instances that buffer in background before display

import { useEffect, useRef } from 'react';
import { createVideoPlayer, VideoPlayer } from 'expo-video';

interface PreloadOptions {
  enabled?: boolean;  // Allow disabling preload
  maxVideos?: number; // Limit number of videos to preload (default: 10)
}

/**
 * Preloads an array of video URLs so they start instantly when displayed.
 * Creates VideoPlayer instances that buffer in the background.
 * Players are automatically cleaned up on unmount.
 *
 * @param videoUrls - Array of video URLs to preload
 * @param options - Configuration options
 */
export function useVideoPreloader(
  videoUrls: string[],
  options: PreloadOptions = {}
): void {
  const { enabled = true, maxVideos = 10 } = options;
  const playersRef = useRef<VideoPlayer[]>([]);

  useEffect(() => {
    if (!enabled || videoUrls.length === 0) {
      return;
    }

    // Filter valid URLs and limit count
    const urlsToPreload = videoUrls
      .filter((url) => url && typeof url === 'string' && url.length > 0)
      .slice(0, maxVideos);

    if (urlsToPreload.length === 0) {
      return;
    }

    console.log(`🎬 Preloading ${urlsToPreload.length} videos...`);

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

    // Cleanup: release all players on unmount
    return () => {
      console.log(`🎬 Releasing ${playersRef.current.length} preload players`);
      for (const player of playersRef.current) {
        try {
          player.release();
        } catch (error) {
          // Silently ignore cleanup errors
        }
      }
      playersRef.current = [];
    };
  }, [enabled, videoUrls.join(','), maxVideos]);
}

/**
 * Extract all video URLs from ROI content items
 */
export function extractVideoUrls(contentList: Array<{ media_url?: string[] | null; content_type?: string }>): string[] {
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
