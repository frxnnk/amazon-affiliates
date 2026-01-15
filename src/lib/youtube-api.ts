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
 * Search for a product review video (preferably Short)
 * Costs 100 quota units per call
 * 
 * @param productName - Product title to search for
 * @param lang - Language for relevance ('es' | 'en')
 * @returns Search result with video info or error
 */
export async function searchProductVideo(
  productName: string,
  lang: 'es' | 'en' = 'es'
): Promise<YouTubeSearchResult> {
  const apiKey = import.meta.env.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    return { 
      success: false, 
      error: 'YOUTUBE_API_KEY not configured', 
      quotaUsed: 0 
    };
  }

  // Clean product name for better search results
  const cleanName = productName
    .replace(/\([^)]*\)/g, '') // Remove parentheses content
    .replace(/\[[^\]]*\]/g, '') // Remove brackets content
    .replace(/,.*$/, '') // Remove everything after first comma
    .trim()
    .slice(0, 80); // Limit length

  // Build search query optimized for product reviews
  const searchTerms = lang === 'es' 
    ? ['review', 'unboxing', 'análisis']
    : ['review', 'unboxing', 'hands on'];
  
  const searchQuery = `${cleanName} ${searchTerms[0]}`;

  const params = new URLSearchParams({
    part: 'snippet',
    q: searchQuery,
    type: 'video',
    videoDuration: 'short', // Videos < 4 minutes (includes Shorts)
    maxResults: '3', // Get a few results to filter
    relevanceLanguage: lang,
    safeSearch: 'moderate',
    key: apiKey,
  });

  try {
    const response = await fetch(`${YOUTUBE_API_BASE}/search?${params}`);
    const data = await response.json();

    if (data.error) {
      console.error('[YouTube API] Error:', data.error.message);
      return { 
        success: false, 
        error: data.error.message, 
        quotaUsed: 1 // Even errors cost 1 unit minimum
      };
    }

    if (!data.items || data.items.length === 0) {
      console.log(`[YouTube API] No videos found for: ${cleanName}`);
      return { 
        success: true, 
        video: undefined, 
        quotaUsed: 100 
      };
    }

    // Find the best video (prefer channels with many subs, avoid spam)
    const item = data.items[0];
    const snippet = item.snippet;

    // Check if it's likely a Short based on title patterns
    const isShort = isLikelyShort(snippet.title, snippet.description || '');

    const video: YouTubeVideo = {
      videoId: item.id.videoId,
      title: snippet.title,
      channelTitle: snippet.channelTitle,
      thumbnail: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url,
      thumbnailHigh: snippet.thumbnails?.high?.url,
      publishedAt: snippet.publishedAt,
      isShort,
    };

    console.log(`[YouTube API] Found video for "${cleanName}": ${video.videoId} (${isShort ? 'Short' : 'Video'})`);

    return {
      success: true,
      video,
      quotaUsed: 100,
    };
  } catch (error) {
    console.error('[YouTube API] Network error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Network error',
      quotaUsed: 0 
    };
  }
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
