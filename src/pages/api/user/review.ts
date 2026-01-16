/**
 * API Endpoint: Product Reviews
 *
 * POST /api/user/review - Create a review for a product
 * GET /api/user/review?asin=XXX - Get reviews for a product
 * PUT /api/user/review?id=XXX - Update user's own review
 * DELETE /api/user/review?id=XXX - Delete user's own review
 *
 * Requires authentication for POST, PUT, and DELETE
 */

import type { APIRoute } from 'astro';
import {
  createReview,
  getProductReviews,
  getReviewStats,
  updateReview,
  deleteReview,
  getUserReview,
  hasUserReviewed
} from '@lib/db';
import { TEXT_LIMITS } from '@lib/text-constants';

export const prerender = false;

// Create review (POST)
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check authentication
    const auth = locals.auth?.();
    if (!auth?.userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = auth.userId;
    const body = await request.json();
    const { asin, productId, rating, title, content } = body;

    // Validate ASIN
    if (!asin) {
      return new Response(
        JSON.stringify({ success: false, error: 'ASIN is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate rating
    if (rating === undefined || rating === null) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rating is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ratingNum = Number(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rating must be between 1 and 5' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Review content is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (content.length < TEXT_LIMITS.REVIEW_CONTENT_MIN) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Review must be at least ${TEXT_LIMITS.REVIEW_CONTENT_MIN} characters`
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (content.length > TEXT_LIMITS.REVIEW_CONTENT_MAX) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Review must be ${TEXT_LIMITS.REVIEW_CONTENT_MAX} characters or less`
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate title if provided
    if (title && title.length > TEXT_LIMITS.REVIEW_TITLE_MAX) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Title must be ${TEXT_LIMITS.REVIEW_TITLE_MAX} characters or less`
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already reviewed
    const alreadyReviewed = await hasUserReviewed(userId, asin);
    if (alreadyReviewed) {
      return new Response(
        JSON.stringify({ success: false, error: 'You have already reviewed this product' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create review
    const review = await createReview({
      userId,
      asin,
      productId: productId || undefined,
      rating: ratingNum,
      title: title?.trim() || undefined,
      content: content.trim(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Review submitted successfully. It will be visible after moderation.',
        review
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Create review error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Get reviews (GET)
export const GET: APIRoute = async ({ request, url, locals }) => {
  try {
    const asin = url.searchParams.get('asin');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const sortBy = url.searchParams.get('sortBy') as 'recent' | 'helpful' | 'highest' | 'lowest' | null;
    const filterStars = url.searchParams.get('filterStars');
    const verifiedOnly = url.searchParams.get('verifiedOnly') === 'true';

    if (!asin) {
      return new Response(
        JSON.stringify({ success: false, error: 'ASIN is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get reviews
    const offset = (page - 1) * limit;
    const reviews = await getProductReviews(asin, {
      limit: limit + 1, // Get one extra to check if there are more
      offset,
      sortBy: sortBy || 'recent',
      filterStars: filterStars ? parseInt(filterStars) : undefined,
      verifiedOnly,
    });

    // Check if there are more results
    const hasMore = reviews.length > limit;
    const paginatedReviews = hasMore ? reviews.slice(0, limit) : reviews;

    // Get stats
    const stats = await getReviewStats(asin);

    // Check if current user has reviewed (if authenticated)
    let userReview = null;
    const auth = locals.auth?.();
    if (auth?.userId) {
      userReview = await getUserReview(auth.userId, asin);
    }

    return new Response(
      JSON.stringify({
        success: true,
        reviews: paginatedReviews,
        stats,
        userReview,
        pagination: {
          page,
          limit,
          hasMore
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=30' // Cache for 30 seconds
        }
      }
    );
  } catch (error) {
    console.error('Get reviews error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Update review (PUT)
export const PUT: APIRoute = async ({ request, url, locals }) => {
  try {
    // Check authentication
    const auth = locals.auth?.();
    if (!auth?.userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = auth.userId;
    const reviewId = url.searchParams.get('id');

    if (!reviewId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Review ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { rating, title, content } = body;

    // Validate rating if provided
    if (rating !== undefined) {
      const ratingNum = Number(rating);
      if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rating must be between 1 and 5' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate content if provided
    if (content !== undefined) {
      if (content.length < TEXT_LIMITS.REVIEW_CONTENT_MIN) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Review must be at least ${TEXT_LIMITS.REVIEW_CONTENT_MIN} characters`
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (content.length > TEXT_LIMITS.REVIEW_CONTENT_MAX) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Review must be ${TEXT_LIMITS.REVIEW_CONTENT_MAX} characters or less`
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate title if provided
    if (title !== undefined && title.length > TEXT_LIMITS.REVIEW_TITLE_MAX) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Title must be ${TEXT_LIMITS.REVIEW_TITLE_MAX} characters or less`
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const review = await updateReview(
      parseInt(reviewId),
      userId,
      {
        rating: rating !== undefined ? Number(rating) : undefined,
        title: title?.trim(),
        content: content?.trim(),
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Review updated. It will be visible after re-moderation.',
        review
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Update review error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Delete review (DELETE)
export const DELETE: APIRoute = async ({ url, locals }) => {
  try {
    // Check authentication
    const auth = locals.auth?.();
    if (!auth?.userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = auth.userId;
    const reviewId = url.searchParams.get('id');

    if (!reviewId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Review ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await deleteReview(parseInt(reviewId), userId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Review deleted successfully'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Delete review error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
