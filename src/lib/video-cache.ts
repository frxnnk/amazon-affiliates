/**
 * Video Cache Service
 * 
 * Manages YouTube video lookups with intelligent caching to minimize API quota usage.
 * 
 * Cache strategy:
 * - Videos found: cached for 30 days
 * - Videos not found: cached for 7 days (to retry later)
 * - Quota tracking: stops API calls when daily limit approached
 */

import { db, VideoCache, DealAgentConfig, eq, lte, sql } from 'astro:db';
import { searchProductVideo, type YouTubeVideo, isYouTubeConfigured } from './youtube-api';

// Cache duration in days
const CACHE_DAYS_FOUND = 30;
const CACHE_DAYS_NOT_FOUND = 7;

// Daily quota management - persistent in DB
// YouTube free tier: 10,000 units/day, search = 100 units
const DAILY_QUOTA_LIMIT = 9500; // Leave buffer for safety
const QUOTA_KEY = 'youtube_quota';

// In-memory cache of DB quota (to reduce DB reads)
let quotaCache: { used: number; date: string } | null = null;

interface QuotaData {
  used: number;
  date: string; // ISO date string YYYY-MM-DD
}

/**
 * Get today's date as ISO string (YYYY-MM-DD)
 */
function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Load quota from database
 */
async function loadQuotaFromDB(): Promise<QuotaData> {
  const today = getTodayISO();

  // Check memory cache first
  if (quotaCache && quotaCache.date === today) {
    return quotaCache;
  }

  try {
    const config = await db
      .select()
      .from(DealAgentConfig)
      .where(eq(DealAgentConfig.key, QUOTA_KEY))
      .get();

    if (config) {
      const data = config.value as QuotaData;
      // Reset if it's a new day
      if (data.date !== today) {
        console.log(`[VideoCache] New day - resetting quota (was ${data.used})`);
        quotaCache = { used: 0, date: today };
        await saveQuotaToDB(quotaCache);
        return quotaCache;
      }
      quotaCache = data;
      return data;
    }

    // First time - initialize
    quotaCache = { used: 0, date: today };
    await db.insert(DealAgentConfig).values({
      key: QUOTA_KEY,
      value: quotaCache,
      updatedAt: new Date(),
    });
    return quotaCache;
  } catch (error) {
    console.error('[VideoCache] Error loading quota:', error);
    // Fallback to in-memory
    return quotaCache || { used: 0, date: today };
  }
}

/**
 * Save quota to database
 */
async function saveQuotaToDB(data: QuotaData): Promise<void> {
  try {
    await db
      .update(DealAgentConfig)
      .set({ value: data, updatedAt: new Date() })
      .where(eq(DealAgentConfig.key, QUOTA_KEY));
  } catch (error) {
    console.error('[VideoCache] Error saving quota:', error);
  }
}

/**
 * Check if we have enough quota for an operation
 */
async function canUseQuota(units: number): Promise<boolean> {
  const quota = await loadQuotaFromDB();
  return quota.used + units <= DAILY_QUOTA_LIMIT;
}

/**
 * Record quota usage (updates both memory and DB)
 */
async function useQuota(units: number): Promise<void> {
  const today = getTodayISO();
  const quota = await loadQuotaFromDB();

  quota.used += units;
  quota.date = today;
  quotaCache = quota;

  console.log(`[VideoCache] Quota: ${quota.used}/${DAILY_QUOTA_LIMIT} (${Math.round(quota.used / DAILY_QUOTA_LIMIT * 100)}%)`);

  // Save to DB (fire and forget for performance)
  saveQuotaToDB(quota);
}

/**
 * Get current quota status
 */
export async function getQuotaStatus(): Promise<{
  used: number;
  remaining: number;
  limit: number;
  percentUsed: number;
  date: string;
}> {
  const quota = await loadQuotaFromDB();
  return {
    used: quota.used,
    remaining: DAILY_QUOTA_LIMIT - quota.used,
    limit: DAILY_QUOTA_LIMIT,
    percentUsed: Math.round((quota.used / DAILY_QUOTA_LIMIT) * 100),
    date: quota.date,
  };
}

/**
 * Generate a cache key from product info
 * Normalizes the title for better cache hit rates
 */
function generateCacheKey(asin: string, title: string): string {
  // Normalize title: lowercase, remove special chars, take first 5 words
  const normalized = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .join('-');
  
  return `${asin}-${normalized}`;
}

/**
 * Get video for a product, using cache when available
 * 
 * @param asin - Product ASIN
 * @param title - Product title for search
 * @param lang - Language preference
 * @returns YouTube video info or null if not found/error
 */
export async function getProductVideo(
  asin: string,
  title: string,
  lang: 'es' | 'en' = 'es'
): Promise<YouTubeVideo | null> {
  // Check if YouTube API is configured
  if (!isYouTubeConfigured()) {
    return null;
  }

  const cacheKey = generateCacheKey(asin, title);
  const now = new Date();

  try {
    // Check cache first
    const cached = await db
      .select()
      .from(VideoCache)
      .where(eq(VideoCache.searchKey, cacheKey))
      .get();

    if (cached && cached.expiresAt > now) {
      // Cache hit - increment hit count
      await db
        .update(VideoCache)
        .set({ hitCount: (cached.hitCount || 0) + 1 })
        .where(eq(VideoCache.id, cached.id));

      if (!cached.videoId) {
        // Cached "not found" result
        return null;
      }

      // Return cached video
      return {
        videoId: cached.videoId,
        title: cached.videoTitle || '',
        channelTitle: cached.channelTitle || '',
        thumbnail: cached.thumbnail || '',
        thumbnailHigh: cached.thumbnailHigh || undefined,
        publishedAt: cached.fetchedAt.toISOString(),
        isShort: cached.isShort,
      };
    }

    // Cache miss or expired - check quota before API call
    if (!(await canUseQuota(100))) {
      console.warn('[VideoCache] Daily quota exhausted, skipping API call');
      return null;
    }

    // Search YouTube API
    const result = await searchProductVideo(title, lang);
    await useQuota(result.quotaUsed);

    if (!result.success) {
      console.error('[VideoCache] YouTube API error:', result.error);
      return null;
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() + (result.video ? CACHE_DAYS_FOUND : CACHE_DAYS_NOT_FOUND)
    );

    // Upsert cache entry
    if (cached) {
      // Update existing entry
      await db
        .update(VideoCache)
        .set({
          videoId: result.video?.videoId || null,
          videoTitle: result.video?.title || null,
          channelTitle: result.video?.channelTitle || null,
          thumbnail: result.video?.thumbnail || null,
          thumbnailHigh: result.video?.thumbnailHigh || null,
          isShort: result.video?.isShort ?? true,
          fetchedAt: now,
          expiresAt,
          hitCount: 0,
        })
        .where(eq(VideoCache.id, cached.id));
    } else {
      // Insert new entry
      await db.insert(VideoCache).values({
        searchKey: cacheKey,
        asin,
        productTitle: title,
        videoId: result.video?.videoId || null,
        videoTitle: result.video?.title || null,
        channelTitle: result.video?.channelTitle || null,
        thumbnail: result.video?.thumbnail || null,
        thumbnailHigh: result.video?.thumbnailHigh || null,
        isShort: result.video?.isShort ?? true,
        fetchedAt: now,
        expiresAt,
        hitCount: 0,
      });
    }

    return result.video || null;
  } catch (error) {
    console.error('[VideoCache] Database error:', error);
    return null;
  }
}

/**
 * Batch get videos for multiple products
 * Processes with concurrency limit to avoid overwhelming the API
 * 
 * @param products - Array of products with asin and title
 * @param lang - Language preference
 * @param concurrency - Max concurrent API calls (default 3)
 * @returns Map of ASIN to video (or null)
 */
export async function getProductVideos(
  products: Array<{ asin: string; title: string }>,
  lang: 'es' | 'en' = 'es',
  concurrency = 3
): Promise<Map<string, YouTubeVideo | null>> {
  const results = new Map<string, YouTubeVideo | null>();

  if (!isYouTubeConfigured()) {
    // Return empty map if not configured
    for (const p of products) {
      results.set(p.asin, null);
    }
    return results;
  }

  // Process in batches to respect concurrency limit
  for (let i = 0; i < products.length; i += concurrency) {
    const batch = products.slice(i, i + concurrency);
    
    const batchResults = await Promise.all(
      batch.map(async (p) => {
        const video = await getProductVideo(p.asin, p.title, lang);
        return { asin: p.asin, video };
      })
    );

    for (const { asin, video } of batchResults) {
      results.set(asin, video);
    }

    // Small delay between batches to be nice to the API
    if (i + concurrency < products.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * Get comprehensive cache and quota statistics
 */
export async function getCacheStats(): Promise<{
  cache: {
    totalEntries: number;
    withVideo: number;
    withoutVideo: number;
    expired: number;
    totalHits: number;
    hitRate: number;
  };
  quota: {
    used: number;
    remaining: number;
    limit: number;
    percentUsed: number;
    date: string;
  };
}> {
  const now = new Date();
  const all = await db.select().from(VideoCache).all();
  const quotaStatus = await getQuotaStatus();

  const totalEntries = all.length;
  const withVideo = all.filter((e) => e.videoId).length;
  const totalHits = all.reduce((sum, e) => sum + (e.hitCount || 0), 0);

  return {
    cache: {
      totalEntries,
      withVideo,
      withoutVideo: all.filter((e) => !e.videoId).length,
      expired: all.filter((e) => e.expiresAt <= now).length,
      totalHits,
      hitRate: totalEntries > 0 ? Math.round((withVideo / totalEntries) * 100) : 0,
    },
    quota: quotaStatus,
  };
}

/**
 * Reset daily quota (admin function)
 * Use when quota needs manual reset or for testing
 */
export async function resetQuota(): Promise<void> {
  const today = getTodayISO();
  quotaCache = { used: 0, date: today };
  await saveQuotaToDB(quotaCache);
  console.log('[VideoCache] Quota manually reset');
}

/**
 * Clean up expired cache entries
 * Should be run periodically (e.g., daily cron)
 */
export async function cleanupExpiredCache(): Promise<number> {
  const now = new Date();

  // Count expired entries first
  const expired = await db
    .select({ id: VideoCache.id })
    .from(VideoCache)
    .where(lte(VideoCache.expiresAt, now))
    .all();

  if (expired.length === 0) {
    return 0;
  }

  // Delete all expired entries in one query
  await db
    .delete(VideoCache)
    .where(lte(VideoCache.expiresAt, now));

  console.log(`[VideoCache] Cleaned up ${expired.length} expired entries`);
  return expired.length;
}
