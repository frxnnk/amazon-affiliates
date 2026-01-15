/**
 * API Endpoint: Publish Product to Telegram
 * 
 * POST /api/admin/telegram/publish
 * 
 * Publishes a product to the configured Telegram channel.
 */

import type { APIRoute } from 'astro';
import { publishProduct, sendDealAlert, isTelegramConfigured, type ProductMessage } from '@lib/telegram-bot';

export const prerender = false;

interface PublishRequest {
  products: ProductMessage[];
  lang?: 'es' | 'en';
  mode?: 'single' | 'bulk'; // single = one message per product, bulk = summary message
}

interface PublishResponse {
  success: boolean;
  published?: number;
  failed?: number;
  error?: string;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Check if Telegram is configured
    if (!isTelegramConfigured()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Telegram no está configurado. Agrega TELEGRAM_BOT_TOKEN y TELEGRAM_CHANNEL_ID a tu .env',
        } as PublishResponse),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body: PublishRequest = await request.json();

    if (!body.products || !Array.isArray(body.products) || body.products.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Se requiere al menos un producto',
        } as PublishResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const lang = body.lang || 'es';
    const mode = body.mode || 'single';

    if (mode === 'bulk') {
      // Send a single summary message with all products
      const result = await sendDealAlert(body.products, lang);
      
      return new Response(
        JSON.stringify({
          success: result.success,
          published: result.success ? body.products.length : 0,
          failed: result.success ? 0 : body.products.length,
          error: result.error,
        } as PublishResponse),
        { status: result.success ? 200 : 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send individual messages for each product
    let published = 0;
    let failed = 0;

    for (const product of body.products) {
      const result = await publishProduct(product, lang);
      
      if (result.success) {
        published++;
      } else {
        failed++;
        console.error(`Failed to publish ${product.title}:`, result.error);
      }

      // Rate limiting: wait 1 second between messages to avoid Telegram limits
      if (body.products.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return new Response(
      JSON.stringify({
        success: published > 0,
        published,
        failed,
      } as PublishResponse),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      } as PublishResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
