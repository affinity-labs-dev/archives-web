import { useState, useEffect } from 'react';
import * as ExpoTrackingTransparency from 'expo-tracking-transparency';

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
    checkTrackingStatus();
  }, []);

  const checkTrackingStatus = async () => {
    try {
      // First check if tracking transparency is available on this platform
      if (!ExpoTrackingTransparency.isAvailable()) {
        // On platforms where tracking transparency is not available,
        // the permission is always granted (as per documentation)
        setTrackingStatus('authorized');
        setIsLoading(false);
        return;
      }

      // If available, check current permissions
      const { status } = await ExpoTrackingTransparency.getTrackingPermissionsAsync();
      setTrackingStatus(status);
    } catch (error) {
      console.warn('Error checking tracking permissions:', error);
      // If there's an error, assume permissions are not determined
      setTrackingStatus('not-determined');
    } finally {
      setIsLoading(false);
    }
  };

  const requestPermission = async (): Promise<TrackingStatus> => {
    setIsLoading(true);

    try {
      // First check if tracking transparency is available on this platform
      if (!ExpoTrackingTransparency.isAvailable()) {
        // On platforms where tracking transparency is not available,
        // the permission is always granted (as per documentation)
        setTrackingStatus('authorized');
        return 'authorized';
      }

      // If available, request permissions
      const { status } = await ExpoTrackingTransparency.requestTrackingPermissionsAsync();
      setTrackingStatus(status);
      return status;
    } catch (error) {
      console.warn('Error requesting tracking permissions:', error);
      setTrackingStatus('denied');
      return 'denied';
    } finally {
      setIsLoading(false);
    }
  };

  const canTrack = trackingStatus === 'authorized';

  return {
    trackingStatus,
    isLoading,
    requestPermission,
    canTrack,
  };
}