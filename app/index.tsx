// App Entry Point - Smart routing for new vs returning users
import React, { useState, useEffect } from 'react'
import { Redirect } from 'expo-router'
import { useUser } from '@clerk/clerk-expo'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { usePostHog } from 'posthog-react-native'
import { Platform } from 'react-native'
import LoadingScreen from '@/components/LoadingScreen'
import { analyticsService } from '@/services/AnalyticsService'
import AppLogger from '@/services/AppLogger'

export default function Index() {
  const { isSignedIn, isLoaded } = useUser()
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
      AppLogger.info('navigation', 'App entry point tracked')
    }
  }, [posthog])

  useEffect(() => {
    checkUserState()
  }, [isLoaded, isSignedIn])

  const checkUserState = async () => {
    try {
      // Wait for Clerk to load
      if (!isLoaded) {
        AppLogger.info('auth', 'Clerk not loaded yet, waiting...')
        return
      }

      // Check if user has completed onboarding
      const hasSelectedEra = await AsyncStorage.getItem('selected_era')

      // AFF-151: Track routing decision — uses Sentry breadcrumb as fallback since
      // PostHog may not be initialized yet (especially on iOS where ATT is required first).
      // analyticsService.trackAuthStateChange already writes a Sentry breadcrumb internally.
      const route = isSignedIn ? '/(tabs)/today' : '/onboarding-video'
      const newState: 'signed_in' | 'signed_out' = isSignedIn ? 'signed_in' : 'signed_out'
      const routingData = {
        previous_state: 'unknown' as const,
        new_state: newState,
        user_id: null,
        had_selected_era: !!hasSelectedEra,
        app_state: `routing_to:${route}`,
      }

      // AppLogger breadcrumb is always captured (even pre-PostHog), PostHog event is best-effort
      AppLogger.info('navigation', `App routing decision: ${route}`, {
        isSignedIn: !!isSignedIn,
        hasSelectedEra: !!hasSelectedEra,
        route,
      })
      analyticsService.trackAuthStateChange(routingData)

    } catch (error) {
      AppLogger.error('navigation', 'Error checking user state', {}, error)
    } finally {
      setIsChecking(false)
    }
  }

  // Show branded loading while checking user state
  if (isChecking || !isLoaded) {
    return <LoadingScreen />
  }

  // Returning user: signed in — go straight to today tab (era selection not required)
  if (isSignedIn) {
    AppLogger.info('navigation', 'Routing to /(tabs)/today')
    return <Redirect href="/(tabs)/today" />
  }

  // Not signed in: start onboarding
  AppLogger.info('navigation', 'Routing to /onboarding-video', { isSignedIn: false })
  return <Redirect href="/onboarding-video" />
}