import React from 'react'
import { TouchableOpacity, Text, StyleSheet, Alert, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { useOAuth, useSessionList } from '@clerk/clerk-expo'
import ArchivesTheme from '@/constants/ArchivesTheme'

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
  useWarmUpBrowser()
  
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_apple' })
  const { setActive } = useSessionList()
  const [isLoading, setIsLoading] = React.useState(false)

  const onPress = React.useCallback(async () => {
    try {
      setIsLoading(true)
      
      console.log('Starting Apple OAuth flow...')
      
      const { createdSessionId, signIn, signUp } = await startOAuthFlow({
        redirectUrl: Linking.createURL('/'),
      })

      console.log('Apple OAuth result:', { createdSessionId, signIn, signUp })

      if (createdSessionId) {
        console.log('Setting active session:', createdSessionId)
        if (setActive && typeof setActive === 'function') {
          await setActive({ session: createdSessionId })
        }
        onSuccess()
      } else {
        // Handle additional steps like MFA if needed
        if (signIn?.status === 'complete') {
          console.log('Sign in complete, setting session')
          if (setActive && typeof setActive === 'function' && signIn.createdSessionId) {
            await setActive({ session: signIn.createdSessionId })
          }
          onSuccess()
        } else if (signUp?.status === 'complete') {
          console.log('Sign up complete, setting session')
          if (setActive && typeof setActive === 'function' && signUp.createdSessionId) {
            await setActive({ session: signUp.createdSessionId })
          }
          onSuccess()
        } else {
          console.log('OAuth incomplete:', { signIn: signIn?.status, signUp: signUp?.status })
          const errorMsg = 'Authentication incomplete. Please try again.'
          onError(errorMsg)
          Alert.alert('Authentication Error', errorMsg)
        }
      }
    } catch (err: any) {
      console.error('Apple OAuth error:', err)
      
      // Handle specific Clerk errors
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
          const errorMsg = 'Apple sign-in is not available for this account.'
          onError(errorMsg)
          Alert.alert('Sign In Error', errorMsg)
        } else {
          const errorMsg = clerkError.longMessage || clerkError.message || 'Apple sign-in failed'
          onError(errorMsg)
          Alert.alert('Apple Sign In Error', errorMsg)
        }
      } else {
        const errorMsg = 'Failed to sign in with Apple. Please try again.'
        onError(errorMsg)
        Alert.alert('Sign In Error', errorMsg)
      }
    } finally {
      setIsLoading(false)
    }
  }, [startOAuthFlow, setActive, onSuccess, onError])

  return (
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
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
  },
})