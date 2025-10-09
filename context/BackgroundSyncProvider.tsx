// Background Sync Provider - Wraps ProgressProvider with cloud sync
// Maintains local-first architecture while providing transparent backup

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { simplifiedSyncService } from '@/services/SimplifiedSyncService';
import { notificationTokenSync } from '@/services/NotificationTokenSync';
import { analyticsService } from '@/services/AnalyticsService';

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  queuedOperations: number;
  lastSyncTime?: Date;
  syncError?: string;
}

interface BackgroundSyncContextType {
  syncStatus: SyncStatus;
  manualSync: () => Promise<boolean>;
  isInitialized: boolean;
}

const BackgroundSyncContext = createContext<BackgroundSyncContextType | undefined>(undefined);

export function BackgroundSyncProvider({ children }: { children: React.ReactNode }) {
  const { user, isSignedIn } = useUser();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: false,
    isSyncing: false,
    queuedOperations: 0,
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Update sync status from service
  const updateSyncStatus = () => {
    const status = simplifiedSyncService.getSyncStatus();
    setSyncStatus(prev => ({
      ...prev,
      isOnline: status.isOnline,
      isSyncing: status.isSyncing,
      queuedOperations: status.queuedOperations,
    }));
  };

  // Initialize sync when user signs in (skip on web during SSR)
  useEffect(() => {
    // Skip sync initialization on web to prevent SSR issues
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return;
    }

    if (isSignedIn && user && !isInitialized) {
      console.log('🔑 User signed in, initializing simplified sync...');
      console.log('🔑 User ID:', user.id);
      console.log('🔑 Email:', user.emailAddresses?.[0]?.emailAddress);
      console.log('🔑 Primary Email:', user.primaryEmailAddress?.emailAddress);

      // Set the user ID in the simplified sync service
      simplifiedSyncService.setCurrentUserId(user.id);

      // Track user session and identify user
      analyticsService.identifyUser(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      });

      // Track session start (default to 'email', update in auth screens for specific method)
      analyticsService.trackUserSessionIn('email');

      initializeSync();
    } else if (!isSignedIn) {
      console.log('👋 User signed out, clearing sync data...');
      // Clear user ID when user signs out
      simplifiedSyncService.setCurrentUserId(null);
      analyticsService.reset();
      setIsInitialized(false);
    }
  }, [isSignedIn, user, isInitialized]);

  // Monitor app state changes for sync triggers (with debouncing) - Native only
  useEffect(() => {
    // Skip AppState monitoring on web
    if (Platform.OS === 'web') {
      return;
    }

    let syncTimeout: ReturnType<typeof setTimeout>;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isSignedIn && isInitialized) {
        // Debounce sync - only run after 5 seconds of app being active
        clearTimeout(syncTimeout);
        syncTimeout = setTimeout(() => {
          console.log('📱 App sync check (debounced)');
          simplifiedSyncService.syncToCloud().catch(error => {
            console.warn('Background sync warning:', error.message);
          });
        }, 5000);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription?.remove();
      clearTimeout(syncTimeout);
    };
  }, [isSignedIn, isInitialized]);

  // Update sync status periodically
  useEffect(() => {
    const interval = setInterval(updateSyncStatus, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const initializeSync = async () => {
    try {
      setSyncStatus(prev => ({ ...prev, isSyncing: true, syncError: undefined }));

      // Initialize data sync from cloud
      const dataRestored = await simplifiedSyncService.initializeSync();

      // Sync push token from onboarding (if exists)
      if (user?.id) {
        await notificationTokenSync.syncPushTokenToSupabase(user.id);
      }

      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date(),
        syncError: undefined
      }));

      setIsInitialized(true);
      console.log('✅ Background sync initialized successfully. Data restored from cloud:', dataRestored);
    } catch (error) {
      console.warn('Background sync initialization skipped:', error instanceof Error ? error.message : 'Unknown error');
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        syncError: undefined // Don't show error to user
      }));
      setIsInitialized(true); // Mark as initialized even on error so app doesn't hang
    }
  };

  const manualSync = async (): Promise<boolean> => {
    if (!isSignedIn) {
      console.log('⚠️ Cannot sync: user not signed in');
      return false;
    }

    try {
      setSyncStatus(prev => ({ ...prev, isSyncing: true, syncError: undefined }));
      
      const success = await simplifiedSyncService.manualSync();
      
      setSyncStatus(prev => ({ 
        ...prev, 
        isSyncing: false,
        lastSyncTime: success ? new Date() : prev.lastSyncTime,
        syncError: success ? undefined : 'Manual sync failed'
      }));
      
      return success;
    } catch (error) {
      console.warn('Manual sync warning:', error instanceof Error ? error.message : 'Unknown error');
      setSyncStatus(prev => ({ 
        ...prev, 
        isSyncing: false, 
        syncError: undefined // Don't show error to user
      }));
      return false;
    }
  };

  const contextValue: BackgroundSyncContextType = {
    syncStatus,
    manualSync,
    isInitialized,
  };

  return (
    <BackgroundSyncContext.Provider value={contextValue}>
      {children}
    </BackgroundSyncContext.Provider>
  );
}

// Custom hook to use background sync context
export function useBackgroundSync(): BackgroundSyncContextType {
  const context = useContext(BackgroundSyncContext);
  if (context === undefined) {
    throw new Error('useBackgroundSync must be used within a BackgroundSyncProvider');
  }
  return context;
}

// Note: useAutoSync has been moved to useSyncIntegration.ts to avoid circular dependencies