/**
 * Video Cache Service
 *
 * Manages video lookups with intelligent caching.
 *
 * Video Source Priority:
 * 1. Piped API (free, no quota limits) - PRIMARY
 * 2. YouTube API (if configured and has quota) - FALLBACK
 *
 * Cache strategy:
 * - Videos found: cached for 30 days
 * - Videos not found: cached for 7 days (to retry later)
 */

import { db, VideoCache, DealAgentConfig, eq, lte, sql } from 'astro:db';
import { searchProductVideo, type YouTubeVideo, isYouTubeConfigured } from './youtube-api';
import { searchProductVideoPiped, isPipedConfigured } from './piped-api';
import { searchProductVideoRapidAPI, isRapidAPIYouTubeConfigured } from './rapidapi-youtube';

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
 * Mark quota as exhausted (when YouTube API returns 403)
 * This synchronizes our internal tracking with YouTube's actual state
 */
async function markQuotaExhausted(): Promise<void> {
  const today = getTodayISO();
  quotaCache = { used: DAILY_QUOTA_LIMIT, date: today };
  await saveQuotaToDB(quotaCache);
  console.log('[VideoCache] Quota marked as exhausted');
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
 * Check if ANY video source is configured
 * Returns true if RapidAPI YouTube, Piped, or YouTube official is available
 */
export function isAnyVideoSourceConfigured(): boolean {
  return isRapidAPIYouTubeConfigured() || isPipedConfigured() || isYouTubeConfigured();
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
  // Check if any video source is configured
  if (!isAnyVideoSourceConfigured()) {
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
        isPremiumChannel: cached.isPremiumChannel ?? false,
        isHidden: cached.isHidden ?? false,
      };
    }

    // Cache miss or expired - try video sources in priority order
    let video: YouTubeVideo | undefined;
    let searchSuccess = false;

    // === PRIMARY: Try RapidAPI YouTube (uses existing RAPIDAPI_KEY, 500 free/month) ===
    if (isRapidAPIYouTubeConfigured()) {
      console.log('[VideoCache] Trying RapidAPI YouTube...');
      const rapidResult = await searchProductVideoRapidAPI(title, lang);

      if (rapidResult.success) {
        searchSuccess = true;
        video = rapidResult.video;
        if (video) {
          console.log(`[VideoCache] Found via RapidAPI: ${video.videoId}`);
        }
      } else {
        console.warn('[VideoCache] RapidAPI YouTube failed:', rapidResult.error);
      }
    }

    // === FALLBACK 1: Try Piped API (free, no limits, but can be unstable) ===
    if (!searchSuccess && isPipedConfigured()) {
      console.log('[VideoCache] Trying Piped API fallback...');
      const pipedResult = await searchProductVideoPiped(title, lang);

      if (pipedResult.success) {
        searchSuccess = true;
        video = pipedResult.video;
        if (video) {
          console.log(`[VideoCache] Found via Piped: ${video.videoId}`);
        }
      } else {
        console.warn('[VideoCache] Piped failed:', pipedResult.error);
      }
    }

    // === FALLBACK 2: Try YouTube official API (limited quota) ===
    if (!searchSuccess && !video && isYouTubeConfigured()) {
      // Check quota before YouTube API call
      if (await canUseQuota(100)) {
        console.log('[VideoCache] Trying YouTube official API fallback...');
        const ytResult = await searchProductVideo(title, lang, 1); // Only 1 strategy to save quota
        await useQuota(ytResult.quotaUsed);

        if (ytResult.quotaExceeded) {
          console.error('[VideoCache] YouTube quota exceeded');
          await markQuotaExhausted();
        } else if (ytResult.success) {
          searchSuccess = true;
          video = ytResult.video;
          if (video) {
            console.log(`[VideoCache] Found via YouTube official: ${video.videoId}`);
          }
        }
      } else {
        console.warn('[VideoCache] YouTube quota exhausted');
      }
    }

    // If no source worked, mark as searched but not found
    if (!searchSuccess) {
      console.log('[VideoCache] No video source available');
    }

    const result = { success: searchSuccess, video };

    // BUG FIX: If we had a cached video but the new search failed,
    // keep the old video instead of overwriting with null
    const finalVideo = result.video || (cached?.videoId ? {
      videoId: cached.videoId,
      title: cached.videoTitle || '',
      channelTitle: cached.channelTitle || '',
      thumbnail: cached.thumbnail || '',
      thumbnailHigh: cached.thumbnailHigh || undefined,
      publishedAt: cached.fetchedAt.toISOString(),
      isShort: cached.isShort,
      isPremiumChannel: cached.isPremiumChannel ?? false,
      isHidden: cached.isHidden ?? false,
    } : null);

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() + (finalVideo ? CACHE_DAYS_FOUND : CACHE_DAYS_NOT_FOUND)
    );

    // Upsert cache entry with race condition handling
    if (cached) {
      // Update existing entry - preserve old video if new search failed
      const videoToStore = result.video || (cached.videoId ? {
        videoId: cached.videoId,
        title: cached.videoTitle,
        channelTitle: cached.channelTitle,
        thumbnail: cached.thumbnail,
        thumbnailHigh: cached.thumbnailHigh,
        isShort: cached.isShort,
        isPremiumChannel: cached.isPremiumChannel,
      } : null);

      await db
        .update(VideoCache)
        .set({
          videoId: videoToStore?.videoId || null,
          videoTitle: videoToStore?.title || null,
          channelTitle: videoToStore?.channelTitle || null,
          thumbnail: videoToStore?.thumbnail || null,
          thumbnailHigh: videoToStore?.thumbnailHigh || null,
          isShort: videoToStore?.isShort ?? false,
          isPremiumChannel: videoToStore?.isPremiumChannel ?? false,
          fetchedAt: now,
          expiresAt,
          hitCount: 0,
        })
        .where(eq(VideoCache.id, cached.id));
    } else {
      // Insert new entry - handle race condition with try/catch
      try {
        await db.insert(VideoCache).values({
          searchKey: cacheKey,
          asin,
          productTitle: title,
          videoId: result.video?.videoId || null,
          videoTitle: result.video?.title || null,
          channelTitle: result.video?.channelTitle || null,
          thumbnail: result.video?.thumbnail || null,
          thumbnailHigh: result.video?.thumbnailHigh || null,
          isShort: result.video?.isShort ?? false,
          isPremiumChannel: result.video?.isPremiumChannel ?? false,
          fetchedAt: now,
          expiresAt,
          hitCount: 0,
        });
      } catch (insertError: any) {
        // Race condition: another request already inserted this entry
        // This is expected behavior with concurrent requests - just log and continue
        if (insertError?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          console.log('[VideoCache] Race condition handled - entry already exists');
        } else {
          // Re-throw unexpected errors
          throw insertError;
        }
      }
    }

    return finalVideo;
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

  if (!isAnyVideoSourceConfigured()) {
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

/**
 * Invalidate all video cache entries
 * Forces fresh YouTube searches with updated quality scoring
 * USE WITH CAUTION: This will use API quota when videos are re-fetched
 */
export async function invalidateAllVideoCache(): Promise<number> {
  const all = await db.select({ id: VideoCache.id }).from(VideoCache).all();

  if (all.length === 0) {
    return 0;
  }

  // Delete all cache entries
  await db.delete(VideoCache);

  console.log(`[VideoCache] Invalidated ${all.length} cache entries`);
  return all.length;
}

/**
 * Invalidate cache for a specific product (by ASIN)
 * Useful when you want to refresh just one product's video
 */
export async function invalidateProductVideo(asin: string): Promise<boolean> {
  const result = await db
    .delete(VideoCache)
    .where(eq(VideoCache.asin, asin));

  console.log(`[VideoCache] Invalidated cache for ASIN: ${asin}`);
  return true;
}

/**
 * Hide a video by its videoId
 * Hidden videos won't appear in the feed
 */
export async function hideVideo(videoId: string): Promise<boolean> {
  try {
    await db
      .update(VideoCache)
      .set({ isHidden: true })
      .where(eq(VideoCache.videoId, videoId));

    console.log(`[VideoCache] Video hidden: ${videoId}`);
    return true;
  } catch (error) {
    console.error('[VideoCache] Error hiding video:', error);
    return false;
  }
}

/**
 * Unhide a video by its videoId
 * Makes the video visible in the feed again
 */
export async function unhideVideo(videoId: string): Promise<boolean> {
  try {
    await db
      .update(VideoCache)
      .set({ isHidden: false })
      .where(eq(VideoCache.videoId, videoId));

    console.log(`[VideoCache] Video unhidden: ${videoId}`);
    return true;
  } catch (error) {
    console.error('[VideoCache] Error unhiding video:', error);
    return false;
  }
}

/**
 * Get all cached videos for admin panel
 * Returns videos with their product info, sorted by most recent
 */
export async function getAllCachedVideos(options?: {
  filter?: 'all' | 'visible' | 'hidden';
  limit?: number;
  offset?: number;
}): Promise<{
  videos: Array<{
    id: number;
    videoId: string | null;
    videoTitle: string | null;
    channelTitle: string | null;
    thumbnail: string | null;
    isShort: boolean;
    isPremiumChannel: boolean;
    isHidden: boolean;
    asin: string | null;
    productTitle: string;
    fetchedAt: Date;
    hitCount: number;
  }>;
  total: number;
}> {
  const { filter = 'all', limit = 50, offset = 0 } = options || {};

  try {
    // Get all videos that have a videoId
    let allVideos = await db
      .select()
      .from(VideoCache)
      .all();

    // Filter to only entries with videos
    let videos = allVideos.filter(v => v.videoId);

    // Apply visibility filter
    if (filter === 'visible') {
      videos = videos.filter(v => !v.isHidden);
    } else if (filter === 'hidden') {
      videos = videos.filter(v => v.isHidden);
    }

    // Sort by fetchedAt descending (most recent first)
    videos.sort((a, b) => b.fetchedAt.getTime() - a.fetchedAt.getTime());

    const total = videos.length;

    // Apply pagination
    const paginatedVideos = videos.slice(offset, offset + limit);

    return {
      videos: paginatedVideos.map(v => ({
        id: v.id,
        videoId: v.videoId,
        videoTitle: v.videoTitle,
        channelTitle: v.channelTitle,
        thumbnail: v.thumbnail,
        isShort: v.isShort,
        isPremiumChannel: v.isPremiumChannel ?? false,
        isHidden: v.isHidden ?? false,
        asin: v.asin,
        productTitle: v.productTitle,
        fetchedAt: v.fetchedAt,
        hitCount: v.hitCount || 0,
      })),
      total,
    };
  } catch (error) {
    console.error('[VideoCache] Error getting all videos:', error);
    return { videos: [], total: 0 };
  }
}
