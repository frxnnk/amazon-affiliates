/**
 * API Endpoint: Review Helpful Votes
 *
 * POST /api/user/review-vote - Vote on a review (helpful/not helpful)
 * GET /api/user/review-vote?reviewId=XXX - Get user's vote for a review
 *
 * Requires authentication for POST
 */

import type { APIRoute } from 'astro';
import { voteReviewHelpful, getUserReviewVote, getReviewById } from '@lib/db';

export const prerender = false;

// Vote on review (POST)
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
    const { reviewId, isHelpful } = body;

    // Validate reviewId
    if (!reviewId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Review ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const reviewIdNum = parseInt(reviewId);
    if (isNaN(reviewIdNum)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid review ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate isHelpful
    if (typeof isHelpful !== 'boolean') {
      return new Response(
        JSON.stringify({ success: false, error: 'isHelpful must be a boolean' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if review exists
    const review = await getReviewById(reviewIdNum);
    if (!review) {
      return new Response(
        JSON.stringify({ success: false, error: 'Review not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Don't allow voting on own review
    if (review.userId === userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot vote on your own review' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Record the vote
    const vote = await voteReviewHelpful(reviewIdNum, userId, isHelpful);

    // Get updated review to return helpful count
    const updatedReview = await getReviewById(reviewIdNum);

    return new Response(
      JSON.stringify({
        success: true,
        message: isHelpful ? 'Marked as helpful' : 'Marked as not helpful',
        vote,
        helpfulCount: updatedReview?.helpfulCount || 0
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Vote review error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Get user's vote (GET)
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const reviewId = url.searchParams.get('reviewId');

    if (!reviewId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Review ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const reviewIdNum = parseInt(reviewId);
    if (isNaN(reviewIdNum)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid review ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check authentication
    const auth = locals.auth?.();
    if (!auth?.userId) {
      // Return null vote for unauthenticated users
      return new Response(
        JSON.stringify({
          success: true,
          vote: null,
          isAuthenticated: false
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const vote = await getUserReviewVote(reviewIdNum, auth.userId);

    return new Response(
      JSON.stringify({
        success: true,
        vote,
        isAuthenticated: true
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get vote error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
