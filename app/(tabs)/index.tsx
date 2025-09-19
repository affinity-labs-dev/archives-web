// Home Tab - Shows era-specific content based on user's selected era
// Exact replica of SwiftUI MainTabView Home functionality

import React, { useEffect } from 'react'
import { View, Text, StyleSheet, SafeAreaView } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'
import { useProgress } from '@/context/ProgressContext'
import UmmayadDynastyEra from '@/components/eras/UmmayadDynastyEra'
import RiseOfIslamEra from '@/components/eras/RiseOfIslamEra'
import ComingSoonView from '@/components/eras/ComingSoonView'
import ArchivesTheme from '@/constants/ArchivesTheme'

export default function HomeTab() {
  const { isSignedIn } = useAuth()
  const { selectedEra, isLoading } = useProgress()
  const router = useRouter()


  // Navigation logic
  useEffect(() => {
    if (!isLoading) {
      if (!isSignedIn) {
        router.replace('/landing')
        return
      }

      if (!selectedEra) {
        router.replace('/era-selection')
      }
    }
  }, [isSignedIn, selectedEra, isLoading, router])

  const handleBackToEra = () => {
    router.push('/era-selection')
  }

  // Show loading state while checking context
  if (isLoading) {
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
      return <UmmayadDynastyEra onBackToEra={handleBackToEra} />

    case 'riseOfIslam':
      return <RiseOfIslamEra onBackToEra={handleBackToEra} />
      
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
              
              <View style={styles.selectEraContainer}>
                <Text style={styles.selectEraText}>
                  Go to Eras tab to choose your adventure
                </Text>
              </View>
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
  },
  loadingText: {
    ...ArchivesTheme.typography.bodyLarge,
    color: ArchivesTheme.colors.mutedNavy,
    fontWeight: '500',
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
  selectEraContainer: {
    backgroundColor: ArchivesTheme.colors.persianOrange + '20', // 20% opacity
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ArchivesTheme.colors.persianOrange + '40',
  },
  selectEraText: {
    ...ArchivesTheme.typography.bodyLarge,
    color: ArchivesTheme.colors.mutedNavy,
    fontWeight: '600',
    textAlign: 'center',
  },
})
