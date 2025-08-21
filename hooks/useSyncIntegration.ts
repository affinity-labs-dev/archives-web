// Sync Integration Hook - Bridges ProgressContext with BackgroundSync
// Monitors AsyncStorage changes and triggers sync automatically with debouncing

import { useEffect, useRef } from 'react';
import { simplifiedSyncService } from '@/services/SimplifiedSyncService';
import { useUser } from '@clerk/clerk-expo';

// Hook to automatically trigger sync when data changes
export function useSyncIntegration() {
  const { isSignedIn } = useUser();
  const syncTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const triggerSync = async (syncType: 'era' | 'adventure' | 'module' | 'all' = 'all') => {
    if (!isSignedIn) {
      return; // Silently skip if not signed in
    }

    // Debounce each sync type separately
    if (syncTimeouts.current[syncType]) {
      clearTimeout(syncTimeouts.current[syncType]);
    }

    syncTimeouts.current[syncType] = setTimeout(async () => {
      try {
        switch (syncType) {
          case 'era':
            await simplifiedSyncService.syncSelectedEra();
            break;
          case 'adventure':
            await simplifiedSyncService.syncAdventureProgress();
            break;
          case 'module':
            await simplifiedSyncService.syncModuleProgress();
            break;
          case 'all':
          default:
            await simplifiedSyncService.syncToCloud();
            break;
        }
      } catch (error) {
        // Silently handle errors - don't spam console
      }
    }, 2000); // 2 second debounce
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(syncTimeouts.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, []);

  return { triggerSync };
}

// Hook to be used in ProgressProvider for automatic sync triggers
export function useProgressSync() {
  const { triggerSync } = useSyncIntegration();

  // Return sync functions that can be called from ProgressContext
  return {
    syncEra: () => triggerSync('era'),
    syncAdventure: () => triggerSync('adventure'),
    syncModule: () => triggerSync('module'),
    syncAll: () => triggerSync('all'),
  };
}