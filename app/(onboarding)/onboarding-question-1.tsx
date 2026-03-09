// OnboardingQuestion1Screen - First questionnaire screen
// "How much Middle Eastern history do you already know?"

import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import ArchivesTheme from '@/constants/ArchivesTheme'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useOnboardingTapSound } from '@/hooks/useOnboardingTapSound'
import { MCQOptionButton } from '@/components/modules/QuizSystem'
import { analyticsService } from '@/services/AnalyticsService'
import AppLogger from '@/services/AppLogger'
import Svg, { Path } from 'react-native-svg'

const questionOptions = [
  "I'm brand new",
  "I can explain basics",
  "I know key events",
  "I know quite a lot",
  "I'm very advanced"
]

export default function OnboardingQuestion1Screen() {
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [screenStartTime] = useState(Date.now())
  const router = useRouter()
  const { trackScreenView } = useAnalytics()
  const { playTap } = useOnboardingTapSound()

  // Use ref to avoid re-running useEffect when exit action changes
  const exitActionRef = useRef<'back_button' | 'continued' | 'app_closed'>('app_closed')

  AppLogger.info('navigation', 'OnboardingQ1 initializing')

  // Track screen view when component mounts
  useEffect(() => {
    trackScreenView('Onboarding Question 1')

    // Track screen exit on unmount only (use ref to avoid duplicate cleanup calls)
    return () => {
      const duration_seconds = Math.floor((Date.now() - screenStartTime) / 1000)
      analyticsService.trackOnboardingScreenExited({
        screen: 'onboarding_question_1',
        exit_action: exitActionRef.current,
        duration_seconds,
      })
    }
  }, [trackScreenView, screenStartTime])

  // Handle option selection (UI only - tracking happens on Continue)
  const handleOptionSelect = async (optionIndex: number) => {
    try {
      playTap()
      await Haptics.selectionAsync()
      setSelectedOption(optionIndex)
      AppLogger.info('navigation', 'OnboardingQ1 selected option', { option: questionOptions[optionIndex] })
    } catch (error) {
      AppLogger.error('navigation', 'OnboardingQ1 option select error', {}, error)
      setSelectedOption(optionIndex)
    }
  }

  // Continue to next question
  const handleContinue = async () => {
    if (selectedOption === null) return

    try {
      await Haptics.impactAsync()

      // Track final answer (only track once on Continue, not on every selection)
      analyticsService.trackOnboardingQuestionAnswered({
        screen: 'onboarding_question_1',
        question_number: 1,
        question_text: "How much Middle Eastern history do you already know?",
        answer: questionOptions[selectedOption],
        answer_index: selectedOption,
      })

      // Save answer to storage
      const answerData = {
        question: "How much Islamic history do you already know?",
        answer: questionOptions[selectedOption],
        optionIndex: selectedOption
      }

      await AsyncStorage.setItem('onboarding_q1_answer', JSON.stringify(answerData))
      AppLogger.info('navigation', 'OnboardingQ1 answer saved', { answer: answerData.answer })

      // Navigate to next question
      exitActionRef.current = 'continued'
      router.push('/onboarding-question-2')
    } catch (error) {
      AppLogger.error('navigation', 'OnboardingQ1 error saving answer', {}, error)
      // Continue anyway
      exitActionRef.current = 'continued'
      router.push('/onboarding-question-2')
    }
  }


  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={ArchivesTheme.colors.creamWhite}
        translucent
      />
      <SafeAreaView style={[styles.container, { paddingTop: Platform.OS === 'android' ? 10 : 0 }]}>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressSegments}>
            {[1, 2, 3, 4].map((step) => (
              <View
                key={step}
                style={[
                  styles.progressSegment,
                  step === 1 && styles.progressSegmentActive
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
              source={require('@/assets/images/ai-images/hellocharacter.png')}
              style={styles.camelMascot}
              resizeMode="contain"
            />

            {/* Speech Bubble on Right */}
            <View style={styles.speechBubble}>
              <Text style={styles.mainQuestion} selectable={false}>
                How much Islamic{'\n'}history do you{'\n'}already know?
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
                isSelected={selectedOption === index}
                onPress={() => handleOptionSelect(index)}
              />
            ))}
          </ScrollView>

          {/* Continue Button */}
          <View style={styles.continueContainer}>
            <TouchableOpacity
              style={[
                styles.continueButton,
                selectedOption === null && styles.continueButtonDisabled
              ]}
              onPress={handleContinue}
              disabled={selectedOption === null}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.continueText,
                selectedOption === null && styles.continueTextDisabled
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

  // Progress Bar
  progressContainer: {
    paddingHorizontal: 0,
    paddingTop: 20,
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
    marginBottom: 30,
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
  questionText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '500',
    color: ArchivesTheme.colors.shoeBrown,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
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

  // Options
  optionsScrollView: {
    flex: 1,
  },
  optionsContainer: {
    paddingVertical: 20,
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