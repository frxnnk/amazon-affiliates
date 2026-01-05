import type { APIRoute } from 'astro';
import { recordAffiliateClick } from '@lib/db';
import crypto from 'crypto';

export const prerender = false;

interface ClickEvent {
  productId: string;
  asin: string;
  lang: string;
  label?: string;
  url: string;
  referrer?: string;
  timestamp: number;
}

// Hash IP address for privacy
function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const data: ClickEvent = await request.json();

    // Basic validation
    if (!data.productId) {
      return new Response(null, { status: 400 });
    }

    // Get user ID if logged in
    let userId: string | undefined;
    try {
      const auth = locals.auth?.();
      userId = auth?.userId;
    } catch {
      // Not authenticated, continue without userId
    }

    // Get client info
    const userAgent = request.headers.get('user-agent') || undefined;
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '';
    const ipHash = ip ? hashIp(ip) : undefined;

    // Generate a simple session ID from IP + User Agent if no user
    const sessionId = !userId && ip && userAgent
      ? hashIp(`${ip}-${userAgent}`).substring(0, 8)
      : undefined;

    // Record the click to database
    await recordAffiliateClick(
      data.productId,
      userId,
      sessionId,
      ipHash,
      userAgent
    );

    // Return 204 No Content (best for beacon requests)
    return new Response(null, { status: 204 });

  } catch (error) {
    console.error('[Track Click Error]', error);
    // Return 204 anyway to not break user experience
    return new Response(null, { status: 204 });
  }
};
