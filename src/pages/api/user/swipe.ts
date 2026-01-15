/**
 * API Endpoint: Swipe Preferences
 * 
 * POST /api/user/swipe - Record a swipe action (like/dislike)
 */

import type { APIRoute } from 'astro';
import { addLikedAsin, addDislikedAsin } from '@lib/db';

export const prerender = false;

interface SwipeRequest {
  asin: string;
  liked: boolean;
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const auth = locals.auth?.();
    const userId = auth?.userId;

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body: SwipeRequest = await request.json();

    if (!body.asin) {
      return new Response(
        JSON.stringify({ success: false, error: 'ASIN is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (body.liked) {
      await addLikedAsin(userId, body.asin);
    } else {
      await addDislikedAsin(userId, body.asin);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
