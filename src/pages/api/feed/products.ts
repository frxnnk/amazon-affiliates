import type { APIRoute } from 'astro';
import { searchItems } from '@lib/amazon-creators';
import { storefrontPage, storefrontJson } from '@lib/storefront';

export const prerender = false;
export const GET: APIRoute = async ({ url }) => storefrontJson(await storefrontPage(url, searchItems));
