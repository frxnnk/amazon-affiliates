/**
 * Amazon Reviews API
 * GET - Fetch and cache Amazon reviews for a product
 * POST - Force refresh reviews from RapidAPI
 */

import type { APIRoute } from 'astro';
import { getProductReviewsRainforest } from '@lib/rainforest-api';
import { saveAmazonReviews, getAmazonReviews, hasAmazonReviews, getAmazonReviewsFetchTime, deleteAmazonReviews } from '@lib/db';

export const prerender = false;

// Cache duration: 7 days
const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const asin = url.searchParams.get('asin');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const sortBy = url.searchParams.get('sortBy') as 'recent' | 'helpful' | 'highest' | 'lowest' || 'helpful';
    const verifiedOnly = url.searchParams.get('verifiedOnly') === 'true';
    const forceRefresh = url.searchParams.get('refresh') === 'true';
    const marketplace = url.searchParams.get('marketplace') || 'com';

    if (!asin) {
      return new Response(JSON.stringify({ error: 'ASIN is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if we need to fetch from RapidAPI
    let needsFetch = forceRefresh;

    if (!needsFetch) {
      const hasReviews = await hasAmazonReviews(asin);
      if (!hasReviews) {
        needsFetch = true;
      } else {
        // Check cache age
        const lastFetch = await getAmazonReviewsFetchTime(asin);
        if (lastFetch) {
          const age = Date.now() - lastFetch.getTime();
          if (age > CACHE_DURATION_MS) {
            needsFetch = true;
          }
        }
      }
    }

    // Fetch from RapidAPI if needed
    if (needsFetch) {
      const result = await getProductReviewsRainforest(asin, {
        amazonDomain: marketplace,
        page: 1,
        sortBy: 'TOP_REVIEWS',
      });

      if (result.success && result.data) {
        // Delete old reviews if refreshing
        if (forceRefresh) {
          await deleteAmazonReviews(asin);
        }

        // Save new reviews
        const reviewsToSave = result.data.reviews.map(review => ({
          asin,
          externalId: review.id,
          title: review.title,
          content: review.content,
          rating: review.rating,
          reviewerName: review.reviewerName,
          reviewerUrl: review.reviewerUrl || undefined,
          isVerifiedPurchase: review.isVerifiedPurchase,
          helpfulCount: review.helpfulCount,
          reviewDate: review.reviewDate,
          images: review.images,
          source: 'rapidapi',
          marketplace,
        }));

        const savedCount = await saveAmazonReviews(reviewsToSave);
        console.log(`Saved ${savedCount} Amazon reviews for ${asin}`);
      }
    }

    // Get reviews from database
    const offset = (page - 1) * limit;
    const data = await getAmazonReviews(asin, {
      limit,
      offset,
      sortBy,
      verifiedOnly,
    });

    return new Response(JSON.stringify({
      success: true,
      asin,
      reviews: data.reviews,
      stats: data.stats,
      pagination: {
        page,
        limit,
        total: data.total,
        hasMore: offset + data.reviews.length < data.total,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Amazon reviews error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch reviews',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST - Force refresh reviews
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { asin, marketplace = 'com' } = body;

    if (!asin) {
      return new Response(JSON.stringify({ error: 'ASIN is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch from RapidAPI
    const result = await getProductReviewsRainforest(asin, {
      amazonDomain: marketplace,
      page: 1,
      sortBy: 'TOP_REVIEWS',
    });

    if (!result.success) {
      return new Response(JSON.stringify({
        error: 'Failed to fetch from Amazon',
        details: result.error?.message,
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete old reviews
    const deleted = await deleteAmazonReviews(asin);

    // Save new reviews
    const reviewsToSave = result.data!.reviews.map(review => ({
      asin,
      externalId: review.id,
      title: review.title,
      content: review.content,
      rating: review.rating,
      reviewerName: review.reviewerName,
      reviewerUrl: review.reviewerUrl || undefined,
      isVerifiedPurchase: review.isVerifiedPurchase,
      helpfulCount: review.helpfulCount,
      reviewDate: review.reviewDate,
      images: review.images,
      source: 'rapidapi',
      marketplace,
    }));

    const savedCount = await saveAmazonReviews(reviewsToSave);

    return new Response(JSON.stringify({
      success: true,
      asin,
      deleted,
      saved: savedCount,
      stats: {
        totalReviews: result.data!.totalReviews,
        averageRating: result.data!.averageRating,
        ratingBreakdown: result.data!.ratingBreakdown,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Amazon reviews refresh error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to refresh reviews',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
