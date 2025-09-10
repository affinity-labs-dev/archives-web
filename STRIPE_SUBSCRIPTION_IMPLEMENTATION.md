# Stripe Subscription Implementation Guide
## Complete Overhaul from PaymentIntents to True Recurring Subscriptions

### 🎯 Executive Summary

This document provides a comprehensive implementation plan to transform the current Archives Expo payment system from **fake subscriptions using PaymentIntents** to **true Stripe Subscriptions** with proper recurring billing, Apple Pay integration, and robust subscription lifecycle management.

**Current State**: PaymentIntents with subscription metadata (one-time payments)
**Target State**: Proper Stripe Subscriptions with automatic recurring billing
**UI Change**: Single "Get Access" button with Apple Pay inside payment sheet

---

## 📋 Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Architecture Overview](#architecture-overview)
3. [Phase 1: UI/UX Simplification](#phase-1-uiux-simplification)
4. [Phase 2: True Subscriptions Implementation](#phase-2-true-subscriptions-implementation)
5. [Phase 3: Debugging System](#phase-3-debugging-system)
6. [Phase 4: Webhook Implementation](#phase-4-webhook-implementation)
7. [Phase 5: Database Schema](#phase-5-database-schema)
8. [Phase 6: Testing Strategy](#phase-6-testing-strategy)
9. [Phase 7: Production Deployment](#phase-7-production-deployment)
10. [Troubleshooting Guide](#troubleshooting-guide)

---

## 🔍 Current State Analysis

### Critical Problems Identified

#### 1. **Architectural Confusion**
```typescript
// ❌ CURRENT: PaymentIntents pretending to be subscriptions
const paymentIntent = await stripe.paymentIntents.create({
  amount: amountInCents,
  currency: 'gbp',
  metadata: {
    subscription_type: selectedPlan, // ← This is NOT a subscription!
    billing_interval: 'month',       // ← Meaningless for PaymentIntents
  }
})
```

**Problem**: Using PaymentIntents (one-time payments) with subscription metadata doesn't create recurring billing.

#### 2. **Apple Pay cartItems Error**
```typescript
// ❌ CURRENT: Wrong structure causing "cartItems cannot be null"
applePay: {
  request: {
    cartItems: [...] // ← Wrong location
  }
}
```

#### 3. **No Subscription Lifecycle Management**
- ❌ No webhooks to handle subscription events
- ❌ No database to track subscription status  
- ❌ No access control based on subscription state
- ❌ No handling of failed payments or cancellations

#### 4. **Confusing UX**
- Two separate payment buttons (confusing for users)
- Apple Pay button outside of native payment sheet
- Inconsistent payment flows

---

## 🏗️ Architecture Overview

### Current vs Target Architecture

#### Current (Broken) Flow:
```
User clicks button → PaymentIntent created → One-time payment → User charged once → Manual renewal needed
```

#### Target (Correct) Flow:
```
User clicks "Get Access" → Subscription created → Payment sheet opens → Apple Pay/Card inside sheet → Automatic recurring billing → Webhook updates access
```

### Key Components

1. **Frontend**: Single button, payment sheet with Apple Pay inside
2. **API Routes**: Subscription creation instead of PaymentIntents
3. **Webhooks**: Handle subscription lifecycle events
4. **Database**: Track subscription status and user access
5. **Access Control**: Grant/revoke features based on subscription state

---

## 🎨 Phase 1: UI/UX Simplification ✅ COMPLETED

### Objective: Single "Get Access" Button with Apple Pay Inside Payment Sheet

#### 1.1 Remove Separate Apple Pay Button ✅ COMPLETED

**File**: `components/SubscribeContent.native.tsx`

```typescript
// ❌ REMOVE: Separate Apple Pay button section
{isApplePaySupported && (
  <View style={styles.applePayContainer}>
    <PlatformPayButton
      onPress={handleApplePaySubscription}
      type={PlatformPay.ButtonType.Subscribe}
      appearance={PlatformPay.ButtonStyle.Black}
      borderRadius={25}
      style={styles.applePayButton}
      disabled={loading}
    />
    <Text style={styles.applePayHint}>...</Text>
  </View>
)}

// ❌ REMOVE: handleApplePaySubscription function entirely
const handleApplePaySubscription = async () => { ... }
```

#### 1.2 Update handleSubscribe Function ✅ COMPLETED

```typescript
// ✅ NEW: Single payment handler with Apple Pay inside sheet
const handleSubscribe = async () => {
  try {
    setLoading(true)
    
    console.log('🚀 Starting subscription for plan:', selectedPlan)
    console.log('📱 Apple Pay supported:', isApplePaySupported)
    
    // Fetch subscription parameters (not PaymentIntent!)
    const { subscriptionClientSecret, ephemeralKey, customer } = await fetchSubscriptionParams(selectedPlan)
    
    // Initialize payment sheet with Apple Pay inside
    const { error } = await initPaymentSheet({
      merchantDisplayName: 'Archives App',
      customerId: customer,
      customerEphemeralKeySecret: ephemeralKey,
      paymentIntentClientSecret: subscriptionClientSecret,
      allowsDelayedPaymentMethods: true,
      returnURL: Linking.createURL('stripe-redirect'),
      // Apple Pay configuration - appears INSIDE payment sheet
      applePay: {
        merchantCountryCode: 'GB',
        cartItems: [
          {
            label: selectedPlan === 'monthly' ? 'Monthly Subscription' : 'Yearly Subscription',
            amount: selectedPlan === 'monthly' ? '4.99' : '49.99',
            paymentType: PlatformPay.PaymentType.Recurring
          }
        ],
        requiredBillingContactFields: [PlatformPay.ContactField.Name],
        // Merchant tokens for iOS 16+
        ...(supportsMerchantTokens && {
          request: {
            type: PlatformPay.PaymentRequestType.Recurring,
            billing: {
              paymentType: PlatformPay.PaymentType.Recurring,
              intervalUnit: selectedPlan === 'monthly' ? PlatformPay.IntervalUnit.Month : PlatformPay.IntervalUnit.Year,
              intervalCount: 1,
              label: selectedPlan === 'monthly' ? 'Monthly Subscription' : 'Yearly Subscription',
              amount: selectedPlan === 'monthly' ? '4.99' : '49.99',
            },
            managementUrl: 'https://archives.expo.app/profile',
          }
        })
      },
      appearance: {
        colors: {
          primary: '#959C00',
          background: '#F4EBDB',
          componentBackground: '#FFFFFF',
          primaryText: '#41425E',
        },
        shapes: {
          borderRadius: 16,
        },
      },
    })

    if (error) {
      console.error('❌ Payment sheet initialization error:', error)
      throw error
    }

    // Present the payment sheet (Apple Pay will appear as option inside)
    const { error: presentError } = await presentPaymentSheet()

    if (presentError) {
      if (presentError.code !== 'Canceled') {
        console.error('❌ Payment presentation error:', presentError)
        throw presentError
      }
    } else {
      console.log('✅ Subscription payment completed successfully!')
      Alert.alert(
        'Subscription Activated!',
        `Your ${selectedPlan} Archives Explorer Pass is now active!`,
        [{ text: 'Great!', onPress: () => {} }]
      )
    }

  } catch (error) {
    console.error('🚨 Subscription error:', error)
    Alert.alert('Subscription Error', error.message || 'Something went wrong. Please try again.')
  } finally {
    setLoading(false)
  }
}
```

#### 1.3 Remove Unused Styles ✅ COMPLETED

```typescript
// ❌ REMOVE: Apple Pay specific styles (no longer needed)
applePayContainer: { ... },
applePayButton: { ... },
applePayHint: { ... },
```

---

## 💳 Phase 2: True Subscriptions Implementation

### Objective: Replace PaymentIntents with Proper Stripe Subscriptions

#### 2.1 Create Stripe Price Objects

**In Stripe Dashboard**:

1. Go to Products → Create Product
2. Create "Archives Explorer Pass"
3. Add two prices:
   - Monthly: £4.99/month recurring
   - Yearly: £49.99/year recurring

**Save Price IDs**:
```env
STRIPE_PRICE_MONTHLY=price_1abc123...
STRIPE_PRICE_YEARLY=price_1xyz789...
```

#### 2.2 Update API Route: payment-sheet+api.ts

```typescript
// ❌ REMOVE: Old PaymentIntent logic
// ✅ NEW: True subscription creation

import { stripe } from '@/lib/stripe-server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { selectedPlan } = body
    
    console.log('🔄 Creating subscription for plan:', selectedPlan)
    
    // Get price ID based on selected plan
    const priceId = selectedPlan === 'yearly' 
      ? process.env.STRIPE_PRICE_YEARLY!
      : process.env.STRIPE_PRICE_MONTHLY!
    
    console.log('💰 Using price ID:', priceId)
    
    // Create customer (in production, check if customer exists)
    const customer = await stripe.customers.create({
      metadata: {
        app: 'archives-expo',
        created_from: 'mobile_app'
      }
    })
    
    console.log('👤 Created customer:', customer.id)
    
    // Create ephemeral key
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: '2024-11-20.acacia' }
    )
    
    // ✅ CREATE SUBSCRIPTION (not PaymentIntent!)
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        payment_method_options: {
          card: {
            request_three_d_secure: 'automatic'
          }
        }
      },
      metadata: {
        plan_type: selectedPlan,
        app: 'archives-expo',
        created_from: 'mobile_app'
      },
      expand: ['latest_invoice.payment_intent'],
    })
    
    console.log('📋 Created subscription:', subscription.id)
    console.log('💳 Payment intent:', subscription.latest_invoice.payment_intent.id)
    
    // Return subscription data (not PaymentIntent data!)
    return Response.json({
      subscriptionId: subscription.id,
      subscriptionClientSecret: subscription.latest_invoice.payment_intent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
      publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    })
    
  } catch (error) {
    console.error('❌ Subscription creation error:', error)
    return Response.json(
      { 
        error: 'Failed to create subscription',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
```

#### 2.3 Update fetchPaymentSheetParams Function

```typescript
// ✅ NEW: Fetch subscription parameters
const fetchSubscriptionParams = async (plan: 'monthly' | 'yearly') => {
  console.log('🔄 Fetching subscription params for:', plan)
  
  const response = await fetch('/api/payment-sheet', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      selectedPlan: plan
    }),
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    console.error('❌ API error:', errorData)
    throw new Error(errorData.error || 'Failed to create subscription')
  }
  
  const data = await response.json()
  console.log('📄 Subscription params received:', {
    subscriptionId: data.subscriptionId,
    hasClientSecret: !!data.subscriptionClientSecret,
    customerId: data.customer
  })
  
  // Return subscription data (not PaymentIntent data!)
  return {
    subscriptionClientSecret: data.subscriptionClientSecret,
    ephemeralKey: data.ephemeralKey,
    customer: data.customer,
    subscriptionId: data.subscriptionId
  }
}
```

---

## 🐛 Phase 3: Debugging System

### Objective: Comprehensive Logging and Error Tracking

#### 3.1 Enhanced Console Logging

```typescript
// ✅ ADD: Comprehensive debugging class
class PaymentLogger {
  static log(phase: string, message: string, data?: any) {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] 💳 ${phase}: ${message}`)
    if (data) {
      console.log(`[${timestamp}] 📊 Data:`, JSON.stringify(data, null, 2))
    }
  }
  
  static error(phase: string, message: string, error?: any) {
    const timestamp = new Date().toISOString()
    console.error(`[${timestamp}] ❌ ${phase}: ${message}`)
    if (error) {
      console.error(`[${timestamp}] 🚨 Error Details:`, error)
      console.error(`[${timestamp}] 📚 Stack:`, error.stack)
    }
  }
  
  static success(phase: string, message: string, data?: any) {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] ✅ ${phase}: ${message}`)
    if (data) {
      console.log(`[${timestamp}] 📈 Success Data:`, data)
    }
  }
}
```

#### 3.2 Enhanced Payment Function with Debugging

```typescript
const handleSubscribe = async () => {
  const sessionId = Math.random().toString(36).substring(7)
  PaymentLogger.log('SESSION_START', `Starting payment session ${sessionId}`, {
    plan: selectedPlan,
    device: {
      platform: Platform.OS,
      version: Platform.Version
    },
    features: {
      applePaySupported: isApplePaySupported,
      merchantTokens: supportsMerchantTokens
    }
  })
  
  try {
    setLoading(true)
    
    // Phase 1: Parameter fetching
    PaymentLogger.log('FETCH_PARAMS', 'Fetching subscription parameters...')
    const params = await fetchSubscriptionParams(selectedPlan)
    PaymentLogger.success('FETCH_PARAMS', 'Parameters received successfully', {
      hasClientSecret: !!params.subscriptionClientSecret,
      customerId: params.customer
    })
    
    // Phase 2: Payment sheet initialization
    PaymentLogger.log('INIT_SHEET', 'Initializing payment sheet...')
    const initConfig = {
      merchantDisplayName: 'Archives App',
      customerId: params.customer,
      customerEphemeralKeySecret: params.ephemeralKey,
      paymentIntentClientSecret: params.subscriptionClientSecret,
      applePay: {
        merchantCountryCode: 'GB',
        cartItems: [
          {
            label: selectedPlan === 'monthly' ? 'Monthly Subscription' : 'Yearly Subscription',
            amount: selectedPlan === 'monthly' ? '4.99' : '49.99',
            paymentType: PlatformPay.PaymentType.Recurring
          }
        ]
      }
    }
    
    PaymentLogger.log('INIT_SHEET', 'Payment sheet configuration', initConfig)
    
    const { error: initError } = await initPaymentSheet(initConfig)
    
    if (initError) {
      PaymentLogger.error('INIT_SHEET', 'Payment sheet initialization failed', initError)
      throw initError
    }
    
    PaymentLogger.success('INIT_SHEET', 'Payment sheet initialized successfully')
    
    // Phase 3: Present payment sheet
    PaymentLogger.log('PRESENT_SHEET', 'Presenting payment sheet to user...')
    const { error: presentError } = await presentPaymentSheet()
    
    if (presentError) {
      if (presentError.code === 'Canceled') {
        PaymentLogger.log('PRESENT_SHEET', 'Payment cancelled by user')
        return
      }
      PaymentLogger.error('PRESENT_SHEET', 'Payment presentation failed', presentError)
      throw presentError
    }
    
    // Phase 4: Success handling
    PaymentLogger.success('PAYMENT_COMPLETE', 'Subscription payment completed!', {
      plan: selectedPlan,
      sessionId
    })
    
    Alert.alert(
      'Subscription Activated!',
      `Your ${selectedPlan} Archives Explorer Pass is now active!`,
      [{ text: 'Great!', onPress: () => {} }]
    )
    
  } catch (error) {
    PaymentLogger.error('PAYMENT_FAILED', 'Subscription payment failed', {
      error: error.message,
      code: error.code,
      sessionId
    })
    
    Alert.alert(
      'Subscription Error', 
      `Payment failed: ${error.message}. Please try again.`
    )
  } finally {
    setLoading(false)
    PaymentLogger.log('SESSION_END', `Payment session ${sessionId} completed`)
  }
}
```

#### 3.3 API Route Debugging

```typescript
// Enhanced API route with debugging
export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(7)
  
  try {
    console.log(`[${new Date().toISOString()}] 🚀 API_START: Subscription creation request ${requestId}`)
    
    const body = await request.json()
    console.log(`[${new Date().toISOString()}] 📥 REQUEST_BODY:`, body)
    
    const { selectedPlan } = body
    
    // Get price ID
    const priceId = selectedPlan === 'yearly' 
      ? process.env.STRIPE_PRICE_YEARLY!
      : process.env.STRIPE_PRICE_MONTHLY!
    
    console.log(`[${new Date().toISOString()}] 💰 PRICE_ID: ${priceId} for plan ${selectedPlan}`)
    
    // Create customer
    console.log(`[${new Date().toISOString()}] 👤 CREATING_CUSTOMER...`)
    const customer = await stripe.customers.create({
      metadata: { request_id: requestId, plan: selectedPlan }
    })
    console.log(`[${new Date().toISOString()}] ✅ CUSTOMER_CREATED: ${customer.id}`)
    
    // Create subscription
    console.log(`[${new Date().toISOString()}] 📋 CREATING_SUBSCRIPTION...`)
    const subscriptionStart = Date.now()
    
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    })
    
    const subscriptionTime = Date.now() - subscriptionStart
    console.log(`[${new Date().toISOString()}] ✅ SUBSCRIPTION_CREATED: ${subscription.id} (${subscriptionTime}ms)`)
    
    const response = {
      requestId,
      subscriptionId: subscription.id,
      subscriptionClientSecret: subscription.latest_invoice.payment_intent.client_secret,
      customer: customer.id,
    }
    
    console.log(`[${new Date().toISOString()}] 📤 API_SUCCESS: ${requestId}`, response)
    
    return Response.json(response)
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ API_ERROR: ${requestId}`, {
      message: error.message,
      code: error.code,
      type: error.type,
      stack: error.stack
    })
    
    return Response.json(
      { 
        requestId,
        error: 'Subscription creation failed',
        details: error.message,
        code: error.code 
      },
      { status: 500 }
    )
  }
}
```

---

## 🔗 Phase 4: Webhook Implementation

### Objective: Handle Subscription Lifecycle Events

#### 4.1 Create Webhook Handler

**File**: `app/api/webhooks/stripe+api.ts`

```typescript
import { stripe } from '@/lib/stripe-server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role key for webhook operations
)

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(7)
  console.log(`[${new Date().toISOString()}] 🪝 WEBHOOK_START: ${requestId}`)
  
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')
    
    if (!signature) {
      console.error(`[${new Date().toISOString()}] ❌ WEBHOOK_ERROR: No signature header`)
      return Response.json({ error: 'No signature' }, { status: 400 })
    }
    
    // Verify webhook signature
    console.log(`[${new Date().toISOString()}] 🔐 WEBHOOK_VERIFY: Verifying signature...`)
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    
    console.log(`[${new Date().toISOString()}] 📨 WEBHOOK_EVENT: ${event.type}`, {
      id: event.id,
      created: event.created,
      livemode: event.livemode
    })
    
    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object, requestId)
        break
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object, requestId)
        break
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object, requestId)
        break
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object, requestId)
        break
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object, requestId)
        break
        
      default:
        console.log(`[${new Date().toISOString()}] ℹ️ WEBHOOK_UNHANDLED: ${event.type}`)
    }
    
    console.log(`[${new Date().toISOString()}] ✅ WEBHOOK_SUCCESS: ${requestId}`)
    return Response.json({ received: true, requestId })
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ WEBHOOK_ERROR: ${requestId}`, {
      message: error.message,
      stack: error.stack
    })
    
    return Response.json(
      { error: 'Webhook handler failed', requestId },
      { status: 500 }
    )
  }
}

// Handle subscription created
async function handleSubscriptionCreated(subscription: any, requestId: string) {
  console.log(`[${new Date().toISOString()}] 🎉 SUBSCRIPTION_CREATED: ${subscription.id}`)
  
  try {
    // Insert subscription into database
    const { error } = await supabase
      .from('user_subscriptions')
      .insert({
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer,
        status: subscription.status,
        plan_interval: subscription.items.data[0]?.price?.recurring?.interval || 'month',
        plan_amount: subscription.items.data[0]?.price?.unit_amount || 0,
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
        created_at: new Date(),
      })
    
    if (error) {
      console.error(`[${new Date().toISOString()}] ❌ DB_ERROR: Failed to insert subscription`, error)
      throw error
    }
    
    console.log(`[${new Date().toISOString()}] ✅ DB_SUCCESS: Subscription ${subscription.id} stored`)
    
    // TODO: Grant user access to premium features
    // await grantUserAccess(subscription.customer)
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ SUBSCRIPTION_CREATED_ERROR:`, error)
    throw error
  }
}

// Handle successful payment
async function handlePaymentSucceeded(invoice: any, requestId: string) {
  console.log(`[${new Date().toISOString()}] 💰 PAYMENT_SUCCEEDED: ${invoice.id}`)
  
  try {
    if (invoice.subscription) {
      // Update subscription status
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'active',
          current_period_start: new Date(invoice.period_start * 1000),
          current_period_end: new Date(invoice.period_end * 1000),
          updated_at: new Date(),
        })
        .eq('stripe_subscription_id', invoice.subscription)
      
      if (error) {
        console.error(`[${new Date().toISOString()}] ❌ DB_ERROR: Failed to update subscription`, error)
        throw error
      }
      
      console.log(`[${new Date().toISOString()}] ✅ SUBSCRIPTION_RENEWED: ${invoice.subscription}`)
      
      // TODO: Ensure user has access to premium features
      // await ensureUserAccess(invoice.customer)
    }
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ PAYMENT_SUCCEEDED_ERROR:`, error)
    throw error
  }
}

// Handle failed payment
async function handlePaymentFailed(invoice: any, requestId: string) {
  console.log(`[${new Date().toISOString()}] 🚨 PAYMENT_FAILED: ${invoice.id}`)
  
  try {
    if (invoice.subscription) {
      // Update subscription status
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'past_due',
          updated_at: new Date(),
        })
        .eq('stripe_subscription_id', invoice.subscription)
      
      if (error) {
        console.error(`[${new Date().toISOString()}] ❌ DB_ERROR: Failed to update subscription`, error)
        throw error
      }
      
      console.log(`[${new Date().toISOString()}] ⚠️ SUBSCRIPTION_PAST_DUE: ${invoice.subscription}`)
      
      // TODO: Send user notification about failed payment
      // TODO: Implement grace period logic
    }
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ PAYMENT_FAILED_ERROR:`, error)
    throw error
  }
}

// Handle subscription updated
async function handleSubscriptionUpdated(subscription: any, requestId: string) {
  console.log(`[${new Date().toISOString()}] 📝 SUBSCRIPTION_UPDATED: ${subscription.id}`)
  
  try {
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date(),
      })
      .eq('stripe_subscription_id', subscription.id)
    
    if (error) {
      console.error(`[${new Date().toISOString()}] ❌ DB_ERROR: Failed to update subscription`, error)
      throw error
    }
    
    console.log(`[${new Date().toISOString()}] ✅ SUBSCRIPTION_SYNC: ${subscription.id}`)
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ SUBSCRIPTION_UPDATED_ERROR:`, error)
    throw error
  }
}

// Handle subscription deleted/cancelled
async function handleSubscriptionDeleted(subscription: any, requestId: string) {
  console.log(`[${new Date().toISOString()}] 🗑️ SUBSCRIPTION_DELETED: ${subscription.id}`)
  
  try {
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date(),
        updated_at: new Date(),
      })
      .eq('stripe_subscription_id', subscription.id)
    
    if (error) {
      console.error(`[${new Date().toISOString()}] ❌ DB_ERROR: Failed to update subscription`, error)
      throw error
    }
    
    console.log(`[${new Date().toISOString()}] ✅ SUBSCRIPTION_CANCELLED: ${subscription.id}`)
    
    // TODO: Revoke user access to premium features
    // await revokeUserAccess(subscription.customer)
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ SUBSCRIPTION_DELETED_ERROR:`, error)
    throw error
  }
}
```

---

## 🗄️ Phase 5: Database Schema

### Objective: Create Supabase Tables for Subscription Tracking

#### 5.1 User Subscriptions Table

```sql
-- Create user_subscriptions table
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User identification
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  clerk_user_id TEXT, -- If using Clerk for auth
  
  -- Stripe references
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  
  -- Subscription details
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'unpaid', 'trialing', 'incomplete')),
  plan_interval TEXT NOT NULL CHECK (plan_interval IN ('month', 'year')),
  plan_amount INTEGER NOT NULL, -- Amount in cents
  
  -- Billing periods
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Cancellation
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id);
CREATE INDEX idx_user_subscriptions_stripe_subscription ON user_subscriptions(stripe_subscription_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_current_period_end ON user_subscriptions(current_period_end);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_subscriptions_updated_at 
    BEFORE UPDATE ON user_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### 5.2 Webhook Events Log Table

```sql
-- Create webhook_events table for debugging
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Stripe event details
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  
  -- Processing details
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processing_time_ms INTEGER,
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('processed', 'failed', 'retry')) DEFAULT 'processed',
  error_message TEXT,
  
  -- Metadata
  request_id TEXT,
  event_data JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_webhook_events_stripe_event_id ON webhook_events(stripe_event_id);
CREATE INDEX idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);
CREATE INDEX idx_webhook_events_processed_at ON webhook_events(processed_at);
```

#### 5.3 Row Level Security (RLS)

```sql
-- Enable RLS on user_subscriptions
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own subscriptions
CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Service role can manage all subscriptions (for webhooks)
CREATE POLICY "Service role can manage all subscriptions" ON user_subscriptions
    FOR ALL USING (auth.role() = 'service_role');

-- Enable RLS on webhook_events
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access webhook events
CREATE POLICY "Only service role can access webhook events" ON webhook_events
    FOR ALL USING (auth.role() = 'service_role');
```

#### 5.4 Helper Functions

```sql
-- Function to get user's active subscription
CREATE OR REPLACE FUNCTION get_user_active_subscription(user_uuid UUID)
RETURNS TABLE (
    subscription_id UUID,
    stripe_subscription_id TEXT,
    status TEXT,
    plan_interval TEXT,
    current_period_end TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.id,
        us.stripe_subscription_id,
        us.status,
        us.plan_interval,
        us.current_period_end,
        (us.status = 'active' AND us.current_period_end > NOW()) as is_active
    FROM user_subscriptions us
    WHERE us.user_id = user_uuid
    AND us.status IN ('active', 'past_due')
    ORDER BY us.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION user_has_active_subscription(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    has_active BOOLEAN := FALSE;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM user_subscriptions 
        WHERE user_id = user_uuid 
        AND status = 'active' 
        AND current_period_end > NOW()
    ) INTO has_active;
    
    RETURN has_active;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## ✅ Phase 6: Testing Strategy

### Objective: Comprehensive Testing of Subscription System

#### 6.1 Local Development Testing

**Setup Stripe CLI for Webhook Testing**:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local development
stripe listen --forward-to localhost:8081/api/webhooks/stripe

# Note the webhook signing secret
# whsec_... (add to .env file)
```

**Environment Variables**:
```env
# Stripe Keys (Test Mode)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs (from Stripe Dashboard)
STRIPE_PRICE_MONTHLY=price_test_monthly...
STRIPE_PRICE_YEARLY=price_test_yearly...

# Supabase
SUPABASE_SERVICE_ROLE_KEY=eyJ... # For webhook operations
```

#### 6.2 Test Cases

**Test Case 1: Successful Subscription Creation**
```typescript
// Test procedure:
// 1. Select monthly plan
// 2. Click "Get Access"
// 3. Use test card: 4242424242424242
// 4. Complete payment
// 5. Verify webhook receives customer.subscription.created
// 6. Check database for new subscription record
// 7. Verify user gets access to premium features

Expected Results:
- ✅ Payment sheet opens with Apple Pay option
- ✅ Payment completes successfully  
- ✅ Webhook processes subscription.created event
- ✅ Database contains subscription record with status 'active'
- ✅ User gains access to premium features
```

**Test Case 2: Apple Pay Payment**
```typescript
// Test procedure:
// 1. Use iOS simulator with Apple Pay configured
// 2. Select yearly plan
// 3. Click "Get Access"
// 4. Choose Apple Pay from payment sheet
// 5. Complete with Face ID/Touch ID
// 6. Verify subscription creation

Expected Results:
- ✅ Apple Pay appears as option inside payment sheet
- ✅ Payment completes with biometric authentication
- ✅ Subscription created successfully
- ✅ Merchant tokens work on iOS 16+
```

**Test Case 3: Failed Payment Handling**
```typescript
// Test procedure:
// 1. Use declined card: 4000000000000002
// 2. Attempt subscription creation
// 3. Verify error handling

Expected Results:
- ✅ Payment fails gracefully
- ✅ User sees appropriate error message
- ✅ No subscription created in database
- ✅ User can retry with different payment method
```

**Test Case 4: Subscription Renewal**
```typescript
// Test procedure (using Stripe CLI):
// 1. Create subscription with short billing period
// 2. Trigger invoice.payment_succeeded webhook
// 3. Verify subscription renewal handling

Expected Results:
- ✅ Webhook processes renewal event
- ✅ Database updates subscription period
- ✅ User maintains access to features
```

**Test Case 5: Subscription Cancellation**
```typescript
// Test procedure:
// 1. Cancel subscription in Stripe Dashboard
// 2. Trigger customer.subscription.deleted webhook
// 3. Verify access revocation

Expected Results:
- ✅ Webhook processes cancellation
- ✅ Database marks subscription as cancelled
- ✅ User loses access to premium features
```

#### 6.3 Testing Checklist

**Frontend Testing**:
- [ ] Single "Get Access" button appears
- [ ] Apple Pay option appears inside payment sheet (iOS)
- [ ] Card payment option works
- [ ] Loading states work correctly
- [ ] Error messages are user-friendly
- [ ] Success confirmation appears
- [ ] No separate Apple Pay button visible

**Backend Testing**:
- [ ] Subscription creation API works
- [ ] Proper Price IDs are used
- [ ] Customer creation works
- [ ] Ephemeral keys generated correctly
- [ ] Error handling returns proper status codes
- [ ] All API responses include proper debugging info

**Webhook Testing**:
- [ ] Webhook signature verification works
- [ ] customer.subscription.created handled correctly
- [ ] invoice.payment_succeeded handled correctly
- [ ] invoice.payment_failed handled correctly
- [ ] customer.subscription.deleted handled correctly
- [ ] Database updates work correctly
- [ ] Error handling doesn't crash webhook

**Database Testing**:
- [ ] Subscription records created correctly
- [ ] User associations work
- [ ] Status updates work
- [ ] RLS policies enforced
- [ ] Helper functions work
- [ ] Indexes improve query performance

---

## 🚀 Phase 7: Production Deployment

### Objective: Deploy Robust Subscription System to Production

#### 7.1 Environment Configuration

**Production Environment Variables**:
```env
# Stripe Keys (Live Mode)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... # From production webhook endpoint

# Price IDs (Production)
STRIPE_PRICE_MONTHLY=price_live_monthly...
STRIPE_PRICE_YEARLY=price_live_yearly...

# Supabase (Production)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ... # Service role for webhooks
```

#### 7.2 Stripe Dashboard Configuration

**Create Production Webhook**:
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook signing secret to environment

**Create Production Price Objects**:
```javascript
// Monthly Price
{
  product: "Archives Explorer Pass",
  unit_amount: 499, // £4.99 in pence
  currency: "gbp",
  recurring: {
    interval: "month"
  }
}

// Yearly Price  
{
  product: "Archives Explorer Pass",
  unit_amount: 4999, // £49.99 in pence
  currency: "gbp", 
  recurring: {
    interval: "year"
  }
}
```

#### 7.3 Database Migration

**Run Production Migration**:
```sql
-- Connect to production Supabase
-- Run all SQL from Phase 5 Database Schema
-- Verify tables created correctly
-- Test helper functions work
-- Verify RLS policies active
```

#### 7.4 EAS Build Configuration

**Update eas.json**:
```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY": "pk_live_...",
        "STRIPE_SECRET_KEY": "sk_live_...",
        "STRIPE_WEBHOOK_SECRET": "whsec_...",
        "STRIPE_PRICE_MONTHLY": "price_live_monthly...",
        "STRIPE_PRICE_YEARLY": "price_live_yearly...",
        "EXPO_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "eyJ...",
        "SUPABASE_SERVICE_ROLE_KEY": "eyJ..."
      }
    }
  }
}
```

#### 7.5 Pre-Production Testing

**Staging Environment**:
1. Deploy to staging with test Stripe keys
2. Run full test suite
3. Verify all webhooks work
4. Test Apple Pay on physical devices
5. Verify subscription lifecycle
6. Load test payment processing
7. Verify error handling

**Production Readiness Checklist**:
- [ ] All environment variables configured
- [ ] Database schema deployed
- [ ] Webhook endpoint configured in Stripe
- [ ] Price objects created
- [ ] Apple Pay merchant ID configured
- [ ] Error monitoring setup
- [ ] Backup procedures in place
- [ ] Rollback plan prepared

#### 7.6 Monitoring and Alerts

**Production Monitoring**:
```typescript
// Add to webhook handler
import { createClient } from '@supabase/supabase-js'

// Log all webhook events for monitoring
await supabase.from('webhook_events').insert({
  stripe_event_id: event.id,
  event_type: event.type,
  status: 'processed',
  processing_time_ms: Date.now() - startTime,
  request_id: requestId,
  event_data: event.data
})

// Monitor failed webhooks
if (error) {
  await supabase.from('webhook_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
    status: 'failed',
    error_message: error.message,
    request_id: requestId
  })
  
  // Send alert to monitoring system
  console.error('WEBHOOK_FAILED_ALERT:', {
    event_type: event.type,
    error: error.message,
    request_id: requestId
  })
}
```

**Key Metrics to Monitor**:
- Subscription creation success rate
- Payment failure rate  
- Webhook processing time
- Database query performance
- Apple Pay usage rate
- Churn rate

---

## 🔧 Troubleshooting Guide

### Common Issues and Solutions

#### Issue 1: "cartItems cannot be null" Error

**Symptoms**:
```
Apple Pay subscription error: {"code": "Failed", "message": "`cartItems` cannot be null."}
```

**Root Cause**: cartItems in wrong location in Apple Pay configuration

**Solution**:
```typescript
// ❌ WRONG:
applePay: {
  request: {
    cartItems: [...] // Inside request object
  }
}

// ✅ CORRECT:
applePay: {
  cartItems: [...], // At applePay level
  request: {
    // Other properties
  }
}
```

#### Issue 2: Webhook Not Receiving Events

**Symptoms**:
- Payments complete but database not updated
- No webhook logs in console

**Debugging Steps**:
```bash
# Test webhook locally
stripe listen --forward-to localhost:8081/api/webhooks/stripe

# Trigger test event
stripe trigger customer.subscription.created

# Check webhook logs
curl -X POST http://localhost:8081/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

**Common Causes**:
- Webhook URL not configured in Stripe Dashboard
- Wrong webhook signing secret
- Network connectivity issues
- Webhook handler throwing uncaught errors

#### Issue 3: Apple Pay Not Appearing

**Symptoms**:
- Payment sheet opens without Apple Pay option
- `isApplePaySupported` returns false

**Debugging**:
```typescript
// Add comprehensive Apple Pay debugging
useEffect(() => {
  (async function () {
    console.log('🔍 Apple Pay Debug Info:', {
      platform: Platform.OS,
      version: Platform.Version,
      isSimulator: __DEV__
    })
    
    try {
      const supported = await isPlatformPaySupported()
      console.log('🍎 Apple Pay Supported:', supported)
      
      if (!supported) {
        console.log('❌ Apple Pay not supported - check:')
        console.log('  - iOS device (not Android)')
        console.log('  - Wallet app has cards added')
        console.log('  - Region supports Apple Pay')
        console.log('  - App signed with proper entitlements')
      }
      
      setIsApplePaySupported(supported)
    } catch (error) {
      console.error('🚨 Apple Pay check failed:', error)
    }
  })()
}, [])
```

**Solutions**:
- Ensure iOS device (not Android)
- Add cards to Wallet app
- Verify merchant ID in app.json
- Check Apple Developer account configuration
- Ensure proper code signing

#### Issue 4: Subscriptions Not Renewing

**Symptoms**:
- First payment works but no recurring charges
- Users lose access after initial period

**Root Cause**: Using PaymentIntents instead of Subscriptions

**Solution**: Follow Phase 2 implementation to use proper Stripe Subscriptions

#### Issue 5: Database Permission Errors

**Symptoms**:
```
RLS policy violation or insufficient privileges
```

**Solutions**:
```sql
-- Verify RLS policies
SELECT * FROM pg_policies WHERE tablename = 'user_subscriptions';

-- Grant necessary permissions
GRANT ALL ON user_subscriptions TO authenticated;
GRANT ALL ON user_subscriptions TO service_role;

-- Test service role access
SELECT auth.role(); -- Should return 'service_role' in webhook context
```

#### Issue 6: Performance Issues

**Symptoms**:
- Slow payment processing
- Webhook timeouts
- Database query slowness

**Optimizations**:
```sql
-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_user_subscriptions_compound 
ON user_subscriptions(user_id, status, current_period_end);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM user_subscriptions WHERE user_id = $1;
```

**Best Practices**:
- Use database connection pooling
- Cache frequently accessed data
- Implement proper error handling
- Add request timeouts
- Use database transactions for consistency

---

## 📊 Success Metrics

### Key Performance Indicators (KPIs)

**Technical Metrics**:
- Payment success rate: >99%
- Webhook processing time: <2 seconds
- Database query time: <100ms
- Apple Pay adoption rate: Track usage
- Error rate: <0.1%

**Business Metrics**:
- Subscription conversion rate
- Monthly recurring revenue (MRR)
- Churn rate
- Customer lifetime value (CLV)
- Payment method preferences

**User Experience Metrics**:
- Time to complete subscription: <60 seconds
- Payment abandonment rate: <5%
- Customer support tickets related to payments: <1%

---

## 📚 Additional Resources

### Documentation
- [Stripe Subscriptions Guide](https://stripe.com/docs/billing/subscriptions)
- [Stripe React Native SDK](https://stripe.com/docs/stripe-react-native)
- [Apple Pay Integration](https://stripe.com/docs/apple-pay)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)

### Tools
- [Stripe CLI](https://stripe.com/docs/stripe-cli) - For webhook testing
- [Supabase CLI](https://supabase.com/docs/guides/cli) - For database management
- [EAS CLI](https://docs.expo.dev/build/setup/) - For app deployment

### Monitoring
- Stripe Dashboard - Payment monitoring
- Supabase Dashboard - Database monitoring  
- EAS Build Dashboard - App deployment monitoring

---

## 🎯 Implementation Timeline

**Week 1: Foundation**
- [ ] Phase 1: UI/UX Simplification
- [ ] Phase 3: Debugging System

**Week 2: Core Functionality**
- [ ] Phase 2: True Subscriptions Implementation
- [ ] Phase 5: Database Schema

**Week 3: Automation**
- [ ] Phase 4: Webhook Implementation
- [ ] Integration testing

**Week 4: Production**
- [ ] Phase 6: Testing Strategy
- [ ] Phase 7: Production Deployment

**Week 5: Optimization**
- [ ] Performance tuning
- [ ] Monitoring setup
- [ ] Documentation updates

---

This implementation guide provides everything needed to transform your current payment system into a robust, production-ready subscription platform with proper Apple Pay integration and comprehensive subscription management.
