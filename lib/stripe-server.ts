import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export { stripe }

export async function createPaymentIntent(amount: number, currency: string = 'gbp') {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
    })
    return paymentIntent
  } catch (error) {
    console.error('Error creating payment intent:', error)
    throw error
  }
}

export async function createCustomer(email: string, name?: string) {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
    })
    return customer
  } catch (error) {
    console.error('Error creating customer:', error)
    throw error
  }
}

export async function createSubscription(customerId: string, priceId: string, subscriptionType: 'monthly' | 'yearly') {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
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
        merchant_token_support: 'true',
        subscription_type: subscriptionType,
        management_url: 'https://archives.expo.app/profile',
        service: 'Archives Explorer Pass',
      },
      expand: ['latest_invoice.payment_intent'],
    })
    return subscription
  } catch (error) {
    console.error('Error creating subscription:', error)
    throw error
  }
}

export async function createCustomerPortalSession(customerId: string, returnUrl: string = 'https://archives.expo.app/profile') {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })
    return session
  } catch (error) {
    console.error('Error creating customer portal session:', error)
    throw error
  }
}