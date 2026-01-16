/**
 * API Endpoint: Test Telegram Connection
 *
 * GET /api/admin/telegram/test - Check connection status
 * POST /api/admin/telegram/test - Send test message or sample product
 *   body: { action: 'message' | 'sample', lang?: 'es' | 'en' }
 */

import type { APIRoute } from 'astro';
import {
  testConnection,
  isTelegramConfigured,
  sendToChannel,
  publishProduct,
  type ProductMessage,
} from '@lib/telegram-bot';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    // Check if configured
    if (!isTelegramConfigured()) {
      return new Response(
        JSON.stringify({
          success: false,
          configured: false,
          error: 'Telegram no está configurado. Agrega TELEGRAM_BOT_TOKEN y TELEGRAM_CHANNEL_ID.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Test connection
    const result = await testConnection();

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          configured: true,
          error: result.error,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        configured: true,
        message: 'Conexión exitosa con el bot de Telegram',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// POST to send a test message or sample product
export const POST: APIRoute = async ({ request }) => {
  try {
    if (!isTelegramConfigured()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Telegram no configurado. Agrega TELEGRAM_BOT_TOKEN y TELEGRAM_CHANNEL_ID.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action || 'message';
    const lang = body.lang || 'es';

    // Send simple test message
    if (action === 'message') {
      const testMessage =
        `🧪 *Mensaje de prueba*\n\n` +
        `¡El bot de BestDeal está funcionando correctamente\\!\n\n` +
        `_Enviado desde el panel de administración_`;

      const result = await sendToChannel(testMessage, { parseMode: 'MarkdownV2' });

      return new Response(
        JSON.stringify({
          success: result.success,
          messageId: result.messageId,
          error: result.error,
          message: result.success ? 'Mensaje de prueba enviado' : undefined,
        }),
        { status: result.success ? 200 : 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send sample product to preview formatting
    if (action === 'sample') {
      const sampleProduct: ProductMessage = {
        title: 'Apple AirPods Pro (2ª generación) con estuche de carga MagSafe USB-C',
        brand: 'Apple',
        price: 199.99,
        originalPrice: 279.99,
        currency: 'EUR',
        affiliateUrl: 'https://www.amazon.es/dp/B0BDHWDR12?tag=ejemplo-21',
        imageUrl: 'https://m.media-amazon.com/images/I/61SUj2aKoEL._AC_SL1500_.jpg',
        rating: 4.7,
        totalReviews: 12543,
        isPrime: true,
        shortDescription:
          'Cancelación activa de ruido, audio espacial personalizado y hasta 6 horas de autonomía.',
      };

      const result = await publishProduct(sampleProduct, lang);

      return new Response(
        JSON.stringify({
          success: result.success,
          messageId: result.messageId,
          error: result.error,
          message: result.success ? 'Producto de ejemplo publicado' : undefined,
        }),
        { status: result.success ? 200 : 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: `Acción desconocida: ${action}. Usa 'message' o 'sample'.`,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
