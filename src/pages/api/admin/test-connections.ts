/**
 * API Endpoint: Test All API Connections
 *
 * Tests connectivity to RapidAPI, OpenAI, YouTube, and Telegram APIs.
 */

import type { APIRoute } from 'astro';

interface ConnectionResult {
  ok: boolean;
  warning?: boolean;
  message?: string;
  quota?: {
    used: number;
    limit: number;
  };
}

interface ConnectionResults {
  rapidapi: ConnectionResult;
  openai: ConnectionResult;
  youtube: ConnectionResult;
  telegram: ConnectionResult;
}

// Test RapidAPI connection
async function testRapidAPI(): Promise<ConnectionResult> {
  const apiKey = import.meta.env.RAPIDAPI_KEY || process.env.RAPIDAPI_KEY;

  if (!apiKey) {
    return { ok: false, message: 'No configurado' };
  }

  try {
    // Make a minimal test request
    const response = await fetch(
      'https://real-time-amazon-data.p.rapidapi.com/product-details?asin=B09V3KXJPB&country=US',
      {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'real-time-amazon-data.p.rapidapi.com',
        },
      }
    );

    if (response.ok) {
      // Check remaining quota from headers
      const remaining = response.headers.get('x-ratelimit-requests-remaining');
      const limit = response.headers.get('x-ratelimit-requests-limit');

      return {
        ok: true,
        quota: {
          used: limit && remaining ? parseInt(limit) - parseInt(remaining) : 0,
          limit: limit ? parseInt(limit) : 500,
        },
      };
    } else if (response.status === 429) {
      return { ok: false, warning: true, message: 'Quota agotada' };
    } else if (response.status === 401 || response.status === 403) {
      return { ok: false, message: 'Key inválida' };
    } else {
      return { ok: false, message: `Error ${response.status}` };
    }
  } catch (error) {
    return { ok: false, message: 'Error de conexión' };
  }
}

// Test OpenAI connection
async function testOpenAI(): Promise<ConnectionResult> {
  const apiKey = import.meta.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { ok: false, message: 'No configurado' };
  }

  try {
    // Make a minimal models list request (cheap)
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return {
        ok: true,
        quota: { used: 0, limit: 100 }, // OpenAI is pay-per-use
      };
    } else if (response.status === 401) {
      return { ok: false, message: 'Key inválida' };
    } else if (response.status === 429) {
      return { ok: false, warning: true, message: 'Rate limit' };
    } else {
      const data = await response.json().catch(() => ({}));
      return { ok: false, message: data.error?.message || `Error ${response.status}` };
    }
  } catch (error) {
    return { ok: false, message: 'Error de conexión' };
  }
}

// Test YouTube API connection
async function testYouTube(): Promise<ConnectionResult> {
  const apiKey = import.meta.env.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return { ok: false, message: 'No configurado' };
  }

  try {
    // Make a minimal test request (costs 1 unit)
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=test&key=${apiKey}`,
      { method: 'GET' }
    );

    if (response.ok) {
      return {
        ok: true,
        quota: { used: 100, limit: 10000 }, // Default daily quota
      };
    } else if (response.status === 403) {
      const data = await response.json().catch(() => ({}));
      const reason = data.error?.errors?.[0]?.reason;

      if (reason === 'quotaExceeded') {
        return { ok: false, warning: true, message: 'Quota agotada' };
      }
      return { ok: false, message: 'API no habilitada' };
    } else if (response.status === 400) {
      return { ok: false, message: 'Key inválida' };
    } else {
      return { ok: false, message: `Error ${response.status}` };
    }
  } catch (error) {
    return { ok: false, message: 'Error de conexión' };
  }
}

// Test Telegram Bot connection
async function testTelegram(): Promise<ConnectionResult> {
  const botToken = import.meta.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken || botToken === 'tu_token_de_botfather') {
    return { ok: false, message: 'No configurado' };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
      method: 'GET',
    });

    if (response.ok) {
      const data = await response.json();
      return {
        ok: true,
        message: data.result?.username ? `@${data.result.username}` : undefined,
        quota: { used: 0, limit: 0 }, // No limit
      };
    } else if (response.status === 401) {
      return { ok: false, message: 'Token inválido' };
    } else {
      return { ok: false, message: `Error ${response.status}` };
    }
  } catch (error) {
    return { ok: false, message: 'Error de conexión' };
  }
}

export const GET: APIRoute = async () => {
  try {
    // Run all tests in parallel
    const [rapidapi, openai, youtube, telegram] = await Promise.all([
      testRapidAPI(),
      testOpenAI(),
      testYouTube(),
      testTelegram(),
    ]);

    const results: ConnectionResults = {
      rapidapi,
      openai,
      youtube,
      telegram,
    };

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Error testing connections',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
