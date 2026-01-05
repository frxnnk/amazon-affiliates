import type { APIRoute } from 'astro';
import { approveClaim } from '@lib/db';

export const POST: APIRoute = async ({ request, locals }) => {
  // Check authentication
  const auth = locals.auth();
  if (!auth.userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { claimId, amount, notes } = body;

    if (!claimId || amount === undefined) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const claim = await approveClaim(
      parseInt(claimId),
      parseInt(amount),
      auth.userId,
      notes
    );

    return new Response(JSON.stringify({ success: true, claim }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to approve claim';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
