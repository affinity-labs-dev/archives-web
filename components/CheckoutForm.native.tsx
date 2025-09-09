import React, { useState } from 'react'
import { View, Button, Alert } from 'react-native'
import { useStripe } from '@stripe/stripe-react-native'
import * as Linking from 'expo-linking'

interface CheckoutFormProps {
  amount: number
}

export default function CheckoutForm({ amount }: CheckoutFormProps) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe()
  const [loading, setLoading] = useState(false)

  const fetchPaymentSheetParams = async () => {
    const response = await fetch('/api/payment-sheet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
      }),
    })
    
    const { paymentIntent, ephemeralKey, customer, publishableKey } = await response.json()
    
    return {
      paymentIntent,
      ephemeralKey,
      customer,
      publishableKey,
    }
  }

  const initializePaymentSheet = async () => {
    const {
      paymentIntent,
      ephemeralKey,
      customer,
    } = await fetchPaymentSheetParams()

    const { error } = await initPaymentSheet({
      merchantDisplayName: 'Archives App',
      customerId: customer,
      customerEphemeralKeySecret: ephemeralKey,
      paymentIntentClientSecret: paymentIntent,
      allowsDelayedPaymentMethods: true,
      defaultBillingDetails: {
        name: 'Jane Doe',
      },
      returnURL: Linking.createURL('stripe-redirect'),
      applePay: {
        merchantCountryCode: 'GB',
      },
    })

    if (!error) {
      setLoading(true)
    }
  }

  const openPaymentSheet = async () => {
    const { error } = await presentPaymentSheet()

    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message)
    } else {
      Alert.alert('Success', 'Your order is confirmed!')
    }
  }

  return (
    <View>
      <Button
        title="Init Payment"
        onPress={initializePaymentSheet}
        disabled={loading}
      />
      <Button
        title="Open Payment Sheet"
        onPress={openPaymentSheet}
        disabled={!loading}
      />
    </View>
  )
}