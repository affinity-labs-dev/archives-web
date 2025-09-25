// App Entry Point - Smart routing for new vs returning users
import React, { useState, useEffect } from 'react'
import { Redirect } from 'expo-router'
import { useUser } from '@clerk/clerk-expo'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function Index() {
  const { isSignedIn, isLoaded } = useUser()
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)

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
      const onboardingComplete = await AsyncStorage.getItem('onboarding_completed')
      const hasSelectedEra = await AsyncStorage.getItem('selected_era')

      setHasCompletedOnboarding(!!(onboardingComplete || hasSelectedEra))
    } catch (error) {
      console.error('Error checking user state:', error)
      setHasCompletedOnboarding(false)
    } finally {
      setIsChecking(false)
    }
  }

  // Show loading while checking user state
  if (isChecking || !isLoaded) {
    return null // Could show a loading spinner here
  }

  // Returning user: signed in AND has completed onboarding
  if (isSignedIn && hasCompletedOnboarding) {
    console.log('🏠 Returning user - routing to Home tab')
    return <Redirect href="/(tabs)" />
  }

  // New user or incomplete onboarding: go through full flow
  console.log('👋 New user - routing to landing page')
  return <Redirect href="/landing" />
}