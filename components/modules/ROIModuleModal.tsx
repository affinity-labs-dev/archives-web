// ROIModuleModal.tsx - Rise of Islam Era Module Modal System
// Clean, dedicated modal for ROI era content without routing conflicts

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Modal,
  BackHandler,
  Platform,
} from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useProgress } from '@/context/ProgressContext'
import * as Haptics from 'expo-haptics'
import * as NavigationBar from 'expo-navigation-bar'

// Import ROI lesson and quiz components
import ROIERA2Adv1_Module1_Lesson1 from './roiera2/ROIERA2Adv1_Module1_Lesson1'
import ROIERA2Adv1_Module1_Lesson2 from './roiera2/ROIERA2Adv1_Module1_Lesson2'
import ROIERA2Adv1_Module1_Quiz from './roiera2/ROIERA2Adv1_Module1_Quiz'
import ROIERA2Adv1_Module2_Lesson1 from './roiera2/ROIERA2Adv1_Module2_Lesson1'
import ROIERA2Adv1_Module2_Lesson2 from './roiera2/ROIERA2Adv1_Module2_Lesson2'
import ROIERA2Adv1_Module2_Quiz from './roiera2/ROIERA2Adv1_Module2_Quiz'

interface ROIModuleModalProps {
  isVisible: boolean
  moduleId: string | null // e.g., "ROI_Adv1_M1"
  onDismiss: () => void
}

export default function ROIModuleModal({ isVisible, moduleId, onDismiss }: ROIModuleModalProps) {
  const [currentStep, setCurrentStep] = useState<'lesson1' | 'lesson2' | 'quiz'>('lesson1')
  const { roiAtomicProgressUpdate } = useProgress() // Use ROI atomic progress system

  // Reset to lesson1 when modal opens with new module
  useEffect(() => {
    if (isVisible && moduleId) {
      setCurrentStep('lesson1')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
  }, [isVisible, moduleId])

  // Set navigation bar color when modal opens (Android)
  useEffect(() => {
    if (Platform.OS === 'android' && isVisible) {
      NavigationBar.setBackgroundColorAsync('#F4EBDB')
    }
  }, [isVisible])

  // Handle Android back button - prevent dismissal during lessons
  useEffect(() => {
    if (isVisible) {
      const backAction = () => {
        // Only allow dismissal from lesson1
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

  // Navigation handlers - ROI-specific flow
  const handleLessonComplete = (lessonId: string) => {
    console.log(`🔄 ROI lesson ${lessonId} completed for ${moduleId}`)

    // Navigate to next step
    if (currentStep === 'lesson1') {
      setCurrentStep('lesson2')
    } else if (currentStep === 'lesson2') {
      setCurrentStep('quiz')
    }
  }

  // Back navigation handler
  const handleGoBack = () => {
    if (currentStep === 'quiz') {
      setCurrentStep('lesson2')
    } else if (currentStep === 'lesson2') {
      setCurrentStep('lesson1')
    }
  }

  // Modal dismiss handler
  const handleModalDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setCurrentStep('lesson1') // Reset for next time
    onDismiss()
  }

  // Parse ROI module ID - clean, simple parsing
  const parseROIModule = (moduleId: string): [number, number] => {
    const match = moduleId?.match(/ROI_Adv(\d+)_M(\d+)$/)
    if (match) {
      return [parseInt(match[1]), parseInt(match[2])]
    }
    return [1, 1] // Default fallback
  }

  // Get the appropriate component based on module and step
  const renderCurrentComponent = () => {
    if (!moduleId) return null

    const [adventure, module] = parseROIModule(moduleId)

    // ROI Adventure 1, Module 1 - Meccan Life & Tribal Culture
    if (adventure === 1 && module === 1) {
      switch (currentStep) {
        case 'lesson1':
          return (
            <ROIERA2Adv1_Module1_Lesson1
              onContinue={() => handleLessonComplete('lesson1')}
              onDismiss={handleModalDismiss}
            />
          )
        case 'lesson2':
          return (
            <ROIERA2Adv1_Module1_Lesson2
              onContinue={() => handleLessonComplete('lesson2')}
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
        case 'quiz':
          return (
            <ROIERA2Adv1_Module1_Quiz
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
      }
    }

    // ROI Adventure 1, Module 2 - The Problem of Injustice
    if (adventure === 1 && module === 2) {
      switch (currentStep) {
        case 'lesson1':
          return (
            <ROIERA2Adv1_Module2_Lesson1
              onContinue={() => handleLessonComplete('lesson1')}
              onDismiss={handleModalDismiss}
            />
          )
        case 'lesson2':
          return (
            <ROIERA2Adv1_Module2_Lesson2
              onContinue={() => handleLessonComplete('lesson2')}
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
        case 'quiz':
          return (
            <ROIERA2Adv1_Module2_Quiz
              onDismiss={handleModalDismiss}
              onBack={handleGoBack}
            />
          )
      }
    }

    // Fallback for unimplemented ROI modules
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackText}>ROI Module not available</Text>
        <Text style={styles.fallbackSubtext}>Module ID: {moduleId}</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black', // Full-screen black background
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
    paddingHorizontal: 20,
  },
  fallbackText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'DM Sans',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  fallbackSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontFamily: 'DM Sans',
    textAlign: 'center',
  },
})