/**
 * NetworkPerformanceService - Singleton that provides network context and passive
 * throughput estimation for analytics enrichment.
 *
 * Caches network state from @react-native-community/netinfo and exposes
 * getNetworkContext() for spreading into PostHog event properties.
 *
 * Throughput estimation:
 *   Records download speed samples from actual media loads (videos/images).
 *   Uses HEAD requests to fetch Content-Length, combined with measured load time
 *   to calculate Mbps passively — zero extra bandwidth cost.
 *
 * Usage:
 *   networkPerformanceService.initialize();          // Call once in _layout.tsx
 *   const ctx = networkPerformanceService.getNetworkContext();  // Spread into events
 *   const size = await networkPerformanceService.fetchContentLength(url);
 *   networkPerformanceService.recordThroughput(size, loadTimeMs, 'video');
 *   const speed = networkPerformanceService.getAverageSpeed();
 */

import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import AppLogger from './AppLogger';

export interface NetworkContext {
  network_type: 'wifi' | 'cellular' | 'ethernet' | 'offline' | 'unknown';
  cellular_generation: '2g' | '3g' | '4g' | '5g' | null;
  is_connected: boolean | null;
}

export interface SpeedSample {
  speedMbps: number;
  mediaType: 'video' | 'image';
  contentSizeBytes: number;
  loadTimeMs: number;
  timestamp: number;
}

export interface AverageSpeed {
  download_speed_mbps: number;  // Median speed across samples
  sample_count: number;
  min_speed_mbps: number;
  max_speed_mbps: number;
}

// ── Throughput estimation constants ──────────────────────────────────
const HEAD_TIMEOUT_MS = 3000;           // Abort HEAD request after 3s
const MIN_LOAD_TIME_MS = 200;           // Skip cached content (< 200ms)
const MAX_LOAD_TIME_MS = 60_000;        // Skip stalled/backgrounded loads (> 60s)
const MIN_CONTENT_BYTES = 50 * 1024;    // Skip files < 50KB (inaccurate estimate)
const MAX_SPEED_MBPS = 500;             // Clamp unrealistic speeds (CDN edge hits)
const MIN_SPEED_MBPS = 0.01;            // Skip stalled connections
const MAX_SAMPLES = 30;                 // Rolling window size

class NetworkPerformanceService {
  private cachedState: NetInfoState | null = null;
  private unsubscribe: (() => void) | null = null;

  // ── Throughput estimation state ──────────────────────────────────
  private contentLengthCache = new Map<string, number>();
  private speedSamples: SpeedSample[] = [];
  private pendingAbortControllers = new Set<AbortController>();

  initialize() {
    if (this.unsubscribe) return; // Already initialized

    try {
      // Fetch initial state (listener also fires immediately, this is a fallback)
      NetInfo.fetch().then((state) => {
        this.cachedState = state;
      }).catch((error) => {
        AppLogger.warn('network', 'NetInfo.fetch() failed, using safe defaults', { error: String(error) });
      });

      // Listen for changes
      this.unsubscribe = NetInfo.addEventListener((state) => {
        this.cachedState = state;
      });
    } catch (error) {
      // Native module not linked (e.g., after OTA update) — app must not crash
      AppLogger.error('network', 'NetInfo initialization failed, network context unavailable', {}, error);
    }
  }

  getNetworkContext(): NetworkContext {
    if (!this.cachedState) {
      return { network_type: 'unknown', cellular_generation: null, is_connected: null };
    }

    const { type, isConnected, details } = this.cachedState;

    let networkType: NetworkContext['network_type'];
    switch (type) {
      case NetInfoStateType.wifi:
        networkType = 'wifi';
        break;
      case NetInfoStateType.cellular:
        networkType = 'cellular';
        break;
      case NetInfoStateType.ethernet:
        networkType = 'ethernet';
        break;
      case NetInfoStateType.none:
        networkType = 'offline';
        break;
      default:
        networkType = 'unknown';
    }

    // Extract cellular generation (3g/4g/5g) when on cellular
    const cellularGeneration = (type === NetInfoStateType.cellular && details && 'cellularGeneration' in details)
      ? (details as { cellularGeneration?: '2g' | '3g' | '4g' | '5g' }).cellularGeneration ?? null
      : null;

    return {
      network_type: networkType,
      cellular_generation: cellularGeneration,
      is_connected: isConnected ?? null,
    };
  }

  /**
   * Extract CDN domain from a media URL for grouping in analytics.
   * e.g., "https://d1abc.cloudfront.net/videos/foo.mp4" -> "d1abc.cloudfront.net"
   */
  extractCDNDomain(url: string): string {
    try {
      const { hostname } = new URL(url);
      return hostname;
    } catch {
      AppLogger.warn('network', 'Failed to extract CDN domain from URL', { url: url?.substring(0, 100) });
      return 'unknown';
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Passive Throughput Estimation
  // ══════════════════════════════════════════════════════════════════

  /**
   * Fetch Content-Length for a URL via HEAD request.
   * Returns bytes or null if unavailable. Results are cached per-URL per-session.
   *
   * Edge cases handled:
   * - HLS URLs (.m3u8) → skip (no single Content-Length)
   * - Web platform → skip (CORS blocks most HEAD requests)
   * - Timeout after 3s → abort, return null
   * - Redirect chains → followed automatically by fetch, only size matters
   * - Cached results → Map lookup, no duplicate requests
   */
  async fetchContentLength(url: string): Promise<number | null> {
    // Skip on web (CORS issues) and for HLS (no single file size)
    if (Platform.OS === 'web') return null;
    if (!url || url.includes('.m3u8') || url.includes('/hls/') || url.includes('format=m3u8')) return null;

    // Return cached value if available
    const cached = this.contentLengthCache.get(url);
    if (cached !== undefined) return cached;

    const controller = new AbortController();
    this.pendingAbortControllers.add(controller);

    // Auto-abort after timeout
    const timeoutId = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });

      const contentLength = response.headers.get('content-length');
      const bytes = contentLength ? parseInt(contentLength, 10) : 0;

      // Validate: must be a positive number
      if (!Number.isFinite(bytes) || bytes <= 0) {
        this.contentLengthCache.set(url, 0);
        return null;
      }

      this.contentLengthCache.set(url, bytes);
      return bytes;
    } catch (error) {
      // AbortError (timeout), network error, CORS — all safe to ignore
      if ((error as Error).name !== 'AbortError') {
        AppLogger.warn('network', 'HEAD request failed', { url: url.substring(0, 80) });
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
      this.pendingAbortControllers.delete(controller);
    }
  }

  /**
   * Record a throughput sample from an actual media load.
   * Calculates speed (Mbps) from content size and load time.
   *
   * Edge cases handled:
   * - contentSizeBytes < 50KB → skip (too small for accurate estimate)
   * - loadTimeMs < 200ms → skip (likely served from cache)
   * - loadTimeMs > 60s → skip (likely app was backgrounded/stalled)
   * - Calculated speed > 500 Mbps → skip (CDN edge cache hit)
   * - Calculated speed < 0.01 Mbps → skip (stalled connection)
   * - NaN / Infinity → skip
   * - Offline → skip
   * - Rolling window capped at 30 samples
   */
  recordThroughput(
    contentSizeBytes: number,
    loadTimeMs: number,
    mediaType: 'video' | 'image',
  ): SpeedSample | null {
    // Guard: must be connected
    const ctx = this.getNetworkContext();
    if (!ctx.is_connected || ctx.network_type === 'offline') return null;

    // Guard: valid inputs
    if (contentSizeBytes < MIN_CONTENT_BYTES) return null;
    if (loadTimeMs < MIN_LOAD_TIME_MS || loadTimeMs > MAX_LOAD_TIME_MS) return null;
    if (loadTimeMs === 0) return null;

    // Calculate speed: (bytes × 8 bits) / (ms × 1000) = Mbps
    const speedMbps = (contentSizeBytes * 8) / (loadTimeMs * 1000);

    // Guard: realistic range
    if (!Number.isFinite(speedMbps)) return null;
    if (speedMbps < MIN_SPEED_MBPS || speedMbps > MAX_SPEED_MBPS) return null;

    const sample: SpeedSample = {
      speedMbps: Math.round(speedMbps * 100) / 100,
      mediaType,
      contentSizeBytes,
      loadTimeMs,
      timestamp: Date.now(),
    };

    // Rolling window: drop oldest if at capacity
    if (this.speedSamples.length >= MAX_SAMPLES) {
      this.speedSamples.shift();
    }
    this.speedSamples.push(sample);

    return sample;
  }

  /**
   * Get the median download speed from recorded samples.
   * Uses median (not mean) to naturally reject outliers.
   *
   * Returns null if no valid samples exist.
   */
  getAverageSpeed(): AverageSpeed | null {
    if (this.speedSamples.length === 0) return null;

    const speeds = this.speedSamples.map(s => s.speedMbps).sort((a, b) => a - b);
    const len = speeds.length;

    // Median calculation
    const median = len % 2 === 0
      ? (speeds[len / 2 - 1] + speeds[len / 2]) / 2
      : speeds[Math.floor(len / 2)];

    return {
      download_speed_mbps: Math.round(median * 100) / 100,
      sample_count: len,
      min_speed_mbps: Math.round(speeds[0] * 100) / 100,
      max_speed_mbps: Math.round(speeds[len - 1] * 100) / 100,
    };
  }

  /**
   * Reset speed tracking session.
   * Call when a new monitoring session starts (e.g., new lesson).
   */
  resetSpeedSession() {
    this.speedSamples = [];
    this.contentLengthCache.clear();

    // Abort any pending HEAD requests
    for (const controller of this.pendingAbortControllers) {
      controller.abort();
    }
    this.pendingAbortControllers.clear();
  }

  cleanup() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.cachedState = null;
    this.resetSpeedSession();
  }
}

export const networkPerformanceService = new NetworkPerformanceService();
