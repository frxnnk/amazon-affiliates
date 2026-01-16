import type { APIRoute } from 'astro';
import { getKeepaStats, isKeepaConfigured } from '@lib/keepa-api';

export const GET: APIRoute = async ({ request, locals }) => {
  // Check authentication
  const auth = locals.auth?.();
  const userId = auth?.userId;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check if Keepa is configured
  if (!isKeepaConfigured()) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Keepa API not configured. Set KEEPA_API_KEY environment variable.'
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Get ASIN from query params
  const url = new URL(request.url);
  const asin = url.searchParams.get('asin');
  const marketplace = url.searchParams.get('marketplace') || 'com';

  if (!asin) {
    return new Response(
      JSON.stringify({ success: false, error: 'ASIN is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const result = await getKeepaStats(asin, marketplace);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 404,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Keepa Stats Error]', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Error fetching Keepa stats' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const prerender = false;
