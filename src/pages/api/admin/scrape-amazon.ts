import type { APIRoute } from 'astro';
import { unauthorizedResponse } from '@lib/auth';
import { parseAmazonUrl, isValidAsin } from '@utils/amazon';
import { getProductByAsin, isPaapiConfigured, type PaapiProductData } from '@lib/amazon-paapi';
import siteConfig from '@data/site-config.json';

export interface ScrapedFieldStatus {
  title: boolean;
  brand: boolean;
  price: boolean;
  originalPrice: boolean;
  rating: boolean;
  totalReviews: boolean;
  images: boolean;
  features: boolean;
  description: boolean;
  category: boolean;
}

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
  fieldStatus: ScrapedFieldStatus;
}

/**
 * Generates affiliate URL using site config
 */
function generateAffiliateUrlFromConfig(asin: string, lang: 'es' | 'en'): string {
  const config = siteConfig.amazon.associates[lang];
  const marketplace = config.marketplace;
  const tag = config.tag;
  return `https://www.${marketplace}/dp/${asin}?tag=${tag}&linkCode=ogi&th=1&psc=1`;
}

/**
 * Helper to safely extract and clean text
 */
function cleanText(text: string | undefined | null): string | null {
  if (!text) return null;
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim() || null;
}

/**
 * Parse price from various formats (handles EU and US formats)
 */
function parsePrice(priceStr: string | undefined | null): number | null {
  if (!priceStr) return null;
  // Remove currency symbols and whitespace
  let cleaned = priceStr.replace(/[€$£\s]/g, '').trim();
  // Handle EU format (1.234,56) vs US format (1,234.56)
  if (cleaned.match(/^\d{1,3}(\.\d{3})*,\d{2}$/)) {
    // EU format: 1.234,56
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // US format or simple: remove commas
    cleaned = cleaned.replace(/,/g, '');
  }
  const price = parseFloat(cleaned);
  return isNaN(price) ? null : price;
}

/**
 * Convert PA-API response to our format
 */
function paapiToScrapedFormat(paapiData: PaapiProductData): ScrapedProductData {
  const fieldStatus: ScrapedFieldStatus = {
    title: !!paapiData.title,
    brand: !!paapiData.brand,
    price: paapiData.price !== null,
    originalPrice: paapiData.originalPrice !== null,
    rating: paapiData.rating !== null,
    totalReviews: paapiData.totalReviews !== null,
    images: paapiData.images.length > 0,
    features: paapiData.features.length > 0,
    description: !!paapiData.description,
    category: !!paapiData.category,
  };

  return {
    asin: paapiData.asin,
    marketplace: paapiData.marketplace,
    affiliateUrl: paapiData.affiliateUrl,
    lang: paapiData.lang,
    title: paapiData.title,
    brand: paapiData.brand,
    price: paapiData.price,
    originalPrice: paapiData.originalPrice,
    currency: paapiData.currency,
    description: paapiData.description,
    shortDescription: paapiData.shortDescription,
    rating: paapiData.rating,
    totalReviews: paapiData.totalReviews,
    images: paapiData.images,
    features: paapiData.features,
    category: paapiData.category,
    fieldStatus,
  };
}

/**
 * Attempts to scrape product data from Amazon
 * Falls back gracefully if scraping fails
 */
async function scrapeAmazonProduct(asin: string, marketplace: string): Promise<{ data: Partial<ScrapedProductData>; fieldStatus: ScrapedFieldStatus }> {
  const fieldStatus: ScrapedFieldStatus = {
    title: false,
    brand: false,
    price: false,
    originalPrice: false,
    rating: false,
    totalReviews: false,
    images: false,
    features: false,
    description: false,
    category: false,
  };

  const domain = marketplace === 'com' ? 'amazon.com' : `amazon.${marketplace}`;
  const url = `https://www.${domain}/dp/${asin}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': marketplace === 'es' ? 'es-ES,es;q=0.9,en;q=0.8' : 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
      console.log(`[Scraper] Failed to fetch: ${response.status}`);
      return { data: {}, fieldStatus };
    }

    const html = await response.text();
    const data: Partial<ScrapedProductData> = {};

    // ========== TITLE ==========
    const titlePatterns = [
      /<span[^>]*id="productTitle"[^>]*>([^<]+)<\/span>/i,
      /<h1[^>]*id="title"[^>]*>.*?<span[^>]*>([^<]+)<\/span>/is,
      /<h1[^>]*class="[^"]*a-size-large[^"]*"[^>]*>([^<]+)<\/h1>/i,
      /<span[^>]*data-automation-id="title"[^>]*>([^<]+)<\/span>/i,
      /"title"\s*:\s*"([^"]+)"/,
    ];
    for (const pattern of titlePatterns) {
      const match = html.match(pattern);
      if (match) {
        data.title = cleanText(match[1]);
        if (data.title) {
          fieldStatus.title = true;
          break;
        }
      }
    }

    // ========== BRAND ==========
    const brandPatterns = [
      /<a[^>]*id="bylineInfo"[^>]*>(?:.*?)?([^<]+)<\/a>/i,
      /<a[^>]*class="[^"]*contributorNameID[^"]*"[^>]*>([^<]+)<\/a>/i,
      /(?:Visit the|Visita la tienda de|Marque\s*:\s*)\s*<a[^>]*>([^<]+)<\/a>/i,
      /<tr[^>]*class="[^"]*po-brand[^"]*"[^>]*>.*?<span[^>]*class="[^"]*po-break-word[^"]*"[^>]*>([^<]+)<\/span>/is,
      /"brand"\s*:\s*"([^"]+)"/,
      /<span[^>]*class="[^"]*author[^"]*"[^>]*>.*?<a[^>]*>([^<]+)<\/a>/is,
    ];
    for (const pattern of brandPatterns) {
      const match = html.match(pattern);
      if (match) {
        let brand = cleanText(match[1]);
        if (brand) {
          brand = brand.replace(/^(Visit the|Visita la tienda de|Brand:|Marca:|Marque\s*:)\s*/i, '').trim();
          brand = brand.replace(/\s+Store$/i, '').trim();
          if (brand) {
            data.brand = brand;
            fieldStatus.brand = true;
            break;
          }
        }
      }
    }

    // ========== PRICE ==========
    const pricePatterns = [
      /<span[^>]*class="[^"]*a-price[^"]*"[^>]*>.*?<span[^>]*class="[^"]*a-offscreen[^"]*"[^>]*>([^<]+)<\/span>/is,
      /<span[^>]*class="[^"]*a-price-whole[^"]*"[^>]*>([0-9.,]+)/,
      /<span[^>]*id="priceblock_ourprice"[^>]*>([^<]+)<\/span>/,
      /<span[^>]*id="priceblock_dealprice"[^>]*>([^<]+)<\/span>/,
      /<span[^>]*class="[^"]*apexPriceToPay[^"]*"[^>]*>.*?<span[^>]*class="[^"]*a-offscreen[^"]*"[^>]*>([^<]+)<\/span>/is,
      /<span[^>]*data-a-color="price"[^>]*>.*?<span[^>]*class="[^"]*a-offscreen[^"]*"[^>]*>([^<]+)<\/span>/is,
      /"priceAmount"\s*:\s*([0-9.]+)/,
    ];
    for (const pattern of pricePatterns) {
      const match = html.match(pattern);
      if (match) {
        const price = parsePrice(match[1]);
        if (price !== null && price > 0) {
          data.price = price;
          fieldStatus.price = true;
          break;
        }
      }
    }

    // ========== ORIGINAL PRICE ==========
    const originalPricePatterns = [
      /<span[^>]*class="[^"]*a-text-price[^"]*"[^>]*data-a-strike="true"[^>]*>.*?<span[^>]*class="[^"]*a-offscreen[^"]*"[^>]*>([^<]+)<\/span>/is,
      /<span[^>]*class="[^"]*a-text-price[^"]*"[^>]*>.*?<span[^>]*class="[^"]*a-offscreen[^"]*"[^>]*>([^<]+)<\/span>/is,
      /<span[^>]*class="[^"]*priceBlockStrikePriceString[^"]*"[^>]*>([^<]+)<\/span>/,
      /<span[^>]*data-a-strike="true"[^>]*>([^<]+)<\/span>/,
      /"listPrice"\s*:\s*\{[^}]*"amount"\s*:\s*([0-9.]+)/,
    ];
    for (const pattern of originalPricePatterns) {
      const match = html.match(pattern);
      if (match) {
        const originalPrice = parsePrice(match[1]);
        if (originalPrice !== null && originalPrice > 0 && (!data.price || originalPrice > data.price)) {
          data.originalPrice = originalPrice;
          fieldStatus.originalPrice = true;
          break;
        }
      }
    }

    // ========== RATING ==========
    const ratingPatterns = [
      /<span[^>]*class="[^"]*a-icon-alt[^"]*"[^>]*>([0-9.,]+)\s*(?:out of|de|sur|von|su)\s*5/i,
      /<i[^>]*class="[^"]*a-star-[^"]*"[^>]*>.*?<span[^>]*class="[^"]*a-icon-alt[^"]*"[^>]*>([0-9.,]+)/is,
      /([0-9.,]+)\s*(?:out of|de|sur|von|su)\s*5\s*stars?/i,
      /"ratingValue"\s*:\s*"?([0-9.,]+)"?/,
      /data-asin-rating="([0-9.,]+)"/,
    ];
    for (const pattern of ratingPatterns) {
      const match = html.match(pattern);
      if (match) {
        const rating = parseFloat(match[1].replace(',', '.'));
        if (!isNaN(rating) && rating > 0 && rating <= 5) {
          data.rating = rating;
          fieldStatus.rating = true;
          break;
        }
      }
    }

    // ========== TOTAL REVIEWS ==========
    const reviewPatterns = [
      /<span[^>]*id="acrCustomerReviewText"[^>]*>([0-9.,\s]+)\s*(?:ratings?|valoracion|avis|bewertung|recensioni)/i,
      /([0-9.,\s]+)\s*(?:global ratings|valoraciones globales|notes globales)/i,
      /<a[^>]*id="acrCustomerReviewLink"[^>]*>.*?([0-9.,]+)\s*(?:ratings?|reviews?)/is,
      /"reviewCount"\s*:\s*"?([0-9,]+)"?/,
      /data-asin-reviews="([0-9,]+)"/,
    ];
    for (const pattern of reviewPatterns) {
      const match = html.match(pattern);
      if (match) {
        const reviews = parseInt(match[1].replace(/[^\d]/g, ''));
        if (!isNaN(reviews) && reviews > 0) {
          data.totalReviews = reviews;
          fieldStatus.totalReviews = true;
          break;
        }
      }
    }

    // ========== IMAGES ==========
    const images: string[] = [];

    const hiResMatches = html.matchAll(/"hiRes"\s*:\s*"(https:\/\/[^"]+)"/g);
    for (const match of hiResMatches) {
      const imgUrl = match[1].replace(/\\/g, '');
      if (!images.includes(imgUrl)) {
        images.push(imgUrl);
      }
      if (images.length >= 6) break;
    }

    if (images.length === 0) {
      const largeMatches = html.matchAll(/"large"\s*:\s*"(https:\/\/[^"]+)"/g);
      for (const match of largeMatches) {
        const imgUrl = match[1].replace(/\\/g, '');
        if (!images.includes(imgUrl)) {
          images.push(imgUrl);
        }
        if (images.length >= 6) break;
      }
    }

    if (images.length === 0) {
      const mainImgMatch = html.match(/<img[^>]*id="landingImage"[^>]*src="([^"]+)"/i) ||
                           html.match(/<img[^>]*class="[^"]*a-dynamic-image[^"]*"[^>]*src="([^"]+)"/i);
      if (mainImgMatch) {
        images.push(mainImgMatch[1]);
      }
    }

    if (images.length > 0) {
      data.images = images;
      fieldStatus.images = true;
    }

    // ========== FEATURES ==========
    const features: string[] = [];

    const featureSection = html.match(/<div[^>]*id="feature-bullets"[^>]*>(.*?)<\/div>/is);
    if (featureSection) {
      const featureMatches = featureSection[1].matchAll(/<span[^>]*class="[^"]*a-list-item[^"]*"[^>]*>([^<]+)<\/span>/g);
      for (const match of featureMatches) {
        const feature = cleanText(match[1]);
        if (feature && feature.length > 15 && feature.length < 500 && !feature.includes('›')) {
          features.push(feature);
          if (features.length >= 8) break;
        }
      }
    }

    if (features.length === 0) {
      const listMatches = html.matchAll(/<li[^>]*class="[^"]*a-spacing-mini[^"]*"[^>]*>.*?<span[^>]*class="[^"]*a-list-item[^"]*"[^>]*>([^<]+)<\/span>/gis);
      for (const match of listMatches) {
        const feature = cleanText(match[1]);
        if (feature && feature.length > 20 && feature.length < 400) {
          features.push(feature);
          if (features.length >= 6) break;
        }
      }
    }

    if (features.length > 0) {
      data.features = features;
      fieldStatus.features = true;
    }

    // ========== DESCRIPTION ==========
    const descPatterns = [
      /<div[^>]*id="productDescription"[^>]*>.*?<p[^>]*>([^<]+)<\/p>/is,
      /<div[^>]*id="productDescription_feature_div"[^>]*>.*?<p[^>]*>([^<]+)<\/p>/is,
      /<div[^>]*class="[^"]*productDescriptionWrapper[^"]*"[^>]*>([^<]+)/is,
      /"description"\s*:\s*"([^"]+)"/,
    ];
    for (const pattern of descPatterns) {
      const match = html.match(pattern);
      if (match) {
        const desc = cleanText(match[1]);
        if (desc && desc.length > 30) {
          data.description = desc;
          fieldStatus.description = true;
          break;
        }
      }
    }

    // ========== CATEGORY ==========
    const categoryPatterns = [
      /<a[^>]*class="[^"]*a-link-normal[^"]*a-color-tertiary[^"]*"[^>]*>([^<]+)<\/a>/i,
      /<li[^>]*class="[^"]*zg-breadcrumb[^"]*"[^>]*>.*?<a[^>]*>([^<]+)<\/a>/is,
      /<span[^>]*class="[^"]*nav-a-content[^"]*"[^>]*>([^<]+)<\/span>/i,
      /"category"\s*:\s*"([^"]+)"/,
    ];
    for (const pattern of categoryPatterns) {
      const match = html.match(pattern);
      if (match) {
        const category = cleanText(match[1]);
        if (category && category.length > 2 && category.length < 50) {
          data.category = category;
          fieldStatus.category = true;
          break;
        }
      }
    }

    return { data, fieldStatus };

  } catch (error) {
    console.error('[Scraper] Error:', error);
    return { data: {}, fieldStatus };
  }
}

export const POST: APIRoute = async (context) => {
  const { request, locals } = context;
  const auth = locals.auth?.();
  const userId = auth?.userId;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verify admin role using Clerk metadata
  const userRole = (auth?.sessionClaims?.metadata as { role?: string })?.role;
  if (userRole !== 'admin') {
    return unauthorizedResponse('Admin access required');
  }

  try {
    const body = await request.json();
    const { url, asin: inputAsin, usePaapi = true } = body;

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

    // Determine language and currency from marketplace
    const lang: 'es' | 'en' = marketplace === 'com' ? 'en' : 'es';
    const currency = marketplace === 'com' ? 'USD' : 'EUR';

    let productData: ScrapedProductData | null = null;
    let dataSource: 'paapi' | 'scraper' | 'none' = 'none';

    // Try PA-API first if configured and requested
    if (usePaapi && isPaapiConfigured()) {
      console.log('[Product Import] Trying PA-API first...');
      const paapiResult = await getProductByAsin(asin, marketplace);

      if (paapiResult.success && paapiResult.data) {
        productData = paapiToScrapedFormat(paapiResult.data);
        dataSource = 'paapi';
        console.log('[Product Import] PA-API success');
      } else {
        console.log('[Product Import] PA-API failed:', paapiResult.error);
      }
    }

    // Fall back to scraping if PA-API didn't work
    if (!productData || dataSource === 'none') {
      console.log('[Product Import] Falling back to scraper...');
      const { data: scrapedData, fieldStatus } = await scrapeAmazonProduct(asin, marketplace);

      productData = {
        asin,
        marketplace,
        affiliateUrl: generateAffiliateUrlFromConfig(asin, lang),
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
        fieldStatus,
      };
      dataSource = 'scraper';
    }

    // Count how many fields were successfully obtained
    const successCount = Object.values(productData.fieldStatus).filter(Boolean).length;
    const totalFields = Object.keys(productData.fieldStatus).length;
    const hasData = successCount > 0;

    return new Response(
      JSON.stringify({
        success: true,
        scraped: hasData,
        scrapedFieldCount: successCount,
        totalFields,
        dataSource,
        paapiConfigured: isPaapiConfigured(),
        message: hasData
          ? `Product data fetched via ${dataSource === 'paapi' ? 'Amazon API' : 'web scraping'} (${successCount}/${totalFields} fields). Review and complete missing data.`
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
