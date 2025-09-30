// OnboardingResultsScreen - Shows recommended era based on quiz answers
// Displays suggested learning path and prompts account creation

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import ArchivesTheme from '@/constants/ArchivesTheme'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAppTrackingTransparency } from '@/hooks/useAppTrackingTransparency'

export default function OnboardingResultsScreen() {
  const [recommendedEra, setRecommendedEra] = useState('Umayyad Dynasty')
  const router = useRouter()
  const { trackScreenView } = useAnalytics()
  const { requestPermission } = useAppTrackingTransparency()

  console.log('🎯 [OnboardingResults] Component initializing...')

  // Track screen view when component mounts
  useEffect(() => {
    trackScreenView('Onboarding Results')
    loadRecommendation()
  }, [trackScreenView])

  // Load recommendation based on quiz answers
  const loadRecommendation = async () => {
    try {
      // For now, default to Umayyad Dynasty
      // In the future, this could analyze quiz answers to suggest different eras
      const answers = {
        q1: await AsyncStorage.getItem('onboarding_q1_answer'),
        q2: await AsyncStorage.getItem('onboarding_q2_answer'),
        q3: await AsyncStorage.getItem('onboarding_q3_answer'),
        q4: await AsyncStorage.getItem('onboarding_q4_answer'),
      }

      console.log('🎯 [OnboardingResults] Quiz answers:', answers)

      // Based on answers, we could recommend different eras
      // For now, always recommend Umayyad Dynasty as it's the main era
      setRecommendedEra('Umayyad Dynasty')
    } catch (error) {
      console.error('🎯 [OnboardingResults] Error loading answers:', error)
      setRecommendedEra('Umayyad Dynasty')
    }
  }

  // Navigate to account creation - with ATT permission request
  const handleCreateAccount = async () => {
    try {
      await Haptics.impactAsync()
      console.log('🎯 [OnboardingResults] User tapped CREATE ACCOUNT - requesting ATT permission')

      // Request ATT permission - popup shows here
      const attStatus = await requestPermission()
      console.log('🎯 [OnboardingResults] ATT permission result:', attStatus)

      // Navigate to authentication page after ATT response
      // Note: The authentication screen will handle routing to appropriate tab after successful auth
      console.log('🎯 [OnboardingResults] Navigating to authentication page')
      router.push('/(auth)/archives-auth')
    } catch (error) {
      console.error('🎯 [OnboardingResults] Error during ATT request or navigation:', error)
      // Even if ATT fails, continue to authentication
      router.push('/(auth)/archives-auth')
    }
  }

  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={ArchivesTheme.colors.creamWhite}
        translucent={true}
      />
      <SafeAreaView style={styles.container}>
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
              <Text style={styles.suggestionText} selectable={false}>
                Based on your{'\n'}answers, we suggest{'\n'}you to explore...
              </Text>

              {/* Speech bubble tail */}
              <View style={styles.speechTail} />
              <View style={styles.speechTailInner} />
            </View>
          </View>

          {/* Era Recommendation Card */}
          <View style={styles.eraCard}>
            <Image
              source={require('@/assets/images/eras/era1-bg.jpg')}
              style={styles.eraImage}
              resizeMode="cover"
            />

            {/* Gradient Overlay - Bottom to Top (100% to 0%) */}
            <LinearGradient
              colors={[
                'rgba(0,0,0,0.0)',    // 0% opacity at top
                'rgba(0,0,0,0.4)',    // 40% opacity
                'rgba(0,0,0,0.7)',    // 70% opacity
                'rgba(0,0,0,1.0)'     // 100% opacity at bottom
              ]}
              locations={[0, 0.3, 0.7, 1]}
              style={styles.gradientOverlay}
            />

            <View style={styles.eraOverlay}>
              <Text style={styles.eraTitle} selectable={false}>
                Umayyad Dynasty
              </Text>
              <Text style={styles.eraSubtitle} selectable={false}>
                (661-750 CE)
              </Text>
            </View>
          </View>

          {/* Account Creation Prompt */}
          <Text style={styles.accountPrompt} selectable={false}>
            Start exploring by creating an account
          </Text>

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Create Account Button */}
          <TouchableOpacity
            style={styles.createAccountButton}
            onPress={handleCreateAccount}
            activeOpacity={0.8}
          >
            <Text style={styles.createAccountText} selectable={false}>
              CREATE ACCOUNT
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },

  // Mascot Section
  mascotSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  camelMascot: {
    width: 100,
    height: 100,
    marginRight: 20,
  },

  // Speech Bubble
  speechBubble: {
    width: 220,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: ArchivesTheme.colors.mossGreen,
    paddingHorizontal: 16,
    paddingVertical: 16,
    position: 'relative',
    shadowColor: 'black',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  suggestionText: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'left',
    lineHeight: 24,
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

  // Gradient Overlay
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Era Recommendation Card
  eraCard: {
    width: '100%',
    height: 400,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 30,
  },
  eraImage: {
    width: '100%',
    height: '100%',
  },
  eraOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  eraTitle: {
    fontFamily: 'DM Sans',
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  eraSubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: '500',
    color: '#D7C5B6',
  },

  // Account Creation
  accountPrompt: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '500',
    color: ArchivesTheme.colors.shoeBrown,
    textAlign: 'center',
    opacity: 0.8,
  },

  spacer: {
    flex: 1,
  },

  // Create Account Button
  createAccountButton: {
    width: '100%',
    height: 48,
    backgroundColor: ArchivesTheme.colors.mossGreen,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'black',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  createAccountText: {
    fontFamily: 'DM Sans',
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
})