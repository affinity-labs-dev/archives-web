// Background Sync Service - Syncs AsyncStorage data with Supabase
// Maintains local-first architecture while providing cloud backup

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

// Storage keys matching ProgressContext
const STORAGE_KEYS = {
  SELECTED_ERA: "selected_era",
  ADVENTURE_PROGRESS: "adventure_progress",
  MODULE_PROGRESS: "module_progress",
} as const;

class BackgroundSyncService {
  private isOnline: boolean = false;
  private syncQueue: Array<() => Promise<void>> = [];
  private isSyncing: boolean = false;

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

  // Get current user ID from Clerk auth
  private getCurrentUserId(): string | null {
    try {
      // This will be passed as parameter from BackgroundSyncProvider which has Clerk context
      return this.currentUserId || null;
    } catch (error) {
      console.error("❌ Error getting current user:", error);
      return null;
    }
  }

  // Set current user ID (called by BackgroundSyncProvider)
  setCurrentUserId(userId: string | null) {
    this.currentUserId = userId;
  }

  private currentUserId: string | null = null;

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
          console.error("❌ Sync operation failed:", error);
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

  // UPLOAD SYNC: AsyncStorage → Supabase

  // Sync selected era to Supabase
  async syncSelectedEra() {
    const operation = async () => {
      const userId = this.getCurrentUserId();
      if (!userId) throw new Error("No authenticated user");

      const selectedEra = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_ERA);
      if (!selectedEra) return;

      // Syncing selected era silently

      const { error } = await supabase.from("user_preferences").upsert({
        user_id: userId,
        selected_era: selectedEra,
      });

      if (error) {
        console.warn("Sync warning (era):", error.message);
        return; // Skip throwing error to prevent UI disruption
      }
      // Era synced successfully
    };

    if (this.isOnline) {
      await operation();
    } else {
      this.queueSync(operation);
    }
  }

  // Sync adventure progress to Supabase
  async syncAdventureProgress() {
    const operation = async () => {
      const userId = this.getCurrentUserId();
      if (!userId) throw new Error("No authenticated user");

      const adventureData = await AsyncStorage.getItem(
        STORAGE_KEYS.ADVENTURE_PROGRESS
      );
      if (!adventureData) return;

      const adventures: AdventureProgress[] = JSON.parse(adventureData);
      // Syncing adventure progress silently

      for (const adventure of adventures) {
        const { error } = await supabase.from("adventure_progress").upsert({
          user_id: userId,
          adventure_id: adventure.adventureId,
          is_unlocked: adventure.isUnlocked,
          modules_completed: adventure.modulesCompleted,
          total_modules: adventure.totalModules,
          unlocked_at: adventure.unlockedAt || null,
        });

        if (error) {
          console.warn("Sync warning (adventure):", error.message);
          continue; // Skip this adventure but continue with others
        }
      }

      // Adventure progress synced successfully
    };

    if (this.isOnline) {
      await operation();
    } else {
      this.queueSync(operation);
    }
  }

  // Sync module progress to Supabase
  async syncModuleProgress() {
    const operation = async () => {
      const userId = this.getCurrentUserId();
      if (!userId) throw new Error("No authenticated user");

      const moduleData = await AsyncStorage.getItem(
        STORAGE_KEYS.MODULE_PROGRESS
      );
      if (!moduleData) return;

      const modules: ModuleProgress[] = JSON.parse(moduleData);
      // Syncing module progress silently

      for (const module of modules) {
        const { error } = await supabase.from("user_progress").upsert({
          user_id: userId,
          adventure_id: module.adventureId,
          module_id: module.moduleId,
          is_completed: module.isCompleted,
          lessons_completed: module.lessonsCompleted,
          quiz_completed: module.quizCompleted,
          quiz_score: module.quizScore || null,
          unlocked_at: module.unlockedAt || null,
          // Keep existing fields for backward compatibility
          lesson1_completed: module.lessonsCompleted.includes("lesson1"),
          lesson2_completed: module.lessonsCompleted.includes("lesson2"),
        });

        if (error) {
          console.warn("Sync warning (module):", error.message);
          continue; // Skip this module but continue with others
        }
      }

      // Module progress synced successfully
    };

    if (this.isOnline) {
      await operation();
    } else {
      this.queueSync(operation);
    }
  }

  // Sync all local data to cloud
  async syncAllToCloud() {
    await Promise.all([
      this.syncSelectedEra(),
      this.syncAdventureProgress(),
      this.syncModuleProgress(),
    ]);
    // Full sync completed silently
  }

  // DOWNLOAD SYNC: Supabase → AsyncStorage

  // Download selected era from Supabase
  async downloadSelectedEra() {
    const userId = this.getCurrentUserId();
    if (!userId) throw new Error("No authenticated user");

    const { data, error } = await supabase
      .from("user_preferences")
      .select("selected_era")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows found

    if (data?.selected_era) {
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_ERA, data.selected_era);
    }
  }

  // Download adventure progress from Supabase
  async downloadAdventureProgress() {
    const userId = this.getCurrentUserId();
    if (!userId) throw new Error("No authenticated user");

    const { data, error } = await supabase
      .from("adventure_progress")
      .select("*")
      .eq("user_id", userId)
      .order("adventure_id");

    if (error) throw error;

    if (data && data.length > 0) {
      const adventures: AdventureProgress[] = data.map((row) => ({
        adventureId: row.adventure_id,
        isUnlocked: row.is_unlocked,
        modulesCompleted: row.modules_completed,
        totalModules: row.total_modules,
        unlockedAt: row.unlocked_at,
      }));

      await AsyncStorage.setItem(
        STORAGE_KEYS.ADVENTURE_PROGRESS,
        JSON.stringify(adventures)
      );
    }
  }

  // Download module progress from Supabase
  async downloadModuleProgress() {
    const userId = this.getCurrentUserId();
    if (!userId) throw new Error("No authenticated user");

    const { data, error } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", userId)
      .order("adventure_id")
      .order("module_id");

    if (error) throw error;

    if (data && data.length > 0) {
      const modules: ModuleProgress[] = data.map((row) => ({
        adventureId: row.adventure_id,
        moduleId: row.module_id,
        isCompleted: row.is_completed || false,
        lessonsCompleted: row.lessons_completed || [],
        quizCompleted: row.quiz_completed || false,
        quizScore: row.quiz_score || undefined,
        unlockedAt: row.unlocked_at || undefined,
      }));

      await AsyncStorage.setItem(
        STORAGE_KEYS.MODULE_PROGRESS,
        JSON.stringify(modules)
      );
    }
  }

  // Download all data from cloud to local
  async syncAllFromCloud() {
    if (!this.isOnline) {
      return;
    }

    await Promise.all([
      this.downloadSelectedEra(),
      this.downloadAdventureProgress(),
      this.downloadModuleProgress(),
    ]);
  }

  // Check if we have any local data (for first-time users)
  async hasLocalData(): Promise<boolean> {
    const [era, adventures, modules] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.SELECTED_ERA),
      AsyncStorage.getItem(STORAGE_KEYS.ADVENTURE_PROGRESS),
      AsyncStorage.getItem(STORAGE_KEYS.MODULE_PROGRESS),
    ]);

    return !!(era || adventures || modules);
  }

  // Initialize sync for new users or first app launch
  async initializeSync() {
    if (!this.isOnline) {
      return;
    }

    const hasLocal = await this.hasLocalData();

    if (!hasLocal) {
      // New device or first launch - try to download existing data
      await this.syncAllFromCloud();
    } else {
      // Has local data - upload to cloud as backup
      await this.syncAllToCloud();
    }
  }

  // Manual sync trigger (for user-initiated sync)
  async manualSync() {
    if (!this.isOnline) {
      return false;
    }

    try {
      // Upload local changes first, then download any remote changes
      await this.syncAllToCloud();
      await this.syncAllFromCloud();
      return true;
    } catch (error) {
      console.error("❌ Manual sync failed:", error);
      return false;
    }
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
export const backgroundSyncService = new BackgroundSyncService();
