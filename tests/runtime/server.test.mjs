import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';

test('built Node server serves requests and exits cleanly on SIGTERM', async () => {
  const probe = createServer().listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise(done => probe.close(done));
  const dataDir = await mkdtemp(join(tmpdir(), 'openship-runtime-'));
  await mkdir(join(dataDir, 'models'));
  await writeFile(join(dataDir, 'models/test-model.glb'), 'glTF-test');
  const launch = () => spawn(process.execPath, [
    '--import', pathToFileURL(resolve('tests/helpers/block-outbound.mjs')).href,
    '--import', pathToFileURL(resolve('tests/helpers/shutdown-signal.mjs')).href,
    'scripts/start-server.mjs',
  ], {
    env: {
      PATH: process.env.PATH, SystemRoot: process.env.SystemRoot,
      NODE_ENV: 'production', HOST: '127.0.0.1', PORT: String(port), DATA_DIR: dataDir,
      CLERK_SECRET_KEY: 'sk_test_placeholder',
      ASTRO_DB_REMOTE_URL: pathToFileURL(join(dataDir, 'rewardhive.db')).href,
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'], windowsHide: true,
  });
  let child = launch();
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
    assert.deepEqual(await (await fetch(`${base}/api/health`)).json(), { status: 'ok' });
    assert.equal((await fetch(`${base}/site.webmanifest`)).status, 200);
    const model = await fetch(`${base}/models/test-model.glb`);
    assert.equal(model.status, 200, output);
    assert.equal(await model.text(), 'glTF-test');
    const database = new DatabaseSync(join(dataDir, 'rewardhive.db'));
    try {
      database.prepare('INSERT INTO Products (productId,asin,title,brand,description,price,affiliateUrl,featuredImageUrl,status) VALUES (?,?,?,?,?,?,?,?,?)')
        .run('runtime-db-marker', 'TEST000001', 'Runtime Database Marker', 'Test', 'Only in the isolated test database', 25, 'https://example.invalid/product', 'https://example.invalid/image.png', 'published');
    } finally { database.close(); }
    const feedResponse = await fetch(`${base}/api/feed/products?lang=en`);
    assert.equal(feedResponse.status, 503);
    const feed = await feedResponse.json();
    assert.equal(feed.errorCode, 'CREATORS_AUTH');
    assert.deepEqual(feed.products, [], 'The public feed must not fall back to the stored catalog');
    for (const path of ['/api/admin/agents/run', '/api/admin/telegram/test', '/api/cron/agent-orchestrator', '/api/debug/clear-video-cache']) {
      const response = await fetch(`${base}${path}`, { method: 'POST', headers: { origin: base, 'content-type': 'application/json' }, body: '{}', redirect: 'manual' });
      assert.equal(response.status, 401, `${path}: ${output}`);
    }
    assert.doesNotMatch(output, /Outbound HTTP disabled/);
    const exited = once(child, 'exit');
    let timeout;
    const deadline = new Promise(resolve => { timeout = setTimeout(() => resolve(null), 3000); });
    child.send('shutdown-test');
    try {
      assert.deepEqual(await Promise.race([exited, deadline]), [0, null],
        `SIGTERM must close the HTTP server and exit normally within three seconds: ${output}`);
    } finally {
      clearTimeout(timeout);
    }
    child = launch();
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    let restarted = false;
    for (let i = 0; i < 80; i++) {
      try {
        restarted = (await fetch(`${base}/api/health`)).ok;
      } catch {}
      if (restarted || child.exitCode !== null) break;
      await new Promise(done => setTimeout(done, 100));
    }
    assert.equal(restarted, true, output);
    const reopened = new DatabaseSync(join(dataDir, 'rewardhive.db'));
    try {
      assert.equal(reopened.prepare('SELECT title FROM Products WHERE productId = ?')
        .get('runtime-db-marker').title, 'Runtime Database Marker');
    } finally { reopened.close(); }
    assert.doesNotMatch(output, /Outbound HTTP disabled/);
  } finally {
    if (child.exitCode === null) { child.kill(); await once(child, 'exit'); }
    await rm(dataDir, { recursive: true, force: true });
  }
});

test('Node startup without an explicit database URL fails before contacting its build fallback', () => {
  const result = spawnSync(process.execPath, ['scripts/start-server.mjs'], {
    env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot }, encoding: 'utf8', windowsHide: true,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ASTRO_DB_REMOTE_URL is required at runtime/);
});
