/**
 * Admin Reviews API
 * GET - List reviews with filters
 * PUT - Moderate review (approve/reject)
 * DELETE - Delete review
 */

import type { APIRoute } from 'astro';
import { getAdminReviews, moderateReview, adminDeleteReview } from '@lib/db';

export const prerender = false;

// GET - List reviews for moderation
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const auth = locals.auth?.();
    if (!auth?.userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status') as 'pending' | 'approved' | 'rejected' | 'all' || 'all';
    const sortBy = url.searchParams.get('sortBy') as 'recent' | 'oldest' | 'rating' || 'recent';

    const result = await getAdminReviews({
      page,
      limit,
      status,
      sortBy,
    });

    return new Response(JSON.stringify({
      success: true,
      ...result,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Admin reviews GET error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PUT - Moderate review
export const PUT: APIRoute = async ({ request, locals }) => {
  try {
    const auth = locals.auth?.();
    if (!auth?.userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { reviewId, action, note } = body;

    if (!reviewId || !action) {
      return new Response(JSON.stringify({ error: 'Missing reviewId or action' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!['approve', 'reject'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid action. Use approve or reject' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await moderateReview(
      reviewId,
      auth.userId,
      action as 'approve' | 'reject',
      note
    );

    if (!result) {
      return new Response(JSON.stringify({ error: 'Review not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: action === 'approve' ? 'Review approved' : 'Review rejected',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Admin reviews PUT error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE - Delete review
export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const auth = locals.auth?.();
    if (!auth?.userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const reviewId = url.searchParams.get('id');

    if (!reviewId) {
      return new Response(JSON.stringify({ error: 'Missing review id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await adminDeleteReview(parseInt(reviewId));

    if (!result) {
      return new Response(JSON.stringify({ error: 'Review not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Review deleted',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Admin reviews DELETE error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
