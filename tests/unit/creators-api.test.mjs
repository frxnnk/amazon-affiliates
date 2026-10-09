import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const officialUrl = 'https://www.amazon.com/dp/B000000001?tag=fixture-20&linkCode=ogi&th=1';
const item = {
  asin: 'B000000001', detailPageURL: officialUrl,
  itemInfo: { title: { displayValue: 'Fixture product' }, features: { displayValues: ['Useful feature'] }, byLineInfo: { brand: { displayValue: 'Fixture' } } },
  images: { primary: { large: { url: 'https://m.media-amazon.com/images/I/fixture.jpg' } } },
  offersV2: { listings: [{ isBuyBoxWinner: true, price: { money: { amount: 12.5, currency: 'USD' } }, savingBasis: { money: { amount: 20, currency: 'USD' } } }] },
};
const isTokenUrl = url => url.includes('/auth/') || url.endsWith('oauth2/token');
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers });

async function fixture(t, responder) {
  const folder = await mkdtemp(join(tmpdir(), 'creators-unit-'));
  t.after(() => rm(folder, { recursive: true, force: true, maxRetries: 3 }));
  const source = new URL('../../src/lib/amazon-creators/', import.meta.url);
  for (const name of await readdir(source)) {
    if (!name.endsWith('.ts')) continue;
    const code = ts.transpileModule(await readFile(new URL(name, source), 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
    }).outputText.replace(/(['"])(\.\/[^'"]+?)\1/g, (_, quote, path) => `${quote}${path.replace(/\.ts$/, '')}.mjs${quote}`);
    await writeFile(join(folder, name.replace(/\.ts$/, '.mjs')), code);
  }
  const keys = ['AMAZON_CREATORS_CREDENTIAL_ID', 'AMAZON_CREATORS_CREDENTIAL_SECRET', 'AMAZON_CREATORS_CREDENTIAL_VERSION', 'AMAZON_CREATORS_DAILY_LIMIT', 'AMAZON_PA_API_PARTNER_TAG'];
  const before = keys.map(key => [key, process.env[key]]);
  Object.assign(process.env, { AMAZON_CREATORS_CREDENTIAL_ID: 'fixture-id', AMAZON_CREATORS_CREDENTIAL_SECRET: 'fixture-secret', AMAZON_CREATORS_CREDENTIAL_VERSION: '3.1', AMAZON_PA_API_PARTNER_TAG: 'fixture-20' });
  delete process.env.AMAZON_CREATORS_DAILY_LIMIT;
  t.after(() => { for (const [key, value] of before) value === undefined ? delete process.env[key] : process.env[key] = value; });
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url: String(url), options, time: Date.now() });
    if (responder) return responder(String(url), options, calls);
    if (isTokenUrl(String(url))) return json({ access_token: 'fixture-access-token', expires_in: 3600 });
    return json(String(url).endsWith('searchItems') ? { searchResult: { items: [item], totalResultCount: 12 } } : { itemsResult: { items: [item] } });
  });
  const api = await import(pathToFileURL(join(folder, 'index.mjs')).href);
  return { api, calls };
}

test('modern LWA uses credential version, JSON scope and bare Bearer; parses official lowerCamel/money', async t => {
  const { api, calls } = await fixture(t);
  delete process.env.AMAZON_CREATORS_CREDENTIAL_VERSION;
  const result = await api.getItem(item.asin, 'www.amazon.es', { partnerTag: 'fixture_es-21' });
  assert.equal(result.success, true);
  assert.equal(calls[0].url, 'https://api.amazon.com/auth/o2/token');
  assert.equal(calls[0].options.headers['Content-Type'], 'application/json');
  assert.equal(JSON.parse(calls[0].options.body).scope, 'creatorsapi::default');
  assert.equal(calls[1].options.headers.Authorization, 'Bearer fixture-access-token');
  assert.equal(calls[1].options.headers['x-marketplace'], 'www.amazon.es');
  assert.equal(JSON.parse(calls[1].options.body).partnerTag, 'fixture_es-21');
  assert.equal(calls[0].options.redirect, 'error');
  assert.ok(calls.every(c => c.options.signal instanceof AbortSignal));
  assert.equal(result.data.title, 'Fixture product');
  assert.equal(result.data.price, 12.5);
  assert.equal(result.data.originalPrice, 20);
  assert.equal(result.data.url, officialUrl);
});

test('searchItems implements discovery and shares normalized shape with getItems', async t => {
  const { api, calls } = await fixture(t);
  assert.equal(typeof api.searchItems, 'function');
  const result = await api.searchItems({ keywords: 'headphones', itemPage: 2, itemCount: 5 });
  assert.equal(result.success, true);
  assert.equal(result.totalResults, 12);
  assert.equal(result.data[0].price, 12.5);
  assert.equal(calls[1].url, 'https://creatorsapi.amazon/catalog/v1/searchItems');
  assert.equal(JSON.parse(calls[1].options.body).keywords, 'headphones');
});

test('explicit 3.2 and 3.3 versions choose LWA endpoint independently of marketplace', async t => {
  const { api, calls } = await fixture(t);
  process.env.AMAZON_CREATORS_CREDENTIAL_VERSION = '3.2';
  await api.getAccessToken('NA');
  process.env.AMAZON_CREATORS_CREDENTIAL_VERSION = '3.3';
  await api.getAccessToken('EU');
  assert.equal(calls[0].url, 'https://api.amazon.co.uk/auth/o2/token');
  assert.equal(calls[1].url, 'https://api.amazon.co.jp/auth/o2/token');
});

test('invalid client enters cooldown, makes no catalog call and never returns provider secrets', async t => {
  const { api, calls } = await fixture(t, () => json({ error: 'invalid_client', error_description: 'fixture-secret fixture-id' }, 401));
  const results = await Promise.all([api.getItem(item.asin), api.getItem('B000000002')]);
  assert.ok(results.every(r => !r.success));
  assert.equal(calls.length, 1);
  assert.doesNotMatch(JSON.stringify(results), /fixture-secret|fixture-id/);
  await api.getItem('B000000003');
  assert.equal(calls.length, 1);
});

test('concurrent token requests are single-flight and reuse valid token', async t => {
  const { api, calls } = await fixture(t);
  await Promise.all([api.getAccessToken('NA'), api.getAccessToken('EU'), api.getAccessToken('FE')]);
  assert.equal(calls.length, 1);
  await api.getAccessToken('NA');
  assert.equal(calls.length, 1);
});

test('identical concurrent requests deduplicate, cache for one hour and isolate partner tags', async t => {
  const { api, calls } = await fixture(t);
  let now = Date.now();
  t.mock.method(Date, 'now', () => now);
  const options = { partnerTag: 'first-20' };
  const [first, second] = await Promise.all([api.getItem(item.asin, 'com', options), api.getItem(item.asin, 'com', options)]);
  assert.deepEqual(first, second);
  assert.equal(calls.length, 2);
  first.data.title = 'caller mutation';
  assert.equal((await api.getItem(item.asin, 'com', options)).data.title, 'Fixture product');
  now += 1001;
  await api.getItem(item.asin, 'com', { partnerTag: 'second-20' });
  assert.equal(calls.filter(c => c.url.includes('/catalog/')).length, 2);
  now += 3600001;
  await api.getItem(item.asin, 'com', options);
  assert.equal(calls.filter(c => c.url.includes('/catalog/')).length, 3);
});

test('429 cooldown prevents subsequent catalog requests without fallback', async t => {
  const { api, calls } = await fixture(t, url => isTokenUrl(url) ? json({ access_token: 'fixture-token', expires_in: 3600 }) : json({ errors: [{ code: 'TooManyRequests', message: 'fixture-secret' }] }, 429, { 'Retry-After': '120' }));
  const first = await api.getItem(item.asin);
  const second = await api.getItem('B000000002');
  assert.equal(first.success, false);
  assert.equal(second.success, false);
  assert.equal(calls.length, 2);
  assert.doesNotMatch(JSON.stringify([first, second]), /fixture-secret/);
});

test('daily budget counts network calls and never counts cache hits', async t => {
  const { api, calls } = await fixture(t);
  process.env.AMAZON_CREATORS_DAILY_LIMIT = '1';
  assert.equal((await api.getItem(item.asin)).success, true);
  assert.equal((await api.getItem(item.asin)).success, true);
  const limited = await api.getItem('B000000002');
  assert.equal(limited.success, false);
  assert.equal(limited.error.code, 'DAILY_LIMIT');
  assert.equal(calls.length, 2);
});

test('catalog requests serialize at one request per second', async t => {
  const { api, calls } = await fixture(t);
  await Promise.all([api.getItem(item.asin), api.getItem('B000000002'), api.getItem('B000000003')]);
  const requests = calls.filter(c => c.url.includes('/catalog/'));
  assert.equal(requests.length, 3);
  assert.ok(requests[1].time - requests[0].time >= 990);
  assert.ok(requests[2].time - requests[1].time >= 990);
});

test('missing configuration, malformed input and unsupported version fail before network', async t => {
  const { api, calls } = await fixture(t);
  assert.equal((await api.getItems(['invalid'])).success, false);
  assert.equal((await api.getItems(Array(11).fill(item.asin))).success, false);
  assert.equal((await api.getItem(item.asin, 'evil.example')).success, false);
  delete process.env.AMAZON_CREATORS_CREDENTIAL_SECRET;
  assert.equal((await api.getItem(item.asin)).success, false);
  process.env.AMAZON_CREATORS_CREDENTIAL_SECRET = 'fixture-secret';
  process.env.AMAZON_CREATORS_CREDENTIAL_VERSION = '2.1';
  assert.equal((await api.getItem(item.asin)).success, false);
  assert.equal(calls.length, 0);
});

test('transport failures redact exception text and empty offers remain null', async t => {
  const { api } = await fixture(t, () => { throw new Error('fixture-secret sensitive query'); });
  const result = await api.getItem(item.asin);
  assert.equal(result.success, false);
  assert.doesNotMatch(JSON.stringify(result), /fixture-secret|sensitive query/);
});

test('absent optional fields stay unknown rather than inventing price, ratings or affiliate URL', async t => {
  const { api } = await fixture(t, url => isTokenUrl(url) ? json({ access_token: 'fixture-token', expires_in: 3600 }) : json({ itemsResult: { items: [{ asin: item.asin, itemInfo: { title: { displayValue: 'Without offer' } } }] } }));
  const result = await api.getItem(item.asin);
  assert.equal(result.success, true);
  assert.equal(result.data.price, null);
  assert.equal(result.data.rating, null);
  assert.equal(result.data.imageUrl, null);
  assert.equal(result.data.url, '');
});

test('search filters use official types and reject malformed filter values before network', async t => {
  const { api, calls } = await fixture(t);
  const result = await api.searchItems({ keywords: 'headphones', minPrice: 1000, maxPrice: 2000, sortBy: 'Price:LowToHigh', deliveryFlags: ['Prime'], minSavingPercent: 1 });
  assert.equal(result.success, true);
  const body = JSON.parse(calls[1].options.body);
  assert.deepEqual(body.deliveryFlags, ['Prime']);
  assert.equal(body.minSavingPercent, 1);
  assert.equal(body.minPrice, 1000);
  for (const extra of [{ minSavingPercent: 100 }, { minSavingPercent: 101 }, { deliveryFlags: ['Paid'] }, { minPrice: 0.1 }, { sortBy: 'fake' }, { itemPage: 11 }]) {
    assert.equal((await api.searchItems({ keywords: 'headphones', ...extra })).success, false);
  }
  assert.equal(calls.length, 2);
  assert.ok(!body.resources.some(value => /customerReviews|highRes/.test(value)));
});

test('successful cache evicts beyond 100 entries and refreshes expired credentials', async t => {
  const { api, calls } = await fixture(t);
  let now = Date.now();
  t.mock.method(Date, 'now', () => now);
  for (let index = 0; index < 101; index++) {
    now += 1001;
    assert.equal((await api.searchItems({ keywords: `query-${index}` })).success, true);
  }
  now += 1001;
  await api.searchItems({ keywords: 'query-0' });
  assert.equal(calls.filter(c => c.url.includes('/catalog/')).length, 102);
  now += 3600000;
  await Promise.all([api.getAccessToken('NA'), api.getAccessToken('EU')]);
  assert.equal(calls.filter(c => isTokenUrl(c.url)).length, 2);
});

test('budget resets at UTC midnight and a rejected request cannot bypass it by changing endpoint', async t => {
  const { api, calls } = await fixture(t);
  process.env.AMAZON_CREATORS_DAILY_LIMIT = '1';
  let now = Date.UTC(2026, 9, 9, 23, 59, 59);
  t.mock.method(Date, 'now', () => now);
  await api.getItem(item.asin);
  assert.equal((await api.searchItems({ keywords: 'headphones' })).error.code, 'DAILY_LIMIT');
  now += 2000;
  assert.equal((await api.searchItems({ keywords: 'headphones' })).success, true);
  assert.equal(calls.filter(c => c.url.includes('/catalog/')).length, 2);
});

test('a fresh catalog cache hit does not acquire an OAuth token again', async t => {
  const { api, calls } = await fixture(t);
  assert.equal((await api.getItem(item.asin)).success, true);
  api.clearTokenCache();
  assert.equal((await api.getItem(item.asin)).success, true);
  assert.equal(calls.length, 2);
});

test('zero catalog budget blocks even OAuth requests', async t => {
  const { api, calls } = await fixture(t);
  process.env.AMAZON_CREATORS_DAILY_LIMIT = '0';
  assert.equal((await api.getItem(item.asin)).error.code, 'DAILY_LIMIT');
  assert.equal(calls.length, 0);
});
