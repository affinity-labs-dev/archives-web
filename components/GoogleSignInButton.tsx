import React from 'react'
import { TouchableOpacity, Text, StyleSheet, Alert, View, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { useOAuth, useSessionList, useSignUp, useUser } from '@clerk/clerk-expo'
import ArchivesTheme from '@/constants/ArchivesTheme'
import { NameCollectionModal } from './NameCollectionModal'
import { analyticsService } from '@/services/AnalyticsService'

// Warm up the browser for better UX
export const useWarmUpBrowser = () => {
  React.useEffect(() => {
    void WebBrowser.warmUpAsync()
    return () => {
      void WebBrowser.coolDownAsync()
    }
  }, [])
}

interface GoogleSignInButtonProps {
  onPress?: () => void
  onSuccess?: (isNewUser: boolean) => void
  onError?: (error: { message: string }) => void
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onPress: onPressCallback = () => {},
  onSuccess = () => {},
  onError = () => {},
}) => {
  useWarmUpBrowser()

  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' })
  const { setActive } = useSessionList()
  const { signUp, setActive: setActiveSignUp } = useSignUp()
  const [isLoading, setIsLoading] = React.useState(false)
  const [showNameCollection, setShowNameCollection] = React.useState(false)
  const [incompleteSignUp, setIncompleteSignUp] = React.useState<any>(null)
  const [userEmail, setUserEmail] = React.useState<string | undefined>(undefined)

  const onPress = React.useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Call onPress callback for tracking
    onPressCallback()

    try {
      setIsLoading(true)

      const redirectUrl = Linking.createURL('sso-callback');
      const { createdSessionId, signIn, signUp } = await startOAuthFlow({
        redirectUrl: redirectUrl,
      })

      if (createdSessionId) {
        if (setActive && typeof setActive === 'function') {
          await setActive({ session: createdSessionId })
        }

        // Track session login
        analyticsService.trackUserSessionIn('google')

        onSuccess(false) // Existing session = not a new user
      } else {
        // Handle additional steps like MFA if needed
        if (signIn?.status === 'complete') {
          if (setActive && typeof setActive === 'function' && signIn.createdSessionId) {
            await setActive({ session: signIn.createdSessionId })
          }

          // Track session login
          analyticsService.trackUserSessionIn('google')

          onSuccess(false) // Sign in = not a new user
        } else if (signUp?.status === 'complete') {
          if (setActive && typeof setActive === 'function' && signUp.createdSessionId) {
            await setActive({ session: signUp.createdSessionId })
          }

          // Track user sign up - get user ID from signUp object
          const userId = signUp.createdUserId || signUp.id
          if (userId) {
            analyticsService.trackUserSignedUp(userId, {
              sign_up_method: 'google',
            })
          }

          onSuccess(true) // Sign up = new user
        } else if (signUp?.status === 'missing_requirements') {
          // Handle missing name requirements from Google Sign In
          // Extract user email from sign up attempt
          const email = signUp?.emailAddress ?? undefined
          setUserEmail(email)
          setIncompleteSignUp(signUp)
          setShowNameCollection(true)
          setIsLoading(false) // Stop loading state to show modal
          return // Don't proceed with error handling
        } else {
          const errorMsg = 'Authentication incomplete. Please try again.'
          onError({ message: errorMsg })
          Alert.alert('Authentication Error', errorMsg)
        }
      }
    } catch (err: any) {
      // Handle specific Clerk errors with improved messages
      if (err.errors && err.errors[0]) {
        const clerkError = err.errors[0]

        if (clerkError.code === 'oauth_access_denied') {
          const errorMsg = 'Google sign-in was cancelled.'
          onError({ message: errorMsg })
          // Don't show alert for user cancellation
        } else if (clerkError.code === 'session_exists') {
          onSuccess(false) // User is already signed in, treat as success
          return // Don't show error alert
        } else if (clerkError.code === 'strategy_for_user_invalid') {
          const errorMsg = 'Google sign-in is not available for this account. Try signing in with email and password instead.'
          onError({ message: errorMsg })
          Alert.alert('Sign In Error', errorMsg)
        } else if (clerkError.code === 'oauth_invalid_request') {
          const errorMsg = 'There was a problem with Google sign-in configuration. Please try again or use email sign-in.'
          onError({ message: errorMsg })
          Alert.alert('Configuration Error', errorMsg)
        } else if (clerkError.code === 'identifier_already_signed_up') {
          const errorMsg = 'An account with this Google email already exists. Please sign in instead.'
          onError({ message: errorMsg })
          Alert.alert('Account Exists', errorMsg)
        } else if (clerkError.message?.includes('missing_requirements')) {
          const errorMsg = 'Additional information needed to complete sign-up.'
          onError({ message: errorMsg })
          // This should be handled above, but just in case
        } else {
          const errorMsg = clerkError.longMessage || clerkError.message || 'Google sign-in failed'
          onError({ message: errorMsg })
          Alert.alert('Google Sign In Error', errorMsg)
        }
      } else {
        const errorMsg = 'Failed to sign in with Google. Please try again or use email sign-in.'
        onError({ message: errorMsg })
        Alert.alert('Sign In Error', errorMsg)
      }
    } finally {
      setIsLoading(false)
    }
  }, [startOAuthFlow, setActive, onSuccess, onError, onPressCallback])

  // Handle name collection submission
  const handleNameSubmission = React.useCallback(async (firstName: string, lastName: string) => {
    try {
      if (!incompleteSignUp) {
        throw new Error('No incomplete sign up found')
      }

      // Update the sign up with the provided name information
      const result = await incompleteSignUp.update({
        firstName,
        lastName,
      })

      if (result.status === 'complete' && result.createdSessionId) {
        if (setActive && typeof setActive === 'function') {
          await setActive({ session: result.createdSessionId })
        }

        // Track user sign up - get user ID from result
        const userId = result.createdUserId || result.id
        if (userId) {
          analyticsService.trackUserSignedUp(userId, {
            sign_up_method: 'google',
          })
        }

        setShowNameCollection(false)
        setIncompleteSignUp(null)
        setUserEmail(undefined)
        onSuccess(true) // Name collection completion = new user
      } else {
        throw new Error('Unable to complete sign up. Please try again.')
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to complete sign up')
    }
  }, [incompleteSignUp, setActive, onSuccess])

  // Handle name collection cancellation
  const handleNameCollectionCancel = React.useCallback(() => {
    setShowNameCollection(false)
    setIncompleteSignUp(null)
    setUserEmail(undefined)
    onError({ message: 'Sign up cancelled' })
  }, [onError])

  return (
    <>
      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={onPress}
        disabled={isLoading}
      >
        <View style={styles.buttonContent}>
          <Ionicons name="logo-google" size={18} color={ArchivesTheme.colors.mutedNavy} style={styles.buttonIcon} />
          <Text style={styles.buttonText}>
            {isLoading ? 'Signing in...' : 'Continue with Google'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Name Collection Modal */}
      <NameCollectionModal
        isVisible={showNameCollection}
        onSubmit={handleNameSubmission}
        onCancel={handleNameCollectionCancel}
        userEmail={userEmail}
      />
    </>
  )
}

const styles = StyleSheet.create({
  button: {
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
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 8,
  },
  buttonIcon: {
    marginRight: 16,
    width: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
  },
})