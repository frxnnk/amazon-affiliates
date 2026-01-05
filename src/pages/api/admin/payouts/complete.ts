import type { APIRoute } from 'astro';
import { completePayoutRequest } from '@lib/db';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const auth = locals.auth();
    if (!auth.userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // TODO: Add proper admin role check

    const body = await request.json();
    const { payoutId, transactionRef, notes } = body;

    if (!payoutId || !transactionRef) {
      return new Response(JSON.stringify({ error: 'Payout ID and transaction reference are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payout = await completePayoutRequest(payoutId, auth.userId, transactionRef, notes);

    return new Response(JSON.stringify({ success: true, payout }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to complete payout';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
