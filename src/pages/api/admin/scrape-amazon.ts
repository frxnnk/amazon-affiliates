import type { APIRoute } from 'astro';
import { isUserAdmin, unauthorizedResponse } from '@lib/auth';
import { parseAmazonUrl, isValidAsin, generateAffiliateUrl } from '@utils/amazon';

export interface ScrapedProductData {
  asin: string;
  marketplace: string;
  affiliateUrl: string;
  lang: 'es' | 'en';
  title: string | null;
  brand: string | null;
  price: number | null;
  originalPrice: number | null;
  currency: string;
  description: string | null;
  shortDescription: string | null;
  rating: number | null;
  totalReviews: number | null;
  images: string[];
  features: string[];
  category: string | null;
}

/**
 * Attempts to scrape product data from Amazon
 * Falls back gracefully if scraping fails
 */
async function scrapeAmazonProduct(asin: string, marketplace: string): Promise<Partial<ScrapedProductData>> {
  const domain = marketplace === 'com' ? 'amazon.com' : `amazon.${marketplace}`;
  const url = `https://www.${domain}/dp/${asin}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': marketplace === 'es' ? 'es-ES,es;q=0.9,en;q=0.8' : 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });

    if (!response.ok) {
      console.log(`[Scraper] Failed to fetch: ${response.status}`);
      return {};
    }

    const html = await response.text();

    // Parse HTML for product data
    const data: Partial<ScrapedProductData> = {};

    // Title - multiple possible selectors
    const titleMatch = html.match(/<span[^>]*id="productTitle"[^>]*>([^<]+)<\/span>/i) ||
                       html.match(/<h1[^>]*class="[^"]*a-size-large[^"]*"[^>]*>([^<]+)<\/h1>/i);
    if (titleMatch) {
      data.title = titleMatch[1].trim();
    }

    // Brand
    const brandMatch = html.match(/<a[^>]*id="bylineInfo"[^>]*>(?:.*?)?([^<]+)<\/a>/i) ||
                       html.match(/(?:Visit the|Visita la tienda de)\s*<a[^>]*>([^<]+)<\/a>/i) ||
                       html.match(/<tr[^>]*class="[^"]*po-brand[^"]*"[^>]*>.*?<span[^>]*class="[^"]*po-break-word[^"]*"[^>]*>([^<]+)<\/span>/is);
    if (brandMatch) {
      data.brand = brandMatch[1].replace(/^(Visit the|Visita la tienda de|Brand:|Marca:)\s*/i, '').trim();
    }

    // Price - various formats
    const priceMatch = html.match(/<span[^>]*class="[^"]*a-price-whole[^"]*"[^>]*>([0-9.,]+)<\/span>/) ||
                       html.match(/<span[^>]*id="priceblock_ourprice"[^>]*>([^<]+)<\/span>/) ||
                       html.match(/<span[^>]*class="[^"]*apexPriceToPay[^"]*"[^>]*>.*?([0-9.,]+)/is);
    if (priceMatch) {
      const priceStr = priceMatch[1].replace(/[^\d.,]/g, '').replace(',', '.');
      data.price = parseFloat(priceStr) || null;
    }

    // Original price (if on sale)
    const originalPriceMatch = html.match(/<span[^>]*class="[^"]*a-text-price[^"]*"[^>]*data-a-strike="true"[^>]*>.*?([0-9.,]+)/is) ||
                               html.match(/<span[^>]*class="[^"]*priceBlockStrikePriceString[^"]*"[^>]*>([^<]+)<\/span>/);
    if (originalPriceMatch) {
      const origPriceStr = originalPriceMatch[1].replace(/[^\d.,]/g, '').replace(',', '.');
      data.originalPrice = parseFloat(origPriceStr) || null;
    }

    // Rating
    const ratingMatch = html.match(/<span[^>]*class="[^"]*a-icon-alt[^"]*"[^>]*>([0-9.,]+)\s*(?:out of|de)\s*5/i) ||
                        html.match(/([0-9.,]+)\s*(?:out of|de)\s*5\s*stars?/i);
    if (ratingMatch) {
      data.rating = parseFloat(ratingMatch[1].replace(',', '.')) || null;
    }

    // Total reviews
    const reviewsMatch = html.match(/<span[^>]*id="acrCustomerReviewText"[^>]*>([0-9.,]+)\s*(?:ratings?|valoracion)/i) ||
                         html.match(/([0-9.,]+)\s*(?:global ratings|valoraciones globales)/i);
    if (reviewsMatch) {
      data.totalReviews = parseInt(reviewsMatch[1].replace(/[^\d]/g, '')) || null;
    }

    // Images - main product image
    const imageMatches = html.matchAll(/"hiRes"\s*:\s*"(https:\/\/[^"]+)"/g);
    const images: string[] = [];
    for (const match of imageMatches) {
      if (!images.includes(match[1])) {
        images.push(match[1]);
      }
      if (images.length >= 5) break; // Limit to 5 images
    }

    // Fallback to landingImage if no hiRes
    if (images.length === 0) {
      const mainImageMatch = html.match(/"large"\s*:\s*"(https:\/\/[^"]+)"/);
      if (mainImageMatch) {
        images.push(mainImageMatch[1]);
      }
    }

    if (images.length > 0) {
      data.images = images;
    }

    // Feature bullets
    const featureMatches = html.matchAll(/<span[^>]*class="[^"]*a-list-item[^"]*"[^>]*>\s*([^<]{20,})\s*<\/span>/g);
    const features: string[] = [];
    for (const match of featureMatches) {
      const feature = match[1].trim();
      if (feature && !feature.includes('<') && feature.length < 500 && features.length < 6) {
        features.push(feature);
      }
    }
    if (features.length > 0) {
      data.features = features;
    }

    // Product description
    const descMatch = html.match(/<div[^>]*id="productDescription"[^>]*>.*?<p[^>]*>([^<]+)<\/p>/is);
    if (descMatch) {
      data.description = descMatch[1].trim();
    }

    // Category from breadcrumb
    const categoryMatch = html.match(/<a[^>]*class="[^"]*a-link-normal[^"]*nav-a-content[^"]*"[^>]*>([^<]+)<\/a>/i) ||
                          html.match(/<li[^>]*class="[^"]*a-breadcrumb-divider[^"]*"[^>]*>.*?<a[^>]*>([^<]+)<\/a>/is);
    if (categoryMatch) {
      data.category = categoryMatch[1].trim();
    }

    return data;

  } catch (error) {
    console.error('[Scraper] Error:', error);
    return {};
  }
}

export const POST: APIRoute = async (context) => {
  const { request, locals } = context;
  const userId = locals.auth?.userId;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verify admin role
  const isAdmin = await isUserAdmin(userId, context);
  if (!isAdmin) {
    return unauthorizedResponse('Admin access required');
  }

  try {
    const body = await request.json();
    const { url, asin: inputAsin } = body;

    let asin: string | null = null;
    let marketplace: string = 'es';

    // Parse URL or use direct ASIN
    if (url) {
      const urlData = parseAmazonUrl(url);
      if (urlData) {
        asin = urlData.asin;
        marketplace = urlData.marketplace;
      }
    } else if (inputAsin && isValidAsin(inputAsin)) {
      asin = inputAsin.toUpperCase();
    }

    if (!asin) {
      return new Response(
        JSON.stringify({ error: 'Invalid Amazon URL or ASIN' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get affiliate tag from env
    const affiliateTag = import.meta.env.AMAZON_AFFILIATE_TAG || '';
    const lang = marketplace === 'com' ? 'en' : 'es';
    const currency = marketplace === 'com' ? 'USD' : 'EUR';

    // Try to scrape product data
    const scrapedData = await scrapeAmazonProduct(asin, marketplace);

    // Build response with scraped data + defaults
    const productData: ScrapedProductData = {
      asin,
      marketplace,
      affiliateUrl: generateAffiliateUrl(asin, marketplace, affiliateTag),
      lang,
      title: scrapedData.title || null,
      brand: scrapedData.brand || null,
      price: scrapedData.price || null,
      originalPrice: scrapedData.originalPrice || null,
      currency,
      description: scrapedData.description || null,
      shortDescription: scrapedData.features?.[0] || null,
      rating: scrapedData.rating || null,
      totalReviews: scrapedData.totalReviews || null,
      images: scrapedData.images || [],
      features: scrapedData.features || [],
      category: scrapedData.category || null,
    };

    const hasData = !!(productData.title || productData.price || productData.images.length);

    return new Response(
      JSON.stringify({
        success: true,
        scraped: hasData,
        message: hasData
          ? 'Product data fetched successfully'
          : 'Could not fetch product data automatically. Please fill in manually.',
        data: productData,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Scrape Amazon Error]', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const prerender = false;
