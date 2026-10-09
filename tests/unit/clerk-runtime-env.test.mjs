import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clerkRuntimeEnv } from '../../src/lib/clerk-runtime-env.ts';

const publicDefaults = {
  PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_example',
  PUBLIC_CLERK_SIGN_IN_URL: '/admin/login',
  PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
  PUBLIC_CLERK_AFTER_SIGN_IN_URL: '/admin',
  PUBLIC_CLERK_AFTER_SIGN_UP_URL: '/',
};

test('Clerk keeps every configured public build default in the adapter context', () => {
  assert.deepEqual(clerkRuntimeEnv(publicDefaults, {}, {}), publicDefaults);
});

test('Clerk runtime configuration overrides defaults without copying private build values', () => {
  const env = clerkRuntimeEnv(
    { ...publicDefaults, CLERK_SECRET_KEY: 'build-value-must-not-be-used' },
    { PUBLIC_CLERK_SIGN_IN_URL: '/adapter-login', CLERK_SECRET_KEY: 'adapter-secret' },
    { PUBLIC_CLERK_SIGN_IN_URL: '/runtime-login', CLERK_SECRET_KEY: 'runtime-secret' },
  );
  assert.equal(env.PUBLIC_CLERK_SIGN_IN_URL, '/runtime-login');
  assert.equal(env.CLERK_SECRET_KEY, 'runtime-secret');
  assert.equal(env.PUBLIC_CLERK_SIGN_UP_URL, '/sign-up');
  assert.equal(clerkRuntimeEnv({ CLERK_SECRET_KEY: 'build-secret' }, {}, {}).CLERK_SECRET_KEY, undefined);
});
