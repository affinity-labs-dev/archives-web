// Web stub for the DeviceHealth native module.
//
// The native version calls `requireNativeModule('DeviceHealth')` at module
// scope, so on web it throws during evaluation rather than at call time. That
// matters because NetworkPerformanceService imports it and app/_layout.tsx
// imports NetworkPerformanceService - so without this file the whole app is a
// blank page before any route renders.
//
// The browser has no equivalent of Mach host_statistics or /proc/stat, so the
// honest answer is the same one the native side already uses for
// "unsupported": -1. Callers in this repo (useDeviceHealthMonitor,
// NetworkPerformanceService, DevHealthOverlay) already treat -1 as "no
// reading" because the first CPU sample is always a priming read, so returning
// it here needs no call-site changes.

export interface CPUUsage {
  usagePercent: number;
  coreCount: number;
}

export interface NetworkStats {
  bytesReceived: number;
  bytesSent: number;
}

export interface SpeedTestResult {
  downloadSpeedMbps: number;
  bytesDownloaded: number;
  durationMs: number;
}

export async function getCPUUsage(): Promise<CPUUsage> {
  // navigator.hardwareConcurrency is the one part the browser can answer.
  return {
    usagePercent: -1,
    coreCount: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || -1 : -1,
  };
}

export function resetCPUSnapshot(): void {
  // No snapshot is kept on web.
}

export function getNetworkStats(): NetworkStats {
  // Browsers deliberately don't expose per-app byte counters.
  return { bytesReceived: -1, bytesSent: -1 };
}

export async function runSpeedTest(testUrl: string): Promise<SpeedTestResult> {
  // Genuinely measurable on web, unlike the two above: fetch the same fixed
  // file and time it. Kept here rather than stubbed to -1 so the network
  // diagnostics still mean something in a browser.
  const started = Date.now();
  try {
    const res = await fetch(testUrl, { cache: 'no-store' });
    const body = await res.arrayBuffer();
    const durationMs = Date.now() - started;
    if (!res.ok || durationMs <= 0) {
      return { downloadSpeedMbps: -1, bytesDownloaded: body.byteLength, durationMs: -1 };
    }
    return {
      downloadSpeedMbps: (body.byteLength * 8) / (durationMs / 1000) / 1_000_000,
      bytesDownloaded: body.byteLength,
      durationMs,
    };
  } catch {
    return { downloadSpeedMbps: -1, bytesDownloaded: 0, durationMs: -1 };
  }
}
