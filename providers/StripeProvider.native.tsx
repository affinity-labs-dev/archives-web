import React, { ReactNode } from 'react'
import { StripeProvider as StripeNativeProvider } from '@stripe/stripe-react-native'
import * as Linking from 'expo-linking'

interface StripeProviderProps {
  children: ReactNode
}

export default function StripeProvider({ children }: StripeProviderProps) {
  const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!

  if (!publishableKey) {
    throw new Error('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set')
  }

  return (
    <StripeNativeProvider
      publishableKey={publishableKey}
      urlScheme={Linking.createURL('').split('://')[0]}
    >
      {children}
    </StripeNativeProvider>
  )
}