/**
 * API Endpoint: Queue Products for Content Generation
 *
 * POST /api/admin/agents/queue-content
 *
 * Adds products to the ContentQueue for the Content Creator agent to process.
 */

import type { APIRoute } from 'astro';
import { db, ContentQueue, Products } from 'astro:db';
import { eq, and } from 'astro:db';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { asins, count = 3 } = body as { asins?: string[]; count?: number };

    let productsToQueue;

    if (asins && asins.length > 0) {
      // Queue specific products by ASIN
      productsToQueue = [];
      for (const asin of asins) {
        const products = await db.select().from(Products).where(eq(Products.asin, asin));
        if (products.length > 0) {
          productsToQueue.push(products[0]);
        }
      }
    } else {
      // Queue random products that aren't already in queue
      const allProducts = await db.select().from(Products).limit(count * 2);

      // Filter out those already in queue
      const queued = await db.select().from(ContentQueue).where(eq(ContentQueue.status, 'pending'));
      const queuedAsins = new Set(queued.map(q => q.asin));

      productsToQueue = allProducts
        .filter(p => !queuedAsins.has(p.asin))
        .slice(0, count);
    }

    if (productsToQueue.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'No products available to queue',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Add to content queue
    const queuedItems = [];
    for (const product of productsToQueue) {
      // Check if already in queue
      const existing = await db
        .select()
        .from(ContentQueue)
        .where(and(
          eq(ContentQueue.asin, product.asin),
          eq(ContentQueue.status, 'pending')
        ));

      if (existing.length > 0) {
        continue;
      }

      await db.insert(ContentQueue).values({
        asin: product.asin,
        marketplace: product.lang === 'es' ? 'es' : 'com',
        productId: product.id,
        contentType: 'full',
        status: 'pending',
        priority: 0,
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date(),
      });

      queuedItems.push({
        asin: product.asin,
        title: product.title.slice(0, 50),
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Queued ${queuedItems.length} products for content generation`,
      items: queuedItems,
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
