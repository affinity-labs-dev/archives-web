/**
 * AdaptivePreloadService.ts
 *
 * Smart preloading service that adapts to device capabilities and network conditions.
 * Integrates with adventure unlock system to preload content progressively.
 *
 * Strategy:
 * - Detects device tier (low/medium/high) based on RAM and platform
 * - Checks network type (WiFi vs cellular) for aggressive vs conservative preloading
 * - Uses progress percentage to trigger predictive preloading:
 *   - 60%+ complete on adventure N → Start preloading adventure N+1 images (light)
 *   - 80%+ complete on adventure N → Preload adventure N+1 videos too (full)
 * - Respects device memory limits to prevent OOM crashes
 */

import * as Device from 'expo-device';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Image } from 'expo-image';
import { createVideoPlayer, VideoPlayer } from 'expo-video';
import { Platform } from 'react-native';

// ============================================================================
// Types
// ============================================================================

export type DeviceTier = 'low' | 'medium' | 'high';
export type NetworkType = 'wifi' | 'cellular' | 'offline' | 'unknown';
export type PreloadIntensity = 'none' | 'light' | 'full';

export interface PreloadConfig {
  tier: DeviceTier;
  networkType: NetworkType;
  maxVideos: number;
  maxImages: number;
  preloadNextAdventure: boolean;
  preloadFirstLocked: boolean;
  videoCacheSizeMB: number;
  // Carousel-specific limits (per module)
  maxCarouselVideos: number;  // How many videos to preload from a carousel
  maxCarouselImages: number;  // How many images to preload from a carousel
}

export interface ContentUrls {
  images: string[];
  videos: string[];
  // Track which are HLS (can't be cached on iOS) - optional, HLS detection is automatic
  hlsVideos?: string[];
  progressiveVideos?: string[];
}

interface PreloadState {
  preloadedImages: Set<string>;
  preloadedVideos: Set<string>;
  videoPlayers: Map<string, VideoPlayer>;
  isPreloading: boolean;
}

// ============================================================================
// Constants
// ============================================================================

// Device tier thresholds (RAM in GB)
const LOW_TIER_MAX_RAM = 3;      // < 3GB = low tier (budget devices)
const HIGH_TIER_MIN_RAM = 6;    // >= 6GB = high tier (flagship devices)

// Preload limits per tier
const TIER_CONFIGS: Record<DeviceTier, Omit<PreloadConfig, 'networkType'>> = {
  low: {
    tier: 'low',
    maxVideos: 2,
    maxImages: 5,
    preloadNextAdventure: false,
    preloadFirstLocked: false,
    videoCacheSizeMB: 100,
    maxCarouselVideos: 1,   // Only first video of carousel
    maxCarouselImages: 2,   // First 2 images of carousel
  },
  medium: {
    tier: 'medium',
    maxVideos: 5,
    maxImages: 15,
    preloadNextAdventure: true,
    preloadFirstLocked: false,
    videoCacheSizeMB: 300,
    maxCarouselVideos: 2,   // First 2 videos of carousel
    maxCarouselImages: 3,   // First 3 images of carousel
  },
  high: {
    tier: 'high',
    maxVideos: 10,
    maxImages: 25,
    preloadNextAdventure: true,
    preloadFirstLocked: true,
    videoCacheSizeMB: 500,
    maxCarouselVideos: 3,   // First 3 videos of carousel
    maxCarouselImages: 5,   // First 5 images of carousel
  },
};

// Network multipliers (reduce limits on cellular)
const CELLULAR_MULTIPLIER = 0.5;

// ============================================================================
// HLS Detection
// ============================================================================

/**
 * Detect if a video URL is HLS (HTTP Live Streaming)
 * HLS uses .m3u8 manifest files and cannot be cached on iOS
 */
export function isHLSVideo(url: string): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.includes('.m3u8') ||
    lowerUrl.includes('/hls/') ||
    lowerUrl.includes('format=m3u8') ||
    lowerUrl.includes('format=hls')
  );
}

/**
 * Check if video caching is supported for this URL on current platform
 * HLS cannot be cached on iOS per expo-video limitations
 */
export function canCacheVideo(url: string): boolean {
  if (Platform.OS === 'ios' && isHLSVideo(url)) {
    return false;  // iOS + HLS = no caching
  }
  return true;  // MP4 or Android = caching works
}

// ============================================================================
// State
// ============================================================================

const state: PreloadState = {
  preloadedImages: new Set(),
  preloadedVideos: new Set(),
  videoPlayers: new Map(),
  isPreloading: false,
};

// Cached config (recomputed on network change)
let cachedConfig: PreloadConfig | null = null;
let configTimestamp = 0;
const CONFIG_CACHE_MS = 30000; // Refresh config every 30 seconds

// ============================================================================
// Device & Network Detection
// ============================================================================

/**
 * Detect device tier based on RAM and platform
 */
function detectDeviceTier(): DeviceTier {
  const totalMemory = Device.totalMemory;

  // If we can't detect memory, use platform-based heuristics
  if (!totalMemory) {
    // iOS devices generally have better memory management
    // and the app targets modern devices (iOS 15+)
    return Platform.OS === 'ios' ? 'high' : 'medium';
  }

  const memoryGB = totalMemory / (1024 ** 3);

  if (memoryGB < LOW_TIER_MAX_RAM) {
    return 'low';
  } else if (memoryGB >= HIGH_TIER_MIN_RAM) {
    return 'high';
  }
  return 'medium';
}

/**
 * Detect network type from NetInfo state
 */
function detectNetworkType(netState: NetInfoState): NetworkType {
  if (!netState.isConnected) {
    return 'offline';
  }

  switch (netState.type) {
    case 'wifi':
    case 'ethernet':
      return 'wifi';
    case 'cellular':
      return 'cellular';
    default:
      return 'unknown';
  }
}

/**
 * Get preload configuration based on device and network
 * Cached for performance, refreshes on network change
 */
export async function getPreloadConfig(): Promise<PreloadConfig> {
  const now = Date.now();

  // Return cached config if still valid
  if (cachedConfig && (now - configTimestamp) < CONFIG_CACHE_MS) {
    return cachedConfig;
  }

  const [netState] = await Promise.all([
    NetInfo.fetch(),
  ]);

  const tier = detectDeviceTier();
  const networkType = detectNetworkType(netState);
  const baseConfig = TIER_CONFIGS[tier];

  // Apply network multiplier for cellular
  const multiplier = networkType === 'cellular' ? CELLULAR_MULTIPLIER : 1;

  cachedConfig = {
    ...baseConfig,
    networkType,
    maxVideos: Math.round(baseConfig.maxVideos * multiplier),
    maxImages: Math.round(baseConfig.maxImages * multiplier),
    // Disable next adventure preload on cellular for low/medium tier
    preloadNextAdventure: networkType === 'wifi'
      ? baseConfig.preloadNextAdventure
      : tier === 'high',
    // Only preload first locked on WiFi and high tier
    preloadFirstLocked: networkType === 'wifi' && baseConfig.preloadFirstLocked,
  };

  configTimestamp = now;

  console.log(`📱 [Preload] Config: tier=${tier}, network=${networkType}, maxVideos=${cachedConfig.maxVideos}, maxImages=${cachedConfig.maxImages}`);

  return cachedConfig;
}

/**
 * Force refresh config (call on network change)
 */
export function invalidateConfigCache(): void {
  cachedConfig = null;
  configTimestamp = 0;
}

// ============================================================================
// Image Preloading
// ============================================================================

/**
 * Preload images using expo-image's prefetch
 * Uses 'disk' cache policy for persistence across sessions
 */
export async function preloadImages(
  urls: string[],
  config: PreloadConfig
): Promise<number> {
  if (urls.length === 0 || config.networkType === 'offline') {
    return 0;
  }

  // Filter already preloaded and limit count
  const newUrls = urls
    .filter(url => url && !state.preloadedImages.has(url))
    .slice(0, config.maxImages);

  if (newUrls.length === 0) {
    return 0;
  }

  console.log(`🖼️ [Preload] Starting ${newUrls.length} images...`);

  try {
    // Use expo-image's prefetch with disk caching
    const success = await Image.prefetch(newUrls, { cachePolicy: 'disk' });

    if (success) {
      newUrls.forEach(url => state.preloadedImages.add(url));
      console.log(`🖼️ [Preload] ✅ ${newUrls.length} images cached (total: ${state.preloadedImages.size})`);
      return newUrls.length;
    } else {
      console.warn('🖼️ [Preload] ⚠️ Some images failed to prefetch');
      return 0;
    }
  } catch (error) {
    console.error('🖼️ [Preload] ❌ Error:', error);
    return 0;
  }
}

// ============================================================================
// Video Preloading
// ============================================================================

/**
 * Preload videos by creating VideoPlayer instances with caching enabled
 * Players buffer in background even when not connected to VideoView
 *
 * IMPORTANT: HLS videos cannot be cached on iOS (expo-video limitation)
 * For HLS on iOS, we still create a player to buffer initial segments,
 * but without persistent caching.
 */
export async function preloadVideos(
  urls: string[],
  config: PreloadConfig
): Promise<number> {
  if (urls.length === 0 || config.networkType === 'offline') {
    return 0;
  }

  // Filter already preloaded and limit count
  const newUrls = urls
    .filter(url => url && !state.preloadedVideos.has(url))
    .slice(0, config.maxVideos);

  if (newUrls.length === 0) {
    return 0;
  }

  // Separate HLS and progressive videos for logging
  const hlsUrls = newUrls.filter(isHLSVideo);
  const progressiveUrls = newUrls.filter(url => !isHLSVideo(url));

  console.log(`📹 [Preload] Starting ${newUrls.length} videos (${progressiveUrls.length} MP4, ${hlsUrls.length} HLS)...`);

  let successCount = 0;
  let hlsSkipped = 0;

  for (const url of newUrls) {
    try {
      const isHLS = isHLSVideo(url);
      const canCache = canCacheVideo(url);

      // For HLS on iOS in light preload mode, skip entirely (too heavy without caching benefit)
      if (isHLS && Platform.OS === 'ios' && config.networkType === 'cellular') {
        hlsSkipped++;
        console.log(`📹 [Preload] ⏭️ Skipping HLS on iOS cellular: ${url.substring(0, 50)}...`);
        continue;
      }

      // Create player with appropriate caching setting
      const player = createVideoPlayer({
        uri: url,
        useCaching: canCache,  // Only enable caching if supported
      });

      // Mute and don't play - just buffer
      player.muted = true;

      // For HLS, limit buffer to reduce memory (just buffer start)
      if (isHLS) {
        player.bufferOptions = {
          preferredForwardBufferDuration: 5,  // Only 5 seconds for HLS
        };
      }

      // Store reference for cleanup
      state.videoPlayers.set(url, player);
      state.preloadedVideos.add(url);
      successCount++;
    } catch (error) {
      console.error(`📹 [Preload] ❌ Failed: ${url}`, error);
    }
  }

  const statusMsg = hlsSkipped > 0
    ? `✅ ${successCount}/${newUrls.length} buffering, ${hlsSkipped} HLS skipped`
    : `✅ ${successCount}/${newUrls.length} buffering`;

  console.log(`📹 [Preload] ${statusMsg} (total: ${state.preloadedVideos.size})`);

  return successCount;
}

/**
 * Release preloaded video players to free memory
 * Call when adventure is no longer needed
 */
export function releaseVideoPreloads(urls?: string[]): void {
  const urlsToRelease = urls ?? Array.from(state.videoPlayers.keys());

  for (const url of urlsToRelease) {
    const player = state.videoPlayers.get(url);
    if (player) {
      try {
        player.release();
      } catch (error) {
        // Silently ignore cleanup errors
      }
      state.videoPlayers.delete(url);
      state.preloadedVideos.delete(url);
    }
  }

  if (!urls) {
    console.log('📹 [Preload] Released all video players');
  }
}

// ============================================================================
// Adventure Content Preloading
// ============================================================================

/**
 * Preload content for an adventure based on intensity level
 * - 'light': Images only (fast, low memory)
 * - 'full': Images + Videos
 */
export async function preloadAdventureContent(
  content: ContentUrls,
  intensity: PreloadIntensity,
  config: PreloadConfig
): Promise<{ images: number; videos: number }> {
  if (intensity === 'none' || state.isPreloading) {
    return { images: 0, videos: 0 };
  }

  state.isPreloading = true;

  try {
    // Always preload images first (lighter)
    const imagesLoaded = await preloadImages(content.images, config);

    // Only preload videos on 'full' intensity
    let videosLoaded = 0;
    if (intensity === 'full') {
      videosLoaded = await preloadVideos(content.videos, config);
    }

    return { images: imagesLoaded, videos: videosLoaded };
  } finally {
    state.isPreloading = false;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get preloading stats
 */
export function getPreloadStats(): {
  preloadedImages: number;
  preloadedVideos: number;
  activeVideoPlayers: number;
} {
  return {
    preloadedImages: state.preloadedImages.size,
    preloadedVideos: state.preloadedVideos.size,
    activeVideoPlayers: state.videoPlayers.size,
  };
}

/**
 * Check if a URL is already preloaded
 */
export function isPreloaded(url: string): boolean {
  return state.preloadedImages.has(url) || state.preloadedVideos.has(url);
}

/**
 * Clear all preload caches and release resources
 */
export function clearAllPreloads(): void {
  releaseVideoPreloads();
  state.preloadedImages.clear();
  console.log('🧹 [Preload] Cleared all preload caches');
}

/**
 * Setup network change listener to invalidate config cache
 */
export function setupNetworkListener(): () => void {
  const unsubscribe = NetInfo.addEventListener((netState) => {
    const newNetworkType = detectNetworkType(netState);
    if (cachedConfig && cachedConfig.networkType !== newNetworkType) {
      console.log(`📶 [Preload] Network changed to ${newNetworkType}, refreshing config`);
      invalidateConfigCache();
    }
  });

  return unsubscribe;
}

// Default export for convenience
export default {
  getPreloadConfig,
  preloadImages,
  preloadVideos,
  preloadAdventureContent,
  releaseVideoPreloads,
  clearAllPreloads,
  getPreloadStats,
  isPreloaded,
  setupNetworkListener,
  invalidateConfigCache,
};
