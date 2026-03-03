// Email Details Screen - Sign Up or Sign In with email/password
// Shows different fields based on mode (signup vs signin)

import { AuthToggle } from '@/components/AuthToggle'
import ArchivesTheme from '@/constants/ArchivesTheme'
import { useSignIn, useSignUp } from '@clerk/clerk-expo'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { analyticsService } from '@/services/AnalyticsService'
import * as Haptics from 'expo-haptics'

export default function EmailDetailsScreen() {
  // Get route parameters
  const { mode } = useLocalSearchParams()

  // State management
  const [isSignInMode, setIsSignInMode] = useState(mode === 'signin')
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

  // Navigation handlers
  const onBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.back()
  }

  const onContinue = async () => {
    // After authentication, go to era selection page
    router.replace('/(tabs)/eras?mode=onboarding')
  }

  // Sign Up function
  const signUpUser = async () => {
    if (!signUpLoaded) return

    // Validate inputs
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

        // Track user sign up
        const userId = signUpAttempt.createdUserId || signUpAttempt.id
        if (userId) {
          analyticsService.trackUserSignedUp(userId, {
            sign_up_method: 'email',
          })
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        }

        await onContinue()
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        await onContinue()
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

  // Sign In function
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

        // Track session login
        analyticsService.trackUserSessionIn('email')
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

  // Validation function
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
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={0}
          >
            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ flexGrow: 1 }}
            >
              <View style={styles.container}>
              {/* Header with back button */}
              <View style={styles.headerContainer}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={20} color={ArchivesTheme.colors.shoeBrown} />
                </TouchableOpacity>

                <View style={styles.titleContainer}>
                  <Text style={styles.headerTitle}>
                    {isSignInMode ? 'Welcome Back' : 'Complete Profile'}
                  </Text>
                </View>

                <View style={styles.spacer} />
              </View>

              {/* Auth Toggle - Shared Component */}
              <AuthToggle
                isSignInMode={isSignInMode}
                onToggle={(mode) => {
          Haptics.selectionAsync()
                  setIsSignInMode(mode === 'signin')
                  // Clear errors when switching modes
                  setErrorMessage('')
                  setShowError(false)
                }}
              />

              {/* Form fields */}
              <View style={styles.formContainer}>
                {/* First Name and Last Name Fields (only for Sign Up) */}
                {!isSignInMode && (
                  <View style={styles.nameRowContainer}>
                    <View style={[styles.fieldContainer, styles.nameFieldContainer]}>
                      <Text style={styles.fieldLabel}>First Name</Text>
                      <View style={styles.inputContainer}>
                        <Ionicons name="person" size={20} color={ArchivesTheme.colors.mutedNavy + '99'} style={styles.inputIcon} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="Basel"
                          value={firstName}
                          onChangeText={setFirstName}
                          autoCapitalize="words"
                          autoComplete="given-name"
                        />
                      </View>
                    </View>

                    <View style={[styles.fieldContainer, styles.nameFieldContainer]}>
                      <Text style={styles.fieldLabel}>Last Name</Text>
                      <View style={styles.inputContainer}>
                        <Ionicons name="person" size={20} color={ArchivesTheme.colors.mutedNavy + '99'} style={styles.inputIcon} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="Ghazi"
                          value={lastName}
                          onChangeText={setLastName}
                          autoCapitalize="words"
                          autoComplete="family-name"
                        />
                      </View>
                    </View>
                  </View>
                )}

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
                    />
                  </View>
                </View>

                {/* Password Field */}
                <View style={styles.fieldContainer}>
                  <View style={styles.passwordLabelContainer}>
                    <Text style={styles.fieldLabel}>Password</Text>
                    {isSignInMode && (
                      <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed" size={20} color={ArchivesTheme.colors.mutedNavy + '99'} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter your password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoComplete="password"
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

                {/* Confirm Password Field (only for Sign Up) */}
                {!isSignInMode && (
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Confirm Password</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="lock-closed" size={20} color={ArchivesTheme.colors.mutedNavy + '99'} style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        autoComplete="password"
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
                )}
              </View>

              {/* Action Button */}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (isLoading || !email.trim() || !password.trim() || (!isSignInMode && (!firstName.trim() || !lastName.trim()))) && styles.primaryButtonDisabled
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                  isSignInMode ? signInUser() : signUpUser()
                }}
                disabled={isLoading || !email.trim() || !password.trim() || (!isSignInMode && (!firstName.trim() || !lastName.trim()))}
              >
                <Ionicons
                  name={isSignInMode ? "arrow-forward-circle" : "person-add"}
                  size={20}
                  color="white"
                  style={styles.buttonIcon}
                />
                <Text style={styles.primaryButtonText}>
                  {isLoading ? 'Loading...' : (isSignInMode ? 'Enter the Archives' : 'Start My Journey')}
                </Text>
              </TouchableOpacity>

              {/* Error message display */}
              {showError && (
                <Text style={styles.errorText}>{errorMessage}</Text>
              )}

              {/* Bottom spacing */}
              <View style={styles.bottomSpacer} />
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
    width: '100%',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    width: '100%',
  },

  // Header styles
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
  titleContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    flex: 1,
    paddingLeft: 10,
  },
  headerTitle: {
    fontFamily: 'DM Sans',
    fontSize: 22,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
  },
  spacer: {
    width: 40,
  },

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: ArchivesTheme.colors.mutedNavy + '25',
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '500',
    color: ArchivesTheme.colors.mutedNavy + '80',
    marginHorizontal: 16,
    backgroundColor: ArchivesTheme.colors.creamWhite,
    paddingHorizontal: 8,
  },

  // Form container
  formContainer: {
    marginBottom: 28,
  },
  nameRowContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  nameFieldContainer: {
    flex: 1,
    marginBottom: 0,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  passwordLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 4,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '600',
    color: ArchivesTheme.colors.persianOrange,
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

  // Bottom spacing
  bottomSpacer: {
    height: 40,
  },
})
