/**
 * API Endpoint: Track Product Views
 *
 * POST /api/user/view
 * Body: { asin: string, category?: string, timeSpentMs?: number, interactionType?: string }
 *
 * POST /api/user/view (batch)
 * Body: { asins: string[], category?: string }
 *
 * Tracks products that the user has viewed for anti-repetition.
 * Only works for authenticated users.
 */

import type { APIRoute } from 'astro';
import { recordProductView, recordProductViewsBatch, type InteractionType } from '@lib/db';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const auth = locals.auth?.();
    const userId = auth?.userId;

    if (!userId) {
      // Silently skip for unauthenticated users - no error needed
      return new Response(JSON.stringify({ success: true, tracked: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();

    // Batch mode: multiple ASINs
    if (body.asins && Array.isArray(body.asins)) {
      await recordProductViewsBatch(userId, body.asins, body.category);
      return new Response(JSON.stringify({
        success: true,
        tracked: true,
        count: body.asins.length,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Single view mode
    if (!body.asin) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing asin parameter',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await recordProductView(userId, body.asin, {
      category: body.category,
      timeSpentMs: body.timeSpentMs,
      interactionType: body.interactionType as InteractionType,
    });

    return new Response(JSON.stringify({
      success: true,
      tracked: true,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[View API] Error:', error);
    // Don't fail the request - view tracking is not critical
    return new Response(JSON.stringify({
      success: true,
      tracked: false,
      error: 'Internal error',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
