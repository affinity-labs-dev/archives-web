import { Redirect, Stack } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'
import AppLogger from '@/services/AppLogger'

export default function AuthRoutesLayout() {
  const { isSignedIn } = useAuth()

  if (isSignedIn) {
    AppLogger.info('auth', 'AuthLayout: user already signed in, redirecting to today tab')
    return <Redirect href={'/(tabs)/today'} />
  }

  return (
    <Stack>
      <Stack.Screen
        name="archives-auth"
        options={{
          headerShown: false,
          gestureEnabled: true
        }}
      />
      <Stack.Screen
        name="email-details"
        options={{
          headerShown: false,
          gestureEnabled: true
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          headerShown: false,
          gestureEnabled: true
        }}
      />
      <Stack.Screen
        name="reset-password"
        options={{
          headerShown: false,
          gestureEnabled: true
        }}
      />
      <Stack.Screen name="sign-in" options={{ headerShown: true }} />
      <Stack.Screen name="sign-up" options={{ headerShown: true }} />
    </Stack>
  )
}