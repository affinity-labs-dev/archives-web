import { stripe } from "@/hooks/lib/stripe-server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("session_id");

    if (!sessionId) {
      return Response.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "payment_intent"],
    });

    return Response.json(session);
  } catch (error) {
    console.error("Error in stripe-result API:", error);
    return Response.json(
      { error: "Failed to retrieve session" },
      { status: 500 }
    );
  }
}
