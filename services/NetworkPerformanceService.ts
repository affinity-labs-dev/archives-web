/**
 * NetworkPerformanceService - Singleton that provides network context and
 * real-time throughput monitoring for analytics enrichment.
 *
 * Network context:
 *   Caches network state from @react-native-community/netinfo and exposes
 *   getNetworkContext() for spreading into PostHog event properties.
 *
 * Throughput monitoring (two sources):
 *   1. Passive: HEAD requests for Content-Length on progressive MP4 loads
 *   2. Real-time: Native OS byte counters (getifaddrs / TrafficStats) polled
 *      every 5s — measures actual app traffic including HLS segments.
 *
 * Usage:
 *   networkPerformanceService.initialize();
 *   networkPerformanceService.pollNetworkStats();     // Call every 5s from useDeviceHealthMonitor
 *   const throughput = networkPerformanceService.getCurrentThroughput(); // Real-time Mbps
 *   const avg = networkPerformanceService.getAverageSpeed();            // Median across session
 */

import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import AppLogger from './AppLogger';
import { getNetworkStats, runSpeedTest as nativeRunSpeedTest, type SpeedTestResult } from '@/modules/device-health';

/** Fixed test URL on CloudFront CDN (~3.5MB image) */
const SPEED_TEST_URL = 'https://d1bcceam8ucosn.cloudfront.net/era-thumbnails/prophets-era';

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

  // ── Real-time traffic monitoring state ─────────────────────────
  private prevBytesReceived = -1;
  private prevBytesSent = -1;
  private prevPollTimestamp = 0;
  private currentDownloadMbps = 0;
  private currentUploadMbps = 0;

  // ── One-time speed test state ─────────────────────────────────
  private lastSpeedTestResult: SpeedTestResult | null = null;
  private isRunningSpeedTest = false;

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

  // ══════════════════════════════════════════════════════════════════
  // Real-time Traffic Monitoring (via native OS byte counters)
  // ══════════════════════════════════════════════════════════════════

  /**
   * Poll native OS byte counters and calculate current throughput.
   * Call this every 5s from useDeviceHealthMonitor's poll cycle.
   *
   * iOS: getifaddrs() — sums all network interface bytes
   * Android: TrafficStats.getUidRxBytes — app-specific bytes
   *
   * First call is a priming read (establishes baseline, returns 0 Mbps).
   *
   * Edge cases handled:
   * - Web platform → skip
   * - Native module unavailable → skip gracefully
   * - Counter overflow/reset (device reboot) → skip that delta
   * - Negative delta (counter reset) → skip
   * - App backgrounded → caller pauses polling, no false data
   */
  pollNetworkStats(): void {
    if (Platform.OS === 'web') return;

    try {
      const stats = getNetworkStats();
      const now = Date.now();

      // Skip if counters are unsupported
      if (stats.bytesReceived < 0 || stats.bytesSent < 0) return;

      if (this.prevBytesReceived >= 0 && this.prevPollTimestamp > 0) {
        const timeDeltaMs = now - this.prevPollTimestamp;
        const rxDelta = stats.bytesReceived - this.prevBytesReceived;
        const txDelta = stats.bytesSent - this.prevBytesSent;

        // Guard: skip negative deltas (counter reset after reboot)
        // Guard: skip unreasonable time deltas (< 1s or > 30s)
        if (rxDelta >= 0 && txDelta >= 0 && timeDeltaMs > 1000 && timeDeltaMs < 30_000) {
          // Calculate speed: (bytes × 8 bits) / (ms × 1000) = Mbps
          this.currentDownloadMbps = Math.round(((rxDelta * 8) / (timeDeltaMs * 1000)) * 100) / 100;
          this.currentUploadMbps = Math.round(((txDelta * 8) / (timeDeltaMs * 1000)) * 100) / 100;

          // Record as speed sample if there's meaningful download activity
          if (this.currentDownloadMbps > MIN_SPEED_MBPS && this.currentDownloadMbps < MAX_SPEED_MBPS) {
            const sample: SpeedSample = {
              speedMbps: this.currentDownloadMbps,
              mediaType: 'video',
              contentSizeBytes: rxDelta,
              loadTimeMs: timeDeltaMs,
              timestamp: now,
            };

            if (this.speedSamples.length >= MAX_SAMPLES) {
              this.speedSamples.shift();
            }
            this.speedSamples.push(sample);
          }
        }
      }

      // Store current values for next delta
      this.prevBytesReceived = stats.bytesReceived;
      this.prevBytesSent = stats.bytesSent;
      this.prevPollTimestamp = now;
    } catch {
      // Native module not available — safe to ignore
    }
  }

  /**
   * Get current real-time throughput from the latest poll cycle.
   * Returns { downloadMbps, uploadMbps } or null if no data yet.
   */
  getCurrentThroughput(): { downloadMbps: number; uploadMbps: number } | null {
    if (this.prevPollTimestamp === 0) return null;
    return {
      downloadMbps: this.currentDownloadMbps,
      uploadMbps: this.currentUploadMbps,
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // One-time Speed Test (downloads ~3.5MB test file from CDN)
  // ══════════════════════════════════════════════════════════════════

  /**
   * Run a one-time speed test by downloading a fixed file from the app's CDN.
   * Called once when a video starts playing to measure bandwidth at that moment.
   *
   * Edge cases:
   * - Web platform → skip
   * - Offline → skip
   * - Already running → return last result
   * - Native module unavailable → return null
   * - CDN error / timeout → return null
   */
  async runSpeedTest(): Promise<SpeedTestResult | null> {
    if (Platform.OS === 'web') return null;

    const ctx = this.getNetworkContext();
    if (!ctx.is_connected || ctx.network_type === 'offline') return null;

    // Prevent concurrent tests
    if (this.isRunningSpeedTest) return this.lastSpeedTestResult;

    this.isRunningSpeedTest = true;

    try {
      // Cache-busting: unique query param forces CDN to skip edge cache
      const testUrl = `${SPEED_TEST_URL}?_cb=${Date.now()}`;
      const result = await nativeRunSpeedTest(testUrl);

      if (result.downloadSpeedMbps > 0 && Number.isFinite(result.downloadSpeedMbps)) {
        this.lastSpeedTestResult = result;
      }

      return result;
    } catch (error) {
      AppLogger.warn('network', 'Speed test failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    } finally {
      this.isRunningSpeedTest = false;
    }
  }

  /**
   * Get the result of the last speed test run in this session.
   * Returns null if no test has been run yet.
   */
  getLastSpeedTest(): SpeedTestResult | null {
    return this.lastSpeedTestResult;
  }

  /**
   * Reset speed tracking session.
   * Call when a new monitoring session starts (e.g., new lesson).
   */
  resetSpeedSession() {
    this.speedSamples = [];
    this.contentLengthCache.clear();
    this.prevBytesReceived = -1;
    this.prevBytesSent = -1;
    this.prevPollTimestamp = 0;
    this.currentDownloadMbps = 0;
    this.currentUploadMbps = 0;
    this.lastSpeedTestResult = null;

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
