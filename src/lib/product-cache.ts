/**
 * Product Search Cache Service
 * 
 * Caches RapidAPI product searches to minimize API quota usage.
 * 
 * Cache strategy:
 * - Search results: cached for 4 hours (products change frequently)
 * - Individual products: cached for 24 hours
 * - Deals: cached for 2 hours (time-sensitive)
 * 
 * This dramatically reduces API calls since the same keywords
 * are searched multiple times by different users.
 */

import { db, ProductSearchCache, Products, eq, and, inArray, desc } from 'astro:db';
import {
  searchProductsRainforest,
  getProductRainforest,
  searchDealsRainforest,
  type RainforestProductData,
  type RainforestSearchResult,
  type RainforestResult,
  isRainforestConfigured
} from './rainforest-api';

// Affiliate tag for building URLs
const AFFILIATE_TAG = import.meta.env.AMAZON_PA_API_PARTNER_TAG || 'bestdeal0ee40-20';

// Cache duration in hours
const CACHE_HOURS_SEARCH = 4;
const CACHE_HOURS_PRODUCT = 24;
const CACHE_HOURS_DEALS = 2;

// Track API usage (in-memory, resets on deploy)
let monthlyApiCalls = 0;
let lastResetMonth = new Date().getMonth();
const MONTHLY_LIMIT = 450; // Leave buffer from 500

// Track quota exceeded state to avoid repeated failed calls
let quotaExceededUntil: Date | null = null;
const QUOTA_PAUSE_HOURS = 1; // Pause API calls for 1 hour after 429

/**
 * Persist products from API to Products table for permanent storage.
 * This builds a catalog that can serve content when API quota is exhausted.
 *
 * - Products are saved with status 'imported'
 * - Only updates if product data is newer (based on price changes)
 * - Skips products that already exist with same price
 */
export async function persistProductsToDb(
  products: RainforestProductData[],
  marketplace: string = 'com'
): Promise<{ saved: number; skipped: number; updated: number }> {
  let saved = 0;
  let skipped = 0;
  let updated = 0;

  const lang = marketplace === 'es' ? 'es' : 'en';
  const amazonDomain = marketplace === 'es' ? 'amazon.es' : 'amazon.com';

  for (const product of products) {
    // Skip products without essential data
    if (!product.asin || !product.title || !product.price || !product.imageUrl) {
      skipped++;
      continue;
    }

    try {
      // Check if product already exists
      const existing = await db
        .select()
        .from(Products)
        .where(and(
          eq(Products.asin, product.asin),
          eq(Products.lang, lang)
        ))
        .get();

      const productId = `api-${product.asin}-${marketplace}`;
      const affiliateUrl = `https://www.${amazonDomain}/dp/${product.asin}?tag=${AFFILIATE_TAG}`;

      const productData = {
        productId,
        asin: product.asin,
        lang,
        title: product.title,
        brand: product.brand || 'Amazon',
        description: product.description || product.title,
        shortDescription: product.features?.[0] || undefined,
        category: product.categories?.[0] || 'electronics',
        price: product.price,
        originalPrice: product.originalPrice || undefined,
        currency: product.currency || (marketplace === 'es' ? 'EUR' : 'USD'),
        affiliateUrl,
        rating: product.rating || undefined,
        totalReviews: product.totalReviews || undefined,
        featuredImageUrl: product.imageUrl,
        featuredImageAlt: product.title,
        gallery: product.images?.length > 0
          ? product.images.map(url => ({ url, alt: product.title }))
          : undefined,
        pros: product.features?.slice(0, 5) || [],
        cons: [],
        status: 'imported',
        updatedAt: new Date(),
      };

      if (existing) {
        // Only update if price changed (fresher data)
        if (existing.price !== product.price) {
          await db
            .update(Products)
            .set(productData)
            .where(eq(Products.id, existing.id));
          updated++;
        } else {
          skipped++;
        }
      } else {
        // Insert new product
        await db.insert(Products).values({
          ...productData,
          createdAt: new Date(),
        });
        saved++;
      }
    } catch (error) {
      console.error(`[ProductCache] Error persisting ${product.asin}:`, error);
      skipped++;
    }
  }

  if (saved > 0 || updated > 0) {
    console.log(`[ProductCache] Persisted products: ${saved} new, ${updated} updated, ${skipped} skipped`);
  }

  return { saved, skipped, updated };
}

/**
 * Get products from permanent storage by ASINs
 * Used as fallback when API quota is exhausted
 */
export async function getStoredProductsByAsins(
  asins: string[],
  lang: string = 'en'
): Promise<RainforestProductData[]> {
  if (asins.length === 0) return [];

  try {
    const products = await db
      .select()
      .from(Products)
      .where(and(
        inArray(Products.asin, asins),
        eq(Products.lang, lang)
      ))
      .all();

    // Convert to RainforestProductData format
    return products.map(p => ({
      asin: p.asin,
      title: p.title,
      brand: p.brand,
      price: p.price,
      originalPrice: p.originalPrice || null,
      currency: p.currency,
      rating: p.rating || null,
      totalReviews: p.totalReviews || null,
      imageUrl: p.featuredImageUrl,
      images: (p.gallery as { url: string }[] | null)?.map(g => g.url) || [],
      features: (p.pros as string[]) || [],
      description: p.description,
      url: p.affiliateUrl,
      availability: 'In Stock',
      categories: p.category ? [p.category] : [],
      isPrime: false,
      dealType: null,
    }));
  } catch (error) {
    console.error('[ProductCache] Error getting stored products:', error);
    return [];
  }
}

/**
 * Get random products from permanent storage
 * Used as fallback when API quota is exhausted and cache is empty
 */
export async function getRandomStoredProducts(
  lang: string = 'en',
  limit: number = 10,
  excludeAsins: string[] = []
): Promise<RainforestProductData[]> {
  try {
    // Get all products for language (we'll randomize in JS since SQLite random() varies)
    let allProducts = await db
      .select()
      .from(Products)
      .where(eq(Products.lang, lang))
      .orderBy(desc(Products.updatedAt))
      .limit(200) // Get more than needed for filtering
      .all();

    // Filter out excluded ASINs
    if (excludeAsins.length > 0) {
      const excludeSet = new Set(excludeAsins);
      allProducts = allProducts.filter(p => !excludeSet.has(p.asin));
    }

    // Shuffle and take limit
    const shuffled = allProducts.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, limit);

    // Convert to RainforestProductData format
    return selected.map(p => ({
      asin: p.asin,
      title: p.title,
      brand: p.brand,
      price: p.price,
      originalPrice: p.originalPrice || null,
      currency: p.currency,
      rating: p.rating || null,
      totalReviews: p.totalReviews || null,
      imageUrl: p.featuredImageUrl,
      images: (p.gallery as { url: string }[] | null)?.map(g => g.url) || [],
      features: (p.pros as string[]) || [],
      description: p.description,
      url: p.affiliateUrl,
      availability: 'In Stock',
      categories: p.category ? [p.category] : [],
      isPrime: false,
      dealType: null,
    }));
  } catch (error) {
    console.error('[ProductCache] Error getting random products:', error);
    return [];
  }
}

/**
 * Get count of stored products
 */
export async function getStoredProductCount(lang?: string): Promise<number> {
  try {
    const query = lang
      ? db.select().from(Products).where(eq(Products.lang, lang))
      : db.select().from(Products);

    const products = await query.all();
    return products.length;
  } catch (error) {
    console.error('[ProductCache] Error counting products:', error);
    return 0;
  }
}

/**
 * Check and reset monthly counter
 */
function checkMonthlyReset(): void {
  const currentMonth = new Date().getMonth();
  if (currentMonth !== lastResetMonth) {
    console.log(`[ProductCache] Resetting monthly API calls (was ${monthlyApiCalls})`);
    monthlyApiCalls = 0;
    lastResetMonth = currentMonth;
  }
}

/**
 * Check if API is in quota exceeded state
 */
function isQuotaPaused(): boolean {
  if (!quotaExceededUntil) return false;
  if (new Date() >= quotaExceededUntil) {
    quotaExceededUntil = null;
    console.log('[ProductCache] Quota pause expired, resuming API calls');
    return false;
  }
  return true;
}

/**
 * Mark API as quota exceeded
 */
function markQuotaExceeded(): void {
  quotaExceededUntil = new Date();
  quotaExceededUntil.setHours(quotaExceededUntil.getHours() + QUOTA_PAUSE_HOURS);
  console.log(`[ProductCache] API quota exceeded, pausing until ${quotaExceededUntil.toLocaleTimeString()}`);
}

/**
 * Check if we can make more API calls this month
 */
export function canMakeApiCall(): boolean {
  checkMonthlyReset();
  if (isQuotaPaused()) return false;
  return monthlyApiCalls < MONTHLY_LIMIT;
}

/**
 * Get current API usage stats
 */
export function getApiUsageStats(): {
  used: number;
  remaining: number;
  limit: number;
  percentUsed: number;
} {
  checkMonthlyReset();
  return {
    used: monthlyApiCalls,
    remaining: MONTHLY_LIMIT - monthlyApiCalls,
    limit: MONTHLY_LIMIT,
    percentUsed: Math.round((monthlyApiCalls / MONTHLY_LIMIT) * 100),
  };
}

/**
 * Record an API call
 */
function recordApiCall(): void {
  monthlyApiCalls++;
  console.log(`[ProductCache] API calls this month: ${monthlyApiCalls}/${MONTHLY_LIMIT}`);
}

/**
 * Generate cache key for search
 */
function generateSearchCacheKey(
  keywords: string, 
  marketplace: string, 
  page: number
): string {
  const normalized = keywords
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50);
  return `search:${marketplace}:${normalized}:p${page}`;
}

/**
 * Generate cache key for product
 */
function generateProductCacheKey(asin: string, marketplace: string): string {
  return `product:${marketplace}:${asin}`;
}

/**
 * Generate cache key for deals
 */
function generateDealsCacheKey(category: string | undefined, marketplace: string): string {
  return `deals:${marketplace}:${category || 'all'}`;
}

/**
 * Cached product search - checks cache first, falls back to API
 */
export async function cachedSearchProducts(
  keywords: string,
  marketplace: string = 'com',
  page: number = 1
): Promise<RainforestSearchResult> {
  if (!isRainforestConfigured()) {
    return {
      success: false,
      error: { code: 'NOT_CONFIGURED', message: 'RapidAPI not configured' },
    };
  }

  const cacheKey = generateSearchCacheKey(keywords, marketplace, page);
  const now = new Date();

  try {
    // Check cache first
    const cached = await db
      .select()
      .from(ProductSearchCache)
      .where(eq(ProductSearchCache.cacheKey, cacheKey))
      .get();

    if (cached && cached.expiresAt > now) {
      // Cache hit - increment hit count
      await db
        .update(ProductSearchCache)
        .set({ hitCount: (cached.hitCount || 0) + 1 })
        .where(eq(ProductSearchCache.id, cached.id));

      console.log(`[ProductCache] Cache HIT for "${keywords}" (${cached.hitCount + 1} hits)`);

      const products = cached.products as RainforestProductData[];
      return {
        success: true,
        data: products,
        totalResults: cached.totalResults,
        currentPage: page,
      };
    }

    // Cache miss - check if we can make API call
    if (!canMakeApiCall()) {
      console.warn('[ProductCache] Monthly API limit reached, trying stored products fallback...');

      // Fallback: Try to get products from permanent storage
      const lang = marketplace === 'es' ? 'es' : 'en';
      const storedProducts = await getRandomStoredProducts(lang, 10);

      if (storedProducts.length > 0) {
        console.log(`[ProductCache] Fallback: returning ${storedProducts.length} stored products`);
        return {
          success: true,
          data: storedProducts,
          totalResults: storedProducts.length,
          currentPage: page,
        };
      }

      return {
        success: false,
        error: { code: 'QUOTA_EXCEEDED', message: 'Monthly API quota exhausted and no stored products' },
      };
    }

    // Make API call
    console.log(`[ProductCache] Cache MISS for "${keywords}", calling API...`);
    const result = await searchProductsRainforest({
      keywords,
      amazonDomain: marketplace,
      page,
    });

    recordApiCall();

    if (!result.success) {
      // Check if it's a quota exceeded error (429)
      const error = (result as any).error;
      if (error?.message?.includes('429') || error?.message?.includes('exceeded')) {
        markQuotaExceeded();
      }
      return result;
    }

    // Cache the results
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CACHE_HOURS_SEARCH);

    if (cached) {
      // Update existing cache entry
      await db
        .update(ProductSearchCache)
        .set({
          products: result.data,
          totalResults: result.totalResults,
          fetchedAt: now,
          expiresAt,
          hitCount: 0,
        })
        .where(eq(ProductSearchCache.id, cached.id));
    } else {
      // Insert new cache entry
      await db.insert(ProductSearchCache).values({
        cacheKey,
        searchType: 'search',
        marketplace,
        products: result.data,
        totalResults: result.totalResults,
        fetchedAt: now,
        expiresAt,
        hitCount: 0,
      });
    }

    console.log(`[ProductCache] Cached ${result.data.length} products for "${keywords}"`);

    // Persist products to permanent storage (non-blocking)
    persistProductsToDb(result.data, marketplace).catch(err => {
      console.error('[ProductCache] Error persisting products:', err);
    });

    return result;
  } catch (error) {
    console.error('[ProductCache] Error:', error);
    // Try API directly if cache fails
    if (canMakeApiCall()) {
      recordApiCall();
      return searchProductsRainforest({
        keywords,
        amazonDomain: marketplace,
        page,
      });
    }
    return {
      success: false,
      error: { code: 'CACHE_ERROR', message: error instanceof Error ? error.message : 'Cache error' },
    };
  }
}

/**
 * Cached product details
 */
export async function cachedGetProduct(
  asin: string,
  marketplace: string = 'com'
): Promise<RainforestResult<RainforestProductData>> {
  if (!isRainforestConfigured()) {
    return {
      success: false,
      error: { code: 'NOT_CONFIGURED', message: 'RapidAPI not configured' },
    };
  }

  const cacheKey = generateProductCacheKey(asin, marketplace);
  const now = new Date();

  try {
    // Check cache first
    const cached = await db
      .select()
      .from(ProductSearchCache)
      .where(eq(ProductSearchCache.cacheKey, cacheKey))
      .get();

    if (cached && cached.expiresAt > now) {
      // Cache hit
      await db
        .update(ProductSearchCache)
        .set({ hitCount: (cached.hitCount || 0) + 1 })
        .where(eq(ProductSearchCache.id, cached.id));

      console.log(`[ProductCache] Product cache HIT for ${asin}`);

      const products = cached.products as RainforestProductData[];
      if (products.length > 0) {
        return { success: true, data: products[0] };
      }
    }

    // Cache miss - check quota
    if (!canMakeApiCall()) {
      // Fallback: Try to get product from permanent storage
      const lang = marketplace === 'es' ? 'es' : 'en';
      const storedProducts = await getStoredProductsByAsins([asin], lang);

      if (storedProducts.length > 0) {
        console.log(`[ProductCache] Fallback: returning stored product ${asin}`);
        return { success: true, data: storedProducts[0] };
      }

      return {
        success: false,
        error: { code: 'QUOTA_EXCEEDED', message: 'Monthly API quota exhausted' },
      };
    }

    // Make API call
    console.log(`[ProductCache] Product cache MISS for ${asin}, calling API...`);
    const result = await getProductRainforest(asin, marketplace);
    recordApiCall();

    if (!result.success) {
      return result;
    }

    // Cache the result
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CACHE_HOURS_PRODUCT);

    if (cached) {
      await db
        .update(ProductSearchCache)
        .set({
          products: [result.data],
          totalResults: 1,
          fetchedAt: now,
          expiresAt,
          hitCount: 0,
        })
        .where(eq(ProductSearchCache.id, cached.id));
    } else {
      await db.insert(ProductSearchCache).values({
        cacheKey,
        searchType: 'product',
        marketplace,
        products: [result.data],
        totalResults: 1,
        fetchedAt: now,
        expiresAt,
        hitCount: 0,
      });
    }

    // Persist product to permanent storage (non-blocking)
    persistProductsToDb([result.data], marketplace).catch(err => {
      console.error('[ProductCache] Error persisting product:', err);
    });

    return result;
  } catch (error) {
    console.error('[ProductCache] Product cache error:', error);
    if (canMakeApiCall()) {
      recordApiCall();
      return getProductRainforest(asin, marketplace);
    }
    return {
      success: false,
      error: { code: 'CACHE_ERROR', message: error instanceof Error ? error.message : 'Cache error' },
    };
  }
}

/**
 * Cached deals search
 */
export async function cachedSearchDeals(
  category?: string,
  marketplace: string = 'com'
): Promise<RainforestSearchResult> {
  if (!isRainforestConfigured()) {
    return {
      success: false,
      error: { code: 'NOT_CONFIGURED', message: 'RapidAPI not configured' },
    };
  }

  const cacheKey = generateDealsCacheKey(category, marketplace);
  const now = new Date();

  try {
    // Check cache first
    const cached = await db
      .select()
      .from(ProductSearchCache)
      .where(eq(ProductSearchCache.cacheKey, cacheKey))
      .get();

    if (cached && cached.expiresAt > now) {
      // Cache hit
      await db
        .update(ProductSearchCache)
        .set({ hitCount: (cached.hitCount || 0) + 1 })
        .where(eq(ProductSearchCache.id, cached.id));

      console.log(`[ProductCache] Deals cache HIT for ${category || 'all'}`);

      const products = cached.products as RainforestProductData[];
      return {
        success: true,
        data: products,
        totalResults: cached.totalResults,
        currentPage: 1,
      };
    }

    // Cache miss - check quota
    if (!canMakeApiCall()) {
      return {
        success: false,
        error: { code: 'QUOTA_EXCEEDED', message: 'Monthly API quota exhausted' },
      };
    }

    // Make API call
    console.log(`[ProductCache] Deals cache MISS for ${category || 'all'}, calling API...`);
    const result = await searchDealsRainforest(category, marketplace);
    recordApiCall();

    if (!result.success) {
      return result;
    }

    // Cache the result
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CACHE_HOURS_DEALS);

    if (cached) {
      await db
        .update(ProductSearchCache)
        .set({
          products: result.data,
          totalResults: result.totalResults,
          fetchedAt: now,
          expiresAt,
          hitCount: 0,
        })
        .where(eq(ProductSearchCache.id, cached.id));
    } else {
      await db.insert(ProductSearchCache).values({
        cacheKey,
        searchType: 'deals',
        marketplace,
        products: result.data,
        totalResults: result.totalResults,
        fetchedAt: now,
        expiresAt,
        hitCount: 0,
      });
    }

    return result;
  } catch (error) {
    console.error('[ProductCache] Deals cache error:', error);
    if (canMakeApiCall()) {
      recordApiCall();
      return searchDealsRainforest(category, marketplace);
    }
    return {
      success: false,
      error: { code: 'CACHE_ERROR', message: error instanceof Error ? error.message : 'Cache error' },
    };
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  searchEntries: number;
  productEntries: number;
  dealEntries: number;
  totalHits: number;
  expiredEntries: number;
  apiUsage: ReturnType<typeof getApiUsageStats>;
}> {
  const now = new Date();
  const all = await db.select().from(ProductSearchCache).all();

  return {
    totalEntries: all.length,
    searchEntries: all.filter(e => e.searchType === 'search').length,
    productEntries: all.filter(e => e.searchType === 'product').length,
    dealEntries: all.filter(e => e.searchType === 'deals').length,
    totalHits: all.reduce((sum, e) => sum + (e.hitCount || 0), 0),
    expiredEntries: all.filter(e => e.expiresAt <= now).length,
    apiUsage: getApiUsageStats(),
  };
}

/**
 * Clean up expired cache entries
 */
export async function cleanupExpiredCache(): Promise<number> {
  const now = new Date();
  const all = await db.select().from(ProductSearchCache).all();
  
  const expiredIds = all
    .filter(e => e.expiresAt <= now)
    .map(e => e.id);

  if (expiredIds.length === 0) {
    return 0;
  }

  for (const id of expiredIds) {
    await db.delete(ProductSearchCache).where(eq(ProductSearchCache.id, id));
  }

  console.log(`[ProductCache] Cleaned up ${expiredIds.length} expired entries`);
  return expiredIds.length;
}
