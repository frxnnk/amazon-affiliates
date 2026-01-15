/**
 * API Endpoint: Similar Products
 *
 * GET /api/products/similar?asin=B0123456&lang=es&limit=8
 *
 * Returns products similar to the given product based on:
 * - Category
 * - Brand
 * - Price range
 * - Rating
 *
 * Useful for "More like this" sections
 */

import type { APIRoute } from 'astro';
import { getProductRecommendations } from '@lib/content-similarity';
import { db, Products, eq, and } from 'astro:db';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    const asin = url.searchParams.get('asin');
    const lang = url.searchParams.get('lang') || 'en';
    const limit = parseInt(url.searchParams.get('limit') || '8', 10);

    if (!asin) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing asin parameter',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get similar products
    const similar = await getProductRecommendations(asin, lang, limit);

    if (similar.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          products: [],
          message: 'No similar products found',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch full product details for the similar products
    const similarProducts = await Promise.all(
      similar.map(async (s) => {
        const product = await db.select()
          .from(Products)
          .where(and(
            eq(Products.asin, s.asin),
            eq(Products.status, 'published')
          ))
          .get();

        if (!product) return null;

        return {
          asin: product.asin,
          productId: product.productId,
          title: product.title,
          brand: product.brand,
          price: product.price,
          originalPrice: product.originalPrice,
          currency: product.currency,
          rating: product.rating,
          featuredImage: {
            url: product.featuredImageUrl,
            alt: product.featuredImageAlt || product.title,
          },
          affiliateUrl: product.affiliateUrl,
          similarityScore: s.score,
          similarityReason: s.reason,
        };
      })
    );

    // Filter out nulls
    const validProducts = similarProducts.filter(Boolean);

    return new Response(
      JSON.stringify({
        success: true,
        sourceAsin: asin,
        products: validProducts,
        total: validProducts.length,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        },
      }
    );

  } catch (error) {
    console.error('[Similar API] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
