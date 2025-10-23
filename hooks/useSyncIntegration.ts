// Sync Integration Hook - Bridges ProgressContext with BackgroundSync
// Real-time sync - no debounce to prevent data loss

import { simplifiedSyncService } from '@/services/SimplifiedSyncService';
import { useUser } from '@clerk/clerk-expo';

// Hook to automatically trigger sync when data changes
export function useSyncIntegration() {
  const { isSignedIn } = useUser();

  const triggerSync = async (syncType: 'era' | 'adventure' | 'module' | 'all' = 'all') => {
    if (!isSignedIn) {
      return; // Silently skip if not signed in
    }

    // Real-time sync - await immediately (no debounce)
    try {
      console.log(`🚀 [REAL-TIME SYNC] Syncing ${syncType} to cloud...`);
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
      console.log(`✅ [REAL-TIME SYNC] ${syncType} synced successfully`);
    } catch (error) {
      console.error(`❌ [REAL-TIME SYNC] Failed to sync ${syncType}:`, error);
    }
  };

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