// Progress Context - Manages adventure and lesson completion state
// Replaces SwiftUI UserDefaults system with AsyncStorage + React Context

import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Progress data types matching SwiftUI structure
export interface ModuleProgress {
  adventureId: number
  moduleId: number
  isCompleted: boolean
  lessonsCompleted: string[] // lesson IDs like "lesson1", "lesson2"
  quizCompleted: boolean
  quizScore?: number // Number of correct answers for star rating
  unlockedAt?: string // ISO date string
}

export interface AdventureProgress {
  adventureId: number
  isUnlocked: boolean
  modulesCompleted: number
  totalModules: number
  unlockedAt?: string
}

export interface EraProgress {
  eraId: string // "umayyad", "riseOfIslam", etc.
  selectedAt?: string
  adventuresCompleted: number
  totalAdventures: number
  overallProgress: number // 0-100
}

interface ProgressContextType {
  // Era state
  selectedEra: string | null
  setSelectedEra: (eraId: string) => Promise<void>
  
  // Adventure progress
  adventureProgress: AdventureProgress[]
  getAdventureProgress: (adventureId: number) => AdventureProgress | null
  unlockAdventure: (adventureId: number) => Promise<void>
  
  // Module progress
  moduleProgress: ModuleProgress[]
  getModuleProgress: (adventureId: number, moduleId: number) => ModuleProgress | null
  updateModuleProgress: (adventureId: number, moduleId: number, updates: Partial<ModuleProgress>) => Promise<void>
  completeModule: (adventureId: number, moduleId: number) => Promise<void>
  completeLesson: (adventureId: number, moduleId: number, lessonId: string) => Promise<void>
  completeQuiz: (adventureId: number, moduleId: number) => Promise<void>
  
  // Utility functions
  isModuleUnlocked: (adventureId: number, moduleId: number) => boolean
  isLessonCompleted: (adventureId: number, moduleId: number, lessonId: string) => boolean
  getOverallProgress: () => number
  
  // Loading state
  isLoading: boolean
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined)

// Storage keys matching SwiftUI UserDefaults pattern
const STORAGE_KEYS = {
  SELECTED_ERA: 'selected_era',
  ADVENTURE_PROGRESS: 'adventure_progress',
  MODULE_PROGRESS: 'module_progress',
}

// Initial data for Umayyad Dynasty (5 adventures, 3 modules each)
const INITIAL_ADVENTURE_DATA: AdventureProgress[] = [
  { adventureId: 1, isUnlocked: true, modulesCompleted: 0, totalModules: 3 }, // First adventure unlocked by default
  { adventureId: 2, isUnlocked: false, modulesCompleted: 0, totalModules: 3 },
  { adventureId: 3, isUnlocked: false, modulesCompleted: 0, totalModules: 3 },
  { adventureId: 4, isUnlocked: false, modulesCompleted: 0, totalModules: 3 },
  { adventureId: 5, isUnlocked: false, modulesCompleted: 0, totalModules: 3 },
]

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [selectedEra, setSelectedEraState] = useState<string | null>(null)
  const [adventureProgress, setAdventureProgress] = useState<AdventureProgress[]>(INITIAL_ADVENTURE_DATA)
  const [moduleProgress, setModuleProgress] = useState<ModuleProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load progress from AsyncStorage on mount
  useEffect(() => {
    loadProgressData()
  }, [])

  const loadProgressData = async () => {
    try {
      setIsLoading(true)
      
      // Load selected era
      const storedEra = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_ERA)
      if (storedEra) {
        setSelectedEraState(storedEra)
      }

      // Load adventure progress
      const storedAdventures = await AsyncStorage.getItem(STORAGE_KEYS.ADVENTURE_PROGRESS)
      if (storedAdventures) {
        const adventures = JSON.parse(storedAdventures) as AdventureProgress[]
        setAdventureProgress(adventures)
      }

      // Load module progress
      const storedModules = await AsyncStorage.getItem(STORAGE_KEYS.MODULE_PROGRESS)
      if (storedModules) {
        const modules = JSON.parse(storedModules) as ModuleProgress[]
        setModuleProgress(modules)
      }

    } catch (error) {
      console.error('Error loading progress data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveAdventureProgress = async (adventures: AdventureProgress[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ADVENTURE_PROGRESS, JSON.stringify(adventures))
    } catch (error) {
      console.error('Error saving adventure progress:', error)
    }
  }

  const saveModuleProgress = async (modules: ModuleProgress[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MODULE_PROGRESS, JSON.stringify(modules))
    } catch (error) {
      console.error('Error saving module progress:', error)
    }
  }

  const setSelectedEra = async (eraId: string) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_ERA, eraId)
      setSelectedEraState(eraId)
    } catch (error) {
      console.error('Error saving selected era:', error)
    }
  }

  const getAdventureProgress = (adventureId: number): AdventureProgress | null => {
    return adventureProgress.find(a => a.adventureId === adventureId) || null
  }

  const getModuleProgress = (adventureId: number, moduleId: number): ModuleProgress | null => {
    return moduleProgress.find(m => m.adventureId === adventureId && m.moduleId === moduleId) || null
  }

  const unlockAdventure = async (adventureId: number) => {
    const updatedAdventures = adventureProgress.map(adventure => 
      adventure.adventureId === adventureId
        ? { ...adventure, isUnlocked: true, unlockedAt: new Date().toISOString() }
        : adventure
    )
    
    setAdventureProgress(updatedAdventures)
    await saveAdventureProgress(updatedAdventures)
  }

  // Update module progress with partial updates - exactly like SwiftUI UserDefaults updates
  const updateModuleProgress = async (
    adventureId: number, 
    moduleId: number, 
    updates: Partial<ModuleProgress>
  ) => {
    console.log('📚 UpdateModuleProgress:', { adventureId, moduleId, updates })
    
    // Find existing module or create new one
    const existingModule = getModuleProgress(adventureId, moduleId)
    const updatedModule: ModuleProgress = existingModule 
      ? { ...existingModule, ...updates }
      : {
          adventureId,
          moduleId,
          isCompleted: false,
          lessonsCompleted: [],
          quizCompleted: false,
          ...updates
        }
    
    // Update modules array
    const updatedModules = existingModule
      ? moduleProgress.map(m => 
          m.adventureId === adventureId && m.moduleId === moduleId
            ? updatedModule
            : m
        )
      : [...moduleProgress, updatedModule]
    
    setModuleProgress(updatedModules)
    await saveModuleProgress(updatedModules)
    
    console.log('📚 Module progress updated successfully')
  }

  const completeModule = async (adventureId: number, moduleId: number) => {
    // Update module progress
    const existingModule = getModuleProgress(adventureId, moduleId)
    const updatedModules = existingModule
      ? moduleProgress.map(m => 
          m.adventureId === adventureId && m.moduleId === moduleId
            ? { ...m, isCompleted: true }
            : m
        )
      : [
          ...moduleProgress,
          {
            adventureId,
            moduleId,
            isCompleted: true,
            lessonsCompleted: [],
            quizCompleted: true,
          }
        ]

    setModuleProgress(updatedModules)
    await saveModuleProgress(updatedModules)

    // Update adventure progress
    const adventure = getAdventureProgress(adventureId)
    if (adventure) {
      const completedModules = updatedModules.filter(
        m => m.adventureId === adventureId && m.isCompleted
      ).length

      const updatedAdventures = adventureProgress.map(a => 
        a.adventureId === adventureId
          ? { ...a, modulesCompleted: completedModules }
          : a
      )

      setAdventureProgress(updatedAdventures)
      await saveAdventureProgress(updatedAdventures)

      // Unlock next adventure if current one is completed
      if (completedModules === adventure.totalModules) {
        await unlockAdventure(adventureId + 1)
      }

      // Unlock next module in same adventure
      const nextModule = getModuleProgress(adventureId, moduleId + 1)
      if (!nextModule && moduleId < adventure.totalModules) {
        // Auto-unlock next module
        const newModule: ModuleProgress = {
          adventureId,
          moduleId: moduleId + 1,
          isCompleted: false,
          lessonsCompleted: [],
          quizCompleted: false,
          unlockedAt: new Date().toISOString()
        }
        const modulesWithNext = [...updatedModules, newModule]
        setModuleProgress(modulesWithNext)
        await saveModuleProgress(modulesWithNext)
      }
    }
  }

  const completeLesson = async (adventureId: number, moduleId: number, lessonId: string) => {
    const existingModule = getModuleProgress(adventureId, moduleId)
    const updatedModules = existingModule
      ? moduleProgress.map(m => 
          m.adventureId === adventureId && m.moduleId === moduleId
            ? { 
                ...m, 
                lessonsCompleted: [...new Set([...m.lessonsCompleted, lessonId])]
              }
            : m
        )
      : [
          ...moduleProgress,
          {
            adventureId,
            moduleId,
            isCompleted: false,
            lessonsCompleted: [lessonId],
            quizCompleted: false,
            unlockedAt: new Date().toISOString()
          }
        ]

    setModuleProgress(updatedModules)
    await saveModuleProgress(updatedModules)
  }

  const completeQuiz = async (adventureId: number, moduleId: number) => {
    const updatedModules = moduleProgress.map(m => 
      m.adventureId === adventureId && m.moduleId === moduleId
        ? { ...m, quizCompleted: true }
        : m
    )

    setModuleProgress(updatedModules)
    await saveModuleProgress(updatedModules)

    // Complete the module after quiz completion
    await completeModule(adventureId, moduleId)
  }

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


  const contextValue: ProgressContextType = {
    selectedEra,
    setSelectedEra,
    adventureProgress,
    getAdventureProgress,
    unlockAdventure,
    moduleProgress,
    getModuleProgress,
    updateModuleProgress,
    completeModule,
    completeLesson,
    completeQuiz,
    isModuleUnlocked,
    isLessonCompleted,
    getOverallProgress,
    isLoading,
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