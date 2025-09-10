// Cross-platform App Tracking Transparency hook
// Platform-specific implementations will be automatically resolved

export type TrackingStatus = 'not-determined' | 'denied' | 'authorized' | 'restricted';

interface UseAppTrackingTransparencyReturn {
  trackingStatus: TrackingStatus | null;
  isLoading: boolean;
  requestPermission: () => Promise<TrackingStatus>;
  canTrack: boolean;
}

// Re-export the platform-specific implementation
export { useAppTrackingTransparency } from './useAppTrackingTransparency.native';

// This file serves as the default export point
// Platform-specific files (.native.ts, .web.ts) will be automatically selected by Metro