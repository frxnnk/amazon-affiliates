/**
 * API Endpoint: Product Comments
 * 
 * POST /api/user/comment - Add a comment to a product
 * GET /api/user/comment?asin=XXX - Get comments for a product
 * DELETE /api/user/comment?id=XXX - Delete user's own comment
 * 
 * Requires authentication for POST and DELETE
 */

import type { APIRoute } from 'astro';
import { db, ProductComments, Users, eq, and, desc } from 'astro:db';

export const prerender = false;

// Add comment (POST)
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
    const { asin, productId, content } = body;

    if (!asin) {
      return new Response(
        JSON.stringify({ success: false, error: 'ASIN is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!content || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Comment content is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (content.length > 500) {
      return new Response(
        JSON.stringify({ success: false, error: 'Comment too long (max 500 characters)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Insert comment
    const now = new Date();
    const result = await db.insert(ProductComments).values({
      userId,
      asin,
      productId: productId || null,
      content: content.trim(),
      isVisible: true,
      createdAt: now,
      updatedAt: now,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Comment added successfully',
        commentId: result.lastInsertRowid
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Add comment error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Get comments (GET)
export const GET: APIRoute = async ({ url }) => {
  try {
    const asin = url.searchParams.get('asin');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    if (!asin) {
      return new Response(
        JSON.stringify({ success: false, error: 'ASIN is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get visible comments with user info
    const comments = await db
      .select({
        id: ProductComments.id,
        userId: ProductComments.userId,
        content: ProductComments.content,
        createdAt: ProductComments.createdAt,
      })
      .from(ProductComments)
      .where(and(
        eq(ProductComments.asin, asin),
        eq(ProductComments.isVisible, true)
      ))
      .orderBy(desc(ProductComments.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    // Get total count
    const allComments = await db
      .select()
      .from(ProductComments)
      .where(and(
        eq(ProductComments.asin, asin),
        eq(ProductComments.isVisible, true)
      ))
      .all();

    return new Response(
      JSON.stringify({ 
        success: true, 
        comments,
        total: allComments.length,
        hasMore: offset + comments.length < allComments.length
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
    console.error('Get comments error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Delete comment (DELETE)
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

    const commentId = url.searchParams.get('id');
    
    if (!commentId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Comment ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find the comment
    const comment = await db
      .select()
      .from(ProductComments)
      .where(eq(ProductComments.id, parseInt(commentId)))
      .get();

    if (!comment) {
      return new Response(
        JSON.stringify({ success: false, error: 'Comment not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check ownership
    if (comment.userId !== auth.userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Not authorized to delete this comment' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete the comment
    await db
      .delete(ProductComments)
      .where(eq(ProductComments.id, parseInt(commentId)));

    return new Response(
      JSON.stringify({ success: true, message: 'Comment deleted' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Delete comment error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
