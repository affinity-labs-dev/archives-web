// OnboardingRemindersScreen - Notification permission request screen (Question 3)
// "Get a daily reminder to meet your goal"

import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Dimensions,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import ArchivesTheme from '@/constants/ArchivesTheme'
import OnboardingQuestionLayout from '@/components/onboarding/OnboardingQuestionLayout'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useOnboardingTapSound } from '@/hooks/useOnboardingTapSound'
import { analyticsService } from '@/services/AnalyticsService'
import AppLogger from '@/services/AppLogger'
import { CustomerIO, CioPushPermissionStatus } from 'customerio-reactnative'
import CustomerIOService from '@/services/CustomerIOService'
import Svg, { Path } from 'react-native-svg'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

// Responsive scaling based on screen size
const scale = (size: number) => (SCREEN_WIDTH / 393) * size // 393 is iPhone 14 Pro width
const verticalScale = (size: number) => (SCREEN_HEIGHT / 852) * size // 852 is iPhone 14 Pro height

export default function OnboardingRemindersScreen() {
  const [screenStartTime] = useState(Date.now())
  const router = useRouter()
  const { trackScreenView } = useAnalytics()
  const { playTap } = useOnboardingTapSound()

  // Use ref to avoid re-running useEffect when exit action changes
  const exitActionRef = useRef<'back_button' | 'continued' | 'app_closed'>('app_closed')

  AppLogger.info('notification', 'OnboardingReminders initializing')

  // Track screen view when component mounts
  useEffect(() => {
    trackScreenView('Onboarding Question 3')

  }, [trackScreenView])

  // Register device token with Customer.io in background (fire-and-forget)
  // Separated from the main flow to avoid blocking navigation
  const registerDeviceTokenInBackground = () => {
    ;(async () => {
      try {
        // Wait for iOS to fetch the APNs token from Apple servers
        // This delay prevents a race where the token isn't available yet
        await new Promise(resolve => setTimeout(resolve, 1500))

        // expo-notifications.getDevicePushTokenAsync() waits until
        // the native APNs/FCM token is ready, so this is reliable
        const Notifications = await import('expo-notifications')
        const pushToken = await Notifications.getDevicePushTokenAsync()

        if (pushToken?.data) {
          // registerDeviceToken is idempotent — safe to call even if SDK already registered
          CustomerIO.registerDeviceToken(pushToken.data as string)
          // Also save token as profile attribute for easy segmentation
          CustomerIOService.setProfileAttributes({
            cio_push_token: pushToken.data as string,
          })
          AppLogger.info('notification', 'Device token registered with Customer.io')
        } else {
          AppLogger.warn('notification', 'No push token available from system')
        }
      } catch (error) {
        // Non-blocking: if token registration fails, Customer.io will retry on next app launch
        AppLogger.warn('notification', 'Background token registration error', { error: String(error) })
      }
    })()
  }

  // Handle enable reminders - request notification permission via Customer.io SDK
  const handleEnableReminders = async () => {
    try {
      playTap()
      await Haptics.impactAsync()
      AppLogger.info('notification', 'User tapped ENABLE REMINDERS')

      // Request notification permission via Customer.io SDK
      // This shows the iOS system permission popup
      let permissionStatus: 'granted' | 'denied' | 'undetermined' = 'undetermined'
      try {
        AppLogger.info('notification', 'Requesting push notification permission')
        const options = { ios: { sound: true, badge: true } }
        const status = await CustomerIO.pushMessaging.showPromptForPushNotifications(options)

        // Status is CioPushPermissionStatus enum: Granted, Denied, NotDetermined
        switch (status) {
          case CioPushPermissionStatus.Granted:
            permissionStatus = 'granted'
            AppLogger.info('notification', 'Push permission GRANTED')
            break
          case CioPushPermissionStatus.Denied:
            permissionStatus = 'denied'
            AppLogger.info('notification', 'Push permission DENIED')
            break
          case CioPushPermissionStatus.NotDetermined:
          default:
            permissionStatus = 'undetermined'
            AppLogger.info('notification', 'Push permission status', { status: String(status) })
        }

        // Sync push permission attributes to Customer.io profile
        CustomerIOService.setProfileAttributes({
          push_notifications_enabled: permissionStatus === 'granted',
          push_permission_status: permissionStatus === 'granted' ? 'Granted' : 'Denied',
          push_permission_updated_at: Math.floor(Date.now() / 1000),
        })

        // After permission granted, register device token in background
        // (autoFetchDeviceToken is false in app.json, so we handle it explicitly)
        // Fire-and-forget: don't block navigation, token registration runs async
        if (permissionStatus === 'granted') {
          registerDeviceTokenInBackground()
        }
      } catch (permError) {
        AppLogger.warn('notification', 'Permission request error (may be Expo Go)', { error: String(permError) })
        permissionStatus = 'undetermined'
      }

      // Track selection with permission result
      analyticsService.trackOnboardingQuestionAnswered({
        screen: 'onboarding_question_3',
        question_number: 3,
        question_text: 'Enable reminders?',
        answer: permissionStatus === 'granted' ? 'Enabled' : 'Enabled (permission denied)',
        answer_index: 0,
      })

      // Track permission request
      analyticsService.trackPermissionRequested({
        permission_type: 'push_notifications',
        screen: 'onboarding_question_3',
        result: permissionStatus,
        platform: Platform.OS,
      })

      // Track specific push notification permission result
      const permissionEvent = {
        permission_type: 'push_notifications' as const,
        screen: 'onboarding_question_3',
        result: permissionStatus,
        platform: Platform.OS,
      }
      if (permissionStatus === 'granted') {
        analyticsService.trackPushNotificationsEnabled(permissionEvent)
      } else {
        analyticsService.trackPushNotificationsDeclined(permissionEvent)
      }

      // Save reminder preference
      await AsyncStorage.setItem('onboarding_reminders_enabled', 'true')
      await AsyncStorage.setItem('notifications_permission_granted', permissionStatus === 'granted' ? 'true' : 'false')

      // Save as q3 answer with permission status
      const answerData = {
        question: 'Enable reminders?',
        answer: 'Enabled',
        permission_status: permissionStatus,
      }
      await AsyncStorage.setItem('onboarding_q3_answer', JSON.stringify(answerData))

      // Navigate to next question
      exitActionRef.current = 'continued'
      router.push('/onboarding-question-4')
    } catch (error) {
      AppLogger.error('notification', 'OnboardingQ3 enable reminders error', {}, error)
      exitActionRef.current = 'continued'
      router.push('/onboarding-question-4')
    }
  }

  // Handle "Maybe Later" - skip without requesting permission
  const handleMaybeLater = async () => {
    try {
      playTap()
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      AppLogger.info('notification', 'User skipped reminders')

      // Track skip action
      analyticsService.trackOnboardingQuestionAnswered({
        screen: 'onboarding_question_3',
        question_number: 3,
        question_text: 'Enable reminders?',
        answer: 'Skipped',
        answer_index: -1,
      })

      // Save as q3 answer
      const answerData = {
        question: 'Enable reminders?',
        answer: 'Skipped',
        permission_status: 'skipped',
      }
      await AsyncStorage.setItem('onboarding_q3_answer', JSON.stringify(answerData))

      // Navigate to next question
      exitActionRef.current = 'continued'
      router.push('/onboarding-question-4')
    } catch (error) {
      AppLogger.error('notification', 'OnboardingQ3 skip error', {}, error)
      exitActionRef.current = 'continued'
      router.push('/onboarding-question-4')
    }
  }

  return (
    <OnboardingQuestionLayout activeStep={3} screenName="onboarding_question_3">
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
            <Text style={styles.speechText} selectable={false}>
              Get a daily reminder{'\n'}to meet your goal
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

        {/* Islamic Quote Section */}
        <View style={styles.quoteSection}>
          <Text style={styles.quoteText} selectable={false}>
            {'"Whoever travels a path seeking knowledge, Allah makes easy their path to Paradise"'}
          </Text>
          <Text style={styles.quoteAttribution} selectable={false}>
            The Prophet Mohammed ﷺ
          </Text>
        </View>

        {/* Stats Section with Laurel Leaves */}
        <View style={styles.statsSection}>
          {/* Left Laurel */}
          <Image
            source={require('@/assets/images/leaf.png')}
            style={styles.laurelLeft}
            resizeMode="contain"
          />

          {/* Stats Container */}
          <View style={styles.statsContainer}>
            {/* Learners Stat */}
            <View style={styles.statItem}>
              <Text style={styles.statNumber} selectable={false}>+10,000</Text>
              <Text style={styles.statLabel} selectable={false}>Learners</Text>
            </View>

            {/* Lessons Stat */}
            <View style={styles.statItem}>
              <Text style={styles.statNumber} selectable={false}>+50,000</Text>
              <Text style={styles.statLabel} selectable={false}>Lessons Completed</Text>
            </View>
          </View>

          {/* Right Laurel (flipped horizontally) */}
          <Image
            source={require('@/assets/images/leaf.png')}
            style={styles.laurelRight}
            resizeMode="contain"
          />
        </View>

      </View>

      {/* Bottom Buttons - Fixed at bottom */}
      <View style={styles.bottomButtonsContainer}>
        {/* Enable Reminders Button */}
        <TouchableOpacity
          style={styles.enableButton}
          onPress={handleEnableReminders}
          activeOpacity={0.8}
        >
          <Text style={styles.enableButtonText} selectable={false}>
            ENABLE REMINDERS
          </Text>
        </TouchableOpacity>

        {/* Maybe Later Link */}
        <TouchableOpacity
          style={styles.maybeLaterButton}
          onPress={handleMaybeLater}
          activeOpacity={0.7}
        >
          <Text style={styles.maybeLaterText} selectable={false}>
            MAYBE LATER
          </Text>
        </TouchableOpacity>
      </View>
    </OnboardingQuestionLayout>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Mascot Section
  mascotSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: verticalScale(10),
    marginBottom: verticalScale(20),
    paddingLeft: 0,
    paddingRight: 10,
  },
  camelMascot: {
    width: scale(110),
    height: scale(110),
    marginRight: 3,
  },

  // Speech Bubble
  speechBubble: {
    flex: 1,
    maxWidth: scale(220),
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: ArchivesTheme.colors.mossGreen,
    paddingHorizontal: 16,
    paddingVertical: 14,
    position: 'relative',
    shadowColor: 'black',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  speechText: {
    fontFamily: 'DM Sans',
    fontSize: scale(18),
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
    textAlign: 'left',
    lineHeight: scale(24),
  },
  speechTail: {
    position: 'absolute',
    left: -14.5,
    top: '50%',
    marginTop: -10,
    width: 15,
    height: 20,
  },

  // Quote Section
  quoteSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: verticalScale(15),
    marginBottom: verticalScale(8),
  },
  quoteText: {
    fontFamily: 'Cormorant',
    fontSize: scale(20),
    fontWeight: '500',
    color: '#000000',
    textAlign: 'center',
    lineHeight: scale(26),
    marginBottom: verticalScale(12),
  },
  quoteAttribution: {
    fontFamily: 'Cormorant',
    fontSize: scale(20),
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginTop: verticalScale(8),
  },

  // Stats Section
  statsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginTop: verticalScale(15),
  },
  laurelLeft: {
    width: scale(96),
    height: verticalScale(192),
    marginRight: scale(15),
    marginTop: verticalScale(20),
  },
  laurelRight: {
    width: scale(96),
    height: verticalScale(192),
    marginLeft: scale(15),
    marginTop: verticalScale(20),
    transform: [{ scaleX: -1 }], // Flip horizontally
  },
  statsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(20),
  },
  statItem: {
    alignItems: 'center',
    marginVertical: verticalScale(10),
  },
  statNumber: {
    fontFamily: 'DM Sans',
    fontSize: scale(22),
    fontWeight: '800',
    color: ArchivesTheme.colors.persianOrange,
    textAlign: 'center',
  },
  statLabel: {
    fontFamily: 'DM Sans',
    fontSize: scale(16),
    fontWeight: '600',
    color: ArchivesTheme.colors.shoeBrown,
    textAlign: 'center',
    marginTop: 2,
  },

  // Bottom Buttons Container - Fixed at bottom
  bottomButtonsContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 30,
    left: 20,
    right: 20,
    alignItems: 'center',
  },

  // Enable Reminders Button
  enableButton: {
    width: '100%',
    maxWidth: 345,
    height: 48,
    backgroundColor: ArchivesTheme.colors.mossGreen,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    shadowColor: 'black',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  enableButtonText: {
    fontFamily: 'DM Sans',
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },

  // Maybe Later Link
  maybeLaterButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  maybeLaterText: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: '600',
    color: ArchivesTheme.colors.dullBeige,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
})
