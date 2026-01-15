/**
 * Debug endpoint to test YouTube API search
 * GET /api/debug/test-youtube?q=iPhone+15+review
 */
import type { APIRoute } from 'astro';
import { searchProductVideo, isYouTubeConfigured } from '../../../lib/youtube-api';

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get('q') || 'iPhone 15 Pro';
  const lang = (url.searchParams.get('lang') as 'es' | 'en') || 'es';
  const strategies = parseInt(url.searchParams.get('strategies') || '2');

  if (!isYouTubeConfigured()) {
    return new Response(JSON.stringify({
      success: false,
      error: 'YOUTUBE_API_KEY not configured',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log(`[Test YouTube] Searching for: "${query}" (lang: ${lang}, strategies: ${strategies})`);

    const result = await searchProductVideo(query, lang, strategies);

    return new Response(JSON.stringify({
      success: result.success,
      query,
      lang,
      strategiesUsed: strategies,
      quotaUsed: result.quotaUsed,
      video: result.video ? {
        videoId: result.video.videoId,
        title: result.video.title,
        channel: result.video.channelTitle,
        isShort: result.video.isShort,
        thumbnail: result.video.thumbnail,
        url: result.video.isShort
          ? `https://youtube.com/shorts/${result.video.videoId}`
          : `https://youtube.com/watch?v=${result.video.videoId}`,
      } : null,
      error: result.error,
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Test YouTube] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
