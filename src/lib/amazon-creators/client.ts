/**
 * Amazon Creators API Client
 *
 * Main client for interacting with the Creators API GetItems endpoint.
 * Handles request building, authentication, and response parsing.
 */

import { getRegionForMarketplace, normalizeMarketplace } from './regions';
import { getAccessToken } from './oauth';
import {
  DEFAULT_RESOURCES,
  type CreatorsResource,
  type GetItemsRequest,
  type GetItemsResponse,
  type CreatorsApiItem,
  type CreatorsProductData,
  type GetItemsResult,
  type CreatorsError,
  type OAuthConfig,
} from './types';

// API Base URL (note: .amazon NOT .amazon.com)
const API_BASE = 'https://creatorsapi.amazon';

// Maximum ASINs per request (API limit)
const MAX_ASINS_PER_REQUEST = 10;

// Request timeout in milliseconds (short to allow fast fallback)
const REQUEST_TIMEOUT_MS = 5000;

/**
 * Get partner tag from environment or use default
 */
function getPartnerTag(): string {
  return import.meta.env.AMAZON_PA_API_PARTNER_TAG || 'bestdeal0ee40-20';
}

/**
 * Parse a Creators API item into normalized product data
 */
function parseCreatorsItem(item: CreatorsApiItem, marketplace: string): CreatorsProductData {
  const itemInfo = item.ItemInfo || {};
  const offersV2 = item.OffersV2;
  const images = item.Images || {};
  const reviews = item.CustomerReviews || {};
  const browseNodes = item.BrowseNodeInfo?.BrowseNodes || [];

  // Get the first buy box winning offer, or the first offer
  const listing = offersV2?.Listings?.find((l) => l.IsBuyBoxWinner) ||
                  offersV2?.Listings?.[0];

  // Extract price
  let price: number | null = null;
  let originalPrice: number | null = null;
  let currency = 'USD';

  if (listing?.Price?.Amount !== undefined) {
    price = listing.Price.Amount;
    currency = listing.Price.Currency || 'USD';

    // Check for savings/original price
    if (listing.SavingBasis?.Amount !== undefined) {
      originalPrice = listing.SavingBasis.Amount;
    } else if (listing.Price.Savings?.Amount !== undefined && price !== null) {
      originalPrice = price + listing.Price.Savings.Amount;
    }
  }

  // Extract images
  const imageUrl = images.Primary?.Large?.URL ||
                   images.Primary?.Medium?.URL ||
                   images.Primary?.HighRes?.URL ||
                   null;

  const productImages: string[] = [];
  if (images.Primary?.HighRes?.URL) productImages.push(images.Primary.HighRes.URL);
  else if (images.Primary?.Large?.URL) productImages.push(images.Primary.Large.URL);

  if (images.Variants) {
    for (const variant of images.Variants) {
      const variantUrl = variant.Large?.URL || variant.HighRes?.URL;
      if (variantUrl && !productImages.includes(variantUrl)) {
        productImages.push(variantUrl);
      }
      if (productImages.length >= 8) break;
    }
  }

  // Extract features
  const features: string[] = itemInfo.Features?.DisplayValues || [];

  // Extract categories from browse nodes
  const categories: string[] = [];
  for (const node of browseNodes) {
    if (node.DisplayName) {
      categories.push(node.DisplayName);
    }
  }

  // Deal info
  const dealDetails = listing?.DealDetails;
  let dealType: string | null = null;
  let dealEndTime: string | null = null;

  if (dealDetails?.DealType) {
    dealType = dealDetails.DealType;
    dealEndTime = dealDetails.DealEndTime || null;
  }

  // Build description from features
  const description = features.length > 0 ? features.slice(0, 3).join(' ') : null;

  return {
    asin: item.ASIN,
    title: itemInfo.Title?.DisplayValue || '',
    brand: itemInfo.ByLineInfo?.Brand?.DisplayValue ||
           itemInfo.ByLineInfo?.Manufacturer?.DisplayValue ||
           null,
    price,
    originalPrice,
    currency,
    rating: reviews.StarRating?.Value || null,
    totalReviews: reviews.Count || null,
    imageUrl,
    images: productImages,
    features,
    description,
    url: item.DetailPageURL || `https://${marketplace}/dp/${item.ASIN}`,
    availability: listing?.Availability?.Message || null,
    isBuyBoxWinner: listing?.IsBuyBoxWinner || false,
    dealType,
    dealEndTime,
    categories,
  };
}

/**
 * Fetch items from the Creators API
 *
 * @param asins - Array of ASINs to fetch (max 10)
 * @param marketplace - Marketplace domain (e.g., 'www.amazon.com' or 'com')
 * @param options - Optional configuration
 * @returns Array of product data or error
 *
 * @example
 * const result = await getItems(['B09B2SBHQK'], 'www.amazon.com');
 * if (result.success) {
 *   console.log(result.data[0].title);
 * }
 */
export async function getItems(
  asins: string[],
  marketplace: string = 'www.amazon.com',
  options: {
    partnerTag?: string;
    resources?: CreatorsResource[];
    oauthConfig?: OAuthConfig;
  } = {}
): Promise<GetItemsResult> {
  // Validate ASINs
  if (!asins || asins.length === 0) {
    return {
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'At least one ASIN is required.',
      },
    };
  }

  if (asins.length > MAX_ASINS_PER_REQUEST) {
    return {
      success: false,
      error: {
        code: 'TOO_MANY_ASINS',
        message: `Maximum ${MAX_ASINS_PER_REQUEST} ASINs per request. Got ${asins.length}.`,
      },
    };
  }

  // Normalize marketplace
  const normalizedMarketplace = normalizeMarketplace(marketplace);
  const region = getRegionForMarketplace(normalizedMarketplace);

  // Get OAuth token
  let token;
  try {
    token = await getAccessToken(region.name, options.oauthConfig);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: {
        code: 'AUTH_FAILED',
        message: `Failed to authenticate: ${message}`,
      },
    };
  }

  // Build request body
  const requestBody: GetItemsRequest = {
    itemIds: asins.map((asin) => asin.toUpperCase()),
    itemIdType: 'ASIN',
    marketplace: normalizedMarketplace,
    partnerTag: options.partnerTag || getPartnerTag(),
    resources: options.resources || DEFAULT_RESOURCES,
  };

  try {
    // Use AbortController for timeout to allow fast fallback to other APIs
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(`${API_BASE}/catalog/v1/getItems`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.accessToken}, Version ${token.version}`,
          'Content-Type': 'application/json',
          'x-marketplace': normalizedMarketplace,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const data: GetItemsResponse = await response.json();

    // Handle API errors
    if (!response.ok) {
      const errorCode = data.Errors?.[0]?.Code || 'API_ERROR';
      const errorMessage = data.Errors?.[0]?.Message || `Creators API returned status ${response.status}`;

      console.error(`[Creators API] Error ${response.status}:`, errorMessage);

      return {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
        },
      };
    }

    // Check for items in response
    if (!data.ItemsResult?.Items?.length) {
      // Check for partial errors
      if (data.Errors?.length) {
        return {
          success: false,
          error: {
            code: data.Errors[0].Code,
            message: data.Errors[0].Message,
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'ITEMS_NOT_FOUND',
          message: `No products found for ASINs: ${asins.join(', ')}`,
        },
      };
    }

    // Parse items
    const products = data.ItemsResult.Items.map((item) =>
      parseCreatorsItem(item, normalizedMarketplace)
    );

    console.log(`[Creators API] Successfully fetched ${products.length} product(s)`);

    return {
      success: true,
      data: products,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    const isNetworkError = message.includes('fetch failed') || message.includes('ENOTFOUND');

    // Log appropriately based on error type
    if (isTimeout || isNetworkError) {
      console.warn('[Creators API] Endpoint unavailable, will use fallback API');
    } else {
      console.error('[Creators API] Error:', message);
    }

    return {
      success: false,
      error: {
        code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
        message: isTimeout
          ? 'Creators API request timed out (endpoint may be unavailable)'
          : `Failed to connect to Creators API: ${message}`,
      },
    };
  }
}

/**
 * Fetch a single item from the Creators API
 *
 * Convenience wrapper for getItems with a single ASIN.
 *
 * @param asin - ASIN to fetch
 * @param marketplace - Marketplace domain
 * @param options - Optional configuration
 * @returns Product data or error
 */
export async function getItem(
  asin: string,
  marketplace: string = 'www.amazon.com',
  options: {
    partnerTag?: string;
    resources?: CreatorsResource[];
    oauthConfig?: OAuthConfig;
  } = {}
): Promise<{ success: true; data: CreatorsProductData } | { success: false; error: CreatorsError }> {
  const result = await getItems([asin], marketplace, options);

  if (!result.success) {
    return result;
  }

  if (result.data.length === 0) {
    return {
      success: false,
      error: {
        code: 'ITEM_NOT_FOUND',
        message: `Product ${asin} not found on ${marketplace}`,
      },
    };
  }

  return {
    success: true,
    data: result.data[0],
  };
}

/**
 * Fetch multiple items, handling batching if needed
 *
 * If more than 10 ASINs are provided, automatically batches requests.
 *
 * @param asins - Array of ASINs to fetch
 * @param marketplace - Marketplace domain
 * @param options - Optional configuration
 * @returns Map of ASIN to result
 */
export async function getItemsBatched(
  asins: string[],
  marketplace: string = 'www.amazon.com',
  options: {
    partnerTag?: string;
    resources?: CreatorsResource[];
    oauthConfig?: OAuthConfig;
  } = {}
): Promise<Map<string, { success: true; data: CreatorsProductData } | { success: false; error: CreatorsError }>> {
  const results = new Map<string, { success: true; data: CreatorsProductData } | { success: false; error: CreatorsError }>();

  // Chunk ASINs into batches of MAX_ASINS_PER_REQUEST
  const chunks: string[][] = [];
  for (let i = 0; i < asins.length; i += MAX_ASINS_PER_REQUEST) {
    chunks.push(asins.slice(i, i + MAX_ASINS_PER_REQUEST));
  }

  // Process chunks (sequentially to respect rate limits)
  for (const chunk of chunks) {
    const result = await getItems(chunk, marketplace, options);

    if (result.success) {
      for (const product of result.data) {
        results.set(product.asin, { success: true, data: product });
      }

      // Mark any ASINs not in response as not found
      for (const asin of chunk) {
        if (!results.has(asin.toUpperCase())) {
          results.set(asin.toUpperCase(), {
            success: false,
            error: {
              code: 'ITEM_NOT_FOUND',
              message: `Product ${asin} not found`,
            },
          });
        }
      }
    } else {
      // Entire batch failed
      for (const asin of chunk) {
        results.set(asin.toUpperCase(), result);
      }
    }
  }

  return results;
}

/**
 * Calculate discount percentage for a product
 */
export function calculateDiscount(product: CreatorsProductData): number {
  if (!product.price || !product.originalPrice) return 0;
  if (product.originalPrice <= product.price) return 0;
  return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
}
