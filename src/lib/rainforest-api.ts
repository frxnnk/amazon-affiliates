/**
 * Amazon Scraper API Client (RapidAPI)
 * Fallback for Amazon product data when PA-API is not available
 * Uses "Real-Time Amazon Data" from RapidAPI (500 free requests/month)
 * https://rapidapi.com/letscrape-6bRBa3QguO5/api/real-time-amazon-data
 * 
 * Environment variable: RAPIDAPI_KEY
 */

// RapidAPI configuration
const RAPIDAPI_HOST = 'real-time-amazon-data.p.rapidapi.com';
const RAPIDAPI_BASE_URL = `https://${RAPIDAPI_HOST}`;

export interface RainforestConfig {
  apiKey: string; // RapidAPI key
}

export interface RainforestProductData {
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
  categories: string[];
  isPrime: boolean;
  dealType: string | null;
}

export interface RainforestSearchFilters {
  keywords: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'reviews' | 'newest';
  page?: number;
  amazonDomain?: string; // com, es, de, etc.
}

export interface RainforestError {
  code: string;
  message: string;
}

export type RainforestResult<T> =
  | { success: true; data: T }
  | { success: false; error: RainforestError };

export type RainforestSearchResult =
  | { success: true; data: RainforestProductData[]; totalResults: number; currentPage: number }
  | { success: false; error: RainforestError };

// Country code mapping for RapidAPI
const COUNTRY_CODES: Record<string, string> = {
  'com': 'US',
  'es': 'ES',
  'co.uk': 'GB',
  'de': 'DE',
  'fr': 'FR',
  'it': 'IT',
  'ca': 'CA',
  'mx': 'MX',
  'br': 'BR',
  'jp': 'JP',
  'in': 'IN',
  'au': 'AU',
};

// Category mapping for RapidAPI search
const CATEGORY_MAPPING: Record<string, string> = {
  'electronics': 'electronics',
  'computers': 'computers',
  'smartphones': 'mobile-phones',
  'audio': 'electronics',
  'tv': 'electronics',
  'gaming': 'videogames',
  'home': 'home',
  'kitchen': 'kitchen',
  'sports': 'sports',
  'fashion': 'fashion',
  'beauty': 'beauty',
  'books': 'books',
  'toys': 'toys',
};

/**
 * Get RapidAPI configuration from environment
 */
export function getRainforestConfig(): RainforestConfig | null {
  // Try RAPIDAPI_KEY first, then fall back to RAINFOREST_API_KEY for backwards compatibility
  const apiKey = import.meta.env.RAPIDAPI_KEY || import.meta.env.RAINFOREST_API_KEY;
  
  if (!apiKey) {
    return null;
  }
  
  return { apiKey };
}

/**
 * Check if RapidAPI is configured
 */
export function isRainforestConfigured(): boolean {
  return getRainforestConfig() !== null;
}

/**
 * Create RapidAPI headers
 */
function createHeaders(apiKey: string): Record<string, string> {
  return {
    'X-RapidAPI-Key': apiKey,
    'X-RapidAPI-Host': RAPIDAPI_HOST,
  };
}

/**
 * Parse RapidAPI product response into our format
 */
function parseRapidApiProduct(item: any): RainforestProductData {
  // Extract price - RapidAPI returns price as object or string
  let price: number | null = null;
  let originalPrice: number | null = null;
  let currency = 'USD';

  // Handle different price formats
  if (item.product_price) {
    // Remove currency symbol and parse
    const priceStr = String(item.product_price).replace(/[^0-9.,]/g, '').replace(',', '.');
    price = parseFloat(priceStr) || null;
  }
  
  if (item.product_original_price) {
    const origStr = String(item.product_original_price).replace(/[^0-9.,]/g, '').replace(',', '.');
    originalPrice = parseFloat(origStr) || null;
  }

  // Detect currency from price string
  if (item.product_price) {
    if (item.product_price.includes('€')) currency = 'EUR';
    else if (item.product_price.includes('£')) currency = 'GBP';
    else if (item.product_price.includes('$')) currency = 'USD';
  }

  // Extract images
  const images: string[] = [];
  if (item.product_photo) {
    images.push(item.product_photo);
  }
  if (item.product_photos && Array.isArray(item.product_photos)) {
    for (const photo of item.product_photos) {
      if (photo && !images.includes(photo)) {
        images.push(photo);
      }
    }
  }

  // Determine deal type
  let dealType: string | null = null;
  if (item.is_deal || item.deal_type) {
    dealType = item.deal_type || 'deal';
  } else if (item.has_coupon || item.coupon_text) {
    dealType = 'coupon';
  } else if (originalPrice && price && originalPrice > price) {
    dealType = 'sale';
  }

  // Extract categories
  const categories: string[] = [];
  if (item.product_category) {
    categories.push(item.product_category);
  }

  return {
    asin: item.asin || '',
    title: item.product_title || item.title || '',
    brand: item.product_byline || item.brand || null,
    price,
    originalPrice,
    currency,
    rating: item.product_star_rating ? parseFloat(item.product_star_rating) : null,
    totalReviews: item.product_num_ratings ? parseInt(String(item.product_num_ratings).replace(/[^0-9]/g, '')) : null,
    imageUrl: images[0] || null,
    images,
    features: [],
    description: item.product_description || null,
    url: item.product_url || `https://www.amazon.com/dp/${item.asin}`,
    availability: item.delivery || null,
    categories,
    isPrime: item.is_prime || false,
    dealType,
  };
}

/**
 * Search products using RapidAPI Real-Time Amazon Data
 */
export async function searchProductsRainforest(
  filters: RainforestSearchFilters,
  config?: RainforestConfig
): Promise<RainforestSearchResult> {
  const apiConfig = config || getRainforestConfig();
  
  if (!apiConfig) {
    return {
      success: false,
      error: {
        code: 'MISSING_CONFIG',
        message: 'RapidAPI key not configured. Set RAPIDAPI_KEY environment variable.',
      },
    };
  }

  if (!filters.keywords || filters.keywords.trim().length === 0) {
    return {
      success: false,
      error: {
        code: 'INVALID_KEYWORDS',
        message: 'Keywords are required for search.',
      },
    };
  }

  const country = COUNTRY_CODES[filters.amazonDomain || 'com'] || 'US';
  const page = filters.page || 1;

  // Build query parameters
  const params = new URLSearchParams({
    query: filters.keywords,
    page: String(page),
    country: country,
  });

  // Add category if specified
  if (filters.category && CATEGORY_MAPPING[filters.category]) {
    params.append('category_id', CATEGORY_MAPPING[filters.category]);
  }

  // Add sort
  if (filters.sortBy) {
    const sortMapping: Record<string, string> = {
      'relevance': 'RELEVANCE',
      'price_asc': 'LOWEST_PRICE',
      'price_desc': 'HIGHEST_PRICE',
      'reviews': 'REVIEWS',
      'newest': 'NEWEST',
    };
    params.append('sort_by', sortMapping[filters.sortBy] || 'RELEVANCE');
  }

  try {
    const response = await fetch(`${RAPIDAPI_BASE_URL}/search?${params.toString()}`, {
      method: 'GET',
      headers: createHeaders(apiConfig.apiKey),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: `RapidAPI error (${response.status}): ${errorText.slice(0, 200)}`,
        },
      };
    }

    const data = await response.json();

    // Check for API-level errors
    if (data.status === 'ERROR' || data.error) {
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: data.error?.message || data.message || 'Unknown API error',
        },
      };
    }

    // Parse search results
    const products: RainforestProductData[] = [];
    const results = data.data?.products || data.products || [];
    
    for (const item of results) {
      if (item.asin) {
        const product = parseRapidApiProduct(item);
        
        // Apply client-side price filters if needed
        if (filters.minPrice !== undefined && product.price !== null && product.price < filters.minPrice) {
          continue;
        }
        if (filters.maxPrice !== undefined && product.price !== null && product.price > filters.maxPrice) {
          continue;
        }
        
        products.push(product);
      }
    }

    return {
      success: true,
      data: products,
      totalResults: data.data?.total_products || products.length,
      currentPage: page,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: `Failed to connect to RapidAPI: ${message}`,
      },
    };
  }
}

/**
 * Get product details using RapidAPI
 */
export async function getProductRainforest(
  asin: string,
  amazonDomain: string = 'com',
  config?: RainforestConfig
): Promise<RainforestResult<RainforestProductData>> {
  const apiConfig = config || getRainforestConfig();
  
  if (!apiConfig) {
    return {
      success: false,
      error: {
        code: 'MISSING_CONFIG',
        message: 'RapidAPI key not configured.',
      },
    };
  }

  const country = COUNTRY_CODES[amazonDomain] || 'US';

  const params = new URLSearchParams({
    asin: asin,
    country: country,
  });

  try {
    const response = await fetch(`${RAPIDAPI_BASE_URL}/product-details?${params.toString()}`, {
      method: 'GET',
      headers: createHeaders(apiConfig.apiKey),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: `RapidAPI error: ${errorText.slice(0, 200)}`,
        },
      };
    }

    const data = await response.json();

    if (data.status === 'ERROR' || !data.data) {
      return {
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: `Product ${asin} not found`,
        },
      };
    }

    return {
      success: true,
      data: parseRapidApiProduct(data.data),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: `Failed to fetch product: ${message}`,
      },
    };
  }
}

/**
 * Search for deals using RapidAPI
 */
export async function searchDealsRainforest(
  category?: string,
  amazonDomain: string = 'com',
  config?: RainforestConfig
): Promise<RainforestSearchResult> {
  const apiConfig = config || getRainforestConfig();
  
  if (!apiConfig) {
    return {
      success: false,
      error: {
        code: 'MISSING_CONFIG',
        message: 'RapidAPI key not configured.',
      },
    };
  }

  const country = COUNTRY_CODES[amazonDomain] || 'US';

  const params = new URLSearchParams({
    country: country,
  });

  if (category && CATEGORY_MAPPING[category]) {
    params.append('category_id', CATEGORY_MAPPING[category]);
  }

  try {
    const response = await fetch(`${RAPIDAPI_BASE_URL}/deals-v2?${params.toString()}`, {
      method: 'GET',
      headers: createHeaders(apiConfig.apiKey),
    });

    if (!response.ok) {
      // Deals endpoint might not be available on free tier
      // Fall back to searching for "deals" keyword
      return searchProductsRainforest({
        keywords: category ? `${category} deals` : 'deals',
        amazonDomain,
      }, config);
    }

    const data = await response.json();

    const products: RainforestProductData[] = [];
    const deals = data.data?.deals || [];

    for (const deal of deals) {
      if (deal.asin) {
        products.push({
          asin: deal.asin,
          title: deal.deal_title || deal.product_title || '',
          brand: null,
          price: deal.deal_price ? parseFloat(String(deal.deal_price).replace(/[^0-9.]/g, '')) : null,
          originalPrice: deal.list_price ? parseFloat(String(deal.list_price).replace(/[^0-9.]/g, '')) : null,
          currency: 'USD',
          rating: deal.product_star_rating ? parseFloat(deal.product_star_rating) : null,
          totalReviews: deal.product_num_ratings || null,
          imageUrl: deal.deal_photo || deal.product_photo || null,
          images: deal.deal_photo ? [deal.deal_photo] : [],
          features: [],
          description: null,
          url: deal.deal_url || `https://www.amazon.com/dp/${deal.asin}`,
          availability: null,
          categories: [],
          isPrime: deal.is_prime || false,
          dealType: deal.deal_type || 'deal',
        });
      }
    }

    return {
      success: true,
      data: products,
      totalResults: products.length,
      currentPage: 1,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: `Failed to fetch deals: ${message}`,
      },
    };
  }
}

/**
 * Calculate discount percentage
 */
export function calculateDiscount(product: RainforestProductData): number {
  if (!product.price || !product.originalPrice) return 0;
  if (product.originalPrice <= product.price) return 0;
  return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
}
