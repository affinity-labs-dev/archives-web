/**
 * AppleOutlineButton — cloned from `components/AppleSignInButton.tsx` for use
 * on Screen 7 of the new onboarding flow. Clerk OAuth + error mapping +
 * NameCollectionModal logic is identical to the original; only the render
 * has been swapped to the Figma outline style (via `AuthOutlineButton`).
 *
 * Keeping this file separate (instead of modifying the original) means the
 * legacy `/(auth)/archives-auth` screen's visual stays stable in production
 * while the new onboarding flow adopts the Figma look.
 */

import React from 'react'
import { Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { useOAuth, useSessionList, useSignUp } from '@clerk/clerk-expo'

import { NameCollectionModal } from '@/components/NameCollectionModal'
import { analyticsService } from '@/services/AnalyticsService'
import { colors } from '@/components/ui/theme'

import { AuthOutlineButton } from './AuthOutlineButton'

// Warm up the browser for better UX
const useWarmUpBrowser = () => {
  React.useEffect(() => {
    void WebBrowser.warmUpAsync()
    return () => {
      void WebBrowser.coolDownAsync()
    }
  }, [])
}

export interface AppleOutlineButtonProps {
  onPress?: () => void
  onSuccess?: (isNewUser: boolean) => void
  onError?: (error: { message: string }) => void
}

export const AppleOutlineButton: React.FC<AppleOutlineButtonProps> = ({
  onPress: onPressCallback = () => {},
  onSuccess = () => {},
  onError = () => {},
}) => {
  useWarmUpBrowser()

  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_apple' })
  const { setActive } = useSessionList()
  const { signUp, setActive: setActiveSignUp } = useSignUp()
  const [isLoading, setIsLoading] = React.useState(false)
  const [showNameCollection, setShowNameCollection] = React.useState(false)
  const [incompleteSignUp, setIncompleteSignUp] = React.useState<any>(null)
  const [userEmail, setUserEmail] = React.useState<string | undefined>(undefined)

  const onPress = React.useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    onPressCallback()

    try {
      setIsLoading(true)

      const redirectUrl = Linking.createURL('sso-callback')
      const { createdSessionId, signIn, signUp } = await startOAuthFlow({
        redirectUrl: redirectUrl,
      })

      if (createdSessionId) {
        if (setActive && typeof setActive === 'function') {
          await setActive({ session: createdSessionId })
        }

        const isNewUser = !!(signUp?.createdUserId)
        if (isNewUser) {
          const userId = signUp.createdUserId || signUp?.id
          if (userId) {
            analyticsService.trackUserSignedUp(userId, {
              sign_up_method: 'apple',
            })
          }
        }

        analyticsService.trackUserSessionIn('apple')

        onSuccess(isNewUser)
      } else {
        if (signIn?.status === 'complete') {
          if (setActive && typeof setActive === 'function' && signIn.createdSessionId) {
            await setActive({ session: signIn.createdSessionId })
          }

          analyticsService.trackUserSessionIn('apple')

          onSuccess(false)
        } else if (signUp?.status === 'complete') {
          if (setActive && typeof setActive === 'function' && signUp.createdSessionId) {
            await setActive({ session: signUp.createdSessionId })
          }

          const userId = signUp.createdUserId || signUp.id
          if (userId) {
            analyticsService.trackUserSignedUp(userId, {
              sign_up_method: 'apple',
            })
          }

          onSuccess(true)
        } else if (signUp?.status === 'missing_requirements') {
          const email = signUp?.emailAddress ?? undefined
          setUserEmail(email)
          setIncompleteSignUp(signUp)
          setShowNameCollection(true)
          setIsLoading(false)
          return
        } else {
          const errorMsg = 'Authentication incomplete. Please try again.'
          onError({ message: errorMsg })
          Alert.alert('Authentication Error', errorMsg)
        }
      }
    } catch (err: any) {
      if (err.errors && err.errors[0]) {
        const clerkError = err.errors[0]

        if (clerkError.code === 'oauth_access_denied') {
          const errorMsg = 'Apple sign-in was cancelled.'
          onError({ message: errorMsg })
        } else if (clerkError.code === 'session_exists') {
          onSuccess(false)
          return
        } else if (clerkError.code === 'strategy_for_user_invalid') {
          const errorMsg = 'Apple sign-in is not available for this account. Try signing in with email and password instead.'
          onError({ message: errorMsg })
          Alert.alert('Sign In Error', errorMsg)
        } else if (clerkError.code === 'oauth_invalid_request') {
          const errorMsg = 'There was a problem with Apple sign-in configuration. Please try again or use email sign-in.'
          onError({ message: errorMsg })
          Alert.alert('Configuration Error', errorMsg)
        } else if (clerkError.code === 'identifier_already_signed_up') {
          const errorMsg = 'An account with this Apple ID already exists. Please sign in instead.'
          onError({ message: errorMsg })
          Alert.alert('Account Exists', errorMsg)
        } else if (clerkError.message?.includes('missing_requirements')) {
          const errorMsg = 'Additional information needed to complete sign-up.'
          onError({ message: errorMsg })
        } else {
          const errorMsg = clerkError.longMessage || clerkError.message || 'Apple sign-in failed'
          onError({ message: errorMsg })
          Alert.alert('Apple Sign In Error', errorMsg)
        }
      } else {
        const errorMsg = 'Failed to sign in with Apple. Please try again or use email sign-in.'
        onError({ message: errorMsg })
        Alert.alert('Sign In Error', errorMsg)
      }
    } finally {
      setIsLoading(false)
    }
  }, [startOAuthFlow, setActive, onSuccess, onError, onPressCallback])

  const handleNameSubmission = React.useCallback(async (firstName: string, lastName: string) => {
    try {
      if (!incompleteSignUp) {
        throw new Error('No incomplete sign up found')
      }

      const result = await incompleteSignUp.update({
        firstName,
        lastName,
      })

      if (result.status === 'complete' && result.createdSessionId) {
        if (setActive && typeof setActive === 'function') {
          await setActive({ session: result.createdSessionId })
        }

        const userId = result.createdUserId || result.id
        if (userId) {
          analyticsService.trackUserSignedUp(userId, {
            sign_up_method: 'apple',
          })
        }

        setShowNameCollection(false)
        setIncompleteSignUp(null)
        setUserEmail(undefined)
        onSuccess(true)
      } else {
        throw new Error('Unable to complete sign up. Please try again.')
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to complete sign up')
    }
  }, [incompleteSignUp, setActive, onSuccess])

  const handleNameCollectionCancel = React.useCallback(() => {
    setShowNameCollection(false)
    setIncompleteSignUp(null)
    setUserEmail(undefined)
    onError({ message: 'Sign up cancelled' })
  }, [onError])

  return (
    <>
      <AuthOutlineButton
        label={isLoading ? 'Signing in...' : 'Continue with Apple'}
        icon={<Ionicons name="logo-apple" size={22} color={colors.onyx} />}
        onPress={onPress}
        isDisabled={isLoading}
      />

      <NameCollectionModal
        isVisible={showNameCollection}
        onSubmit={handleNameSubmission}
        onCancel={handleNameCollectionCancel}
        userEmail={userEmail}
      />
    </>
  )
}
