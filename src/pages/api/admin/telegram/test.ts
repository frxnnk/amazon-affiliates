/**
 * API Endpoint: Test Telegram Connection
 * 
 * GET /api/admin/telegram/test
 * 
 * Tests if the Telegram bot is properly configured and can connect.
 */

import type { APIRoute } from 'astro';
import { testConnection, isTelegramConfigured, sendToChannel } from '@lib/telegram-bot';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    // Check if configured
    if (!isTelegramConfigured()) {
      return new Response(
        JSON.stringify({
          success: false,
          configured: false,
          error: 'Telegram no está configurado. Agrega las variables de entorno.',
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

// POST to send a test message
export const POST: APIRoute = async () => {
  try {
    if (!isTelegramConfigured()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Telegram no configurado',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const testMessage = `🧪 *Mensaje de prueba*\n\n¡El bot de BestDeal está funcionando correctamente\\!\n\n_Enviado desde el panel de administración_`;

    const result = await sendToChannel(testMessage, { parseMode: 'MarkdownV2' });

    return new Response(
      JSON.stringify({
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      }),
      { status: result.success ? 200 : 500, headers: { 'Content-Type': 'application/json' } }
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
