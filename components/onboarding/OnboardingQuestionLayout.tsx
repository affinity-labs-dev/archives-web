// OnboardingQuestionLayout - Shared layout for onboarding question screens
// Provides: StatusBar, SafeAreaView, and progress bar
// Each screen provides its own content as children

import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  TouchableOpacity,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { SafeAreaView } from 'react-native-safe-area-context'
import ArchivesTheme from '@/constants/ArchivesTheme'
import { useAppTrackingTransparency } from '@/hooks/useAppTrackingTransparency'
import { analyticsService } from '@/services/AnalyticsService'
import AppLogger from '@/services/AppLogger'

/** Step index for the notification permission screen (skip button hidden here) */
const NOTIFICATION_PERMISSION_STEP = 3;

interface OnboardingQuestionLayoutProps {
  activeStep: number
  screenName: string
  showProgressBar?: boolean
  children: React.ReactNode
}

export default function OnboardingQuestionLayout({
  activeStep,
  children,
  screenName,
  showProgressBar = true,
}: OnboardingQuestionLayoutProps) {
  const router = useRouter()
  const { requestPermission } = useAppTrackingTransparency()

    // Navigate to account creation - with ATT permission request
  const handleSkipOnboarding = async () => {
    try {
      await Haptics.impactAsync()
      AppLogger.info('auth', 'User tapped SKIP - requesting ATT permission')

      // Request ATT permission - popup shows here
      const attStatus = await requestPermission()
      AppLogger.info('auth', 'ATT permission result', { attStatus })

      // Track ATT permission request
      analyticsService.trackPermissionRequested({
        permission_type: 'app_tracking_transparency',
        screen: screenName,
        result: attStatus,
        platform: Platform.OS,
      })

      // Navigate to authentication page after ATT response
      // Note: The authentication screen will handle routing to appropriate tab after successful auth
      AppLogger.info('navigation', 'Navigating to authentication page after SKIP', { screenName })
      router.push('/(auth)/archives-auth')
    } catch (error) {
      AppLogger.error('auth', 'Error during ATT request or navigation', {}, error)
      // Even if ATT fails, continue to authentication
      router.push('/(auth)/archives-auth')
    }
  }

  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={ArchivesTheme.colors.creamWhite}
        translucent
      />
      <SafeAreaView style={[styles.container, { paddingTop: Platform.OS === 'android' ? 10 : 0 }]}>
        {/* Progress Bar */}
        <View style={[styles.progressContainer, { paddingBottom: activeStep === NOTIFICATION_PERMISSION_STEP ? 20 : 0 }]}>
          {showProgressBar && (
            <View style={styles.progressSegments}>
              {[1, 2, 3, 4].map((step) => (
                <View
                  key={step}
                  style={[
                    styles.progressSegment,
                    step <= activeStep && styles.progressSegmentActive,
                  ]}
                />
              ))}
            </View>
          )}
          {/* Hide skip on notification permission step — user must explicitly accept or dismiss */}
          {activeStep !== NOTIFICATION_PERMISSION_STEP && (
            <View style={styles.skipContainer}>
              <TouchableOpacity activeOpacity={0.8} onPress={handleSkipOnboarding}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {children}
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
  },
  progressContainer: {
    paddingHorizontal: 0,
    paddingTop: 20,
  },
  progressSegments: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressSegment: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(139,96,64,0.2)',
    borderRadius: 2,
    marginHorizontal: 2,
  },
  progressSegmentActive: {
    backgroundColor: ArchivesTheme.colors.persianOrange,
  },
  skipContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  skipText: {
    color: ArchivesTheme.colors.shoeBrown,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'DM Sans',
  },
})
