/**
 * NetworkPerformanceService - Singleton that provides network context for analytics enrichment.
 *
 * Caches network state from @react-native-community/netinfo and exposes
 * getNetworkContext() for spreading into PostHog event properties.
 *
 * Usage:
 *   networkPerformanceService.initialize();          // Call once in _layout.tsx
 *   const ctx = networkPerformanceService.getNetworkContext();  // Spread into events
 */

import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import AppLogger from './AppLogger';

export interface NetworkContext {
  network_type: 'wifi' | 'cellular' | 'ethernet' | 'offline' | 'unknown';
  cellular_generation: '2g' | '3g' | '4g' | '5g' | null;
  is_connected: boolean | null;
}

class NetworkPerformanceService {
  private cachedState: NetInfoState | null = null;
  private unsubscribe: (() => void) | null = null;

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

  cleanup() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.cachedState = null;
  }
}

export const networkPerformanceService = new NetworkPerformanceService();
