import type { CreatorsProductData, CreatorsResult } from './amazon-creators/types.ts';

type Environment = Record<string, string | undefined>;
type SearchInput = { keywords: string; itemPage: number; itemCount: number;
  minPrice?: number; maxPrice?: number; sortBy?: string; minSavingPercent?: number; deliveryFlags?: 'Prime'[] };
type SearchProvider = (params: SearchInput, marketplace: string, options: { partnerTag: string }) => Promise<CreatorsResult<CreatorsProductData[]> & { totalResults?: number }>;
type ItemProvider = (asin: string, marketplace: string, options: { partnerTag: string }) => Promise<CreatorsResult<CreatorsProductData>>;

const MARKETS: Record<string, string> = {
  com: 'US', es: 'ES', 'co.uk': 'UK', de: 'DE', fr: 'FR', it: 'IT', ca: 'CA',
  'com.mx': 'MX', 'com.br': 'BR', 'com.au': 'AU', 'co.jp': 'JP', in: 'IN',
};
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  all: ['best sellers', 'deals today', 'trending tech', 'top rated'],
  electronics: ['wireless earbuds', 'portable charger', 'bluetooth speaker', 'usb hub'],
  audio: ['headphones', 'wireless earbuds', 'bluetooth speaker', 'microphone', 'soundbar'],
  gaming: ['gaming headset', 'gaming mouse', 'ps5 controller', 'gaming keyboard', 'nintendo switch'],
  smartphones: ['iphone', 'samsung galaxy', 'phone case', 'screen protector', 'phone charger'],
  home: ['smart home', 'led lights', 'kitchen gadgets', 'vacuum cleaner', 'air fryer'],
  wearables: ['smartwatch', 'fitness tracker', 'apple watch', 'garmin', 'fitbit'],
  computers: ['laptop', 'laptop stand', 'webcam', 'keyboard', 'monitor', 'mouse'],
};
const MESSAGES: Record<string, [string, string]> = {
  UNSUPPORTED_MARKETPLACE: ['Este mercado de Amazon no está disponible.', 'This Amazon marketplace is not supported.'],
  MARKETPLACE_NOT_CONFIGURED: ['Este mercado todavía no está configurado.', 'This marketplace is not configured yet.'],
  INVALID_QUERY: ['Revisá la búsqueda o los filtros.', 'Check your search or filters.'],
  INVALID_PAGE: ['Esta página no está disponible.', 'This page is not available.'],
  INVALID_URL: ['Pegá un enlace completo de producto de Amazon.', 'Paste a full Amazon product link.'],
  PRODUCT_NOT_FOUND: ['Amazon no devolvió datos para este producto.', 'Amazon returned no data for this product.'],
  CREATORS_AUTH: ['La conexión con Amazon necesita atención. Probá más tarde.', 'The Amazon connection needs attention. Please try again later.'],
  CREATORS_THROTTLED: ['Amazon está limitando las consultas. Probá más tarde.', 'Amazon is limiting requests. Please try again later.'],
  STOREFRONT_UNAVAILABLE: ['No pudimos consultar Amazon. Probá más tarde.', 'We could not reach Amazon. Please try again later.'],
};

export function resolveStorefrontMarket(input?: string, env: Environment = process.env) {
  const normalized = input === undefined ? 'com' : input.trim().toLowerCase().replace(/^(www\.)?amazon\./, '');
  const code = Object.hasOwn(MARKETS, normalized) ? normalized
    : Object.keys(MARKETS).find(key => MARKETS[key].toLowerCase() === normalized || (normalized === 'gb' && key === 'co.uk'));
  if (!code) throw new Error('UNSUPPORTED_MARKETPLACE');
  const partnerTag = (env[`AMAZON_PA_API_PARTNER_TAG_${MARKETS[code]}`]
    || (code === 'com' ? env.AMAZON_PA_API_PARTNER_TAG || 'rewardhive-20' : '')).trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(partnerTag)) throw new Error('MARKETPLACE_NOT_CONFIGURED');
  return { marketplace: `www.amazon.${code}`, partnerTag, code };
}

function positiveNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function safeHttpsUrl(value: string | null | undefined, amazonOnly = false): string {
  if (!value) return '';
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return '';
    if (amazonOnly && !Object.keys(MARKETS).some(code => ['www.amazon.' + code, 'amazon.' + code].includes(parsed.hostname))) return '';
    return value; // Keep Amazon's official URL and tracking parameters unchanged.
  } catch { return ''; }
}

function formatPrice(value: number | null, currency: string, lang: string): string {
  if (value === null || !/^[A-Z]{3}$/.test(currency)) return '';
  try { return new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-US', { style: 'currency', currency }).format(value); }
  catch { return ''; }
}

export function storefrontProduct(item: CreatorsProductData, lang = 'en', category = 'all') {
  const price = positiveNumber(item.price);
  const originalPrice = positiveNumber(item.originalPrice);
  const rating = positiveNumber(item.rating);
  const reviews = positiveNumber(item.totalReviews);
  const image = safeHttpsUrl(item.imageUrl);
  const affiliateUrl = safeHttpsUrl(item.url, true);
  return {
    productId: item.asin, asin: item.asin, title: item.title, brand: item.brand || '',
    price, originalPrice, currency: item.currency || '',
    formattedPrice: formatPrice(price, item.currency || '', lang),
    formattedOriginalPrice: formatPrice(originalPrice, item.currency || '', lang),
    rating: rating !== null && rating <= 5 ? rating : null,
    totalReviews: reviews !== null && Number.isInteger(reviews) ? reviews : null,
    featuredImage: { url: image, alt: item.title }, image,
    images: (item.images || []).map(value => safeHttpsUrl(value)).filter(Boolean),
    affiliateUrl, category, shortDescription: item.description || '',
    discountPercent: price !== null && originalPrice !== null && originalPrice > price
      ? Math.round((originalPrice - price) / originalPrice * 100) : 0,
    source: 'creators' as const,
    fetchedAt: item.fetchedAt || null,
  };
}

interface StorefrontBody {
  success: boolean;
  source: 'creators';
  products: ReturnType<typeof storefrontProduct>[];
  hasMore: boolean;
  error?: string;
  errorCode?: string;
  page?: number;
  marketplace?: string;
  isPersonalized?: boolean;
  product?: ReturnType<typeof storefrontProduct>;
}
interface StorefrontResponse { status: number; body: StorefrontBody }

export function storefrontError(code: string, lang = 'en'): StorefrontResponse {
  const known = Object.hasOwn(MESSAGES, code) ? code : 'STOREFRONT_UNAVAILABLE';
  const status = known === 'PRODUCT_NOT_FOUND' ? 404
    : ['UNSUPPORTED_MARKETPLACE', 'MARKETPLACE_NOT_CONFIGURED', 'INVALID_QUERY', 'INVALID_PAGE', 'INVALID_URL'].includes(known) ? 400 : 503;
  return { status, body: { success: false, source: 'creators', products: [], hasMore: false,
    errorCode: known, error: MESSAGES[known][lang === 'es' ? 0 : 1] } };
}

function providerError(code: string, lang: string) {
  if (/auth|token|credential|access.?denied|forbidden|invalid.?client|not.?configured|invalid.?version|401|403/i.test(code)) return storefrontError('CREATORS_AUTH', lang);
  if (/throttl|limit|429/i.test(code)) return storefrontError('CREATORS_THROTTLED', lang);
  return storefrontError('STOREFRONT_UNAVAILABLE', lang);
}

function searchFilters(params: URLSearchParams): Partial<SearchInput> {
  const filters: Partial<SearchInput> = {};
  for (const key of ['minPrice', 'maxPrice'] as const) {
    const value = params.get(key);
    if (value === null) continue;
    if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error('INVALID_QUERY');
    const [whole, fraction = ''] = value.split('.');
    const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    if (!Number.isSafeInteger(cents)) throw new Error('INVALID_QUERY');
    filters[key] = cents;
  }
  if (filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice) throw new Error('INVALID_QUERY');
  const sorting: Record<string, string> = { relevance: 'Relevance', price_asc: 'Price:LowToHigh', price_desc: 'Price:HighToLow' };
  const sortBy = params.get('sortBy');
  if (sortBy !== null) {
    if (!Object.hasOwn(sorting, sortBy)) throw new Error('INVALID_QUERY');
    filters.sortBy = sorting[sortBy];
  }
  for (const key of ['dealsOnly', 'primeOnly']) {
    const value = params.get(key);
    if (value !== null && value !== 'true' && value !== 'false') throw new Error('INVALID_QUERY');
  }
  if (params.get('dealsOnly') === 'true') filters.minSavingPercent = 1;
  if (params.get('primeOnly') === 'true') filters.deliveryFlags = ['Prime'];
  // A 4.5-star filter cannot be approximated by Amazon's integer-only rating filter.
  if (params.has('minRating')) throw new Error('INVALID_QUERY');
  return filters;
}

export async function storefrontPage(url: URL, search: SearchProvider, env: Environment = process.env): Promise<StorefrontResponse> {
  const params = url.searchParams;
  const lang = params.get('lang') || 'en';
  try {
    const market = resolveStorefrontMarket(params.get('marketplace') ?? params.get('region') ?? undefined, env);
    const rawPage = params.get('page') || '1';
    if (!/^(?:[1-9]|10)$/.test(rawPage)) return storefrontError('INVALID_PAGE', lang);
    const page = Number(rawPage);
    const query = (params.get('q') ?? params.get('search') ?? '').trim();
    if (query && (query.length < 2 || query.length > 200)) return storefrontError('INVALID_QUERY', lang);
    const category = params.get('category') || 'all';
    if (!Object.hasOwn(CATEGORY_KEYWORDS, category)) return storefrontError('INVALID_QUERY', lang);
    const recipes = CATEGORY_KEYWORDS[category];
    const keywords = query || recipes[(page - 1) % recipes.length];
    const itemPage = query ? page : Math.floor((page - 1) / recipes.length) + 1;
    const filters = searchFilters(params);
    const result = await search({ keywords, itemPage, itemCount: 5, ...filters }, market.marketplace, { partnerTag: market.partnerTag });
    if (!result.success) return providerError(result.error.code, lang);
    // The UI owns deduplication and advances over duplicate pages; do not turn one into a false empty result.
    const products = result.data.slice(0, 5).map(item => storefrontProduct(item, lang, category));
    const hasMore = page < 10 && result.data.length >= 5
      && (!query || result.totalResults === undefined || page * 5 < result.totalResults);
    return { status: 200, body: { success: true, products, page, hasMore, source: 'creators',
      marketplace: market.marketplace, isPersonalized: false } };
  } catch (error) { return storefrontError(error instanceof Error ? error.message : '', lang); }
}

export async function storefrontItem(link: unknown, lang: string, getItem: ItemProvider, env: Environment = process.env): Promise<StorefrontResponse> {
  if (typeof link !== 'string' || link.length > 4096) return storefrontError('INVALID_URL', lang);
  let parsed: URL;
  try { parsed = new URL(link); } catch { return storefrontError('INVALID_URL', lang); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port
    || !Object.keys(MARKETS).some(code => ['www.amazon.' + code, 'amazon.' + code].includes(parsed.hostname))) {
    return storefrontError('INVALID_URL', lang);
  }
  const asin = parsed.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([a-z0-9]{10})(?:\/|$)/i)?.[1].toUpperCase();
  if (!asin) return storefrontError('INVALID_URL', lang);
  try {
    const market = resolveStorefrontMarket(parsed.hostname, env);
    const result = await getItem(asin, market.marketplace, { partnerTag: market.partnerTag });
    if (!result.success) return /not.?found|no.?results/i.test(result.error.code)
      ? storefrontError('PRODUCT_NOT_FOUND', lang) : providerError(result.error.code, lang);
    const product = storefrontProduct(result.data, lang);
    return { status: 200, body: { success: true, source: 'creators', products: [product], product,
      hasMore: false, marketplace: market.marketplace } };
  } catch (error) { return storefrontError(error instanceof Error ? error.message : '', lang); }
}

export function storefrontJson(result: StorefrontResponse, listOnly = false): Response {
  return new Response(JSON.stringify(listOnly && result.body.success ? result.body.products : result.body), {
    status: result.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
