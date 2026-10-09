import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as storefront from '../../src/lib/storefront.ts';

async function route(path, creators) {
  const source = await readFile(new URL(`../../src/pages/api/${path}.ts`, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, Response, URL, require(name) {
    if (name === '@lib/amazon-creators') return creators;
    if (name === '@lib/storefront') return storefront;
    throw Error(`Public discovery must not load ${name}`);
  } });
  return exports;
}

for (const [path, query, arrayOnly] of [
  ['feed/products', 'lang=es', false],
  ['search/index', 'q=headphones&lang=es', false],
  ['search/products', 'q=headphones&lang=es', true],
]) {
  test(`${path} calls only Creators and preserves its successful response contract`, async () => {
    let calls = 0;
    const handlers = await route(path, { searchItems: async () => { calls++; return { success: true, data: [] }; } });
    const response = await handlers.GET({ url: new URL(`https://store.example/?${query}`) });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(arrayOnly ? body : body.products, []);
    if (!arrayOnly) assert.equal(body.success, true);
    assert.equal(calls, 1);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  });
}

test('search rejects empty input before touching any provider', async () => {
  const handlers = await route('search/index', { searchItems: async () => { throw Error('must not call'); } });
  assert.equal((await handlers.GET({ url: new URL('https://store.example/') })).status, 400);
});

test('product-by-link rejects malformed JSON and reports Creators authentication safely', async () => {
  const handlers = await route('feed/product-by-link', {
    getItem: async () => ({ success: false, error: { code: 'AUTH_ERROR', message: 'private-token' } }),
  });
  const request = body => new Request('https://store.example/', { method: 'POST', body });
  assert.equal((await handlers.POST({ request: request('{') })).status, 400);
  const response = await handlers.POST({ request: request(JSON.stringify({ url: 'https://amazon.com/dp/B012345678' })) });
  assert.equal(response.status, 503);
  const text = await response.text();
  assert.match(text, /CREATORS_AUTH/);
  assert.doesNotMatch(text, /private-token/);
});
