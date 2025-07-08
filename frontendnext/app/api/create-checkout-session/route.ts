// app/api/checkout/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe with your secret key
// Ensure process.env.STRIPE_SECRET_KEY is correctly set in your environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // You can add options here if needed, e.g., apiVersion
});

/**
 * Handles POST requests to create a Stripe Checkout Session.
 * @param request The incoming Next.js Request object (standard Web Request API).
 * @returns A NextResponse object containing the session ID or an error message.
 */
export async function POST(request: Request) {
  try {
    // Access headers using the standard Web Headers API
    const origin = request.headers.get('origin');

    if (!origin) {
      // Handle case where origin header is missing, which is unlikely for a browser request
      return NextResponse.json({ error: 'Origin header is missing.' }, { status: 400 });
    }

    // Create a Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Test Product',
            },
            unit_amount: 5000, // $50.00
          },
          quantity: 1,
        },
      ],
      // Construct success and cancel URLs using the origin from the request headers
      success_url: `${origin}/success`,
      cancel_url: `${origin}/cancel`,
    });

    // Return the session ID as a JSON response with a 200 OK status
    return NextResponse.json({ id: session.id }, { status: 200 });

  } catch (error: unknown) {
    // Log the error for debugging purposes
    if (error instanceof Error) {
      console.error('Stripe Checkout Session creation failed:', error.message);
      // Return a 500 Internal Server Error response with the error message
      return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      console.error('An unknown error occurred:', error);
      // Return a generic 500 Internal Server Error for unknown errors
      return NextResponse.json({ error: 'An unknown error occurred.' }, { status: 500 });
    }
  }
}

/**
 * Handles all other HTTP methods (GET, PUT, DELETE, etc.) for this route.
 * Returns a 405 Method Not Allowed response.
 * @returns A NextResponse indicating Method Not Allowed.
 */
export async function GET() {
  return new NextResponse('Method Not Allowed', { status: 405, headers: { 'Allow': 'POST' } });
}

export async function PUT() {
  return new NextResponse('Method Not Allowed', { status: 405, headers: { 'Allow': 'POST' } });
}

export async function DELETE() {
  return new NextResponse('Method Not Allowed', { status: 405, headers: { 'Allow': 'POST' } });
}

// You can add similar functions for other methods like PATCH if needed.
// If you only expect POST, you can omit the other method handlers,
// and Next.js will automatically return a 405 for unhandled methods.