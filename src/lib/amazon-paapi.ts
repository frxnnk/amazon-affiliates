/**
 * Amazon Product Advertising API (PA-API) 5.0 Integration
 *
 * This module provides functions to fetch product data from Amazon using the official PA-API.
 * Requires the following environment variables:
 * - AMAZON_PAAPI_ACCESS_KEY
 * - AMAZON_PAAPI_SECRET_KEY
 * - AMAZON_PAAPI_PARTNER_TAG (optional, uses site config if not set)
 */

import amazonPaapi from 'amazon-paapi';
import siteConfig from '@data/site-config.json';

// PA-API host by marketplace
const PAAPI_HOSTS: Record<string, string> = {
  'com': 'webservices.amazon.com',
  'es': 'webservices.amazon.es',
  'co.uk': 'webservices.amazon.co.uk',
  'de': 'webservices.amazon.de',
  'fr': 'webservices.amazon.fr',
  'it': 'webservices.amazon.it',
};

// Region by marketplace
const PAAPI_REGIONS: Record<string, string> = {
  'com': 'us-east-1',
  'es': 'eu-west-1',
  'co.uk': 'eu-west-1',
  'de': 'eu-west-1',
  'fr': 'eu-west-1',
  'it': 'eu-west-1',
};

export interface PaapiProductData {
  asin: string;
  marketplace: string;
  affiliateUrl: string;
  lang: 'es' | 'en';
  title: string | null;
  brand: string | null;
  manufacturer: string | null;
  model: string | null;
  price: number | null;
  originalPrice: number | null;
  currency: string;
  availability: string | null;
  description: string | null;
  shortDescription: string | null;
  rating: number | null;
  totalReviews: number | null;
  images: string[];
  features: string[];
  category: string | null;
  productGroup: string | null;
}

export interface PaapiConfig {
  accessKey: string;
  secretKey: string;
  partnerTag: string;
  marketplace: string;
}

/**
 * Get PA-API configuration from environment variables and site config
 */
export function getPaapiConfig(lang: 'es' | 'en' = 'es'): PaapiConfig | null {
  const accessKey = import.meta.env.AMAZON_PAAPI_ACCESS_KEY;
  const secretKey = import.meta.env.AMAZON_PAAPI_SECRET_KEY;

  if (!accessKey || !secretKey) {
    return null;
  }

  const associateConfig = siteConfig.amazon.associates[lang];
  const marketplace = associateConfig.marketplace.replace('amazon.', '');
  const partnerTag = import.meta.env.AMAZON_PAAPI_PARTNER_TAG || associateConfig.tag;

  return {
    accessKey,
    secretKey,
    partnerTag,
    marketplace,
  };
}

/**
 * Check if PA-API is configured and available
 */
export function isPaapiConfigured(): boolean {
  return getPaapiConfig() !== null;
}

/**
 * Get product information by ASIN using PA-API
 */
export async function getProductByAsin(
  asin: string,
  marketplace: string = 'es'
): Promise<{ success: boolean; data?: PaapiProductData; error?: string }> {
  const lang: 'es' | 'en' = marketplace === 'com' ? 'en' : 'es';
  const config = getPaapiConfig(lang);

  if (!config) {
    return {
      success: false,
      error: 'PA-API not configured. Set AMAZON_PAAPI_ACCESS_KEY and AMAZON_PAAPI_SECRET_KEY environment variables.',
    };
  }

  const host = PAAPI_HOSTS[marketplace] || PAAPI_HOSTS['es'];
  const region = PAAPI_REGIONS[marketplace] || PAAPI_REGIONS['es'];

  const commonParameters = {
    AccessKey: config.accessKey,
    SecretKey: config.secretKey,
    PartnerTag: config.partnerTag,
    PartnerType: 'Associates',
    Marketplace: `www.amazon.${marketplace}`,
    Host: host,
    Region: region,
  };

  const requestParameters = {
    ItemIds: [asin],
    ItemIdType: 'ASIN',
    Resources: [
      // Basic info
      'ItemInfo.Title',
      'ItemInfo.ByLineInfo',
      'ItemInfo.Classifications',
      'ItemInfo.Features',
      'ItemInfo.ManufactureInfo',
      'ItemInfo.ProductInfo',
      'ItemInfo.TechnicalInfo',
      // Images
      'Images.Primary.Large',
      'Images.Variants.Large',
      // Offers/Pricing
      'Offers.Listings.Price',
      'Offers.Listings.SavingBasis',
      'Offers.Listings.Availability.Type',
      'Offers.Listings.MerchantInfo',
      'Offers.Summaries.LowestPrice',
      // Browse info
      'BrowseNodeInfo.BrowseNodes',
      'BrowseNodeInfo.BrowseNodes.Ancestor',
      // Parent ASIN for variations
      'ParentASIN',
    ],
  };

  try {
    const response = await amazonPaapi.GetItems(commonParameters, requestParameters);

    if (!response.ItemsResult?.Items?.[0]) {
      return {
        success: false,
        error: 'Product not found or no data available.',
      };
    }

    const item = response.ItemsResult.Items[0];
    const productData = parseItemResponse(item, marketplace, config.partnerTag, lang);

    return {
      success: true,
      data: productData,
    };
  } catch (error: any) {
    console.error('[PA-API Error]', error);

    // Handle specific error codes
    if (error.message?.includes('TooManyRequests')) {
      return {
        success: false,
        error: 'Rate limit exceeded. Please wait and try again.',
      };
    }

    if (error.message?.includes('InvalidSignature')) {
      return {
        success: false,
        error: 'Invalid PA-API credentials. Please check your access key and secret key.',
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to fetch product data from Amazon API.',
    };
  }
}

/**
 * Search for products using PA-API
 */
export async function searchProducts(
  keywords: string,
  marketplace: string = 'es',
  category?: string
): Promise<{ success: boolean; data?: PaapiProductData[]; error?: string }> {
  const lang: 'es' | 'en' = marketplace === 'com' ? 'en' : 'es';
  const config = getPaapiConfig(lang);

  if (!config) {
    return {
      success: false,
      error: 'PA-API not configured.',
    };
  }

  const host = PAAPI_HOSTS[marketplace] || PAAPI_HOSTS['es'];
  const region = PAAPI_REGIONS[marketplace] || PAAPI_REGIONS['es'];

  const commonParameters = {
    AccessKey: config.accessKey,
    SecretKey: config.secretKey,
    PartnerTag: config.partnerTag,
    PartnerType: 'Associates',
    Marketplace: `www.amazon.${marketplace}`,
    Host: host,
    Region: region,
  };

  const requestParameters: Record<string, any> = {
    Keywords: keywords,
    SearchIndex: category || 'All',
    ItemCount: 10,
    Resources: [
      'ItemInfo.Title',
      'ItemInfo.ByLineInfo',
      'ItemInfo.Features',
      'Images.Primary.Large',
      'Offers.Listings.Price',
      'Offers.Listings.Availability.Type',
    ],
  };

  try {
    const response = await amazonPaapi.SearchItems(commonParameters, requestParameters);

    if (!response.SearchResult?.Items?.length) {
      return {
        success: true,
        data: [],
      };
    }

    const products = response.SearchResult.Items.map((item: any) =>
      parseItemResponse(item, marketplace, config.partnerTag, lang)
    );

    return {
      success: true,
      data: products,
    };
  } catch (error: any) {
    console.error('[PA-API Search Error]', error);
    return {
      success: false,
      error: error.message || 'Failed to search products.',
    };
  }
}

/**
 * Parse the PA-API item response into our product data format
 */
function parseItemResponse(
  item: any,
  marketplace: string,
  partnerTag: string,
  lang: 'es' | 'en'
): PaapiProductData {
  const asin = item.ASIN;

  // Extract images
  const images: string[] = [];
  if (item.Images?.Primary?.Large?.URL) {
    images.push(item.Images.Primary.Large.URL);
  }
  if (item.Images?.Variants) {
    item.Images.Variants.forEach((variant: any) => {
      if (variant.Large?.URL && images.length < 6) {
        images.push(variant.Large.URL);
      }
    });
  }

  // Extract features
  const features: string[] = [];
  if (item.ItemInfo?.Features?.DisplayValues) {
    features.push(...item.ItemInfo.Features.DisplayValues.slice(0, 8));
  }

  // Extract price info
  let price: number | null = null;
  let originalPrice: number | null = null;
  let currency = marketplace === 'com' ? 'USD' : 'EUR';
  let availability: string | null = null;

  if (item.Offers?.Listings?.[0]) {
    const listing = item.Offers.Listings[0];
    if (listing.Price?.Amount) {
      price = listing.Price.Amount;
      currency = listing.Price.Currency || currency;
    }
    if (listing.SavingBasis?.Amount && listing.SavingBasis.Amount > (price || 0)) {
      originalPrice = listing.SavingBasis.Amount;
    }
    if (listing.Availability?.Type) {
      availability = listing.Availability.Type;
    }
  }

  // Extract category from browse nodes
  let category: string | null = null;
  let productGroup: string | null = null;
  if (item.BrowseNodeInfo?.BrowseNodes?.[0]) {
    const browseNode = item.BrowseNodeInfo.BrowseNodes[0];
    category = browseNode.ContextFreeName || browseNode.DisplayName || null;
    // Get ancestor for broader category if available
    if (browseNode.Ancestor?.ContextFreeName) {
      productGroup = browseNode.Ancestor.ContextFreeName;
    }
  }

  // Extract classification
  if (item.ItemInfo?.Classifications?.ProductGroup?.DisplayValue) {
    productGroup = item.ItemInfo.Classifications.ProductGroup.DisplayValue;
  }

  // Build affiliate URL
  const affiliateUrl = `https://www.amazon.${marketplace}/dp/${asin}?tag=${partnerTag}&linkCode=ogi&th=1&psc=1`;

  return {
    asin,
    marketplace,
    affiliateUrl,
    lang,
    title: item.ItemInfo?.Title?.DisplayValue || null,
    brand: item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue || null,
    manufacturer: item.ItemInfo?.ByLineInfo?.Manufacturer?.DisplayValue || null,
    model: item.ItemInfo?.ManufactureInfo?.Model?.DisplayValue || null,
    price,
    originalPrice,
    currency,
    availability,
    description: features.length > 0 ? features.join(' ') : null,
    shortDescription: features[0] || null,
    rating: null, // PA-API doesn't return ratings directly
    totalReviews: null, // PA-API doesn't return review counts directly
    images,
    features,
    category,
    productGroup,
  };
}
