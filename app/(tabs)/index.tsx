// Home Tab - Shows era-specific content based on user's selected era
// Exact replica of SwiftUI MainTabView Home functionality

import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth, useUser } from '@clerk/clerk-expo'
import { useProgress } from '@/context/ProgressContext'
import ComingSoonView from '@/components/eras/ComingSoonView'
import ROIBentoScreen from './roi-bento'
import ArchivesTheme from '@/constants/ArchivesTheme'
import { analyticsService } from '@/services/AnalyticsService'
import { useFocusEffect } from '@react-navigation/native'

export default function HomeTab() {
  const { isSignedIn } = useAuth()
  const { user } = useUser()
  const { selectedEra, isLoading } = useProgress()
  const router = useRouter()
  const [onboardingChecked, setOnboardingChecked] = useState(false)

  // Fallback: Ensure Clerk user ID is set in PostHog (production safety)
  useEffect(() => {
    if (isSignedIn && user) {
      analyticsService.setUserProperties(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      });
      console.log('✅ [HomeTab] User properties set for Clerk ID:', user.id);
    }
  }, [isSignedIn, user]);

  // Check onboarding status and navigation logic
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (isLoading) return

      try {
        // Just mark as checked, don't redirect anywhere
        // Let buttons and navigation handle the routing flow
        console.log('HomeTab - Marking onboarding as checked, allowing natural navigation')
        setOnboardingChecked(true)
      } catch (error) {
        console.error('HomeTab - Error checking onboarding status:', error)
        // Continue with normal flow if there's an error
        setOnboardingChecked(true)
      }
    }

    checkOnboardingStatus()
  }, [isLoading])

  // Track page views with focus/blur
  useFocusEffect(
    React.useCallback(() => {
      console.log('📊 [HomeTab] Screen focused - starting page view tracking')
      analyticsService.startPageView('home', '/home')

      return () => {
        console.log('📊 [HomeTab] Screen blurred - ending page view tracking')
        analyticsService.endPageView('home')
      }
    }, [])
  )

  const handleBackToEra = () => {
    router.push('/(tabs)/eras')
  }

  // Show loading state while checking context and onboarding
  if (isLoading || !onboardingChecked) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading Archives...</Text>
        </View>
      </SafeAreaView>
    )
  }

  // Show era-specific content based on selection
  switch (selectedEra) {
    case 'umayyad':
      // TODO: Replace with BentoGridScreen once Umayyad content is in Supabase
      return <ComingSoonView era="umayyad" onBack={handleBackToEra} />

    case 'riseOfIslam':
      // Render ROI content directly in Home tab
      return <ROIBentoScreen />

    case 'abbasid':
      return <ComingSoonView era="abbasid" onBack={handleBackToEra} />
      
    case 'ottoman':
      return <ComingSoonView era="ottoman" onBack={handleBackToEra} />
      
    case 'fatimid':
      return <ComingSoonView era="fatimid" onBack={handleBackToEra} />
      
    default:
      // No era selected - show default welcome
      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            <View style={styles.content}>
              <Text style={styles.title}>Welcome to Archives</Text>
              <Text style={styles.subtitle}>
                Please select an era to begin your journey
              </Text>

              <TouchableOpacity
                style={styles.selectEraButton}
                onPress={() => router.push('/(tabs)/eras')}
                activeOpacity={0.8}
              >
                <Text style={styles.selectEraButtonText}>
                  Choose Your Era
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      )
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    ...ArchivesTheme.typography.bodyLarge,
    color: ArchivesTheme.colors.mutedNavy,
    fontWeight: '500',
    marginTop: 16,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'DM Sans',
    fontWeight: '600',
    color: ArchivesTheme.colors.shoeBrown,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    fontFamily: 'DM Sans',
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'center',
  },
  title: {
    ...ArchivesTheme.typography.h2,
    fontSize: 28,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    ...ArchivesTheme.typography.body,
    color: ArchivesTheme.colors.mutedNavy,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 40,
  },
  selectEraButton: {
    backgroundColor: ArchivesTheme.colors.persianOrange,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 27,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  selectEraButtonText: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
})
