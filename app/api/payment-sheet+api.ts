import { stripe } from '@/lib/stripe-server'
import { PaymentLogger } from '@/lib/PaymentLogger'

export async function POST(request: Request) {
  const sessionId = Math.random().toString(36).substring(7)
  
  try {
    PaymentLogger.log('API_START', `Payment session ${sessionId} started`)
    
    const body = await request.json()
    const { selectedPlan } = body
    
    PaymentLogger.log('REQUEST_PARSED', `Request parsed for session ${sessionId}`, {
      selectedPlan,
      userAgent: request.headers.get('user-agent'),
      origin: request.headers.get('origin')
    })
    
    // Get price ID based on selected plan
    const priceId = selectedPlan === 'yearly' 
      ? process.env.STRIPE_PRICE_YEARLY!
      : process.env.STRIPE_PRICE_MONTHLY!
    
    PaymentLogger.log('PRICE_ID_RESOLVED', `Price ID resolved for session ${sessionId}`, {
      selectedPlan,
      priceId,
      environment: process.env.NODE_ENV
    })
    
    // Create a customer (in production, check if customer exists)
    PaymentLogger.log('CUSTOMER_CREATING', `Creating customer for session ${sessionId}`)
    
    const customer = await stripe.customers.create({
      metadata: {
        app: 'archives-expo',
        created_from: 'mobile_app',
        session_id: sessionId
      }
    })
    
    PaymentLogger.success('CUSTOMER_CREATED', `Customer created for session ${sessionId}`, {
      customerId: customer.id,
      created: customer.created
    })
    
    // Create ephemeral key for the customer
    PaymentLogger.log('EPHEMERAL_KEY_CREATING', `Creating ephemeral key for session ${sessionId}`)
    
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: '2024-11-20.acacia' }
    )
    
    PaymentLogger.success('EPHEMERAL_KEY_CREATED', `Ephemeral key created for session ${sessionId}`, {
      customerId: customer.id,
      keyId: ephemeralKey.id
    })
    
    // Create subscription with the price
    PaymentLogger.log('SUBSCRIPTION_CREATING', `Creating subscription for session ${sessionId}`, {
      customerId: customer.id,
      priceId,
      selectedPlan
    })
    
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        app: 'archives-expo',
        subscription_type: selectedPlan,
        created_from: 'mobile_app',
        management_url: 'https://archives.expo.app/profile',
        session_id: sessionId
      }
    })
    
    PaymentLogger.success('SUBSCRIPTION_CREATED', `Subscription created for session ${sessionId}`, {
      subscriptionId: subscription.id,
      status: subscription.status,
      customerId: customer.id,
      priceId
    })
    
    // Extract the payment intent from the subscription's latest invoice
    PaymentLogger.log('PAYMENT_INTENT_EXTRACTING', `Extracting payment intent for session ${sessionId}`)
    
    const paymentIntent = subscription.latest_invoice?.payment_intent
    
    if (!paymentIntent || typeof paymentIntent === 'string') {
      PaymentLogger.error('PAYMENT_INTENT_ERROR', `Failed to extract payment intent for session ${sessionId}`, {
        subscriptionId: subscription.id,
        latestInvoice: subscription.latest_invoice?.id,
        paymentIntentType: typeof paymentIntent
      })
      throw new Error('Failed to create payment intent for subscription')
    }
    
    PaymentLogger.success('PAYMENT_INTENT_EXTRACTED', `Payment intent extracted for session ${sessionId}`, {
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    })
    
    // Return the data needed by the client
    const responseData = {
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
      subscription: subscription.id,
      publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    }
    
    PaymentLogger.logSafeData('API_SUCCESS', `Session ${sessionId} completed successfully`, responseData)
    
    return Response.json(responseData)
    
  } catch (error) {
    PaymentLogger.error('API_ERROR', `Session ${sessionId} failed`, error)
    
    return Response.json(
      { 
        error: 'Failed to create subscription',
        sessionId: sessionId,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}