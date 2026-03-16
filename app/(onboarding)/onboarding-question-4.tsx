// OnboardingQuestion4Screen - Fourth questionnaire screen
// "Why are you learning about Middle Eastern history?" - Multi-select

import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import ArchivesTheme from '@/constants/ArchivesTheme'
import OnboardingQuestionLayout from '@/components/onboarding/OnboardingQuestionLayout'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useOnboardingTapSound } from '@/hooks/useOnboardingTapSound'
import { MCQOptionButton } from '@/components/modules/QuizSystem'
import { analyticsService } from '@/services/AnalyticsService'
import AppLogger from '@/services/AppLogger'
import Svg, { Path } from 'react-native-svg'

const questionOptions = [
  "Just for fun",
  "Connect with heritage",
  "Teach my children",
  "Spend time productively",
  "Other"
]

export default function OnboardingQuestion4Screen() {
  const [selectedOptions, setSelectedOptions] = useState<number[]>([])
  const [screenStartTime] = useState(Date.now())
  const router = useRouter()
  const { trackScreenView } = useAnalytics()
  const { playTap } = useOnboardingTapSound()

  // Use ref to avoid re-running useEffect when exit action changes
  const exitActionRef = useRef<'back_button' | 'continued' | 'app_closed'>('app_closed')

  AppLogger.info('navigation', 'OnboardingQ4 initializing')

  // Track screen view when component mounts
  useEffect(() => {
    trackScreenView('Onboarding Question 4')

    // Track screen exit on unmount only (use ref to avoid duplicate cleanup calls)
    return () => {
      const duration_seconds = Math.floor((Date.now() - screenStartTime) / 1000)
      analyticsService.trackOnboardingScreenExited({
        screen: 'onboarding_question_4',
        exit_action: exitActionRef.current,
        duration_seconds,
      })
    }
  }, [trackScreenView, screenStartTime])

  // Handle option selection (multi-select, UI only - tracking happens on Continue)
  const handleOptionSelect = async (optionIndex: number) => {
    try {
      playTap()
      await Haptics.selectionAsync()

      setSelectedOptions(prev => {
        if (prev.includes(optionIndex)) {
          // Remove if already selected
          const newSelection = prev.filter(index => index !== optionIndex)
          return newSelection
        } else {
          // Add if not selected
          const newSelection = [...prev, optionIndex]
          return newSelection
        }
      })
    } catch (error) {
      AppLogger.error('navigation', 'OnboardingQ4 option select error', {}, error)
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

      // Track final answer (only track once on Continue with all selected options)
      const selectedAnswers = selectedOptions.map(index => questionOptions[index])
      analyticsService.trackOnboardingQuestionAnswered({
        screen: 'onboarding_question_4',
        question_number: 4,
        question_text: "Why are you learning about Middle Eastern history?",
        answer: selectedAnswers,
      })

      // Save answer to storage
      const answerData = {
        question: "Why are you learning about Islamic history?",
        answers: selectedAnswers,
        optionIndices: selectedOptions
      }

      await AsyncStorage.setItem('onboarding_q4_answer', JSON.stringify(answerData))
      AppLogger.info('navigation', 'OnboardingQ4 answer saved')

      // Mark onboarding as completed
      await AsyncStorage.setItem('onboarding_completed', 'true')
      AppLogger.info('navigation', 'Onboarding completed - all questions answered')

      // Navigate to results screen
      exitActionRef.current = 'continued'
      router.push('/onboarding-results')
    } catch (error) {
      AppLogger.error('navigation', 'OnboardingQ4 handleContinue error', {}, error)
      // Navigate anyway
      await AsyncStorage.setItem('onboarding_completed', 'true')
      exitActionRef.current = 'continued'
      router.push('/onboarding-results')
    }
  }

  return (
    <OnboardingQuestionLayout activeStep={4} screenName="onboarding_question_4">
      <View style={styles.content}>
        {/* Camel Mascot with Speech Bubble */}
        <View style={styles.mascotSection}>
          {/* Camel on Left */}
          <Image
            source={require('@/assets/images/ai-images/hellocharacter.png')}
            style={styles.camelMascot}
            resizeMode="contain"
          />

          {/* Speech Bubble on Right */}
          <View style={styles.speechBubble}>
            <Text style={styles.mainQuestion} selectable={false}>
              Why are you{'\n'}learning about{'\n'}Islamic{'\n'}history?
            </Text>

            {/* Speech bubble tail - SVG arrow */}
            <View style={styles.speechTail}>
              <Svg width="15" height="20" viewBox="0 0 15 20" style={{ position: 'absolute' }}>
                {/* White filled triangle (no stroke) */}
                <Path
                  d="M0 10 L15 0 L15 20 Z"
                  fill="white"
                />

                {/* Green line on top diagonal edge */}
                <Path
                  d="M0 10 L15 0"
                  stroke={ArchivesTheme.colors.mossGreen}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />

                {/* Green line on bottom diagonal edge */}
                <Path
                  d="M0 10 L15 20"
                  stroke={ArchivesTheme.colors.mossGreen}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />

                {/* White line on vertical base - blends with background */}
                <Path
                  d="M15 0 L15 20"
                  stroke="white"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </Svg>
            </View>
          </View>
        </View>

        {/* Multi-select instruction */}
        <Text style={styles.instructionText} selectable={false}>
          Pick as many as you like
        </Text>

        {/* Options List */}
        <ScrollView
          style={styles.optionsScrollView}
          contentContainerStyle={styles.optionsContainer}
          showsVerticalScrollIndicator={false}
        >
          {questionOptions.map((option, index) => (
            <MCQOptionButton
              key={index}
              letter={String.fromCharCode(65 + index)} // A, B, C, D, E
              text={option}
              isSelected={selectedOptions.includes(index)}
              onPress={() => handleOptionSelect(index)}
            />
          ))}
        </ScrollView>

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
    </OnboardingQuestionLayout>
  )
}

const styles = StyleSheet.create({
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
    width: 135,
    height: 135,
    marginRight: 3,
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
    left: -14.5,
    top: '50%',
    marginTop: -10,
    width: 15,
    height: 20,
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
  optionsScrollView: {
    flex: 1,
  },
  optionsContainer: {
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