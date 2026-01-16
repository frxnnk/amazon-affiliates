import type { APIRoute } from 'astro';
import { unauthorizedResponse } from '@lib/auth';
import { getProductRainforest, type RainforestProductData } from '@lib/rainforest-api';
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
    const { url, asin: rawAsin, marketplace = 'com' } = body;

    // Extract ASIN from URL or use provided ASIN
    let asin: string | null = null;
    let extractedMarketplace = marketplace;

    if (rawAsin && isValidAsin(rawAsin)) {
      asin = rawAsin.toUpperCase();
    } else if (url) {
      const parsed = parseAmazonUrl(url);
      if (parsed) {
        asin = parsed.asin;
        extractedMarketplace = parsed.marketplace || marketplace;
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

    // Fetch product data from RapidAPI
    const result = await getProductRainforest(asin, extractedMarketplace);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: result.error.message,
          code: result.error.code,
        }),
        { status: result.error.code === 'PRODUCT_NOT_FOUND' ? 404 : 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Transform RapidAPI data to product form format
    const productData = transformToProductData(result.data, extractedMarketplace);

    return new Response(
      JSON.stringify({
        success: true,
        data: productData,
        source: 'rapidapi',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Fetch Product RapidAPI Error]', error);
    return new Response(
      JSON.stringify({ error: 'Error processing request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * Transform RapidAPI response to product creation format
 */
function transformToProductData(data: RainforestProductData, marketplace: string) {
  // Generate slug from title
  const slug = data.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/-$/, '');

  const lang = marketplace === 'es' ? 'es' : 'en';
  const affiliateTag = import.meta.env.AMAZON_PA_API_PARTNER_TAG || '';
  const affiliateUrl = affiliateTag
    ? `https://www.amazon.${marketplace}/dp/${data.asin}?tag=${affiliateTag}`
    : `https://www.amazon.${marketplace}/dp/${data.asin}`;

  return {
    // Core identifiers
    productId: slug,
    asin: data.asin,
    marketplace,
    lang,

    // Content
    title: data.title,
    brand: data.brand || '',
    description: data.description || '',
    shortDescription: data.features[0] || '',

    // Pricing
    price: data.price || 0,
    originalPrice: data.originalPrice,
    currency: data.currency,
    isOnSale: data.originalPrice && data.price
      ? data.price < data.originalPrice
      : false,

    // Ratings
    rating: data.rating,
    totalReviews: data.totalReviews,

    // Images
    featuredImageUrl: data.imageUrl || '',
    featuredImageAlt: data.title,
    gallery: data.images.slice(1).map((url) => ({
      url,
      alt: data.title,
    })),

    // URL
    affiliateUrl,

    // Features
    features: data.features,
    pros: data.features.slice(0, 5),
    cons: [],

    // Category from API
    category: data.categories[0] || '',

    // Prime and deals
    isPrime: data.isPrime,
    dealType: data.dealType,

    // Defaults
    status: 'draft',
    isFeatured: false,
    tags: [],
  };
}

export const prerender = false;
