// OnboardingWelcomeScreen - Third screen in onboarding flow
// Shows welcome message with camel image and continues to questionnaire

import ArchivesTheme from '@/constants/ArchivesTheme'
import { useAnalytics } from '@/hooks/useAnalytics'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import React, { useEffect } from 'react'
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

export default function OnboardingWelcomeScreen() {
  const router = useRouter()
  const { trackScreenView } = useAnalytics()

  console.log('📱 [OnboardingWelcome] Component initializing...')

  // Track screen view when component mounts
  useEffect(() => {
    trackScreenView('Onboarding Welcome')
  }, [trackScreenView])

  // Continue to first question
  const handleContinue = async () => {
    try {
      // Add haptic feedback
      if (Platform.OS === 'ios') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      }
      console.log('📱 [OnboardingWelcome] Continuing to first question')
      router.replace('/onboarding-question-1')
    } catch (error) {
      console.error('📱 [OnboardingWelcome] Error navigating:', error)
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
            {/* Speech bubble pointer with border */}
            <View style={styles.speechPointer} />
            <View style={styles.speechPointerInner} />
          </View>

          {/* Camel Image */}
          <View style={styles.imageContainer}>
            <Image
              source={require('@/assets/images/quiz-images/Camel.png')}
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
    bottom: -18,
    right: 60,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 18,
    borderRightWidth: 18,
    borderBottomWidth: 0,
    borderLeftWidth: 18,
    borderTopColor: ArchivesTheme.colors.mossGreen,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  speechPointerInner: {
    position: 'absolute',
    bottom: -15,
    right: 63,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 15,
    borderRightWidth: 15,
    borderBottomWidth: 0,
    borderLeftWidth: 15,
    borderTopColor: 'white',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
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
    marginTop: 10,
  },
  camelImage: {
    width: 180,
    height: 260,
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