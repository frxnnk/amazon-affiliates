import type { APIRoute } from 'astro';
import { unauthorizedResponse } from '@lib/auth';
import { createProduct, getAllProducts, type ProductInput } from '@lib/db';
import { slugify } from '@utils/markdown';

// GET - List all products (admin)
export const GET: APIRoute = async (context) => {
  const { locals, url } = context;
  const auth = locals.auth?.();
  const userId = auth?.userId;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify admin role using Clerk metadata
  const userRole = (auth?.sessionClaims?.metadata as { role?: string })?.role;
  if (userRole !== 'admin') {
    return unauthorizedResponse('Admin access required');
  }

  try {
    // Parse query params for filtering
    const lang = url.searchParams.get('lang') || undefined;
    const status = url.searchParams.get('status') as 'draft' | 'published' | 'archived' | undefined;

    const products = await getAllProducts({ lang, status });

    return new Response(JSON.stringify({ success: true, products }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[List Products Error]', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch products' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// POST - Create a new product
export const POST: APIRoute = async (context) => {
  const { request, locals } = context;
  const auth = locals.auth?.();
  const userId = auth?.userId;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify admin role using Clerk metadata
  const userRole = (auth?.sessionClaims?.metadata as { role?: string })?.role;
  if (userRole !== 'admin') {
    return unauthorizedResponse('Admin access required');
  }

  try {
    const data = await request.json();

    // Validate required fields
    if (!data.title || !data.asin) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title, asin' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const productId = data.productId || slugify(data.title);
    const lang = data.lang || 'en';

    // Build product input
    const productInput: ProductInput = {
      productId,
      asin: data.asin,
      lang,
      title: data.title,
      brand: data.brand || '',
      model: data.model || undefined,
      description: data.description || '',
      shortDescription: data.shortDescription || undefined,
      category: data.category || undefined,
      subcategory: data.subcategory || undefined,
      tags: data.tags || [],
      price: parseFloat(data.price) || 0,
      originalPrice: data.originalPrice ? parseFloat(data.originalPrice) : undefined,
      currency: data.currency || 'USD',
      affiliateUrl: data.affiliateUrl || `https://www.amazon.${lang === 'en' ? 'com' : 'es'}/dp/${data.asin}`,
      rating: data.rating ? parseFloat(data.rating) : undefined,
      totalReviews: data.totalReviews ? parseInt(data.totalReviews) : undefined,
      ourRating: data.ourRating ? parseFloat(data.ourRating) : undefined,
      pros: data.pros || [],
      cons: data.cons || [],
      specifications: data.specifications || undefined,
      featuredImageUrl: data.featuredImageUrl || data.featuredImage?.url || '',
      featuredImageAlt: data.featuredImageAlt || data.featuredImage?.alt || data.title,
      gallery: data.gallery || undefined,
      content: data.content || undefined,
      status: data.status || 'draft',
      isFeatured: Boolean(data.isFeatured),
      isOnSale: Boolean(data.isOnSale),
      relatedProducts: data.relatedProducts || undefined,
    };

    const product = await createProduct(productInput);

    return new Response(
      JSON.stringify({
        success: true,
        product,
        message: 'Product created successfully',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Create Product Error]', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: `Failed to create product: ${message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const prerender = false;
