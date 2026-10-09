import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
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
  const child = spawn(process.execPath, [
    '--import', pathToFileURL(resolve('tests/helpers/block-outbound.mjs')).href,
    '--import', pathToFileURL(resolve('tests/helpers/shutdown-signal.mjs')).href,
    'scripts/start-server.mjs',
  ], {
    env: {
      PATH: process.env.PATH, SystemRoot: process.env.SystemRoot,
      NODE_ENV: 'production', HOST: '127.0.0.1', PORT: String(port), DATA_DIR: dataDir,
      CLERK_SECRET_KEY: 'sk_test_placeholder', ASTRO_DB_APP_TOKEN: 'not-a-real-token',
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'], windowsHide: true,
  });
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
  } finally {
    if (child.exitCode === null) { child.kill(); await once(child, 'exit'); }
    await rm(dataDir, { recursive: true, force: true });
  }
});
