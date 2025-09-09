import React, { ReactNode } from 'react'

interface StripeProviderProps {
  children: ReactNode
}

export default function StripeProvider({ children }: StripeProviderProps) {
  // For web, we don't need the React Native Stripe provider
  // Web payments will use Stripe checkout sessions instead
  return <>{children}</>
}