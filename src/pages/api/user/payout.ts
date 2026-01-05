import type { APIRoute } from 'astro';
import { createPayoutRequest } from '@lib/db';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const auth = locals.auth();
    if (!auth.userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { amount, method, paypalEmail, cryptoAddress } = body;

    // Validate required fields
    if (!amount || !method) {
      return new Response(JSON.stringify({ error: 'Amount and method are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate method
    if (method !== 'paypal' && method !== 'crypto') {
      return new Response(JSON.stringify({ error: 'Invalid payment method' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate payment details based on method
    if (method === 'paypal' && !paypalEmail) {
      return new Response(JSON.stringify({ error: 'PayPal email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'crypto' && !cryptoAddress) {
      return new Response(JSON.stringify({ error: 'Crypto wallet address is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create the payout request
    const payout = await createPayoutRequest(
      auth.userId,
      amount,
      method,
      paypalEmail,
      cryptoAddress
    );

    return new Response(JSON.stringify({ success: true, payout }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create payout request';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
