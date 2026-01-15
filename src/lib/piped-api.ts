/**
 * Piped API Client
 *
 * Piped is a privacy-friendly YouTube frontend with a free REST API.
 * No API key required, no quota limits.
 *
 * Docs: https://docs.piped.video/docs/api-documentation/
 */

import type { YouTubeVideo } from './youtube-api';

// Public Piped API instances with fallback (updated Jan 2025)
// Source: https://github.com/TeamPiped/documentation/blob/main/content/docs/public-instances/index.md
// Ordered by reliability - tested working instances first
const PIPED_INSTANCES = [
  'https://api.piped.private.coffee',       // Austria - TESTED WORKING
  'https://pipedapi.reallyaweso.me',        // Unknown
  'https://piped-api.codespace.cz',         // Czech Republic
  'https://pipedapi.darkness.services',     // Unknown
  'https://pipedapi.orangenet.cc',          // Unknown
  'https://pipedapi.owo.si',                // Slovenia
  'https://pipedapi.ducks.party',           // Unknown
  'https://pipedapi.nosebs.ru',             // Finland
  'https://pipedapi.kavin.rocks',           // Official - often overloaded
  'https://pipedapi-libre.kavin.rocks',     // Official libre - NL
  'https://pipedapi.leptons.xyz',           // Austria
  'https://api.piped.yt',                   // Germany
  'https://piped-api.privacy.com.de',       // Germany
  'https://pipedapi.drgns.space',           // US
  'https://pipedapi.adminforge.de',         // Germany - redirects
];

// Track instance health for smart fallback
const instanceHealth: Map<string, { failures: number; lastCheck: number }> = new Map();
const HEALTH_RESET_MS = 5 * 60 * 1000; // Reset failure count after 5 minutes

export interface PipedSearchResult {
  success: boolean;
  video?: YouTubeVideo;
  error?: string;
  instance?: string;
}

/**
 * Known quality tech review channels - CURATED LIST
 * Only channels with consistently high-quality, professional reviews
 */
const TRUSTED_CHANNELS = [
  // === TIER 1: Premium tech reviewers (extremely reliable) ===
  'mkbhd', 'marques brownlee',
  'linus tech tips', 'ltt', 'shortcircuit',
  'dave2d', 'dave lee',
  'mrwhosetheboss', 'arun maini',
  'the verge',
  'engadget',
  'cnet',
  'tom\'s guide',
  'techradar',
  'wired',

  // === TIER 2: Established tech reviewers ===
  'austin evans',
  'unbox therapy', 'lewis hilsenteger',
  'supersaf', 'safwan ahmedmia',
  'ijustine',
  'jonathan morrison',
  'tailosive tech',
  'snazzy labs', 'quinn nelson',
  'joeq',
  'flossy carter',
  'justine ezarik',
  'sara dietschy',
  'technical guruji',
  'geekyranjit',
  'trakin tech',
  'beebom',

  // === TIER 3: Category specialists ===
  'rtings', 'rtings.com',           // Audio/Video reviews
  'hardware canucks',               // PC hardware
  'gamers nexus',                   // PC hardware deep dives
  'jayztwocents',                   // PC building
  'bitwit',                         // PC building
  'tech altar',                     // Analysis
  'tech linked',                    // News
  'techmoan',                       // Retro/Audio
  'dankpods',                       // Audio
  'soundguys',                      // Audio
  'michael soledad',                // Cameras
  'gerald undone',                  // Cameras
  'potato jet',                     // Cameras

  // === Spanish tech channels (high quality) ===
  'pro android',
  'suprapixel',
  'topes de gama',
  'andro4all',
  'xataka', 'xataka tv',
  'el test de la abuela',
  'poderpda',
  'cnet en español',
  'geekfactory',
  'tecnonauta',
  'unocero',
  'marcianotech',
  'nate gentile',
  'lucas rizzotto',
];

/**
 * Channels to ALWAYS reject - known spam/low quality
 */
const BLOCKED_CHANNELS = [
  'aliexpress', 'wish', 'banggood', 'gearbest',
  'amazon', 'best buy', 'walmart',
  'official', 'store', 'shop', 'deals', 'offers',
  'wholesale', 'dropship', 'supplier',
  'compilation', 'top 10', 'top 5',
];

/**
 * Get a healthy Piped instance
 * Prioritizes instances with fewer recent failures
 */
function getHealthyInstance(): string {
  const now = Date.now();

  // Sort instances by health (fewer failures = better)
  const sorted = [...PIPED_INSTANCES].sort((a, b) => {
    const healthA = instanceHealth.get(a);
    const healthB = instanceHealth.get(b);

    // Reset if enough time has passed
    const failuresA = healthA && (now - healthA.lastCheck < HEALTH_RESET_MS) ? healthA.failures : 0;
    const failuresB = healthB && (now - healthB.lastCheck < HEALTH_RESET_MS) ? healthB.failures : 0;

    return failuresA - failuresB;
  });

  return sorted[0];
}

/**
 * Mark an instance as failed
 */
function markInstanceFailed(instance: string): void {
  const health = instanceHealth.get(instance) || { failures: 0, lastCheck: Date.now() };
  health.failures += 1;
  health.lastCheck = Date.now();
  instanceHealth.set(instance, health);
}

/**
 * Mark an instance as healthy
 */
function markInstanceHealthy(instance: string): void {
  instanceHealth.set(instance, { failures: 0, lastCheck: Date.now() });
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
 * Returns -999 for auto-reject, otherwise higher = better
 */
function scoreVideo(item: any, productName: string, brand: string | null): number {
  const title = (item.title || '').toLowerCase();
  const channel = (item.uploaderName || '').toLowerCase();
  const duration = item.duration || 0; // in seconds
  const views = item.views || 0;

  // === INSTANT REJECTION - Return -999 to auto-block ===

  // Blocked channels - always reject
  if (BLOCKED_CHANNELS.some(bc => channel.includes(bc))) {
    return -999;
  }

  // Spam titles - always reject
  if (/\$\d+|cheap|free shipping|win|giveaway|gratis|fake|scam|best price|lowest price|discount code|coupon/i.test(title)) {
    return -999;
  }

  // Non-review content - reject
  if (/compilation|top \d+|best \d+|vs all|shorts compilation|tiktok|instagram/i.test(title)) {
    return -999;
  }

  // === SCORING STARTS HERE ===
  let score = 0;
  const isTrustedChannel = TRUSTED_CHANNELS.some(tc => channel.includes(tc));

  // === TRUSTED CHANNEL BONUS (BIG) ===
  if (isTrustedChannel) {
    score += 80; // Significant bonus for curated channels
  }

  // === DURATION QUALITY ===
  // Ideal review length: 3-20 minutes
  if (duration >= 180 && duration <= 1200) {
    score += 30; // Perfect review length
  } else if (duration >= 120 && duration <= 1800) {
    score += 15; // Acceptable length
  } else if (duration > 0 && duration < 62) {
    // Shorts - only allow from trusted channels
    if (isTrustedChannel) {
      score += 10;
    } else {
      score -= 60; // Heavy penalty for non-trusted shorts
    }
  } else if (duration > 1800) {
    score += 5; // Long videos are usually detailed
  }

  // === CONTENT RELEVANCE ===

  // Product name words in title (important for matching)
  const nameWords = productName.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const matchedWords = nameWords.filter(word => title.includes(word));
  const matchRatio = nameWords.length > 0 ? matchedWords.length / nameWords.length : 0;

  if (matchRatio >= 0.5) {
    score += 40; // Strong match - at least half the words
  } else if (matchRatio >= 0.3) {
    score += 25; // Good match
  } else if (matchedWords.length >= 2) {
    score += 15; // Some match
  }

  // Brand match
  if (brand && title.includes(brand.toLowerCase())) {
    score += 30;
  }

  // === REVIEW INDICATORS (Important) ===
  if (/\breview\b|\breseña\b|\banálisis\b/i.test(title)) {
    score += 25; // Explicit review
  }
  if (/hands.?on|first look|primeras impresiones|unboxing/i.test(title)) {
    score += 15;
  }
  if (/honest|in.?depth|complete|full|definitivo|completo|detailed/i.test(title)) {
    score += 10;
  }

  // === PROFESSIONAL CHANNEL PATTERNS ===
  if (!isTrustedChannel && /tech|review|unbox|gadget|análisis/i.test(channel)) {
    score += 10; // Small bonus for tech-focused channels
  }

  // === QUALITY PENALTIES ===

  // Clickbait indicators
  if (/amazing|incredible|insane|crazy|must.?see|you won't believe/i.test(title)) {
    score -= 30;
  }

  // Excessive punctuation (clickbait signal)
  const punctuationCount = (title.match(/[!?]/g) || []).length;
  if (punctuationCount > 3) {
    score -= 25;
  } else if (punctuationCount > 2) {
    score -= 10;
  }

  // ALL CAPS in title
  if (/[A-Z]{6,}/.test(item.title || '')) {
    score -= 25;
  }

  // Emojis overuse (clickbait signal) - check original title
  const emojiCount = (item.title || '').match(/[\u{1F300}-\u{1F9FF}]/gu)?.length || 0;
  if (emojiCount > 3) {
    score -= 20;
  }

  // === VIEW COUNT QUALITY SIGNAL ===
  // Higher views generally indicate quality (but not always)
  if (views > 1000000) {
    score += 15; // Very popular
  } else if (views > 100000) {
    score += 10; // Popular
  } else if (views > 10000) {
    score += 5; // Decent reach
  }

  return score;
}

/**
 * Search for a product video using Piped API
 *
 * @param productName - Product title to search for
 * @param lang - Language preference ('es' | 'en')
 * @returns Search result with video info or error
 */
export async function searchProductVideoPiped(
  productName: string,
  lang: 'es' | 'en' = 'es'
): Promise<PipedSearchResult> {
  const { cleanName, brand } = cleanProductName(productName);
  const reviewWord = lang === 'es' ? 'review análisis' : 'review';
  const searchQuery = brand
    ? `${brand} ${cleanName.split(' ').slice(0, 4).join(' ')} ${reviewWord}`
    : `${cleanName} ${reviewWord}`;

  // Try instances with fallback
  let lastError = '';

  for (let attempt = 0; attempt < 5; attempt++) {
    const instance = getHealthyInstance();

    try {
      const url = `${instance}/search?q=${encodeURIComponent(searchQuery)}&filter=videos`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(8000), // 8 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      markInstanceHealthy(instance);

      if (!data.items || data.items.length === 0) {
        console.log(`[Piped] No results for: ${searchQuery}`);
        return { success: true, video: undefined, instance };
      }

      // Score and rank results - filter out auto-rejected videos
      const scoredItems = data.items
        .filter((item: any) => item.type === 'stream') // Only video streams
        .map((item: any) => ({
          item,
          score: scoreVideo(item, cleanName, brand),
        }))
        .filter((scored: any) => scored.score > -999); // Remove auto-rejected

      scoredItems.sort((a: any, b: any) => b.score - a.score);

      if (scoredItems.length === 0) {
        console.log(`[Piped] All results rejected by quality filter`);
        return { success: true, video: undefined, instance };
      }

      const best = scoredItems[0];

      // STRICT quality threshold - require trusted channel OR high relevance
      // Minimum score of 50 ensures quality
      const MIN_QUALITY_SCORE = 50;
      if (best.score < MIN_QUALITY_SCORE) {
        console.log(`[Piped] Low quality results (score: ${best.score}, need ${MIN_QUALITY_SCORE}+)`);
        return { success: true, video: undefined, instance };
      }

      const item = best.item;

      // Extract video ID from URL (format: /watch?v=VIDEO_ID)
      const videoIdMatch = item.url?.match(/[?&]v=([^&]+)/) || item.url?.match(/\/watch\/([^?&]+)/);
      const videoId = videoIdMatch ? videoIdMatch[1] : null;

      if (!videoId) {
        console.log('[Piped] Could not extract video ID');
        return { success: true, video: undefined, instance };
      }

      const isShort = item.isShort || (item.duration && item.duration < 62);

      const video: YouTubeVideo = {
        videoId,
        title: item.title || '',
        channelTitle: item.uploaderName || '',
        thumbnail: item.thumbnail || '',
        thumbnailHigh: item.thumbnail || undefined,
        publishedAt: item.uploaded ? new Date(item.uploaded).toISOString() : new Date().toISOString(),
        isShort,
      };

      console.log(`[Piped] Found: ${video.videoId} (score: ${best.score}, instance: ${instance})`);

      return { success: true, video, instance };
    } catch (error) {
      markInstanceFailed(instance);
      lastError = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[Piped] Instance ${instance} failed: ${lastError}`);
      // Continue to next attempt with different instance
    }
  }

  console.error(`[Piped] All instances failed: ${lastError}`);
  return {
    success: false,
    error: `All Piped instances failed: ${lastError}`
  };
}

/**
 * Check if Piped is available (always true - it's free)
 */
export function isPipedConfigured(): boolean {
  return true;
}

/**
 * Get list of available Piped instances
 */
export function getPipedInstances(): string[] {
  return [...PIPED_INSTANCES];
}

/**
 * Get health status of all instances
 */
export function getInstanceHealth(): Map<string, { failures: number; lastCheck: number }> {
  return new Map(instanceHealth);
}
