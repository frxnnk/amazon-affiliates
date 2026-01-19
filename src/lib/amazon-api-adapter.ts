/**
 * Amazon API Unified Adapter
 *
 * Provides a single entry point for fetching Amazon product data with automatic fallback:
 * 1. Creators API (OAuth 2.0) - Primary source
 * 2. RapidAPI (Real-Time Amazon Data) - Secondary fallback
 * 3. Web Scraping - Last resort
 *
 * The adapter normalizes responses from all sources into a common format
 * compatible with the existing codebase (RainforestProductData).
 */

import {
  getItem as getItemCreators,
  isCreatorsConfigured,
  normalizeMarketplace,
  marketplaceCodeToDomain,
  type CreatorsProductData,
} from './amazon-creators';

import {
  getProductRainforest,
  isRainforestConfigured,
  type RainforestProductData,
  type RainforestResult,
} from './rainforest-api';

export type DataSource = 'creators' | 'rapidapi' | 'scraper' | 'none';

export interface UnifiedProductResult {
  success: boolean;
  data: RainforestProductData | null;
  dataSource: DataSource;
  error?: string;
}

/**
 * Convert marketplace code to domain format
 *
 * Handles both short codes ('com', 'es') and full domains ('www.amazon.com')
 */
function toMarketplaceDomain(marketplace: string): string {
  if (marketplace.includes('.')) {
    return normalizeMarketplace(marketplace);
  }
  return marketplaceCodeToDomain(marketplace);
}

/**
 * Convert marketplace domain to short code for RapidAPI
 *
 * 'www.amazon.com' -> 'com'
 * 'www.amazon.es' -> 'es'
 */
function toMarketplaceCode(marketplace: string): string {
  const normalized = normalizeMarketplace(marketplace);
  // Extract TLD from 'www.amazon.{tld}'
  const match = normalized.match(/www\.amazon\.(.+)/);
  return match ? match[1] : 'com';
}

/**
 * Convert Creators API product data to Rainforest format
 *
 * This ensures compatibility with existing code that expects RainforestProductData.
 */
function creatorsToRainforest(data: CreatorsProductData, marketplace: string): RainforestProductData {
  return {
    asin: data.asin,
    title: data.title,
    brand: data.brand,
    price: data.price,
    originalPrice: data.originalPrice,
    currency: data.currency,
    rating: data.rating,
    totalReviews: data.totalReviews,
    imageUrl: data.imageUrl,
    images: data.images,
    features: data.features,
    description: data.description,
    url: data.url,
    availability: data.availability,
    categories: data.categories,
    isPrime: false, // Creators API doesn't provide this directly
    dealType: data.dealType,
    // Extended fields (set defaults for missing data)
    salesVolume: null,
    isBestSeller: false,
    isAmazonChoice: false,
    couponText: null,
    deliveryInfo: data.availability,
    productBadge: data.dealType ? 'Deal' : null,
    climatePledgeFriendly: false,
    hasVariations: false,
    numOffers: null,
    minimumOfferPrice: null,
    specifications: null,
  };
}

/**
 * Get product data using the unified adapter with automatic fallback
 *
 * @param asin - Amazon Standard Identification Number
 * @param marketplace - Marketplace code ('com', 'es') or domain ('www.amazon.com')
 * @param options - Additional options
 * @returns Product data from the first successful source
 *
 * @example
 * const result = await getProduct('B09B2SBHQK', 'com');
 * if (result.success) {
 *   console.log(`Got data from ${result.dataSource}:`, result.data.title);
 * }
 */
export async function getProduct(
  asin: string,
  marketplace: string = 'com',
  options: {
    skipCreators?: boolean;
    skipRapidApi?: boolean;
    partnerTag?: string;
  } = {}
): Promise<UnifiedProductResult> {
  const marketplaceDomain = toMarketplaceDomain(marketplace);
  const marketplaceCode = toMarketplaceCode(marketplace);

  // 1. Try Creators API first (if configured and not skipped)
  if (!options.skipCreators && isCreatorsConfigured()) {
    console.log('[API Adapter] Trying Creators API...');
    try {
      const result = await getItemCreators(asin, marketplaceDomain, {
        partnerTag: options.partnerTag,
      });

      if (result.success) {
        console.log('[API Adapter] Creators API success');
        return {
          success: true,
          data: creatorsToRainforest(result.data, marketplaceDomain),
          dataSource: 'creators',
        };
      }

      console.warn('[API Adapter] Creators API failed:', result.error.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.warn('[API Adapter] Creators API error:', message);
    }
  }

  // 2. Try RapidAPI (if configured and not skipped)
  if (!options.skipRapidApi && isRainforestConfigured()) {
    console.log('[API Adapter] Trying RapidAPI...');
    try {
      const result: RainforestResult<RainforestProductData> = await getProductRainforest(asin, marketplaceCode);

      if (result.success) {
        console.log('[API Adapter] RapidAPI success');
        return {
          success: true,
          data: result.data,
          dataSource: 'rapidapi',
        };
      }

      console.warn('[API Adapter] RapidAPI failed:', result.error.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.warn('[API Adapter] RapidAPI error:', message);
    }
  }

  // 3. No API sources available or all failed
  // Note: Scraping is handled in the scrape-amazon.ts endpoint, not here,
  // because it requires more complex parsing and is specific to the import flow.

  return {
    success: false,
    data: null,
    dataSource: 'none',
    error: 'All API sources failed or not configured. Try web scraping as fallback.',
  };
}

/**
 * Get multiple products using the unified adapter
 *
 * @param asins - Array of ASINs
 * @param marketplace - Marketplace code or domain
 * @param options - Additional options
 * @returns Map of ASIN to result
 */
export async function getProducts(
  asins: string[],
  marketplace: string = 'com',
  options: {
    skipCreators?: boolean;
    skipRapidApi?: boolean;
    partnerTag?: string;
  } = {}
): Promise<Map<string, UnifiedProductResult>> {
  const results = new Map<string, UnifiedProductResult>();

  // Fetch products sequentially to avoid rate limiting
  // In the future, we could batch Creators API requests (up to 10 at a time)
  for (const asin of asins) {
    const result = await getProduct(asin, marketplace, options);
    results.set(asin.toUpperCase(), result);
  }

  return results;
}

/**
 * Check which APIs are available
 */
export function getAvailableApis(): {
  creators: boolean;
  rapidapi: boolean;
} {
  return {
    creators: isCreatorsConfigured(),
    rapidapi: isRainforestConfigured(),
  };
}

/**
 * Get adapter status for debugging/admin UI
 */
export function getAdapterStatus(): {
  creatorsConfigured: boolean;
  rapidapiConfigured: boolean;
  primaryApi: string;
} {
  const creatorsConfigured = isCreatorsConfigured();
  const rapidapiConfigured = isRainforestConfigured();

  let primaryApi = 'none';
  if (creatorsConfigured) {
    primaryApi = 'creators';
  } else if (rapidapiConfigured) {
    primaryApi = 'rapidapi';
  }

  return {
    creatorsConfigured,
    rapidapiConfigured,
    primaryApi,
  };
}
