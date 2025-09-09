import { stripe } from '@/lib/stripe-server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { selectedPlan } = body
    
    // Determine amount based on selected plan
    const amount = selectedPlan === 'yearly' ? 49.99 : 4.99
    const amountInCents = Math.round(amount * 100) // Convert to cents
    
    // Create a customer (in production, you'd check if customer exists)
    const customer = await stripe.customers.create({
      // You could add email, name here from user data
    })
    
    // Create ephemeral key for the customer
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: '2024-11-20.acacia' }
    )
    
    // Create payment intent (one-time payment)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'gbp',
      customer: customer.id,
      automatic_payment_methods: {
        enabled: true,
      },
    })
    
    // Return the data needed by the client
    return Response.json({
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
      publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    })
    
  } catch (error) {
    console.error('Error in payment-sheet API:', error)
    return Response.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}