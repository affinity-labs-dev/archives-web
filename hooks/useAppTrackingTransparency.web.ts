import { useState, useEffect } from 'react';

export type TrackingStatus = 'not-determined' | 'denied' | 'authorized' | 'restricted';

interface UseAppTrackingTransparencyReturn {
  trackingStatus: TrackingStatus | null;
  isLoading: boolean;
  requestPermission: () => Promise<TrackingStatus>;
  canTrack: boolean;
}

export function useAppTrackingTransparency(): UseAppTrackingTransparencyReturn {
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Web doesn't require App Tracking Transparency
    // Always authorize tracking for web platform
    setTrackingStatus('authorized');
    setIsLoading(false);
  }, []);

  const requestPermission = async (): Promise<TrackingStatus> => {
    // Web doesn't require permission request
    // Always return authorized
    return 'authorized';
  };

  const canTrack = trackingStatus === 'authorized';

  return {
    trackingStatus,
    isLoading,
    requestPermission,
    canTrack,
  };
}