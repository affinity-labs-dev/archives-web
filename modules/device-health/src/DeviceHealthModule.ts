import { requireNativeModule } from 'expo-modules-core';

export interface CPUUsage {
  /** CPU usage percentage (0-100). Returns -1 on first call (no previous snapshot to compare). */
  usagePercent: number;
  /** Number of active CPU cores */
  coreCount: number;
}

export interface NetworkStats {
  /** Cumulative bytes received by the app since device boot. -1 if unsupported. */
  bytesReceived: number;
  /** Cumulative bytes sent by the app since device boot. -1 if unsupported. */
  bytesSent: number;
}

const DeviceHealth = requireNativeModule('DeviceHealth');

/**
 * Get current system-wide CPU usage as a percentage.
 *
 * Uses delta between consecutive calls — first call returns -1 (priming read).
 * Recommended polling interval: 3-5 seconds.
 *
 * iOS: Mach kernel host_statistics (HOST_CPU_LOAD_INFO)
 * Android: /proc/stat tick counters
 */
export async function getCPUUsage(): Promise<CPUUsage> {
  return DeviceHealth.getCPUUsage();
}

/**
 * Reset the stored CPU tick snapshot.
 * Call when a monitoring session ends so the next session starts fresh.
 */
export function resetCPUSnapshot(): void {
  DeviceHealth.resetCPUSnapshot();
}

/**
 * Read cumulative network byte counters from OS.
 * Returns bytes received/sent since device boot — JS calculates delta for throughput.
 *
 * iOS: getifaddrs() — sums all network interface byte counters
 * Android: TrafficStats.getUidRxBytes/getUidTxBytes — app-specific counters
 *
 * This is a synchronous native call (no network I/O), safe to poll every 5s.
 */
export function getNetworkStats(): NetworkStats {
  return DeviceHealth.getNetworkStats();
}

export interface SpeedTestResult {
  /** Measured download speed in Mbps. -1 if failed. */
  downloadSpeedMbps: number;
  /** Bytes downloaded during the test. */
  bytesDownloaded: number;
  /** Total test duration in ms. -1 if failed. */
  durationMs: number;
}

/**
 * Run a one-time speed test by downloading a file from a URL.
 * Downloads the entire file (~3.5MB) for accurate throughput measurement.
 *
 * iOS: URLSession async download (no caching)
 * Android: HttpURLConnection full download
 *
 * @param testUrl - Fixed URL to a known-size file on the app's CDN
 */
export async function runSpeedTest(testUrl: string): Promise<SpeedTestResult> {
  return DeviceHealth.runSpeedTest(testUrl);
}
