// OnboardingWelcomeScreen - Third screen in onboarding flow
// Shows welcome message with camel image and continues to questionnaire

import ArchivesTheme from '@/constants/ArchivesTheme'
import { useAnalytics } from '@/hooks/useAnalytics'
import { analyticsService } from '@/services/AnalyticsService'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'

export default function OnboardingWelcomeScreen() {
  const router = useRouter()
  const { trackScreenView } = useAnalytics()
  const [screenStartTime] = useState(Date.now())
  const [exitAction, setExitAction] = useState<'back_button' | 'continued' | 'app_closed'>('app_closed')

  console.log('📱 [OnboardingWelcome] Component initializing...')

  // Track screen view when component mounts
  useEffect(() => {
    trackScreenView('Onboarding Welcome')

    // Track screen exit on unmount
    return () => {
      const duration_seconds = Math.floor((Date.now() - screenStartTime) / 1000)
      analyticsService.trackOnboardingScreenExited({
        screen: 'onboarding_welcome',
        exit_action: exitAction,
        duration_seconds,
      })
    }
  }, [trackScreenView, screenStartTime, exitAction])

  // Continue to first question
  const handleContinue = async () => {
    try {
      // Add haptic feedback
      if (Platform.OS === 'ios') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      }
      console.log('📱 [OnboardingWelcome] Continuing to first question')
      setExitAction('continued')
      router.replace('/onboarding-question-1')
    } catch (error) {
      console.error('📱 [OnboardingWelcome] Error navigating:', error)
      setExitAction('continued')
      router.replace('/onboarding-question-1')
    }
  }

  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={ArchivesTheme.colors.creamWhite}
        translucent={false}
      />
      <SafeAreaView style={[styles.container, { paddingTop: Platform.OS === 'android' ? 10 : 0 }]}>
        <View style={styles.content}>
          {/* Speech Bubble */}
          <View style={styles.speechBubble}>
            <Text style={styles.welcomeText} selectable={false}>
              <Text style={styles.boldText}>Just 4 quick</Text> questions to personalize your experience
            </Text>
            {/* Speech bubble pointer with border - SVG arrow */}
            <View style={styles.speechPointer}>
              <Svg width="36" height="18" viewBox="0 0 36 18" style={{ position: 'absolute' }}>
                {/* White filled triangle (no stroke) */}
                <Path
                  d="M18 18 L0 0 L36 0 Z"
                  fill="white"
                />

                {/* Green line on left diagonal edge */}
                <Path
                  d="M18 18 L0 0"
                  stroke={ArchivesTheme.colors.mossGreen}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />

                {/* Green line on right diagonal edge */}
                <Path
                  d="M18 18 L36 0"
                  stroke={ArchivesTheme.colors.mossGreen}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />

                {/* White line on horizontal base (top) - blends with background */}
                <Path
                  d="M0 0 L36 0"
                  stroke="white"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </Svg>
            </View>
          </View>

          {/* Camel Image */}
          <View style={styles.imageContainer}>
            <Image
              source={require('@/assets/images/ai-images/hellocharacter.png')}
              style={styles.camelImage}
              resizeMode="contain"
            />
          </View>

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Continue Button */}
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText} selectable={false}>
              CONTINUE
            </Text>
          </TouchableOpacity>
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
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 120,
    paddingBottom: 60,
  },
  speechBubble: {
    backgroundColor: 'white',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: ArchivesTheme.colors.mossGreen,
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: -25,
    width: 247,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  speechPointer: {
    position: 'absolute',
    bottom: -17.5,
    right: 60,
    width: 36,
    height: 18,
  },
  welcomeText: {
    fontFamily: 'DM Sans',
    fontSize: 20,
    fontWeight: '400',
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'center',
    lineHeight: 26,
  },
  boldText: {
    fontWeight: '600',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 30,
  },
  camelImage: {
    width: 158,
    height: 229,
  },
  spacer: {
    height: 40,
  },
  continueButton: {
    backgroundColor: ArchivesTheme.colors.mossGreen,
    borderRadius: 27,
    width: 345,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonText: {
    fontFamily: 'DM Sans',
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
})