// Progress Context - REDESIGNED for atomic progress management
// Eliminates race conditions and synchronizes progress, quiz scores, and unlocking logic

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useProgressSync } from '@/hooks/useSyncIntegration'
import { useUser } from '@clerk/clerk-expo'
import { useBackgroundSync } from '@/context/BackgroundSyncProvider'
import { useRewards } from '@/context/RewardsContext'
import { simplifiedSyncService } from '@/services/SimplifiedSyncService'
import { EraType, ModuleState } from '@/types/progress'
import type {
  ProgressUpdateAction,
  ModuleProgress,
  AdventureProgress,
  ModuleProgressV2,
  AdventureProgressV2,
  EraProgress
} from '@/types/progress'

// Web-compatible storage wrapper to prevent SSR issues
class WebCompatibleStorage {
  private static isClient = typeof window !== 'undefined';
  
  static async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web' && !this.isClient) {
      return null; // Return null during SSR
    }
    
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn(`Storage getItem error for key ${key}:`, error);
      return null;
    }
  }
  
  static async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web' && !this.isClient) {
      return; // Skip during SSR
    }
    
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.warn(`Storage setItem error for key ${key}:`, error);
    }
  }
}

// Re-export types from centralized location for convenience
export { EraType, ModuleState } from '@/types/progress'
export type { ProgressUpdateAction, ModuleProgress, AdventureProgress, ModuleProgressV2, AdventureProgressV2, EraProgress } from '@/types/progress'

interface ProgressContextType {
  // Era state
  selectedEra: string | null
  setSelectedEra: (eraId: string) => Promise<void>

  // Adventure progress (Umayyad Dynasty - Era 1)
  adventureProgress: AdventureProgress[]
  getAdventureProgress: (adventureId: number) => AdventureProgress | null

  // Module progress - ATOMIC SYSTEM
  moduleProgress: ModuleProgress[]
  getModuleProgress: (adventureId: number, moduleId: number) => ModuleProgress | null
  atomicProgressUpdate: (adventureId: number, moduleId: number, action: ProgressUpdateAction) => Promise<void>

  // New progress system - Direct save with database IDs
  saveNewProgressData: (moduleData: any) => Promise<void>

  // Centralized calculations (used by Profile, Rewards, 50 XP modal)
  calculateTotalXP: (legacyModules: any[], newModules: any[]) => number
  calculateModulesCompleted: (legacyModules: any[], newModules: any[]) => number
  checkIfCrossed50XPBoundary: (oldXP: number, newXP: number) => number | null

  // Legacy functions (backwards compatibility)
  canRetakeModule: (adventureId: number, moduleId: number) => boolean
  isModuleUnlocked: (adventureId: number, moduleId: number) => boolean
  isLessonCompleted: (adventureId: number, moduleId: number, lessonId: string) => boolean
  getOverallProgress: () => number
  getModuleStarCount: (adventureId: number, moduleId: number) => number

  // Loading state
  isLoading: boolean

  // Reload function for external triggers (AppState, NetInfo, pull-to-refresh)
  reloadProgressData: () => Promise<void>

  // Legacy compatibility functions (deprecated but maintained for gradual migration)
  updateModuleProgress: (adventureId: number, moduleId: number, updates: Partial<ModuleProgress>) => Promise<void>
  completeModule: (adventureId: number, moduleId: number) => Promise<void>
  completeLesson: (adventureId: number, moduleId: number, lessonId: string) => Promise<void>
  completeQuiz: (adventureId: number, moduleId: number) => Promise<void>
  unlockAdventure: (adventureId: number) => Promise<void>
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined)

// Storage keys matching SwiftUI UserDefaults pattern
const STORAGE_KEYS = {
  SELECTED_ERA: 'selected_era',
  ADVENTURE_PROGRESS: 'adventure_progress',
  MODULE_PROGRESS: 'module_progress',
}

// Calculate XP for one era type (centralized XP logic)
export const calculateXPForEra = (
  modules: any[],
  eraType: EraType
): number => {
  let totalXP = 0;

  if (eraType === EraType.LEGACY) {
    // Deduplicate by adventureId+moduleId (take highest score)
    const moduleMap = new Map<string, number>();
    modules.forEach(m => {
      const key = `${m.adventureId}-${m.moduleId}`;
      const currentScore = m.quizScore || 0;
      const existingScore = moduleMap.get(key) || 0;

      // Only count if score >= 2 (Era 1 rule)
      if (currentScore >= 2) {
        moduleMap.set(key, Math.max(existingScore, currentScore));
      }
    });

    moduleMap.forEach(score => {
      totalXP += score * 10;
    });
  } else if (eraType === EraType.NEW) {
    // Already deduplicated in storage
    modules.forEach(m => {
      if (m.quizCorrectAnswers !== undefined) {
        totalXP += m.quizCorrectAnswers * 10;
      }
    });
  }

  return totalXP;
};

// Get total XP across all eras
export const calculateTotalXP = (legacyModules: any[], newModules: any[]): number => {
  return calculateXPForEra(legacyModules, EraType.LEGACY) +
         calculateXPForEra(newModules, EraType.NEW);
};

// Calculate total modules completed across all eras (centralized logic)
export const calculateModulesCompleted = (legacyModules: any[], newModules: any[]): number => {
  let totalModules = 0;

  // Era 1: Count modules with quizScore >= 2 (2/5 minimum rule)
  legacyModules.forEach(m => {
    if (m.quizScore && m.quizScore >= 2) {
      totalModules += 1;
    }
  });

  // Era 2: Count completed modules
  newModules.forEach(m => {
    if (m.isCompleted) {
      totalModules += 1;
    }
  });

  return totalModules;
};

// Check if user crossed a 50 XP boundary (50, 100, 150, etc.)
// Returns the milestone number if crossed, null otherwise
export const checkIfCrossed50XPBoundary = (oldXP: number, newXP: number): number | null => {
  const oldMilestone = Math.floor(oldXP / 50);
  const newMilestone = Math.floor(newXP / 50);

  if (newMilestone > oldMilestone) {
    return newMilestone * 50;
  }

  return null;
};

// Initial data for Umayyad Dynasty Era (Adventure IDs 1-5)
const INITIAL_ADVENTURE_DATA: AdventureProgress[] = [
  { adventureId: 1, isUnlocked: true, modulesCompleted: 0, totalModules: 3 }, // Umayyad Adventure 1 (unlocked by default)
  { adventureId: 2, isUnlocked: false, modulesCompleted: 0, totalModules: 3 }, // Umayyad Adventure 2
  { adventureId: 3, isUnlocked: false, modulesCompleted: 0, totalModules: 3 }, // Umayyad Adventure 3
  { adventureId: 4, isUnlocked: false, modulesCompleted: 0, totalModules: 3 }, // Umayyad Adventure 4
  { adventureId: 5, isUnlocked: false, modulesCompleted: 0, totalModules: 3 }, // Umayyad Adventure 5
]

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [selectedEra, setSelectedEraState] = useState<string | null>(null)
  const [adventureProgress, setAdventureProgress] = useState<AdventureProgress[]>(INITIAL_ADVENTURE_DATA)
  const [moduleProgress, setModuleProgress] = useState<ModuleProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // User sign-in detection for data reload
  const { user, isSignedIn } = useUser()
  const [hasLoadedForUser, setHasLoadedForUser] = useState<string | null>(null)

  // Sync integration for background cloud sync
  const { syncEra, syncAdventure, syncModule } = useProgressSync()

  // CRITICAL: Wait for background sync to complete before loading data on login
  const { isInitialized: syncInitialized } = useBackgroundSync()

  // Rewards system integration (badges + avatars)
  const { checkAndUnlockItems } = useRewards()

  // Load progress from AsyncStorage - reload when user signs in
  // CRITICAL: Wait for Supabase sync to complete BEFORE loading data on login
  useEffect(() => {
    const loadData = async () => {
      // Initial load when app starts (no user signed in)
      if (!isSignedIn) {
        console.log('📖 No user signed in, loading local data only');
        loadProgressData();
        setHasLoadedForUser(null);
        return;
      }

      // When user signs in, WAIT for background sync to complete first
      if (isSignedIn && user && user.id !== hasLoadedForUser) {
        console.log('🔄 User signed in/changed:', user.id);
        console.log('🔄 Previous loaded user:', hasLoadedForUser);

        // CRITICAL FIX: Wait for sync to complete before loading data
        if (!syncInitialized) {
          console.log('⏳ Waiting for background sync to complete...');
          return; // Don't load yet, wait for syncInitialized to become true
        }

        console.log('✅ Background sync complete, loading data from AsyncStorage...');
        setHasLoadedForUser(user.id);
        loadProgressData();
      }
    };

    loadData();
  }, [isSignedIn, user?.id, syncInitialized])

  // Data migration and validation logic
  const migrateAndValidateData = (loadedModules: any[]): ModuleProgress[] => {
    return loadedModules.map(module => {
      // Ensure all required fields exist with proper defaults
      const migratedModule: ModuleProgress = {
        adventureId: typeof module.adventureId === 'number' ? module.adventureId : parseInt(module.adventureId, 10),
        moduleId: typeof module.moduleId === 'number' ? module.moduleId : parseInt(module.moduleId, 10),
        isCompleted: module.isCompleted || false,
        lessonsCompleted: Array.isArray(module.lessonsCompleted) ? module.lessonsCompleted : [],
        quizCompleted: module.quizCompleted || false,
        quizScore: typeof module.quizScore === 'number' ? module.quizScore : undefined,
        unlockedAt: module.unlockedAt || new Date().toISOString()
      }

      // Data integrity validation
      if (migratedModule.isCompleted && !migratedModule.quizCompleted) {
        console.log(`🔧 Migrating corrupted module - Adventure ${module.adventureId} Module ${module.moduleId}`)
        migratedModule.quizCompleted = true
        migratedModule.quizScore = migratedModule.quizScore || 1
        migratedModule.lessonsCompleted = ['lesson1', 'lesson2']
      }

      return migratedModule
    })
  }

  const loadProgressData = async () => {
    try {
      setIsLoading(true)

      // Load selected era
      const storedEra = await WebCompatibleStorage.getItem(STORAGE_KEYS.SELECTED_ERA)
      if (storedEra) {
        setSelectedEraState(storedEra)
      }

      // Load adventure progress
      const storedAdventures = await WebCompatibleStorage.getItem(STORAGE_KEYS.ADVENTURE_PROGRESS)
      if (storedAdventures) {
        const adventures = JSON.parse(storedAdventures) as AdventureProgress[]
        setAdventureProgress(adventures)
      }

      // Load module progress with migration
      const storedModules = await WebCompatibleStorage.getItem(STORAGE_KEYS.MODULE_PROGRESS)
      if (storedModules) {
        const modules = JSON.parse(storedModules)
        const migratedModules = migrateAndValidateData(modules)
        setModuleProgress(migratedModules)

        console.log('✅ Progress data loaded and migrated successfully')
      }

    } catch (error) {
      console.error('Error loading progress data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Public reload function for external triggers (AppState, NetInfo, pull-to-refresh)
  const reloadProgressData = async () => {
    try {
      console.log('🔄 Manual reload triggered - loading progress data...');
      await loadProgressData();
      console.log('✅ Manual reload complete');
    } catch (error) {
      console.error('❌ Error during manual reload:', error);
    }
  }

  // Standard progress save
  const saveProgressData = async (adventures: AdventureProgress[], modules: ModuleProgress[]) => {
    try {
      await Promise.all([
        WebCompatibleStorage.setItem(STORAGE_KEYS.ADVENTURE_PROGRESS, JSON.stringify(adventures)),
        WebCompatibleStorage.setItem(STORAGE_KEYS.MODULE_PROGRESS, JSON.stringify(modules))
      ])
      console.log('✅ Progress data saved successfully')
    } catch (error) {
      console.error('❌ Error saving progress data:', error)
      throw error
    }
  }

  // New progress system save - data flows AS IS to Supabase
  const saveNewProgressData = async (moduleData: any) => {
    try {
      // Save the module completion data directly (already has adventureId, moduleId, era_id, etc.)
      const existingData = await WebCompatibleStorage.getItem('new_user_progress')
      const progressData = existingData ? JSON.parse(existingData) : []

      // Add or update this module's data
      const moduleIndex = progressData.findIndex(
        (m: any) => m.adventureId === moduleData.adventureId && m.moduleId === moduleData.moduleId
      )

      if (moduleIndex >= 0) {
        progressData[moduleIndex] = moduleData
      } else {
        progressData.push(moduleData)
      }

      await WebCompatibleStorage.setItem('new_user_progress', JSON.stringify(progressData))
      console.log('✅ New progress data saved to cache', moduleData)

      // Calculate total XP using centralized deduplication logic
      const totalXP = calculateTotalXP(moduleProgress, progressData);
      console.log(`📊 [NEW] Total XP calculated: ${totalXP}`);

      // Check and unlock badges/avatars (same as Era 1)
      // Build user data structure for reward checking
      const userData: any = { data: {} };
      progressData.forEach((m: any) => {
        const advKey = m.adventureId; // Era 2 uses database IDs directly
        if (!userData.data[advKey]) {
          userData.data[advKey] = { modules: {} };
        }
        userData.data[advKey].modules[m.moduleId] = {
          isCompleted: m.isCompleted,
          quizCompleted: m.quizCompleted,
          quizScore: m.quizScore,
          quizCorrectAnswers: m.quizCorrectAnswers
        };
      });

      await checkAndUnlockItems(userData, totalXP);

      // Trigger real-time cloud sync (awaits immediately, no debounce)
      await syncModule()
    } catch (error) {
      console.error('❌ Error saving new progress data:', error)
      throw error
    }
  }

  const setSelectedEra = async (eraId: string) => {
    try {
      await WebCompatibleStorage.setItem(STORAGE_KEYS.SELECTED_ERA, eraId)
      setSelectedEraState(eraId)

      // Initialize era-specific adventure and module data if needed
      await initializeEraData(eraId)

      // Trigger real-time cloud sync
      await syncEra()
    } catch (error) {
      console.error('Error saving selected era:', error)
    }
  }

  // Initialize era-specific data when era is selected
  const initializeEraData = async (eraId: string) => {
    try {
      // CRITICAL: Wait for AsyncStorage to finish loading before initializing
      if (isLoading) {
        console.log('⏳ Skipping era initialization - AsyncStorage still loading')
        return
      }

      // CRITICAL: Only initialize if this is a FIRST-TIME era selection
      // This prevents overwriting existing progress when component remounts
      const storedEra = await WebCompatibleStorage.getItem(STORAGE_KEYS.SELECTED_ERA)
      if (storedEra === eraId) {
        console.log(`✅ Era "${eraId}" already initialized, skipping to preserve progress`)
        return
      }

      console.log(`🆕 First-time initialization for era: ${eraId}`)

      if (eraId === 'riseOfIslam') {
        // NEW PROGRESS SYSTEM: No state initialization needed
        // Data is loaded from database and saved directly via saveNewProgressData()
        console.log('✅ Rise of Islam uses new progress system - no state initialization needed')
      } else if (eraId === 'umayyad') {
        // Ensure Umayyad Adventure 1 (Internal ID: 1) is unlocked (should already be from INITIAL_ADVENTURE_DATA)
        const currentAdventures = [...adventureProgress]
        const umayyadAdv1 = currentAdventures.find(a => a.adventureId === 1)

        if (umayyadAdv1 && !umayyadAdv1.isUnlocked) {
          console.log('🔓 Ensuring Umayyad Adventure 1 (Internal ID: 1) is unlocked')

          // Unlock Adventure 1 (should already be unlocked, but ensuring consistency)
          const updatedAdventures = currentAdventures.map(a =>
            a.adventureId === 1
              ? { ...a, isUnlocked: true, unlockedAt: new Date().toISOString() }
              : a
          )
          setAdventureProgress(updatedAdventures)
          await WebCompatibleStorage.setItem(STORAGE_KEYS.ADVENTURE_PROGRESS, JSON.stringify(updatedAdventures))
        }

        // Check if Umayyad Adventure 1 Module 1 exists (Internal ID: 1)
        const existingModule = getModuleProgress(1, 1)
        if (!existingModule) {
          console.log('🆕 Creating Umayyad Adventure 1 Module 1 (Internal ID: 1)')

          // Create Umayyad Adventure 1 Module 1 as unlocked by default
          const umayyadAdv1Module1: ModuleProgress = {
            adventureId: 1, // Internal ID for database consistency
            moduleId: 1,
            isCompleted: false,
            lessonsCompleted: [],
            quizCompleted: false,
            unlockedAt: new Date().toISOString()
          }

          const updatedModules = [...moduleProgress, umayyadAdv1Module1]
          setModuleProgress(updatedModules)

          // Save to storage
          await WebCompatibleStorage.setItem(STORAGE_KEYS.MODULE_PROGRESS, JSON.stringify(updatedModules))
          console.log('✅ Umayyad Adventure 1 Module 1 created and saved')
        }
      }
    } catch (error) {
      console.error(`❌ Error initializing era data for ${eraId}:`, error)
    }
  }

  // PERFORMANCE: Memoized getter functions to prevent re-creation on every render
  const getAdventureProgress = useCallback((adventureId: number): AdventureProgress | null => {
    return adventureProgress.find(a => a.adventureId === adventureId) || null
  }, [adventureProgress])

  const getModuleProgress = useCallback((adventureId: number, moduleId: number): ModuleProgress | null => {
    return moduleProgress.find(m => m.adventureId === adventureId && m.moduleId === moduleId) || null
  }, [moduleProgress])

  // Calculate module state for UI display
  const calculateModuleState = (module: ModuleProgress | null): ModuleState => {
    if (!module) return ModuleState.LOCKED
    
    if (module.isCompleted) return ModuleState.MODULE_COMPLETED
    if (module.quizCompleted) return ModuleState.QUIZ_AVAILABLE
    if (module.lessonsCompleted.includes('lesson2')) return ModuleState.LESSON2_COMPLETED
    if (module.lessonsCompleted.includes('lesson1')) return ModuleState.LESSON1_COMPLETED
    return ModuleState.LESSON1_AVAILABLE
  }

  // Get star count based on quiz score (1-2 correct = 1★, 3-4 = 2★, 5 = 3★) - PERFORMANCE: Memoized
  const getModuleStarCount = useCallback((adventureId: number, moduleId: number): number => {
    const module = getModuleProgress(adventureId, moduleId)
    if (!module || !module.quizCompleted || typeof module.quizScore !== 'number') return 0

    const score = module.quizScore
    return score <= 2 ? 1 : score <= 4 ? 2 : 3
  }, [getModuleProgress])

  // Validate module unlocking based on sequential completion - PERFORMANCE: Memoized
  const isModuleUnlocked = useCallback((adventureId: number, moduleId: number): boolean => {
    const adventure = getAdventureProgress(adventureId)

    if (!adventure?.isUnlocked) return false

    // Module 1 is unlocked if adventure is unlocked
    if (moduleId === 1) return true

    // Other modules require previous module completion
    const prevModule = getModuleProgress(adventureId, moduleId - 1)
    return prevModule?.isCompleted || false
  }, [getAdventureProgress, getModuleProgress])

  const isLessonCompleted = useCallback((adventureId: number, moduleId: number, lessonId: string): boolean => {
    const module = getModuleProgress(adventureId, moduleId)
    return module?.lessonsCompleted.includes(lessonId) || false
  }, [getModuleProgress])

  const getOverallProgress = useCallback((): number => {
    const totalModules = adventureProgress.reduce((sum, a) => sum + a.totalModules, 0)
    const completedModules = moduleProgress.filter(m => m.isCompleted).length
    return totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0
  }, [adventureProgress, moduleProgress])

  const canRetakeModule = useCallback((adventureId: number, moduleId: number): boolean => {
    const module = getModuleProgress(adventureId, moduleId)
    return module?.quizCompleted || false // Can retake if quiz has been completed at least once
  }, [getModuleProgress])

  // CORE ATOMIC PROGRESS UPDATE FUNCTION - PERFORMANCE: Memoized with useCallback
  const atomicProgressUpdate = useCallback(async (
    adventureId: number,
    moduleId: number,
    action: ProgressUpdateAction
  ): Promise<void> => {
    try {
      console.log(`🔄 Atomic progress update: Adventure ${adventureId} Module ${moduleId}`, action)
      
      // Find or create module
      let existingModule = getModuleProgress(adventureId, moduleId)
      if (!existingModule) {
        // Create new module if it doesn't exist
        existingModule = {
          adventureId,
          moduleId,
          isCompleted: false,
          lessonsCompleted: [],
          quizCompleted: false,
          unlockedAt: new Date().toISOString()
        }
      }

      // Create updated module based on action type
      let updatedModule: ModuleProgress = { ...existingModule }

      switch (action.type) {
        case 'LESSON_COMPLETED':
          // Add lesson to completed lessons (prevent duplicates)
          if (!updatedModule.lessonsCompleted.includes(action.lessonId)) {
            updatedModule.lessonsCompleted = [...updatedModule.lessonsCompleted, action.lessonId]
          }
          console.log(`✅ Lesson ${action.lessonId} completed for Adventure ${adventureId} Module ${moduleId}`)
          break

        case 'QUIZ_COMPLETED':
        case 'QUIZ_RETAKEN':
          // Handle quiz completion with safe retaking logic
          const isRetake = action.type === 'QUIZ_RETAKEN'
          const newScore = action.quizScore
          const currentBestScore = updatedModule.quizScore || 0

          console.log(`📝 [ProgressContext] Quiz completion - Adventure ${adventureId} Module ${moduleId}`)
          console.log(`📝 [ProgressContext] Action type: ${action.type}`)
          console.log(`📝 [ProgressContext] New score: ${newScore}`)
          console.log(`📝 [ProgressContext] Current best: ${currentBestScore}`)

          if (isRetake) {
            // For retakes, only update if score improved (never downgrade)
            updatedModule.quizScore = Math.max(currentBestScore, newScore)
            console.log(`🔄 Quiz retaken: ${currentBestScore} → ${newScore} (using ${updatedModule.quizScore})`)
          } else {
            // First time completion
            updatedModule.quizScore = newScore
            console.log(`✅ Quiz completed with score: ${newScore}`)
          }

          updatedModule.quizCompleted = true
          console.log(`📝 [ProgressContext] Updated module quizScore: ${updatedModule.quizScore}`)
          
          // Module is completed when quiz is passed (score >= 1)
          if (updatedModule.quizScore >= 1) {
            updatedModule.isCompleted = true
            updatedModule.lessonsCompleted = ['lesson1', 'lesson2'] // Ensure lessons are marked complete
            console.log(`🎉 Module ${moduleId} completed!`)

            // Haptic feedback for module completion
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

            // TODO: Avatar awarding disabled for now
            // Award random locked avatar on module completion
            // const lockedAvatars = avatarTypes.filter(avatar =>
            //   !userAvatars.some(ua => ua.avatar_id === avatar.id)
            // )
            // if (lockedAvatars.length > 0) {
            //   const randomAvatar = lockedAvatars[Math.floor(Math.random() * lockedAvatars.length)]
            //   console.log(`🎁 Awarding random avatar: ${randomAvatar.name}`)
            //   await giveAvatar(randomAvatar.id)
            // }
          }
          break

        case 'MODULE_RESET':
          // Reset module progress but preserve unlocking
          updatedModule = {
            ...existingModule,
            isCompleted: false,
            lessonsCompleted: [],
            quizCompleted: false,
            quizScore: undefined
          }
          console.log(`🔄 Module ${moduleId} reset`)
          break
      }

      // Update modules array
      const updatedModules = existingModule && moduleProgress.some(m => m.adventureId === adventureId && m.moduleId === moduleId)
        ? moduleProgress.map(m => 
            m.adventureId === adventureId && m.moduleId === moduleId ? updatedModule : m
          )
        : [...moduleProgress, updatedModule]

      // Update adventure progress and handle unlocking
      let updatedAdventures = [...adventureProgress]
      const adventure = getAdventureProgress(adventureId)
      
      if (adventure && updatedModule.isCompleted) {
        const completedModulesCount = updatedModules.filter(
          m => m.adventureId === adventureId && m.isCompleted
        ).length

        // Update adventure completion count
        updatedAdventures = adventureProgress.map(a => 
          a.adventureId === adventureId
            ? { ...a, modulesCompleted: completedModulesCount }
            : a
        )

        // Check for adventure completion and unlocking
        if (completedModulesCount === adventure.totalModules) {
          console.log(`🎉 Adventure ${adventureId} completed! Unlocking next adventure...`)
          
          // Unlock next adventure
          const nextAdventureId = adventureId + 1
          if (nextAdventureId <= 10) { // Max 10 adventures (Adventures 1-5 for Umayyad, 6-10 for Rise of Islam)
            updatedAdventures = updatedAdventures.map(a =>
              a.adventureId === nextAdventureId
                ? { ...a, isUnlocked: true, unlockedAt: new Date().toISOString() }
                : a
            )

            // Celebration haptic for adventure unlock
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

            // Auto-create Module 1 for the newly unlocked adventure
            const nextAdventureModule1: ModuleProgress = {
              adventureId: nextAdventureId,
              moduleId: 1,
              isCompleted: false,
              lessonsCompleted: [],
              quizCompleted: false,
              unlockedAt: new Date().toISOString()
            }
            updatedModules.push(nextAdventureModule1)
            console.log(`✅ Adventure ${nextAdventureId} Module 1 auto-created`)
          }
        }

        // Auto-unlock next module in same adventure
        const nextModuleId = moduleId + 1
        if (nextModuleId <= adventure.totalModules && !getModuleProgress(adventureId, nextModuleId)) {
          const nextModule: ModuleProgress = {
            adventureId,
            moduleId: nextModuleId,
            isCompleted: false,
            lessonsCompleted: [],
            quizCompleted: false,
            unlockedAt: new Date().toISOString()
          }
          updatedModules.push(nextModule)
          console.log(`✅ Adventure ${adventureId} Module ${nextModuleId} auto-unlocked`)
        }
      }

      // Atomic state update and save
      console.log(`📝 [ProgressContext] Updating state - ${updatedModules.length} modules`)
      console.log(`📝 [ProgressContext] Updated module details:`, updatedModules.find(m => m.adventureId === adventureId && m.moduleId === moduleId))

      setAdventureProgress(updatedAdventures)
      setModuleProgress(updatedModules)

      console.log(`💾 [ProgressContext] Saving to AsyncStorage...`)
      await saveProgressData(updatedAdventures, updatedModules)
      console.log(`✅ [ProgressContext] Saved to AsyncStorage`)

      // Check and award badges after quiz completion
      if (action.type === 'QUIZ_COMPLETED' || action.type === 'QUIZ_RETAKEN') {
        // Load new era progress to calculate total XP across ALL eras
        const newProgressData = await WebCompatibleStorage.getItem('new_user_progress');
        const newModules = newProgressData ? JSON.parse(newProgressData) : [];

        // Calculate total XP using centralized deduplication logic
        const totalXP = calculateTotalXP(updatedModules, newModules);
        console.log(`📊 Total XP calculated (all eras): ${totalXP}`);

        // Build user data for reward checking
        const userData: any = { data: {} };
        updatedModules.forEach(m => {
          const advKey = `adventure${m.adventureId}`;
          if (!userData.data[advKey]) {
            userData.data[advKey] = { modules: {} };
          }
          userData.data[advKey].modules[`module${m.moduleId}`] = {
            isCompleted: m.isCompleted,
            quizCompleted: m.quizCompleted,
            lessonsCompleted: m.lessonsCompleted,
            quizScore: m.quizScore,
            unlockedAt: m.unlockedAt
          };
        });

        await checkAndUnlockItems(userData, totalXP);
      }

      // Trigger real-time cloud sync (awaits immediately, no debounce)
      await syncModule()
      await syncAdventure()

      console.log(`✅ Atomic progress update completed successfully`)

    } catch (error) {
      console.error('❌ Atomic progress update failed:', error)
      throw error
    }
  }, [adventureProgress, moduleProgress, getModuleProgress, getAdventureProgress, syncModule, syncAdventure, checkAndUnlockItems])

  // Legacy compatibility functions - these call the new atomic system
  const updateModuleProgress = async (
    adventureId: number, 
    moduleId: number, 
    updates: Partial<ModuleProgress>
  ) => {
    console.warn('⚠️ Using legacy updateModuleProgress - migrate to atomicProgressUpdate')
    
    // Convert legacy update to atomic action
    if (updates.quizScore !== undefined && updates.quizCompleted) {
      await atomicProgressUpdate(adventureId, moduleId, {
        type: 'QUIZ_COMPLETED',
        quizScore: updates.quizScore,
        quizCorrectAnswers: updates.quizScore
      })
    } else if (updates.lessonsCompleted) {
      // Handle lesson completion
      const newLessons = updates.lessonsCompleted.filter(lessonId => 
        !isLessonCompleted(adventureId, moduleId, lessonId)
      )
      for (const lessonId of newLessons) {
        await atomicProgressUpdate(adventureId, moduleId, {
          type: 'LESSON_COMPLETED',
          lessonId
        })
      }
    }
  }

  const completeLesson = async (adventureId: number, moduleId: number, lessonId: string) => {
    console.warn('⚠️ Using legacy completeLesson - migrate to atomicProgressUpdate')
    await atomicProgressUpdate(adventureId, moduleId, {
      type: 'LESSON_COMPLETED',
      lessonId
    })
  }

  const completeQuiz = async (adventureId: number, moduleId: number) => {
    console.warn('⚠️ Using legacy completeQuiz - migrate to atomicProgressUpdate')
    // This function doesn't have score info, so we can't use it safely
    throw new Error('completeQuiz is deprecated - use atomicProgressUpdate with QUIZ_COMPLETED action')
  }

  const completeModule = async (adventureId: number, moduleId: number) => {
    console.warn('⚠️ Using legacy completeModule - this function is deprecated')
    // Module completion should happen automatically through quiz completion
    throw new Error('completeModule is deprecated - modules complete automatically through quiz completion')
  }

  const unlockAdventure = async (adventureId: number) => {
    console.warn('⚠️ Using legacy unlockAdventure - unlocking should happen automatically')
    // Adventure unlocking should happen automatically through module completion
  }

  const contextValue: ProgressContextType = {
    selectedEra,
    setSelectedEra,
    adventureProgress,
    getAdventureProgress,
    moduleProgress,
    getModuleProgress,
    atomicProgressUpdate,

    // New era system (Era 2+)
    saveNewProgressData,

    // Centralized calculations
    calculateTotalXP,
    calculateModulesCompleted,
    checkIfCrossed50XPBoundary,

    // Legacy functions (backwards compatibility)
    canRetakeModule,
    isModuleUnlocked,
    isLessonCompleted,
    getOverallProgress,
    getModuleStarCount,
    isLoading,
    reloadProgressData,

    // Legacy compatibility (deprecated)
    updateModuleProgress,
    completeModule,
    completeLesson,
    completeQuiz,
    unlockAdventure,
  }

  return (
    <ProgressContext.Provider value={contextValue}>
      {children}
    </ProgressContext.Provider>
  )
}

// Custom hook to use progress context
export function useProgress(): ProgressContextType {
  const context = useContext(ProgressContext)
  if (context === undefined) {
    throw new Error('useProgress must be used within a ProgressProvider')
  }
  return context
}