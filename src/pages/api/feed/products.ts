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
import { getPublishedProducts, getUserPreferences, getActiveCuratedDeals, isCuratedDeal, getExcludedAsins, checkLowestPrices } from '@lib/db';
import { db, ProductLikes, Products, eq, desc } from 'astro:db';
import { trackPrices } from '@lib/keepa-api';
import { validateDeal, calculateEnhancedScore, toAnalyzableProduct } from '@lib/deal-analyzer';
import { getProductVideos, getQuotaStatus } from '@lib/video-cache';
import { getVideoEmbedUrl, isYouTubeConfigured } from '@lib/youtube-api';

export const prerender = false;

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
  badges?: string[]; // ['verified_deal', 'curated', 'for_you', 'great_discount']
  isCurated?: boolean;
  isVerified?: boolean;
  isForYou?: boolean;
  // YouTube video (if available)
  youtubeVideo?: {
    videoId: string;
    title: string;
    channelTitle: string;
    thumbnail: string;
    embedUrl: string;
    isShort: boolean;
  } | null;
  // Price context for conversion signals
  priceContext?: {
    isLowestIn30Days: boolean;
    percentBelowAvg: number;
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
 */
function sequenceProductsForRetention(products: FeedProduct[]): FeedProduct[] {
  if (products.length <= 3) return products;

  const sequenced: FeedProduct[] = [];
  const remaining = [...products];

  // Categorize products
  const withVideo = remaining.filter(p => p.youtubeVideo);
  const highDiscount = remaining.filter(p => (p.discountPercent || 0) >= 25);
  const highRating = remaining.filter(p => (p.dealScore || 0) >= 60);

  // Track recent categories to avoid repetition
  const recentCategories: string[] = [];
  const MAX_SAME_CATEGORY = 2;

  // Helper: get next best product avoiding category repetition
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
  let videoCounter = 0;
  let discountToggle = true;

  while (remaining.length > 0) {
    const position = sequenced.length;
    videoCounter++;

    // Every 4-6 products, try to place one with video
    const wantVideo = videoCounter >= 4 && withVideo.some(v => remaining.includes(v));
    if (wantVideo) videoCounter = 0;

    // Every 8 products, force a different category (surprise)
    const forceSurprise = position > 0 && position % 8 === 0;
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
 */
async function getDbProducts(lang: string, page: number, limit: number): Promise<FeedProduct[]> {
  try {
    const dbProducts = await getPublishedProducts(lang);
    
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

    // Get authenticated user for personalization
    const auth = locals.auth?.();
    const userId = auth?.userId || null;

    // Get affiliate tag from environment
    const affiliateTag = import.meta.env.AMAZON_PA_API_PARTNER_TAG || 'bestdeal0ee40-20';
    const marketplace = lang === 'es' ? 'es' : 'com';

    let feedProducts: FeedProduct[] = [];
    let source = 'database';
    let isPersonalized = false;

    // Load user preferences and excluded ASINs for personalization
    let userPrefs: Awaited<ReturnType<typeof getUserPreferences>> = null;
    let userExcludedAsins = new Set<string>();

    if (userId) {
      // Load preferences and excluded ASINs in parallel
      const [prefs, excluded] = await Promise.all([
        getUserPreferences(userId),
        getExcludedAsins(userId)
      ]);
      userPrefs = prefs;
      userExcludedAsins = excluded;
      console.log(`[Feed API] User ${userId.slice(-6)}: ${userExcludedAsins.size} ASINs excluded (likes/dislikes)`);
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
      
      // Mix personalized keywords into the rotation (every 3rd page if logged in)
      if (userId && recommendedKeywords.length > 0 && page % 3 === 0) {
        const recIndex = Math.floor(page / 3) % recommendedKeywords.length;
        keywords = recommendedKeywords[recIndex];
        isPersonalized = true;
        console.log(`[Feed API] Using personalized keyword: "${keywords}"`);
      } else if (category !== 'all' && categoryKeywords[category]) {
        const catKeywords = categoryKeywords[category];
        keywords = catKeywords[(page - 1) % catKeywords.length];
      } else {
        // Rotate through trending keywords based on page
        keywords = trendingKeywords[(page - 1) % trendingKeywords.length];
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
        
        const transformedProducts = await Promise.all(
          apiProducts
            .filter(product => 
              product.imageUrl && 
              product.price && 
              product.price > 0 &&
              !excludeAsins.includes(product.asin) &&
              !curatedAsins.has(product.asin)
            )
            .slice(0, limit - feedProducts.length)
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
              };
            })
        );

        // Combine curated + transformed products
        feedProducts = [...feedProducts, ...transformedProducts]
          // Sort by deal score - best deals first
          .sort((a, b) => (b.dealScore || 0) - (a.dealScore || 0));
        
        source = 'rapidapi';
      }
    }

    // Fallback to database products if RapidAPI failed or returned no results
    if (feedProducts.length === 0) {
      feedProducts = await getDbProducts(lang, page, limit);
      source = 'database';
    }

    // Enrich products with YouTube videos (if configured)
    let enrichedProducts = feedProducts;
    let videoStats = { configured: false, quotaRemaining: 0, videosFound: 0 };

    console.log(`[Feed API] YouTube configured: ${isYouTubeConfigured()}`);

    if (isYouTubeConfigured() && feedProducts.length > 0) {
      videoStats.configured = true;
      const quotaStatus = await getQuotaStatus();
      videoStats.quotaRemaining = quotaStatus.remaining;
      console.log(`[Feed API] YouTube quota: ${quotaStatus.used}/${quotaStatus.limit} (remaining: ${quotaStatus.remaining})`);

      // Only fetch videos if we have quota remaining
      if (quotaStatus.remaining > 0) {
        const productsForVideo = feedProducts.map(p => ({ 
          asin: p.asin, 
          title: p.title 
        }));
        
        console.log(`[Feed API] Fetching videos for ${productsForVideo.length} products...`);
        const videoMap = await getProductVideos(
          productsForVideo, 
          lang as 'es' | 'en', 
          3 // Concurrency limit
        );

        // Count videos found
        let videosFound = 0;
        videoMap.forEach(v => { if (v) videosFound++; });
        videoStats.videosFound = videosFound;
        console.log(`[Feed API] Videos found: ${videosFound}/${productsForVideo.length}`);

        // Add video info to each product
        enrichedProducts = feedProducts.map(product => {
          const video = videoMap.get(product.asin);
          return {
            ...product,
            youtubeVideo: video ? {
              videoId: video.videoId,
              title: video.title,
              channelTitle: video.channelTitle,
              thumbnail: video.thumbnail,
              embedUrl: getVideoEmbedUrl(video.videoId, { autoplay: true, mute: true }),
              isShort: video.isShort,
            } : null,
          };
        });
      } else {
        console.log(`[Feed API] Skipping video fetch - no quota remaining`);
      }
    }

    // Check for lowest prices in 30 days (adds "lowest_price" badge)
    const productsWithPrices = enrichedProducts
      .filter(p => p.price)
      .map(p => ({ asin: p.asin, currentPrice: p.price }));

    const lowestPriceMap = productsWithPrices.length > 0
      ? await checkLowestPrices(productsWithPrices, marketplace)
      : new Map();

    // Add conversion badges to each product (including lowest price info)
    enrichedProducts = enrichedProducts.map(product => {
      const priceStats = lowestPriceMap.get(product.asin);
      return {
        ...product,
        badges: addConversionBadges(product, priceStats),
        // Add price context for UI
        priceContext: priceStats ? {
          isLowestIn30Days: priceStats.isLowest,
          percentBelowAvg: priceStats.percentBelowAvg,
        } : undefined,
      };
    });

    // Apply intelligent sequencing for better retention (skip on first page with curated)
    if (page > 1 || !feedProducts.some(p => p.isCurated)) {
      enrichedProducts = sequenceProductsForRetention(enrichedProducts);
    }

    console.log(`[Feed API] Returning ${enrichedProducts.length} products (page ${page})`);

    return new Response(
      JSON.stringify({
        success: true,
        products: enrichedProducts,
        page,
        hasMore: feedProducts.length >= limit,
        source,
        isPersonalized,
        videoStats,
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
    
    const fallbackProducts = await getDbProducts(lang, page, limit);
    
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
