import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import {
  requestTrackingPermissionsAsync,
  getTrackingPermissionsAsync,
  PermissionStatus
} from 'expo-tracking-transparency';

export type TrackingStatus = 'undetermined' | 'denied' | 'granted' | 'restricted';

interface UseAppTrackingTransparencyReturn {
  trackingStatus: TrackingStatus | null;
  isLoading: boolean;
  requestPermission: () => Promise<TrackingStatus>;
  checkPermission: () => Promise<TrackingStatus>;
  canTrack: boolean;
}

export function useAppTrackingTransparency(): UseAppTrackingTransparencyReturn {
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async (): Promise<TrackingStatus> => {
    try {
      if (Platform.OS !== 'ios') {
        // On non-iOS platforms, tracking is always allowed
        setTrackingStatus('granted');
        setIsLoading(false);
        return 'granted';
      }

      const { status } = await getTrackingPermissionsAsync();
      const mappedStatus = mapPermissionStatus(status);
      setTrackingStatus(mappedStatus);
      setIsLoading(false);
      return mappedStatus;
    } catch (error) {
      console.warn('Error checking tracking permissions:', error);
      setTrackingStatus('denied');
      setIsLoading(false);
      return 'denied';
    }
  };

  const requestPermission = async (): Promise<TrackingStatus> => {
    try {
      setIsLoading(true);

      if (Platform.OS !== 'ios') {
        // On non-iOS platforms, tracking is always allowed
        setTrackingStatus('granted');
        return 'granted';
      }

      console.log('ATT: Requesting tracking permissions on iOS');
      const { status } = await requestTrackingPermissionsAsync();
      const mappedStatus = mapPermissionStatus(status);

      console.log('ATT: Permission request result:', mappedStatus);
      setTrackingStatus(mappedStatus);
      return mappedStatus;
    } catch (error) {
      console.warn('Error requesting tracking permissions:', error);
      setTrackingStatus('denied');
      return 'denied';
    } finally {
      setIsLoading(false);
    }
  };

  // Map Expo permission status to our simplified status
  const mapPermissionStatus = (status: string): TrackingStatus => {
    switch (status) {
      case PermissionStatus.GRANTED:
        return 'granted';
      case PermissionStatus.DENIED:
        return 'denied';
      case PermissionStatus.UNDETERMINED:
        return 'undetermined';
      default:
        return 'denied';
    }
  };

  const canTrack = trackingStatus === 'granted';

  return {
    trackingStatus,
    isLoading,
    requestPermission,
    checkPermission,
    canTrack,
  };
}