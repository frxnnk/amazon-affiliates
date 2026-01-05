import type { APIRoute } from 'astro';

interface ClickEvent {
  productId: string;
  asin: string;
  lang: string;
  label?: string;
  url: string;
  referrer?: string;
  timestamp: number;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const data: ClickEvent = await request.json();

    // Basic validation
    if (!data.productId || !data.asin) {
      return new Response(JSON.stringify({ error: 'Invalid data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Enrich data with request info
    const enrichedData = {
      ...data,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      country: request.headers.get('x-vercel-ip-country') || 'unknown',
      receivedAt: new Date().toISOString()
    };

    // Log for development (in production, send to analytics service)
    console.log('[Affiliate Click]', enrichedData);

    // TODO: Send to analytics service (GA4, Plausible, etc.)
    // await sendToGA4(enrichedData);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Track Click Error]', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const prerender = false;
