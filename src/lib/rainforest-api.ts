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
  // Extended fields from RapidAPI MCP
  salesVolume: string | null; // "10K+ bought in past month"
  isBestSeller: boolean;
  isAmazonChoice: boolean;
  couponText: string | null; // "Save 20% with coupon"
  deliveryInfo: string | null; // Full delivery text
  productBadge: string | null; // "Overall Pick", "Limited time deal", etc.
  climatePledgeFriendly: boolean;
  hasVariations: boolean;
  numOffers: number | null; // Number of sellers
  minimumOfferPrice: number | null; // Lowest price from all offers
  specifications: Record<string, string> | null; // Product specifications
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

export interface RainforestReview {
  id: string;
  title: string;
  content: string;
  rating: number;
  reviewerName: string;
  reviewerUrl: string | null;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  reviewDate: string;
  images: string[];
}

export interface RainforestReviewsResult {
  success: boolean;
  data?: {
    reviews: RainforestReview[];
    totalReviews: number;
    averageRating: number;
    ratingBreakdown: Record<number, number>;
  };
  error?: RainforestError;
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
 * Parse price string to number
 */
function parsePrice(priceStr: string | undefined | null): number | null {
  if (!priceStr) return null;
  const cleaned = String(priceStr).replace(/[^0-9.,]/g, '').replace(',', '.');
  return parseFloat(cleaned) || null;
}

/**
 * Parse RapidAPI product response into our format
 * Captures all available fields from the MCP
 */
function parseRapidApiProduct(item: any): RainforestProductData {
  // Extract price - RapidAPI returns price as object or string
  const price = parsePrice(item.product_price);
  const originalPrice = parsePrice(item.product_original_price);
  const minimumOfferPrice = parsePrice(item.product_minimum_offer_price);

  // Detect currency from price string
  let currency = 'USD';
  if (item.product_price) {
    if (item.product_price.includes('€')) currency = 'EUR';
    else if (item.product_price.includes('£')) currency = 'GBP';
    else if (item.product_price.includes('$')) currency = 'USD';
  }

  // Extract images - collect all available images
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
  // Also check for product_images array (used in product-details endpoint)
  if (item.product_images && Array.isArray(item.product_images)) {
    for (const img of item.product_images) {
      const url = typeof img === 'string' ? img : img?.link;
      if (url && !images.includes(url)) {
        images.push(url);
      }
    }
  }

  // Determine deal type based on all available signals
  let dealType: string | null = null;
  if (item.is_deal || item.deal_type) {
    dealType = item.deal_type || 'deal';
  } else if (item.has_coupon || item.coupon_text) {
    dealType = 'coupon';
  } else if (item.product_badge?.toLowerCase().includes('deal')) {
    dealType = 'limited_deal';
  } else if (originalPrice && price && originalPrice > price) {
    dealType = 'sale';
  }

  // Extract categories
  const categories: string[] = [];
  if (item.product_category) {
    categories.push(item.product_category);
  }
  // Also check categories_flat array
  if (item.categories_flat && Array.isArray(item.categories_flat)) {
    for (const cat of item.categories_flat) {
      const catName = typeof cat === 'string' ? cat : cat?.name;
      if (catName && !categories.includes(catName)) {
        categories.push(catName);
      }
    }
  }

  // Extract features from about_product or feature_bullets
  const features: string[] = [];
  if (item.about_product && Array.isArray(item.about_product)) {
    for (const feature of item.about_product) {
      if (typeof feature === 'string') {
        features.push(feature);
      } else if (feature?.text) {
        features.push(feature.text);
      }
    }
  }
  if (item.feature_bullets && Array.isArray(item.feature_bullets)) {
    for (const bullet of item.feature_bullets) {
      if (typeof bullet === 'string' && !features.includes(bullet)) {
        features.push(bullet);
      }
    }
  }

  // Extract specifications from product_information
  let specifications: Record<string, string> | null = null;
  if (item.product_information && typeof item.product_information === 'object') {
    specifications = {};
    for (const [key, value] of Object.entries(item.product_information)) {
      if (typeof value === 'string') {
        specifications[key] = value;
      }
    }
    // Only keep if we have actual specs
    if (Object.keys(specifications).length === 0) {
      specifications = null;
    }
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
    features,
    description: item.product_description || null,
    url: item.product_url || `https://www.amazon.com/dp/${item.asin}`,
    availability: item.availability_status || item.delivery || null,
    categories,
    isPrime: item.is_prime || false,
    dealType,
    // Extended fields from RapidAPI MCP
    salesVolume: item.sales_volume || null,
    isBestSeller: item.is_best_seller || false,
    isAmazonChoice: item.is_amazon_choice || false,
    couponText: item.coupon_text || null,
    deliveryInfo: item.delivery || null,
    productBadge: item.product_badge || null,
    climatePledgeFriendly: item.climate_pledge_friendly || false,
    hasVariations: item.has_variations || false,
    numOffers: item.product_num_offers || null,
    minimumOfferPrice,
    specifications,
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

    // DEBUG: Log raw response to find price history fields
    if (data.data?.products?.[0]) {
      const sample = data.data.products[0];
      console.log('[RapidAPI RAW] Sample product keys:', Object.keys(sample));
      console.log('[RapidAPI RAW] Price-related fields:', {
        product_price: sample.product_price,
        product_original_price: sample.product_original_price,
        typical_price: sample.typical_price,
        was_price: sample.was_price,
        list_price: sample.list_price,
        lowest_price: sample.lowest_price,
        price_history: sample.price_history,
        deal_price: sample.deal_price,
        savings: sample.savings,
        savings_percentage: sample.savings_percentage,
        unit_price: sample.unit_price,
        climate_pledge_friendly: sample.climate_pledge_friendly,
        is_prime: sample.is_prime,
      });
    }

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

/**
 * Get product reviews from RapidAPI
 */
export async function getProductReviewsRainforest(
  asin: string,
  options: {
    amazonDomain?: string;
    page?: number;
    sortBy?: 'TOP_REVIEWS' | 'MOST_RECENT';
    filterByStars?: 'ALL' | 'FIVE' | 'FOUR' | 'THREE' | 'TWO' | 'ONE' | 'POSITIVE' | 'CRITICAL';
  } = {},
  config?: RainforestConfig
): Promise<RainforestReviewsResult> {
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

  const country = COUNTRY_CODES[options.amazonDomain || 'com'] || 'US';

  const params = new URLSearchParams({
    asin: asin,
    country: country,
    page: String(options.page || 1),
    sort_by: options.sortBy || 'TOP_REVIEWS',
    star_rating: options.filterByStars || 'ALL',
    verified_purchases_only: 'false',
  });

  try {
    const response = await fetch(`${RAPIDAPI_BASE_URL}/product-reviews?${params.toString()}`, {
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
          code: 'REVIEWS_NOT_FOUND',
          message: `Reviews for ${asin} not found`,
        },
      };
    }

    // Parse reviews
    const reviews: RainforestReview[] = [];
    const rawReviews = data.data.reviews || [];

    for (const review of rawReviews) {
      reviews.push({
        id: review.review_id || `${asin}-${reviews.length}`,
        title: review.review_title || '',
        content: review.review_comment || '',
        rating: parseFloat(review.review_star_rating) || 0,
        reviewerName: review.review_author || 'Anonymous',
        reviewerUrl: review.review_author_url || null,
        isVerifiedPurchase: review.is_verified_purchase || false,
        helpfulCount: parseInt(String(review.helpful_vote_statement || '0').replace(/[^0-9]/g, '')) || 0,
        reviewDate: review.review_date || '',
        images: review.review_images || [],
      });
    }

    // Parse rating breakdown
    const ratingBreakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (data.data.rating_breakdown) {
      for (const [stars, percentage] of Object.entries(data.data.rating_breakdown)) {
        const starNum = parseInt(stars.replace('star', '').replace('_', ''));
        if (starNum >= 1 && starNum <= 5) {
          ratingBreakdown[starNum] = parseFloat(String(percentage)) || 0;
        }
      }
    }

    return {
      success: true,
      data: {
        reviews,
        totalReviews: data.data.total_reviews || reviews.length,
        averageRating: parseFloat(data.data.product_star_rating) || 0,
        ratingBreakdown,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: `Failed to fetch reviews: ${message}`,
      },
    };
  }
}
