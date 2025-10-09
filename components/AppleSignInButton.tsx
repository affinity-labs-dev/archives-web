import React from 'react'
import { TouchableOpacity, Text, StyleSheet, Alert, View, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
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

interface AppleSignInButtonProps {
  onSuccess?: () => void
  onError?: (error: string) => void
}

export const AppleSignInButton: React.FC<AppleSignInButtonProps> = ({
  onSuccess = () => {},
  onError = () => {},
}) => {
  console.log('🍎 AppleSignInButton: Component is rendering!')
  useWarmUpBrowser()
  
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_apple' })
  const { setActive } = useSessionList()
  const { signUp, setActive: setActiveSignUp } = useSignUp()
  const [isLoading, setIsLoading] = React.useState(false)
  const [showNameCollection, setShowNameCollection] = React.useState(false)
  const [incompleteSignUp, setIncompleteSignUp] = React.useState<any>(null)
  const [userEmail, setUserEmail] = React.useState<string | undefined>(undefined)

  const onPress = React.useCallback(async () => {
    try {
      setIsLoading(true)
      
      console.log('Starting Apple OAuth flow...')

      const redirectUrl = Linking.createURL('sso-callback');
      console.log('🔍 DEBUG: Redirect URL being sent:', redirectUrl);

      const { createdSessionId, signIn, signUp } = await startOAuthFlow({
        redirectUrl: redirectUrl,
      })

      console.log('Apple OAuth result:', { createdSessionId, signIn, signUp })

      if (createdSessionId) {
        console.log('Setting active session:', createdSessionId)
        if (setActive && typeof setActive === 'function') {
          await setActive({ session: createdSessionId })
        }

        // Track session login
        analyticsService.trackUserSessionIn('apple')

        onSuccess()
      } else {
        // Handle additional steps like MFA if needed
        if (signIn?.status === 'complete') {
          console.log('Sign in complete, setting session')
          if (setActive && typeof setActive === 'function' && signIn.createdSessionId) {
            await setActive({ session: signIn.createdSessionId })
          }

          // Track session login
          analyticsService.trackUserSessionIn('apple')

          onSuccess()
        } else if (signUp?.status === 'complete') {
          console.log('Sign up complete, setting session')
          if (setActive && typeof setActive === 'function' && signUp.createdSessionId) {
            await setActive({ session: signUp.createdSessionId })
          }

          // Track user sign up - get user ID from signUp object
          const userId = signUp.createdUserId || signUp.id
          if (userId) {
            analyticsService.trackUserSignedUp(userId, {
              sign_up_method: 'apple',
            })
          }

          onSuccess()
        } else if (signUp?.status === 'missing_requirements') {
          // Handle missing name requirements from Apple Sign In
          console.log('Sign up missing requirements - showing name collection modal')
          console.log('SignUp object:', signUp)
          
          // Extract user email from sign up attempt
          const email = signUp?.emailAddress || signUp?.primaryEmailAddress?.emailAddress
          setUserEmail(email)
          setIncompleteSignUp(signUp)
          setShowNameCollection(true)
          setIsLoading(false) // Stop loading state to show modal
          return // Don't proceed with error handling
        } else {
          console.log('OAuth incomplete:', { signIn: signIn?.status, signUp: signUp?.status })
          const errorMsg = 'Authentication incomplete. Please try again.'
          onError(errorMsg)
          Alert.alert('Authentication Error', errorMsg)
        }
      }
    } catch (err: any) {
      console.error('Apple OAuth error:', err)
      
      // Handle specific Clerk errors with improved messages
      if (err.errors && err.errors[0]) {
        const clerkError = err.errors[0]
        console.log('Clerk error details:', clerkError)
        
        if (clerkError.code === 'oauth_access_denied') {
          const errorMsg = 'Apple sign-in was cancelled.'
          onError(errorMsg)
          // Don't show alert for user cancellation
        } else if (clerkError.code === 'session_exists') {
          console.log('User already authenticated - calling onSuccess')
          onSuccess() // User is already signed in, treat as success
          return // Don't show error alert
        } else if (clerkError.code === 'strategy_for_user_invalid') {
          const errorMsg = 'Apple sign-in is not available for this account. Try signing in with email and password instead.'
          onError(errorMsg)
          Alert.alert('Sign In Error', errorMsg)
        } else if (clerkError.code === 'oauth_invalid_request') {
          const errorMsg = 'There was a problem with Apple sign-in configuration. Please try again or use email sign-in.'
          onError(errorMsg)
          Alert.alert('Configuration Error', errorMsg)
        } else if (clerkError.code === 'identifier_already_signed_up') {
          const errorMsg = 'An account with this Apple ID already exists. Please sign in instead.'
          onError(errorMsg)
          Alert.alert('Account Exists', errorMsg)
        } else if (clerkError.message?.includes('missing_requirements')) {
          const errorMsg = 'Additional information needed to complete sign-up.'
          onError(errorMsg)
          // This should be handled above, but just in case
        } else {
          const errorMsg = clerkError.longMessage || clerkError.message || 'Apple sign-in failed'
          onError(errorMsg)
          Alert.alert('Apple Sign In Error', errorMsg)
        }
      } else {
        const errorMsg = 'Failed to sign in with Apple. Please try again or use email sign-in.'
        onError(errorMsg)
        Alert.alert('Sign In Error', errorMsg)
      }
    } finally {
      setIsLoading(false)
    }
  }, [startOAuthFlow, setActive, onSuccess, onError])

  // Handle name collection submission
  const handleNameSubmission = React.useCallback(async (firstName: string, lastName: string) => {
    try {
      console.log('Completing sign up with name data:', { firstName, lastName })
      
      if (!incompleteSignUp) {
        throw new Error('No incomplete sign up found')
      }

      // Update the sign up with the provided name information
      const result = await incompleteSignUp.update({
        firstName,
        lastName,
      })

      console.log('Sign up update result:', result)

      if (result.status === 'complete' && result.createdSessionId) {
        console.log('Sign up completed successfully with provided names')
        if (setActive && typeof setActive === 'function') {
          await setActive({ session: result.createdSessionId })
        }

        // Track user sign up - get user ID from result
        const userId = result.createdUserId || result.id
        if (userId) {
          analyticsService.trackUserSignedUp(userId, {
            sign_up_method: 'apple',
          })
        }

        setShowNameCollection(false)
        setIncompleteSignUp(null)
        setUserEmail(undefined)
        onSuccess()
      } else {
        console.log('Sign up still incomplete after name update:', result.status)
        throw new Error('Unable to complete sign up. Please try again.')
      }
    } catch (error: any) {
      console.error('Name submission error:', error)
      throw new Error(error.message || 'Failed to complete sign up')
    }
  }, [incompleteSignUp, setActive, onSuccess])

  // Handle name collection cancellation
  const handleNameCollectionCancel = React.useCallback(() => {
    setShowNameCollection(false)
    setIncompleteSignUp(null)
    setUserEmail(undefined)
    onError('Sign up cancelled')
  }, [onError])

  return (
    <>
      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={onPress}
        disabled={isLoading}
      >
        <View style={styles.buttonContent}>
          <Ionicons name="logo-apple" size={18} color={ArchivesTheme.colors.mutedNavy} style={styles.buttonIcon} />
          <Text style={styles.buttonText}>
            {isLoading ? 'Signing in...' : 'Continue with Apple'}
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