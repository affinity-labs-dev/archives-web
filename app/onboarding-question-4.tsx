// OnboardingQuestion4Screen - Fourth questionnaire screen
// "Why are you learning about Middle Eastern history?" - Multi-select

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import ArchivesTheme from '@/constants/ArchivesTheme'
import { useAnalytics } from '@/hooks/useAnalytics'
import { MCQOptionButton } from '@/components/modules/QuizSystem'

const questionOptions = [
  "Just for fun",
  "Connect with heritage",
  "Teach my children",
  "Spend time productively",
  "Other"
]

export default function OnboardingQuestion4Screen() {
  const [selectedOptions, setSelectedOptions] = useState<number[]>([])
  const router = useRouter()
  const { trackScreenView } = useAnalytics()

  console.log('🔥 [OnboardingQ4] Component initializing...')

  // Track screen view when component mounts
  useEffect(() => {
    trackScreenView('Onboarding Question 4')
  }, [trackScreenView])

  // Handle option selection (multi-select)
  const handleOptionSelect = async (optionIndex: number) => {
    try {
      await Haptics.selectionAsync()

      setSelectedOptions(prev => {
        if (prev.includes(optionIndex)) {
          // Remove if already selected
          const newSelection = prev.filter(index => index !== optionIndex)
          console.log('🔥 [OnboardingQ4] Deselected option:', questionOptions[optionIndex])
          return newSelection
        } else {
          // Add if not selected
          const newSelection = [...prev, optionIndex]
          console.log('🔥 [OnboardingQ4] Selected option:', questionOptions[optionIndex])
          return newSelection
        }
      })
    } catch (error) {
      console.error('🔥 [OnboardingQ4] Error selecting option:', error)
      // Still update selection even if haptic fails
      setSelectedOptions(prev => {
        if (prev.includes(optionIndex)) {
          return prev.filter(index => index !== optionIndex)
        } else {
          return [...prev, optionIndex]
        }
      })
    }
  }

  // Continue to results screen
  const handleContinue = async () => {
    if (selectedOptions.length === 0) return

    try {
      await Haptics.impactAsync()

      // Save answer to storage
      const selectedAnswers = selectedOptions.map(index => questionOptions[index])
      const answerData = {
        question: "Why are you learning about Middle Eastern history?",
        answers: selectedAnswers,
        optionIndices: selectedOptions
      }

      await AsyncStorage.setItem('onboarding_q4_answer', JSON.stringify(answerData))
      console.log('🔥 [OnboardingQ4] Answer saved:', answerData)

      // Mark onboarding as completed
      await AsyncStorage.setItem('onboarding_completed', 'true')
      console.log('🔥 [OnboardingQ4] Onboarding completed!')

      // Navigate to results screen
      router.push('/onboarding-results')
    } catch (error) {
      console.error('🔥 [OnboardingQ4] Error in handleContinue:', error)
      // Navigate anyway
      await AsyncStorage.setItem('onboarding_completed', 'true')
      router.push('/onboarding-results')
    }
  }

  // Go back to previous question
  const handleBack = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      router.back()
    } catch (error) {
      console.error('🔥 [OnboardingQ4] Error going back:', error)
      router.back()
    }
  }

  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={ArchivesTheme.colors.creamWhite}
        translucent={true}
      />
      <SafeAreaView style={[styles.container, { paddingTop: Platform.OS === 'android' ? 10 : 0 }]}>
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={ArchivesTheme.colors.shoeBrown} />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressSegments}>
            {[1, 2, 3, 4].map((step) => (
              <View
                key={step}
                style={[
                  styles.progressSegment,
                  styles.progressSegmentActive // All segments active for final question
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.content}>
          {/* Camel Mascot with Speech Bubble */}
          <View style={styles.mascotSection}>
            {/* Camel on Left */}
            <Image
              source={require('@/assets/images/quiz-images/Camel.png')}
              style={styles.camelMascot}
              resizeMode="contain"
            />

            {/* Speech Bubble on Right */}
            <View style={styles.speechBubble}>
              <Text style={styles.mainQuestion} selectable={false}>
                Why are you{'\n'}learning about{'\n'}Middle Eastern{'\n'}history?
              </Text>

              {/* Speech bubble tail */}
              <View style={styles.speechTail} />
              <View style={styles.speechTailInner} />
            </View>
          </View>

          {/* Multi-select instruction */}
          <Text style={styles.instructionText} selectable={false}>
            Pick as many as you like
          </Text>

          {/* Options List */}
          <View style={styles.optionsContainer}>
            {questionOptions.map((option, index) => (
              <MCQOptionButton
                key={index}
                letter={String.fromCharCode(65 + index)} // A, B, C, D, E
                text={option}
                isSelected={selectedOptions.includes(index)}
                onPress={() => handleOptionSelect(index)}
              />
            ))}
          </View>

          {/* Continue Button */}
          <View style={styles.continueContainer}>
            <TouchableOpacity
              style={[
                styles.continueButton,
                selectedOptions.length === 0 && styles.continueButtonDisabled
              ]}
              onPress={handleContinue}
              disabled={selectedOptions.length === 0}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.continueText,
                selectedOptions.length === 0 && styles.continueTextDisabled
              ]} selectable={false}>
                CONTINUE
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 10,
    paddingHorizontal: 20,
  },

  // Back Button
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139,96,64,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Progress Bar
  progressContainer: {
    paddingHorizontal: 0,
    paddingTop: 10,
    paddingBottom: 20,
  },
  progressSegments: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressSegment: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(139,96,64,0.2)',
    borderRadius: 2,
    marginHorizontal: 2,
  },
  progressSegmentActive: {
    backgroundColor: ArchivesTheme.colors.persianOrange,
  },

  content: {
    flex: 1,
    paddingHorizontal: 10,
  },

  // Mascot Section
  mascotSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 20,
    marginBottom: 20,
    paddingLeft: 10,
    paddingRight: 10,
  },
  camelMascot: {
    width: 100,
    height: 100,
    marginRight: 20,
  },

  // Speech Bubble
  speechBubble: {
    width: 200,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: ArchivesTheme.colors.mossGreen,
    paddingHorizontal: 16,
    paddingVertical: 14,
    position: 'relative',
    shadowColor: 'black',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  mainQuestion: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'left',
    lineHeight: 24,
    flexWrap: 'wrap',
  },
  speechTail: {
    position: 'absolute',
    left: -15,
    top: '50%',
    marginTop: -10,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 10,
    borderRightWidth: 15,
    borderBottomWidth: 10,
    borderLeftWidth: 0,
    borderTopColor: 'transparent',
    borderRightColor: ArchivesTheme.colors.mossGreen,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  speechTailInner: {
    position: 'absolute',
    left: -12,
    top: '50%',
    marginTop: -8,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 8,
    borderRightWidth: 12,
    borderBottomWidth: 8,
    borderLeftWidth: 0,
    borderTopColor: 'transparent',
    borderRightColor: 'white',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },

  // Multi-select instruction
  instructionText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '400',
    color: ArchivesTheme.colors.shoeBrown,
    textAlign: 'left',
    marginBottom: 20,
    opacity: 0.7,
    paddingLeft: 35,
  },

  // Options
  optionsContainer: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },

  // Continue Button
  continueContainer: {
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  continueButton: {
    width: 345,
    height: 48,
    backgroundColor: ArchivesTheme.colors.mossGreen,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    shadowColor: 'black',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  continueButtonDisabled: {
    backgroundColor: ArchivesTheme.colors.shoeBrown + '40',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueText: {
    fontFamily: 'DM Sans',
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  continueTextDisabled: {
    color: 'rgba(255,255,255,0.6)',
  },
})