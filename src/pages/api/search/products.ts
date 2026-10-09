import type { APIRoute } from 'astro';
import { searchItems } from '@lib/amazon-creators';
import { storefrontPage, storefrontJson } from '@lib/storefront';

export const prerender = false;
// Compatibility for the old search modal. No Markdown/demo catalog is returned.
export const GET: APIRoute = async ({ url }) => storefrontJson(await storefrontPage(url, searchItems), true);
