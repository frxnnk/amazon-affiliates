import type { APIRoute } from 'astro';
import { searchItems } from '@lib/amazon-creators';
import { storefrontPage, storefrontError, storefrontJson } from '@lib/storefront';

export const prerender = false;
export const GET: APIRoute = async ({ url }) => {
  if (!url.searchParams.get('q')?.trim()) return storefrontJson(storefrontError('INVALID_QUERY', url.searchParams.get('lang') || 'en'));
  return storefrontJson(await storefrontPage(url, searchItems));
};
