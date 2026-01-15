/**
 * Debug endpoint to clear video cache
 * DELETE /api/debug/clear-video-cache
 */
import type { APIRoute } from 'astro';
import { db, VideoCache, sql } from 'astro:db';

export const DELETE: APIRoute = async () => {
  try {
    // Count before delete
    const countBefore = await db
      .select({ count: sql<number>`count(*)` })
      .from(VideoCache);

    // Delete all video cache entries
    await db.delete(VideoCache);

    return new Response(JSON.stringify({
      success: true,
      message: `Cleared ${countBefore[0]?.count || 0} video cache entries`,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error clearing video cache:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
