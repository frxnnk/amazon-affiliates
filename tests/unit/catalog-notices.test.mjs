import test from 'node:test';
import assert from 'node:assert/strict';
const notices = await import('../../src/lib/amazon-notices.mjs').catch(() => ({}));
const storage = await import('../../src/lib/catalog-references.mjs').catch(() => ({}));

test('both languages disclose commissions, Amazon content and the checkout price rule', () => {
  assert.equal(typeof notices.amazonNotices, 'function');
  const en = notices.amazonNotices('en');
  assert.match(en.affiliate, /As an Amazon Associate I earn from qualifying purchases/);
  assert.match(en.content, /AS IS/);
  assert.match(en.price, /at the time of purchase/);
  const es = notices.amazonNotices('es');
  assert.match(es.affiliate, /Afiliado de Amazon/);
  assert.match(es.price, /momento de la compra/);
});

test('price details use the provider retrieval time and escape invalid timestamp input', () => {
  assert.equal(typeof notices.priceDetailsHtml, 'function');
  const html = notices.priceDetailsHtml('en', '2026-10-09T18:20:00.000Z');
  assert.match(html, /datetime="2026-10-09T18:20:00.000Z"/);
  assert.match(html, /18:20/);
  assert.match(html, /UTC/);
  assert.match(html, /<details/);
  const invalid = notices.priceDetailsHtml('en', '<img onerror=bad()>');
  assert.doesNotMatch(invalid, /<img|Invalid Date/);
});

test('persistent references migrate legacy content without retaining Amazon titles, images, prices or URLs', () => {
  assert.equal(typeof storage.readCatalogReferences, 'function');
  let raw = JSON.stringify([{ asin: 'B000000001', title: 'Amazon title', image: 'https://image.invalid/x', price: 12, affiliateUrl: 'https://amazon.com/dp/B000000001', marketplace: 'amazon.com', quantity: 2 }, 'B000000002']);
  const local = { getItem: () => raw, setItem: (_key, value) => { raw = value; } };
  const refs = storage.readCatalogReferences(local, 'shoppingCart');
  assert.deepEqual(refs, [{ asin: 'B000000001', marketplace: 'amazon.com', quantity: 2 }, { asin: 'B000000002', marketplace: 'amazon.com', quantity: 1 }]);
  assert.doesNotMatch(raw, /Amazon title|image.invalid|price|affiliateUrl/);
  assert.deepEqual(storage.readCatalogReferences(local, 'shoppingCart'), refs);
});

test('invalid stored values cannot cause external requests or unbounded quantities', () => {
  assert.equal(typeof storage.catalogReferences, 'function');
  assert.deepEqual(storage.catalogReferences([{ asin: '<script>', marketplace: 'evil.invalid' }, null]), []);
  const refs = storage.catalogReferences([{ asin: 'b000000001', marketplace: 'evil.invalid', quantity: -1 }]);
  assert.deepEqual(refs, []);
});

test('saved references revalidate through the same-origin endpoint and unavailable products stay unknown', async () => {
  assert.equal(typeof storage.refreshCatalogReferences, 'function');
  const calls = [];
  const refs = [{ asin: 'B000000001', marketplace: 'amazon.com', quantity: 2 }];
  const result = await storage.refreshCatalogReferences(refs, { lang: 'es', fetcher: async (url, options) => {
    calls.push([url, JSON.parse(options.body)]);
    return { ok: false, json: async () => ({ error: 'private detail' }) };
  } });
  assert.equal(calls[0][0], '/api/feed/product-by-link');
  assert.equal(calls[0][1].url, 'https://www.amazon.com/dp/B000000001');
  assert.equal(result[0].price, null);
  assert.equal(result[0].affiliateUrl, '');
  assert.equal(result[0].quantity, 2);
  assert.doesNotMatch(JSON.stringify(result), /private detail/);
});

test('expired or undated content is removed from display, fresh content retains its official link', () => {
  assert.equal(typeof storage.currentCatalogItem, 'function');
  const now = Date.parse('2026-10-09T20:00:00Z');
  const item = { asin: 'B000000001', marketplace: 'amazon.com', quantity: 1, price: 12, title: 'Live', image: 'https://image.invalid/x', affiliateUrl: 'https://www.amazon.com/dp/B000000001?tag=x', fetchedAt: '2026-10-09T19:30:00Z' };
  assert.equal(storage.currentCatalogItem(item, now).price, 12);
  for (const fetchedAt of [undefined, 'invalid', '2026-10-09T18:59:59Z', '2026-10-10T00:00:00Z']) {
    const expired = storage.currentCatalogItem({ ...item, fetchedAt }, now);
    assert.equal(expired.price, null);
    assert.equal(expired.image, '');
    assert.equal(expired.affiliateUrl, '');
    assert.notEqual(expired.title, 'Live');
  }
});


test('cart controller revalidates references on opening without persisting fresh metadata', async () => {
  const { readFile } = await import('node:fs/promises');
  const { default: vm } = await import('node:vm');
  const { default: ts } = await import('typescript');
  const source = await readFile(new URL('../../src/components/cart/CartButton.astro', import.meta.url), 'utf8');
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^\s*import .*;$/m, '');
  let raw = JSON.stringify([{ asin: 'B000000001', marketplace: 'amazon.com', quantity: 2, title: 'Old title', price: 900 }]);
  const local = { getItem: () => raw, setItem: (_key, value) => { raw = value; } };
  let available = true, calls = 0, deferred = null;
  const window = { dispatchEvent() {}, addEventListener() {} };
  const fetcher = async () => {
    calls++;
    if (deferred) await deferred;
    return { ok: available, json: async () => ({ success: available, product: { asin: 'B000000001', title: 'Current title', price: 7, currency: 'USD', affiliateUrl: 'https://www.amazon.com/dp/B000000001?tag=official', fetchedAt: new Date().toISOString() } }) };
  };
  vm.runInNewContext(ts.transpileModule(script, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    ...storage, refreshCatalogReferences: (refs, options) => storage.refreshCatalogReferences(refs, { ...options, fetcher }),
    localStorage: local, window, document: { getElementById: () => null }, AbortController,
    CustomEvent: class { constructor(type) { this.type = type; } },
  });
  assert.equal(window.cart.getItems()[0].price, null);
  await window.cart.refresh('en');
  assert.equal(window.cart.getItems()[0].price, 7);
  assert.equal(window.cart.getItems()[0].quantity, 2);
  window.cart.updateQuantity('B000000001', 3);
  assert.deepEqual(JSON.parse(raw), [{ asin: 'B000000001', marketplace: 'amazon.com', quantity: 3 }]);
  window.cart.dropContent();
  assert.equal(window.cart.getItems()[0].price, null);
  available = false;
  await window.cart.refresh('en');
  assert.equal(window.cart.getItems()[0].affiliateUrl, '');
  assert.equal(window.cart.getItems()[0].price, null);
  assert.equal(calls, 2);
  let release;
  deferred = new Promise(resolve => { release = resolve; });
  const refresh = window.cart.refresh('en');
  window.cart.add({ asin: 'B000000002', marketplace: 'amazon.com', title: 'Added during refresh', price: 5, currency: 'USD', affiliateUrl: 'https://www.amazon.com/dp/B000000002', fetchedAt: new Date().toISOString() });
  release();
  await refresh;
  assert.equal(window.cart.getItems().find(item => item.asin === 'B000000002').price, 5);
  assert.equal(JSON.parse(raw).length, 2);
  assert.doesNotMatch(raw, /Added during refresh|affiliateUrl|price/);
});

test('cart checkout stays disabled for unavailable products and clears an old link for an empty cart', async () => {
  const { readFile } = await import('node:fs/promises');
  const { default: vm } = await import('node:vm');
  const { safeCatalogUrl } = await import('../../src/lib/catalog-ui.mjs');
  const source = await readFile(new URL('../../src/components/cart/CartModal.astro', import.meta.url), 'utf8');
  const script = source.slice(source.indexOf('  function updateBuyAllUrl('), source.indexOf('  // Re-check in-memory'));
  const btn = { href: 'https://old.invalid', removeAttribute(key) { delete this[key]; }, setAttribute(key, value) { this[key] = value; } };
  const update = vm.runInNewContext(script + ';updateBuyAllUrl;', { buyAllBtn: btn, safeCatalogUrl, URLSearchParams, affiliateTags: { 'amazon.com': 'rewardhive-20' } });
  const ref = { asin: 'B000000001', marketplace: 'amazon.com', quantity: 1 };
  update([ref]);
  assert.equal(btn.href, undefined);
  update([{ ...ref, affiliateUrl: 'https://www.amazon.com/dp/B000000001?tag=official' }]);
  assert.match(btn.href, /^https:\/\/www.amazon.com\/gp\/aws\/cart\/add.html/);
  update([]);
  assert.equal(btn.href, undefined);
});
