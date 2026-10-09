/**
 * Telegram bot webhook: user sends an Amazon link, bot replies with our affiliate link.
 *
 * Setup (once, after deploy):
 *   https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook
 *     ?url=https://www.rewardhive.store/api/telegram/webhook
 *     &secret_token=<TELEGRAM_WEBHOOK_SECRET>
 *     &allowed_updates=["message"]
 */

import type { APIRoute } from 'astro';
import siteConfig from '@data/site-config.json';
import { findUrls, resolveShortUrl, toAffiliateUrl, type ConvertResult } from '@lib/affiliate-link';

export const prerender = false;

const env = (key: string): string | undefined => import.meta.env[key] || process.env[key];

// Bot uses its own US tracking ID so Telegram sales show up separately in Associates reports
const TAGS: Record<string, string> = {
  ...Object.fromEntries(Object.values(siteConfig.amazon.associates).map((a) => [a.marketplace, a.tag])),
  'amazon.com': 'rewardhive-tg-20',
};

const HELP =
  'Mandame un link de Amazon y te devuelvo el link con referido.\n' +
  'Sirven links largos y cortos (amzn.to, a.co, amzn.eu). Podés mandar varios juntos.';

function errorText(r: Extract<ConvertResult, { ok: false }>, raw: string): string {
  switch (r.error) {
    case 'not_amazon':
      return 'No es un link de Amazon: ' + raw;
    case 'no_asin':
      return 'No encontré el producto en ese link. Abrí la página del producto y copiá ese link: ' + raw;
    case 'no_tag':
      return 'Todavía no tenemos referido para ' + r.domain + '.';
    default:
      return 'Link inválido: ' + raw;
  }
}

async function convert(raw: string): Promise<string> {
  try {
    const r = toAffiliateUrl(await resolveShortUrl(raw), TAGS);
    return r.ok ? r.url : errorText(r, raw);
  } catch {
    return 'No pude abrir ese link: ' + raw;
  }
}

export const POST: APIRoute = async ({ request }) => {
  const secret = env('TELEGRAM_WEBHOOK_SECRET');
  const token = env('TELEGRAM_BOT_TOKEN');
  if (!secret || !token || request.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return new Response('Forbidden', { status: 403 });
  }

  const update = await request.json().catch(() => null);
  const msg = update?.message;
  if (!msg?.chat?.id) return new Response('ok');

  // Visible URLs + hidden ones (text_link entities, e.g. forwarded messages)
  const entities: { type: string; url?: string }[] = msg.entities ?? msg.caption_entities ?? [];
  const urls = [
    ...new Set([
      ...findUrls(msg.text ?? msg.caption ?? ''),
      ...entities.filter((e) => e.type === 'text_link' && e.url).map((e) => e.url as string),
    ]),
  ].slice(0, 10);

  const reply = urls.length ? (await Promise.all(urls.map(convert))).join('\n\n') : HELP;

  // Always answer 200 so Telegram doesn't retry the update
  await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: msg.chat.id, text: reply, reply_to_message_id: msg.message_id }),
  }).catch((e) => console.error('[Telegram webhook] sendMessage failed', e));

  return new Response('ok');
};
