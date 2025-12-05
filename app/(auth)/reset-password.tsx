// Reset Password Screen - Enter code and new password
// User enters the code received via email and sets new password

import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSignIn } from '@clerk/clerk-expo'
import ArchivesTheme from '@/constants/ArchivesTheme'
import * as Haptics from 'expo-haptics'

export default function ResetPasswordScreen() {
  const { email } = useLocalSearchParams()

  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showError, setShowError] = useState(false)

  const { signIn, setActive, isLoaded } = useSignIn()
  const router = useRouter()

  const onBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.back()
  }

  const handleResetPassword = async () => {
    if (!isLoaded) return

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Validate inputs
    if (!code.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      setErrorMessage('Please enter the verification code')
      setShowError(true)
      return
    }

    if (!newPassword.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      setErrorMessage('Please enter a new password')
      setShowError(true)
      return
    }

    if (newPassword.length < 8) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      setErrorMessage('Password must be at least 8 characters')
      setShowError(true)
      return
    }

    if (newPassword !== confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      setErrorMessage('Passwords do not match')
      setShowError(true)
      return
    }

    setIsLoading(true)
    setShowError(false)

    try {
      // Attempt to reset password with code
      const resetResult = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password: newPassword,
      })

      if (resetResult.status === 'complete') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        // Set the active session
        await setActive({ session: resetResult.createdSessionId })

        setIsLoading(false)
        // Navigate to era selection after successful reset
        router.replace('/(tabs)/eras?mode=onboarding')
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        setIsLoading(false)
        setErrorMessage('Password reset incomplete. Please try again.')
        setShowError(true)
      }
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      setIsLoading(false)
      if (err.errors && err.errors[0]) {
        setErrorMessage(err.errors[0].longMessage || err.errors[0].message)
      } else {
        setErrorMessage('Failed to reset password. Please try again.')
      }
      setShowError(true)
    }
  }

  return (
    <View style={styles.absoluteContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={ArchivesTheme.colors.creamWhite} />
      <View style={styles.solidBackground}>
        <SafeAreaView style={[styles.safeArea, Platform.OS === 'android' && { paddingTop: 20 }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
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
                  We've sent a verification code to {email}. Enter the code below and create a new password.
                </Text>

                {/* Verification Code Field */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Verification Code</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="key" size={20} color={ArchivesTheme.colors.mutedNavy + '99'} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter 6-digit code"
                      value={code}
                      onChangeText={setCode}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                    />
                  </View>
                </View>

                {/* New Password Field */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>New Password</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed" size={20} color={ArchivesTheme.colors.mutedNavy + '99'} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showPassword}
                      autoComplete="password-new"
                    />
                    <TouchableOpacity onPress={() => {
                      Haptics.selectionAsync()
                      setShowPassword(!showPassword)
                    }}>
                      <Ionicons
                        name={showPassword ? "eye" : "eye-off"}
                        size={20}
                        color={ArchivesTheme.colors.mutedNavy + '99'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password Field */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Confirm New Password</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed" size={20} color={ArchivesTheme.colors.mutedNavy + '99'} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      autoComplete="password-new"
                    />
                    <TouchableOpacity onPress={() => {
                      Haptics.selectionAsync()
                      setShowConfirmPassword(!showConfirmPassword)
                    }}>
                      <Ionicons
                        name={showConfirmPassword ? "eye" : "eye-off"}
                        size={20}
                        color={ArchivesTheme.colors.mutedNavy + '99'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Error message */}
                {showError && (
                  <Text style={styles.errorText}>{errorMessage}</Text>
                )}

                {/* Reset Password Button */}
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (isLoading || !code.trim() || !newPassword.trim() || !confirmPassword.trim()) && styles.primaryButtonDisabled
                  ]}
                  onPress={handleResetPassword}
                  disabled={isLoading || !code.trim() || !newPassword.trim() || !confirmPassword.trim()}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color="white"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.primaryButtonText}>
                    {isLoading ? 'Resetting...' : 'Reset Password'}
                  </Text>
                </TouchableOpacity>

                {/* Resend code option */}
                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    router.back()
                  }}
                >
                  <Text style={styles.resendText}>Didn't receive the code? Try again</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  scrollView: {
    flex: 1,
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
    marginBottom: 20,
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
    marginTop: 10,
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

  // Resend button
  resendButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
    color: ArchivesTheme.colors.persianOrange,
  },
})
