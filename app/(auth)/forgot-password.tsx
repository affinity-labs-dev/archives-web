// Forgot Password Screen - Request password reset code
// User enters email to receive reset code

import ArchivesTheme from '@/constants/ArchivesTheme'
import { useSignIn } from '@clerk/clerk-expo'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import * as Haptics from 'expo-haptics'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showError, setShowError] = useState(false)

  const { signIn, isLoaded } = useSignIn()
  const router = useRouter()

  const onBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.back()
  }

  const handleResetPassword = async () => {
    if (!isLoaded) return

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Validate email
    const emailRegEx = /[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,64}/
    if (!emailRegEx.test(email)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      setErrorMessage('Please enter a valid email address')
      setShowError(true)
      return
    }

    setIsLoading(true)
    setShowError(false)

    try {
      // Create password reset request
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      })

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setIsLoading(false)
      // Navigate to reset password screen with email
      router.push({
        pathname: '/(auth)/reset-password',
        params: { email }
      })
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      setIsLoading(false)
      if (err.errors && err.errors[0]) {
        setErrorMessage(err.errors[0].longMessage || err.errors[0].message)
      } else {
        setErrorMessage('Failed to send reset code. Please try again.')
      }
      setShowError(true)
    }
  }

  return (
    <View style={styles.absoluteContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={ArchivesTheme.colors.creamWhite} />
      <View style={styles.solidBackground}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View style={styles.container}>
              {/* Header */}
              <View style={styles.headerContainer}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={20} color={ArchivesTheme.colors.shoeBrown} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Reset Password</Text>
                <View style={styles.spacer} />
              </View>

              {/* Info text */}
              <Text style={styles.infoText}>
                Enter your email address and we'll send you a code to reset your password.
              </Text>

              {/* Email Field */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Your Email Address</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail" size={20} color={ArchivesTheme.colors.mutedNavy + '99'} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="basel@archiveszone.app"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoFocus
                  />
                </View>
              </View>

              {/* Error message */}
              {showError && (
                <Text style={styles.errorText}>{errorMessage}</Text>
              )}

              {/* Send Code Button */}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (isLoading || !email.trim()) && styles.primaryButtonDisabled
                ]}
                onPress={handleResetPassword}
                disabled={isLoading || !email.trim()}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="white"
                  style={styles.buttonIcon}
                />
                <Text style={styles.primaryButtonText}>
                  {isLoading ? 'Sending...' : 'Send Reset Code'}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </View>
  )
}

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
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Header
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: ArchivesTheme.colors.shoeBrown,
  },
  spacer: {
    width: 40,
  },

  // Info text
  infoText: {
    fontSize: 15,
    fontWeight: '500',
    color: ArchivesTheme.colors.mutedNavy + '99',
    marginBottom: 30,
    lineHeight: 22,
    textAlign: 'center',
  },

  // Form fields
  fieldContainer: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: ArchivesTheme.colors.mutedNavy + '20',
    shadowColor: ArchivesTheme.colors.shoeBrown,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: ArchivesTheme.colors.mutedNavy,
    paddingVertical: 0,
  },

  // Primary button
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ArchivesTheme.colors.persianOrange,
    borderRadius: 25,
    paddingVertical: 18,
    paddingHorizontal: 24,
    marginBottom: 16,
    shadowColor: ArchivesTheme.colors.persianOrange,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.15,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.3,
  },
  buttonIcon: {
    marginRight: 8,
  },

  // Error text
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
})
