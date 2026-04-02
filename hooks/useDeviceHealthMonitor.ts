import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import DeviceInfo from 'react-native-device-info';

import { getCPUUsage, resetCPUSnapshot } from '@/modules/device-health';
import { analyticsService } from '@/services/AnalyticsService';
import AppLogger from '@/services/AppLogger';
import { networkPerformanceService } from '@/services/NetworkPerformanceService';

const POLL_INTERVAL_MS = 5000;
const MEMORY_THRESHOLD_PERCENT = 80;
const CPU_SPIKE_THRESHOLD_PERCENT = 80;
/** Max snapshot events per session to prevent PostHog spam on weak devices */
const MAX_SNAPSHOT_EVENTS = 10;
/** Max samples to keep in memory (~1 hour at 5s interval) */
const MAX_SAMPLES = 720;

interface MonitorContext {
  screen: string;
  eraId?: string;
  adventureId?: string | number;
  moduleId?: string | number;
  lessonId?: string | number;
}

interface HealthSample {
  memoryPercent: number;
  cpuPercent: number;
}

/** Module-level cache — total RAM never changes */
let cachedTotalMemory = 0;

/**
 * AFF-618: Monitor device health (memory + CPU) during video playback.
 *
 * Polls every 5s while active. Pauses when app is backgrounded.
 * - Sends `device_health_snapshot` to PostHog when a threshold is exceeded (capped).
 * - Sends `device_health_summary` when monitoring stops (lesson exit / video end).
 */
export function useDeviceHealthMonitor() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const samplesRef = useRef<HealthSample[]>([]);
  const startTimeRef = useRef<number>(0);
  const contextRef = useRef<MonitorContext | null>(null);
  const memoryExceededRef = useRef(false);
  const snapshotCountRef = useRef(0);
  const isActiveRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  // Pause polling when app is backgrounded — prevents false positives
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const wasActive = appStateRef.current === 'active';
      const isNowActive = nextState === 'active';
      appStateRef.current = nextState;

      if (!isActiveRef.current) return;

      if (wasActive && !isNowActive) {
        // App backgrounded — pause polling
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else if (!wasActive && isNowActive) {
        // App foregrounded — resume polling with fresh CPU baseline
        resetCPUSnapshot();
        getCPUUsage().catch(() => {}); // prime
        intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
      }
    });
    return () => sub.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const poll = useCallback(async () => {
    // Skip if app is backgrounded (belt-and-suspenders with AppState listener)
    if (appStateRef.current !== 'active') return;

    try {
      // Fetch total memory once
      if (cachedTotalMemory === 0) {
        cachedTotalMemory = await DeviceInfo.getTotalMemory();
      }

      const [usedMemory, cpu] = await Promise.all([
        DeviceInfo.getUsedMemory(),
        getCPUUsage(),
      ]);

      const totalMemory = cachedTotalMemory;
      const memoryPercent = (usedMemory / totalMemory) * 100;
      const cpuPercent = cpu.usagePercent;

      // Store sample (skip priming reads where CPU returns -1)
      if (cpuPercent >= 0) {
        if (samplesRef.current.length >= MAX_SAMPLES) {
          samplesRef.current.shift(); // drop oldest to cap memory usage
        }
        samplesRef.current.push({ memoryPercent, cpuPercent });
      }

      // Check thresholds
      const memoryThresholdExceeded = memoryPercent > MEMORY_THRESHOLD_PERCENT;
      const cpuSpikeDetected = cpuPercent > CPU_SPIKE_THRESHOLD_PERCENT;

      if (memoryThresholdExceeded) {
        memoryExceededRef.current = true;
      }

      // Send snapshot event when threshold exceeded (capped to avoid spam)
      if ((memoryThresholdExceeded || cpuSpikeDetected) && snapshotCountRef.current < MAX_SNAPSHOT_EVENTS) {
        snapshotCountRef.current += 1;
        const ctx = contextRef.current;
        analyticsService.trackDeviceHealthSnapshot({
          memory_used_mb: Math.round(usedMemory / (1024 * 1024)),
          memory_total_mb: Math.round(totalMemory / (1024 * 1024)),
          memory_percent: Math.round(memoryPercent * 10) / 10,
          memory_threshold_exceeded: memoryThresholdExceeded,
          cpu_usage_percent: Math.round(cpuPercent * 10) / 10,
          cpu_core_count: cpu.coreCount,
          cpu_spike_detected: cpuSpikeDetected,
          screen: ctx?.screen ?? 'unknown',
          era_id: ctx?.eraId,
          adventure_id: ctx?.adventureId,
          module_id: ctx?.moduleId,
          lesson_id: ctx?.lessonId,
        });
      }
    } catch (error) {
      AppLogger.warn('video', 'Device health poll failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  const startMonitoring = useCallback((context: MonitorContext) => {
    // Clean up any existing session
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    contextRef.current = context;
    samplesRef.current = [];
    startTimeRef.current = Date.now();
    memoryExceededRef.current = false;
    snapshotCountRef.current = 0;
    isActiveRef.current = true;

    // Reset native CPU snapshot so first delta is fresh
    resetCPUSnapshot();

    // Reset network speed session for fresh throughput samples
    networkPerformanceService.resetSpeedSession();

    // Prime the CPU reader (first call returns -1)
    getCPUUsage().catch(() => {});

    // Start polling
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    AppLogger.info('video', 'Device health monitoring started', {
      screen: context.screen,
      eraId: context.eraId,
    });
  }, [poll]);

  const stopMonitoring = useCallback(() => {
    isActiveRef.current = false;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const samples = samplesRef.current;
    const ctx = contextRef.current;

    if (samples.length === 0 || !ctx) {
      resetCPUSnapshot();
      samplesRef.current = [];
      contextRef.current = null;
      return;
    }

    // Calculate aggregates using loop (safe for any array size, unlike Math.max(...arr))
    let peakMemoryPercent = 0;
    let peakCpuPercent = 0;
    let totalMemoryPercent = 0;
    let totalCpuPercent = 0;
    let maxConsecutiveSpikes = 0;
    let currentStreak = 0;

    for (const s of samples) {
      if (s.memoryPercent > peakMemoryPercent) peakMemoryPercent = s.memoryPercent;
      if (s.cpuPercent > peakCpuPercent) peakCpuPercent = s.cpuPercent;
      totalMemoryPercent += s.memoryPercent;
      totalCpuPercent += s.cpuPercent;

      if (s.cpuPercent > CPU_SPIKE_THRESHOLD_PERCENT) {
        currentStreak++;
        if (currentStreak > maxConsecutiveSpikes) maxConsecutiveSpikes = currentStreak;
      } else {
        currentStreak = 0;
      }
    }

    const avgMemoryPercent = totalMemoryPercent / samples.length;
    const avgCpuPercent = totalCpuPercent / samples.length;
    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

    analyticsService.trackDeviceHealthSummary({
      peak_memory_mb: Math.round((peakMemoryPercent / 100) * cachedTotalMemory / (1024 * 1024)),
      peak_memory_percent: Math.round(peakMemoryPercent * 10) / 10,
      peak_cpu_percent: Math.round(peakCpuPercent * 10) / 10,
      avg_memory_percent: Math.round(avgMemoryPercent * 10) / 10,
      avg_cpu_percent: Math.round(avgCpuPercent * 10) / 10,
      memory_threshold_exceeded: memoryExceededRef.current,
      cpu_spike_count: maxConsecutiveSpikes,
      monitoring_duration_seconds: durationSeconds,
      sample_count: samples.length,
      screen: ctx.screen,
      era_id: ctx.eraId,
      adventure_id: ctx.adventureId,
      module_id: ctx.moduleId,
      lesson_id: ctx.lessonId,
    });

    AppLogger.info('video', 'Device health monitoring stopped', {
      screen: ctx.screen,
      peakMemoryPercent: Math.round(peakMemoryPercent),
      peakCpuPercent: Math.round(peakCpuPercent),
      samples: samples.length,
    });

    // Cleanup
    samplesRef.current = [];
    contextRef.current = null;
    resetCPUSnapshot();
  }, []);

  // Auto-cleanup on unmount — send summary if session was active
  useEffect(() => {
    return () => {
      if (isActiveRef.current) {
        // Component unmounted without explicit stopMonitoring (e.g. navigation pop)
        // stopMonitoring sends the summary event
        stopMonitoring();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      resetCPUSnapshot();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { startMonitoring, stopMonitoring };
}
