import { useSignIn } from '@clerk/clerk-expo'
import { Link, useRouter } from 'expo-router'
import { Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native'
import React from 'react'
import { AppleSignInButton } from '@/components/AppleSignInButton'
import { useAnalytics } from '@/hooks/useAnalytics'

export default function Page() {
  const { signIn, setActive, isLoaded } = useSignIn()
  const router = useRouter()
  const { identifyUser, trackScreenView } = useAnalytics()

  const [emailAddress, setEmailAddress] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')

  // Track screen view when component mounts
  React.useEffect(() => {
    trackScreenView('Sign In Page')
  }, [trackScreenView])

  // Handle the submission of the sign-in form
  const onSignInPress = async () => {
    if (!isLoaded) return
    
    setError('')
    
    // Validation
    if (!emailAddress.trim()) {
      setError('Please enter your email address')
      return
    }
    if (!password.trim()) {
      setError('Please enter your password')
      return
    }

    // Start the sign-in process using the email and password provided
    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      })

      // If sign-in process is complete, set the created session as active
      // and redirect the user
      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId })
        // Identify user for analytics
        identifyUser()
        router.replace('/')
      } else {
        // If the status isn't complete, check why. User might need to
        // complete further steps.
        setError('Sign in incomplete. Please try again.')
        console.error(JSON.stringify(signInAttempt, null, 2))
      }
    } catch (err: any) {
      // Display user-friendly error messages
      if (err.errors && err.errors[0]) {
        const clerkError = err.errors[0]
        if (clerkError.code === 'form_identifier_not_found') {
          setError('Account not found. Please check your email or sign up for a new account.')
        } else if (clerkError.code === 'form_password_incorrect') {
          setError('Incorrect password. Please try again.')
        } else if (clerkError.code === 'form_param_nil' && clerkError.meta?.paramName === 'password') {
          setError('Please enter your password.')
        } else {
          setError(clerkError.longMessage || clerkError.message || 'An error occurred during sign in')
        }
      } else {
        setError('An error occurred during sign in. Please try again.')
      }
      console.error(JSON.stringify(err, null, 2))
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Sign in to your account</Text>
      
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        value={emailAddress}
        placeholder="Email Address"
        keyboardType="email-address"
        autoComplete="email"
        onChangeText={(emailAddress) => setEmailAddress(emailAddress)}
      />
      <TextInput
        style={styles.input}
        value={password}
        placeholder="Password"
        secureTextEntry={true}
        autoComplete="current-password"
        onChangeText={(password) => setPassword(password)}
      />
      <TouchableOpacity style={styles.button} onPress={onSignInPress}>
        <Text style={styles.buttonText}>Sign In</Text>
      </TouchableOpacity>
      
      <View style={styles.dividerContainer}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.divider} />
      </View>
      
      <AppleSignInButton 
        onSuccess={() => router.replace('/')}
        onError={(error) => setError(error)}
      />
      
      <View style={styles.linkContainer}>
        <Text style={styles.linkText}>Don&apos;t have an account? </Text>
        <Link href="/sign-up">
          <Text style={styles.link}>Sign up</Text>
        </Link>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  linkText: {
    fontSize: 16,
    color: '#666',
  },
  link: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#666',
    fontSize: 14,
  },
})