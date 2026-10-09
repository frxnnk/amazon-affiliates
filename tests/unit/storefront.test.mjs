import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveStorefrontMarket, storefrontProduct, storefrontPage, storefrontItem } from '../../src/lib/storefront.ts';

const url = (query = '') => new URL(`https://store.example/api/feed/products?${query}`);
const item = (changes = {}) => ({
  asin: 'B012345678', title: 'Headphones', brand: null, price: null,
  originalPrice: null, currency: 'USD', rating: null, totalReviews: null,
  imageUrl: null, images: [], features: [], description: null,
  url: 'https://www.amazon.com/dp/B012345678?tag=rewardhive-20&linkCode=ogi&th=1',
  availability: null, categories: [], ...changes,
});
const ok = (data = [], extra = {}) => ({ success: true, data, ...extra });

test('default store is Amazon.com regardless of display language', () => {
  assert.deepEqual(resolveStorefrontMarket(undefined, {}), {
    marketplace: 'www.amazon.com', partnerTag: 'rewardhive-20', code: 'com',
  });
  assert.equal(resolveStorefrontMarket('US', { AMAZON_PA_API_PARTNER_TAG: 'site-20' }).partnerTag, 'site-20');
});

test('another marketplace requires its own configured tag; unknown regions fail closed', () => {
  assert.throws(() => resolveStorefrontMarket('ES', { AMAZON_PA_API_PARTNER_TAG: 'us-20' }), /MARKETPLACE_NOT_CONFIGURED/);
  assert.equal(resolveStorefrontMarket('amazon.es', { AMAZON_PA_API_PARTNER_TAG_ES: 'spanish-21' }).partnerTag, 'spanish-21');
  for (const market of ['AR', 'amazon.com.evil.test', 'https://amazon.com', '']) {
    assert.throws(() => resolveStorefrontMarket(market, {}), /UNSUPPORTED_MARKETPLACE/);
  }
});

test('mapping preserves the official URL verbatim and never fabricates optional facts', () => {
  const source = item();
  const product = storefrontProduct(source, 'es', 'audio');
  assert.equal(product.affiliateUrl, source.url);
  assert.equal(product.price, null);
  assert.equal(product.rating, null);
  assert.equal(product.totalReviews, null);
  assert.equal(product.formattedPrice, '');
  assert.equal(product.featuredImage.url, '');
  for (const field of ['badges', 'isPrime', 'isHotDeal', 'isVerified', 'youtubeVideo', 'topReviews', 'priceContext']) {
    assert.equal(product[field], undefined);
  }
  assert.equal(storefrontProduct(item({ url: '' })).affiliateUrl, '');
});

test('invalid prices and untrusted URLs cannot become fake prices or purchase links', () => {
  const product = storefrontProduct(item({ price: NaN, rating: 7, totalReviews: -1, url: 'javascript:alert(1)' }));
  assert.equal(product.price, null);
  assert.equal(product.rating, null);
  assert.equal(product.totalReviews, null);
  assert.equal(product.affiliateUrl, '');
  assert.equal(storefrontProduct(item({ price: 24.5, originalPrice: 30 })).formattedPrice, '$24.50');
});

test('query pages request five Creators products, with US default for Spanish UI', async () => {
  let call;
  const result = await storefrontPage(url('lang=es&search=headphones&page=2&limit=99'), async (...args) => {
    call = args; return ok(Array.from({ length: 5 }, (_, n) => item({ asin: `B01234567${n}` })), { totalResults: 100 });
  }, {});
  assert.deepEqual(call, [{ keywords: 'headphones', itemPage: 2, itemCount: 5 }, 'www.amazon.com', { partnerTag: 'rewardhive-20' }]);
  assert.equal(result.status, 200);
  assert.equal(result.body.products.length, 5);
  assert.equal(result.body.hasMore, true);
  assert.equal(result.body.isPersonalized, false);
});

test('discovery reuses category recipes with bounded paging', async () => {
  const calls = [];
  const search = async (...args) => { calls.push(args); return ok(Array.from({ length: 5 }, () => item())); };
  await storefrontPage(url('category=audio&page=1'), search, {});
  const last = await storefrontPage(url('category=audio&page=10'), search, {});
  assert.equal(calls[0][0].keywords, 'headphones');
  assert.equal(calls[1][0].keywords, 'soundbar');
  assert.equal(calls[1][0].itemPage, 2);
  assert.equal(last.body.hasMore, false);
  assert.equal((await storefrontPage(url('page=11'), search, {})).status, 400);
  assert.equal(calls.length, 2);
});

test('empty results are successful, provider authentication failure is not an empty store', async () => {
  const empty = await storefrontPage(url(), async () => ok(), {});
  assert.equal(empty.status, 200);
  assert.equal(empty.body.success, true);
  assert.deepEqual(empty.body.products, []);
  assert.equal(empty.body.hasMore, false);
  const unavailable = await storefrontPage(url('lang=es'), async () => ({
    success: false, error: { code: 'AUTH_ERROR', message: 'private provider error token=secret' },
  }), {});
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.body.errorCode, 'CREATORS_AUTH');
  assert.equal(unavailable.body.success, false);
  assert.doesNotMatch(JSON.stringify(unavailable), /secret|token=/);
});

test('invalid inputs fail before provider access; thrown errors have safe output', async () => {
  let calls = 0;
  const search = async () => { calls++; throw Error('credential-secret'); };
  for (const query of ['page=0', 'page=1junk', 'page=-1', 'region=AR', 'region=ES', 'search=a', 'q=' + 'x'.repeat(201)]) {
    const result = await storefrontPage(url(query), search, {});
    assert.equal(result.status, 400, query);
  }
  assert.equal(calls, 0);
  const failure = await storefrontPage(url(), search, {});
  assert.equal(failure.status, 503);
  assert.doesNotMatch(JSON.stringify(failure), /credential-secret/);
});

test('product link parses only supported Amazon product URLs without network redirects', async () => {
  let call;
  const getter = async (...args) => { call = args; return ok(item()); };
  const result = await storefrontItem('https://www.amazon.com/title/dp/B012345678?tag=old-20', 'es', getter, {});
  assert.equal(result.status, 200);
  assert.deepEqual(call, ['B012345678', 'www.amazon.com', { partnerTag: 'rewardhive-20' }]);
  assert.equal(result.body.product.affiliateUrl, item().url);
  for (const link of ['https://amazon.com.evil.test/dp/B012345678', 'https://amzn.to/abc', 'https://user:pass@amazon.com/dp/B012345678', 'file:///dp/B012345678']) {
    assert.equal((await storefrontItem(link, 'es', getter, {})).status, 400);
  }
});

test('single-item errors stay distinct from unavailable Creators access', async () => {
  const missing = await storefrontItem('https://amazon.com/dp/B012345678', 'en', async () => ({ success: false, error: { code: 'NOT_FOUND' } }), {});
  assert.equal(missing.status, 404);
  assert.equal(missing.body.errorCode, 'PRODUCT_NOT_FOUND');
  const unsupported = await storefrontItem('https://amazon.es/dp/B012345678', 'es', async () => { throw Error('must not call'); }, {});
  assert.equal(unsupported.status, 400);
});

test('visible filters use official Creators fields and exact cents without inventing local ratings', async () => {
  let call;
  const result = await storefrontPage(url('q=keyboard&minPrice=10.05&maxPrice=200&sortBy=price_asc&dealsOnly=true&primeOnly=true'), async (...args) => {
    call = args; return ok();
  }, {});
  assert.equal(result.status, 200);
  assert.deepEqual(call[0], { keywords: 'keyboard', itemPage: 1, itemCount: 5,
    minPrice: 1005, maxPrice: 20000, sortBy: 'Price:LowToHigh', minSavingPercent: 1, deliveryFlags: ['Prime'] });
  await storefrontPage(url('q=keyboard&sortBy=price_desc'), async (params) => {
    assert.equal(params.sortBy, 'Price:HighToLow'); return ok();
  }, {});
  await storefrontPage(url('q=keyboard&sortBy=relevance'), async (params) => {
    assert.equal(params.sortBy, 'Relevance'); return ok();
  }, {});
});

test('invalid money/filter values are rejected before spending any provider request', async () => {
  let calls = 0;
  for (const query of ['minPrice=-1', 'minPrice=1.001', 'maxPrice=Infinity', 'minPrice=20&maxPrice=10',
    'maxPrice=999999999999999999999999', 'sortBy=popular', 'primeOnly=yes', 'minRating=4.5']) {
    const result = await storefrontPage(url(query), async () => { calls++; return ok(); }, {});
    assert.equal(result.status, 400, query);
  }
  assert.equal(calls, 0);
});

test('client deduplication receives the provider page even when all ASINs were seen', async () => {
  const result = await storefrontPage(url('exclude=B012345678'), async () => ok(Array.from({ length: 5 }, () => item())), {});
  assert.equal(result.body.products.length, 5);
  assert.equal(result.body.hasMore, true);
});
