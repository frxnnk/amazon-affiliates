import type { APIRoute } from 'astro';
import { getItem } from '@lib/amazon-creators';
import { storefrontItem, storefrontError, storefrontJson } from '@lib/storefront';

export const prerender = false;
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    return storefrontJson(await storefrontItem(body.url, body.lang === 'es' ? 'es' : 'en', getItem));
  } catch { return storefrontJson(storefrontError('INVALID_URL')); }
};
