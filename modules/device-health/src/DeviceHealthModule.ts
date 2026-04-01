import { requireNativeModule } from 'expo-modules-core';

export interface CPUUsage {
  /** CPU usage percentage (0-100). Returns -1 on first call (no previous snapshot to compare). */
  usagePercent: number;
  /** Number of active CPU cores */
  coreCount: number;
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
