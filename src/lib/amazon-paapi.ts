/**
 * Amazon Product Advertising API 5.0 Client
 * Implements AWS Signature Version 4 signing
 */

import { createHmac, createHash } from 'crypto';

// PA-API Configuration
const PA_API_SERVICE = 'ProductAdvertisingAPI';
const PA_API_REGION = 'us-east-1';
const PA_API_TARGET = 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1';

// Host mapping by marketplace
const PAAPI_HOSTS: Record<string, string> = {
  'com': 'webservices.amazon.com',
  'es': 'webservices.amazon.es',
  'co.uk': 'webservices.amazon.co.uk',
  'de': 'webservices.amazon.de',
  'fr': 'webservices.amazon.fr',
  'it': 'webservices.amazon.it',
};

// Region mapping by marketplace
const PAAPI_REGIONS: Record<string, string> = {
  'com': 'us-east-1',
  'es': 'eu-west-1',
  'co.uk': 'eu-west-1',
  'de': 'eu-west-1',
  'fr': 'eu-west-1',
  'it': 'eu-west-1',
};

export interface PAAPIConfig {
  accessKey: string;
  secretKey: string;
  partnerTag: string;
  marketplace?: string; // 'com' | 'es' | etc. Default: 'com'
}

export interface PAAPIProductData {
  asin: string;
  title: string;
  brand: string | null;
  price: number | null;
  originalPrice: number | null;
  currency: string;
  rating: number | null;
  totalReviews: number | null;
  imageUrl: string | null;
  images: string[];
  features: string[];
  description: string | null;
  url: string;
  availability: string | null;
}

export interface PAAPIError {
  code: string;
  message: string;
}

export type PAAPIResult =
  | { success: true; data: PAAPIProductData }
  | { success: false; error: PAAPIError };

/**
 * Get PA-API configuration from environment variables
 */
export function getPAAPIConfig(): PAAPIConfig | null {
  const accessKey = import.meta.env.AMAZON_PA_API_ACCESS_KEY;
  const secretKey = import.meta.env.AMAZON_PA_API_SECRET_KEY;
  const partnerTag = import.meta.env.AMAZON_PA_API_PARTNER_TAG;
  const marketplace = import.meta.env.AMAZON_PA_API_MARKETPLACE || 'com';

  if (!accessKey || !secretKey || !partnerTag) {
    return null;
  }

  return { accessKey, secretKey, partnerTag, marketplace };
}

/**
 * SHA256 hash helper
 */
function sha256(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * HMAC-SHA256 helper
 */
function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

/**
 * Get AWS Signature Key
 */
function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Buffer {
  const kDate = hmacSha256(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, 'aws4_request');
  return kSigning;
}

/**
 * Create AWS Signature Version 4 headers
 */
function createSignedHeaders(
  config: PAAPIConfig,
  host: string,
  region: string,
  target: string,
  payload: string
): Record<string, string> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const method = 'POST';
  const path = '/paapi5/getitems';
  const service = PA_API_SERVICE;

  // Headers to sign
  const headers: Record<string, string> = {
    'content-encoding': 'amz-1.0',
    'content-type': 'application/json; charset=utf-8',
    'host': host,
    'x-amz-date': amzDate,
    'x-amz-target': target,
  };

  // Canonical headers (sorted, lowercase)
  const sortedHeaderKeys = Object.keys(headers).sort();
  const canonicalHeaders = sortedHeaderKeys
    .map(key => `${key}:${headers[key]}`)
    .join('\n') + '\n';
  const signedHeaders = sortedHeaderKeys.join(';');

  // Payload hash
  const payloadHash = sha256(payload);

  // Canonical request
  const canonicalRequest = [
    method,
    path,
    '', // query string (empty)
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  // String to sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join('\n');

  // Signature
  const signingKey = getSignatureKey(config.secretKey, dateStamp, region, service);
  const signature = hmacSha256(signingKey, stringToSign).toString('hex');

  // Authorization header
  const authorization = `${algorithm} Credential=${config.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    ...headers,
    'Authorization': authorization,
  };
}

/**
 * Build GetItems request payload
 */
function buildGetItemsPayload(asin: string, partnerTag: string, marketplace: string): string {
  const payload = {
    ItemIds: [asin],
    PartnerTag: partnerTag,
    PartnerType: 'Associates',
    Marketplace: `www.amazon.${marketplace}`,
    Resources: [
      'Images.Primary.Large',
      'Images.Variants.Large',
      'ItemInfo.Title',
      'ItemInfo.ByLineInfo',
      'ItemInfo.Features',
      'ItemInfo.ProductInfo',
      'ItemInfo.TechnicalInfo',
      'Offers.Listings.Price',
      'Offers.Listings.SavingBasis',
      'Offers.Listings.Availability.Message',
      'CustomerReviews.StarRating',
      'CustomerReviews.Count',
    ],
  };
  return JSON.stringify(payload);
}

/**
 * Parse PA-API response into normalized product data
 */
function parseProductResponse(item: any, marketplace: string): PAAPIProductData {
  const itemInfo = item.ItemInfo || {};
  const offers = item.Offers?.Listings?.[0] || {};
  const images = item.Images || {};
  const reviews = item.CustomerReviews || {};

  // Extract price
  let price: number | null = null;
  let originalPrice: number | null = null;
  let currency = 'USD';

  if (offers.Price?.Amount) {
    price = offers.Price.Amount;
    currency = offers.Price.Currency || 'USD';
  }
  if (offers.SavingBasis?.Amount) {
    originalPrice = offers.SavingBasis.Amount;
  }

  // Extract images
  const imageUrl = images.Primary?.Large?.URL || null;
  const variantImages: string[] = [];
  if (images.Variants) {
    for (const variant of images.Variants) {
      if (variant.Large?.URL) {
        variantImages.push(variant.Large.URL);
      }
    }
  }

  // Extract features as description
  const features: string[] = itemInfo.Features?.DisplayValues || [];

  return {
    asin: item.ASIN,
    title: itemInfo.Title?.DisplayValue || '',
    brand: itemInfo.ByLineInfo?.Brand?.DisplayValue || null,
    price,
    originalPrice,
    currency,
    rating: reviews.StarRating?.Value || null,
    totalReviews: reviews.Count || null,
    imageUrl,
    images: [imageUrl, ...variantImages].filter(Boolean) as string[],
    features,
    description: features.length > 0 ? features.join(' ') : null,
    url: `https://www.amazon.${marketplace}/dp/${item.ASIN}`,
    availability: offers.Availability?.Message || null,
  };
}

/**
 * Fetch product data from Amazon PA-API 5.0
 */
export async function getProductByAsin(
  asin: string,
  config?: PAAPIConfig
): Promise<PAAPIResult> {
  // Get config from env if not provided
  const apiConfig = config || getPAAPIConfig();

  if (!apiConfig) {
    return {
      success: false,
      error: {
        code: 'MISSING_CONFIG',
        message: 'PA-API credentials not configured. Set AMAZON_PA_API_ACCESS_KEY, AMAZON_PA_API_SECRET_KEY, and AMAZON_PA_API_PARTNER_TAG environment variables.',
      },
    };
  }

  // Validate ASIN format
  if (!/^[A-Z0-9]{10}$/i.test(asin)) {
    return {
      success: false,
      error: {
        code: 'INVALID_ASIN',
        message: `Invalid ASIN format: ${asin}. ASIN must be 10 alphanumeric characters.`,
      },
    };
  }

  const marketplace = apiConfig.marketplace || 'com';
  const host = PAAPI_HOSTS[marketplace] || PAAPI_HOSTS['com'];
  const region = PAAPI_REGIONS[marketplace] || PA_API_REGION;
  const target = `${PA_API_TARGET}.GetItems`;

  const payload = buildGetItemsPayload(asin.toUpperCase(), apiConfig.partnerTag, marketplace);
  const headers = createSignedHeaders(apiConfig, host, region, target, payload);

  try {
    const response = await fetch(`https://${host}/paapi5/getitems`, {
      method: 'POST',
      headers,
      body: payload,
    });

    const data = await response.json();

    // Handle API errors
    if (!response.ok) {
      const errorCode = data.Errors?.[0]?.Code || 'API_ERROR';
      const errorMessage = data.Errors?.[0]?.Message || `PA-API returned status ${response.status}`;

      return {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
        },
      };
    }

    // Check if item was found
    if (!data.ItemsResult?.Items?.length) {
      // Check for errors in response
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
          code: 'ITEM_NOT_FOUND',
          message: `Product with ASIN ${asin} not found on Amazon ${marketplace}.`,
        },
      };
    }

    const item = data.ItemsResult.Items[0];
    const productData = parseProductResponse(item, marketplace);

    return {
      success: true,
      data: productData,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: `Failed to connect to Amazon PA-API: ${message}`,
      },
    };
  }
}

/**
 * Fetch multiple products by ASIN (batch)
 */
export async function getProductsByAsins(
  asins: string[],
  config?: PAAPIConfig
): Promise<Map<string, PAAPIResult>> {
  const results = new Map<string, PAAPIResult>();

  // PA-API allows max 10 items per request
  // For simplicity, we fetch one by one (can be optimized later)
  for (const asin of asins) {
    const result = await getProductByAsin(asin, config);
    results.set(asin, result);
  }

  return results;
}
