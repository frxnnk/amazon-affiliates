import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeRequest, validCronSecret } from '../../src/lib/request-authorization.ts';

const admin = { userId: 'admin-id', sessionClaims: { metadata: { role: 'admin' } } };
const member = { userId: 'member-id', sessionClaims: { metadata: { role: 'member' } } };
const request = (path, headers = {}, method = 'POST') => new Request(`https://example.test${path}`, { method, headers });

for (const path of ['/api/admin/agents/run', '/api/admin/agents/control', '/api/admin/agents/reset-queue', '/api/admin/telegram/test', '/api/admin/agents/stream', '/api/debug/clear-video-cache']) {
  test(`rejects anonymous access to ${path}`, () => {
    assert.equal(authorizeRequest(request(path), {}, '')?.status, 401);
    assert.equal(authorizeRequest(request(path), member, '')?.status, 403);
    assert.equal(authorizeRequest(request(path), admin, ''), undefined);
  });
}

test('cron fails closed when secret is missing, incorrect, or only a Bearer prefix', () => {
  for (const [headers, secret] of [[{}, ''], [{ authorization: 'Bearer anything' }, 'correct'], [{ authorization: 'correct' }, 'correct'], [{ 'x-cron-secret': 'wrong' }, 'correct']]) {
    assert.equal(authorizeRequest(request('/api/cron/agent-orchestrator', headers), {}, secret)?.status, 401);
  }
});

test('cron accepts exactly its configured secret or an authenticated admin', () => {
  for (const headers of [{ authorization: 'Bearer correct' }, { 'x-cron-secret': 'correct' }]) {
    assert.equal(authorizeRequest(request('/api/cron/agent-orchestrator', headers), {}, 'correct'), undefined);
    assert.equal(validCronSecret(request('/api/cron/deal-agent', headers), 'correct'), true);
    assert.equal(authorizeRequest(request('/api/admin/agents/run', headers), {}, 'correct')?.status, 401);
  }
  assert.equal(authorizeRequest(request('/api/cron/deal-agent'), admin, ''), undefined);
});

test('public catalog, login callbacks and health stay public', () => {
  for (const path of ['/es', '/en/products', '/api/health', '/admin/login', '/admin/login/sso-callback', '/admin/unauthorized']) {
    assert.equal(authorizeRequest(request(path), {}, ''), undefined);
  }
  assert.equal(authorizeRequest(request('/admin/products'), {}, '')?.headers.get('location'), '/admin/login');
});
