import type { APIRoute } from 'astro';
import { unauthorizedResponse } from '@lib/auth';
import { getProduct, getAdapterStatus } from '@lib/amazon-api-adapter';
import type { RainforestProductData } from '@lib/rainforest-api';
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

    // Fetch product data using unified adapter (Creators API -> RapidAPI fallback)
    const result = await getProduct(asin, 'com');

    if (!result.success || !result.data) {
      const adapterStatus = getAdapterStatus();
      const statusCode = adapterStatus.primaryApi === 'none' ? 500 : 502;

      return new Response(
        JSON.stringify({
          error: result.error || 'Product not found',
          code: 'API_ERROR',
          apiStatus: adapterStatus,
        }),
        { status: statusCode, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Transform API data to product form format
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
 * Transform API response to product creation format
 * Works with RainforestProductData (unified format from adapter)
 */
function transformToProductData(apiData: RainforestProductData) {
  // Generate slug from title
  const slug = apiData.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/-$/, '');

  return {
    // Core identifiers
    productId: slug,
    asin: apiData.asin,

    // Content
    title: apiData.title,
    brand: apiData.brand || '',
    description: apiData.description || apiData.features.join('\n\n') || '',
    shortDescription: apiData.features[0] || '',

    // Pricing
    price: apiData.price || 0,
    originalPrice: apiData.originalPrice,
    currency: apiData.currency,
    isOnSale: apiData.originalPrice
      ? apiData.price !== null && apiData.price < apiData.originalPrice
      : false,

    // Ratings
    rating: apiData.rating,
    totalReviews: apiData.totalReviews,

    // Images
    featuredImageUrl: apiData.imageUrl || '',
    featuredImageAlt: apiData.title,
    gallery: apiData.images.slice(1).map((url) => ({
      url,
      alt: apiData.title,
    })),

    // URL
    affiliateUrl: apiData.url,

    // Features as pros (user can edit)
    pros: apiData.features.slice(0, 5),
    cons: [],

    // Availability
    availability: apiData.availability,

    // Defaults
    status: 'draft',
    isFeatured: false,
    category: apiData.categories?.[0] || '',
    tags: [],
  };
}

export const prerender = false;
