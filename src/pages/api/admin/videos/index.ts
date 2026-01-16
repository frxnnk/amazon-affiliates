/**
 * API Endpoint: List Cached Videos
 *
 * GET /api/admin/videos - Get all cached videos for admin panel
 * Query params:
 *   - filter: 'all' | 'visible' | 'hidden' (default: 'all')
 *   - limit: number (default: 50)
 *   - offset: number (default: 0)
 */

import type { APIRoute } from 'astro';
import { getAllCachedVideos } from '@lib/video-cache';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    const filter = url.searchParams.get('filter') as 'all' | 'visible' | 'hidden' || 'all';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const result = await getAllCachedVideos({ filter, limit, offset });

    return new Response(
      JSON.stringify({
        success: true,
        videos: result.videos,
        total: result.total,
        filter,
        limit,
        offset
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
