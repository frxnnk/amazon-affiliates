/**
 * API Endpoint: Hide/Unhide Videos
 *
 * POST /api/admin/videos/hide - Toggle video visibility
 * Body: { videoId: string, hide: boolean }
 */

import type { APIRoute } from 'astro';
import { hideVideo, unhideVideo } from '@lib/video-cache';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { videoId, hide } = body;

    if (!videoId || typeof videoId !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing or invalid videoId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (typeof hide !== 'boolean') {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing or invalid hide parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const success = hide
      ? await hideVideo(videoId)
      : await unhideVideo(videoId);

    if (!success) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update video visibility' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        videoId,
        isHidden: hide,
        message: hide ? 'Video hidden' : 'Video visible'
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
