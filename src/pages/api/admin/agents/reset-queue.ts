/**
 * Reset failed items in PublishQueue to pending status
 */

import type { APIRoute } from 'astro';
import { db, PublishQueue } from 'astro:db';
import { eq } from 'astro:db';

export const prerender = false;

export const POST: APIRoute = async () => {
  try {
    // Reset all failed items to pending
    const result = await db
      .update(PublishQueue)
      .set({
        status: 'pending',
        publishResults: null,
      })
      .where(eq(PublishQueue.status, 'failed'));

    return new Response(JSON.stringify({
      success: true,
      message: 'Reset failed items to pending',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
