/**
 * API Endpoint: User Profile Data
 * 
 * GET /api/user/profile - Get user's liked products
 * 
 * Requires authentication via Clerk
 */

import type { APIRoute } from 'astro';
import { db, ProductLikes, Products, eq, desc } from 'astro:db';

export const prerender = false;

interface ProfileProduct {
  asin: string;
  productId?: string;
  title?: string;
  brand?: string;
  price?: number;
  currency?: string;
  featuredImageUrl?: string;
  affiliateUrl?: string;
}

export const GET: APIRoute = async ({ url, locals }) => {
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
    const type = url.searchParams.get('type') || 'likes';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    if (type === 'likes') {
      // Get user's liked products
      const likes = await db
        .select()
        .from(ProductLikes)
        .where(eq(ProductLikes.userId, userId))
        .orderBy(desc(ProductLikes.createdAt))
        .limit(limit)
        .offset(offset)
        .all();

      // Enrich with product data
      const products: ProfileProduct[] = [];

      for (const like of likes) {
        const product: ProfileProduct = {
          asin: like.asin,
          productId: like.productId || undefined,
        };

        // Try to get product details if we have a productId
        if (like.productId) {
          const dbProduct = await db
            .select()
            .from(Products)
            .where(eq(Products.productId, like.productId))
            .get();

          if (dbProduct) {
            product.title = dbProduct.title;
            product.brand = dbProduct.brand;
            product.price = dbProduct.price;
            product.currency = dbProduct.currency;
            product.featuredImageUrl = dbProduct.featuredImageUrl;
            product.affiliateUrl = dbProduct.affiliateUrl;
          }
        }

        products.push(product);
      }

      // Get total count
      const totalLikes = await db
        .select()
        .from(ProductLikes)
        .where(eq(ProductLikes.userId, userId))
        .all();

      return new Response(
        JSON.stringify({
          success: true,
          products,
          total: totalLikes.length,
          page,
          hasMore: offset + likes.length < totalLikes.length,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // For 'saved' - stored in localStorage on client
    return new Response(
      JSON.stringify({
        success: true,
        products: [],
        message: 'Saved items are stored locally',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Profile error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
