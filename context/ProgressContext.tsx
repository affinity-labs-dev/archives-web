// Progress Context - REDESIGNED for atomic progress management
// Eliminates race conditions and synchronizes progress, quiz scores, and unlocking logic

import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import { useProgressSync } from '@/hooks/useSyncIntegration'

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

// Enhanced module state enum for clear progression tracking
export enum ModuleState {
  LOCKED = 'locked',
  LESSON1_AVAILABLE = 'lesson1_available', 
  LESSON1_COMPLETED = 'lesson1_completed',
  LESSON2_AVAILABLE = 'lesson2_available',
  LESSON2_COMPLETED = 'lesson2_completed', 
  QUIZ_AVAILABLE = 'quiz_available',
  MODULE_COMPLETED = 'module_completed'
}

// Progress update action types for atomic operations
export type ProgressUpdateAction = 
  | { type: 'LESSON_COMPLETED'; lessonId: string }
  | { type: 'QUIZ_COMPLETED'; quizScore: number; quizCorrectAnswers: number }
  | { type: 'QUIZ_RETAKEN'; quizScore: number; quizCorrectAnswers: number }
  | { type: 'MODULE_RESET' }

// Enhanced data structures with state machine and retaking support
export interface ModuleProgressV2 {
  adventureId: number
  moduleId: number
  state: ModuleState
  lesson1Completed: boolean
  lesson2Completed: boolean
  quizCompleted: boolean
  quizScore?: number // Number of correct answers (0-5)
  quizAttempts: number // Track retake attempts
  bestQuizScore?: number // Highest score achieved across all attempts
  unlockedAt: string
  completedAt?: string
  lastUpdated: string
}

export interface AdventureProgressV2 {
  adventureId: number
  isUnlocked: boolean
  modulesCompleted: number
  totalModules: number
  unlockedAt?: string
  completedAt?: string
}

export interface EraProgress {
  eraId: string // "umayyad", "riseOfIslam", etc.
  selectedAt?: string
  adventuresCompleted: number
  totalAdventures: number
  overallProgress: number // 0-100
}

// Legacy interfaces for backward compatibility during migration
export interface ModuleProgress {
  adventureId: number
  moduleId: number
  isCompleted: boolean
  lessonsCompleted: string[]
  quizCompleted: boolean
  quizScore?: number
  unlockedAt?: string
}

export interface AdventureProgress {
  adventureId: number
  isUnlocked: boolean
  modulesCompleted: number
  totalModules: number
  unlockedAt?: string
}

interface ProgressContextType {
  // Era state
  selectedEra: string | null
  setSelectedEra: (eraId: string) => Promise<void>

  // Adventure progress (Umayyad Dynasty)
  adventureProgress: AdventureProgress[]
  getAdventureProgress: (adventureId: number) => AdventureProgress | null

  // Module progress (Umayyad Dynasty) - NEW ATOMIC SYSTEM
  moduleProgress: ModuleProgress[]
  getModuleProgress: (adventureId: number, moduleId: number) => ModuleProgress | null
  atomicProgressUpdate: (adventureId: number, moduleId: number, action: ProgressUpdateAction) => Promise<void>

  // ROI-specific progress functions (new module ID format)
  roiAdventureProgress: AdventureProgress[]
  roiModuleProgress: ModuleProgress[]
  getRoiAdventureProgress: (adventureId: number) => AdventureProgress | null
  getRoiModuleProgress: (moduleId: string) => ModuleProgress | null // ROI_Adv1_M1 format
  roiAtomicProgressUpdate: (moduleId: string, action: ProgressUpdateAction) => Promise<void>

  // Unified functions (work with both eras)
  isRoiModuleUnlocked: (moduleId: string) => boolean
  isRoiLessonCompleted: (moduleId: string, lessonId: string) => boolean
  canRetakeRoiModule: (moduleId: string) => boolean
  getRoiModuleStarCount: (moduleId: string) => number

  // Legacy functions (backwards compatibility)
  canRetakeModule: (adventureId: number, moduleId: number) => boolean
  isModuleUnlocked: (adventureId: number, moduleId: number) => boolean
  isLessonCompleted: (adventureId: number, moduleId: number, lessonId: string) => boolean
  getOverallProgress: () => number
  getModuleStarCount: (adventureId: number, moduleId: number) => number
  
  // Loading state
  isLoading: boolean
  
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

// Initial data for Umayyad Dynasty Era (Adventure IDs 1-5)
const UMAYYAD_INITIAL_ADVENTURE_DATA: AdventureProgress[] = [
  { adventureId: 1, isUnlocked: true, modulesCompleted: 0, totalModules: 3 }, // Umayyad Adventure 1 (unlocked by default)
  { adventureId: 2, isUnlocked: false, modulesCompleted: 0, totalModules: 3 }, // Umayyad Adventure 2
  { adventureId: 3, isUnlocked: false, modulesCompleted: 0, totalModules: 3 }, // Umayyad Adventure 3
  { adventureId: 4, isUnlocked: false, modulesCompleted: 0, totalModules: 3 }, // Umayyad Adventure 4
  { adventureId: 5, isUnlocked: false, modulesCompleted: 0, totalModules: 3 }, // Umayyad Adventure 5
]

// Initial data for Rise of Islam Era (Adventure IDs 1-5, independent from Umayyad)
const ROI_INITIAL_ADVENTURE_DATA: AdventureProgress[] = [
  { adventureId: 1, isUnlocked: false, modulesCompleted: 0, totalModules: 3 }, // ROI Adventure 1 (unlocked when era selected)
  { adventureId: 2, isUnlocked: false, modulesCompleted: 0, totalModules: 3 }, // ROI Adventure 2
  { adventureId: 3, isUnlocked: false, modulesCompleted: 0, totalModules: 3 }, // ROI Adventure 3
  { adventureId: 4, isUnlocked: false, modulesCompleted: 0, totalModules: 3 }, // ROI Adventure 4
  { adventureId: 5, isUnlocked: false, modulesCompleted: 0, totalModules: 3 }, // ROI Adventure 5
]

// Combined initial data (backwards compatible with old system)
const INITIAL_ADVENTURE_DATA: AdventureProgress[] = [
  ...UMAYYAD_INITIAL_ADVENTURE_DATA,
  // Legacy ROI data (Adventure IDs 6-10) - will be migrated to new system
  { adventureId: 6, isUnlocked: false, modulesCompleted: 0, totalModules: 3 }, // Legacy ROI Adventure 1
  { adventureId: 7, isUnlocked: false, modulesCompleted: 0, totalModules: 3 }, // Legacy ROI Adventure 2
  { adventureId: 8, isUnlocked: false, modulesCompleted: 0, totalModules: 3 }, // Legacy ROI Adventure 3
  { adventureId: 9, isUnlocked: false, modulesCompleted: 0, totalModules: 3 }, // Legacy ROI Adventure 4
  { adventureId: 10, isUnlocked: false, modulesCompleted: 0, totalModules: 3 }, // Legacy ROI Adventure 5
]

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [selectedEra, setSelectedEraState] = useState<string | null>(null)
  const [adventureProgress, setAdventureProgress] = useState<AdventureProgress[]>(INITIAL_ADVENTURE_DATA)
  const [moduleProgress, setModuleProgress] = useState<ModuleProgress[]>([])

  // ROI-specific state management (independent progress tracking)
  const [roiAdventureProgress, setRoiAdventureProgress] = useState<AdventureProgress[]>(ROI_INITIAL_ADVENTURE_DATA)
  const [roiModuleProgress, setRoiModuleProgress] = useState<ModuleProgress[]>([])

  const [isLoading, setIsLoading] = useState(true)
  
  // Sync integration for background cloud sync
  const { syncEra, syncAdventure, syncModule } = useProgressSync()

  // Helper function to parse ROI module IDs (ROI_Adv1_M1 format)
  const parseRoiModuleId = (moduleId: string): { adventureId: number; moduleId: number } | null => {
    const match = moduleId.match(/^ROI_Adv(\d+)_M(\d+)$/)
    if (match) {
      return {
        adventureId: parseInt(match[1]),
        moduleId: parseInt(match[2])
      }
    }
    return null
  }

  // Load progress from AsyncStorage on mount
  useEffect(() => {
    loadProgressData()
  }, [])

  // Data migration and validation logic
  const migrateAndValidateData = (loadedModules: any[]): ModuleProgress[] => {
    return loadedModules.map(module => {
      // Ensure all required fields exist with proper defaults
      const migratedModule: ModuleProgress = {
        adventureId: module.adventureId,
        moduleId: module.moduleId,
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

  // ROI-specific migration logic: Convert legacy Adventure IDs 6-10 to new ROI system
  const migrateRoiProgressData = (legacyModules: ModuleProgress[], legacyAdventures: AdventureProgress[]) => {
    const migratedRoiModules: ModuleProgress[] = []
    const migratedRoiAdventures: AdventureProgress[] = [...ROI_INITIAL_ADVENTURE_DATA]

    console.log('🔄 Starting ROI progress migration from legacy system...')

    // Process each legacy ROI module (Adventure IDs 6-10)
    legacyModules.forEach(legacyModule => {
      if (legacyModule.adventureId >= 6 && legacyModule.adventureId <= 10) {
        // Convert legacy Adventure ID to new ROI Adventure ID
        const newAdventureId = legacyModule.adventureId - 5 // 6→1, 7→2, 8→3, 9→4, 10→5
        const roiModuleId = `ROI_Adv${newAdventureId}_M${legacyModule.moduleId}`

        // Create new ROI module with converted data
        const migratedRoiModule: ModuleProgress = {
          ...legacyModule,
          adventureId: newAdventureId, // Update to new adventure ID
          moduleId: legacyModule.moduleId // Keep same module ID
        }

        // Add ROI-specific identifier
        ;(migratedRoiModule as any).roiModuleId = roiModuleId

        migratedRoiModules.push(migratedRoiModule)

        console.log(`🔄 Migrated legacy Adventure ${legacyModule.adventureId} Module ${legacyModule.moduleId} → ${roiModuleId}`)
      }
    })

    // Process legacy ROI adventures
    legacyAdventures.forEach(legacyAdventure => {
      if (legacyAdventure.adventureId >= 6 && legacyAdventure.adventureId <= 10) {
        const newAdventureId = legacyAdventure.adventureId - 5

        // Update the corresponding ROI adventure
        const adventureIndex = migratedRoiAdventures.findIndex(a => a.adventureId === newAdventureId)
        if (adventureIndex !== -1) {
          migratedRoiAdventures[adventureIndex] = {
            ...migratedRoiAdventures[adventureIndex],
            isUnlocked: legacyAdventure.isUnlocked,
            modulesCompleted: legacyAdventure.modulesCompleted,
            unlockedAt: legacyAdventure.unlockedAt
          }

          console.log(`🔄 Migrated legacy ROI Adventure ${legacyAdventure.adventureId} → Adventure ${newAdventureId}`)
        }
      }
    })

    console.log(`✅ ROI migration complete: ${migratedRoiModules.length} modules migrated`)
    return { migratedRoiModules, migratedRoiAdventures }
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

  // Immediate save for critical data - no debouncing
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

  const setSelectedEra = async (eraId: string) => {
    try {
      await WebCompatibleStorage.setItem(STORAGE_KEYS.SELECTED_ERA, eraId)
      setSelectedEraState(eraId)

      // Initialize era-specific adventure and module data if needed
      await initializeEraData(eraId)

      syncEra()
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
        // NEW ROI SYSTEM: Initialize ROI-specific progress tracking
        const currentRoiAdventures = [...roiAdventureProgress]
        const roiAdv1 = currentRoiAdventures.find(a => a.adventureId === 1)

        if (roiAdv1 && !roiAdv1.isUnlocked) {
          console.log('🔓 Unlocking Rise of Islam Adventure 1 (New ROI System)')

          // Unlock ROI Adventure 1
          const updatedRoiAdventures = currentRoiAdventures.map(a =>
            a.adventureId === 1
              ? { ...a, isUnlocked: true, unlockedAt: new Date().toISOString() }
              : a
          )
          setRoiAdventureProgress(updatedRoiAdventures)
          // TODO: Add ROI-specific storage
        }

        // Check if ROI Adventure 1 Module 1 exists
        const existingRoiModule = getRoiModuleProgress('ROI_Adv1_M1')
        if (!existingRoiModule) {
          // Create ROI Adventure 1 Module 1 as unlocked by default
          const roiAdv1Module1: ModuleProgress = {
            adventureId: 1, // ROI Adventure 1
            moduleId: 1,
            isCompleted: false,
            lessonsCompleted: [],
            quizCompleted: false,
            unlockedAt: new Date().toISOString()
          }
          ;(roiAdv1Module1 as any).roiModuleId = 'ROI_Adv1_M1'

          const updatedRoiModules = [...roiModuleProgress, roiAdv1Module1]
          setRoiModuleProgress(updatedRoiModules)
        }

        // LEGACY SYSTEM: Also initialize legacy data for backwards compatibility
        const currentAdventures = [...adventureProgress]
        const riseOfIslamAdv1 = currentAdventures.find(a => a.adventureId === 6)

        if (riseOfIslamAdv1 && !riseOfIslamAdv1.isUnlocked) {
          console.log('🔓 Unlocking Rise of Islam Adventure 1 (Legacy ID: 6)')

          // Unlock Adventure 6
          const updatedAdventures = currentAdventures.map(a =>
            a.adventureId === 6
              ? { ...a, isUnlocked: true, unlockedAt: new Date().toISOString() }
              : a
          )
          setAdventureProgress(updatedAdventures)
          await WebCompatibleStorage.setItem(STORAGE_KEYS.ADVENTURE_PROGRESS, JSON.stringify(updatedAdventures))
        }

        // Check if Rise of Islam Adventure 1 Module 1 exists (Legacy ID: 6)
        const existingModule = getModuleProgress(6, 1)
        if (!existingModule) {
          console.log('🆕 Creating Rise of Islam Adventure 1 Module 1 (Legacy ID: 6)')

          // Create Rise of Islam Adventure 1 Module 1 as unlocked by default
          const riseOfIslamAdv1Module1: ModuleProgress = {
            adventureId: 6, // Legacy ID for database consistency
            moduleId: 1,
            isCompleted: false,
            lessonsCompleted: [],
            quizCompleted: false,
            unlockedAt: new Date().toISOString()
          }

          const updatedModules = [...moduleProgress, riseOfIslamAdv1Module1]
          setModuleProgress(updatedModules)

          // Save to storage
          await WebCompatibleStorage.setItem(STORAGE_KEYS.MODULE_PROGRESS, JSON.stringify(updatedModules))
          console.log('✅ Rise of Islam Adventure 1 Module 1 created and saved')
        }
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

  const getAdventureProgress = (adventureId: number): AdventureProgress | null => {
    return adventureProgress.find(a => a.adventureId === adventureId) || null
  }

  const getModuleProgress = (adventureId: number, moduleId: number): ModuleProgress | null => {
    return moduleProgress.find(m => m.adventureId === adventureId && m.moduleId === moduleId) || null
  }

  // ROI-specific progress functions
  const getRoiAdventureProgress = (adventureId: number): AdventureProgress | null => {
    return roiAdventureProgress.find(a => a.adventureId === adventureId) || null
  }

  const getRoiModuleProgress = (moduleId: string): ModuleProgress | null => {
    return roiModuleProgress.find(m => m.moduleId === moduleId) || null
  }

  // ROI-specific utility functions
  const isRoiModuleUnlocked = (moduleId: string): boolean => {
    const parsed = parseRoiModuleId(moduleId)
    if (!parsed) return false

    const adventure = getRoiAdventureProgress(parsed.adventureId)
    if (!adventure?.isUnlocked) return false

    // Module 1 is unlocked if adventure is unlocked
    if (parsed.moduleId === 1) return true

    // Other modules require previous module completion
    const prevModuleId = `ROI_Adv${parsed.adventureId}_M${parsed.moduleId - 1}`
    const prevModule = getRoiModuleProgress(prevModuleId)
    return prevModule?.isCompleted || false
  }

  const isRoiLessonCompleted = (moduleId: string, lessonId: string): boolean => {
    const module = getRoiModuleProgress(moduleId)
    return module?.lessonsCompleted.includes(lessonId) || false
  }

  const canRetakeRoiModule = (moduleId: string): boolean => {
    const module = getRoiModuleProgress(moduleId)
    return module?.quizCompleted || false
  }

  const getRoiModuleStarCount = (moduleId: string): number => {
    const module = getRoiModuleProgress(moduleId)
    if (!module?.quizScore) return 0

    // Same star rating logic as legacy system
    if (module.quizScore >= 5) return 3
    if (module.quizScore >= 4) return 2
    if (module.quizScore >= 2) return 1
    return 0
  }

  // Calculate module state for UI display
  const calculateModuleState = (module: ModuleProgress | null): ModuleState => {
    if (!module) return ModuleState.LOCKED
    
    if (module.isCompleted) return ModuleState.MODULE_COMPLETED
    if (module.quizCompleted) return ModuleState.QUIZ_AVAILABLE
    if (module.lessonsCompleted.includes('lesson2')) return ModuleState.LESSON2_COMPLETED
    if (module.lessonsCompleted.includes('lesson1')) return ModuleState.LESSON1_COMPLETED
    return ModuleState.LESSON1_AVAILABLE
  }

  // Get star count based on quiz score (1-2 correct = 1★, 3-4 = 2★, 5 = 3★)
  const getModuleStarCount = (adventureId: number, moduleId: number): number => {
    const module = getModuleProgress(adventureId, moduleId)
    if (!module || !module.quizCompleted || typeof module.quizScore !== 'number') return 0
    
    const score = module.quizScore
    return score <= 2 ? 1 : score <= 4 ? 2 : 3
  }

  // Validate module unlocking based on sequential completion
  const isModuleUnlocked = (adventureId: number, moduleId: number): boolean => {
    const adventure = getAdventureProgress(adventureId)
    
    if (!adventure?.isUnlocked) return false

    // Module 1 is unlocked if adventure is unlocked
    if (moduleId === 1) return true

    // Other modules require previous module completion
    const prevModule = getModuleProgress(adventureId, moduleId - 1)
    return prevModule?.isCompleted || false
  }

  const isLessonCompleted = (adventureId: number, moduleId: number, lessonId: string): boolean => {
    const module = getModuleProgress(adventureId, moduleId)
    return module?.lessonsCompleted.includes(lessonId) || false
  }

  const getOverallProgress = (): number => {
    const totalModules = adventureProgress.reduce((sum, a) => sum + a.totalModules, 0)
    const completedModules = moduleProgress.filter(m => m.isCompleted).length
    return totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0
  }

  const canRetakeModule = (adventureId: number, moduleId: number): boolean => {
    const module = getModuleProgress(adventureId, moduleId)
    return module?.quizCompleted || false // Can retake if quiz has been completed at least once
  }

  // CORE ATOMIC PROGRESS UPDATE FUNCTION
  const atomicProgressUpdate = async (
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
          
          // Module is completed when quiz is passed (score >= 1)
          if (updatedModule.quizScore >= 1) {
            updatedModule.isCompleted = true
            updatedModule.lessonsCompleted = ['lesson1', 'lesson2'] // Ensure lessons are marked complete
            console.log(`🎉 Module ${moduleId} completed!`)
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
      setAdventureProgress(updatedAdventures)
      setModuleProgress(updatedModules)
      await saveProgressData(updatedAdventures, updatedModules)

      // Trigger cloud sync
      syncModule()
      syncAdventure()

      console.log(`✅ Atomic progress update completed successfully`)

    } catch (error) {
      console.error('❌ Atomic progress update failed:', error)
      throw error
    }
  }

  // ROI ATOMIC PROGRESS UPDATE FUNCTION
  const roiAtomicProgressUpdate = async (
    moduleId: string,
    action: ProgressUpdateAction
  ): Promise<void> => {
    try {
      console.log(`🔄 ROI Atomic progress update: ${moduleId}`, action)

      const parsed = parseRoiModuleId(moduleId)
      if (!parsed) {
        throw new Error(`Invalid ROI module ID format: ${moduleId}`)
      }

      // Find or create module
      let existingModule = getRoiModuleProgress(moduleId)
      if (!existingModule) {
        // Create new module if it doesn't exist
        existingModule = {
          adventureId: parsed.adventureId, // This is for internal tracking compatibility
          moduleId: parsed.moduleId, // This is for internal tracking compatibility
          isCompleted: false,
          lessonsCompleted: [],
          quizCompleted: false,
          unlockedAt: new Date().toISOString()
        }
        // Add the full ROI module ID for ROI-specific tracking
        ;(existingModule as any).roiModuleId = moduleId
      }

      // Create updated module based on action type (same logic as legacy)
      let updatedModule: ModuleProgress = { ...existingModule }
      ;(updatedModule as any).roiModuleId = moduleId

      switch (action.type) {
        case 'LESSON_COMPLETED':
          if (!updatedModule.lessonsCompleted.includes(action.lessonId)) {
            updatedModule.lessonsCompleted = [...updatedModule.lessonsCompleted, action.lessonId]
          }
          console.log(`✅ ROI Lesson ${action.lessonId} completed for ${moduleId}`)
          break

        case 'QUIZ_COMPLETED':
        case 'QUIZ_RETAKEN':
          updatedModule.quizCompleted = true
          updatedModule.quizScore = action.quizScore

          // Module is completed when quiz is passed (score >= 2 out of 5)
          if (action.quizScore >= 2) {
            updatedModule.isCompleted = true
            console.log(`🎉 ROI Module ${moduleId} completed with score: ${action.quizScore}/5`)
          } else {
            updatedModule.isCompleted = false
            console.log(`📝 ROI Module ${moduleId} quiz completed but not passed: ${action.quizScore}/5`)
          }
          break

        case 'MODULE_RESET':
          updatedModule = {
            ...existingModule,
            isCompleted: false,
            lessonsCompleted: [],
            quizCompleted: false,
            quizScore: undefined
          }
          ;(updatedModule as any).roiModuleId = moduleId
          console.log(`🔄 ROI Module ${moduleId} reset`)
          break
      }

      // Update ROI modules array
      const updatedRoiModules = existingModule && roiModuleProgress.some(m => (m as any).roiModuleId === moduleId)
        ? roiModuleProgress.map(m =>
            (m as any).roiModuleId === moduleId ? updatedModule : m
          )
        : [...roiModuleProgress, updatedModule]

      // Update ROI adventure progress and handle unlocking
      let updatedRoiAdventures = [...roiAdventureProgress]
      const adventure = getRoiAdventureProgress(parsed.adventureId)

      if (adventure && updatedModule.isCompleted) {
        const completedModulesCount = updatedRoiModules.filter(
          m => {
            const mParsed = parseRoiModuleId((m as any).roiModuleId || '')
            return mParsed?.adventureId === parsed.adventureId && m.isCompleted
          }
        ).length

        // Update adventure completion count
        updatedRoiAdventures = roiAdventureProgress.map(a =>
          a.adventureId === parsed.adventureId
            ? { ...a, modulesCompleted: completedModulesCount }
            : a
        )

        // Check for adventure completion and unlocking
        if (completedModulesCount === adventure.totalModules) {
          console.log(`🎉 ROI Adventure ${parsed.adventureId} completed! Unlocking next adventure...`)

          // Unlock next ROI adventure
          const nextAdventureId = parsed.adventureId + 1
          if (nextAdventureId <= 5) { // Max 5 ROI adventures
            updatedRoiAdventures = updatedRoiAdventures.map(a =>
              a.adventureId === nextAdventureId
                ? { ...a, isUnlocked: true, unlockedAt: new Date().toISOString() }
                : a
            )

            // Auto-create Module 1 for the newly unlocked adventure
            const nextAdventureModule1: ModuleProgress = {
              adventureId: nextAdventureId,
              moduleId: 1,
              isCompleted: false,
              lessonsCompleted: [],
              quizCompleted: false,
              unlockedAt: new Date().toISOString()
            }
            ;(nextAdventureModule1 as any).roiModuleId = `ROI_Adv${nextAdventureId}_M1`
            updatedRoiModules.push(nextAdventureModule1)
            console.log(`✅ ROI Adventure ${nextAdventureId} Module 1 auto-created`)
          }
        }

        // Auto-unlock next module in same adventure
        const nextModuleId = parsed.moduleId + 1
        const nextRoiModuleId = `ROI_Adv${parsed.adventureId}_M${nextModuleId}`
        if (nextModuleId <= adventure.totalModules && !getRoiModuleProgress(nextRoiModuleId)) {
          const nextModule: ModuleProgress = {
            adventureId: parsed.adventureId,
            moduleId: nextModuleId,
            isCompleted: false,
            lessonsCompleted: [],
            quizCompleted: false,
            unlockedAt: new Date().toISOString()
          }
          ;(nextModule as any).roiModuleId = nextRoiModuleId
          updatedRoiModules.push(nextModule)
          console.log(`✅ ROI Adventure ${parsed.adventureId} Module ${nextModuleId} auto-unlocked`)
        }
      }

      // Atomic state update
      setRoiAdventureProgress(updatedRoiAdventures)
      setRoiModuleProgress(updatedRoiModules)

      // TODO: Add ROI-specific save/sync functions
      // await saveRoiProgressData(updatedRoiAdventures, updatedRoiModules)
      // syncModule()
      // syncAdventure()

      console.log(`✅ ROI Atomic progress update completed successfully`)

    } catch (error) {
      console.error('❌ ROI Atomic progress update failed:', error)
      throw error
    }
  }

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

    // ROI-specific functions
    roiAdventureProgress,
    roiModuleProgress,
    getRoiAdventureProgress,
    getRoiModuleProgress,
    roiAtomicProgressUpdate,
    isRoiModuleUnlocked,
    isRoiLessonCompleted,
    canRetakeRoiModule,
    getRoiModuleStarCount,

    // Legacy functions (backwards compatibility)
    canRetakeModule,
    isModuleUnlocked,
    isLessonCompleted,
    getOverallProgress,
    getModuleStarCount,
    isLoading,

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