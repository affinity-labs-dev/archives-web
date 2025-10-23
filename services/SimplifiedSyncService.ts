// Simplified Background Sync Service - Single Table JSONB Storage
// Replaces the three-table structure with one simple table per user

import { supabase } from "@/hooks/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

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
  adventures: AdventureProgress[]; // Standard progress (flat structure)
  modules: ModuleProgress[]; // Standard progress (flat structure)
  newProgress?: Array<{
    // New progress system - flows AS IS from content_list
    adventureId: string;
    moduleId: string;
    quizScore: number;
    isCompleted: boolean;
    quizCompleted: boolean;
    completedAt: string;
    era_id: number;
  }>;
}

// Storage keys matching ProgressContext
const STORAGE_KEYS = {
  SELECTED_ERA: "selected_era",
  ADVENTURE_PROGRESS: "adventure_progress",
  MODULE_PROGRESS: "module_progress",
  NEW_USER_PROGRESS: "new_user_progress", // New progress system (flat array, flows AS IS)
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
    NetInfo.addEventListener((state) => {
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
          console.warn("Sync operation failed:", error);
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

  // Get all local data for syncing (includes new progress system)
  private async getAllLocalData(): Promise<UserData> {
    const [selectedEra, adventureData, moduleData, newProgressData] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.SELECTED_ERA),
      AsyncStorage.getItem(STORAGE_KEYS.ADVENTURE_PROGRESS),
      AsyncStorage.getItem(STORAGE_KEYS.MODULE_PROGRESS),
      AsyncStorage.getItem(STORAGE_KEYS.NEW_USER_PROGRESS),
    ]);

    return {
      selectedEra: selectedEra || undefined,
      adventures: adventureData ? JSON.parse(adventureData) : [],
      modules: moduleData ? JSON.parse(moduleData) : [],
      newProgress: newProgressData ? JSON.parse(newProgressData) : undefined,
    };
  }

  // Save all data to local storage (includes new progress system)
  private async saveAllLocalData(userData: UserData) {
    const promises = [];

    if (userData.selectedEra) {
      promises.push(
        AsyncStorage.setItem(STORAGE_KEYS.SELECTED_ERA, userData.selectedEra)
      );
    }

    // Era 1 data
    if (userData.adventures.length > 0) {
      promises.push(
        AsyncStorage.setItem(
          STORAGE_KEYS.ADVENTURE_PROGRESS,
          JSON.stringify(userData.adventures)
        )
      );
    }

    if (userData.modules.length > 0) {
      promises.push(
        AsyncStorage.setItem(
          STORAGE_KEYS.MODULE_PROGRESS,
          JSON.stringify(userData.modules)
        )
      );
    }

    // New progress data
    if (userData.newProgress && userData.newProgress.length > 0) {
      promises.push(
        AsyncStorage.setItem(
          STORAGE_KEYS.NEW_USER_PROGRESS,
          JSON.stringify(userData.newProgress)
        )
      );
      console.log(`✅ Restored ${userData.newProgress.length} new system modules from cloud`);
    }

    await Promise.all(promises);
  }

  // SIMPLIFIED SYNC: One operation instead of three

  // Upload all local data to Supabase (single operation)
  async syncToCloud() {
    const operation = async () => {
      const userId = this.getCurrentUserId();
      console.log('📤 [SYNC TO CLOUD] Starting sync for user:', userId);

      if (!userId) {
        console.error('❌ [SYNC TO CLOUD] No authenticated user - cannot sync');
        throw new Error("No authenticated user");
      }

      const userData = await this.getAllLocalData();
      console.log('📤 [SYNC TO CLOUD] Local data to upload:', {
        selectedEra: userData.selectedEra,
        adventures: userData.adventures?.length || 0,
        modules: userData.modules?.length || 0,
        newProgress: userData.newProgress?.length || 0
      });

      // Single upsert operation with all user data in JSONB
      const { data, error } = await supabase.from("user_data").upsert({
        user_id: userId,
        data: userData,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' }).select();

      if (error) {
        console.error("❌ [SYNC TO CLOUD] Supabase error:", error.message, error);
        throw new Error(`Supabase sync failed: ${error.message}`);
      }

      console.log('✅ [SYNC TO CLOUD] Data uploaded successfully:', data);
    };

    if (this.isOnline) {
      try {
        await operation();
      } catch (error) {
        console.error('❌ [SYNC TO CLOUD] Operation failed:', error);
        throw error; // Re-throw so caller knows sync failed
      }
    } else {
      console.log('⚠️ [SYNC TO CLOUD] Offline - queueing sync');
      this.queueSync(operation);
    }
  }

  // Download data from Supabase (single operation)
  async syncFromCloud() {
    console.log('📥 [SYNC] Starting syncFromCloud...');

    const userId = this.getCurrentUserId();
    console.log('📥 [SYNC] User ID:', userId);

    if (!userId) {
      console.error('❌ [SYNC] No user ID - cannot sync from cloud');
      throw new Error("No authenticated user");
    }

    if (!this.isOnline) {
      console.log('⚠️ [SYNC] Offline - cannot download from cloud');
      return;
    }

    console.log('📥 [SYNC] Querying Supabase for user data...');
    const { data, error } = await supabase
      .from("user_data")
      .select("data")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error('❌ [SYNC] Supabase error:', error.message, error.code);
      throw error;
    }

    if (error?.code === "PGRST116") {
      console.log('📥 [SYNC] No cloud data found for this user (PGRST116 - no rows)');
      return;
    }

    if (data?.data) {
      const userData = data.data as UserData;
      console.log('✅ [SYNC] Cloud data retrieved:', {
        era: userData.selectedEra,
        adventures: userData.adventures?.length || 0,
        modules: userData.modules?.length || 0,
        completedModules: userData.modules?.filter(m => m.isCompleted).length || 0,
        newModules: userData.newProgress?.length || 0,
        newCompleted: userData.newProgress?.filter(p => p.isCompleted).length || 0
      });

      console.log('💾 [SYNC] Saving cloud data to AsyncStorage...');
      await this.saveAllLocalData(userData);
      console.log('✅ [SYNC] Cloud data restored successfully!');
    } else {
      console.log('⚠️ [SYNC] Cloud data exists but is empty or invalid');
    }
  }

  // Check if we have any local data with actual progress (not just onboarding data)
  async hasLocalData(): Promise<boolean> {
    const userData = await this.getAllLocalData();

    // Check if we have ACTUAL progress (original or new system)
    const hasProgress = userData.modules.length > 0 &&
      userData.modules.some(m =>
        m.isCompleted ||
        m.lessonsCompleted.length > 0 ||
        m.quizCompleted
      );

    const hasNewProgress = userData.newProgress && userData.newProgress.length > 0;

    const hasRealProgress = hasProgress || hasNewProgress;

    console.log('🔍 [SYNC] Checking local data:', {
      selectedEra: userData.selectedEra,
      adventures: userData.adventures.length,
      modules: userData.modules.length,
      newModules: userData.newProgress?.length || 0,
      hasRealProgress
    });

    return hasRealProgress;
  }

  // Initialize sync for new users or first app launch
  async initializeSync(): Promise<boolean> {
    console.log('🔄 [SYNC] Starting initializeSync...');
    console.log('🔄 [SYNC] User ID:', this.getCurrentUserId());
    console.log('🔄 [SYNC] Online:', this.isOnline);

    if (!this.isOnline) {
      console.log('⚠️ [SYNC] Offline - skipping sync');
      return false;
    }

    // ALWAYS check cloud first when user signs in
    console.log('☁️ [SYNC] Checking if cloud data exists...');
    const { data: cloudCheck, error } = await supabase
      .from("user_data")
      .select("data")
      .eq("user_id", this.getCurrentUserId())
      .single();

    const hasCloudData = !error && cloudCheck?.data;
    console.log('☁️ [SYNC] Cloud data exists:', hasCloudData);

    if (hasCloudData) {
      // Cloud data exists - always restore it (might have more progress than local)
      console.log('📥 [SYNC] Cloud data found, restoring from cloud...');
      await this.syncFromCloud();
      console.log('✅ [SYNC] initializeSync completed - data restored from cloud');
      return true;
    } else {
      // No cloud data - check if we have local progress to backup
      const hasLocal = await this.hasLocalData();
      console.log('🔄 [SYNC] Has local progress:', hasLocal);

      if (hasLocal) {
        console.log('📤 [SYNC] No cloud data, backing up local progress...');
        await this.syncToCloud();
      } else {
        console.log('📝 [SYNC] No data in cloud or local - fresh start');
      }
      console.log('✅ [SYNC] initializeSync completed - no cloud restore needed');
      return false;
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
      console.warn("Manual sync failed:", error);
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

  // ============= NEW PROGRESS SYSTEM SYNC METHODS =============

  // Upload new progress data to Supabase - data flows AS IS
  async syncNewProgressToCloud() {
    const operation = async () => {
      const userId = this.getCurrentUserId();
      console.log('🔄 [NEW SYNC] Starting sync for user:', userId);

      if (!userId) throw new Error("No authenticated user");

      // Get new progress (flat array, flows AS IS)
      const newProgressData = await AsyncStorage.getItem(STORAGE_KEYS.NEW_USER_PROGRESS);
      const newProgress = newProgressData ? JSON.parse(newProgressData) : [];
      console.log('📊 [NEW SYNC] New progress from AsyncStorage:', newProgress);

      // Get existing data
      const existingData = await this.getAllLocalData();
      console.log('📊 [NEW SYNC] Existing data:', {
        selectedEra: existingData.selectedEra,
        adventures: existingData.adventures?.length || 0,
        modules: existingData.modules?.length || 0
      });

      // Merge existing and new progress data for single JSONB upsert
      const userData = {
        ...existingData,
        newProgress, // Simple flat array of completed modules
      };

      console.log('📤 [NEW SYNC] Upserting to Supabase:', {
        user_id: userId,
        data_keys: Object.keys(userData),
        newProgress_length: userData.newProgress?.length || 0
      });

      const { data, error } = await supabase.from("user_data").upsert({
        user_id: userId,
        data: userData,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' }).select();

      if (error) {
        console.error("❌ [NEW SYNC] Supabase error:", error);
        console.warn("New progress sync to cloud warning:", error.message);
        return;
      }

      console.log("✅ [NEW SYNC] Supabase response:", data);
      console.log("✅ New progress data synced to cloud", { modules: newProgress.length });
    };

    if (this.isOnline) {
      await operation();
    } else {
      console.log('⚠️ [NEW SYNC] Offline - queueing sync');
      this.queueSync(operation);
    }
  }
}

// Export singleton instance
export const simplifiedSyncService = new SimplifiedSyncService();
