/**
 * API Endpoint: Product Likes
 * 
 * POST /api/user/like - Toggle like on a product
 * GET /api/user/like?asin=XXX - Check if user liked a product
 * 
 * Requires authentication via Clerk
 */

import type { APIRoute } from 'astro';
import { db, ProductLikes, eq, and } from 'astro:db';

export const prerender = false;

// Toggle like (POST)
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
    const { asin, productId } = body;

    if (!asin) {
      return new Response(
        JSON.stringify({ success: false, error: 'ASIN is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if already liked
    const existingLike = await db
      .select()
      .from(ProductLikes)
      .where(and(eq(ProductLikes.userId, userId), eq(ProductLikes.asin, asin)))
      .get();

    if (existingLike) {
      // Unlike - remove the like
      await db
        .delete(ProductLikes)
        .where(and(eq(ProductLikes.userId, userId), eq(ProductLikes.asin, asin)));
      
      // Get updated count
      const likeCount = await db
        .select()
        .from(ProductLikes)
        .where(eq(ProductLikes.asin, asin))
        .all();

      return new Response(
        JSON.stringify({ 
          success: true, 
          liked: false, 
          count: likeCount.length 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      // Like - add new like
      await db.insert(ProductLikes).values({
        userId,
        asin,
        productId: productId || null,
        createdAt: new Date(),
      });

      // Get updated count
      const likeCount = await db
        .select()
        .from(ProductLikes)
        .where(eq(ProductLikes.asin, asin))
        .all();

      return new Response(
        JSON.stringify({ 
          success: true, 
          liked: true, 
          count: likeCount.length 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Like error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Check like status (GET)
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const asin = url.searchParams.get('asin');
    
    if (!asin) {
      return new Response(
        JSON.stringify({ success: false, error: 'ASIN is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get total like count (public)
    const allLikes = await db
      .select()
      .from(ProductLikes)
      .where(eq(ProductLikes.asin, asin))
      .all();

    const count = allLikes.length;

    // Check if current user liked (if authenticated)
    const auth = locals.auth?.();
    let liked = false;
    
    if (auth?.userId) {
      const userLike = await db
        .select()
        .from(ProductLikes)
        .where(and(eq(ProductLikes.userId, auth.userId), eq(ProductLikes.asin, asin)))
        .get();
      
      liked = !!userLike;
    }

    return new Response(
      JSON.stringify({ success: true, liked, count }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        } 
      }
    );
  } catch (error) {
    console.error('Get like error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
