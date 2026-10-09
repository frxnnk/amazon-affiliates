// Official contract: https://affiliate-program.amazon.com/creatorsapi/docs/en-us/get-started/using-curl
import { credentialIdentity } from './oauth';
import { normalizeMarketplace, isMarketplaceSupported } from './regions';
import { DEFAULT_RESOURCES, type CreatorsResource, type OAuthConfig, type CreatorsProductData,
  type GetItemsResponse, type GetItemsResult, type SearchItemsParams, type SearchItemsResult, type CreatorsResult } from './types';
import { parseCreatorsItem } from './parser';
import { cachedCatalogRequest, pauseCatalog } from './request-state';
import { failure, safeFailure } from './errors';

interface Options { partnerTag?: string; resources?: CreatorsResource[]; oauthConfig?: OAuthConfig }
const API_BASE = 'https://creatorsapi.amazon/catalog/v1/';
const ASIN = /^[A-Z0-9]{10}$/;

async function request(operation: 'getItems' | 'searchItems', parameters: object,
  marketplace: string, options: Options): Promise<SearchItemsResult> {
  try {
    if (typeof window !== 'undefined') return failure('NOT_CONFIGURED');
    const normalized = normalizeMarketplace(marketplace);
    if (!isMarketplaceSupported(normalized)) return failure('INVALID_REQUEST');
    const { key } = credentialIdentity(options.oauthConfig);
    const partnerTag = options.partnerTag || process.env.AMAZON_PA_API_PARTNER_TAG || 'rewardhive-20';
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(partnerTag)) return failure('INVALID_REQUEST');
    const resources = [...new Set(options.resources || DEFAULT_RESOURCES)].sort();
    if (!resources.length || resources.length > 30) return failure('INVALID_REQUEST');
    const body = { ...parameters, marketplace: normalized, partnerTag, resources };
    const cacheKey = JSON.stringify([key, operation, body]);
    return cachedCatalogRequest(cacheKey, async token => {
      const response = await fetch(API_BASE + operation, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(8000),
        headers: { Authorization: `Bearer ${token.accessToken}`, 'Content-Type': 'application/json', 'x-marketplace': normalized },
        body: JSON.stringify(body),
      });
      if (response.status === 429) { pauseCatalog(response.headers.get('Retry-After')); return failure('RATE_LIMITED'); }
      if (response.status === 401 || response.status === 403) { pauseCatalog(); return failure('ACCESS_DENIED'); }
      if (!response.ok) return failure('REQUEST_FAILED');
      const data: GetItemsResponse = await response.json();
      const result = operation === 'searchItems' ? data.searchResult : data.itemsResult;
      if (!result || !Array.isArray(result.items)) return failure(data.errors?.length ? 'ACCESS_DENIED' : 'INVALID_RESPONSE');
      const products = result.items.map(parseCreatorsItem).filter((value): value is CreatorsProductData => value !== null);
      if (operation === 'getItems' && !products.length) return failure('ITEMS_NOT_FOUND');
      const total = data.searchResult?.totalResultCount;
      return { success: true, data: products, ...(typeof total === 'number' && Number.isFinite(total) && total >= 0 ? { totalResults: total } : {}) };
    }, options.oauthConfig);
  } catch (error) { return safeFailure(error); }
}

export async function getItems(asins: string[], marketplace = 'www.amazon.com', options: Options = {}): Promise<GetItemsResult> {
  if (!Array.isArray(asins) || !asins.length || asins.length > 10 || asins.some(value => typeof value !== 'string' || !ASIN.test(value.toUpperCase()))) return failure('INVALID_REQUEST');
  return request('getItems', { itemIds: [...new Set(asins.map(value => value.toUpperCase()))], itemIdType: 'ASIN' }, marketplace, options);
}
export async function getItem(asin: string, marketplace = 'www.amazon.com', options: Options = {}): Promise<CreatorsResult<CreatorsProductData>> {
  const result = await getItems([asin], marketplace, options);
  if (!result.success) return result;
  const product = result.data.find(value => value.asin === asin.toUpperCase());
  return product ? { success: true, data: product } : failure('ITEMS_NOT_FOUND');
}
export async function searchItems(params: SearchItemsParams, marketplace = 'www.amazon.com', options: Options = {}): Promise<SearchItemsResult> {
  if (!params || typeof params.keywords !== 'string' || !params.keywords.trim() || params.keywords.length > 200) return failure('INVALID_REQUEST');
  const itemPage = params.itemPage ?? 1;
  const itemCount = params.itemCount ?? 10;
  if (!Number.isInteger(itemPage) || itemPage < 1 || itemPage > 10 || !Number.isInteger(itemCount) || itemCount < 1 || itemCount > 10) return failure('INVALID_REQUEST');
  const body: SearchItemsParams = { keywords: params.keywords.trim(), itemPage, itemCount };
  if (params.sortBy !== undefined && !['Relevance', 'Price:LowToHigh', 'Price:HighToLow'].includes(params.sortBy)) return failure('INVALID_REQUEST');
  if (params.minSavingPercent !== undefined) {
    if (!Number.isInteger(params.minSavingPercent) || params.minSavingPercent < 1 || params.minSavingPercent > 99) return failure('INVALID_REQUEST');
    body.minSavingPercent = params.minSavingPercent;
  }
  if (params.deliveryFlags !== undefined) {
    if (!Array.isArray(params.deliveryFlags) || params.deliveryFlags.length !== 1 || params.deliveryFlags[0] !== 'Prime') return failure('INVALID_REQUEST');
    body.deliveryFlags = ['Prime'];
  }
  for (const key of ['searchIndex', 'browseNodeId', 'sortBy'] as const) {
    const value = params[key];
    if (value !== undefined) {
      if (typeof value !== 'string' || !value.length || value.length > 100) return failure('INVALID_REQUEST');
      body[key] = value;
    }
  }
  for (const key of ['minPrice', 'maxPrice'] as const) {
    const value = params[key];
    if (value !== undefined) {
      if (!Number.isSafeInteger(value) || value < 0) return failure('INVALID_REQUEST');
      body[key] = value;
    }
  }
  if (body.minPrice !== undefined && body.maxPrice !== undefined && body.minPrice > body.maxPrice) return failure('INVALID_REQUEST');
  return request('searchItems', body, marketplace, options);
}
export async function getItemsBatched(asins: string[], marketplace = 'www.amazon.com', options: Options = {}): Promise<Map<string, CreatorsResult<CreatorsProductData>>> {
  const results = new Map<string, CreatorsResult<CreatorsProductData>>();
  for (let index = 0; index < asins.length; index += 10) {
    const batch = asins.slice(index, index + 10);
    const result = await getItems(batch, marketplace, options);
    for (const asin of batch) {
      if (!result.success) results.set(asin, result);
      else {
        const product = result.data.find(value => value.asin === asin.toUpperCase());
        results.set(asin, product ? { success: true, data: product } : failure('ITEMS_NOT_FOUND'));
      }
    }
  }
  return results;
}
export function calculateDiscount(product: CreatorsProductData): number {
  return product.price !== null && product.originalPrice && product.originalPrice > product.price
    ? Math.round((product.originalPrice - product.price) / product.originalPrice * 100) : 0;
}
