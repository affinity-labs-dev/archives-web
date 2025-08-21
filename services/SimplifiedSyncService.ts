// Simplified Background Sync Service - Single Table JSONB Storage
// Replaces the three-table structure with one simple table per user

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import NetInfo from '@react-native-community/netinfo';

// Types matching local AsyncStorage structure
interface ModuleProgress {
  adventureId: number;
  moduleId: number;
  isCompleted: boolean;
  lessonsCompleted: string[];
  quizCompleted: boolean;
  quizScore?: number;
  unlockedAt?: string;
}

interface AdventureProgress {
  adventureId: number;
  isUnlocked: boolean;
  modulesCompleted: number;
  totalModules: number;
  unlockedAt?: string;
}

// Complete user data structure for JSONB storage
interface UserData {
  selectedEra?: string;
  adventures: AdventureProgress[];
  modules: ModuleProgress[];
}

// Storage keys matching ProgressContext
const STORAGE_KEYS = {
  SELECTED_ERA: 'selected_era',
  ADVENTURE_PROGRESS: 'adventure_progress',
  MODULE_PROGRESS: 'module_progress',
} as const;

class SimplifiedSyncService {
  private isOnline: boolean = false;
  private syncQueue: Array<() => Promise<void>> = [];
  private isSyncing: boolean = false;
  private currentUserId: string | null = null;
  
  constructor() {
    this.initializeNetworkListener();
  }

  // Initialize network connectivity monitoring
  private initializeNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      
      // If we just came online and have queued syncs, process them
      if (wasOffline && this.isOnline && this.syncQueue.length > 0) {
        this.processSyncQueue();
      }
    });
  }

  // Set current user ID (called by BackgroundSyncProvider)
  setCurrentUserId(userId: string | null) {
    this.currentUserId = userId;
  }

  // Get current user ID
  private getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  // Process queued sync operations
  private async processSyncQueue() {
    if (this.isSyncing || !this.isOnline) return;
    
    this.isSyncing = true;

    while (this.syncQueue.length > 0 && this.isOnline) {
      const syncOperation = this.syncQueue.shift();
      if (syncOperation) {
        try {
          await syncOperation();
        } catch (error) {
          console.warn('Sync operation failed:', error);
          // Re-queue failed operation for retry
          this.syncQueue.unshift(syncOperation);
          break;
        }
      }
    }

    this.isSyncing = false;
  }

  // Queue sync operation for when online
  private queueSync(operation: () => Promise<void>) {
    this.syncQueue.push(operation);
    
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  // Get all local data for syncing
  private async getAllLocalData(): Promise<UserData> {
    const [selectedEra, adventureData, moduleData] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.SELECTED_ERA),
      AsyncStorage.getItem(STORAGE_KEYS.ADVENTURE_PROGRESS),
      AsyncStorage.getItem(STORAGE_KEYS.MODULE_PROGRESS),
    ]);

    return {
      selectedEra: selectedEra || undefined,
      adventures: adventureData ? JSON.parse(adventureData) : [],
      modules: moduleData ? JSON.parse(moduleData) : [],
    };
  }

  // Save all data to local storage
  private async saveAllLocalData(userData: UserData) {
    const promises = [];

    if (userData.selectedEra) {
      promises.push(AsyncStorage.setItem(STORAGE_KEYS.SELECTED_ERA, userData.selectedEra));
    }

    if (userData.adventures.length > 0) {
      promises.push(AsyncStorage.setItem(STORAGE_KEYS.ADVENTURE_PROGRESS, JSON.stringify(userData.adventures)));
    }

    if (userData.modules.length > 0) {
      promises.push(AsyncStorage.setItem(STORAGE_KEYS.MODULE_PROGRESS, JSON.stringify(userData.modules)));
    }

    await Promise.all(promises);
  }

  // SIMPLIFIED SYNC: One operation instead of three

  // Upload all local data to Supabase (single operation)
  async syncToCloud() {
    const operation = async () => {
      const userId = this.getCurrentUserId();
      if (!userId) throw new Error('No authenticated user');

      const userData = await this.getAllLocalData();
      
      // Single upsert operation with all user data in JSONB
      const { error } = await supabase
        .from('user_data')
        .upsert({
          user_id: userId,
          data: userData,
        });

      if (error) {
        console.warn('Sync to cloud warning:', error.message);
        return;
      }

      // Data synced to cloud successfully
    };

    if (this.isOnline) {
      await operation();
    } else {
      this.queueSync(operation);
    }
  }

  // Download data from Supabase (single operation)
  async syncFromCloud() {
    const userId = this.getCurrentUserId();
    if (!userId) throw new Error('No authenticated user');

    if (!this.isOnline) {
      return;
    }


    const { data, error } = await supabase
      .from('user_data')
      .select('data')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found

    if (data?.data) {
      const userData = data.data as UserData;
      await this.saveAllLocalData(userData);
    }
  }

  // Check if we have any local data
  async hasLocalData(): Promise<boolean> {
    const userData = await this.getAllLocalData();
    return !!(userData.selectedEra || userData.adventures.length > 0 || userData.modules.length > 0);
  }

  // Initialize sync for new users or first app launch
  async initializeSync() {

    if (!this.isOnline) {
      return;
    }

    const hasLocal = await this.hasLocalData();
    
    if (!hasLocal) {
      // New device or first launch - try to download existing data
      await this.syncFromCloud();
    } else {
      // Has local data - upload to cloud as backup
      await this.syncToCloud();
    }
  }

  // Manual sync trigger (bidirectional)
  async manualSync() {
    
    if (!this.isOnline) {
      return false;
    }

    try {
      // Upload local changes first, then download any remote changes
      await this.syncToCloud();
      await this.syncFromCloud();
      return true;
    } catch (error) {
      console.warn('Manual sync failed:', error);
      return false;
    }
  }

  // Individual sync methods for compatibility with existing hooks
  async syncSelectedEra() {
    await this.syncToCloud();
  }

  async syncAdventureProgress() {
    await this.syncToCloud();
  }

  async syncModuleProgress() {
    await this.syncToCloud();
  }

  // Sync all data (same as syncToCloud for simplified version)
  async syncAllToCloud() {
    await this.syncToCloud();
  }

  async syncAllFromCloud() {
    await this.syncFromCloud();
  }

  // Get sync status
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      queuedOperations: this.syncQueue.length,
    };
  }
}

// Export singleton instance
export const simplifiedSyncService = new SimplifiedSyncService();