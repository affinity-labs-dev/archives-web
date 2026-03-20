// Exact replica of Archives Affinity Labs SwiftUI SignUpOrSignInView
// Porting pixel-perfect design with Clerk authentication

import { AppleSignInButton } from '@/components/AppleSignInButton'
import { AuthToggle } from '@/components/AuthToggle'
import { GoogleSignInButton } from '@/components/GoogleSignInButton'
import ArchivesTheme from '@/constants/ArchivesTheme'
import { useSignIn, useSignUp } from '@clerk/clerk-expo'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useState } from 'react'
import {
  Dimensions,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import { VideoView, useVideoPlayer } from 'expo-video'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAnalytics } from '@/hooks/useAnalytics'
import { analyticsService } from '@/services/AnalyticsService'
import AppLogger from '@/services/AppLogger'

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ArchivesAuthScreen() {
  // Get route parameters
  const { mode } = useLocalSearchParams()

  // State management (exact replica of SwiftUI)
  const [isSignInMode, setIsSignInMode] = useState(mode === 'signin') // Set based on route parameter
  const [screenStartTime] = useState(Date.now())
  const [exitAction, setExitAction] = useState<'authenticated' | 'back_button' | 'app_closed'>('app_closed')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showError, setShowError] = useState(false)

  // Clerk hooks
  const { signIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn()
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp()
  const router = useRouter()
  const { trackScreenView } = useAnalytics()

  // Video player for waving animation
  const videoSource = require('@/assets/videos/wavinganimation.mp4')
  const player = useVideoPlayer(videoSource, player => {
    player.loop = true
    player.muted = true
    player.play()
  })

  // Track screen view on mount
  React.useEffect(() => {
    const currentMode = isSignInMode ? 'signin' : 'signup'
    trackScreenView('Auth')
    analyticsService.trackAuthScreenViewed({
      screen: 'archives_auth',
      mode: currentMode,
    })

  }, [trackScreenView, isSignInMode])

  // Debug: Log video player status
  React.useEffect(() => {
    if (__DEV__) {
      console.log('Video source:', videoSource)
      console.log('Video player status:', player.status)
    }
  }, [player.status])

  // Navigation handlers
  const onBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setExitAction('back_button')
    router.back()
  }

  const onContinue = async () => {
    // Check if user has already completed onboarding
    try {
      const hasSelectedEra = await AsyncStorage.getItem('selected_era')

      if (hasSelectedEra) {
        // Returning user - go directly to main app
        AppLogger.info('auth', 'Returning user after auth - routing to tabs')
        router.replace('/(tabs)/today')
      } else {
        // New user - go to era selection for onboarding
        AppLogger.info('auth', 'New user after auth - routing to era selection')
        router.replace('/(tabs)/eras?mode=onboarding')
      }
    } catch (error) {
      AppLogger.error('auth', 'Error checking onboarding status', {}, error)
      // Default to era selection on error
      router.replace('/(tabs)/eras?mode=onboarding')
    }
  }

  // Sign Up function (exact replica with Clerk)
  const signUpUser = async () => {
    if (!signUpLoaded) return
    
    // Validate inputs (exact replica of SwiftUI validation)
    if (!validateInputs()) return

    setIsLoading(true)
    setShowError(false)

    try {
      const signUpAttempt = await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
      })

      if (signUpAttempt.status === 'complete') {
        await setActiveSignUp({ session: signUpAttempt.createdSessionId })
        analyticsService.trackUserSignedUp(signUpAttempt.createdUserId || '', {
          sign_up_method: 'email',
        })
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        await onContinue()
      } else {
        // Handle email verification or other steps
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        await onContinue() // For now, proceed anyway
      }
    } catch (err: any) {
      setIsLoading(false)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      if (err.errors && err.errors[0]) {
        setErrorMessage(err.errors[0].longMessage || err.errors[0].message)
      } else {
        setErrorMessage('An error occurred during sign up')
      }
      setShowError(true)
    }
  }

  // Sign In function (exact replica with Clerk)
  const signInUser = async () => {
    if (!signInLoaded) return
    
    // Validate inputs
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please fill in all fields')
      setShowError(true)
      return
    }

    setIsLoading(true)
    setShowError(false)

    try {
      const signInAttempt = await signIn.create({
        identifier: email,
        password,
      })

      if (signInAttempt.status === 'complete') {
        await setActiveSignIn({ session: signInAttempt.createdSessionId })
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        await onContinue()
      } else {
        setIsLoading(false)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        setErrorMessage('Sign in incomplete. Please try again.')
        setShowError(true)
      }
    } catch (err: any) {
      setIsLoading(false)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      if (err.errors && err.errors[0]) {
        setErrorMessage(err.errors[0].longMessage || err.errors[0].message)
      } else {
        setErrorMessage('An error occurred during sign in')
      }
      setShowError(true)
    }
  }

  // Validation function (exact replica of SwiftUI)
  const validateInputs = (): boolean => {
    setShowError(false)

    // For sign up, check all required fields
    if (!isSignInMode) {
      if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
        setErrorMessage('Please fill in all fields')
        setShowError(true)
        return false
      }
    } else {
      // For sign in, only check email and password
      if (!email.trim() || !password.trim()) {
        setErrorMessage('Please fill in all fields')
        setShowError(true)
        return false
      }
    }

    // Validate email format
    const emailRegEx = /[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,64}/
    if (!emailRegEx.test(email)) {
      setErrorMessage('Please enter a valid email address')
      setShowError(true)
      return false
    }

    // For sign up, check password confirmation
    if (!isSignInMode) {
      if (!confirmPassword.trim()) {
        setErrorMessage('Please confirm your password')
        setShowError(true)
        return false
      }

      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match')
        setShowError(true)
        return false
      }

      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters')
        setShowError(true)
        return false
      }
    }

    return true
  }

  return (
    <View style={styles.absoluteContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={ArchivesTheme.colors.creamWhite} />
      <View style={styles.solidBackground}>
        <SafeAreaView style={[styles.safeArea, Platform.OS === 'android' && { paddingTop: 20 }]}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            {/* Header with back button and title */}
            <View style={styles.headerContainer}>
              <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Ionicons name="arrow-back" size={20} color={ArchivesTheme.colors.shoeBrown} />
              </TouchableOpacity>

              <View style={styles.titleContainer}>
                <Text style={styles.titleText}>Let&apos;s get you started</Text>
              </View>

              <View style={styles.spacer} />
            </View>

            {/* Animated Video */}
            <View style={styles.videoContainer}>
              <VideoView
                player={player}
                style={styles.video}
                nativeControls={false}
                contentFit="contain"
                fullscreenOptions={{ enable: false }}
              />
            </View>

            {/* Spacer to push content down - responsive based on screen height */}
            <View style={{ height: SCREEN_HEIGHT * 0.35 }} />

            {/* Auth Toggle - Shared Component */}
            <AuthToggle
              isSignInMode={isSignInMode}
              onToggle={(mode) => {
                Haptics.selectionAsync()
                setIsSignInMode(mode === 'signin')
              }}
            />

            {/* Dotted Line Divider */}
            <View style={styles.dottedLineContainer}>
              <View style={styles.dottedLine} />
            </View>

            {/* Social Sign In Buttons */}
            <View style={styles.socialButtonsContainer}>
              <AppleSignInButton
                onPress={() => {
                  // Track method selection
                  analyticsService.trackAuthMethodSelected({
                    screen: 'archives_auth',
                    auth_method: 'apple',
                    mode: isSignInMode ? 'signin' : 'signup',
                  })
                }}
                onSuccess={async (isNewUser: boolean) => {
                  setIsLoading(false)
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

                  // Track success
                  analyticsService.trackAuthSucceeded({
                    screen: 'archives_auth',
                    auth_method: 'apple',
                    mode: isSignInMode ? 'signin' : 'signup',
                    is_new_user: isNewUser,
                  })

                  setExitAction('authenticated')
                  await onContinue()
                }}
                onError={(error) => {
                  setIsLoading(false)
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)

                  // Track failure
                  analyticsService.trackAuthFailed({
                    screen: 'archives_auth',
                    auth_method: 'apple',
                    mode: isSignInMode ? 'signin' : 'signup',
                    error_message: error.message || 'Apple Sign In failed',
                  })

                  setErrorMessage('Apple Sign In failed. Please try again.')
                  setShowError(true)
                  AppLogger.error('auth', 'Apple Sign In error', { mode: isSignInMode ? 'signin' : 'signup' }, error)
                }}
              />

              <GoogleSignInButton
                onPress={() => {
                  // Track method selection
                  analyticsService.trackAuthMethodSelected({
                    screen: 'archives_auth',
                    auth_method: 'google',
                    mode: isSignInMode ? 'signin' : 'signup',
                  })
                }}
                onSuccess={async (isNewUser: boolean) => {
                  setIsLoading(false)
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

                  // Track success
                  analyticsService.trackAuthSucceeded({
                    screen: 'archives_auth',
                    auth_method: 'google',
                    mode: isSignInMode ? 'signin' : 'signup',
                    is_new_user: isNewUser,
                  })

                  setExitAction('authenticated')
                  await onContinue()
                }}
                onError={(error) => {
                  setIsLoading(false)
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)

                  // Track failure
                  analyticsService.trackAuthFailed({
                    screen: 'archives_auth',
                    auth_method: 'google',
                    mode: isSignInMode ? 'signin' : 'signup',
                    error_message: error.message || 'Google Sign In failed',
                  })

                  setErrorMessage('Google Sign In failed. Please try again.')
                  setShowError(true)
                  AppLogger.error('auth', 'Google Sign In error', { mode: isSignInMode ? 'signin' : 'signup' }, error)
                }}
              />

              {/* Continue with Email Button */}
              <TouchableOpacity
                style={styles.emailButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

                  // Track method selection
                  analyticsService.trackAuthMethodSelected({
                    screen: 'archives_auth',
                    auth_method: 'email',
                    mode: isSignInMode ? 'signin' : 'signup',
                  })

                  setExitAction('authenticated') // User continuing auth flow
                  router.push({
                    pathname: '/(auth)/email-details',
                    params: { mode: isSignInMode ? 'signin' : 'signup' }
                  })
                }}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={ArchivesTheme.colors.mutedNavy}
                  style={styles.buttonIcon}
                />
                <Text style={styles.emailButtonText}>Continue with Email</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom spacing */}
            <View style={styles.bottomSpacer} />
          </View>
        </ScrollView>
        </SafeAreaView>
      </View>
    </View>
  )
}

// EXACT REPLICA STYLES - Pixel-perfect match to SwiftUI design
const styles = StyleSheet.create({
  absoluteContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  solidBackground: {
    flex: 1,
    backgroundColor: ArchivesTheme.colors.creamWhite,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  gradientContainer: {
    flex: 1,
    width: '100%',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    width: '100%',
  },
  
  // Header styles (exact replica)
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 40,
    paddingHorizontal: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ArchivesTheme.colors.shoeBrown,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  titleContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    flex: 1,
    paddingLeft: 10,
  },
  titleText: {
    fontFamily: 'DM Sans',
    fontWeight: '600',
    fontSize: 22,
    color: ArchivesTheme.colors.mutedNavy,
  },
  spacer: {
    width: 40,
  },

  // Video container - responsive positioning
  videoContainer: {
    position: 'absolute',
    top: -SCREEN_HEIGHT * 0.15, // Responsive offset (~15% of screen height)
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
    pointerEvents: 'none',
  },
  video: {
    width: SCREEN_WIDTH * 1.8,   // Scale with screen width
    height: SCREEN_WIDTH * 1.8,  // Keep square aspect ratio
    backgroundColor: 'transparent',
  },

  // Secondary button (exact replica)
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: ArchivesTheme.colors.mutedNavy + '25', // 15% opacity
    shadowColor: ArchivesTheme.colors.shoeBrown,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  secondaryButtonDisabled: {
    opacity: 0.6,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
  },

  // Dotted line divider
  dottedLineContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  dottedLine: {
    borderStyle: 'solid',
    borderWidth: 0.5,
    borderColor: ArchivesTheme.colors.mutedNavy + '40',
  },

  // Social buttons container (exact replica)
  socialButtonsContainer: {
    paddingHorizontal: 20,
    marginBottom: 40,
    gap: 12,
  },

  // Email button (Continue with Email)
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 28,
    backgroundColor: 'white',
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: ArchivesTheme.colors.mutedNavy + '25',
    shadowColor: ArchivesTheme.colors.shoeBrown,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
  },
  buttonIcon: {
    marginRight: 16,
  },

  // Bottom spacing
  bottomSpacer: {
    height: 40,
  },
})