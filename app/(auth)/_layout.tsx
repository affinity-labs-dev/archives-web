import { Redirect, Stack } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'

export default function AuthRoutesLayout() {
  const { isSignedIn } = useAuth()

  if (isSignedIn) {
    return <Redirect href={'/'} />
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
      <Stack.Screen name="sign-in" options={{ headerShown: true }} />
      <Stack.Screen name="sign-up" options={{ headerShown: true }} />
    </Stack>
  )
}