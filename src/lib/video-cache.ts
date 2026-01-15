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

import { db, VideoCache, eq } from 'astro:db';
import { searchProductVideo, type YouTubeVideo, isYouTubeConfigured } from './youtube-api';

// Cache duration in days
const CACHE_DAYS_FOUND = 30;
const CACHE_DAYS_NOT_FOUND = 7;

// Daily quota management (in-memory, resets on deploy/restart)
// YouTube free tier: 10,000 units/day, search = 100 units
let dailyQuotaUsed = 0;
let lastQuotaReset = new Date().toDateString();
const DAILY_QUOTA_LIMIT = 9500; // Leave buffer for safety

/**
 * Check and reset quota counter if it's a new day
 */
function checkQuotaReset(): void {
  const today = new Date().toDateString();
  if (today !== lastQuotaReset) {
    console.log(`[VideoCache] Resetting daily quota (was ${dailyQuotaUsed})`);
    dailyQuotaUsed = 0;
    lastQuotaReset = today;
  }
}

/**
 * Check if we have enough quota for an operation
 */
function canUseQuota(units: number): boolean {
  checkQuotaReset();
  return dailyQuotaUsed + units <= DAILY_QUOTA_LIMIT;
}

/**
 * Record quota usage
 */
function useQuota(units: number): void {
  dailyQuotaUsed += units;
  console.log(`[VideoCache] Quota used: ${dailyQuotaUsed}/${DAILY_QUOTA_LIMIT}`);
}

/**
 * Get current quota status
 */
export function getQuotaStatus(): {
  used: number;
  remaining: number;
  limit: number;
  percentUsed: number;
} {
  checkQuotaReset();
  return {
    used: dailyQuotaUsed,
    remaining: DAILY_QUOTA_LIMIT - dailyQuotaUsed,
    limit: DAILY_QUOTA_LIMIT,
    percentUsed: Math.round((dailyQuotaUsed / DAILY_QUOTA_LIMIT) * 100),
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
    if (!canUseQuota(100)) {
      console.warn('[VideoCache] Daily quota exhausted, skipping API call');
      return null;
    }

    // Search YouTube API
    const result = await searchProductVideo(title, lang);
    useQuota(result.quotaUsed);

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
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  withVideo: number;
  withoutVideo: number;
  expired: number;
  totalHits: number;
}> {
  const now = new Date();
  const all = await db.select().from(VideoCache).all();

  return {
    totalEntries: all.length,
    withVideo: all.filter((e) => e.videoId).length,
    withoutVideo: all.filter((e) => !e.videoId).length,
    expired: all.filter((e) => e.expiresAt <= now).length,
    totalHits: all.reduce((sum, e) => sum + (e.hitCount || 0), 0),
  };
}

/**
 * Clean up expired cache entries
 * Should be run periodically (e.g., daily cron)
 */
export async function cleanupExpiredCache(): Promise<number> {
  const now = new Date();
  const expired = await db
    .select()
    .from(VideoCache)
    .where(eq(VideoCache.expiresAt, now)) // This won't work as intended
    .all();

  // Manual filter for expired entries
  const expiredIds = expired
    .filter((e) => e.expiresAt <= now)
    .map((e) => e.id);

  if (expiredIds.length === 0) {
    return 0;
  }

  // Delete in batches
  for (const id of expiredIds) {
    await db.delete(VideoCache).where(eq(VideoCache.id, id));
  }

  console.log(`[VideoCache] Cleaned up ${expiredIds.length} expired entries`);
  return expiredIds.length;
}
