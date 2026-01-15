import type { APIRoute } from 'astro';
import { unauthorizedResponse } from '@lib/auth';
import { getProductById, getProductBySlug, updateProduct, deleteProduct } from '@lib/db';

// Helper to check admin auth
function checkAdminAuth(locals: any) {
  const auth = locals.auth?.();
  const userId = auth?.userId;
  const userRole = (auth?.sessionClaims?.metadata as { role?: string })?.role;
  return { userId, isAdmin: userRole === 'admin' };
}

// GET - Get a single product by ID
export const GET: APIRoute = async (context) => {
  const { locals, params } = context;
  const { userId, isAdmin } = checkAdminAuth(locals);

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!isAdmin) {
    return unauthorizedResponse('Admin access required');
  }

  try {
    const id = params.id;
    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Product ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Try to get by numeric ID first, then by slug
    let product = null;
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
      product = await getProductById(numericId);
    }
    if (!product) {
      product = await getProductBySlug(id);
    }

    if (!product) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ success: true, product }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Get Product Error]', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch product' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// PUT - Update a product
export const PUT: APIRoute = async (context) => {
  const { request, locals, params } = context;
  const { userId, isAdmin } = checkAdminAuth(locals);

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!isAdmin) {
    return unauthorizedResponse('Admin access required');
  }

  try {
    const id = params.id;
    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Product ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get existing product
    const numericId = parseInt(id);
    let product = null;
    if (!isNaN(numericId)) {
      product = await getProductById(numericId);
    }
    if (!product) {
      product = await getProductBySlug(id);
    }

    if (!product) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await request.json();

    // Build update data
    const updateData: Record<string, any> = {};

    // Only include fields that were provided
    if (data.title !== undefined) updateData.title = data.title;
    if (data.brand !== undefined) updateData.brand = data.brand;
    if (data.model !== undefined) updateData.model = data.model;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.shortDescription !== undefined) updateData.shortDescription = data.shortDescription;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.subcategory !== undefined) updateData.subcategory = data.subcategory;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.price !== undefined) updateData.price = parseFloat(data.price);
    if (data.originalPrice !== undefined) updateData.originalPrice = data.originalPrice ? parseFloat(data.originalPrice) : null;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.affiliateUrl !== undefined) updateData.affiliateUrl = data.affiliateUrl;
    if (data.rating !== undefined) updateData.rating = data.rating ? parseFloat(data.rating) : null;
    if (data.totalReviews !== undefined) updateData.totalReviews = data.totalReviews ? parseInt(data.totalReviews) : null;
    if (data.ourRating !== undefined) updateData.ourRating = data.ourRating ? parseFloat(data.ourRating) : null;
    if (data.pros !== undefined) updateData.pros = data.pros;
    if (data.cons !== undefined) updateData.cons = data.cons;
    if (data.specifications !== undefined) updateData.specifications = data.specifications;
    if (data.featuredImageUrl !== undefined) updateData.featuredImageUrl = data.featuredImageUrl;
    if (data.featuredImageAlt !== undefined) updateData.featuredImageAlt = data.featuredImageAlt;
    if (data.gallery !== undefined) updateData.gallery = data.gallery;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.isFeatured !== undefined) updateData.isFeatured = Boolean(data.isFeatured);
    if (data.isOnSale !== undefined) updateData.isOnSale = Boolean(data.isOnSale);
    if (data.relatedProducts !== undefined) updateData.relatedProducts = data.relatedProducts;

    const updatedProduct = await updateProduct(product.id, updateData);

    return new Response(
      JSON.stringify({
        success: true,
        product: updatedProduct,
        message: 'Product updated successfully',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Update Product Error]', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: `Failed to update product: ${message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// DELETE - Delete a product
export const DELETE: APIRoute = async (context) => {
  const { locals, params } = context;
  const { userId, isAdmin } = checkAdminAuth(locals);

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!isAdmin) {
    return unauthorizedResponse('Admin access required');
  }

  try {
    const id = params.id;
    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Product ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get existing product
    const numericId = parseInt(id);
    let product = null;
    if (!isNaN(numericId)) {
      product = await getProductById(numericId);
    }
    if (!product) {
      product = await getProductBySlug(id);
    }

    if (!product) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await deleteProduct(product.id);

    return new Response(
      JSON.stringify({
        success: true,
        productId: product.productId,
        message: 'Product deleted successfully',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Delete Product Error]', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: `Failed to delete product: ${message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const prerender = false;
