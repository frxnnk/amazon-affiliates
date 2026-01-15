/**
 * YouTube Data API v3 Client
 * 
 * Free tier: 10,000 units/day
 * Search costs: 100 units per call
 * = ~100 searches/day free
 * 
 * Docs: https://developers.google.com/youtube/v3/docs/search/list
 */

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  thumbnailHigh?: string;
  publishedAt: string;
  isShort: boolean;
}

export interface YouTubeSearchResult {
  success: boolean;
  video?: YouTubeVideo;
  error?: string;
  quotaUsed: number;
}

/**
 * Check if YouTube API is configured
 */
export function isYouTubeConfigured(): boolean {
  return !!import.meta.env.YOUTUBE_API_KEY;
}

/**
 * Search strategies in order of priority
 * Each strategy uses 100 quota units
 */
type SearchStrategy = {
  name: string;
  buildQuery: (cleanName: string, brand: string | null, lang: 'es' | 'en') => string;
  params?: Record<string, string>;
};

const SEARCH_STRATEGIES: SearchStrategy[] = [
  {
    // Strategy 1: Shorts específicos (mejor para feed móvil)
    name: 'shorts',
    buildQuery: (name, brand, lang) => {
      const keyword = lang === 'es' ? 'reseña' : 'review';
      const base = brand ? `${brand} ${name.split(' ').slice(0, 3).join(' ')}` : name;
      return `${base} #shorts ${keyword}`;
    },
    params: { videoDuration: 'short', order: 'viewCount' },
  },
  {
    // Strategy 2: Reviews populares
    name: 'popular-review',
    buildQuery: (name, brand, lang) => {
      const keyword = lang === 'es' ? 'review' : 'review';
      return `${name} ${keyword}`;
    },
    params: { videoDuration: 'short', order: 'viewCount' },
  },
  {
    // Strategy 3: Unboxing (suelen ser más visuales)
    name: 'unboxing',
    buildQuery: (name, _brand, _lang) => `${name} unboxing`,
    params: { videoDuration: 'short', order: 'relevance' },
  },
];

/**
 * Clean and extract product info for better search results
 */
function cleanProductName(productName: string): { cleanName: string; brand: string | null } {
  // Extract brand (usually first word or before dash)
  const brandMatch = productName.match(/^([A-Z][a-zA-Z0-9]+)[\s-]/);
  const brand = brandMatch ? brandMatch[1] : null;

  // Clean the name
  const cleanName = productName
    .replace(/\([^)]*\)/g, '')        // Remove parentheses content
    .replace(/\[[^\]]*\]/g, '')       // Remove brackets content
    .replace(/,\s*\d+.*$/, '')        // Remove ", 128GB..." style suffixes
    .replace(/,.*$/, '')              // Remove everything after first comma
    .replace(/-\s*[A-Z0-9]+\s*$/, '') // Remove model numbers at end
    .replace(/\s{2,}/g, ' ')          // Collapse multiple spaces
    .trim()
    .slice(0, 60);                    // Shorter limit for better results

  return { cleanName, brand };
}

/**
 * Search for a product review video (preferably Short)
 * Uses multiple search strategies with fallback
 * Costs 100 quota units per strategy attempted
 *
 * @param productName - Product title to search for
 * @param lang - Language for relevance ('es' | 'en')
 * @param maxStrategies - Max strategies to try (default 1 to save quota)
 * @returns Search result with video info or error
 */
export async function searchProductVideo(
  productName: string,
  lang: 'es' | 'en' = 'es',
  maxStrategies: number = 1
): Promise<YouTubeSearchResult> {
  const apiKey = import.meta.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: 'YOUTUBE_API_KEY not configured',
      quotaUsed: 0
    };
  }

  const { cleanName, brand } = cleanProductName(productName);
  let totalQuotaUsed = 0;

  // Try strategies in order until we find a good video
  for (let i = 0; i < Math.min(maxStrategies, SEARCH_STRATEGIES.length); i++) {
    const strategy = SEARCH_STRATEGIES[i];
    const searchQuery = strategy.buildQuery(cleanName, brand, lang);

    const params = new URLSearchParams({
      part: 'snippet',
      q: searchQuery,
      type: 'video',
      maxResults: '5',
      relevanceLanguage: lang,
      safeSearch: 'moderate',
      key: apiKey,
      ...strategy.params,
    });

    try {
      const response = await fetch(`${YOUTUBE_API_BASE}/search?${params}`);
      const data = await response.json();
      totalQuotaUsed += 100;

      if (data.error) {
        console.error(`[YouTube API] Error (${strategy.name}):`, data.error.message);
        // Don't return yet, try next strategy
        continue;
      }

      if (!data.items || data.items.length === 0) {
        console.log(`[YouTube API] No results for strategy '${strategy.name}': ${searchQuery}`);
        continue;
      }

      // Score and rank results
      const scoredItems = data.items.map((item: any) => ({
        item,
        score: scoreVideo(item, cleanName, brand),
      }));

      scoredItems.sort((a: any, b: any) => b.score - a.score);
      const best = scoredItems[0];

      // Only accept if score is reasonable
      if (best.score < 10) {
        console.log(`[YouTube API] Low quality results for '${strategy.name}', trying next...`);
        continue;
      }

      const snippet = best.item.snippet;
      const isShort = isLikelyShort(snippet.title, snippet.description || '');

      const video: YouTubeVideo = {
        videoId: best.item.id.videoId,
        title: snippet.title,
        channelTitle: snippet.channelTitle,
        thumbnail: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url,
        thumbnailHigh: snippet.thumbnails?.high?.url,
        publishedAt: snippet.publishedAt,
        isShort,
      };

      console.log(`[YouTube API] Found via '${strategy.name}': ${video.videoId} (score: ${best.score})`);

      return {
        success: true,
        video,
        quotaUsed: totalQuotaUsed,
      };
    } catch (error) {
      console.error(`[YouTube API] Network error (${strategy.name}):`, error);
      // Continue to next strategy
    }
  }

  // No video found after all strategies
  console.log(`[YouTube API] No suitable video found for: ${cleanName}`);
  return {
    success: true,
    video: undefined,
    quotaUsed: totalQuotaUsed || 100,
  };
}

/**
 * Score a video result for relevance
 * Higher score = better match
 */
function scoreVideo(item: any, productName: string, brand: string | null): number {
  let score = 0;
  const title = item.snippet?.title?.toLowerCase() || '';
  const channel = item.snippet?.channelTitle?.toLowerCase() || '';
  const description = item.snippet?.description?.toLowerCase() || '';

  // Product name words in title
  const nameWords = productName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const matchedWords = nameWords.filter(word => title.includes(word));
  score += matchedWords.length * 15;

  // Brand match (strong signal)
  if (brand && title.includes(brand.toLowerCase())) {
    score += 25;
  }

  // Is a Short (preferred for mobile)
  if (isLikelyShort(title, description)) {
    score += 20;
  }

  // Review/unboxing indicators
  if (/review|reseña|análisis|unboxing|hands.?on/i.test(title)) {
    score += 15;
  }

  // Penalize likely spam
  if (/cheap|free|win|giveaway|gratis/i.test(title)) {
    score -= 30;
  }

  // Penalize very long titles (often spam)
  if (title.length > 80) {
    score -= 10;
  }

  // Trusted channel patterns (tech reviewers)
  if (/tech|review|unbox|gadget/i.test(channel)) {
    score += 10;
  }

  return score;
}

/**
 * Heuristic to detect if a video is likely a YouTube Short
 */
function isLikelyShort(title: string, description: string): boolean {
  const shortIndicators = [
    '#shorts',
    '#short',
    'shorts',
    '60 seconds',
    '60 segundos',
    'quick review',
    'reseña rápida',
  ];
  
  const combined = `${title} ${description}`.toLowerCase();
  return shortIndicators.some(indicator => combined.includes(indicator));
}

/**
 * Get standard YouTube embed URL
 * 
 * @param videoId - YouTube video ID
 * @param options - Embed options
 */
export function getVideoEmbedUrl(
  videoId: string, 
  options: {
    autoplay?: boolean;
    mute?: boolean;
    loop?: boolean;
    controls?: boolean;
  } = {}
): string {
  const params = new URLSearchParams({
    rel: '0', // Don't show related videos from other channels
    modestbranding: '1', // Minimal YouTube branding
    playsinline: '1', // Play inline on mobile
  });

  if (options.autoplay) {
    params.set('autoplay', '1');
  }
  if (options.mute || options.autoplay) {
    // Autoplay requires mute in most browsers
    params.set('mute', '1');
  }
  if (options.loop) {
    params.set('loop', '1');
    params.set('playlist', videoId); // Required for loop to work
  }
  if (options.controls === false) {
    params.set('controls', '0');
  }

  return `https://www.youtube.com/embed/${videoId}?${params}`;
}

/**
 * Get YouTube Shorts embed URL (vertical format, looping)
 * Best for mobile feed experience
 */
export function getShortsEmbedUrl(videoId: string, autoplay = true): string {
  return getVideoEmbedUrl(videoId, {
    autoplay,
    mute: true,
    loop: true,
    controls: true,
  });
}

/**
 * Get direct YouTube video URL (not embed)
 */
export function getVideoUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Get YouTube Shorts direct URL
 */
export function getShortsUrl(videoId: string): string {
  return `https://www.youtube.com/shorts/${videoId}`;
}

/**
 * Extract video ID from various YouTube URL formats
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&?/]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Just the ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}
