/**
 * Debug endpoint to see PublishQueue and ContentQueue status
 */

import type { APIRoute } from 'astro';
import { db, PublishQueue, ContentQueue } from 'astro:db';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const publishQueue = await db.select().from(PublishQueue).limit(10);
    const contentQueue = await db.select().from(ContentQueue).limit(10);

    return new Response(JSON.stringify({
      publishQueue: publishQueue.map(item => ({
        id: item.id,
        asin: item.asin,
        status: item.status,
        channels: item.channels,
        hasContentSnapshot: !!item.contentSnapshot,
        contentSnapshotKeys: item.contentSnapshot ? Object.keys(item.contentSnapshot as object) : [],
        publishResults: item.publishResults,
      })),
      contentQueue: contentQueue.map(item => ({
        id: item.id,
        asin: item.asin,
        status: item.status,
        hasGeneratedContent: !!item.generatedContent,
      })),
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
