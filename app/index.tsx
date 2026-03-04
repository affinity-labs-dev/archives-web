// App Entry Point - Smart routing for new vs returning users
import React, { useState, useEffect } from 'react'
import { Redirect } from 'expo-router'
import { useUser } from '@clerk/clerk-expo'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { usePostHog } from 'posthog-react-native'
import { Platform } from 'react-native'
import LoadingScreen from '@/components/LoadingScreen'
import { analyticsService } from '@/services/AnalyticsService'

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
        // $timestamp auto-captured by PostHog
        is_signed_in: isSignedIn ?? false,
        is_loaded: isLoaded ?? false,
      })
      console.log('🔑 [Index] App entry point tracked')
    }
  }, [posthog])

  useEffect(() => {
    checkUserState()
  }, [isLoaded, isSignedIn])

  const checkUserState = async () => {
    try {
      // Wait for Clerk to load
      if (!isLoaded) {
        console.log('🔑 [Index] Clerk not loaded yet, waiting...')
        return
      }

      // Check if user has completed onboarding
      const hasSelectedEra = await AsyncStorage.getItem('selected_era')

      // AFF-151: Track routing decision through analytics (visible in PostHog)
      const route = (isSignedIn && hasSelectedEra) ? '/(tabs)' : '/onboarding-video'
      analyticsService.trackAuthStateChange({
        previous_state: 'unknown',
        new_state: isSignedIn ? 'signed_in' : 'signed_out',
        user_id: null,
        had_selected_era: !!hasSelectedEra,
        app_state: `routing_to:${route}`,
      })

      console.log('🔑 [Index] Auth check:', {
        isSignedIn,
        isLoaded,
        hasSelectedEra: !!hasSelectedEra,
        selectedEraValue: hasSelectedEra,
        route,
      })

      setHasCompletedOnboarding(!!hasSelectedEra)
    } catch (error) {
      console.error('🔑 [Index] Error checking user state:', error)
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
    console.log('🔑 [Index] Routing → /(tabs)')
    return <Redirect href="/(tabs)" />
  }

  // New user or incomplete onboarding: start comprehensive onboarding
  console.log('🔑 [Index] Routing → /onboarding-video (isSignedIn:', isSignedIn, ', hasCompletedOnboarding:', hasCompletedOnboarding, ')')
  return <Redirect href="/onboarding-video" />
}