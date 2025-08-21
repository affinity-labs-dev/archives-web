// Exact replica of Archives Affinity Labs SwiftUI SignUpOrSignInView
// Porting pixel-perfect design with Clerk authentication

import React, { useState } from 'react'
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet,
  SafeAreaView,
  Image,
  StatusBar
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSignIn, useSignUp } from '@clerk/clerk-expo'
import ArchivesTheme from '@/constants/ArchivesTheme'
import { AppleSignInButton } from '@/components/AppleSignInButton'

export default function ArchivesAuthScreen() {
  // Get route parameters
  const { mode } = useLocalSearchParams()
  
  // State management (exact replica of SwiftUI)
  const [isSignInMode, setIsSignInMode] = useState(mode === 'signin') // Set based on route parameter
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
    router.back()
  }

  const onContinue = () => {
    router.replace('/')
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
        onContinue()
      } else {
        // Handle email verification or other steps
        onContinue() // For now, proceed anyway
      }
    } catch (err: any) {
      setIsLoading(false)
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
        onContinue()
      } else {
        setIsLoading(false)
        setErrorMessage('Sign in incomplete. Please try again.')
        setShowError(true)
      }
    } catch (err: any) {
      setIsLoading(false)
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
        <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            {/* Header with back button and logo (EXACT REPLICA) */}
            <View style={styles.headerContainer}>
              <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Ionicons name="arrow-back" size={20} color={ArchivesTheme.colors.shoeBrown} />
              </TouchableOpacity>

              <View style={styles.logoContainer}>
                <Image 
                  source={require('@/assets/images/archives-logo-dark.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.spacer} />
            </View>

            {/* Enhanced Toggle with card design (EXACT REPLICA) */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleCard,
                  !isSignInMode && styles.toggleCardActive
                ]}
                onPress={() => setIsSignInMode(false)}
              >
                <Ionicons 
                  name="person-add-outline" 
                  size={20} 
                  color={!isSignInMode ? ArchivesTheme.colors.persianOrange : ArchivesTheme.colors.mutedNavy + '80'}
                  style={styles.toggleIcon}
                />
                <Text style={[
                  styles.toggleText,
                  { color: !isSignInMode ? ArchivesTheme.colors.shoeBrown : ArchivesTheme.colors.mutedNavy + 'B3' }
                ]}>
                  Sign Up
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toggleCard,
                  isSignInMode && styles.toggleCardActive
                ]}
                onPress={() => setIsSignInMode(true)}
              >
                <Ionicons 
                  name="person-outline" 
                  size={20} 
                  color={isSignInMode ? ArchivesTheme.colors.persianOrange : ArchivesTheme.colors.mutedNavy + '80'}
                  style={styles.toggleIcon}
                />
                <Text style={[
                  styles.toggleText,
                  { color: isSignInMode ? ArchivesTheme.colors.shoeBrown : ArchivesTheme.colors.mutedNavy + 'B3' }
                ]}>
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form fields (EXACT REPLICA) */}
            <View style={styles.formContainer}>
              {/* First Name and Last Name Fields (only for Sign Up) */}
              {!isSignInMode && (
                <>
                  <View style={styles.nameRowContainer}>
                    <View style={[styles.fieldContainer, styles.nameFieldContainer]}>
                      <Text style={styles.fieldLabel}>First Name</Text>
                      <View style={styles.inputContainer}>
                        <Ionicons name="person" size={20} color={ArchivesTheme.colors.mutedNavy + '99'} style={styles.inputIcon} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="John"
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
                          placeholder="Doe"
                          value={lastName}
                          onChangeText={setLastName}
                          autoCapitalize="words"
                          autoComplete="family-name"
                        />
                      </View>
                    </View>
                  </View>
                </>
              )}

              {/* Email Field */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Your Email Address</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail" size={20} color={ArchivesTheme.colors.mutedNavy + '99'} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="explorer@archives.com"
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
                <Text style={styles.fieldLabel}>Password</Text>
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
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons 
                      name={showPassword ? "eye-off" : "eye"} 
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
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <Ionicons 
                        name={showConfirmPassword ? "eye-off" : "eye"} 
                        size={20} 
                        color={ArchivesTheme.colors.mutedNavy + '99'} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Enhanced Action Button (EXACT REPLICA) */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (isLoading || !email.trim() || !password.trim() || (!isSignInMode && (!firstName.trim() || !lastName.trim()))) && styles.primaryButtonDisabled
              ]}
              onPress={() => isSignInMode ? signInUser() : signUpUser()}
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

            {/* Error message display (EXACT REPLICA) */}
            {showError && (
              <Text style={styles.errorText}>{errorMessage}</Text>
            )}

            {/* Enhanced OR divider (EXACT REPLICA) */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Apple Sign In Button (EXACT REPLICA) */}
            <View style={styles.appleButtonContainer}>
              <AppleSignInButton
                onSuccess={() => {
                  setIsLoading(false)
                  onContinue()
                }}
                onError={(error) => {
                  setIsLoading(false)
                  setErrorMessage('Apple Sign In failed. Please try again.')
                  setShowError(true)
                  console.error('Apple Sign In Error:', error)
                }}
              />
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
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    height: 40,
    width: 120,
  },
  spacer: {
    width: 40,
  },

  // Toggle container (exact replica)
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 40,
    gap: 8,
    paddingHorizontal: 12,
  },
  toggleCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: ArchivesTheme.colors.shoeBrown,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  toggleCardActive: {
    borderColor: ArchivesTheme.colors.persianOrange,
    backgroundColor: 'white',
    shadowColor: ArchivesTheme.colors.persianOrange,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  toggleIcon: {
    marginBottom: 8,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Form container (exact replica)
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
    borderColor: ArchivesTheme.colors.mutedNavy + '20', // 12% opacity
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

  // Primary button (exact replica)
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

  // Error text (exact replica)
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },

  // Divider (exact replica)
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: ArchivesTheme.colors.mutedNavy + '25', // 15% opacity
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '500',
    color: ArchivesTheme.colors.mutedNavy + '80', // 50% opacity
    marginHorizontal: 16,
    backgroundColor: ArchivesTheme.colors.creamWhite,
    paddingHorizontal: 8,
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

  // Apple button container (exact replica)
  appleButtonContainer: {
    paddingHorizontal: 32,
    marginBottom: 40,
  },

  // Bottom spacing
  bottomSpacer: {
    height: 40,
  },
})