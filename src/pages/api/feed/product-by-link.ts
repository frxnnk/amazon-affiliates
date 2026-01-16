import type { APIRoute } from 'astro';
import { getProductRainforest } from '@lib/rainforest-api';

/**
 * Public endpoint to get product data from an Amazon URL
 * Used by the feed search bar when a user pastes an Amazon link
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse the Amazon URL to extract ASIN and marketplace
    const parsed = parseAmazonUrl(url);

    if (!parsed) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid Amazon URL' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch product data from RapidAPI
    const result = await getProductRainforest(parsed.asin, parsed.marketplace);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error?.message || 'Failed to fetch product data',
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Transform to feed product format
    const affiliateTag = import.meta.env.AMAZON_PA_API_PARTNER_TAG || '';
    const affiliateUrl = affiliateTag
      ? `https://www.amazon.${parsed.marketplace}/dp/${parsed.asin}?tag=${affiliateTag}`
      : `https://www.amazon.${parsed.marketplace}/dp/${parsed.asin}`;

    const product = {
      asin: result.data.asin,
      title: result.data.title,
      brand: result.data.brand || '',
      price: result.data.price || 0,
      originalPrice: result.data.originalPrice,
      currency: result.data.currency || 'USD',
      formattedPrice: formatPrice(result.data.price, result.data.currency),
      discountPercent: result.data.originalPrice && result.data.price
        ? Math.round(((result.data.originalPrice - result.data.price) / result.data.originalPrice) * 100)
        : 0,
      rating: result.data.rating,
      totalReviews: result.data.totalReviews,
      featuredImage: {
        url: result.data.imageUrl || '',
        alt: result.data.title,
      },
      affiliateUrl,
      category: mapToCategory(result.data.categories),
      isPrime: result.data.isPrime,
      isBestSeller: result.data.isBestSeller,
      isAmazonChoice: result.data.isAmazonChoice,
      badges: getBadges(result.data),
      // Flag to indicate this is a pasted product
      isFromLink: true,
    };

    return new Response(
      JSON.stringify({ success: true, product }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Product by Link Error]', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to process request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * Parse Amazon URL to extract ASIN and marketplace
 */
function parseAmazonUrl(url: string): { asin: string; marketplace: string } | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    if (!hostname.includes('amazon.')) {
      return null;
    }

    // Determine marketplace
    let marketplace = 'com';
    if (hostname.includes('amazon.es')) marketplace = 'es';
    else if (hostname.includes('amazon.co.uk')) marketplace = 'co.uk';
    else if (hostname.includes('amazon.de')) marketplace = 'de';
    else if (hostname.includes('amazon.fr')) marketplace = 'fr';
    else if (hostname.includes('amazon.it')) marketplace = 'it';
    else if (hostname.includes('amazon.com.mx')) marketplace = 'com.mx';
    else if (hostname.includes('amazon.ca')) marketplace = 'ca';

    // Extract ASIN from various URL patterns
    const patterns = [
      /\/dp\/([A-Z0-9]{10})/i,
      /\/gp\/product\/([A-Z0-9]{10})/i,
      /\/gp\/aw\/d\/([A-Z0-9]{10})/i,
      /\/([A-Z0-9]{10})(?:\/|\?|$)/i,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return { asin: match[1].toUpperCase(), marketplace };
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Format price with currency
 */
function formatPrice(price: number | null, currency: string | null): string {
  if (price === null) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(price);
}

/**
 * Map Amazon categories to our internal categories
 */
function mapToCategory(categories: string[]): string {
  const categoryText = categories.join(' ').toLowerCase();

  if (categoryText.includes('electronics') || categoryText.includes('computer')) return 'electronics';
  if (categoryText.includes('headphone') || categoryText.includes('speaker') || categoryText.includes('audio')) return 'audio';
  if (categoryText.includes('game') || categoryText.includes('gaming') || categoryText.includes('console')) return 'gaming';
  if (categoryText.includes('home') || categoryText.includes('kitchen') || categoryText.includes('furniture')) return 'home';
  if (categoryText.includes('watch') || categoryText.includes('fitness') || categoryText.includes('wearable')) return 'wearables';

  return 'all';
}

/**
 * Get badges for the product
 */
function getBadges(data: any): string[] {
  const badges: string[] = [];
  if (data.isBestSeller) badges.push('bestseller');
  if (data.isAmazonChoice) badges.push('amazon_choice');
  if (data.dealType) badges.push('deal');
  return badges;
}

export const prerender = false;
