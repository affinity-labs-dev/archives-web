import { stripe } from '@/lib/stripe-server'

// Helper function to format amount for Stripe
function formatAmountForStripe(amount: number, currency: string) {
  return Math.round(amount * 100) // Convert to cents
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { amount } = body
    const origin = request.headers.get('origin') || 'https://archives.expo.app'
    
    // Validate and format amount
    const donationAmount = amount ? Number(amount) : 10
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      submit_type: 'donate',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'Archives App Donation',
              description: 'Support historical education content',
            },
            unit_amount: formatAmountForStripe(donationAmount, 'gbp'),
          },
        },
      ],
      success_url: `${origin}/result?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}`,
      ui_mode: 'hosted',
    })
    
    return Response.json({
      clientSecret: session.client_secret,
      url: session.url,
    })
    
  } catch (error) {
    console.error('Error in checkout-session API:', error)
    return Response.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}