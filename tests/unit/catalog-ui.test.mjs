import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const ui = { ...await import('../../src/lib/catalog-ui.mjs'), ...await import('../../src/lib/amazon-notices.mjs') };

test('unknown prices remain unknown; zero is formatted only when supplied', () => {
  assert.equal(typeof ui.formatCatalogPrice, 'function');
  for (const price of [null, undefined, '', NaN, -1]) {
    assert.equal(ui.formatCatalogPrice(price, 'USD', 'es'), 'Ver en Amazon');
  }
  assert.equal(ui.formatCatalogPrice(null, 'USD', 'en'), 'View on Amazon');
  assert.equal(ui.formatCatalogPrice(0, 'USD', 'en'), '$0.00');
  assert.equal(ui.formatCatalogPrice(12.5, 'USD', 'en'), '$12.50');
  for (const currency of ['', null, undefined, 'invalid']) {
    assert.equal(ui.formatCatalogPrice(12.5, currency, 'en'), 'View on Amazon');
  }
});

test('catalog strings and URLs cannot introduce HTML or executable links', () => {
  assert.equal(typeof ui.escapeHtml, 'function');
  assert.equal(ui.escapeHtml('<img src=x onerror="x">&\''), '&lt;img src=x onerror=&quot;x&quot;&gt;&amp;&#39;');
  for (const url of ['javascript:alert(1)', 'data:text/html,x', '//evil.invalid', 'https://u:p@example.com']) {
    assert.equal(ui.safeCatalogUrl(url), '');
  }
  assert.equal(ui.safeCatalogUrl('https://www.amazon.com/dp/B000000001?tag=x&x=1'), 'https://www.amazon.com/dp/B000000001?tag=x&x=1');
});

test('catalog failures are localized and never expose backend error detail', async () => {
  assert.equal(typeof ui.readCatalogResponse, 'function');
  for (const response of [
    { ok: false, json: async () => ({ error: 'credential secret=example' }) },
    { ok: true, json: async () => ({ success: false, error: 'provider failure' }) },
    { ok: true, json: async () => { throw new Error('invalid JSON'); } },
  ]) {
    await assert.rejects(ui.readCatalogResponse(response, 'es'), {
      message: 'El catálogo no está disponible en este momento. Inténtalo de nuevo más tarde.',
    });
  }
  const empty = { success: true, products: [] };
  assert.deepEqual(await ui.readCatalogResponse({ ok: true, json: async () => empty }, 'en'), empty);
});

test('feed renders missing data and hostile catalog text without fake values or markup', async () => {
  const source = await readFile(new URL('../../src/components/feed/InfiniteFeed.astro', import.meta.url), 'utf8');
  const classSource = source.slice(source.indexOf('class Feed {'), source.indexOf('let feed = null;'));
  const Feed = vm.runInNewContext(`${classSource}; Feed;`, {
    ...ui, console, Intl,
    document: { createElement: () => ({ dataset: {}, querySelector: () => null }) },
  });
  const feed = Object.assign(Object.create(Feed.prototype), {
    lang: 'en', category: 'all', texts: { buy: 'View on Amazon' }, setupSlide() {},
  });
  const slide = feed.createSlide({
    asin: 'B000000001', title: '<img src=x onerror="bad()">', brand: '<script>bad()</script>',
    price: null, rating: null, featuredImage: { url: 'javascript:bad()' }, affiliateUrl: 'javascript:bad()',
  });
  assert.ok(slide.innerHTML.includes('View on Amazon'));
  assert.ok(!slide.innerHTML.includes('$0.00'));
  assert.ok(!slide.innerHTML.includes('rating-row'));
  assert.ok(!slide.innerHTML.includes('<script>bad()'));
  assert.ok(!slide.innerHTML.includes('<img src=x'));
  assert.ok(!slide.innerHTML.includes('javascript:'));
  assert.ok(!slide.innerHTML.includes('src=""'));
  assert.ok(!slide.innerHTML.includes('href=""'));
});

test('modal searches the server and distinguishes service failure from no matches', async () => {
  const source = await readFile(new URL('../../src/components/search/SearchModal.astro', import.meta.url), 'utf8');
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^\s*import .*;$/gm, '');
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      innerHTML: '', textContent: '', dataset: {},
      classList: { toggle() {}, add() {}, remove() {} },
      addEventListener() {}, setAttribute() {}, querySelector() { return null; }, querySelectorAll() { return []; },
    });
    return elements.get(id);
  };
  const calls = [];
  let response = { ok: false, json: async () => ({ success: false, error: 'private provider detail' }) };
  const context = vm.createContext({
    ...ui, console, URL, URLSearchParams, AbortController, setTimeout, clearTimeout,
    fetch: async url => { calls.push(url); return response; },
    document: { documentElement: { lang: 'es' }, getElementById: element, addEventListener() {} },
    window: { addEventListener() {} },
  });
  vm.runInContext(ts.transpileModule(`${script};globalThis.searchForTest=performSearch;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText, context);
  await context.searchForTest('teclado');
  assert.equal(calls.length, 1);
  assert.match(calls[0], /^\/api\/search\?/);
  assert.equal(new URL(calls[0], 'https://example.invalid').searchParams.get('q'), 'teclado');
  assert.equal(element('search-no-results').textContent, ui.catalogUnavailableMessage('es'));
  response = { ok: true, json: async () => ({ success: true, products: [] }) };
  await context.searchForTest('nada');
  assert.equal(element('search-no-results').textContent, 'No se encontraron resultados');

  const pending = [];
  context.fetch = () => new Promise(resolve => pending.push(resolve));
  const older = context.searchForTest('consulta anterior');
  const newer = context.searchForTest('consulta nueva');
  pending[1]({ ok: true, json: async () => ({ success: true, products: [{ title: 'Resultado nuevo', price: null }] }) });
  await newer;
  pending[0]({ ok: true, json: async () => ({ success: true, products: [{ title: 'Resultado viejo', price: null }] }) });
  await older;
  assert.ok(element('search-results-list').innerHTML.includes('Resultado nuevo'));
  assert.ok(!element('search-results-list').innerHTML.includes('Resultado viejo'));
});

test('clearing the home search cancels the old response before it can replace the empty state', async () => {
  const source = await readFile(new URL('../../src/pages/[lang]/index.astro', import.meta.url), 'utf8');
  const start = source.indexOf("        searchInput?.addEventListener('input',");
  const end = source.indexOf("        searchInput?.addEventListener('focus',", start);
  let handler, aborted = false;
  const context = vm.createContext({
    searchInput: { addEventListener: (_event, callback) => { handler = callback; } },
    searchController: { abort: () => { aborted = true; } }, searchVersion: 1,
    searchTimeout: null, clearTimeout, setTimeout, showState() {},
    searchWrap: { classList: { remove() {}, add() {} } },
  });
  vm.runInContext(source.slice(start, end), context);
  handler({ target: { value: '' } });
  assert.equal(aborted, true);
  assert.equal(context.searchVersion, 2);
});

test('home search cards escape provider fields and keep an unknown price empty in cart data', async () => {
  const source = await readFile(new URL('../../src/pages/[lang]/index.astro', import.meta.url), 'utf8');
  const start = source.indexOf('        function renderResults(products) {');
  const end = source.indexOf('        // Handle add to cart from search results', start);
  const grid = { innerHTML: '', querySelectorAll: () => [] };
  const render = vm.runInNewContext(`${source.slice(start, end)}; renderResults;`, {
    ...ui, lang: 'en', renderStars: () => '', formatNumber: String,
    document: { getElementById: () => grid },
  });
  render([{ asin: 'B000000001', title: '<img src=x onerror="bad()">', brand: '<b>Injected</b>',
    price: null, image: 'javascript:bad()', affiliateUrl: 'javascript:bad()' }]);
  assert.ok(!grid.innerHTML.includes('<img src=x'));
  assert.ok(!grid.innerHTML.includes('<b>Injected'));
  assert.ok(!grid.innerHTML.includes('javascript:'));
  assert.ok(grid.innerHTML.includes('View on Amazon'));
  assert.ok(grid.innerHTML.includes('data-price=""'));
  assert.ok(!grid.innerHTML.includes('href=""'));
});

test('cart storage preserves unknown price instead of converting it to zero', async () => {
  const source = await readFile(new URL('../../src/components/cart/CartButton.astro', import.meta.url), 'utf8');
  const start = source.indexOf('  function addToCart(');
  const end = source.indexOf('  // Remove from cart', start);
  let saved;
  const add = vm.runInNewContext(ts.transpileModule(`${source.slice(start, end)};addToCart;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, { ...ui, getCartItems: () => [], getCartMarketplace: () => null, saveCartItems: items => { saved = items; } });
  for (const price of [undefined, null, '', '$12.50', -1, NaN]) {
    add({ asin: 'B000000001', price });
    assert.equal(saved[0].price, null);
  }
  add({ asin: 'B000000001', price: 12.5 });
  assert.equal(saved[0].price, 12.5);
});

test('cart renders unknown and mixed totals honestly and escapes saved content', async () => {
  const source = await readFile(new URL('../../src/components/cart/CartModal.astro', import.meta.url), 'utf8');
  const start = source.indexOf('  function formatPrice(');
  const end = source.indexOf('  function updateBuyAllUrl(', start);
  const element = () => ({ textContent: '', innerHTML: '', classList: { add() {}, remove() {} } });
  const itemsList = element(), totalAmount = element();
  let items = [{ asin: 'B000000001', title: '<img src=x onerror="bad()">', brand: '<b>bad</b>', image: 'javascript:bad()', price: null, currency: 'USD', quantity: 1 }];
  const render = vm.runInNewContext(`${source.slice(start, end)};renderCart;`, {
    ...ui, lang: 'en', t: { items: 'items', remove: 'Remove', totalUnknown: 'Check prices on Amazon' },
    window: { cart: { getItems: () => items } },
    document: { getElementById: () => null, createElement: element, head: { appendChild() {} } },
    countLabel: element(), emptyState: element(), footer: element(), itemsList, totalAmount, updateBuyAllUrl() {},
  });
  render();
  assert.equal(totalAmount.textContent, 'Check prices on Amazon');
  assert.ok(itemsList.innerHTML.includes('View on Amazon'));
  assert.ok(!itemsList.innerHTML.includes('<img src=x'));
  assert.ok(!itemsList.innerHTML.includes('<b>bad</b>'));
  assert.ok(!itemsList.innerHTML.includes('javascript:'));
  items = [{ price: 2, currency: 'USD', quantity: 2 }, { price: 3, currency: 'EUR', quantity: 1 }];
  render();
  assert.equal(totalAmount.textContent, 'Check prices on Amazon');
  items = [{ price: 2, currency: 'USD', quantity: 2 }];
  render();
  assert.equal(totalAmount.textContent, '$4.00');
});
