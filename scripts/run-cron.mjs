import { pathToFileURL } from 'node:url';

// No schedule is installed by this script or image. Running jobs can spend API
// quota and publish messages, so an operator must explicitly enable them first.
export async function runScheduledJob(env = process.env, request = fetch) {
  if (env.ENABLE_SCHEDULED_JOBS !== '1') return { status: 'disabled' };
  if (!env.CRON_SECRET) throw new Error('CRON_SECRET is required');
  const base = new URL(env.CRON_BASE_URL || `http://127.0.0.1:${env.PORT || '4321'}`);
  if (base.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname) || base.username || base.password) {
    throw new Error('CRON_BASE_URL must use local HTTP loopback');
  }
  const response = await request(new URL('/api/cron/agent-orchestrator', base).href, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.CRON_SECRET}`, 'content-type': 'application/json' },
    body: '{}',
    signal: AbortSignal.timeout(10 * 60 * 1000),
    redirect: 'error',
  });
  if (!response.ok) throw new Error(`Scheduled job returned HTTP ${response.status}`);
  const result = await response.json();
  if (!result.success) throw new Error('Scheduled job reported failure');
  return { status: 'complete' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(`Scheduled jobs: ${(await runScheduledJob()).status}`); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
