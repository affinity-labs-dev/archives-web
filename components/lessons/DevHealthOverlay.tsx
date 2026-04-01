// DevHealthOverlay.tsx - DEV ONLY: Real-time memory + CPU overlay for testing
// Shows floating widget during video playback with live device health metrics

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { getCPUUsage, resetCPUSnapshot } from '@/modules/device-health';

interface HealthData {
  memoryUsedMB: number;
  memoryTotalMB: number;
  memoryPercent: number;
  cpuPercent: number;
  cpuCores: number;
}

const POLL_MS = 2000; // Faster polling for dev visibility

export default function DevHealthOverlay() {
  // Only render in dev mode
  if (!__DEV__) return null;

  return <OverlayContent />;
}

function OverlayContent() {
  const [data, setData] = useState<HealthData | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [peakMemory, setPeakMemory] = useState(0);
  const [peakCPU, setPeakCPU] = useState(0);
  const totalMemoryRef = useRef(0);

  const poll = useCallback(async () => {
    try {
      if (totalMemoryRef.current === 0) {
        totalMemoryRef.current = await DeviceInfo.getTotalMemory();
      }

      const [usedMemory, cpu] = await Promise.all([
        DeviceInfo.getUsedMemory(),
        getCPUUsage(),
      ]);

      const total = totalMemoryRef.current;
      const memPercent = (usedMemory / total) * 100;
      const memUsedMB = usedMemory / (1024 * 1024);
      const memTotalMB = total / (1024 * 1024);
      const cpuPercent = cpu.usagePercent;

      setData({
        memoryUsedMB: Math.round(memUsedMB),
        memoryTotalMB: Math.round(memTotalMB),
        memoryPercent: Math.round(memPercent * 10) / 10,
        cpuPercent: Math.round(cpuPercent * 10) / 10,
        cpuCores: cpu.coreCount,
      });

      if (memPercent > peakMemory) setPeakMemory(Math.round(memPercent * 10) / 10);
      if (cpuPercent > 0 && cpuPercent > peakCPU) setPeakCPU(Math.round(cpuPercent * 10) / 10);
    } catch {
      // Silently ignore in dev overlay
    }
  }, [peakMemory, peakCPU]);

  useEffect(() => {
    resetCPUSnapshot();
    getCPUUsage().catch(() => {}); // prime
    const id = setInterval(poll, POLL_MS);
    return () => {
      clearInterval(id);
      resetCPUSnapshot();
    };
  }, [poll]);

  const memColor = (data?.memoryPercent ?? 0) > 80 ? '#FF4444' : (data?.memoryPercent ?? 0) > 60 ? '#FFAA00' : '#44DD44';
  const cpuColor = (data?.cpuPercent ?? 0) > 80 ? '#FF4444' : (data?.cpuPercent ?? 0) > 50 ? '#FFAA00' : '#44DD44';

  if (minimized) {
    return (
      <TouchableOpacity style={styles.minimized} onPress={() => setMinimized(false)}>
        <Text style={styles.minimizedText}>
          {data ? `${Math.round(data.memoryPercent)}% | ${data.cpuPercent < 0 ? '—' : `${Math.round(data.cpuPercent)}%`}` : '...'}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={() => setMinimized(true)} activeOpacity={0.9}>
      <Text style={styles.title}>Device Health</Text>

      <View style={styles.row}>
        <Text style={styles.label}>RAM</Text>
        <Text style={[styles.value, { color: memColor }]}>
          {data ? `${data.memoryUsedMB} / ${data.memoryTotalMB} MB` : '...'}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>MEM%</Text>
        <View style={styles.barContainer}>
          <View style={[styles.bar, { width: `${Math.min(data?.memoryPercent ?? 0, 100)}%`, backgroundColor: memColor }]} />
        </View>
        <Text style={[styles.percent, { color: memColor }]}>{data?.memoryPercent ?? 0}%</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>CPU</Text>
        <View style={styles.barContainer}>
          <View style={[styles.bar, { width: `${Math.min(Math.max(data?.cpuPercent ?? 0, 0), 100)}%`, backgroundColor: cpuColor }]} />
        </View>
        <Text style={[styles.percent, { color: cpuColor }]}>
          {data?.cpuPercent != null && data.cpuPercent >= 0 ? `${data.cpuPercent}%` : '—'}
        </Text>
      </View>

      <View style={styles.peakRow}>
        <Text style={styles.peakText}>Peak: MEM {peakMemory}% | CPU {peakCPU > 0 ? `${peakCPU}%` : '—'}</Text>
        <Text style={styles.peakText}>Cores: {data?.cpuCores ?? '—'}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 10,
    padding: 10,
    width: 200,
    zIndex: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  minimized: {
    position: 'absolute',
    top: 60,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 9999,
  },
  minimizedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  title: {
    color: '#AAAAAA',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    color: '#888888',
    fontSize: 10,
    fontFamily: 'monospace',
    width: 36,
  },
  value: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'monospace',
    flex: 1,
  },
  barContainer: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    marginHorizontal: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 3,
  },
  percent: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '600',
    width: 36,
    textAlign: 'right',
  },
  peakRow: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  peakText: {
    color: '#666666',
    fontSize: 8,
    fontFamily: 'monospace',
  },
});
