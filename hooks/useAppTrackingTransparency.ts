import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as TrackingTransparency from 'expo-tracking-transparency';

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
    if (Platform.OS !== 'ios') {
      setTrackingStatus('authorized');
      setIsLoading(false);
      return;
    }

    try {
      const { status } = await TrackingTransparency.getTrackingPermissionsAsync();
      setTrackingStatus(status);
    } catch (error) {
      console.warn('Error checking tracking permissions:', error);
      setTrackingStatus('not-determined');
    } finally {
      setIsLoading(false);
    }
  };

  const requestPermission = async (): Promise<TrackingStatus> => {
    if (Platform.OS !== 'ios') {
      return 'authorized';
    }

    setIsLoading(true);

    try {
      const { status } = await TrackingTransparency.requestTrackingPermissionsAsync();
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