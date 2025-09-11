import { stripe } from "@/hooks/lib/stripe-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerId } = body;
    const origin = request.headers.get("origin") || "https://archives.expo.app";

    if (!customerId) {
      return Response.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }

    // Create customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/profile`,
    });

    return Response.json({
      url: session.url,
    });
  } catch (error) {
    console.error("Error in customer-portal API:", error);
    return Response.json(
      { error: "Failed to create customer portal session" },
      { status: 500 }
    );
  }
}
