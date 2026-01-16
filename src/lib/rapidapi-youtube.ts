/**
 * RapidAPI YouTube Search Client
 *
 * Uses "Youtube Search and Download" API from RapidAPI
 * https://rapidapi.com/h0p3rwe/api/youtube-search-and-download
 *
 * Pricing: 500 free requests/month, then ~$0.001/request
 * Uses the same RAPIDAPI_KEY as the Amazon product API
 */

import type { YouTubeVideo } from './youtube-api';

const RAPIDAPI_HOST = 'youtube-search-and-download.p.rapidapi.com';
const RAPIDAPI_BASE_URL = `https://${RAPIDAPI_HOST}`;

export interface RapidAPIYouTubeResult {
  success: boolean;
  video?: YouTubeVideo;
  error?: string;
}

/**
 * Known quality tech review channels - CURATED LIST
 * Same as piped-api.ts for consistency
 */
const TRUSTED_CHANNELS = [
  // === TIER 1: Premium tech reviewers ===
  'mkbhd', 'marques brownlee',
  'linus tech tips', 'ltt', 'shortcircuit',
  'dave2d', 'dave lee',
  'mrwhosetheboss', 'arun maini',
  'the verge', 'engadget', 'cnet', 'tom\'s guide', 'techradar', 'wired',

  // === TIER 2: Established tech reviewers ===
  'austin evans', 'unbox therapy', 'supersaf', 'ijustine',
  'jonathan morrison', 'tailosive tech', 'snazzy labs', 'joeq', 'flossy carter',
  'technical guruji', 'geekyranjit', 'trakin tech', 'beebom',

  // === TIER 3: Category specialists ===
  'rtings', 'hardware canucks', 'gamers nexus', 'jayztwocents',
  'techmoan', 'dankpods', 'soundguys',

  // === Spanish tech channels ===
  'pro android', 'suprapixel', 'topes de gama', 'andro4all', 'xataka',
  'el test de la abuela', 'poderpda', 'cnet en español', 'geekfactory',
  'tecnonauta', 'unocero', 'marcianotech', 'nate gentile',
];

/**
 * Channels to ALWAYS reject
 */
const BLOCKED_CHANNELS = [
  'aliexpress', 'wish', 'banggood', 'gearbest',
  'amazon', 'best buy', 'walmart',
  'official', 'store', 'shop', 'deals', 'offers',
  'wholesale', 'dropship', 'compilation', 'top 10',
];

/**
 * Check if RapidAPI YouTube is configured
 */
export function isRapidAPIYouTubeConfigured(): boolean {
  const apiKey = import.meta.env.RAPIDAPI_KEY || import.meta.env.RAINFOREST_API_KEY;
  return !!apiKey;
}

/**
 * Clean product name for better search results
 */
function cleanProductName(productName: string): { cleanName: string; brand: string | null } {
  const brandMatch = productName.match(/^([A-Z][a-zA-Z0-9]+)[\s-]/);
  const brand = brandMatch ? brandMatch[1] : null;

  const cleanName = productName
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/,\s*\d+.*$/, '')
    .replace(/,.*$/, '')
    .replace(/-\s*[A-Z0-9]+\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 60);

  return { cleanName, brand };
}

/**
 * Score a video for relevance and quality - STRICT QUALITY MODE
 * Returns -999 for auto-reject
 */
function scoreVideo(item: any, productName: string, brand: string | null): number {
  const title = (item.title || '').toLowerCase();
  const channel = (item.channelName || item.channelTitle || '').toLowerCase();
  const duration = parseDuration(item.lengthText || item.length || item.duration || '');
  const viewCount = parseInt(item.viewCount || item.views || '0', 10);

  // === INSTANT REJECTION ===
  if (BLOCKED_CHANNELS.some(bc => channel.includes(bc))) {
    return -999;
  }
  if (/\$\d+|cheap|free shipping|giveaway|gratis|fake|scam|best price|discount code/i.test(title)) {
    return -999;
  }
  if (/compilation|top \d+|best \d+|shorts compilation|tiktok/i.test(title)) {
    return -999;
  }

  // === SCORING ===
  let score = 0;
  const isTrustedChannel = TRUSTED_CHANNELS.some(tc => channel.includes(tc));

  // Trusted channel bonus (big)
  if (isTrustedChannel) {
    score += 80;
  }

  // Duration quality - ideal review: 3-20 minutes
  if (duration >= 180 && duration <= 1200) {
    score += 30;
  } else if (duration >= 120 && duration <= 1800) {
    score += 15;
  } else if (duration > 0 && duration < 62) {
    score += isTrustedChannel ? 10 : -60;
  }

  // Content relevance
  const nameWords = productName.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const matchedWords = nameWords.filter(word => title.includes(word));
  const matchRatio = nameWords.length > 0 ? matchedWords.length / nameWords.length : 0;

  if (matchRatio >= 0.5) score += 40;
  else if (matchRatio >= 0.3) score += 25;
  else if (matchedWords.length >= 2) score += 15;

  if (brand && title.includes(brand.toLowerCase())) {
    score += 30;
  }

  // Review indicators
  if (/\breview\b|\breseña\b|\banálisis\b/i.test(title)) score += 25;
  if (/hands.?on|first look|unboxing/i.test(title)) score += 15;
  if (/honest|in.?depth|complete|detailed/i.test(title)) score += 10;

  // Quality penalties
  if (/amazing|incredible|insane|must.?see/i.test(title)) score -= 30;
  if ((title.match(/[!?]/g) || []).length > 3) score -= 25;
  if (/[A-Z]{6,}/.test(item.title || '')) score -= 25;

  // View count signal
  if (viewCount > 1000000) score += 15;
  else if (viewCount > 100000) score += 10;
  else if (viewCount > 10000) score += 5;

  return score;
}

/**
 * Parse duration string to seconds
 * Handles formats like "10:30", "1:05:30", "65"
 */
function parseDuration(duration: string): number {
  if (!duration) return 0;

  // If it's already a number
  if (!isNaN(Number(duration))) {
    return Number(duration);
  }

  const parts = duration.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

/**
 * Search for a product video using RapidAPI YouTube Search
 *
 * @param productName - Product title to search for
 * @param lang - Language preference ('es' | 'en')
 * @returns Search result with video info or error
 */
export async function searchProductVideoRapidAPI(
  productName: string,
  lang: 'es' | 'en' = 'es'
): Promise<RapidAPIYouTubeResult> {
  const apiKey = import.meta.env.RAPIDAPI_KEY || import.meta.env.RAINFOREST_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: 'RAPIDAPI_KEY not configured',
    };
  }

  const { cleanName, brand } = cleanProductName(productName);
  const reviewWord = lang === 'es' ? 'review análisis' : 'review';
  const searchQuery = brand
    ? `${brand} ${cleanName.split(' ').slice(0, 4).join(' ')} ${reviewWord}`
    : `${cleanName} ${reviewWord}`;

  try {
    const params = new URLSearchParams({
      query: searchQuery,
      sort: 'r', // relevance
    });

    const response = await fetch(`${RAPIDAPI_BASE_URL}/search?${params}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[RapidAPI YouTube] HTTP ${response.status}: ${errorText}`);
      return {
        success: false,
        error: `HTTP ${response.status}`,
      };
    }

    const data = await response.json();

    // The API returns { contents: [...] } with video results
    const videos = data.contents?.filter((item: any) =>
      item.video && item.video.videoId
    ) || [];

    if (videos.length === 0) {
      console.log(`[RapidAPI YouTube] No results for: ${searchQuery}`);
      return { success: true, video: undefined };
    }

    // Score and rank results - filter out auto-rejected
    const scoredItems = videos
      .map((item: any) => ({
        item: item.video,
        score: scoreVideo(item.video, cleanName, brand),
      }))
      .filter((scored: any) => scored.score > -999);

    if (scoredItems.length === 0) {
      console.log(`[RapidAPI YouTube] All results rejected by quality filter`);
      return { success: true, video: undefined };
    }

    scoredItems.sort((a: any, b: any) => b.score - a.score);
    const best = scoredItems[0];

    // STRICT quality threshold
    const MIN_QUALITY_SCORE = 50;
    if (best.score < MIN_QUALITY_SCORE) {
      console.log(`[RapidAPI YouTube] Low quality results (score: ${best.score}, need ${MIN_QUALITY_SCORE}+)`);
      return { success: true, video: undefined };
    }

    const item = best.item;
    const duration = parseDuration(item.lengthText || item.length || '');
    const isShort = duration > 0 && duration < 62;
    const channelLower = (item.channelName || item.author || '').toLowerCase();
    const isPremiumChannel = TRUSTED_CHANNELS.some(tc => channelLower.includes(tc));

    const video: YouTubeVideo = {
      videoId: item.videoId,
      title: item.title || '',
      channelTitle: item.channelName || item.author || '',
      thumbnail: item.thumbnails?.[0]?.url ||
                 `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`,
      thumbnailHigh: item.thumbnails?.[item.thumbnails.length - 1]?.url ||
                     `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
      publishedAt: item.publishedTimeText || new Date().toISOString(),
      isShort,
      isPremiumChannel,
    };

    console.log(`[RapidAPI YouTube] Found: ${video.videoId} (score: ${best.score})`);

    return { success: true, video };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[RapidAPI YouTube] Error: ${message}`);
    return {
      success: false,
      error: message,
    };
  }
}
