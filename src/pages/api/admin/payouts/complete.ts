import type { APIRoute } from 'astro';
import { completePayoutRequest } from '@lib/db';
import { isUserAdmin, unauthorizedResponse } from '@lib/auth';

export const POST: APIRoute = async (context) => {
  const { request, locals } = context;

  try {
    const auth = locals.auth();
    if (!auth.userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify admin role
    const isAdmin = await isUserAdmin(auth.userId, context);
    if (!isAdmin) {
      return unauthorizedResponse('Admin access required');
    }

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
