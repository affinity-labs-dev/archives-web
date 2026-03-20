// OnboardingResultsScreen - Shows recommended era based on quiz answers
// Displays suggested learning path and prompts account creation

import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import ArchivesTheme from '@/constants/ArchivesTheme'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAppTrackingTransparency } from '@/hooks/useAppTrackingTransparency'
import { analyticsService } from '@/services/AnalyticsService'
import AppLogger from '@/services/AppLogger'
import Svg, { Path } from 'react-native-svg'

export default function OnboardingResultsScreen() {
  const [recommendedEra, setRecommendedEra] = useState('Rise of Islam')
  const [screenStartTime] = useState(Date.now())
  const router = useRouter()
  const { trackScreenView } = useAnalytics()
  const { requestPermission } = useAppTrackingTransparency()

  // Use refs to prevent duplicate tracking and avoid useEffect dependency issues
  const hasTrackedCompletionRef = useRef(false)
  const exitActionRef = useRef<'back_button' | 'continued' | 'app_closed'>('app_closed')

  AppLogger.info('navigation', 'OnboardingResults initializing')

  // Track screen view and onboarding completion when component mounts (ONCE only)
  useEffect(() => {
    trackScreenView('Onboarding Results')
    loadRecommendation()

    // Only track completion once (prevent duplicates from re-renders)
    if (!hasTrackedCompletionRef.current) {
      hasTrackedCompletionRef.current = true
      trackOnboardingCompletion()
    }

  }, [trackScreenView])

  // Track onboarding completion with all answers
  const trackOnboardingCompletion = async () => {
    try {
      AppLogger.info('navigation', 'Tracking onboarding completion')

      // Get start time
      const startTime = await AsyncStorage.getItem('onboarding_start_time')
      const timeToComplete = startTime
        ? Math.floor((Date.now() - parseInt(startTime)) / 1000) // Convert to seconds
        : 0

      // Get all question answers (stored as JSON objects)
      const q1Raw = await AsyncStorage.getItem('onboarding_q1_answer') || '{}'
      const q2Raw = await AsyncStorage.getItem('onboarding_q2_answer') || '{}'
      const q3Raw = await AsyncStorage.getItem('onboarding_q3_answer') || '{}'
      const q4Raw = await AsyncStorage.getItem('onboarding_q4_answer') || '{}'

      // Parse JSON to extract answer values
      const q1Data = JSON.parse(q1Raw)
      const q2Data = JSON.parse(q2Raw)  // Q2: "How did you learn about Archives?" (awareness channel)
      const q3Data = JSON.parse(q3Raw)
      const q4Data = JSON.parse(q4Raw)  // Q4: "Why are you learning?" (multi-select motivation)

      // Track the completion event
      analyticsService.trackOnboardingCompleted({
        screen: 'onboarding_results',
        context: 'onboarding',
        time_to_complete_seconds: timeToComplete,
        onboarding_q1: q1Data.answer || 'Not answered',
        onboarding_q2: q2Data.answer || 'Not answered',
        onboarding_q3: q3Data.answer || 'Not answered',
        onboarding_q4: q4Data.answers || [],
      })

      // Update PostHog person properties with onboarding data
      analyticsService.updateOnboardingProperties({
        knowledge_level: q1Data.answer || null,           // Q1: "How much do you know?"
        awareness_channel: q2Data.answer || null,         // Q2: "How did you learn about Archives?"
        daily_learning_goal: q3Data.answer || null,       // Q3: "What's your daily learning goal?"
        learning_motivation: q4Data.answers || null,      // Q4: "Why are you learning?" (multi-select)
        onboarding_result: 'Rise of Islam',               // Recommended era
      })

      AppLogger.info('navigation', 'Onboarding completion tracked', { timeToComplete })
    } catch (error) {
      AppLogger.error('navigation', 'Error tracking onboarding completion', {}, error)
    }
  }

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

      AppLogger.info('navigation', 'Loaded onboarding quiz answers')

      // Based on answers, we could recommend different eras
      // For now, always recommend Rise of Islam
      setRecommendedEra('Rise of Islam')
    } catch (error) {
      AppLogger.error('navigation', 'Error loading onboarding answers', {}, error)
      setRecommendedEra('Rise of Islam')
    }
  }

  // Navigate to account creation - with ATT permission request
  const handleCreateAccount = async () => {
    try {
      await Haptics.impactAsync()
      AppLogger.info('auth', 'User tapped CREATE ACCOUNT - requesting ATT permission')

      // Request ATT permission - popup shows here
      const attStatus = await requestPermission()
      AppLogger.info('auth', 'ATT permission result', { attStatus })

      // Track ATT permission request
      analyticsService.trackPermissionRequested({
        permission_type: 'app_tracking_transparency',
        screen: 'onboarding_results',
        result: attStatus,
        platform: Platform.OS,
      })

      // Navigate to authentication page after ATT response
      // Note: The authentication screen will handle routing to appropriate tab after successful auth
      AppLogger.info('navigation', 'Navigating to authentication page')
      exitActionRef.current = 'continued'
      router.push('/(auth)/archives-auth')
    } catch (error) {
      AppLogger.error('auth', 'Error during ATT request or navigation', {}, error)
      // Even if ATT fails, continue to authentication
      exitActionRef.current = 'continued'
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
      <SafeAreaView style={[styles.container, { paddingTop: Platform.OS === 'android' ? 10 : 0 }]}>
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
              <Text style={styles.suggestionText} selectable={false}>
                Based on your{'\n'}answers, we suggest...
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

          {/* Era Recommendation Card */}
          <View style={styles.eraCard}>
            <Image
              source={require('@/assets/images/eras/era61.jpg')}
              style={styles.eraImage}
              resizeMode="cover"
            />

            {/* Gradient Overlay - lighter gradient for text readability */}
            <LinearGradient
              colors={[
                'rgba(0,0,0,0.0)',    // 0% opacity at top
                'rgba(0,0,0,0.1)',    // 10% opacity
                'rgba(0,0,0,0.4)',    // 40% opacity
                'rgba(0,0,0,0.7)'     // 70% opacity at bottom
              ]}
              locations={[0, 0.4, 0.7, 1]}
              style={styles.gradientOverlay}
            />

            <View style={styles.eraOverlay}>
              <Text style={styles.eraTitle} selectable={false}>
                Women of Islam
              </Text>
                          </View>
          </View>

          {/* Account Creation Prompt */}
          <Text style={styles.accountPrompt} selectable={false}>
            Create an account to start exploring
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
    width: 135,
    height: 135,
    marginRight: 3,
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
    left: -14.5,
    top: '50%',
    marginTop: -10,
    width: 15,
    height: 20,
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
    height: 250,
    borderRadius: 24,
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