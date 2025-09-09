import React, { ReactNode } from 'react'
import { StripeProvider as StripeNativeProvider } from '@stripe/stripe-react-native'
import Constants from 'expo-constants'
import * as Linking from 'expo-linking'

interface StripeProviderProps {
  children: ReactNode
}

export default function StripeProvider({ children }: StripeProviderProps) {
  const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!

  // Get merchant identifier from app.json plugins configuration
  const merchantIdentifier = Constants.expoConfig?.plugins?.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === '@stripe/stripe-react-native'
  )?.[1]?.merchantIdentifier

  if (!publishableKey) {
    throw new Error('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set')
  }

  if (!merchantIdentifier) {
    throw new Error('Merchant identifier not found in app.json')
  }

  return (
    <StripeNativeProvider
      publishableKey={publishableKey}
      merchantIdentifier={merchantIdentifier}
      urlScheme={Linking.createURL('').split('://')[0]}
    >
      {children}
    </StripeNativeProvider>
  )
}