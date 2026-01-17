/**
 * API Endpoint: Dynamic Feed Products
 * 
 * GET /api/feed/products?page=1&category=electronics&lang=es
 * 
 * Features:
 * - Fetches products from RapidAPI with affiliate links
 * - Falls back to database products if RapidAPI fails
 * - Recommendation algorithm based on user likes
 * - Anti-duplicate filtering
 */

import type { APIRoute } from 'astro';
import { isRainforestConfigured } from '@lib/rainforest-api';
import { cachedSearchProducts, getApiUsageStats, canMakeApiCall } from '@lib/product-cache';
import { getFeedProducts, getUserPreferences, getActiveCuratedDeals, isCuratedDeal, getExcludedAsins, checkLowestPrices, getTopReviewsForAsins } from '@lib/db';
import { db, ProductLikes, Products, eq, desc } from 'astro:db';
import { trackPrices, getPriceHistory, isKeepaConfigured } from '@lib/keepa-api';
import { validateDeal, calculateEnhancedScore, toAnalyzableProduct } from '@lib/deal-analyzer';
import { getProductVideos, getQuotaStatus, isAnyVideoSourceConfigured } from '@lib/video-cache';
import { getVideoEmbedUrl } from '@lib/youtube-api';
import { buildUserProfile, scoreProducts, getPersonalizedKeywords, type ProductCandidate, type UserProfile } from '@lib/recommendation-engine';
import { getUserSimilarityProfile } from '@lib/content-similarity';
import { getCollaborativeBoosts } from '@lib/collaborative-filtering';

export const prerender = false;

/**
 * Session seed for controlled randomization
 * Changes every hour to give users variety while maintaining consistency within a session
 */
function getSessionSeed(): number {
  const now = Date.now();
  // Change seed every hour (3600000ms)
  return Math.floor(now / 3600000);
}

/**
 * Seeded pseudo-random number generator (Mulberry32)
 * Produces deterministic "random" numbers based on a seed
 */
function seededRandom(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Shuffle array using Fisher-Yates with seeded random
 */
function seededShuffle<T>(array: T[], seed: number): T[] {
  const result = [...array];
  const random = seededRandom(seed);

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/**
 * Shuffle products within score tiers for variety
 * Products with similar scores (within tierRange points) are shuffled together
 * This maintains quality (best products first) while adding variety
 */
function shuffleWithinTiers(products: FeedProduct[], seed: number, tierRange = 8): FeedProduct[] {
  if (products.length <= 1) return products;

  // Sort by dealScore descending first
  const sorted = [...products].sort((a, b) => (b.dealScore || 0) - (a.dealScore || 0));

  // Group into tiers based on score ranges
  const tiers: FeedProduct[][] = [];
  let currentTier: FeedProduct[] = [];
  let tierFloor = sorted[0]?.dealScore || 0;

  for (const product of sorted) {
    const score = product.dealScore || 0;

    // If score is within tierRange of the tier floor, add to current tier
    if (tierFloor - score <= tierRange) {
      currentTier.push(product);
    } else {
      // Start a new tier
      if (currentTier.length > 0) {
        tiers.push(currentTier);
      }
      currentTier = [product];
      tierFloor = score;
    }
  }

  // Don't forget the last tier
  if (currentTier.length > 0) {
    tiers.push(currentTier);
  }

  // Shuffle within each tier using the session seed
  // Use different sub-seeds for each tier to ensure variety
  const shuffledTiers = tiers.map((tier, index) =>
    seededShuffle(tier, seed + index * 1000)
  );

  // Flatten back to a single array
  return shuffledTiers.flat();
}

interface FeedProduct {
  productId: string;
  asin: string;
  title: string;
  brand: string;
  price: number;
  originalPrice?: number;
  currency: string;
  rating?: number;
  totalReviews?: number;
  featuredImage: { url: string; alt: string };
  images?: string[]; // All product images for gallery/carousel
  affiliateUrl: string;
  category?: string;
  shortDescription?: string;
  // Deal indicators
  isHotDeal?: boolean;
  discountPercent?: number;
  dealScore?: number; // 0-100 score for deal quality
  // Badges for UI
  badges?: string[]; // ['verified_deal', 'curated', 'for_you', 'great_discount', 'best_seller', 'amazon_choice', 'trending']
  isCurated?: boolean;
  isVerified?: boolean;
  isForYou?: boolean;
  // Extended MCP fields
  salesVolume?: string | null; // "10K+ bought in past month"
  isBestSeller?: boolean;
  isAmazonChoice?: boolean;
  couponText?: string | null; // "Save 20% with coupon"
  productBadge?: string | null; // "Overall Pick", "Limited time deal"
  deliveryInfo?: string | null;
  isPrime?: boolean;
  // YouTube video (if available)
  youtubeVideo?: {
    videoId: string;
    title: string;
    channelTitle: string;
    thumbnail: string;
    embedUrl: string;
    isShort: boolean;
    isPremiumChannel: boolean; // True if from a known quality tech review channel
    isHidden: boolean; // Admin can hide specific videos from appearing
  } | null;
  // Price context for conversion signals
  priceContext?: {
    isLowestIn30Days: boolean;
    percentBelowAvg: number;
    priceHistory?: number[];  // Last 30 days prices for sparkline
    priceDrop7Days?: number;  // % price drop in last 7 days
  };
  // Top reviews for feed display
  topReviews?: {
    reviews: Array<{
      title: string | null;
      content: string;
      rating: number;
      reviewerName: string | null;
      isVerifiedPurchase: boolean;
    }>;
    totalCount: number;
    averageRating: number;
  };
}

/**
 * Calculate deal score based on discount, rating, and reviews
 * Higher score = better deal for affiliate revenue potential
 */
function calculateDealScore(product: {
  price: number;
  originalPrice?: number;
  rating?: number;
  totalReviews?: number;
}): number {
  let score = 0;

  // Discount weight (up to 40 points)
  if (product.originalPrice && product.originalPrice > product.price) {
    const discountPercent = ((product.originalPrice - product.price) / product.originalPrice) * 100;
    score += Math.min(discountPercent * 1.5, 40);
  }

  // Rating weight (up to 30 points)
  if (product.rating) {
    score += (product.rating / 5) * 30;
  }

  // Reviews weight (up to 20 points) - high reviews = high conversion potential
  if (product.totalReviews) {
    if (product.totalReviews >= 1000) score += 20;
    else if (product.totalReviews >= 500) score += 15;
    else if (product.totalReviews >= 100) score += 10;
    else if (product.totalReviews >= 50) score += 5;
  }

  // Price point bonus (up to 10 points) - sweet spot pricing
  if (product.price >= 20 && product.price <= 200) {
    score += 10; // Good affiliate commission range
  } else if (product.price > 200) {
    score += 5; // High ticket items can have good commission too
  }

  return Math.round(score);
}

/**
 * Determine if product qualifies as a Hot Deal
 */
function isHotDeal(product: {
  price: number;
  originalPrice?: number;
  rating?: number;
  totalReviews?: number;
}): boolean {
  const discountPercent = product.originalPrice 
    ? ((product.originalPrice - product.price) / product.originalPrice) * 100 
    : 0;

  // Hot deal criteria:
  // 1. At least 20% discount OR
  // 2. High rating (4.5+) with many reviews (500+) OR
  // 3. Deal score above 60
  return (
    discountPercent >= 20 ||
    (product.rating && product.rating >= 4.5 && product.totalReviews && product.totalReviews >= 500) ||
    calculateDealScore(product) >= 60
  );
}

/**
 * Intelligent product sequencing for retention
 * Rules:
 * 1. Never show 3+ products from same category in a row
 * 2. Alternate between high-discount and high-quality products
 * 3. Place products with videos strategically (every 4-6 products)
 * 4. Insert "surprise" products (different category) every 7-10 products
 * 5. Start strong: first 3 products should be high scorers
 * 6. Use session seed for controlled randomization within similar-scoring products
 */
function sequenceProductsForRetention(products: FeedProduct[], seed?: number): FeedProduct[] {
  if (products.length <= 3) return products;

  const sequenced: FeedProduct[] = [];
  const remaining = [...products];

  // Create seeded random for this sequencing
  const random = seed !== undefined ? seededRandom(seed) : Math.random;

  // Categorize products
  const withVideo = remaining.filter(p => p.youtubeVideo);
  const highDiscount = remaining.filter(p => (p.discountPercent || 0) >= 25);
  const highRating = remaining.filter(p => (p.dealScore || 0) >= 60);

  // Track recent categories to avoid repetition
  const recentCategories: string[] = [];
  const MAX_SAME_CATEGORY = 2;

  // Helper: get next best product avoiding category repetition
  // Now includes randomization among similar-scoring products
  function pickNext(pool: FeedProduct[], preferVideo = false, preferDiscount = false): FeedProduct | null {
    // Filter out products that would break category rule
    const validPool = pool.filter(p => {
      const cat = p.category || 'other';
      const recentCount = recentCategories.slice(-MAX_SAME_CATEGORY).filter(c => c === cat).length;
      return recentCount < MAX_SAME_CATEGORY;
    });

    if (validPool.length === 0) {
      // If all filtered out, just pick the best available
      return pool[0] || null;
    }

    // Sort by preference
    const sorted = validPool.sort((a, b) => {
      let scoreA = a.dealScore || 0;
      let scoreB = b.dealScore || 0;

      if (preferVideo) {
        if (a.youtubeVideo && !b.youtubeVideo) return -1;
        if (!a.youtubeVideo && b.youtubeVideo) return 1;
      }

      if (preferDiscount) {
        scoreA += (a.discountPercent || 0) * 0.5;
        scoreB += (b.discountPercent || 0) * 0.5;
      }

      return scoreB - scoreA;
    });

    // Pick randomly from top candidates with similar scores (within 10 points)
    const topScore = sorted[0]?.dealScore || 0;
    const topCandidates = sorted.filter(p => (topScore - (p.dealScore || 0)) <= 10);

    if (topCandidates.length > 1) {
      // Randomly pick from top candidates for variety
      const randomIndex = Math.floor(random() * topCandidates.length);
      return topCandidates[randomIndex];
    }

    return sorted[0];
  }

  // Helper: remove product from remaining pool
  function removeFromPool(product: FeedProduct) {
    const idx = remaining.findIndex(p => p.asin === product.asin);
    if (idx >= 0) remaining.splice(idx, 1);
  }

  // Helper: add product to sequence
  function addToSequence(product: FeedProduct) {
    sequenced.push(product);
    recentCategories.push(product.category || 'other');
    removeFromPool(product);
  }

  // Phase 1: Strong start - first 3 products are top scorers
  for (let i = 0; i < 3 && remaining.length > 0; i++) {
    const preferVideo = i === 1; // Second product ideally has video
    const next = pickNext(remaining, preferVideo, i === 0);
    if (next) addToSequence(next);
  }

  // Phase 2: Alternate pattern for remaining products
  // Use session seed to vary the starting toggle
  let videoCounter = seed !== undefined ? (seed % 3) : 0;
  let discountToggle = seed !== undefined ? (seed % 2 === 0) : true;

  while (remaining.length > 0) {
    const position = sequenced.length;
    videoCounter++;

    // Every 4-6 products, try to place one with video (varied by seed)
    const videoThreshold = 4 + (seed !== undefined ? (seed % 3) : 0);
    const wantVideo = videoCounter >= videoThreshold && withVideo.some(v => remaining.includes(v));
    if (wantVideo) videoCounter = 0;

    // Every 6-10 products, force a different category (surprise) - varied by seed
    const surpriseInterval = 6 + (seed !== undefined ? (seed % 5) : 2);
    const forceSurprise = position > 0 && position % surpriseInterval === 0;
    let pool = remaining;

    if (forceSurprise) {
      const lastCat = recentCategories[recentCategories.length - 1];
      const differentCat = remaining.filter(p => (p.category || 'other') !== lastCat);
      if (differentCat.length > 0) pool = differentCat;
    }

    const next = pickNext(pool, wantVideo, discountToggle);
    if (next) {
      addToSequence(next);
      discountToggle = !discountToggle; // Alternate preference
    } else {
      break;
    }
  }

  return sequenced;
}

/**
 * Add conversion badges based on product characteristics
 * Now includes MCP-derived badges for better conversion
 */
function addConversionBadges(product: FeedProduct, priceStats?: { isLowest: boolean; daysSinceLowest?: number }): string[] {
  const badges: string[] = product.badges || [];

  // "Great Discount" badge
  if ((product.discountPercent || 0) >= 20 && !badges.includes('great_discount')) {
    badges.push('great_discount');
  }

  // "Verified Deal" badge - high rating + reviews
  if (product.rating && product.rating >= 4.3 &&
      product.totalReviews && product.totalReviews >= 100 &&
      !badges.includes('verified_deal')) {
    badges.push('verified_deal');
  }

  // "Lowest Price" badge (if we have price history data)
  if (priceStats?.isLowest && !badges.includes('lowest_price')) {
    badges.push('lowest_price');
  }

  // "Popular" badge - high number of reviews
  if (product.totalReviews && product.totalReviews >= 1000 && !badges.includes('popular')) {
    badges.push('popular');
  }

  // "Video Review" badge - has YouTube video
  if (product.youtubeVideo && !badges.includes('has_video')) {
    badges.push('has_video');
  }

  // === NEW MCP-DERIVED BADGES ===

  // "Best Seller" badge - Amazon's best seller ranking
  if (product.isBestSeller && !badges.includes('best_seller')) {
    badges.push('best_seller');
  }

  // "Amazon's Choice" badge - quality + value endorsement
  if (product.isAmazonChoice && !badges.includes('amazon_choice')) {
    badges.push('amazon_choice');
  }

  // "Trending" badge - high sales volume
  if (product.salesVolume && !badges.includes('trending')) {
    const salesText = product.salesVolume.toLowerCase();
    if (salesText.includes('10k') || salesText.includes('20k') || salesText.includes('50k')) {
      badges.push('trending');
    }
  }

  // "Has Coupon" badge - extra savings available
  if (product.couponText && !badges.includes('has_coupon')) {
    badges.push('has_coupon');
  }

  // "Prime" badge - fast delivery
  if (product.isPrime && !badges.includes('prime')) {
    badges.push('prime');
  }

  // "Limited Deal" badge - urgency signal
  if (product.productBadge?.toLowerCase().includes('limited') && !badges.includes('limited_deal')) {
    badges.push('limited_deal');
  }

  return badges;
}

// Popular search terms for different categories (English)
const CATEGORY_KEYWORDS_EN: Record<string, string[]> = {
  all: ['best sellers', 'deals today', 'trending tech', 'top rated'],
  electronics: ['wireless earbuds', 'portable charger', 'bluetooth speaker', 'usb hub'],
  audio: ['headphones', 'wireless earbuds', 'bluetooth speaker', 'microphone', 'soundbar'],
  gaming: ['gaming headset', 'gaming mouse', 'ps5 controller', 'gaming keyboard', 'nintendo switch'],
  smartphones: ['iphone', 'samsung galaxy', 'phone case', 'screen protector', 'phone charger'],
  home: ['smart home', 'led lights', 'kitchen gadgets', 'vacuum cleaner', 'air fryer'],
  wearables: ['smartwatch', 'fitness tracker', 'apple watch', 'garmin', 'fitbit'],
  computers: ['laptop', 'laptop stand', 'webcam', 'keyboard', 'monitor', 'mouse'],
};

// Popular search terms for different categories (Spanish)
const CATEGORY_KEYWORDS_ES: Record<string, string[]> = {
  all: ['ofertas', 'mas vendidos', 'tendencias', 'mejor valorados'],
  electronics: ['auriculares inalambricos', 'cargador portatil', 'altavoz bluetooth', 'hub usb'],
  audio: ['auriculares', 'cascos bluetooth', 'altavoz portatil', 'microfono', 'barra de sonido'],
  gaming: ['auriculares gaming', 'raton gaming', 'mando ps5', 'teclado gaming', 'nintendo switch'],
  smartphones: ['iphone', 'samsung galaxy', 'funda movil', 'protector pantalla', 'cargador movil'],
  home: ['hogar inteligente', 'luces led', 'robot aspirador', 'freidora aire', 'accesorios cocina'],
  wearables: ['smartwatch', 'pulsera actividad', 'apple watch', 'garmin', 'reloj deportivo'],
  computers: ['portatil', 'soporte portatil', 'webcam', 'teclado inalambrico', 'monitor', 'raton'],
};

// Default trending keywords (English)
const TRENDING_KEYWORDS_EN = [
  'best sellers electronics',
  'deals today',
  'wireless earbuds',
  'smart watch',
  'portable charger',
  'bluetooth speaker',
  'gaming accessories',
  'phone accessories',
];

// Default trending keywords (Spanish) - more product-focused
const TRENDING_KEYWORDS_ES = [
  'auriculares bluetooth',
  'smartwatch',
  'cargador movil',
  'altavoz portatil',
  'accesorios gaming',
  'fundas iphone',
  'ratón inalambrico',
  'kindle',
  'airpods',
  'samsung galaxy',
];

// Brand to keyword mapping for recommendations
const BRAND_KEYWORDS: Record<string, string[]> = {
  'apple': ['iphone', 'airpods', 'apple watch', 'macbook', 'ipad'],
  'samsung': ['samsung galaxy', 'samsung earbuds', 'samsung watch'],
  'sony': ['sony headphones', 'playstation', 'sony earbuds'],
  'bose': ['bose headphones', 'bose speaker', 'bose earbuds'],
  'amazon': ['kindle', 'echo dot', 'fire tv', 'alexa'],
  'logitech': ['logitech mouse', 'logitech keyboard', 'logitech webcam'],
  'nintendo': ['nintendo switch', 'nintendo games', 'joy-con'],
  'razer': ['razer mouse', 'razer headset', 'razer keyboard'],
  'jbl': ['jbl speaker', 'jbl headphones', 'jbl earbuds'],
  'anker': ['anker charger', 'anker powerbank', 'anker cable'],
};

/**
 * Get personalized keywords based on user's liked products
 */
async function getRecommendedKeywords(userId: string | null, lang: string): Promise<string[]> {
  if (!userId) return [];

  try {
    // Get user's recent likes
    const likes = await db
      .select()
      .from(ProductLikes)
      .where(eq(ProductLikes.userId, userId))
      .orderBy(desc(ProductLikes.createdAt))
      .limit(20)
      .all();

    if (likes.length === 0) return [];

    // Get product details for liked items that have productId
    const productIds = likes.filter(l => l.productId).map(l => l.productId!);
    
    // Track brand frequency
    const brandCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    for (const productId of productIds.slice(0, 10)) {
      const product = await db
        .select()
        .from(Products)
        .where(eq(Products.productId, productId))
        .get();

      if (product) {
        // Count brands
        if (product.brand) {
          const brand = product.brand.toLowerCase();
          brandCounts[brand] = (brandCounts[brand] || 0) + 1;
        }
        // Count categories
        if (product.category) {
          const cat = product.category.toLowerCase();
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        }
      }
    }

    // Generate recommended keywords
    const recommendedKeywords: string[] = [];

    // Add keywords from top brands
    const topBrands = Object.entries(brandCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([brand]) => brand);

    for (const brand of topBrands) {
      if (BRAND_KEYWORDS[brand]) {
        recommendedKeywords.push(...BRAND_KEYWORDS[brand].slice(0, 2));
      } else {
        recommendedKeywords.push(brand);
      }
    }

    // Add keywords from top categories
    const categoryKeywords = lang === 'es' ? CATEGORY_KEYWORDS_ES : CATEGORY_KEYWORDS_EN;
    const topCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([cat]) => cat);

    for (const cat of topCategories) {
      if (categoryKeywords[cat]) {
        recommendedKeywords.push(...categoryKeywords[cat].slice(0, 2));
      }
    }

    return [...new Set(recommendedKeywords)].slice(0, 6);
  } catch (error) {
    console.error('Error getting recommended keywords:', error);
    return [];
  }
}

/**
 * Get products from database as fallback
 * Supports search query filtering using simple text matching
 */
async function getDbProducts(lang: string, page: number, limit: number, searchQuery?: string): Promise<FeedProduct[]> {
  try {
    // Get both published and imported products for feed fallback
    let dbProducts = await getFeedProducts(lang);

    // Filter by search query if provided
    if (searchQuery && searchQuery.length > 0) {
      const query = searchQuery.toLowerCase();
      const queryWords = query.split(/\s+/).filter(w => w.length > 1);

      dbProducts = dbProducts.filter(product => {
        const searchableText = [
          product.title,
          product.brand,
          product.category,
          product.shortDescription,
          product.description,
        ].filter(Boolean).join(' ').toLowerCase();

        // Match if all query words are found in the searchable text
        return queryWords.every(word => searchableText.includes(word));
      });

      console.log(`[Feed API] DB search for "${searchQuery}": ${dbProducts.length} results`);
    }

    // Paginate
    const start = (page - 1) * limit;
    const paginatedProducts = dbProducts.slice(start, start + limit);

    return paginatedProducts.map((product, index) => ({
      productId: product.productId,
      asin: product.asin,
      title: product.title,
      brand: product.brand,
      price: product.price,
      originalPrice: product.originalPrice || undefined,
      currency: product.currency,
      rating: product.rating || undefined,
      totalReviews: product.totalReviews || undefined,
      featuredImage: {
        url: product.featuredImageUrl,
        alt: product.featuredImageAlt || product.title,
      },
      affiliateUrl: product.affiliateUrl,
      category: product.category || 'electronics',
      shortDescription: product.shortDescription || product.description?.slice(0, 120),
    }));
  } catch (error) {
    console.error('Error getting DB products:', error);
    return [];
  }
}

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    // Parse query params
    const page = parseInt(url.searchParams.get('page') || '1');
    const category = url.searchParams.get('category') || 'all';
    const lang = url.searchParams.get('lang') || 'es';
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const excludeParam = url.searchParams.get('exclude') || '';
    const excludeFromUrl = excludeParam ? excludeParam.split(',').filter(Boolean) : [];

    // NEW: Search query parameter
    const searchQuery = url.searchParams.get('search')?.trim() || '';

    // Get authenticated user for personalization
    const auth = locals.auth?.();
    const userId = auth?.userId || null;

    // Get affiliate tag from environment
    const affiliateTag = import.meta.env.AMAZON_PA_API_PARTNER_TAG || 'bestdeal0ee40-20';
    const marketplace = lang === 'es' ? 'es' : 'com';

    let feedProducts: FeedProduct[] = [];
    let source = 'database';
    let isPersonalized = false;

    // Load user preferences, profile, and excluded ASINs for personalization
    let userPrefs: Awaited<ReturnType<typeof getUserPreferences>> | undefined = undefined;
    let userProfile: UserProfile | null = null;
    let userExcludedAsins = new Set<string>();

    if (userId) {
      // Load preferences, profile, and excluded ASINs in parallel
      const [prefs, excluded, profile] = await Promise.all([
        getUserPreferences(userId),
        getExcludedAsins(userId),
        buildUserProfile(userId)
      ]);
      userPrefs = prefs;
      userExcludedAsins = excluded;
      userProfile = profile;
      console.log(`[Feed API] User ${userId.slice(-6)}: ${userExcludedAsins.size} ASINs excluded, profile: ${profile ? 'built' : 'none'}`);
      if (profile) {
        console.log(`[Feed API] Top categories: ${profile.categories.slice(0, 3).join(', ')}, Top brands: ${profile.brands.slice(0, 3).join(', ')}`);
      }
    }

    // Merge URL exclusions with user's liked/disliked products
    const excludeAsins = [...new Set([...excludeFromUrl, ...userExcludedAsins])];

    // Debug: Check RapidAPI configuration and quota
    const rapidApiConfigured = isRainforestConfigured();
    const apiStats = getApiUsageStats();
    console.log(`[Feed API] RapidAPI configured: ${rapidApiConfigured}, quota: ${apiStats.used}/${apiStats.limit}, userId: ${userId ? 'yes' : 'no'}`);

    // Priority 1: Show curated deals on first page
    if (page === 1) {
      try {
        const curatedDeals = await getActiveCuratedDeals(marketplace, 3);
        
        if (curatedDeals.length > 0) {
          const curatedProducts: FeedProduct[] = curatedDeals
            .filter(deal => deal.title && deal.imageUrl && deal.price && !excludeAsins.includes(deal.asin))
            .map((deal, index) => ({
              productId: `curated-${deal.asin}-${index}`,
              asin: deal.asin,
              title: deal.title!,
              brand: deal.brand || 'Amazon',
              price: deal.price!,
              originalPrice: deal.originalPrice || undefined,
              currency: deal.currency || (marketplace === 'es' ? 'EUR' : 'USD'),
              rating: deal.rating || undefined,
              totalReviews: deal.totalReviews || undefined,
              featuredImage: {
                url: deal.imageUrl!,
                alt: deal.title!,
              },
              affiliateUrl: deal.affiliateUrl!,
              category: category !== 'all' ? category : 'electronics',
              shortDescription: deal.reason || deal.title!.slice(0, 120),
              isHotDeal: true,
              discountPercent: deal.originalPrice && deal.price 
                ? Math.round(((deal.originalPrice - deal.price) / deal.originalPrice) * 100)
                : 0,
              dealScore: (deal.aiScore || 7) * 10,
              badges: ['curated'],
              isCurated: true,
              isVerified: true,
            }));

          feedProducts.push(...curatedProducts);
          console.log(`[Feed API] Added ${curatedProducts.length} curated deals`);
        }
      } catch (e) {
        console.error('[Feed API] Error fetching curated deals:', e);
      }
    }

    // Try RapidAPI first if configured
    if (rapidApiConfigured) {
      // Select keywords based on language
      const categoryKeywords = lang === 'es' ? CATEGORY_KEYWORDS_ES : CATEGORY_KEYWORDS_EN;
      const trendingKeywords = lang === 'es' ? TRENDING_KEYWORDS_ES : TRENDING_KEYWORDS_EN;

      // Get personalized recommendations if user is logged in
      const recommendedKeywords = await getRecommendedKeywords(userId, lang);

      // Select search keywords based on category, page, and personalization
      let keywords: string;

      // Priority 1: User's search query (if provided)
      if (searchQuery) {
        keywords = searchQuery;
        console.log(`[Feed API] Using user search query: "${keywords}"`);
      }
      // Priority 2: Use new recommendation engine for personalized keywords
      else if (userProfile && category === 'all') {
        const personalizedKw = getPersonalizedKeywords(userProfile, page, lang as 'es' | 'en');
        keywords = personalizedKw.keyword;
        isPersonalized = !personalizedKw.isExploration;
        console.log(`[Feed API] Recommendation engine keyword: "${keywords}" (exploration: ${personalizedKw.isExploration})`);
      } else if (userId && recommendedKeywords.length > 0 && page % 3 === 0) {
        // Fallback to old method for specific categories
        const recIndex = Math.floor(page / 3) % recommendedKeywords.length;
        keywords = recommendedKeywords[recIndex];
        isPersonalized = true;
        console.log(`[Feed API] Using personalized keyword: "${keywords}"`);
      } else if (category !== 'all' && categoryKeywords[category]) {
        const catKeywords = categoryKeywords[category];
        // Add session-based offset for variety across refreshes
        const sessionOffset = getSessionSeed() % catKeywords.length;
        keywords = catKeywords[(page - 1 + sessionOffset) % catKeywords.length];
      } else {
        // Rotate through trending keywords based on page
        // Add session-based offset so different keywords appear on refresh
        const sessionOffset = getSessionSeed() % trendingKeywords.length;
        keywords = trendingKeywords[(page - 1 + sessionOffset) % trendingKeywords.length];
      }

      // Search products using cached RapidAPI (4-hour cache)
      console.log(`[Feed API] Searching products with keywords: "${keywords}" (cached)`);
      const result = await cachedSearchProducts(
        keywords,
        marketplace,
        Math.ceil(page / 2) // RapidAPI pages
      );
      console.log(`[Feed API] Search result: success=${result.success}, products=${result.success ? result.data?.length : 0}`);
      if (!result.success) {
        console.log(`[Feed API] Search error: ${JSON.stringify((result as any).error)}`);
      }

      if (result.success && result.data && result.data.length > 0) {
        const apiProducts = result.data;
        console.log(`[Feed API] RapidAPI returned ${apiProducts.length} products`);

        // Track prices for history
        await trackPrices(
          apiProducts
            .filter(p => p.price)
            .map(p => ({
              asin: p.asin,
              price: p.price!,
              originalPrice: p.originalPrice || undefined,
              currency: p.currency,
              marketplace,
            }))
        );

        // Transform products with affiliate links
        // Filter out: products without images/prices, already seen products
        // Also exclude already added curated products
        const curatedAsins = new Set(feedProducts.map(p => p.asin));

        // Debug: count filtered products
        const validProducts = apiProducts.filter(product =>
          product.imageUrl &&
          product.price &&
          product.price > 0 &&
          !excludeAsins.includes(product.asin) &&
          !curatedAsins.has(product.asin)
        );
        const sliceAmount = limit - feedProducts.length;
        console.log(`[Feed API] After filtering: ${validProducts.length} valid products, taking ${sliceAmount} (limit=${limit}, curated=${feedProducts.length})`);

        const transformedProducts = await Promise.all(
          validProducts
            .slice(0, sliceAmount)
            .map(async (product, index) => {
              // Build affiliate URL
              const amazonDomain = marketplace === 'es' ? 'amazon.es' : 'amazon.com';
              const affiliateUrl = `https://www.${amazonDomain}/dp/${product.asin}?tag=${affiliateTag}`;

              // Calculate deal indicators
              const discountPercent = product.originalPrice && product.price
                ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
                : 0;

              // Build badges based on various factors
              const badges: string[] = [];
              let isVerified = false;
              let isForYou = false;
              let isCurated = false;

              // Check if curated
              const curatedStatus = await isCuratedDeal(product.asin, marketplace);
              if (curatedStatus) {
                badges.push('curated');
                isCurated = true;
              }

              // Check user preference match
              if (userPrefs) {
                const categories = (userPrefs.categories as string[]) || [];
                const brands = (userPrefs.brands as string[]) || [];
                const productCategory = category !== 'all' ? category : 'electronics';
                
                if (categories.includes(productCategory) || 
                    (product.brand && brands.some(b => b.toLowerCase() === product.brand?.toLowerCase()))) {
                  badges.push('for_you');
                  isForYou = true;
                  isPersonalized = true;
                }

                // Check budget match
                if (userPrefs.budgetRange && product.price) {
                  const inBudget = (
                    (userPrefs.budgetRange === 'low' && product.price < 50) ||
                    (userPrefs.budgetRange === 'mid' && product.price >= 50 && product.price < 200) ||
                    (userPrefs.budgetRange === 'high' && product.price >= 200 && product.price < 500) ||
                    (userPrefs.budgetRange === 'premium' && product.price >= 500)
                  );
                  if (inBudget && !badges.includes('for_you')) {
                    badges.push('for_you');
                    isForYou = true;
                  }
                }
              }

              // Add discount badge
              if (discountPercent >= 20) {
                badges.push('great_discount');
              }

              // Calculate enhanced deal score
              const analyzable = toAnalyzableProduct(product, category !== 'all' ? category : undefined);
              const enhancedScore = calculateEnhancedScore({
                product: analyzable,
                userPreferences: userPrefs ? {
                  categories: (userPrefs.categories as string[]) || [],
                  brands: (userPrefs.brands as string[]) || [],
                  budgetRange: userPrefs.budgetRange as any,
                  dealSensitivity: userPrefs.dealSensitivity as any,
                } : undefined,
                isCurated,
              });

              const dealScore = enhancedScore.totalScore * 10;

              return {
                productId: `feed-${product.asin}-${page}-${index}`,
                asin: product.asin,
                title: product.title,
                brand: product.brand || 'Amazon',
                price: product.price!,
                originalPrice: product.originalPrice || undefined,
                currency: product.currency || (marketplace === 'es' ? 'EUR' : 'USD'),
                rating: product.rating || undefined,
                totalReviews: product.totalReviews || undefined,
                featuredImage: {
                  url: product.imageUrl!,
                  alt: product.title,
                },
                images: product.images && product.images.length > 0 ? product.images : [product.imageUrl!],
                affiliateUrl,
                category: category !== 'all' ? category : 'electronics',
                shortDescription: product.description || '', // Only use real description, not title
                isHotDeal: isHotDeal({
                  price: product.price!,
                  originalPrice: product.originalPrice,
                  rating: product.rating,
                  totalReviews: product.totalReviews,
                }),
                discountPercent,
                dealScore,
                badges: badges.length > 0 ? badges : undefined,
                isCurated,
                isVerified,
                isForYou,
                // Extended MCP fields for UI
                salesVolume: product.salesVolume || undefined,
                isBestSeller: product.isBestSeller || false,
                isAmazonChoice: product.isAmazonChoice || false,
                couponText: product.couponText || undefined,
                productBadge: product.productBadge || undefined,
                deliveryInfo: product.deliveryInfo || undefined,
                isPrime: product.isPrime || false,
              };
            })
        );

        // Combine curated + transformed products
        // Use shuffleWithinTiers for variety while maintaining quality
        // Products with similar scores are shuffled, giving different order on each session
        const sessionSeed = getSessionSeed();
        const combinedProducts = [...feedProducts, ...transformedProducts];
        feedProducts = shuffleWithinTiers(combinedProducts, sessionSeed + page);

        source = 'rapidapi';
      }
    }

    // Fallback/supplement with database products if RapidAPI returned insufficient results
    if (feedProducts.length < limit) {
      const needed = limit - feedProducts.length;
      const existingAsins = new Set(feedProducts.map(p => p.asin));
      const dbProducts = await getDbProducts(lang, page, needed + 10, searchQuery);

      // Filter out duplicates and add to feed
      const uniqueDbProducts = dbProducts
        .filter(p => !existingAsins.has(p.asin) && !excludeAsins.includes(p.asin))
        .slice(0, needed);

      if (uniqueDbProducts.length > 0) {
        feedProducts.push(...uniqueDbProducts);
        console.log(`[Feed API] Supplemented with ${uniqueDbProducts.length} DB products (had ${feedProducts.length - uniqueDbProducts.length}, needed ${limit})`);
      }

      if (feedProducts.length === 0) {
        source = 'database';
      } else if (source !== 'rapidapi') {
        source = 'database';
      }
    }

    // Enrich products with YouTube videos (if configured)
    // QUOTA OPTIMIZATION: Only fetch videos for top 2 products per page
    // With 100 units per search and 10,000 daily limit, this allows ~50 page loads/day
    let enrichedProducts = feedProducts;
    let videoStats = { configured: false, quotaRemaining: 0, videosFound: 0, productsChecked: 0 };

    // VIDEO FEATURE DISABLED - set to true to re-enable
    const VIDEOS_ENABLED = false;

    console.log(`[Feed API] Video sources configured: ${isAnyVideoSourceConfigured()} (feature enabled: ${VIDEOS_ENABLED})`);

    if (VIDEOS_ENABLED && isAnyVideoSourceConfigured() && feedProducts.length > 0) {
      videoStats.configured = true;
      const quotaStatus = await getQuotaStatus();
      videoStats.quotaRemaining = quotaStatus.remaining;
      console.log(`[Feed API] YouTube quota: ${quotaStatus.used}/${quotaStatus.limit} (remaining: ${quotaStatus.remaining})`);

      // Fetch videos for top products
      // Note: Piped API is always available (free, no quota), so we always try
      // The video-cache handles fallback logic internally
      const MAX_VIDEO_FETCHES = 2;
      const productsForVideo = feedProducts
        .slice(0, MAX_VIDEO_FETCHES)
        .map(p => ({ asin: p.asin, title: p.title }));

      videoStats.productsChecked = productsForVideo.length;
      console.log(`[Feed API] Fetching videos for ${productsForVideo.length} products...`);

      const videoMap = await getProductVideos(
        productsForVideo,
        lang as 'es' | 'en',
        1 // Sequential to minimize burst requests
      );

      // Count videos found
      let videosFound = 0;
      videoMap.forEach(v => { if (v) videosFound++; });
      videoStats.videosFound = videosFound;
      console.log(`[Feed API] Videos found: ${videosFound}/${productsForVideo.length}`);

      // Add video info to products that have it
      enrichedProducts = feedProducts.map(product => {
        const video = videoMap.get(product.asin);
        return {
          ...product,
          youtubeVideo: video ? {
            videoId: video.videoId,
            title: video.title,
            channelTitle: video.channelTitle,
            thumbnail: video.thumbnail,
            embedUrl: getVideoEmbedUrl(video.videoId, { autoplay: false, mute: false }),
            isShort: video.isShort,
            isPremiumChannel: video.isPremiumChannel ?? false,
            isHidden: video.isHidden ?? false,
          } : null,
        };
      });
    }

    // Check for lowest prices in 30 days (adds "lowest_price" badge)
    // First try local DB, then enrich with Keepa API if configured
    const productsWithPrices = enrichedProducts
      .filter(p => p.price)
      .map(p => ({ asin: p.asin, currentPrice: p.price }));

    const lowestPriceMap = productsWithPrices.length > 0
      ? await checkLowestPrices(productsWithPrices, marketplace)
      : new Map();

    // If Keepa is configured, enrich products that have no local history with Keepa data
    const keepaConfigured = isKeepaConfigured();
    console.log(`[Feed API] Keepa configured: ${keepaConfigured}`);

    if (keepaConfigured) {
      // Find products with no local history (historyPoints = 0)
      const productsNeedingKeepa = enrichedProducts
        .filter(p => {
          const stats = lowestPriceMap.get(p.asin);
          return !stats?.priceHistory || stats.priceHistory.length < 3;
        })
        .slice(0, 3); // Limit to 3 products per request to save API calls

      if (productsNeedingKeepa.length > 0) {
        console.log(`[Feed API] Fetching Keepa data for ${productsNeedingKeepa.length} products...`);

        // Fetch Keepa data in parallel
        const keepaPromises = productsNeedingKeepa.map(async (product) => {
          try {
            const keepaData = await getPriceHistory(product.asin, marketplace, { useKeepa: true, days: 30 });
            return { asin: product.asin, data: keepaData };
          } catch (error) {
            console.error(`[Keepa] Error fetching ${product.asin}:`, error);
            return { asin: product.asin, data: null };
          }
        });

        const keepaResults = await Promise.all(keepaPromises);

        // Merge Keepa data into lowestPriceMap
        for (const { asin, data } of keepaResults) {
          if (data && data.history.length > 0) {
            const prices = data.history.map(h => h.price);
            const currentPrice = enrichedProducts.find(p => p.asin === asin)?.price || 0;

            // Calculate stats from Keepa history
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
            const isLowest = currentPrice <= min * 1.02; // Within 2% of lowest
            const percentBelowAvg = avg > 0 ? Math.round(((avg - currentPrice) / avg) * 100) : 0;

            // Calculate 7-day price drop
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const pricesFrom7DaysAgo = data.history.filter(h => h.date <= sevenDaysAgo);
            let priceDrop7Days: number | undefined;
            if (pricesFrom7DaysAgo.length > 0) {
              const oldPrice = pricesFrom7DaysAgo[pricesFrom7DaysAgo.length - 1].price;
              if (oldPrice > currentPrice) {
                priceDrop7Days = Math.round(((oldPrice - currentPrice) / oldPrice) * 100);
              }
            }

            // Sample prices for sparkline (max 15 points)
            let priceHistory: number[] = prices;
            if (prices.length > 15) {
              const step = Math.floor(prices.length / 15);
              priceHistory = [];
              for (let i = 0; i < prices.length; i += step) {
                priceHistory.push(prices[i]);
                if (priceHistory.length >= 15) break;
              }
              // Always include last price
              if (priceHistory[priceHistory.length - 1] !== prices[prices.length - 1]) {
                priceHistory.push(prices[prices.length - 1]);
              }
            }

            lowestPriceMap.set(asin, {
              isLowest,
              lowestPrice: min,
              percentBelowAvg: Math.max(0, percentBelowAvg),
              priceHistory: priceHistory.length >= 3 ? priceHistory : undefined,
              priceDrop7Days: priceDrop7Days && priceDrop7Days > 0 ? priceDrop7Days : undefined,
            });

            console.log(`[Keepa] ${asin}: ${data.history.length} data points, avg=${avg.toFixed(2)}, min=${min}, percentBelowAvg=${percentBelowAvg}%`);
          }
        }
      }
    }

    // Add conversion badges to each product (including lowest price info)
    enrichedProducts = enrichedProducts.map(product => {
      const priceStats = lowestPriceMap.get(product.asin);

      // DEBUG: Log Keepa data for each product
      console.log(`[Keepa Debug] ${product.asin} - ${product.title.slice(0, 40)}...`);
      console.log(`  └─ Price: ${product.price} | priceStats:`, priceStats ? {
        isLowest: priceStats.isLowest,
        lowestPrice: priceStats.lowestPrice,
        percentBelowAvg: priceStats.percentBelowAvg,
        priceDrop7Days: priceStats.priceDrop7Days,
        historyPoints: priceStats.priceHistory?.length || 0,
      } : 'NO DATA');

      return {
        ...product,
        badges: addConversionBadges(product, priceStats),
        // Add price context for UI (including sparkline data and 7-day drop)
        priceContext: priceStats ? {
          isLowestIn30Days: priceStats.isLowest,
          percentBelowAvg: priceStats.percentBelowAvg,
          priceHistory: priceStats.priceHistory,
          priceDrop7Days: priceStats.priceDrop7Days,
        } : undefined,
      };
    });

    // Enrich products with top reviews from cache
    const productAsins = enrichedProducts.map(p => p.asin);
    const reviewsMap = await getTopReviewsForAsins(productAsins, 2); // Get top 2 reviews per product

    enrichedProducts = enrichedProducts.map(product => {
      const reviewData = reviewsMap.get(product.asin);
      return {
        ...product,
        topReviews: reviewData ? {
          reviews: reviewData.reviews.map(r => ({
            title: r.title,
            content: r.content,
            rating: r.rating,
            reviewerName: r.reviewerName,
            isVerifiedPurchase: r.isVerifiedPurchase,
          })),
          totalCount: reviewData.totalCount,
          averageRating: reviewData.averageRating,
        } : undefined,
      };
    });

    console.log(`[Feed API] Reviews: ${Array.from(reviewsMap.entries()).filter(([_, v]) => v.reviews.length > 0).length}/${productAsins.length} products have cached reviews`);

    // Apply recommendation engine scoring for personalized ranking
    if (userProfile && enrichedProducts.length > 0) {
      // Get content-based similarity profile for enhanced scoring
      const similarityProfile = userId ? await getUserSimilarityProfile(userId) : null;

      // Get collaborative filtering boosts
      let collaborativeBoosts: Map<string, { boost: number; reason: string }> | undefined;
      if (userId && userProfile) {
        const likedAsins = await db.select({ asin: ProductLikes.asin })
          .from(ProductLikes)
          .where(eq(ProductLikes.userId, userId))
          .orderBy(desc(ProductLikes.createdAt))
          .limit(20)
          .all()
          .then(likes => likes.map(l => l.asin));

        collaborativeBoosts = await getCollaborativeBoosts(
          userId,
          likedAsins,
          userProfile.categories,
          userProfile.brands,
          userExcludedAsins
        );
        console.log(`[Feed API] Collaborative boosts: ${collaborativeBoosts.size} products boosted`);
      }

      // Convert to ProductCandidate format for scoring
      const candidates: ProductCandidate[] = enrichedProducts.map(p => ({
        asin: p.asin,
        title: p.title,
        brand: p.brand,
        category: p.category || 'electronics',
        price: p.price,
        originalPrice: p.originalPrice,
        rating: p.rating,
        totalReviews: p.totalReviews,
        discountPercent: p.discountPercent,
        isCurated: p.isCurated,
        hasVideo: !!p.youtubeVideo,
      }));

      // Score and rank products (with content-based similarity + collaborative filtering)
      const scoredProducts = scoreProducts(candidates, userProfile, similarityProfile, collaborativeBoosts);

      // Reorder enrichedProducts based on scored ranking
      // First assign scores, then use shuffleWithinTiers for variety
      const asinToScore = new Map(scoredProducts.map(p => [p.asin, p.totalScore]));

      // Update dealScore with recommendation score for shuffleWithinTiers
      enrichedProducts = enrichedProducts.map(p => ({
        ...p,
        dealScore: (asinToScore.get(p.asin) || 0) * 10, // Scale to match tier logic
      }));

      // Apply shuffle within tiers for controlled randomization
      const recSessionSeed = getSessionSeed();
      enrichedProducts = shuffleWithinTiers(enrichedProducts, recSessionSeed + page * 100);

      // Log scoring stats
      const topScored = scoredProducts.slice(0, 3);
      const hasCollab = collaborativeBoosts && collaborativeBoosts.size > 0 ? '+ collab' : '';
      const hasSimilarity = similarityProfile ? '+ similarity' : '';
      console.log(`[Feed API] Recommendation scoring ${hasSimilarity} ${hasCollab}. Top 3: ${topScored.map(p => `${p.asin.slice(-4)}:${p.totalScore.toFixed(1)}`).join(', ')}`);
      isPersonalized = true;
    }

    // Apply intelligent sequencing for better retention (skip on first page with curated)
    // Pass session seed for controlled randomization
    if (page > 1 || !feedProducts.some(p => p.isCurated)) {
      const sequenceSeed = getSessionSeed() + page * 17; // Different seed per page
      enrichedProducts = sequenceProductsForRetention(enrichedProducts, sequenceSeed);
    }

    console.log(`[Feed API] Returning ${enrichedProducts.length} products (page ${page})${searchQuery ? ` for search: "${searchQuery}"` : ''}`);

    return new Response(
      JSON.stringify({
        success: true,
        products: enrichedProducts,
        page,
        hasMore: feedProducts.length >= limit,
        source,
        isPersonalized,
        videoStats,
        searchQuery: searchQuery || undefined, // Include search query in response
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          // Don't cache personalized responses
          'Cache-Control': isPersonalized ? 'private, no-cache' : 'public, max-age=60',
        } 
      }
    );
  } catch (error) {
    console.error('Feed products error:', error);
    
    // Try database fallback on error
    const lang = url.searchParams.get('lang') || 'es';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const fallbackSearchQuery = url.searchParams.get('search')?.trim() || '';

    const fallbackProducts = await getDbProducts(lang, page, limit, fallbackSearchQuery);
    
    if (fallbackProducts.length > 0) {
      return new Response(
        JSON.stringify({
          success: true,
          products: fallbackProducts,
          page,
          hasMore: fallbackProducts.length >= limit,
          source: 'database',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        products: [],
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
