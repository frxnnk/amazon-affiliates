import test from 'node:test';
import assert from 'node:assert/strict';
import { runScheduledJob } from '../../scripts/run-cron.mjs';

test('scheduled jobs do nothing unless explicitly enabled', async () => {
  const result = await runScheduledJob({}, () => { throw new Error('Unexpected request'); });
  assert.equal(result.status, 'disabled');
});

test('enabled jobs require a secret and only call the local service', async () => {
  await assert.rejects(() => runScheduledJob({ ENABLE_SCHEDULED_JOBS: '1' }), /CRON_SECRET/);
  await assert.rejects(() => runScheduledJob({ ENABLE_SCHEDULED_JOBS: '1', CRON_SECRET: 'test', CRON_BASE_URL: 'https://external.invalid' }), /loopback/);
});

test('an explicitly enabled job uses authenticated POST and reports failures', async () => {
  const env = { ENABLE_SCHEDULED_JOBS: '1', CRON_SECRET: 'test', PORT: '4321' };
  await assert.rejects(() => runScheduledJob(env, async (url, init) => {
    assert.equal(url, 'http://127.0.0.1:4321/api/cron/agent-orchestrator');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.authorization, 'Bearer test');
    return new Response(null, { status: 500 });
  }), /500/);
});
