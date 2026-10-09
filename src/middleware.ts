import { clerkMiddleware } from '@clerk/astro/server';
import type { MiddlewareHandler } from 'astro';
import { authorizeRequest, validCronSecret } from '@lib/request-authorization';
import { clerkRuntimeEnv } from '@lib/clerk-runtime-env';

const withClerk = clerkMiddleware((auth, context) =>
  authorizeRequest(context.request, auth(), process.env.CRON_SECRET || '')
);

export const onRequest: MiddlewareHandler = (context, next) => {
  const pathname = context.url.pathname;
  // Liveness never queries Clerk, the database, or paid providers.
  if (pathname === '/api/health') return next();
  // Clerk 2.x reads this adapter context before import.meta.env. Supply private
  // values at request time so the Node build never needs a Clerk secret.
  const locals = context.locals as typeof context.locals & { runtime?: { env?: Record<string, unknown> } };
  locals.runtime = { ...locals.runtime, env: clerkRuntimeEnv({
    PUBLIC_CLERK_PUBLISHABLE_KEY: import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY,
    PUBLIC_CLERK_SIGN_IN_URL: import.meta.env.PUBLIC_CLERK_SIGN_IN_URL,
    PUBLIC_CLERK_SIGN_UP_URL: import.meta.env.PUBLIC_CLERK_SIGN_UP_URL,
    PUBLIC_CLERK_AFTER_SIGN_IN_URL: import.meta.env.PUBLIC_CLERK_AFTER_SIGN_IN_URL,
    PUBLIC_CLERK_AFTER_SIGN_UP_URL: import.meta.env.PUBLIC_CLERK_AFTER_SIGN_UP_URL,
  }, locals.runtime?.env) };
  // A scheduler secret only authorizes cron routes, never admin APIs.
  if (pathname.startsWith('/api/cron/') && validCronSecret(context.request, process.env.CRON_SECRET || '')) return next();
  return withClerk(context, next);
};
