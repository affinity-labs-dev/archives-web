// App Entry Point - Smart routing for new vs returning users
import React, { useState, useEffect } from 'react'
import { Redirect } from 'expo-router'
import { useUser } from '@clerk/clerk-expo'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { usePostHog } from 'posthog-react-native'
import { Platform } from 'react-native'
import LoadingScreen from '@/components/LoadingScreen'

export default function Index() {
  const { isSignedIn, isLoaded } = useUser()
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)
  const posthog = usePostHog()

  // Track initial app entry point (captures very first screen of session)
  useEffect(() => {
    if (posthog && Platform.OS !== 'web') {
      // Identify session start point
      posthog.capture('app_entry_point', {
        screen: 'index',
        timestamp: Date.now(),
        is_signed_in: isSignedIn,
        is_loaded: isLoaded,
      })
      console.log('🎥 [PostHog] App entry point tracked for session replay')
    }
  }, [posthog])

  useEffect(() => {
    checkUserState()
  }, [isLoaded, isSignedIn])

  const checkUserState = async () => {
    try {
      // Wait for Clerk to load
      if (!isLoaded) {
        return
      }

      // Check if user has completed onboarding
      const hasSelectedEra = await AsyncStorage.getItem('selected_era')

      setHasCompletedOnboarding(!!hasSelectedEra)
    } catch (error) {
      console.error('Error checking user state:', error)
      setHasCompletedOnboarding(false)
    } finally {
      setIsChecking(false)
    }
  }

  // Show branded loading while checking user state
  if (isChecking || !isLoaded) {
    return <LoadingScreen />
  }

  // Returning user: signed in AND has completed onboarding
  if (isSignedIn && hasCompletedOnboarding) {
    console.log('🏠 Returning user - routing to Home tab')
    return <Redirect href="/(tabs)" />
  }

  // New user or incomplete onboarding: start comprehensive onboarding
  console.log('👋 New user - routing to onboarding videos')
  return <Redirect href="/onboarding-video" />
}