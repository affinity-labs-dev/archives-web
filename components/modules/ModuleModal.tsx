// ModuleModal.tsx - EXACT replica of SwiftUI fullScreenCover modal system
// Manages the full-screen module experience: Lesson1 → Lesson2 → Quiz → Results → Dismiss

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Modal,
  BackHandler,
} from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useProgress } from '@/context/ProgressContext'
import * as Haptics from 'expo-haptics'

// Import lesson and quiz components
import Adventure1_Module1_Lesson1 from './adventure1/Adventure1_Module1_Lesson1'
import Adventure1_Module1_Lesson2 from './adventure1/Adventure1_Module1_Lesson2'
import Adventure1_Module1_Quiz from './adventure1/Adventure1_Module1_Quiz'

// Adventure 1 - Damascus: The New Capital - Module 2
import Adventure1_Module2_Lesson1 from './adventure1/Adventure1_Module2_Lesson1'
import Adventure1_Module2_Lesson2 from './adventure1/Adventure1_Module2_Lesson2'
import Adventure1_Module2_Quiz from './adventure1/Adventure1_Module2_Quiz'

// Adventure 1 - Damascus: The New Capital - Module 3
import Adventure1_Module3_Lesson1 from './adventure1/Adventure1_Module3_Lesson1'
import Adventure1_Module3_Lesson2 from './adventure1/Adventure1_Module3_Lesson2'
import Adventure1_Module3_Quiz from './adventure1/Adventure1_Module3_Quiz'

// Adventure 2 - Abd al-Malik's Reforms - Module 1
import Adventure2_Module1_Lesson1 from './adventure2/Adventure2_Module1_Lesson1'
import Adventure2_Module1_Lesson2 from './adventure2/Adventure2_Module1_Lesson2'
import Adventure2_Module1_Quiz from './adventure2/Adventure2_Module1_Quiz'

// Adventure 2 - Abd al-Malik's Reforms - Module 2
import Adventure2_Module2_Lesson1 from './adventure2/Adventure2_Module2_Lesson1'
import Adventure2_Module2_Lesson2 from './adventure2/Adventure2_Module2_Lesson2'
import Adventure2_Module2_Quiz from './adventure2/Adventure2_Module2_Quiz'

// Adventure 2 - Abd al-Malik's Reforms - Module 3
import Adventure2_Module3_Lesson1 from './adventure2/Adventure2_Module3_Lesson1'
import Adventure2_Module3_Lesson2 from './adventure2/Adventure2_Module3_Lesson2'
import Adventure2_Module3_Quiz from './adventure2/Adventure2_Module3_Quiz'

// Adventure 3 - Westward Expansion - Module 1
import Adventure3_Module1_Lesson1 from './adventure3/Adventure3_Module1_Lesson1'
import Adventure3_Module1_Lesson2 from './adventure3/Adventure3_Module1_Lesson2'
import Adventure3_Module1_Quiz from './adventure3/Adventure3_Module1_Quiz'

// Adventure 3 - Westward Expansion - Module 2
import Adventure3_Module2_Lesson1 from './adventure3/Adventure3_Module2_Lesson1'
import Adventure3_Module2_Lesson2 from './adventure3/Adventure3_Module2_Lesson2'
import Adventure3_Module2_Quiz from './adventure3/Adventure3_Module2_Quiz'

// Adventure 3 - Westward Expansion - Module 3
import Adventure3_Module3_Lesson1 from './adventure3/Adventure3_Module3_Lesson1'
import Adventure3_Module3_Lesson2 from './adventure3/Adventure3_Module3_Lesson2'
import Adventure3_Module3_Quiz from './adventure3/Adventure3_Module3_Quiz'

// Adventure 4 - Great Mosque of Damascus - Module 1
import Adventure4_Module1_Lesson1 from './adventure4/Adventure4_Module1_Lesson1'
import Adventure4_Module1_Lesson2 from './adventure4/Adventure4_Module1_Lesson2'
import Adventure4_Module1_Quiz from './adventure4/Adventure4_Module1_Quiz'

// Adventure 4 - Great Mosque of Damascus - Module 2
import Adventure4_Module2_Lesson1 from './adventure4/Adventure4_Module2_Lesson1'
import Adventure4_Module2_Lesson2 from './adventure4/Adventure4_Module2_Lesson2'
import Adventure4_Module2_Quiz from './adventure4/Adventure4_Module2_Quiz'

// Adventure 4 - Great Mosque of Damascus - Module 3
import Adventure4_Module3_Lesson1 from './adventure4/Adventure4_Module3_Lesson1'
import Adventure4_Module3_Lesson2 from './adventure4/Adventure4_Module3_Lesson2'
import Adventure4_Module3_Quiz from './adventure4/Adventure4_Module3_Quiz'

// Adventure 5 - Yazīd II's Reign - Module 1
import Adventure5_Module1_Lesson1 from './adventure5/Adventure5_Module1_Lesson1'
import Adventure5_Module1_Lesson2 from './adventure5/Adventure5_Module1_Lesson2'
import Adventure5_Module1_Quiz from './adventure5/Adventure5_Module1_Quiz'

// Adventure 5 - The Abbasid Revolution - Module 2
import Adventure5_Module2_Lesson1 from './adventure5/Adventure5_Module2_Lesson1'
import Adventure5_Module2_Lesson2 from './adventure5/Adventure5_Module2_Lesson2'
import Adventure5_Module2_Quiz from './adventure5/Adventure5_Module2_Quiz'

// Adventure 5 - Revolution & New Order - Module 3
import Adventure5_Module3_Lesson1 from './adventure5/Adventure5_Module3_Lesson1'
import Adventure5_Module3_Lesson2 from './adventure5/Adventure5_Module3_Lesson2'
import Adventure5_Module3_Quiz from './adventure5/Adventure5_Module3_Quiz'

// ROI components moved to ROIModuleModal.tsx for clean era separation

interface ModuleModalProps {
  isVisible: boolean
  moduleId: string | null // e.g., "adv1_mod1"
  onDismiss: () => void
}

export default function ModuleModal({ isVisible, moduleId, onDismiss }: ModuleModalProps) {
  const [currentStep, setCurrentStep] = useState<'lesson1' | 'lesson2' | 'quiz'>('lesson1')
  const { updateModuleProgress } = useProgress()

  // Reset to lesson1 when modal opens with new module
  useEffect(() => {
    if (isVisible && moduleId) {
      setCurrentStep('lesson1')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
  }, [isVisible, moduleId])

  // Handle Android back button - EXACT SwiftUI: prevent dismissal during lessons
  useEffect(() => {
    if (isVisible) {
      const backAction = () => {
        // Only allow dismissal from lesson1, like SwiftUI
        if (currentStep === 'lesson1') {
          onDismiss()
          return true
        }
        return true // Prevent back navigation during lesson flow
      }

      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction)
      return () => backHandler.remove()
    }
  }, [isVisible, currentStep, onDismiss])

  // Navigation handlers - EXACT SwiftUI flow + ROI support
  const handleLessonComplete = (lessonId: string) => {

    if (moduleId) {
      // Handle ROI module ID format (ROI_Adv1_M1) - NEW
      if (moduleId.startsWith('ROI_')) {
        // ROI modules use atomic progress system - no legacy progress update needed
        console.log(`🔄 ROI lesson ${lessonId} completed for ${moduleId} - handled by component's atomic system`)
      } else {
        // Handle legacy module ID format (adv1_mod1)
        const adventureId = parseInt(moduleId.split('_')[0].replace('adv', ''))
        const modId = parseInt(moduleId.split('_')[1].replace('mod', ''))

        // Update progress for completed lesson
        updateModuleProgress(adventureId, modId, {
          lessonsCompleted: [lessonId],
          isCompleted: false // Only complete when quiz is passed
        })
      }
    }

    // Navigate to next step - EXACT SwiftUI navigation pattern
    if (currentStep === 'lesson1') {
      setCurrentStep('lesson2')
    } else if (currentStep === 'lesson2') {
      setCurrentStep('quiz')
    }
  }

  // Back navigation handler - navigate backward through steps
  const handleGoBack = () => {
    
    if (currentStep === 'quiz') {
      setCurrentStep('lesson2')
    } else if (currentStep === 'lesson2') {
      setCurrentStep('lesson1')
    }
    // lesson1 should use onDismiss to exit module completely
  }

  // Modal dismiss handler - EXACT SwiftUI behavior
  const handleModalDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setCurrentStep('lesson1') // Reset for next time
    onDismiss()
  }

  // Get the appropriate component based on module and step
  const renderCurrentComponent = () => {
    if (!moduleId) return null

    const [adventure, module] = extractAdventureAndModule(moduleId)
    
    // Adventure 1, Module 1 - Damascus: The New Capital
    if (adventure === 1 && module === 1) {
      switch (currentStep) {
        case 'lesson1':
          return (
            <Adventure1_Module1_Lesson1 
              onContinue={() => handleLessonComplete('lesson1')}
              onDismiss={handleModalDismiss}
            />
          )
        case 'lesson2':
          return (
            <Adventure1_Module1_Lesson2 
              onContinue={() => handleLessonComplete('lesson2')}
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
        case 'quiz':
          return (
            <Adventure1_Module1_Quiz 
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
      }
    }

    // Adventure 1, Module 2 - Damascus: The New Capital - Development & Expansion  
    if (adventure === 1 && module === 2) {
      switch (currentStep) {
        case 'lesson1':
          return (
            <Adventure1_Module2_Lesson2 
              onContinue={() => handleLessonComplete('lesson1')}
              onDismiss={handleModalDismiss}
            />
          )
        case 'lesson2':
          return (
            <Adventure1_Module2_Lesson1 
              onContinue={() => handleLessonComplete('lesson2')}
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
        case 'quiz':
          return (
            <Adventure1_Module2_Quiz 
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
      }
    }

    // Adventure 1, Module 3 - Damascus: The New Capital - Trade & Exchange
    if (adventure === 1 && module === 3) {
      switch (currentStep) {
        case 'lesson1':
          return (
            <Adventure1_Module3_Lesson1 
              onContinue={() => handleLessonComplete('lesson1')}
              onDismiss={handleModalDismiss}
            />
          )
        case 'lesson2':
          return (
            <Adventure1_Module3_Lesson2 
              onContinue={() => handleLessonComplete('lesson2')}
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
        case 'quiz':
          return (
            <Adventure1_Module3_Quiz 
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
      }
    }

    // Adventure 2, Module 1 - Abd al-Malik's Reforms
    if (adventure === 2 && module === 1) {
      switch (currentStep) {
        case 'lesson1':
          return (
            <Adventure2_Module1_Lesson1 
              onContinue={() => handleLessonComplete('lesson1')}
              onDismiss={handleModalDismiss}
            />
          )
        case 'lesson2':
          return (
            <Adventure2_Module1_Lesson2 
              onContinue={() => handleLessonComplete('lesson2')}
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
        case 'quiz':
          return (
            <Adventure2_Module1_Quiz 
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
      }
    }

    // Adventure 2, Module 2 - Abd al-Malik's Reforms - Monetary System
    if (adventure === 2 && module === 2) {
      switch (currentStep) {
        case 'lesson1':
          return (
            <Adventure2_Module2_Lesson1 
              onContinue={() => handleLessonComplete('lesson1')}
              onDismiss={handleModalDismiss}
            />
          )
        case 'lesson2':
          return (
            <Adventure2_Module2_Lesson2 
              onContinue={() => handleLessonComplete('lesson2')}
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
        case 'quiz':
          return (
            <Adventure2_Module2_Quiz 
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
      }
    }

    // Adventure 2, Module 3 - Abd al-Malik's Reforms - Final Module
    if (adventure === 2 && module === 3) {
      switch (currentStep) {
        case 'lesson1':
          return (
            <Adventure2_Module3_Lesson1 
              onContinue={() => handleLessonComplete('lesson1')}
              onDismiss={handleModalDismiss}
            />
          )
        case 'lesson2':
          return (
            <Adventure2_Module3_Lesson2 
              onContinue={() => handleLessonComplete('lesson2')}
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
        case 'quiz':
          return (
            <Adventure2_Module3_Quiz 
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
      }
    }

    // Adventure 3, Module 1 - Westward Expansion - Kairouan Foundation
    if (adventure === 3 && module === 1) {
      switch (currentStep) {
        case 'lesson1':
          return (
            <Adventure3_Module1_Lesson1 
              onContinue={() => handleLessonComplete('lesson1')}
              onDismiss={handleModalDismiss}
            />
          )
        case 'lesson2':
          return (
            <Adventure3_Module1_Lesson2 
              onContinue={() => handleLessonComplete('lesson2')}
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
        case 'quiz':
          return (
            <Adventure3_Module1_Quiz 
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
      }
    }

    // Adventure 3, Module 2 - Westward Expansion - Ṭarīq's Conquest
    if (adventure === 3 && module === 2) {
      switch (currentStep) {
        case 'lesson1':
          return (
            <Adventure3_Module2_Lesson1 
              onContinue={() => handleLessonComplete('lesson1')}
              onDismiss={handleModalDismiss}
            />
          )
        case 'lesson2':
          return (
            <Adventure3_Module2_Lesson2 
              onContinue={() => handleLessonComplete('lesson2')}
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
        case 'quiz':
          return (
            <Adventure3_Module2_Quiz 
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
      }
    }

    // Adventure 3, Module 3 - Westward Expansion - Battle of Tours & Frontiers
    if (adventure === 3 && module === 3) {
      switch (currentStep) {
        case 'lesson1':
          return (
            <Adventure3_Module3_Lesson1 
              onContinue={() => handleLessonComplete('lesson1')}
              onDismiss={handleModalDismiss}
            />
          )
        case 'lesson2':
          return (
            <Adventure3_Module3_Lesson2 
              onContinue={() => handleLessonComplete('lesson2')}
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
        case 'quiz':
          return (
            <Adventure3_Module3_Quiz 
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
      }
    }

    // Adventure 4, Module 1 - Great Mosque of Damascus - Byzantine Mosaics
    if (adventure === 4 && module === 1) {
      switch (currentStep) {
        case 'lesson1':
          return (
            <Adventure4_Module1_Lesson2
              onContinue={() => handleLessonComplete('lesson1')}
              onDismiss={handleModalDismiss}
            />
          )
        case 'lesson2':
          return (
            <Adventure4_Module1_Lesson1
              onContinue={() => handleLessonComplete('lesson2')}
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
        case 'quiz':
          return (
            <Adventure4_Module1_Quiz
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
      }
    }

    // Adventure 4, Module 2 - Great Mosque of Damascus - Desert Palaces
    if (adventure === 4 && module === 2) {
      switch (currentStep) {
        case 'lesson1':
          return (
            <Adventure4_Module2_Lesson1
              onContinue={() => handleLessonComplete('lesson1')}
              onDismiss={handleModalDismiss}
            />
          )
        case 'lesson2':
          return (
            <Adventure4_Module2_Lesson2
              onContinue={() => handleLessonComplete('lesson2')}
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
        case 'quiz':
          return (
            <Adventure4_Module2_Quiz
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
      }
    }

    // Adventure 4, Module 3 - Great Mosque of Damascus - Advanced Architecture
    if (adventure === 4 && module === 3) {
      switch (currentStep) {
        case 'lesson1':
          return (
            <Adventure4_Module3_Lesson1
              onContinue={() => handleLessonComplete('lesson1')}
              onDismiss={handleModalDismiss}
            />
          )
        case 'lesson2':
          return (
            <Adventure4_Module3_Lesson2
              onContinue={() => handleLessonComplete('lesson2')}
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
        case 'quiz':
          return (
            <Adventure4_Module3_Quiz
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
      }
    }

    // Adventure 5, Module 1 - Yazīd II's Reign - Cultural Achievements
    if (adventure === 5 && module === 1) {
      switch (currentStep) {
        case 'lesson1':
          return (
            <Adventure5_Module1_Lesson1
              onContinue={() => handleLessonComplete('lesson1')}
              onDismiss={handleModalDismiss}
            />
          )
        case 'lesson2':
          return (
            <Adventure5_Module1_Lesson2
              onContinue={() => handleLessonComplete('lesson2')}
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
        case 'quiz':
          return (
            <Adventure5_Module1_Quiz
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
      }
    }

    // Adventure 5, Module 2 - The Abbasid Revolution - Propaganda and Rebellion Tactics
    if (adventure === 5 && module === 2) {
      switch (currentStep) {
        case 'lesson1':
          return (
            <Adventure5_Module2_Lesson1
              onContinue={() => handleLessonComplete('lesson1')}
              onDismiss={handleModalDismiss}
            />
          )
        case 'lesson2':
          return (
            <Adventure5_Module2_Lesson2
              onContinue={() => handleLessonComplete('lesson2')}
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
        case 'quiz':
          return (
            <Adventure5_Module2_Quiz
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
      }
    }

    // Adventure 5, Module 3 - Revolution & New Order - Abbasid Takeover and Baghdad Foundation
    if (adventure === 5 && module === 3) {
      switch (currentStep) {
        case 'lesson1':
          return (
            <Adventure5_Module3_Lesson1
              onContinue={() => handleLessonComplete('lesson1')}
              onDismiss={handleModalDismiss}
            />
          )
        case 'lesson2':
          return (
            <Adventure5_Module3_Lesson2
              onContinue={() => handleLessonComplete('lesson2')}
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
        case 'quiz':
          return (
            <Adventure5_Module3_Quiz
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
      }
    }

    // ROI content now handled by ROIModuleModal.tsx - no Adventure 6 routing needed

    // Fallback for unimplemented modules
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackText}>Module not available</Text>
      </View>
    )
  }

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => {
        // Only allow dismissal from lesson1
        if (currentStep === 'lesson1') {
          onDismiss()
        }
      }}
    >
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#F4EBDB" translucent={true} />
        <View style={styles.container}>
          {renderCurrentComponent()}
        </View>
      </SafeAreaProvider>
    </Modal>
  )
}

// Utility function to extract adventure and module numbers - EXACT SwiftUI logic + ROI support
function extractAdventureAndModule(moduleId: string): [number, number] {
  let adventure = 1
  let module = 1

  // ROI modules now handled by ROIModuleModal.tsx - no parsing needed here
  // Handle Umayyad Dynasty adventure number format (adv1_mod1, etc.)
  if (moduleId.includes('adv1')) {
    adventure = 1
  } else if (moduleId.includes('adv2')) {
    adventure = 2
  } else if (moduleId.includes('adv3')) {
    adventure = 3
  } else if (moduleId.includes('adv4')) {
    adventure = 4
  } else if (moduleId.includes('adv5')) {
    adventure = 5
  } else if (moduleId.includes('adv6')) {
    adventure = 6
  }

  // Handle module number
  if (moduleId.includes('mod1')) {
    module = 1
  } else if (moduleId.includes('mod2')) {
    module = 2
  } else if (moduleId.includes('mod3')) {
    module = 3
  }

  return [adventure, module]
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black', // Full-screen black background like SwiftUI
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  fallbackText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'DM Sans',
  },
})