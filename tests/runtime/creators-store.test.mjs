import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';

test('built storefront uses Creators for discovery, search and links without provider fallbacks', async () => {
  const probe = createServer().listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise(done => probe.close(done));
  const dataDir = await mkdtemp(join(tmpdir(), 'openship-creators-runtime-'));
  const child = spawn(process.execPath, [
    '--import', pathToFileURL(resolve('tests/helpers/creators-fixture.mjs')).href,
    'scripts/start-server.mjs',
  ], { env: {
    PATH: process.env.PATH, SystemRoot: process.env.SystemRoot,
    NODE_ENV: 'production', HOST: '127.0.0.1', PORT: String(port), DATA_DIR: dataDir,
    CLERK_SECRET_KEY: 'sk_test_placeholder',
    ASTRO_DB_REMOTE_URL: pathToFileURL(join(dataDir, 'rewardhive.db')).href,
    AMAZON_CREATORS_CREDENTIAL_ID: 'runtime-fixture-id', AMAZON_CREATORS_CREDENTIAL_SECRET: 'runtime-fixture-secret',
    AMAZON_CREATORS_CREDENTIAL_VERSION: '3.1', AMAZON_PA_API_PARTNER_TAG: 'rewardhive-20',
    AMAZON_DATA_PROVIDER: 'creators', RAPIDAPI_KEY: 'forbidden-fixture-key', KEEPA_API_KEY: 'forbidden-fixture-key',
  }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const base = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      try { ready = (await fetch(`${base}/api/health`)).ok; } catch {}
      if (ready || child.exitCode !== null) break;
      await new Promise(done => setTimeout(done, 100));
    }
    assert.equal(ready, true, output);
    const discovery = await Promise.all(Array.from({ length: 3 }, async () => {
      const response = await fetch(`${base}/api/feed/products?lang=es`);
      assert.equal(response.status, 200, output);
      return response.json();
    }));
    for (const feed of discovery) {
      assert.equal(feed.source, 'creators');
      assert.equal(feed.marketplace, 'www.amazon.com');
      assert.equal(feed.products.length, 5);
      assert.equal(feed.products[1].price, null);
      assert.equal(feed.products[1].rating, null);
      assert.equal(feed.products[1].featuredImage.url, '');
      assert.match(feed.products[0].affiliateUrl, /tag=rewardhive-20&linkCode=ogi$/);
    }
    assert.equal((output.match(/FixtureCreatorsCall:searchItems/g) || []).length, 1, 'Concurrent discovery must coalesce');
    assert.equal((output.match(/FixtureCreatorsCall:oauth/g) || []).length, 1, 'OAuth must coalesce');
    const search = await (await fetch(`${base}/api/search?q=fixture%20search&lang=es`)).json();
    assert.equal(search.products.length, 5);
    const legacy = await (await fetch(`${base}/api/search/products?q=fixture%20search&lang=es`)).json();
    assert.equal(legacy.length, 5);
    const linked = await (await fetch(`${base}/api/feed/product-by-link`, {
      method: 'POST', headers: { 'content-type': 'application/json', origin: base },
      body: JSON.stringify({ url: 'https://www.amazon.com/dp/B000000001', lang: 'es' }),
    })).json();
    assert.equal(linked.product.asin, 'B000000001', JSON.stringify(linked));
    assert.equal(linked.product.price, null);
    const unconfigured = await fetch(`${base}/api/feed/products?region=es`);
    assert.equal(unconfigured.status, 400);
    assert.equal((await unconfigured.json()).errorCode, 'MARKETPLACE_NOT_CONFIGURED');
    const empty = await (await fetch(`${base}/api/search?q=fixture%20empty`)).json();
    assert.equal(empty.success, true);
    assert.deepEqual(empty.products, []);
    const failure = await fetch(`${base}/api/search?q=fixture%20denied`);
    assert.equal(failure.status, 503);
    const unavailable = await failure.json();
    assert.equal(unavailable.success, false);
    assert.equal(unavailable.errorCode, 'CREATORS_AUTH');
    assert.deepEqual(unavailable.products, []);
    assert.doesNotMatch(output, /FixtureUnexpectedOutbound|Outbound HTTP disabled|Unexpected .* contract/);
  } finally {
    if (child.exitCode === null) { child.kill(); await once(child, 'exit'); }
    await rm(dataDir, { recursive: true, force: true });
  }
});
