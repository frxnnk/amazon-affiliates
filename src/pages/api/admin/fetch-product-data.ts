import type { APIRoute } from 'astro';
import { unauthorizedResponse } from '@lib/auth';
import { getProductByAsin, type PAAPIProductData } from '@lib/amazon-paapi';
import { parseAmazonUrl, isValidAsin } from '@utils/amazon';

export const POST: APIRoute = async ({ request, locals }) => {
  // Check authentication using Clerk
  const auth = locals.auth?.();
  const userId = auth?.userId;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check admin role from Clerk metadata
  const userRole = (auth?.sessionClaims?.metadata as { role?: string })?.role;
  if (userRole !== 'admin') {
    return unauthorizedResponse('Admin access required');
  }

  try {
    const body = await request.json();
    const { url, asin: rawAsin } = body;

    // Extract ASIN from URL or use provided ASIN
    let asin: string | null = null;

    if (rawAsin && isValidAsin(rawAsin)) {
      asin = rawAsin.toUpperCase();
    } else if (url) {
      const parsed = parseAmazonUrl(url);
      if (parsed) {
        asin = parsed.asin;
      }
    }

    if (!asin) {
      return new Response(
        JSON.stringify({
          error: 'Invalid input. Provide a valid Amazon URL or ASIN.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch product data from PA-API
    const result = await getProductByAsin(asin);

    if (!result.success) {
      const statusCode =
        result.error.code === 'MISSING_CONFIG'
          ? 500
          : result.error.code === 'ITEM_NOT_FOUND'
            ? 404
            : result.error.code === 'INVALID_ASIN'
              ? 400
              : 502;

      return new Response(
        JSON.stringify({
          error: result.error.message,
          code: result.error.code,
        }),
        { status: statusCode, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Transform PA-API data to product form format
    const productData = transformToProductData(result.data);

    return new Response(
      JSON.stringify({
        success: true,
        data: productData,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Fetch Product Data Error]', error);
    return new Response(
      JSON.stringify({ error: 'Error processing request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * Transform PA-API response to product creation format
 */
function transformToProductData(paapiData: PAAPIProductData) {
  // Generate slug from title
  const slug = paapiData.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/-$/, '');

  return {
    // Core identifiers
    productId: slug,
    asin: paapiData.asin,

    // Content
    title: paapiData.title,
    brand: paapiData.brand || '',
    description: paapiData.description || paapiData.features.join('\n\n') || '',
    shortDescription: paapiData.features[0] || '',

    // Pricing
    price: paapiData.price || 0,
    originalPrice: paapiData.originalPrice,
    currency: paapiData.currency,
    isOnSale: paapiData.originalPrice
      ? paapiData.price !== null && paapiData.price < paapiData.originalPrice
      : false,

    // Ratings
    rating: paapiData.rating,
    totalReviews: paapiData.totalReviews,

    // Images
    featuredImageUrl: paapiData.imageUrl || '',
    featuredImageAlt: paapiData.title,
    gallery: paapiData.images.slice(1).map((url) => ({
      url,
      alt: paapiData.title,
    })),

    // URL
    affiliateUrl: paapiData.url,

    // Features as pros (user can edit)
    pros: paapiData.features.slice(0, 5),
    cons: [],

    // Availability
    availability: paapiData.availability,

    // Defaults
    status: 'draft',
    isFeatured: false,
    category: '',
    tags: [],
  };
}

export const prerender = false;
